/* eslint-disable no-console,prefer-spread */
// noinspection UnnecessaryLocalVariableJS,JSUnusedGlobalSymbols

import Consul from 'consul';
import { Mutex } from 'async-mutex';

import { blue, cyan, magenta, reset, yellow } from './lib/color';
import { getCurlText } from './lib/curl-text';
import getHttpRequestText from './lib/http-request-text';
import {
  IAPIArgs,
  ICache,
  ICLOptions,
  IConsul, IConsulAgentConfig,
  IConsulAgentOptions,
  IConsulAPI,
  IConsulHealthServiceInfo,
  IConsulServiceInfo, IFullConsulAgentConfig,
  IFullConsulAgentOptions,
  ILogger,
  IRegisterConfig,
  IRegisterOptions,
  ISocketInfo,
  TRegisterResult,
} from './interfaces';
import loggerStub from './lib/logger-stub';
import { getFQDNCached } from './lib/fqdn';
import { CONSUL_DEBUG_ON, DEBUG, MAX_API_CACHED, PREFIX } from './constants';
import { minimizeCache, parseBoolean, serviceConfigDiff } from './lib/utils';
import { getConfigHash } from './lib/hash';

const mutex = new Mutex();

const dbg = {
  on: CONSUL_DEBUG_ON,
  curl: /af-consul:curl/i.test(DEBUG),
};
const debug = (msg: string) => {
  if (dbg.on) {
    console.log(`${magenta}${PREFIX}${reset}: ${msg}`);
  }
};

const agentTypeS = Symbol.for('agentType');

const consulConfigTypes = ['reg', 'dev', 'prd'] as (keyof IFullConsulAgentConfig)[];

const getConsulAgentOptions = async (clOptions: ICLOptions): Promise<IFullConsulAgentOptions> => {
  const {
    agent,
    service,
  } = clOptions.config.consul;

  // const regAgent = { ..._.pick(reg, ['host', 'port', 'secure', 'token']) };
  const secure_ = parseBoolean(agent.reg.secure);
  const result: IFullConsulAgentOptions = {} as IFullConsulAgentOptions;
  const reg = {
    host: agent.reg.host || (await getFQDNCached()) || process.env.HOST_HOSTNAME || service?.host || '127.0.0.1',
    port: String(agent.reg.port || (secure_ ? 433 : 8500)),
    secure: secure_,
    defaults: agent.reg.token ? { token: agent.reg.token } : undefined,
  };
  result.reg = reg;

  (['dev', 'prd'] as (keyof IFullConsulAgentConfig)[]).forEach((id) => {
    if (agent[id]) {
      const {
        host,
        port,
        secure,
        token,
        dc,
      } = agent[id] as IConsulAgentConfig;
      result[id] = {
        host: String(host || reg.host),
        port: String(port || reg.port),
        secure: parseBoolean(secure == null ? reg.secure : secure),
        defaults: token ? { token } : reg.defaults,
        dc,
      };
    } else {
      result[id] = { ...reg };
    }
  });
  consulConfigTypes.forEach((id) => {
    if (!Number(result[id].port)) {
      throw new Error(`The port for consul agent[${id}] is invalid: [${result[id].port}]`);
    }
    // @ts-ignore
    result[id][agentTypeS] = id;
  });
  return result;
};

let requestCounter = 0;

