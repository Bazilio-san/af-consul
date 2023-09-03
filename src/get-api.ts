/* eslint-disable no-console */
// noinspection JSUnusedGlobalSymbols

import { IAFConsulAPI, ICache, ICLOptions, IConsulAgentOptions, IConsulAPI, TRegisterType } from './interfaces';
import { getConsulApiCached } from './prepare-consul-api';
import { CONSUL_DEBUG_ON, MAX_API_CACHED, PREFIX } from './constants';
import { getConfigHash } from './lib/hash';
import { getRegisterConfig } from './get-register-config';
import { minimizeCache } from './lib/utils';
import { getRegisterCyclic } from './cyclic-register';
import { magenta, reset, yellow } from './lib/color';

export { accessPointsUpdater } from './access-points/access-points-updater';

const defaultGetConsulUIAddress = (serviceId: string): string => {
  const { NODE_ENV, CONSUL_UI_HOST, CONSUL_DC_PROD, CONSUL_DC_DEV } = process.env;
  const p = NODE_ENV === 'production';
  return `https://${CONSUL_UI_HOST || ''}/ui/dc-${p ? (CONSUL_DC_PROD || 'prd') : (CONSUL_DC_DEV || 'dev')}/services/${serviceId}/instances`;
};

const debug = (msg: string) => {
  if (CONSUL_DEBUG_ON) {
    console.log(`${magenta}${PREFIX}${reset}: ${msg}`);
  }
};

// cached

export const apiCache: ICache<IAFConsulAPI> = {};

export const getAPI = async (options: ICLOptions): Promise<IAFConsulAPI> => {
  const hash = getConfigHash(options);
  if (!apiCache[hash]) {
    const api: IConsulAPI = await getConsulApiCached(options) as IAFConsulAPI;
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
      deregister: (svcId?: string, agentOptions?: IConsulAgentOptions) => api.deregisterIfNeed(svcId || serviceId, agentOptions),
    } as IAFConsulAPI;

    Object.entries(api).forEach(([k, v]) => {
      // @ts-ignore
      value[k] = typeof v === 'function' ? v.bind(api) : v;
    });

    apiCache[hash] = { created: Date.now(), value };
  }
  return apiCache[hash].value;
};
