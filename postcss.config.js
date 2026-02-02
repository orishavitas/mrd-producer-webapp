module.exports = {
  plugins: {
    // Autoprefixer automatically adds vendor prefixes for cross-browser CSS
    // It reads the browserslist config from package.json
    autoprefixer: {
      flexbox: 'no-2009', // Use modern flexbox spec only
      grid: 'autoplace',  // Enable IE grid support with autoplacement
    },
  },
};
