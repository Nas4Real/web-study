import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#000000",
        panel: "#09090b",
        card: "#121214",
        "card-hover": "#18181b",
        "border-base": "#1f1f22",
        "border-panel": "#27272a",
        "border-hover": "#3f3f46",
        text: "#fafafa",
        "text-secondary": "#d4d4d8",
        "text-muted": "#a1a1aa",
        "text-tertiary": "#71717a",
        "text-disabled": "#52525b",
        algebra: "#ec4899",
        analysis: "#06b6d4",
        physics: "#10b981",
        mechanics: "#3b82f6",
        method: "#f59e0b",
        languages: "#eab308",
      },
      borderRadius: {
        workspace: "20px",
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-ibm-plex-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
