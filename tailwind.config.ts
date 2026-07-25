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
        brand: {
          blue: "#1D4ED8",
          "blue-dark": "#1E40AF",
          orange: "#E85A00",
          green: "#16A34A",
          red: "#DC2626",
          amber: "#F59E0B",
          violet: "#7C3AED",
          indigo: "#4338CA",
        },
      },
    },
  },
  plugins: [],
};

export default config;
