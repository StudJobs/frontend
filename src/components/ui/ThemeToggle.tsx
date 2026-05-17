// Переключатель темы (light / dark). Состояние хранится в localStorage["theme"]
// и применяется через атрибут <html data-theme="...">. Дефолт — dark.
import { useEffect, useState } from "react";

export type Theme = "dark" | "light";
const STORAGE_KEY = "theme";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "light" ? "light" : "dark";
}

export function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", t);
}

export function setTheme(t: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, t);
  } catch {
    // ignore quota
  }
  applyTheme(t);
}

export default function ThemeToggle({
  variant = "icon",
}: {
  variant?: "icon" | "labelled";
}) {
  const [theme, setLocal] = useState<Theme>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setLocal(next);
  };

  const next = theme === "dark" ? "Светлая тема" : "Тёмная тема";
  const icon = theme === "dark" ? "☀" : "☾";

  if (variant === "labelled") {
    return (
      <button
        type="button"
        onClick={toggle}
        className="btn btn--ghost"
        title={`Переключиться на ${next.toLowerCase()}`}
        style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
      >
        <span aria-hidden="true">{icon}</span>
        <span>{next}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Переключить на ${next.toLowerCase()}`}
      title={next}
      style={{
        background: "transparent",
        border: "1px solid var(--border)",
        color: "var(--ink)",
        width: 36,
        height: 36,
        borderRadius: 999,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 16,
        lineHeight: 1,
      }}
    >
      {icon}
    </button>
  );
}
