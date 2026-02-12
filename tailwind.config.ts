import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        text: "rgb(var(--text) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        cs2: "rgb(var(--cs2) / <alpha-value>)",
        cs2b: "rgb(var(--cs2b) / <alpha-value>)"
      },
      boxShadow: {
        soft: "0 10px 40px rgba(0,0,0,.35)",
      },
      borderRadius: {
        xl2: "1.25rem"
      }
    },
  },
  plugins: [],
} satisfies Config;
