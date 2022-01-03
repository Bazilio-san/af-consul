// noinspection JSUnusedGlobalSymbols

import { IApi, ICache, ICLOptions, IConsulAPI, TRegisterType } from './types';
import { getConsulApiCached } from './prepare-consul-api';
import { MAX_API_CACHED } from './constants';
import { getConfigHash } from './hash';
import { getRegisterConfig } from './get-register-config';
import { minimizeCache } from './utils';
import { getRegisterCyclic } from './register-service';

export { accessPointsUpdater } from './access-points-updater';

const defaultGetConsulUIAddress = (serviceId: string): string => {
  const { NODE_ENV, CONSUL_UI_HOST, CONSUL_DC_PROD, CONSUL_DC_DEV } = process.env;
  const p = NODE_ENV === 'production';
  return `https://${CONSUL_UI_HOST || ''}/ui/dc-${p ? (CONSUL_DC_PROD || 'prod') : (CONSUL_DC_DEV || 'dev')}/services/${serviceId}/instances`;
};

// cached

export const apiCache: ICache<IApi> = {};

export const getAPI = async (options: ICLOptions): Promise<IApi> => {
  const hash = getConfigHash(options);
  if (!apiCache[hash]) {
    const api: IConsulAPI = await getConsulApiCached(options) as IApi;
    const registerConfig = await getRegisterConfig(options);
    const serviceId = registerConfig.id;
    minimizeCache(apiCache, MAX_API_CACHED);

    options.logger?.info(`Consul UI: ${(options.getConsulUIAddress || defaultGetConsulUIAddress)(serviceId)}`);

    const value = {
      registerConfig,
      serviceId,
      register: {
        once: async (registerType: TRegisterType = 'if-not-registered') => api.registerService(registerConfig, { registerType }),
        cyclic: getRegisterCyclic(options, api, registerConfig),
      },
      deregister: (svcId) => api.deregisterIfNeed(svcId || serviceId),
    } as IApi;

    Object.entries(api).forEach(([k, v]) => {
      value[k] = typeof v === 'function' ? v.bind(api) : v;
    });

    apiCache[hash] = { created: Date.now(), value };
  }
  return apiCache[hash].value;
};
