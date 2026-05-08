import React, { useEffect, useMemo, useRef, useState } from "react";
import { Skill, SkillsAPI } from "../../api/skills";

type Props = {
  value: string[];
  onChange: (slugs: string[]) => void;
  placeholder?: string;
  maxItems?: number;
};

const styles = {
  wrap: {
    border: "1px solid #d6d6d6",
    borderRadius: 12,
    padding: 8,
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 6,
    background: "#fff",
    minHeight: 44,
    position: "relative" as const,
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    background: "#eef2ff",
    border: "1px solid #c7d2fe",
    color: "#1e3a8a",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
  },
  chipBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "inherit",
    fontSize: 14,
    padding: 0,
    lineHeight: 1,
  },
  input: {
    flex: 1,
    minWidth: 120,
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 14,
    padding: "4px 6px",
  },
  dropdown: {
    position: "absolute" as const,
    top: "100%",
    left: 0,
    right: 0,
    background: "#fff",
    border: "1px solid #d6d6d6",
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 240,
    overflowY: "auto" as const,
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
    zIndex: 30,
  },
  option: {
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: 14,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
  },
  optionSlug: {
    opacity: 0.55,
    fontSize: 12,
    fontWeight: 600,
  },
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

  // Резолв slug → Skill для отображения имён в чипах
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

  // Дебаунс-поиск (или popular при пустом вводе)
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

  // Закрытие по клику снаружи
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
    <div ref={wrapRef} style={styles.wrap} onClick={() => inputRef.current?.focus()}>
      {value.map((slug) => (
        <span key={slug} style={styles.chip}>
          {chipLabel(slug)}
          <button
            type="button"
            style={styles.chipBtn}
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
        style={styles.input}
        value={query}
        placeholder={value.length ? "" : placeholder}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {open && visibleSuggestions.length > 0 ? (
        <div style={styles.dropdown}>
          {visibleSuggestions.map((s) => (
            <div
              key={s.slug}
              style={styles.option}
              onMouseDown={(e) => {
                e.preventDefault();
                addSlug(s.slug, s);
              }}
            >
              <span>{s.name}</span>
              <span style={styles.optionSlug}>{s.slug}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
