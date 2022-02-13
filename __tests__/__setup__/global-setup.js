/* eslint-disable no-console */
require('dotenv').config();
const http = require('http');
const config = require('../config');

const runMiniServer = () => {
  const p = +config.webServer.port;
  const s = http.createServer((x, r) => r.writeHead(200).end('ok')).listen(p, () => console.log(`listen: ${p}`));
  setTimeout(() => s.close(() => console.log('Web server closed')), 60_000);
};

module.exports = async () => {
  runMiniServer();
  process.env.NODE_ENV = 'test';
};
