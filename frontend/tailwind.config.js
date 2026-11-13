/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3525CD',
        'primary-container': '#4F46E5',
        secondary: '#006A61',
        background: '#F8F9FF',
        surface: '#F8F9FF',
        'surface-container-lowest': '#FFFFFF',
        'surface-container': '#E5EEFF',
        'surface-container-high': '#DCE9FF',
        'on-surface': '#0B1C30',
        'on-surface-variant': '#464555',
        'outline-variant': '#C7C4D8',
        error: '#BA1A1A',
        'error-container': '#FFDAD6'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        '3xl': '1.5rem',
      }
    },
  },
  plugins: [],
}
