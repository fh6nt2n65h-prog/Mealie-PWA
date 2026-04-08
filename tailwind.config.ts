import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F7F3EC',
        parchment: '#FBF8F2',
        oat: '#F1E8DA',
        taupe: '#D8CCBA',
        ink: '#2E2924',
        oliveGray: '#6F685F',
        sage: '#9EAA92',
        terracotta: '#B86F4B',
        olive: '#7B7A4B'
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        paper: '0 14px 35px rgba(86, 72, 51, 0.08)',
        insetPaper: 'inset 0 1px 0 rgba(255, 255, 255, 0.65), inset 0 -1px 0 rgba(183, 160, 128, 0.18)'
      },
      borderRadius: {
        shell: '2rem',
        card: '1.5rem'
      },
      backgroundImage: {
        grain: "radial-gradient(circle at 1px 1px, rgba(76, 60, 42, 0.045) 1px, transparent 0)",
        halo: 'radial-gradient(circle at top, rgba(184, 111, 75, 0.12), transparent 46%)',
        wash: 'linear-gradient(180deg, rgba(255,255,255,0.55), rgba(247,243,236,0.2))'
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        rise: 'rise 420ms ease-out both'
      }
    }
  },
  plugins: []
} satisfies Config