const os = require('os');

const thisHostName = os.hostname();

module.exports = {
  check: {
    interval: process.env.CONSUL_HEALTH_CHECK_INTERVAL || '1s',
    timeout: process.env.CONSUL_HEALTH_CHECK_TMEOUT || '1s',
    deregistercriticalserviceafter: process.env.CONSUL_DEREGISTER_CRITICAL_SERVICE_AFTER || '1m',
  },
  agent: {
    reg: {
      host: process.env.CONSUL_AGENT_HOST || thisHostName,
      port: process.env.CONSUL_AGENT_PORT || '8500',
      secure: process.env.CONSUL_AGENT_SECURE,
      token: process.env.CONSUL_AGENT_TOKEN,
    },
    dev: {
      dc: process.env.CONSUL_QUERY_DEV_DC || 'dc-dev',
      host: process.env.CONSUL_QUERY_DEV_HOST || thisHostName,
      port: process.env.CONSUL_QUERY_DEV_PORT || '8500',
      secure: process.env.CONSUL_QUERY_DEV_SECURE,
      token: process.env.CONSUL_AGENT_DEV_TOKEN,
    },
    prd: {
      dc: process.env.CONSUL_QUERY_PROD_DC || 'dc-prd',
      host: process.env.CONSUL_QUERY_PROD_HOST || thisHostName,
      port: process.env.CONSUL_QUERY_PROD_PORT || '8500',
      secure: process.env.CONSUL_QUERY_PROD_SECURE,
      token: process.env.CONSUL_AGENT_PROD_TOKEN,
    },
  },
  service: {
    name: process.env.CONSUL_SERVICE_NAME || 'af-consul',
    instance: process.env.CONSUL_SERVICE_INSTANCE || 'test',
    version: process.env.CONSUL_SERVICE_VERSION || '0.0.1',
    description: process.env.CONSUL_SERVICE_DESCRIPTION || 'AF-CONSUL TEST',
    tags: process.env.CONSUL_SERVICE_TAGS || [
      'af',
      'consul',
      'test',
    ],
    meta: process.env.CONSUL_SERVICE_META || { CONSUL_TEST: 12345, line_yellow: 'straight' },
    host: process.env.CONSUL_SERVICE_HOST || null,
    port: process.env.CONSUL_SERVICE_PORT || null,
  },
};
