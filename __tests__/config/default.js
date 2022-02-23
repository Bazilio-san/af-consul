const { name } = require('../../package.json');
const accessPoints = require('./access-points.json');
const consul = require('./consul');

module.exports = {
  name,
  consul,
  accessPoints,
  webServer: {
    host: process.env.WS_HOST || '0.0.0.0',
    port: process.env.WS_PORT || '10000',
  },
};
