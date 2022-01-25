/* eslint-disable no-console */
// noinspection UnnecessaryLocalVariableJS,JSUnusedGlobalSymbols

import * as _ from 'lodash';
import * as Consul from 'consul';
import { Mutex } from 'async-mutex';
// @ts-ignore
import * as consulUtils from 'consul/lib/utils.js';
import { blue, cyan, magenta, reset, yellow } from './lib/color';
import getCurl from './lib/curl-text';
import getHttpRequestText from './lib/http-request-text';
import {
  ICache,
  ICLOptions,
  IConsul,
  IConsulAgentOptions,
  IConsulAPI,
  IConsulServiceInfo,
  ILogger,
  IRegisterConfig,
  IRegisterOptions,
  ISocketInfo,
  Maybe,
  TRegisterResult,
} from './interfaces';
import loggerStub from './lib/logger-stub';
import { getFQDNCached } from './lib/fqdn';
import { CONSUL_DEBUG_ON, DEBUG, MAX_API_CACHED, PREFIX } from './constants';
import { minimizeCache, parseBoolean, serviceConfigDiff } from './lib/utils';
import { getConfigHash } from './lib/hash';

const mutex = new Mutex();

const dbg = { on: CONSUL_DEBUG_ON, curl: /af-consul:curl/i.test(DEBUG) };
const debug = (msg: string) => {
  if (dbg.on) {
    console.log(`${magenta}${PREFIX}${reset}: ${msg}`);
  }
};

const getConsulAgentOptions = async (clOptions: ICLOptions, returnCommonAgent?: boolean): Promise<IConsulAgentOptions> => {
  const { config } = clOptions;
  let agent = { ..._.pick(config.consul.agent, ['host', 'port', 'secure', 'token']) };
  if (returnCommonAgent) {
    agent = { ...agent, ...(config.consul.agent.common || {}) };
  }
  const { host, port, secure, token } = agent;
  const host_ = host || (await getFQDNCached()) || process.env.HOST_HOSTNAME || config.consul.service?.host || '127.0.0.1';
  return {
    host: host_,
    port: String(port || 8500),
    secure: parseBoolean(secure),
    defaults: token ? { token } : undefined,
  };
};

let requestCounter = 0;

