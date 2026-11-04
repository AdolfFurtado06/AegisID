/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bgMain: "#F6F7F3",
        surface: "#FFFFFF",
        textPrimary: "#202B28",
        textSecondary: "#68736E",
        forest: {
          DEFAULT: "#236B53",
          hover: "#1c5643",
          light: "#E7F0E9",
        },
        tealAccent: "#4E8C82",
        borderSoft: "#DDE4DE",
        brandSuccess: "#23845B",
        brandWarning: "#B7791F",
        brandDanger: "#B94A48",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
        btn: "8px",
      },
    },
  },
  plugins: [],
}
