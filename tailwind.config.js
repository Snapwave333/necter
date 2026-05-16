/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Use CSS variables for theme-aware colors
        background: {
          DEFAULT: 'var(--color-background)',
          secondary: 'var(--color-background-secondary)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          hover: 'var(--color-surface-hover)',
          active: 'var(--color-surface-active)',
          muted: 'var(--color-surface-muted)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          muted: 'var(--color-border-muted)',
          subtle: 'var(--color-border-subtle)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          muted: 'var(--color-accent-muted)',
        },
        mcp: {
          DEFAULT: 'var(--color-mcp)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'soft': 'var(--shadow-soft)',
        'card': 'var(--shadow-card)',
        'elevated': 'var(--shadow-elevated)',
      },
      borderRadius: {
        'lg': '8px',
        'xl': '10px',
        '2xl': '14px',
        '3xl': '16px',
      },
      backgroundImage: {
        'grid-pattern': `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4d2cc' fill-opacity='0.4'%3E%3Cpath d='M0 0h1v40H0V0zm39 0h1v40h-1V0z'/%3E%3Cpath d='M0 0h40v1H0V0zm0 39h40v1H0v-1z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      },
      animation: {
        'fade-in': 'fadeIn 0.18s ease-out',
        'slide-up': 'slideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        'spin-slow': 'spin 2s linear infinite',
        'expand': 'expand 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        'tool-pulse': 'toolPulse 2s ease-in-out infinite',
        'message-enter': 'messageEnter 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        'tag-enter': 'tagEnter 0.38s cubic-bezier(0.16, 1, 0.3, 1) both',
        'glow-pulse': 'glowPulse 5s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2.2s ease-in-out infinite',
        'streaming-dot-1': 'streamingDot 1.2s ease-in-out infinite',
        'streaming-dot-2': 'streamingDot 1.2s ease-in-out 0.2s infinite',
        'streaming-dot-3': 'streamingDot 1.2s ease-in-out 0.4s infinite',
        'panel-enter': 'panelEnter 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        'cognition-bar': 'cognitionBar 2.5s ease-in-out infinite',
        'orb-pulse': 'orbPulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        expand: {
          '0%': { opacity: '0', maxHeight: '0' },
          '100%': { opacity: '1', maxHeight: '500px' },
        },
        toolPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        messageEnter: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        tagEnter: {
          '0%': { opacity: '0', transform: 'translateY(6px) scale(0.94)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        glowPulse: {
          '0%': { opacity: '0.45', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1.12)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
        streamingDot: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(0.8)' },
          '50%': { opacity: '1', transform: 'scale(1)' },
        },
        panelEnter: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        cognitionBar: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        orbPulse: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(0.95)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
      },
    },
  },
  plugins: [],
}