export const prepareConsulAPI = async (clOptions: ICLOptions): Promise<IConsulAPI> => {
  let logger = (clOptions.logger || loggerStub) as ILogger;
  if (!logger?.info) {
    logger = loggerStub;
  }
  const fullConsulAgentOptions: IFullConsulAgentOptions = await getConsulAgentOptions(clOptions);
  if (dbg.on) {
    debug(`CONSUL AGENT OPTIONS:\n${JSON.stringify(fullConsulAgentOptions, undefined, 2)}`);
  }

  const consulInstances = {} as { reg: IConsul, dev: IConsul, prd: IConsul };
  consulConfigTypes.forEach((id) => {
    const consulAgentOptions = fullConsulAgentOptions[id];
    const consulInstance: IConsul = new Consul(consulAgentOptions) as IConsul; // { host, port, secure, defaults: { token } }
    // @ts-ignore
    consulInstance[agentTypeS] = id;

    consulInstances[id] = consulInstance;

    consulInstance._ext('onRequest', (request, next) => {
      request._id_ = ++requestCounter;
      if (dbg.on) {
        const msg = dbg.curl ? getCurlText(request) : getHttpRequestText(request);
        debug(`[${request._id_}] ${yellow}${msg}${reset}`);
      }
      next();
    });

    consulInstance._ext('onResponse', (request, next) => {
      const rqId = `[${request._id_}] `;
      try {
        const { res } = request || {};
        const {
          statusCode = 0,
          body = null,
        } = res || {};
        debug(`${rqId}HTTP Status: ${statusCode}`);
        if (statusCode > 299 && !request.opts?.skipCodes?.includes?.(statusCode)) {
          const serviceName = request._args?.[0]?.name ?? '';
          if (body) {
            logger.error(`${rqId}[${serviceName ? `consul.${serviceName}` : 'CONSUL'}] ERROR: ${JSON.stringify(body)}`);
          } else {
            debug(`${rqId}res.body not found! res: ${res}`);
          }
        }
      } catch (err: Error | any) {
        logger.error(`ERROR (onResponse ${rqId}): \n  err.message: ${err.message}\n  err.stack:\n${err.stack}\n`);
      }
      next();
    });
  });

  const getAgentTypeByServiceID = (serviceId: string): keyof IFullConsulAgentConfig => {
    const agentType = serviceId.substring(0, 3);
    return (/(dev|prd)/.test(agentType) ? agentType : 'reg') as keyof IFullConsulAgentConfig;
  };
  const getAgentOptionsByServiceID = (serviceId: string): IConsulAgentOptions => fullConsulAgentOptions[getAgentTypeByServiceID(serviceId)];
  const getConsulInstanceByServiceID = (serviceId: string): IConsul => consulInstances[getAgentTypeByServiceID(serviceId)];

  // @ts-ignore request.res.body request.res.statusCode

  const common = async (fnName: string, {
    consulInstance,
    agentOptions,
    options,
    withError,
    result,
  }: IAPIArgs): Promise<any> => {
    let fn: IConsul;
    if (consulInstance) {
      fn = consulInstance;
    } else if (agentOptions) {
      fn = Consul(agentOptions) as IConsul;
    } else {
      fn = consulInstances.reg;
    }

    const namesArr = fnName.split('.');
    const method: string = namesArr.pop() as string;
    namesArr.forEach((v) => {
      // @ts-ignore
      fn = fn[v];
    });
    try {
      // @ts-ignore
      const res = await fn[method].call(fn, options);
      return result || res;
    } catch (err: Error | any) {
      logger.error(`[consul.${fnName}] ERROR:\n  err.message: ${err.message}\n  err.stack:\n${err.stack}\n`);
      return withError ? err : false;
    }
  };

  const api = {
    // Returns the services the agent is managing.  - список сервисов на этом агенте
    async agentServiceList (apiArgs: IAPIArgs = {}) {
      // ### GET http://<*.host>:<*.port>/v1/agent/services
      if (!apiArgs.consulInstance && !apiArgs.agentOptions) {
        apiArgs.consulInstance = consulInstances.reg;
      }
      const result = await common('agent.service.list', apiArgs);
      return result;
    },

    // Lists services in a given datacenter
    async catalogServiceList (dc: string, apiArgs: IAPIArgs = {}): Promise<{ [serviceId: string]: string[] }> {
      // ### GET https://<context.host>:<context.port>/v1/catalog/services?dc=<dc>
      if (!apiArgs.consulInstance && !apiArgs.agentOptions) {
        const agentType = (Object.entries(fullConsulAgentOptions)
          .find(([, v]) => v.dc === dc) || ['dev'])[0];
        // @ts-ignore
        apiArgs.consulInstance = consulInstances[agentType];
      }
      apiArgs.options = dc;
      const result = await common('catalog.service.list', apiArgs);
      return result;
    },

    // Returns the nodes and health info of a service
    async consulHealthService (apiArgs: IAPIArgs): Promise<IConsulHealthServiceInfo[]> {
      // ### GET https://<context.host>:<context.port>/v1/health/service/<apiArgs.options.serviceId>?passing=true&dc=<apiArgs.options.dc || context.dc>
      const {
        service: serviceId,
        dc,
      } = apiArgs.options;
      if (!dc) {
        const agentOptions = getAgentOptionsByServiceID(serviceId);
        apiArgs.options.dc = agentOptions.dc || undefined;
      }
      if (!apiArgs.consulInstance && !apiArgs.agentOptions) {
        apiArgs.consulInstance = getConsulInstanceByServiceID(serviceId);
      }
      const result = await common('health.service', apiArgs);
      return result;
    },

    async getServiceInfo (serviceName: string): Promise<IConsulServiceInfo | undefined> {
      // ### GET https://<context.host>:<context.port>/v1/health/service/<apiArgs.options.serviceId>?passing=true&dc=<apiArgs.options.dc || context.dc>
      const result = await this.consulHealthService({
        options: {
          service: serviceName,
          passing: true,
        },
      });
      const res = result?.[0]?.Service;
      if (!res) {
        logger.debug(`No info about service ID ${cyan}${serviceName}`); // VVR
      }
      return res;
    },

    async getServiceSocket (serviceName: string, defaults: ISocketInfo): Promise<ISocketInfo> {
      if (process.env.USE_DEFAULT_SERVICE_SOCKET) {
        return defaults;
      }
      // В функции consulHealthService используется агент dev/prd в зависимости от префикаса
      const result: IConsulHealthServiceInfo[] = await this.consulHealthService({
        options: {
          service: serviceName,
          passing: true,
        },
      });
      if (!result || !result.length) {
        logger.warn(`CONSUL: No working service found: ${cyan}${serviceName}${reset}. Return defaults ${defaults.host}:${defaults.port}`);
        return defaults;
      }

      const {
        Address = result[0].Node?.Node,
        Port,
      } = (result[0].Service || {}) as IConsulServiceInfo;

      const host = await getFQDNCached(Address);
      return {
        host: host || Address || '',
        port: Port,
      };
    },

    // Registers a new service.
    async agentServiceRegister (options: IRegisterConfig, withError: boolean = false): Promise<boolean> {
      // ### PUT http://<reg.host>:<reg.port>/v1/agent/service/register
      const result = await common('agent.service.register', { options, withError, result: true });
      return result;
    },

    // Deregister a service.
    async agentServiceDeregister (serviceId: string, apiArgs: IAPIArgs = {}): Promise<boolean> {
      // ### PUT http://<reg.host>:<reg.port>/v1/agent/service/deregister/<serviceId>
      apiArgs.options = serviceId;
      apiArgs.result = true;
      if (!apiArgs.agentOptions && !apiArgs.consulInstance) {
        apiArgs.consulInstance = consulInstances.reg;
      }
      const result = await common('agent.service.deregister', apiArgs);
      return result;
    },

    async deregisterIfNeed (serviceId: string, agentOptions?: IConsulAgentOptions): Promise<boolean> {
      const apiArgs: IAPIArgs = { agentOptions };
      const healthServiceInfo = await this.checkIfServiceRegistered(serviceId, apiArgs);
      if (healthServiceInfo) {
        const nodeHost = (healthServiceInfo.Node?.Node || '').toLowerCase()
          .split('.')[0] || '';
        const [agentType = 'reg'] = Object.entries(fullConsulAgentOptions)
          .find(([, aOpt]) => aOpt.host.toLowerCase()
            .startsWith(nodeHost)) || [];
        // @ts-ignore
        apiArgs.consulInstance = consulInstances[agentType];
        const isDeregister = await this.agentServiceDeregister(serviceId, apiArgs);

        // @ts-ignore
        const m = (wasnt: string = '') => `Previous registration of service '${cyan}${serviceId}${reset}'${wasnt} removed from consul agent ${blue}${fullConsulAgentOptions[agentType].host}${reset}`;
        if (isDeregister) {
          logger.info(m());
        } else {
          logger.error(m(' was NOT'));
          return false;
        }
      } else {
        logger.info(`Service '${cyan}${serviceId}${reset}' is not registered in Consul`);
      }
      return true;
    },

    // Returns the members as seen by the consul agent. - список агентов (нод)
    agentMembers: async (apiArgs: IAPIArgs = {}) => {
      // ### GET http://<reg.host>:<reg.port>/v1/agent/members
      if (!apiArgs.consulInstance && !apiArgs.agentOptions) {
        apiArgs.consulInstance = consulInstances.reg;
      }
      const result = await common('agent.members', apiArgs);
      return result;
    },

    async checkIfServiceRegistered (serviceIdOrName: string, apiArgs: IAPIArgs = {}): Promise<IConsulHealthServiceInfo | undefined> {
      if (!apiArgs.consulInstance && !apiArgs.agentOptions) {
        apiArgs.consulInstance = getConsulInstanceByServiceID(serviceIdOrName);
      }
      const result = await this.consulHealthService({ options: { service: serviceIdOrName } });
      return result?.[0];
    },

    async registerService (registerConfig: IRegisterConfig, registerOptions: IRegisterOptions): Promise<TRegisterResult> {
      const serviceId = registerConfig.id || registerConfig.name;
      const srv = `Service '${cyan}${serviceId}${reset}'`;

      const serviceInfo = await this.getServiceInfo(serviceId);
      const diff = serviceConfigDiff(registerConfig, serviceInfo);
      const isAlreadyRegistered = !!serviceInfo;

      const already = (): TRegisterResult => {
        if (!registerOptions.noAlreadyRegisteredMessage) {
          logger.info(`${srv} already registered in Consul`);
        }
        return 'already';
      };

      switch (registerOptions.registerType) {
        case 'if-config-differ': {
          if (!diff.length) {
            return already();
          }
          logger.info(`${srv}. Configuration difference detected. New: config.${diff[0]}=${diff[1]} / Current: config.${diff[2]}=${diff[3]}`);
          break;
        }
        case 'if-not-registered': {
          if (isAlreadyRegistered) {
            return already();
          }
          break;
        }
      }

      if (isAlreadyRegistered && registerOptions.deleteOtherInstance) {
        if (await this.agentServiceDeregister(serviceId)) {
          logger.info(`Previous registration of ${srv} removed from Consul`);
        }
      }
      const isJustRegistered = await this.agentServiceRegister(registerConfig);
      if (isJustRegistered) {
        logger.info(`${srv} is registered in Consul`);
      } else {
        logger.error(`${srv} is NOT registered in Consul`);
      }
      return isJustRegistered ? 'just' : false;
    },
    agentOptions: fullConsulAgentOptions,
    getConsulAgentOptions,
  };
  return api;
};

const consulApiCache: ICache<IConsulAPI> = {};

export const getConsulApiCached = async (clOptions: ICLOptions): Promise<IConsulAPI> => mutex
  .runExclusive<IConsulAPI>(async () => {
    const hash = getConfigHash(clOptions);
    if (!consulApiCache[hash]) {
      minimizeCache(consulApiCache, MAX_API_CACHED);
      const value = await prepareConsulAPI(clOptions);
      consulApiCache[hash] = {
        created: Date.now(),
        value,
      };
    }
    return consulApiCache[hash].value;
  });
