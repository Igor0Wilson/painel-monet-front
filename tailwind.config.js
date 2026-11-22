/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'Segoe UI',
          '-apple-system',
          'BlinkMacSystemFont',
          'Roboto',
          'Helvetica Neue',
          'sans-serif',
        ],
      },
      colors: {
        primary: "#0f172a",
        secondary: "#ffffff",
        accent: "#0d9488",
        danger: "#e11d48",
        success: "#059669",
      },
      boxShadow: {
        'executive': '0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 4px 16px -2px rgba(15, 23, 42, 0.06)',
        'executive-lg': '0 12px 32px -8px rgba(15, 23, 42, 0.14), 0 4px 12px -4px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
