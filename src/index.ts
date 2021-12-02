import os from 'os';
import dns from 'dns';
import Consul from 'consul';
import * as _ from 'lodash';

export interface SocketInfo {
  host: string,
  port: string | number
}

export interface RegisterCheck extends Consul.Agent.Service.RegisterCheck {
  name?: string,
  tcp?: string,
  dockercontainerid?: string,
  shell?: string,
  timeout?: string,
  deregistercriticalserviceafter?: string
}

export interface RegisterOptions extends Consul.Agent.Service.RegisterOptions {
  check?: RegisterCheck | undefined;
  checks?: RegisterCheck[] | undefined;
  connect?: any,
  proxy?: any,
  taggedAddresses?: any
}

export interface ServiceOptions {
  registerConfig: RegisterOptions,
  thisService?: { host?: string, port?: string | number },
  force?: boolean
}

export interface ConsulOptions extends Consul.ConsulOptions {
}

export default ({ consulOptions, logger }: { consulOptions: ConsulOptions, logger?: any }) => {
  const consulInstance = Consul(consulOptions); // { host, port, secure, defaults: { token } }

  if (!logger?.info) {
    logger = {
      // eslint-disable-next-line no-console
      info: console.log, error: console.log, silly: console.log,
    };
  }

  // @ts-ignore
  consulInstance._ext('onRequest', (request, next) => {
    const {
      req: {
        hostname, port, path, method, headers,
      },
    } = request;
    const { secure } = consulOptions;
    let msg = `${method} http${secure ? 's' : ''}://${hostname}${port ? `:${port}` : ''}${path}`;
    Object.entries(headers).forEach(([key, value]) => {
      msg += `\n${key}: ${value}`;
    });
    logger.silly(msg);
    next();
  });

  function common(fnName: string, {
    options,
    withError,
    result,
  }: { options?: any, withError?: boolean, result?: any }): any {
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
    // Returns fully qualified domain name
    getFQDN(h = os.hostname(), withError = false) {
      return new Promise((resolve, reject) => {
        dns.lookup(h, { hints: dns.ADDRCONFIG }, (err, ip) => {
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
    },
    // Returns the services the agent is managing.  - список сервисов на этом агенте
    agentServiceList(withError: boolean = false) {
      return common('agent.service.list', { withError });
    },

    // Returns the nodes and health info of a service
    consulHealthService(options: Consul.Health.ServiceOptions, withError: boolean = false) {
      return common('health.service', { options, withError });
    },

    async getServiceSocket(serviceName: string, defaults: SocketInfo): Promise<SocketInfo> {
      if (process.env.USE_DEFAULT_SERVICE_SOCKET) {
        return defaults;
      }
      const result = await this.consulHealthService({ service: serviceName, passing: true });
      if (!result || !result.length) {
        logger.error(`consul.health.service ERROR: no working service found: ${serviceName}`);
        return defaults;
      }
      const [{ Node: { Node }, Service: { Address, Port } }] = result;
      const foundAddress = Address || Node;

      const host = await this.getFQDN(foundAddress);
      return {
        host: host || foundAddress,
        port: Port,
      };
    },

    // Registers a new service.
    agentServiceRegister(options: RegisterOptions, withError: boolean = false) {
      // connect: {},
      // proxy: {},
      // taggedAddresses: {}
      return common('agent.service.register', {
        options, withError, result: true,
      });
    },

    // Deregister a service.
    agentServiceDeregister(serviceId: string, withError: boolean = false) {
      return common('agent.service.deregister', {
        options: serviceId, withError, result: true,
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
          logger.info(`Previous registration of service '${serviceId}' removed from Consul`);
        } else {
          logger.error(`Previous registration of service '${serviceId}' was NOT removed from Consul`);
          return false;
        }
      } else {
        logger.info(`Service '${serviceId}' is not registered with Consul`);
      }
      return true;
    },

    async registerService(options: ServiceOptions) {
      const { registerConfig, thisService, force = true } = options;
      const serviceId = registerConfig.id || registerConfig.name;

      const thisServicePort = thisService?.port || registerConfig.port;

      const hostName = process.env.HOST_HOSTNAME || thisService?.host || await this.getFQDN();
      const regOptions: RegisterOptions = _.merge(_.cloneDeep(registerConfig), {
        port: thisServicePort,
        address: hostName,
        meta: {
          env: process.env.NODE_ENV,
          host: hostName,
          port: String(thisServicePort),
        },
        check: { http: `http://${hostName}:${thisServicePort}/health` },
      });

      const isAlreadyRegistered = await this.checkIfServiceRegistered(serviceId);
      if (force) {
        const isDeregister = await this.agentServiceDeregister(serviceId);
        if (isDeregister) {
          logger.info(`Previous registration of service '${serviceId}' removed from Consul`);
        }
      } else if (isAlreadyRegistered) {
        if (isAlreadyRegistered) {
          return true;
        }
      }
      const isJustRegistered = await this.agentServiceRegister(regOptions);
      if (isJustRegistered) {
        logger.info(`This Service '${serviceId}' is registered in Consul`);
      } else {
        logger.error(`This service '${serviceId}' is NOT registered in Consul`);
      }
    },
  };
};
