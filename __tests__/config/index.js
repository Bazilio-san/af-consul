const consul = require('./consul');

const accessPoints = require('./access-points.json');

module.exports = {
  consul,
  accessPoints,
  webServer: {
    host: process.env.WS_HOST || '0.0.0.0',
    port: process.env.WS_PORT || '10000',
  },
};
