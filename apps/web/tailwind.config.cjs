/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Cormorant Garamond'", "serif"],
        body: ["'Manrope'", "sans-serif"]
      },
      colors: {
        brand: {
          ink: "#14110f",
          gold: "#ab8f53",
          sand: "#f5efe4",
          rose: "#d8c0b7",
          stone: "#d3cabf"
        }
      },
      boxShadow: {
        soft: "0 12px 40px -18px rgba(17, 17, 17, 0.45)"
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
