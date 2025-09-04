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
          light: '#f7f8fc',
          lighter: '#FFFFFF',
          accent: '#64B5F6',
          success: '#4CAF50',
          warning: '#FF9800',
          error: '#F44336',
          text: '#2c3e50',
          textLight: '#6c757d',
          textDark: '#FFFFFF',
          bubble: '#E3F2FD',
          bubbleOwn: '#0088CC',
          separator: '#E0E0E0',
          placeholder: '#95a5a6',
        },
        // Additional modern color palette
        modern: {
          gray: {
            50: '#f8f9fa',
            100: '#f1f3f4',
            200: '#e8eaed',
            300: '#dadce0',
            400: '#bdc1c6',
            500: '#9aa0a6',
            600: '#80868b',
            700: '#5f6368',
            800: '#3c4043',
            900: '#202124',
          },
          blue: {
            50: '#e8f0fe',
            100: '#d2e3fc',
            200: '#aecbfa',
            300: '#8ab4f8',
            400: '#669df6',
            500: '#4285f4',
            600: '#1a73e8',
            700: '#1967d2',
            800: '#185abc',
            900: '#174ea6',
          }
        }
      },
      fontFamily: {
        'telegram': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        'modern': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
      },
      borderRadius: {
        'telegram': '18px',
        'telegram-sm': '12px',
        'telegram-lg': '24px',
        'modern': '16px',
        'modern-sm': '12px',
        'modern-lg': '20px',
      },
      boxShadow: {
        'telegram': '0 2px 8px rgba(0, 136, 204, 0.3)',
        'telegram-sm': '0 1px 4px rgba(0, 136, 204, 0.2)',
        'telegram-lg': '0 4px 12px rgba(0, 136, 204, 0.4)',
        'modern': '0 2px 12px rgba(0, 0, 0, 0.08)',
        'modern-sm': '0 1px 6px rgba(0, 0, 0, 0.06)',
        'modern-lg': '0 4px 20px rgba(0, 0, 0, 0.12)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.1)',
        'float': '0 6px 16px rgba(0, 0, 0, 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'bounce-in': 'bounceIn 0.6s ease-out',
        'pulse-soft': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      }
    },
  },
  plugins: [],
}