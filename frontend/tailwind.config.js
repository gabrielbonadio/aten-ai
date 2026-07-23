/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: "var(--color-surface)",
        "surface-muted": "var(--color-surface-muted)",
        ink: "var(--color-ink)",
        "ink-muted": "var(--color-ink-muted)",
        border: "var(--color-border)",
        brand: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
        },
      },
      backgroundColor: {
        overlay: "var(--color-overlay)",
      },
    },
  },
  plugins: [],
};
