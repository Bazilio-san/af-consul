import 'dotenv/config';
import * as os from 'os';
import { logger } from './logger';
import { IConsulAgentOptions, IRegisterOptions, getConsulApi } from '../src';

const consulAgentOptions: IConsulAgentOptions = {
  host: process.env.CONSUL_AGENT_HOST || os.hostname(),
  port: process.env.CONSUL_AGENT_PORT || '8500',
  secure: !!process.env.CONSUL_AGENT_SECURE,
  defaults: { token: process.env.CONSUL_TOKEN },
};

const isProd = process.env.NODE_ENV === 'production';
const instance = 'msk'; // Суффикс в имени consul-сервиса
const serviceNS = `${process.env.SERVICE_NAME || 'test-service'}-${instance}`;
export const thisServiceId = `${isProd ? 'prd' : 'dev'}-${isProd ? 'cepr01' : 'cep'}-${serviceNS}`.toLowerCase();

const registerConfig: IRegisterOptions = {
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
    name: `Service '${serviceNS}'`,
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
