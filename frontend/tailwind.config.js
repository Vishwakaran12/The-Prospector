/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'western-brown': '#8B4513',
        'gold': '#FFD700',
        'desert-sand': '#F4E4BC',
        'leather': '#964B00',
        'copper': '#B87333',
        'sepia': '#704214'
      },
      fontFamily: {
        'western': ['serif'],
        'saloon': ['cursive']
      },
      backgroundImage: {
        'parchment': "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjRjRFNEJDIiBmaWxsLW9wYWNpdHk9IjAuMyIvPgo8L3N2Zz4K')",
        'treasure-map': "linear-gradient(45deg, #F4E4BC 25%, transparent 25%), linear-gradient(-45deg, #F4E4BC 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #F4E4BC 75%), linear-gradient(-45deg, transparent 75%, #F4E4BC 75%)"
      }
    },
  },
  plugins: [],
}
