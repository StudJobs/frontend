import { useEffect, useState } from "react";
import { Skill, SkillsAPI } from "../../api/skills";

type Props = {
  slugs: string[];
  emptyText?: string;
  variant?: "default" | "verified" | "neutral";
};

export default function SkillBadges({
  slugs,
  emptyText = "Навыки не указаны",
  variant = "default",
}: Props) {
  const [resolved, setResolved] = useState<Record<string, Skill>>({});

  useEffect(() => {
    if (!slugs?.length) return;
    let cancelled = false;
    SkillsAPI.bulk(slugs)
      .then((items) => {
        if (cancelled) return;
        const map: Record<string, Skill> = {};
        items.forEach((it) => {
          if (it.slug) map[it.slug] = it;
        });
        setResolved(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slugs.join(",")]);

  if (!slugs?.length) {
    return <span className="skill-badge-empty">{emptyText}</span>;
  }

  const cls =
    variant === "verified"
      ? "skill-badge skill-badge--success"
      : variant === "neutral"
      ? "skill-badge skill-badge--neutral"
      : "skill-badge";

  return (
    <div className="skills-row">
      {slugs.map((slug) => (
        <span key={slug} className={cls}>
          {resolved[slug]?.name || slug}
        </span>
      ))}
    </div>
  );
}
