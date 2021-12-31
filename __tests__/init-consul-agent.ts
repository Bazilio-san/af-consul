import 'dotenv/config';
import os from 'os';
import { logger } from './logger';
import { getConsulApiByConfig, getRegisterConfig } from '../src';

let cf: any;

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
      name: process.env.CONSUL_SERVICE_NAME || 'service-name',
      instance: process.env.CONSUL_SERVICE_INSTANCE || 'inst',
      version: process.env.CONSUL_SERVICE_VERSION || '0.0.0',
      description: process.env.CONSUL_SERVICE_DESCRIPTION || 'test service',
      tags: process.env.CONSUL_SERVICE_TAGS || [
        'anytag',
      ],
      meta: process.env.CONSUL_SERVICE_META || { project: 'myProject' },
      host: process.env.CONSUL_SERVICE_HOST || null,
      port: process.env.CONSUL_SERVICE_PORT || null,
    },
  },
  webServer: {
    host: process.env.WS_HOST || '0.0.0.0',
    port: process.env.WS_PORT || '10000',
  },
};

export default async () => {
  if (!cf) {
    const { consulApi, consulAgentOptions } = await getConsulApiByConfig({ config, logger });
    const { consulUI, registerConfig, serviceId } = await getRegisterConfig({
      config,
      uiHost: 'consul.work',
      dn: 'cep',
    });
    cf = {
      consulApi,
      consulAgentOptions,
      consulUI,
      registerConfig,
      serviceId,
      registerService: (forceReRegister = true) => consulApi.registerService({ registerConfig, forceReRegister }),
      deregister: (svcId = serviceId) => consulApi.deregisterIfNeed(svcId),
    };
  }
  return cf;
};