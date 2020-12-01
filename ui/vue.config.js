module.exports = {
  devServer: {
    proxy: 'http://localhost:8095'
  },
  publicPath: process.env.PUBLIC_PATH || '/'
}