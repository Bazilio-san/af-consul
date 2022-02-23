const config = require('config');

const cfg = config; // .util.toObject();

const writableKeys = ['accessPoints'];
Object.keys(cfg).forEach((key) => {
  if (!writableKeys.includes(key) && typeof cfg[key] === 'object') {
    config.util.makeImmutable(cfg[key]);
  }
});
module.exports = config;
