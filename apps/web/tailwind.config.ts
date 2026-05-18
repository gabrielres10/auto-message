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
      },
      colors: {
        "harmony-surface-1": "hsl(var(--surface-1))",
        "harmony-surface-2": "hsl(var(--surface-2))",
        "harmony-border-subtle": "hsl(var(--border-subtle))",
        "harmony-fg": "hsl(var(--fg))",
        "harmony-fg-secondary": "hsl(var(--fg-secondary))",
        "harmony-cta": "hsl(var(--cta))",
      },
    },
  },
  plugins: [],
};

export default config;