export const prepareConsulAPI = async (clOptions: ICLOptions, returnCommonAgent?: boolean): Promise<IConsulAPI> => {
  let logger = (clOptions.logger || loggerStub) as ILogger;
  if (!logger?.info) {
    logger = loggerStub;
  }
  const consulAgentOptions: IConsulAgentOptions = await getConsulAgentOptions(clOptions, returnCommonAgent);
  if (dbg.on) {
    debug(`CONSUL AGENT OPTIONS:\n${JSON.stringify(consulAgentOptions, undefined, 2)}`);
  }
  const numericPort = Number(consulAgentOptions.port);
  if (!numericPort) {
    throw new Error(`The port for consul agent is invalid: [${consulAgentOptions.port}]`);
  }
  consulAgentOptions.port = String(numericPort);
  const consulInstance: IConsul = Consul(consulAgentOptions) as IConsul; // { host, port, secure, defaults: { token } }

  consulInstance._ext('onRequest', (request, next) => {
    request._id_ = ++requestCounter;
    if (dbg.on) {
      const msg = dbg.curl ? getCurl(request, true) : getHttpRequestText(request, !!consulAgentOptions.secure);
      debug(`[${request._id_}] ${yellow}${msg}${reset}`);
    }
    next();
  });

  consulInstance._ext('onResponse', (request, next) => {
    const rqId = `[${request._id_}] `;
    try {
      const { res } = request || {};
      const { statusCode = 0, body = null } = res || {};
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

  // @ts-ignore request.res.body request.res.statusCode

  function common(fnName: string, {
    agentOptions,
    options,
    withError,
    result,
  }: { agentOptions?: IConsulAgentOptions, options?: any; withError?: boolean; result?: any }): any {
    return new Promise((resolve, reject) => {
      const callback = (err: Error | any, res: any) => {
        if (err) {
          logger.error(`[consul.${fnName}] ERROR:\n  err.message: ${err.message}\n  err.stack:\n${err.stack}\n`);
          return withError ? reject(err) : resolve(false);
        }
        resolve(result || res);
      };
      let fn = agentOptions ? Consul(agentOptions) : consulInstance;
      const namesArr = fnName.split('.');
      const method: string = namesArr.pop() as string;
      namesArr.forEach((v) => {
        fn = fn[v];
      });
      const args = options ? [options, callback] : [callback];
      try {
        // eslint-disable-next-line prefer-spread
        fn[method].apply(fn, args);
      } catch (err: Error | any) {
        logger.error(`ERROR (common): \n  err.message: ${err.message}\n  err.stack:\n${err.stack}\n`);
      }
    });
  }

  const api = {
    // Returns the services the agent is managing.  - список сервисов на этом агенте
    async agentServiceList(agentOptions?: IConsulAgentOptions, withError: boolean = false) {
      return common('agent.service.list', { agentOptions, withError });
    },

    // Returns the nodes and health info of a service
    async consulHealthService(options: Consul.Health.ServiceOptions, withError: boolean = false) {
      return common('health.service', {
        options,
        withError,
      });
    },

    // eslint-disable-next-line no-undef
    async getServiceInfo(serviceName: string, withError: boolean = false): Promise<Maybe<IConsulServiceInfo>> {
      const fnName = 'agent.service.info';
      return new Promise((resolve, reject) => {
        let opts = { id: serviceName };
        opts = consulUtils.defaults(opts, consulInstance._defaults);
        const req = {
          name: 'agent.service.info',
          path: '/agent/service/{id}',
          params: { id: serviceName },
          skipCodes: [404],
        };
        consulUtils.options(req, opts);
        consulInstance._get(req, consulUtils.body, (err: Error | any, res: any) => {
          if (err) {
            if (err.statusCode === 404 && err.message.startsWith('unknown service ID')) {
              logger.debug(`[consul.${fnName}] ${err.message}`);
            } else {
              logger.error(`[consul.${fnName}] ERROR:\n  err.message: ${err.message}\n  err.stack:\n${err.stack}\n`);
            }
            return withError ? reject(err) : resolve(undefined);
          }
          resolve(res);
        });
      });
    },

    async getServiceSocket(serviceName: string, defaults: ISocketInfo): Promise<ISocketInfo> {
      if (process.env.USE_DEFAULT_SERVICE_SOCKET) {
        return defaults;
      }
      const result = await this.consulHealthService({
        service: serviceName,
        passing: true,
      });
      if (!result || !result.length) {
        logger.warn(`CONSUL: No working service found: ${cyan}${serviceName}${reset}. Return defaults ${defaults.host}:${defaults.port}`);
        return defaults;
      }
      const [{
        Node: { Node },
        Service: {
          Address,
          Port,
        },
      }] = result;
      const foundAddress = Address || Node;

      const host = await getFQDNCached(foundAddress);
      return {
        host: host || foundAddress,
        port: Port,
      };
    },

    // Registers a new service.
    async agentServiceRegister(options: IRegisterConfig, withError: boolean = false): Promise<boolean> {
      return common('agent.service.register', {
        options,
        withError,
        result: true,
      });
    },

    // Deregister a service.
    async agentServiceDeregister(serviceId: string, agentOptions?: IConsulAgentOptions, withError: boolean = false): Promise<boolean> {
      return common('agent.service.deregister', {
        agentOptions,
        options: serviceId,
        withError,
        result: true,
      });
    },

    async deregisterIfNeed(serviceId: string, agentHost?: string, agentPort?: string): Promise<boolean> {
      agentHost = agentHost || consulAgentOptions.host;
      agentPort = agentPort || consulAgentOptions.port;
      let agentOptions: Maybe<IConsulAgentOptions>;
      if (agentHost !== consulAgentOptions.host || agentPort !== consulAgentOptions.port) {
        const secure = String(agentPort) !== '8500';
        agentOptions = {
          ...consulAgentOptions, host: agentHost, port: agentPort, secure,
        };
      }

      const isAlreadyRegistered = await this.checkIfServiceRegistered(serviceId, agentOptions);
      if (isAlreadyRegistered) {
        const isDeregister = await this.agentServiceDeregister(serviceId, agentOptions);

        const m = (wasnt: string = '') => `Previous registration of service '${cyan}${serviceId}${reset}'${
          wasnt} removed from consul agent ${blue}${agentHost}${reset}`;
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
    agentMembers: async (withError: boolean = false) => common('agent.members', { withError }),

    async checkIfServiceRegistered(serviceIdOrName: string, agentOptions?: IConsulAgentOptions): Promise<boolean> {
      const agentServiceListR = await this.agentServiceList(agentOptions);
      return agentServiceListR
        && Object.values(agentServiceListR)
          .some(({ ID: i, Service: s }: any) => i === serviceIdOrName || s === serviceIdOrName);
    },

    async registerService(registerConfig: IRegisterConfig, registerOptions: IRegisterOptions): Promise<TRegisterResult> {
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
    agentOptions: consulAgentOptions,
    getConsulAgentOptions,
  };
  return api;
};

const consulApiCache: ICache<IConsulAPI> = {};

export const getConsulApiCached = async (clOptions: ICLOptions, returnCommonAgent?: boolean): Promise<IConsulAPI> => mutex
  .runExclusive<IConsulAPI>(async () => {
    const hash = getConfigHash(clOptions, returnCommonAgent);
    if (!consulApiCache[hash]) {
      minimizeCache(consulApiCache, MAX_API_CACHED);
      const value = await prepareConsulAPI(clOptions, returnCommonAgent);
      consulApiCache[hash] = { created: Date.now(), value };
    }
    return consulApiCache[hash].value;
  });
