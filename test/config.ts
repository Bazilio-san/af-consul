import 'dotenv/config';
import * as os from 'os';
import { logger } from './logger';
import getConsulApi, { ConsulAgentOptions, RegisterOptions } from '../src/index';

const consulAgentOptions: ConsulAgentOptions = {
  host: process.env.CONSUL_AGENT_HOST || os.hostname(),
  port: process.env.CONSUL_AGENT_PORT || '8500',
  secure: !!process.env.CONSUL_AGENT_SECURE,
  defaults: { token: process.env.CONSUL_TOKEN },
};

const isProd = process.env.NODE_ENV === 'production';
const contourType = isProd ? 'prd' : 'dev';
const envCode = isProd ? 'CEPR01' : 'CEPE01';
const instanceName = 'msk'; // Суффикс в имени consul-сервиса
const serviceName = `${process.env.SERVICE_NAME || 'test-service'}-${instanceName}`;
export const thisServiceId = `${contourType}-${envCode}-${serviceName}`.toLowerCase();

const registerConfig: RegisterOptions = {
  id: thisServiceId,
  name: thisServiceId,
  tags: ['test-service'],
  meta: {
    name: 'test-service',
    version: '1.0.0',
    description: 'test service',
  },
  port: Number(consulAgentOptions.port),
  check: {
    name: `Service '${serviceName}'`,
    interval: '10s',
    timeout: '5s',
    deregistercriticalserviceafter: '3m',
  },
};

const consulApi = getConsulApi({ consulAgentOptions, logger });

export const registerService = async () => {
  await consulApi.registerService({ registerConfig });
};

export const deregister = async (serviceId = thisServiceId) => {
  await consulApi.deregisterIfNeed(serviceId);
};
