// Плашка-идентификатор «кто это» на профиле. Видна и владельцу (как self-label),
// и тому, кто зашёл из чата/откликов и хочет понять: студент это, HR или компания.
// Принимает либо явный `role` (как в Profile API), либо `kind` для не-юзерных
// сущностей вроде компании.
import { ReactNode } from "react";

type Kind = "student" | "hr" | "company" | "expert" | "developer" | "unknown";

const KIND_LABEL: Record<Kind, string> = {
  student: "Студент",
  hr: "HR",
  company: "Компания",
  expert: "Эксперт",
  developer: "Разработчик",
  unknown: "Пользователь",
};

const KIND_COLOR: Record<Kind, { bg: string; ink: string; border: string }> = {
  student:   { bg: "#e8f1ff", ink: "#1e3a8a", border: "#bfd6ff" },
  hr:        { bg: "#fff3e0", ink: "#9a4a00", border: "#ffd9a8" },
  company:   { bg: "#f0e8ff", ink: "#4a1d8a", border: "#d6bfff" },
  expert:    { bg: "#e6fff0", ink: "#0f6c3c", border: "#b6e8c8" },
  developer: { bg: "#fdecec", ink: "#9a1d1d", border: "#ffc4c4" },
  unknown:   { bg: "#eeeeee", ink: "#444",    border: "#ddd"    },
};

export function roleToKind(role?: string | null): Kind {
  const r = (role || "").toUpperCase();
  if (r.includes("STUDENT")) return "student";
  if (r.includes("EMPLOYER") || r === "ROLE_HR" || r.includes("HR")) return "hr";
  if (r.includes("COMPANY")) return "company";
  if (r.includes("EXPERT")) return "expert";
  if (r.includes("DEVELOPER")) return "developer";
  return "unknown";
}

export default function RoleBadge({
  role,
  kind,
  prefix,
  children,
  title,
}: {
  role?: string | null;
  kind?: Kind;
  prefix?: ReactNode;
  children?: ReactNode;
  title?: string;
}) {
  const k = kind || roleToKind(role);
  const c = KIND_COLOR[k];
  const label = children ?? KIND_LABEL[k];
  return (
    <span
      title={title || `Профиль: ${KIND_LABEL[k]}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 999,
        background: c.bg,
        color: c.ink,
        border: `1px solid ${c.border}`,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 0.2,
        whiteSpace: "nowrap",
      }}
    >
      {prefix}
      {label}
    </span>
  );
}
