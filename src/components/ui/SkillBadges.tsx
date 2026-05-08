import React, { useEffect, useState } from "react";
import { Skill, SkillsAPI } from "../../api/skills";

type Props = {
  slugs: string[];
  emptyText?: string;
};

const styles = {
  row: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 6,
    marginTop: 6,
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    background: "#eef2ff",
    border: "1px solid #c7d2fe",
    color: "#1e3a8a",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1.2,
  },
  empty: {
    fontSize: 13,
    opacity: 0.6,
  },
};

export default function SkillBadges({ slugs, emptyText = "Навыки не указаны" }: Props) {
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
    return <span style={styles.empty}>{emptyText}</span>;
  }

  return (
    <div style={styles.row}>
      {slugs.map((slug) => (
        <span key={slug} style={styles.badge}>
          {resolved[slug]?.name || slug}
        </span>
      ))}
    </div>
  );
}
