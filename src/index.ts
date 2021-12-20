/* eslint-disable no-console */
import * as os from 'os';
import * as dns from 'dns';
import * as Consul from 'consul';
import Debug from 'debug';
import { parseBoolean, parseMeta, parseTags, removeAroundQuotas } from './utils';

const prefix = 'af:consul';
const debug = Debug(prefix);

export interface ISocketInfo {
  host: string;
  port: string | number;
}

export interface IRegisterCheck extends Consul.Agent.Service.RegisterCheck {
  name?: string;
  tcp?: string;
  dockercontainerid?: string;
  shell?: string;
  timeout?: string;
  deregistercriticalserviceafter?: string;
}

export interface IRegisterOptions extends Consul.Agent.Service.RegisterOptions {
  check?: IRegisterCheck | undefined;
  checks?: IRegisterCheck[] | undefined;
  connect?: any;
  proxy?: any;
  taggedAddresses?: any;
}

export interface IServiceOptions {
  registerConfig: IRegisterOptions;
  forceReRegister?: boolean;
}

export interface IConsulAgentOptions extends Consul.ConsulOptions {
}

const r = '\x1b[0m';
const cy = '\x1b[36m';

// const g = '\x1b[32m';

abstract class AbstractConsulLogger {
  /* eslint-disable no-unused-vars */
  abstract silly(...args: unknown[]): any;

  abstract info(...args: unknown[]): any;

  abstract warn(...args: unknown[]): any;

  abstract error(...args: unknown[]): any;

  /* eslint-enable no-unused-vars */
}

// Returns fully qualified domain name
export const getFQDN = (h?: string, withError?: boolean) => {
  h = h || os.hostname();
  return new Promise((resolve, reject) => {
    dns.lookup(h as string, { hints: dns.ADDRCONFIG }, (err: any, ip: string) => {
      if (err) {
        return withError ? reject(err) : resolve(null);
      }
      dns.lookupService(ip, 0, (err2, hostname) => {
        if (err2) {
          return withError ? reject(err2) : resolve(null);
        }
        resolve(hostname);
      });
    });
  });
};

export const getServiceID = (name: string, instance: string, dn: string, uiHost: string) => {
  const p = process.env.NODE_ENV === 'production';
  const ns = `${name}-${instance}`;
  const id = `${p ? 'prd' : 'dev'}-${dn}${p ? 'r' : 'e'}01-${ns}`.toLowerCase();
  const ui = `https://${uiHost}/ui/dc-${p ? 'msk-infra' : 'dev'}/services/${id}/instances`;
  return {
    ui, ns, id,
  };
};

