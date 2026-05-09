import type { Config } from "tailwindcss";

/* Tailwind reads CSS variables from tokens.css. Цвета задаются как
   `bg-bg`, `bg-surface`, `text-fg`, `border-border` и т.п. Это позволяет
   менять палитру в одном месте (tokens.css) без правки конфига. */

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-elev": "var(--surface-elev)",
        "surface-hover": "var(--surface-hover)",
        "surface-soft": "var(--surface-soft)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        fg: "var(--fg)",
        "fg-muted": "var(--fg-muted)",
        "fg-subtle": "var(--fg-subtle)",
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "accent-soft": "var(--accent-soft)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        info: "var(--info)",
        // Brand-палитра (исторические карточки на главной)
        "brand-red": "var(--brand-red)",
        "brand-green": "var(--brand-green)",
        "brand-purple": "var(--brand-purple)",
        // Совместимость со старыми классами
        primary: "var(--accent)",
        purple: "var(--brand-purple)",
        dark: "var(--bg)",
        grayish: "var(--fg-muted)",
      },
      fontFamily: {
        sans: ["Inter", "Manrope", "Gilroy", "ui-sans-serif", "system-ui"],
        display: ["Gilroy", "Inter", "ui-sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SF Mono", "Menlo"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        glow: "var(--shadow-glow)",
        soft: "var(--shadow-md)",
      },
    },
  },
  plugins: [],
} satisfies Config;
