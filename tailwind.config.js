/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}",
    "./constants/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        telegram: {
          primary: '#0088CC',
          secondary: '#40A7E3',
          dark: '#2B2F3A',
          darker: '#17212B',
          light: '#F4F4F5',
          lighter: '#FFFFFF',
          accent: '#64B5F6',
          success: '#4CAF50',
          warning: '#FF9800',
          error: '#F44336',
          text: '#000000',
          textLight: '#777777',
          textDark: '#FFFFFF',
          bubble: '#E3F2FD',
          bubbleOwn: '#DCF8C6',
          separator: '#E0E0E0',
          placeholder: '#999999',
        }
      },
      fontFamily: {
        'telegram': ['System', 'sans-serif'],
      },
      borderRadius: {
        'telegram': '18px',
        'telegram-sm': '12px',
        'telegram-lg': '24px',
      }
    },
  },
  plugins: [],
}