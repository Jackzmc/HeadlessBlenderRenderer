const path = require('path');
const HtmlWebPackPlugin = require("html-webpack-plugin")

module.exports = {
  entry: './src/js/main.js',
  output: {
    filename: 'js/bundle.js',
    publicPath: '/',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
    {
        test: /\.css$/,
        use: [
            { loader: 'style-loader' },
            { loader: 'css-loader' }
        ],
    },
    {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
    },
    {
        test: /\.html$/,
        use: [{loader: "html-loader"}]
    }]
  },
  plugins: [
    new HtmlWebPackPlugin({
      template: "./src/html/index.html",
      filename: "./index.html",
      excludeChunks: [ 'server' ]
    })
  ]
};