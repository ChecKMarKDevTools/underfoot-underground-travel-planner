export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cm: {
          primary: '#6B33A2',
          accent: '#f054b2',
          info: '#00bbf9',
          bg: '#0e0e12',
          panel: '#16161d',
          card: '#1e1e28',
          border: '#2a2a37',
          text: '#f6f7fb',
          sub: '#b8bbd0',
        },
      },
      boxShadow: {
        soft: '0 8px 30px rgba(0,0,0,.35)',
      },
      fontFamily: {
        pangolin: ['Pangolin', 'cursive'],
      },
    },
  },
  plugins: [],
};
