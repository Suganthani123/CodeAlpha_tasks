module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      animation: {
        'float': 'float 1s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: 1 },
          '100%': { transform: 'translateY(-100px) scale(1.5)', opacity: 0 },
        }
      }
    },
  },
  plugins: [],
}