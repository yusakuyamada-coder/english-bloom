/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sage:   { 50:'#eaf0e8', 100:'#c8d9c4', 200:'#a6c2a0', 400:'#6e9a66', 500:'#5a8952', 600:'#4d7a46' },
        greige: { 50:'#f7f4f0', 100:'#ede8e1', 200:'#ddd4cc', 300:'#ccc0b5', 400:'#b8a99a', 500:'#a69080', 700:'#6d5a4f', 800:'#4f4037' },
        cream:  '#faf8f5',
      },
    },
  },
  plugins: [],
}
