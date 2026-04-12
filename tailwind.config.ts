import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: 'rgb(var(--color-cream) / <alpha-value>)',
        parchment: 'rgb(var(--color-parchment) / <alpha-value>)',
        oat: 'rgb(var(--color-oat) / <alpha-value>)',
        taupe: 'rgb(var(--color-taupe) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        oliveGray: 'rgb(var(--color-olive-gray) / <alpha-value>)',
        sage: 'rgb(var(--color-sage) / <alpha-value>)',
        terracotta: 'rgb(var(--color-terracotta) / <alpha-value>)',
        olive: 'rgb(var(--color-olive) / <alpha-value>)'
      },
      fontFamily: {
        display: ['var(--font-display-family)', 'Georgia', 'serif'],
        sans: ['Roboto Condensed', 'ui-sans-serif', 'system-ui', 'sans-serif']
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
        halo: 'var(--bg-halo)',
        wash: 'var(--bg-wash)'
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