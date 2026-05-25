/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        /* 🛡️ Force Tailwind to use Satoshi everywhere */
        sans: ['Satoshi', 'system-ui', 'sans-serif'], 
      },
      colors: {
        background: 'var(--bg-primary)',
        surface: 'var(--bg-surface)',
        card: 'var(--bg-card)',
        textPrimary: 'var(--text-primary)',
        textMuted: 'var(--text-muted)',
        accent: 'var(--accent-primary)',
        accentHover: 'var(--accent-hover)',
        success: 'var(--status-success)',
        danger: 'var(--status-danger)',
        online: 'var(--status-online)',
        borderSubtle: 'var(--border-subtle)',
      },
      animation: {
        'fadeIn': 'fadeIn 0.3s ease-in-out',
        'slideInRight': 'slideInRight 0.3s ease-out',
        'slideInLeft': 'slideInLeft 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}