export const getConsulApi = (
  {
    consulAgentOptions,
    logger,
  }: { consulAgentOptions: IConsulAgentOptions; logger?: AbstractConsulLogger | any },
) => {
  if (debug.enabled) {
    debug(`============= consulAgentOptions: =================\n${JSON.stringify(consulAgentOptions, undefined, 2)}`);
  }
  const numericPort = Number(consulAgentOptions.port);
  if (!numericPort) {
    throw new Error(`The port for consul agent is invalid: [${consulAgentOptions.port}]`);
  }
  consulAgentOptions.port = String(numericPort);
  const consulInstance = Consul(consulAgentOptions); // { host, port, secure, defaults: { token } }

  if (!logger?.info) {
    logger = {
      silly: console.log,
      info: console.log,
      warn: console.log,
      error: console.log,
    };
  }

  // @ts-ignore
  consulInstance._ext('onRequest', (request, next) => {
    if (debug.enabled) {
      const { req: { hostname, port, path, method, headers }, body } = request;
      const { secure } = consulAgentOptions;
      let msg = `${method} http${secure ? 's' : ''}://${hostname}${port ? `:${port}` : ''}${path}`;
      Object.entries(headers)
        .forEach(([key, value]) => {
          msg += `\n${key}: ${value}`;
        });
      if ((method === 'POST' || method === 'PUT') && body) {
        try {
          msg += '\n================== BODY START ==================';
          msg += `\n${JSON.stringify(JSON.parse(body.toString()), undefined, 2)}`;
          msg += '\n================== BODY END ====================';
        } catch (err: Error | any) {
          logger.error(`ERROR (onRequest): \n  err.message: ${err.message}\n  err.stack:\n${err.stack}\n`);
        }
      }
      debug(msg);
    }
    next();
  });
  // @ts-ignore
  consulInstance._ext('onResponse', (request, next) => {
    try {
      const { res } = request || {};
      const { statusCode = 0, body = null } = res || {};
      debug(`Status code: ${statusCode}`);
      if (statusCode > 299) {
        const serviceName = request._args?.[0]?.name ?? '';
        if (body) {
          logger.error(`[${serviceName ? `consul.${serviceName}` : 'CONSUL'}] ERROR: ${JSON.stringify(body)}`);
        } else {
          debug(`res.body not found! res: ${res}`);
        }
      }
    } catch (err: Error | any) {
      logger.error(`ERROR (onResponse): \n  err.message: ${err.message}\n  err.stack:\n${err.stack}\n`);
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
        logger.warn(`CONSUL: No working service found: ${cy}${serviceName}${r}. Return defaults ${defaults.host}:${defaults.port}`);
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

    async deregisterIfNeed(serviceId: string) {
      const isAlreadyRegistered = await this.checkIfServiceRegistered(serviceId);
      if (isAlreadyRegistered) {
        const isDeregister = await this.agentServiceDeregister(serviceId);
        if (isDeregister) {
          logger.info(`Previous registration of service '${cy}${serviceId}${r}' removed from Consul`);
        } else {
          logger.error(`Previous registration of service '${cy}${serviceId}${r}' was NOT removed from Consul`);
          return false;
        }
      } else {
        logger.info(`Service '${cy}${serviceId}${r}' is not registered in Consul`);
      }
      return true;
    },

    async registerService(options: IServiceOptions) {
      const { registerConfig, forceReRegister = true } = options;
      const serviceId = registerConfig.id || registerConfig.name;

      const isAlreadyRegistered = await this.checkIfServiceRegistered(serviceId);
      if (isAlreadyRegistered && !forceReRegister) {
        return 2;
      }
      if (isAlreadyRegistered && (await this.agentServiceDeregister(serviceId))) {
        logger.info(`Previous registration of service '${cy}${serviceId}${r}' removed from Consul`);
      }
      const isJustRegistered = await this.agentServiceRegister(registerConfig);
      if (isJustRegistered) {
        logger.info(`Service '${cy}${serviceId}${r}' is registered in Consul`);
      } else {
        logger.error(`Service '${cy}${serviceId}${r}' is NOT registered in Consul`);
      }
      return isJustRegistered ? 1 : 0;
    },
  };
};

export const getConsulApiByConfig = ({ config, logger }: { config: any, logger?: AbstractConsulLogger | any }) => {
  const { host, port, secure, token } = config.consul.agent;
  const consulAgentOptions = {
    host,
    port,
    secure: parseBoolean(secure),
    defaults: token ? { token } : undefined,
  };
  return {
    consulApi: getConsulApi({ consulAgentOptions, logger }),
    consulAgentOptions,
  };
};

export const getRegisterConfig = async (options: { config: any, uiHost: string, dn: string, check?: IRegisterCheck }) => {
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
    throw new Error(`${prefix}: Port is empty!`);
  }

  const { ui: consulUI, ns: serviceNS, id } = getServiceID(name, instance, dn, uiHost);

  const address = host || (await getFQDN());
  if (!address) {
    throw new Error(`${prefix}: Address is empty!`);
  }

  const registerConfig: IRegisterOptions = {
    id,
    name: id,
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
    port,
    address,
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
    consulUI, registerConfig, serviceId: id,
  };
};
