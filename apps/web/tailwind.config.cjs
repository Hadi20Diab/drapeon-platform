/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Bodoni Moda'", "serif"],
        body: ["'Plus Jakarta Sans'", "sans-serif"]
      },
      colors: {
        brand: {
          ink: "#101010",
          gold: "#b66a3c",
          sand: "#fffaf2",
          rose: "#9b1232",
          stone: "#d8d0c4",
          olive: "#3f5942"
        }
      },
      boxShadow: {
        soft: "0 24px 70px -44px rgba(16, 16, 16, 0.7)"
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        rise: "rise 0.7s cubic-bezier(0.2, 0.9, 0.2, 1) both"
      }
    }
  },
  plugins: []
};
