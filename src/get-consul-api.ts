/* eslint-disable no-console */
import * as Consul from 'consul';
import { cyan, magenta, reset, yellow } from './color';
import getCurl from './get-curl-text';
import getHttpRequestText from './get-http-request-text';
import { IConsul,
  IConsulAgentOptions,
  IConsulAPI,
  ILogger,
  IRegisterOptions,
  IServiceOptions,
  ISocketInfo } from './types';
import loggerStub from './logger-stub';
import { getFQDN } from './get-fqdn';
import { PREFIX } from './constants';

const DEBUG = (String(process.env.DEBUG || '')).trim();
const dbg = { on: /\baf-consul/i.test(DEBUG), curl: /\baf-consul:curl/i.test(DEBUG) };
const debug = (msg: string) => {
  if (dbg.on) {
    console.log(`${magenta}${PREFIX}${reset}: ${msg}`);
  }
};

let requestCounter = 0;

export const getConsulApi = (
  {
    consulAgentOptions,
    logger,
  }: { consulAgentOptions: IConsulAgentOptions; logger?: ILogger | any },
): IConsulAPI => {
  if (!logger?.info) {
    logger = loggerStub;
  }

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
      if (statusCode > 299) {
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
    options,
    withError,
    result,
  }: { options?: any; withError?: boolean; result?: any }): any {
    return new Promise((resolve, reject) => {
      const callback = (err: Error | any, res: any) => {
        if (err) {
          logger.error(`[consul.${fnName}] ERROR:\n  err.message: ${err.message}\n  err.stack:\n${err.stack}\n`);
          return withError ? reject(err) : resolve(false);
        }
        resolve(result || res);
      };
      let fn = consulInstance;
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

  return {
    // Returns the services the agent is managing.  - список сервисов на этом агенте
    agentServiceList(withError: boolean = false) {
      return common('agent.service.list', { withError });
    },

    // Returns the nodes and health info of a service
    consulHealthService(options: Consul.Health.ServiceOptions, withError: boolean = false) {
      return common('health.service', {
        options,
        withError,
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

      const host = await getFQDN(foundAddress);
      return {
        host: host || foundAddress,
        port: Port,
      };
    },
    // Registers a new service.
    agentServiceRegister(options: IRegisterOptions, withError: boolean = false) {
      return common('agent.service.register', {
        options,
        withError,
        result: true,
      });
    },

    // Deregister a service.
    agentServiceDeregister(serviceId: string, withError: boolean = false) {
      return common('agent.service.deregister', {
        options: serviceId,
        withError,
        result: true,
      });
    },

    // Returns the members as seen by the consul agent. - список агентов (нод)
    agentMembers: (withError: boolean = false) => common('agent.members', { withError }),

    async checkIfServiceRegistered(serviceIdOrName: string): Promise<boolean> {
      const agentServiceListR = await this.agentServiceList();
      return agentServiceListR
        && Object.values(agentServiceListR)
          .some(({ ID: i, Service: s }: any) => i === serviceIdOrName || s === serviceIdOrName);
    },

    async deregisterIfNeed(serviceId: string): Promise<boolean> {
      const isAlreadyRegistered = await this.checkIfServiceRegistered(serviceId);
      if (isAlreadyRegistered) {
        const isDeregister = await this.agentServiceDeregister(serviceId);
        if (isDeregister) {
          logger.info(`Previous registration of service '${cyan}${serviceId}${reset}' removed from Consul`);
        } else {
          logger.error(`Previous registration of service '${cyan}${serviceId}${reset}' was NOT removed from Consul`);
          return false;
        }
      } else {
        logger.info(`Service '${cyan}${serviceId}${reset}' is not registered in Consul`);
      }
      return true;
    },

    async registerService(options: IServiceOptions): Promise<0 | 1 | 2> {
      const { registerConfig, forceReRegister = true, noAlreadyRegisteredMessage = false } = options;
      const serviceId = registerConfig.id || registerConfig.name;

      const isAlreadyRegistered = await this.checkIfServiceRegistered(serviceId);
      if (isAlreadyRegistered && !forceReRegister) {
        if (!noAlreadyRegisteredMessage) {
          logger.info(`Service '${cyan}${serviceId}${reset}' already registered in Consul`);
        }
        return 2;
      }
      if (isAlreadyRegistered && (await this.agentServiceDeregister(serviceId))) {
        logger.info(`Previous registration of service '${cyan}${serviceId}${reset}' removed from Consul`);
      }
      const isJustRegistered = await this.agentServiceRegister(registerConfig);
      if (isJustRegistered) {
        logger.info(`Service '${cyan}${serviceId}${reset}' is registered in Consul`);
      } else {
        logger.error(`Service '${cyan}${serviceId}${reset}' is NOT registered in Consul`);
      }
      return isJustRegistered ? 1 : 0;
    },
  };
};
