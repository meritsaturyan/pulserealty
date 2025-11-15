// src/setupProxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  const target = process.env.BACKEND_ORIGIN || 'http://localhost:5050';

  app.use(
    '/api',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
      logLevel: 'silent',
    })
  );

  app.use(
    '/socket.io',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
      logLevel: 'silent',
    })
  );
};
