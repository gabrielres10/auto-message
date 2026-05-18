import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      colors: {
        "harmony-surface-1": "hsl(var(--surface-1))",
        "harmony-surface-2": "hsl(var(--surface-2))",
        "harmony-surface-3": "hsl(var(--surface-3))",
        "harmony-border-subtle": "hsl(var(--border-subtle))",
        "harmony-fg": "hsl(var(--fg))",
        "harmony-fg-secondary": "hsl(var(--fg-secondary))",
        "harmony-cta": "hsl(var(--cta))",
        "harmony-cta-muted": "hsl(var(--cta-muted))",
      },
      boxShadow: {
        "glow-cta": "0 0 0 1px hsl(var(--cta) / 0.3), 0 4px 24px hsl(var(--cta) / 0.22)",
        "glow-cta-xs": "0 0 12px hsl(var(--cta) / 0.18)",
        "card": "0 1px 3px hsl(0 0% 0% / 0.25), 0 1px 1px hsl(0 0% 0% / 0.15)",
        "card-hover": "0 4px 16px hsl(0 0% 0% / 0.3), 0 1px 3px hsl(0 0% 0% / 0.2)",
      },
      keyframes: {
        "slide-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "200% center" },
          "100%": { backgroundPosition: "-200% center" },
        },
        "pulse-ring": {
          "0%, 100%": { boxShadow: "0 0 0 0 hsl(var(--cta) / 0.4)" },
          "50%": { boxShadow: "0 0 0 4px hsl(var(--cta) / 0)" },
        },
      },
      animation: {
        "slide-up": "slide-up 0.2s ease-out",
        "fade-in": "fade-in 0.15s ease-out",
        "shimmer": "shimmer 3s linear infinite",
        "pulse-ring": "pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
