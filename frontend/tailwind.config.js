export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cm: {
          // Underground inspired palette: basalt, clay, quartz vein accents
          primary: '#8657D3', // amethyst vein
          accent: '#E6679E', // rose quartz accent
          info: '#3BB8C8', // aquifer cyan
          bg: '#0c0c11', // deeper basalt
          panel: '#15151c',
          card: '#1c1c25',
          border: '#272732',
          text: '#F5F7FA',
          sub: '#A7ABBE',
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
