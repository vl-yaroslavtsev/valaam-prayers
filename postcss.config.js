module.exports = {
  plugins: {
    "postcss-preset-env": {
      stage: 2,
      features: {
        "nesting-rules": true,
        "color-functional-notation": true,
      },
    },
  },
};
