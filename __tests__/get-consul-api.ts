import 'dotenv/config';
import * as _ from 'lodash';
import os from 'os';
import { logger } from './logger';
import { getAPI } from '../src';
import { IApi } from '../src/types';

const cfg = {
  consul: {
    check: {
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

export default async (instanceSuffix: string = ''): Promise<IApi> => {
  const config = _.cloneDeep(cfg);
  if (instanceSuffix) {
    config.consul.service.instance += instanceSuffix;
  } else {
    config.consul.service.instance = cfg.consul.service.instance;
  }
  return getAPI(
    {
      config,
      logger,
      projectId: process.env.PROJECT_ID || 'proj',
    },
  );
};
