import React, { useEffect, useMemo, useRef, useState } from "react";
import { Skill, SkillsAPI } from "../../api/skills";

type Props = {
  value: string[];
  onChange: (slugs: string[]) => void;
  placeholder?: string;
  maxItems?: number;
};

export default function SkillsInput({
  value,
  onChange,
  placeholder = "Начни вводить навык...",
  maxItems = 50,
}: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Skill[]>([]);
  const [open, setOpen] = useState(false);
  const [resolved, setResolved] = useState<Record<string, Skill>>({});
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const missing = value.filter((s) => !resolved[s]);
    if (missing.length === 0) return;
    let cancelled = false;
    SkillsAPI.bulk(missing)
      .then((items) => {
        if (cancelled) return;
        setResolved((prev) => {
          const next = { ...prev };
          items.forEach((it) => {
            if (it.slug) next[it.slug] = it;
          });
          return next;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [value, resolved]);

  useEffect(() => {
    let cancelled = false;
    const trimmed = query.trim();
    const timer = window.setTimeout(async () => {
      try {
        const items = trimmed
          ? await SkillsAPI.search(trimmed, 10)
          : await SkillsAPI.popular(10);
        if (!cancelled) setSuggestions(items);
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    }, trimmed ? 220 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDoc);
    return () => window.removeEventListener("mousedown", onDoc);
  }, [open]);

  const visibleSuggestions = useMemo(
    () => suggestions.filter((s) => !value.includes(s.slug)),
    [suggestions, value]
  );

  const addSlug = (slug: string, skill?: Skill) => {
    if (!slug || value.includes(slug)) return;
    if (value.length >= maxItems) return;
    if (skill) {
      setResolved((prev) => ({ ...prev, [slug]: skill }));
    }
    onChange([...value, slug]);
    setQuery("");
  };

  const removeSlug = (slug: string) => {
    onChange(value.filter((s) => s !== slug));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !query && value.length) {
      e.preventDefault();
      removeSlug(value[value.length - 1]);
    }
    if (e.key === "Enter" && visibleSuggestions[0]) {
      e.preventDefault();
      addSlug(visibleSuggestions[0].slug, visibleSuggestions[0]);
    }
  };

  const chipLabel = (slug: string) => resolved[slug]?.name || slug;

  return (
    <div
      ref={wrapRef}
      className="skills-input-wrap"
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((slug) => (
        <span key={slug} className="skills-input-chip">
          {chipLabel(slug)}
          <button
            type="button"
            className="skills-input-chip-btn"
            aria-label={`Удалить ${chipLabel(slug)}`}
            onClick={(e) => {
              e.stopPropagation();
              removeSlug(slug);
            }}
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        className="skills-input-field"
        value={query}
        placeholder={value.length ? "" : placeholder}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {open && visibleSuggestions.length > 0 ? (
        <div className="skills-input-dropdown">
          {visibleSuggestions.map((s) => (
            <div
              key={s.slug}
              className="skills-input-option"
              onMouseDown={(e) => {
                e.preventDefault();
                addSlug(s.slug, s);
              }}
            >
              <span>{s.name}</span>
              <span className="skills-input-option-slug">{s.slug}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
