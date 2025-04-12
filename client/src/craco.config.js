// craco.config.js
const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      );
      webpackConfig.resolve = {
        ...webpackConfig.resolve,
        fallback: {
          buffer: require.resolve('buffer/'),
          stream: require.resolve('stream-browserify'),
          crypto: require.resolve('crypto-browserify'),
          process: require.resolve('process/browser'),
          os: require.resolve('os-browserify/browser'), // Добавлено
          fs: false, // Отключаем fs, так как он не нужен в браузере
          path: require.resolve('path-browserify'), // Добавлено
        },
      };
      return webpackConfig;
    },
  },
};