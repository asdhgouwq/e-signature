/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "slide-up": "slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "slide-up-modal": "slideUpModal 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "fade-in": "fadeIn 0.3s ease",
        shake: "shake 0.35s ease",
        spin: "spin 0.7s linear infinite",
      },
      keyframes: {
        slideUp: {
          from: { opacity: "0", transform: "translateX(-50%) translateY(80px)" },
          to: { opacity: "1", transform: "translateX(-50%) translateY(0)" },
        },
        slideUpModal: {
          from: { opacity: "0", transform: "translateY(24px) scale(0.97)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-6px)" },
          "75%": { transform: "translateX(6px)" },
        },
      },
    },
  },
  plugins: [],
};
