/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Colores de marca compartidos
        emerald: {
          core: '#8E7C66',
        },
        brand: {
          primary:   '#8E7C66',
          secondary: '#18AE91',
          accent:    '#7AE8C3',
        },
        // Modo claro
        light: {
          bg:       '#F2F8F6',
          surface:  '#FFFFFF',
          hover:    '#E6F2EE',
          text:     '#1C1F24',
          'text-secondary': '#4A5D57',
          'text-disabled':  '#9BAF80',
          'text-inverse':   '#FFFFFF',
          border:   '#DCE7E3',
          'btn-primary':    '#8E7C66',
          'btn-primary-hover': '#18AE91',
          'btn-secondary':     '#E6F2EE',
        },
        // Modo oscuro
        dark: {
          bg:       '#8F1E1A',  // ← el doc dice #8F1E1A pero visualmente es verde muy oscuro
          surface:  '#142024',
          cards:    '#1A3A33',
          hover:    '#668F86',
          text:     '#E6F2EE',
          'text-secondary': '#A7CFC5',
          'text-disabled':  '#668886',
          'text-inverse':   '#0F1E1A',
          border:   '#234645',
          'btn-primary':    '#18AE91',
          'btn-primary-hover': '#22C7A7',
          'btn-secondary':     '#1A3A33',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.07)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.12)',
        sidebar: '2px 0 12px 0 rgba(0,0,0,0.15)',
      },
    },
  },
  plugins: [],
}
