import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2D6A4F", // Forest Green
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#40916C", // Emerald
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#D4A373", // Warm Gold
          foreground: "#1F2937",
        },
        surface: {
          DEFAULT: "#F8F9FA", // Light background
          dark: "#111827", // Dark background
        },
        card: {
          DEFAULT: "#FFFFFF",
          dark: "#1F2937",
        },
        ink: {
          DEFAULT: "#1F2937", // Text
          muted: "#6B7280", // Muted text
        },
        success: "#16A34A",
        warning: "#F59E0B",
        error: "#DC2626",
      },
      fontFamily: {
        display: ["var(--font-poppins)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      boxShadow: {
        soft: "0 4px 24px -8px rgba(17, 24, 39, 0.08)",
        "soft-lg": "0 12px 40px -12px rgba(17, 24, 39, 0.15)",
        glow: "0 0 0 1px rgba(45, 106, 79, 0.08), 0 8px 30px -10px rgba(45, 106, 79, 0.25)",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
