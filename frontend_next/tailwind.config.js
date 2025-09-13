module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        sepia: '#704214',
        gold: '#FFD700',
        rustic: '#C2B280',
      },
      fontFamily: {
        rustic: ['"IM Fell English SC"', 'serif'],
      },
    },
  },
  plugins: [],
}
