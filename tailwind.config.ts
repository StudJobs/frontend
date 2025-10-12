import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#4B6EB9",
        success: "#55B432",
        purple: "#874BA0",
        danger: "#E63246",
        black: "#000000",
        white: "#FFFFFF",
        grayish: "#7D7D7D",
        dark: "#131313"
      },
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui"],
        serif: ["Playfair Display", "ui-serif"]
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,.15)"
      }
    }
  },
  plugins: []
} satisfies Config;
