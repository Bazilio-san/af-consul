import 'dotenv/config';
import os from 'os';
import { logger } from './logger';
import { getAPI } from '../src';

const config = {
  consul: {
    healthCheck: {
      interval: process.env.CONSUL_HEALTH_CHECK_INTERVAL || '10s',
      timeout: process.env.CONSUL_HEALTH_CHECK_TMEOUT || '5s',
      deregistercriticalserviceafter: process.env.CONSUL_DEREGISTER_CRITICAL_SERVICE_AFTER || '3m',
    },
    agent: {
      host: process.env.CONSUL_AGENT_HOST || os.hostname(),
      port: process.env.CONSUL_AGENT_PORT || '8500',
      secure: !!process.env.CONSUL_AGENT_SECURE,
      token: process.env.CONSUL_AGENT_TOKEN,
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
  },
  webServer: {
    host: process.env.WS_HOST || '0.0.0.0',
    port: process.env.WS_PORT || '10000',
  },
};

export default async () => getAPI(
  {
    config,
    logger,
    uiHost: process.env.CONSUL_UI_HOST || 'consul.work',
    dn: process.env.CONSUL_DN || 'dn',
  },
);
