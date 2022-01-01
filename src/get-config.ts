/* eslint-disable no-console */

import { Mutex } from 'async-mutex';
import { parseBoolean, parseMeta, parseTags, removeAroundQuotas } from './utils';
import { IApi,
  IAPInAgentOptions,
  ICLOptions,
  IGetRegisterConfigOptions,
  IRegisterConfig,
  IRegisterOptions,
  TRegisterType } from './types';
import { getFQDN } from './get-fqdn';
import { getConsulApi } from './api';
import { MAX_API_CACHED, PREFIX } from './constants';
import { registerConfigHash } from './get-hash';
import { registerCyclic } from './register-service';

const mutex = new Mutex();

export { AccessPoints } from './access-points';

export { accessPointsUpdater } from './access-points-updater';

export const getServiceID = (name: string, instance: string, dn: string, uiHost: string) => {
  const p = process.env.NODE_ENV === 'production';
  const ns = `${name}-${instance}`;
  const id = `${p ? 'prd' : 'dev'}-${dn}${p ? 'r' : 'e'}01-${ns}`.toLowerCase();
  const ui = `https://${uiHost}/ui/dc-${p ? 'msk-infra' : 'dev'}/services/${id}/instances`;
  return {
    ui, ns, id,
  };
};

export const getConsulApiAndAgentOptions = async (clOptions: ICLOptions): Promise<IAPInAgentOptions> => {
  const { config, logger } = clOptions;
  const { host, port, secure, token } = config.consul.agent;

  const consulAgentOptions = {
    host: host || (await getFQDN()) || process.env.HOST_HOSTNAME || config.consul.service?.host,
    port,
    secure: parseBoolean(secure),
    defaults: token ? { token } : undefined,
  };
  return {
    consulApi: getConsulApi({ consulAgentOptions, logger }),
    consulAgentOptions,
  };
};

let APInAgentOptionsCached: IAPInAgentOptions;

const getConsulApiCached_ = async (clOptions: ICLOptions): Promise<IAPInAgentOptions> => {
  if (!APInAgentOptionsCached) {
    APInAgentOptionsCached = await getConsulApiAndAgentOptions(clOptions);
  }
  return APInAgentOptionsCached;
};

export const getConsulApiCached = async (clOptions: ICLOptions): Promise<IAPInAgentOptions> => mutex
  .runExclusive<IAPInAgentOptions>(async () => getConsulApiCached_(clOptions));

export const getRegisterConfig = async (options: IGetRegisterConfigOptions): Promise<IRegisterConfig> => {
  const { config, uiHost, dn } = options;
  const { webServer } = config;

  // eslint-disable-next-line prefer-const
  let { name, instance, version, description, tags, meta, host, port } = config?.consul?.service ?? {};
  name = removeAroundQuotas(name);
  instance = removeAroundQuotas(instance);
  version = removeAroundQuotas(version);
  description = removeAroundQuotas(description);
  tags = parseTags(tags);
  meta = parseMeta(meta);
  port = Number(port) || Number(webServer.port);
  if (!port) {
    throw new Error(`${PREFIX}: Port is empty!`);
  }

  const { ui: consulUI, ns: serviceNS, id } = getServiceID(name, instance, dn, uiHost);

  const address = host || (await getFQDN());
  if (!address) {
    throw new Error(`${PREFIX}: Address is empty!`);
  }

  const registerConfig: IRegisterOptions = {
    id,
    name: id,
    port,
    address,
    tags: [name, version, dn, ...(tags)],
    meta: {
      name,
      version,
      description,
      instance,
      host: address,
      port: String(port),
      NODE_ENV: process.env.NODE_ENV,
      ...(meta),
    },
  };

  const { interval = '10s', timeout = '5s', deregistercriticalserviceafter = '3m' } = config.consul?.healthCheck ?? {};
  registerConfig.check = options.check || {
    name: `Service '${serviceNS}'`,
    http: `http://${address}:${port}/health`,
    interval,
    timeout,
    deregistercriticalserviceafter,
  };

  return {
    registerConfig,
    consulUI,
    serviceId: id,
  };
};

// cached

export const apiCached: { [hash: string]: { created: number, api: IApi } } = {};

const minimizeApiCache = () => {
  const len = Object.keys(apiCached).length;
  if (len >= MAX_API_CACHED) {
    const sortedDesc = Object.entries(apiCached)
      .sort((a, b) => b[1].created - a[1].created);
    sortedDesc.splice(0, MAX_API_CACHED - 1);
    sortedDesc.map(([h]) => h).forEach((h) => {
      delete apiCached[h];
    });
  }
};

export const getAPI = async (options: IGetRegisterConfigOptions): Promise<IApi> => {
  const hash = registerConfigHash(options);
  if (!apiCached[hash]) {
    const { consulApi, consulAgentOptions } = await getConsulApiCached(options);
    const { registerConfig, consulUI, serviceId } = await getRegisterConfig(options);
    minimizeApiCache();
    registerCyclic.options = options;
    apiCached[hash] = {
      created: Date.now(),
      api: {
        consulApi,
        consulAgentOptions,
        consulUI,
        registerConfig,
        serviceId,
        register: (registerType: TRegisterType = 'if-not-registered') => consulApi.registerService(
          {
            registerConfig,
            registerType,
            noAlreadyRegisteredMessage: false,
          },
        ),
        registerCyclic,
        deregister: (svcId = serviceId) => consulApi.deregisterIfNeed(svcId),
      },
    };
  }
  return apiCached[hash].api;
};
