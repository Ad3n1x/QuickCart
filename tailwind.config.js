/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        qc: {
          ink: "var(--ink)",
          muted: "var(--muted)",
          surface: "var(--surface)",
          subtle: "var(--surface-2)",
          line: "var(--line)",
          accent: "var(--accent)",
          "accent-soft": "var(--accent-soft)",
          danger: "var(--danger)"
        }
      },
      boxShadow: {
        card: "var(--shadow)",
        lift: "0 14px 34px color-mix(in srgb, var(--accent) 12%, transparent)"
      },
      borderRadius: { "qc": "var(--radius)", "qc-sm": "var(--radius-sm)" }
    }
  },
  plugins: []
};
