const os = require('os');

const thisHostName = os.hostname();

const e = process.env;

module.exports = {
  check: {
    interval: e.CONSUL_HEALTH_CHECK_INTERVAL || '1s',
    timeout: e.CONSUL_HEALTH_CHECK_TMEOUT || '1s',
    deregistercriticalserviceafter: e.CONSUL_DEREGISTER_CRITICAL_SERVICE_AFTER || '1m',
  },
  agent: {
    reg: {
      host: e.CONSUL_AGENT_HOST || thisHostName,
      port: e.CONSUL_AGENT_PORT || '8500',
      secure: e.CONSUL_AGENT_SECURE,
      token: e.CONSUL_AGENT_TOKEN,
    },
    dev: {
      dc: e.CONSUL_AGENT_DEV_DC || 'dc-dev',
      host: e.CONSUL_AGENT_DEV_HOST || thisHostName,
      port: e.CONSUL_AGENT_DEV_PORT || '8500',
      secure: e.CONSUL_AGENT_DEV_SECURE,
      token: e.CONSUL_AGENT_DEV_TOKEN,
    },
    prd: {
      dc: e.CONSUL_AGENT_PRD_DC || 'dc-prd',
      host: e.CONSUL_AGENT_PRD_HOST || thisHostName,
      port: e.CONSUL_AGENT_PRD_PORT || '8500',
      secure: e.CONSUL_AGENT_PRD_SECURE,
      token: e.CONSUL_AGENT_PRD_TOKEN,
    },
  },
  service: {
    name: e.CONSUL_SERVICE_NAME || 'af-consul',
    instance: e.CONSUL_SERVICE_INSTANCE || 'test',
    version: e.CONSUL_SERVICE_VERSION || '0.0.1',
    description: e.CONSUL_SERVICE_DESCRIPTION || 'AF-CONSUL TEST',
    tags: e.CONSUL_SERVICE_TAGS || [
      'af',
      'consul',
      'test',
    ],
    meta: e.CONSUL_SERVICE_META || { CONSUL_TEST: 12345, line_yellow: 'straight' },
    host: e.CONSUL_SERVICE_HOST || null,
    port: e.CONSUL_SERVICE_PORT || null,
  },
};
