/* eslint-disable no-console */
import * as os from 'os';
import * as dns from 'dns';
import * as Consul from 'consul';
import * as _ from 'lodash';
import Debug from 'debug';

const debug = Debug('af:consul');

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
  thisService?: { host?: string; port?: string | number };
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

export const getConsulApi = (
  {
    consulAgentOptions,
    logger,
  }: { consulAgentOptions: IConsulAgentOptions; logger?: AbstractConsulLogger | any },
) => {
  if (debug.enabled) {
    debug(`============= consulAgentOptions: =================\n${JSON.stringify(consulAgentOptions, undefined, 2)}`);
  }
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
        } catch (err) {
          //
        }
      }
      debug(msg);
    }
    next();
  });
  // @ts-ignore
  consulInstance._ext('onResponse', (request, next) => {
    const { res } = request || {};
    const { statusCode = 0, body = null } = res || {};
    if (statusCode > 299 && body) {
      logger.error(body);
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
          err.message = `consul.${fnName} ERROR: ${err.message}`;
          logger.error(err);
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
      } catch (err) {
        logger.error(err);
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

    async checkIfServiceRegistered(svcIdOrName: string): Promise<boolean> {
      const agentServiceListR = await this.agentServiceList();
      return agentServiceListR
        && Object.values(agentServiceListR)
          .some(({ ID: i, Service: s }: any) => i === svcIdOrName || s === svcIdOrName);
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
      const {
        registerConfig,
        thisService,
        forceReRegister = true,
      } = options;
      const serviceId = registerConfig.id || registerConfig.name;

      const port = registerConfig.port || thisService?.port;
      const address = registerConfig.address || (process.env.HOST_HOSTNAME || thisService?.host || await getFQDN());

      const regOptions: IRegisterOptions = _.merge(_.cloneDeep(registerConfig), {
        port: Number(port),
        address,
        meta: {
          env: process.env.NODE_ENV,
          host: address,
          port: String(registerConfig?.meta?.port || port),
        },
      });
      if (!regOptions.check) {
        regOptions.check = {};
      }
      const { http, script, shell, tcp } = regOptions.check;
      if (!http && !script && !shell && !tcp) {
        regOptions.check.http = `http://${address}:${port}/health`;
      }

      Object.assign(options.registerConfig, regOptions);

      const isAlreadyRegistered = await this.checkIfServiceRegistered(serviceId);
      if (isAlreadyRegistered && forceReRegister) {
        const isDeregister = await this.agentServiceDeregister(serviceId);
        if (isDeregister) {
          logger.info(`Previous registration of service '${cy}${serviceId}${r}' removed from Consul`);
        }
      } else if (isAlreadyRegistered) {
        return true;
      }
      const isJustRegistered = await this.agentServiceRegister(regOptions);
      if (isJustRegistered) {
        logger.info(`Service '${cy}${serviceId}${r}' is registered in Consul`);
      } else {
        logger.error(`Service '${cy}${serviceId}${r}' is NOT registered in Consul`);
      }
      return isJustRegistered;
    },
  };
};
