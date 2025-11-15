// src/setupProxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {

  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5050',
      changeOrigin: true,

      secure: false,
      logLevel: 'warn',
    })
  );


  app.use(
    '/socket.io',
    createProxyMiddleware({
      target: 'http://localhost:5050',
      changeOrigin: true,
      ws: true,          
      secure: false,
      logLevel: 'warn',
    })
  );
};
