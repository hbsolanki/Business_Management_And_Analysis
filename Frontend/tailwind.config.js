/** @type {import('tailwindcss').Config} */
import colors from "tailwindcss/colors";

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        gray: colors.slate,
        brand: {
          50: "#ecfdfb",
          100: "#d1faf2",
          200: "#a7f3e4",
          300: "#67e8d3",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
        },
        ink: {
          900: "#0f172a",
          700: "#334155",
          500: "#64748b",
        },
      },
      boxShadow: {
        sm: "0 4px 14px -8px rgba(15, 23, 42, 0.5)",
        md: "0 14px 30px -18px rgba(15, 23, 42, 0.45)",
        lg: "0 24px 48px -30px rgba(15, 23, 42, 0.5)",
        xl: "0 30px 70px -38px rgba(15, 23, 42, 0.55)",
        soft: "0 12px 34px -26px rgba(15, 23, 42, 0.65)",
        card: "0 18px 48px -32px rgba(15, 23, 42, 0.6)",
        glow: "0 20px 60px -40px rgba(20, 184, 166, 0.9)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0px)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        float: "float 7s ease-in-out infinite",
        "fade-up": "fade-up 0.8s ease-out both",
        "fade-in": "fade-in 0.6s ease-out both",
      },
    },
  },
  plugins: [],
};
