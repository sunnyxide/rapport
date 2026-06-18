import type { Config } from "tailwindcss";

// Rapport — white editorial / newspaper aesthetic.
// paper #FBFAF7 · ink · single ink-blue accent · hairline dividers.
// serif display (names/sections) + sans body + mono micro ([n]/meta).
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FBFAF7",
        panel: "#F2EFE8", // soft inset panel
        ink: "#1A1A1A",
        accent: "#1F3A5F", // single ink-blue accent
        hair: "#E4E0D8", // hairline divider
        muted: "#6B6760",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "Cambria", "Times New Roman", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "Helvetica", "Arial", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      maxWidth: {
        reading: "44rem",
      },
    },
  },
  plugins: [],
};

export default config;
