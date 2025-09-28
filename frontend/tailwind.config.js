export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Dream Horizon Color Scheme
        'pearl-white': '#FDFDFE',
        'mist-surface': '#F3F5F8',
        'midnight-navy': '#0D1B2A',
        'aurora-purple': '#9D4EDD',
        'soft-teal': '#1FAAA0',
        'mid-orange': '#FF914D',
        'plasma-pink': '#E03FD8',
        'deep-space': '#0A0E1A',
        'dark-surface': '#1A1F2E',

        cm: {
          // Dream Horizon inspired palette with mystical underground theme
          primary: '#9D4EDD', // Aurora Purple
          accent: '#E03FD8', // Plasma Pink
          info: '#1FAAA0', // Soft Teal
          cta: '#FF914D', // Mid Orange

          // Light theme defaults
          bg: '#FDFDFE', // Pearl White
          panel: '#F3F5F8', // Mist Surface
          card: '#FFFFFF', // Pure White Cards
          border: '#E1E7ED', // Light Border
          text: '#0D1B2A', // Midnight Navy
          sub: '#64748B', // Slate Gray

          // Dark theme variants (applied via class)
          'bg-dark': '#0A0E1A', // Deep Space
          'panel-dark': '#1A1F2E', // Dark Surface
          'card-dark': '#262B3A', // Dark Card
          'border-dark': '#2D3748', // Dark Border
          'text-dark': '#FDFDFE', // Pearl White
          'sub-dark': '#A0AEC0', // Light Gray
        },
      },
      boxShadow: {
        soft: '0 8px 30px rgba(0,0,0,.35)',
        aurora: '0 4px 20px rgba(157, 78, 221, 0.3)',
        mystical: '0 8px 32px rgba(157, 78, 221, 0.2)',
      },
      fontFamily: {
        // Keep existing font
        pangolin: ['Pangolin', 'cursive'],
        // Add new Dream Horizon fonts
        flavors: ['Flavors', 'cursive'],
        inter: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'mystical-glow': 'mysticalGlow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        mysticalGlow: {
          '0%': { boxShadow: '0 0 20px rgba(157, 78, 221, 0.3)' },
          '100%': { boxShadow: '0 0 30px rgba(157, 78, 221, 0.6)' },
        },
      },
    },
  },
  plugins: [],
};
