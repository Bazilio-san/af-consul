import { logger } from './logger';
import getConsulApi, { ConsulOptions, RegisterOptions } from '../src/index';

const consulOptions: ConsulOptions = {
  host: 'my.host.com',
  port: '7654',
  defaults: {
    token: 'fffffffffffffffffffffffffffffffff',
  },
};

const isProd = process.env.NODE_ENV === 'production';
const contourType = isProd ? 'prd' : 'dev';
const envCode = isProd ? 'FGHP01' : 'FGHD01';
const serviceName = 'test-service';
const thisServiceId = `${contourType}-${envCode}-${serviceName}`.toLowerCase();

const registerConfig: RegisterOptions = {
  id: thisServiceId,
  name: thisServiceId,
  tags: ['test-service'],
  meta: {
    name: 'test-service',
    version: '1.0.0',
    description: 'test service',
  },
  port: Number(consulOptions.port),
  check: {
    name: `Service '${serviceName}'`,
    interval: '10s',
    timeout: '5s',
    deregistercriticalserviceafter: '3m',
  },
};

const consulApi = getConsulApi({ consulOptions, logger });

const registerThisService = async () => {
  await consulApi.registerService({ registerConfig });
};

const deregister = async (serviceId = thisServiceId) => {
  await consulApi.deregisterIfNeed(serviceId);
};

export {
  registerThisService,
  deregister,
  thisServiceId,
};
