import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A1128", // Midnight blue background
        foreground: "#FFFFFF",
        primary: {
          DEFAULT: "#D4A373", // Rose gold primary
          foreground: "#0A1128",
        },
        secondary: {
          DEFAULT: "#FF6B8B", // Soft pink secondary
          foreground: "#FFFFFF",
        },
        card: {
          DEFAULT: "#151F3C", // Dark card background
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#8E9AA8",
          foreground: "#0A1128",
        },
        accent: {
          DEFAULT: "#D4A373",
          foreground: "#0A1128",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "premium-gold": "linear-gradient(135deg, #D4A373 0%, #B38253 100%)",
        "premium-pink": "linear-gradient(135deg, #FF6B8B 0%, #D84B6E 100%)",
        "premium-dark": "linear-gradient(180deg, #0A1128 0%, #152244 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
