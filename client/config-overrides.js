const { override, adjustStyleLoaders, addWebpackResolve } = require('customize-cra');

module.exports = override(
  addWebpackResolve({
    modules: [path.resolve(__dirname, 'src'), 'node_modules'],
  })
);