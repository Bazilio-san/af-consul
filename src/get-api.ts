/* eslint-disable no-console */
// noinspection JSUnusedGlobalSymbols

import { IApi, ICache, ICLOptions, IConsulAPI, TRegisterType } from './types';
import { getConsulApiCached } from './prepare-consul-api';
import { CONSUL_DEBUG_ON, MAX_API_CACHED, PREFIX } from './constants';
import { getConfigHash } from './hash';
import { getRegisterConfig } from './get-register-config';
import { minimizeCache } from './utils';
import { getRegisterCyclic } from './cyclic-register';
import { magenta, reset, yellow } from './color';

export { accessPointsUpdater } from './access-points-updater';

const defaultGetConsulUIAddress = (serviceId: string): string => {
  const { NODE_ENV, CONSUL_UI_HOST, CONSUL_DC_PROD, CONSUL_DC_DEV } = process.env;
  const p = NODE_ENV === 'production';
  return `https://${CONSUL_UI_HOST || ''}/ui/dc-${p ? (CONSUL_DC_PROD || 'prod') : (CONSUL_DC_DEV || 'dev')}/services/${serviceId}/instances`;
};

const debug = (msg: string) => {
  if (CONSUL_DEBUG_ON) {
    console.log(`${magenta}${PREFIX}${reset}: ${msg}`);
  }
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
    debug(`${yellow} REGISTER CONFIG:\n${JSON.stringify(registerConfig, undefined, 2)}\n${reset}`);

    const value = {
      registerConfig,
      serviceId,
      register: {
        once: async (registerType: TRegisterType = 'if-not-registered') => api.registerService(registerConfig, { registerType }),
        cyclic: getRegisterCyclic(options, api, registerConfig),
      },
      deregister: (svcId?: string, agentHost?: string, agentPort?: string) => api.deregisterIfNeed(svcId || serviceId, agentHost, agentPort),
    } as IApi;

    Object.entries(api).forEach(([k, v]) => {
      value[k] = typeof v === 'function' ? v.bind(api) : v;
    });

    apiCache[hash] = { created: Date.now(), value };
  }
  return apiCache[hash].value;
};
