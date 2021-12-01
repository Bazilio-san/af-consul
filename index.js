/* eslint-disable no-console */
const os = require('os');
const dns = require('dns');
const getConsulInstance = require('consul');
const _ = require('lodash');

/**
 * @typedef {Object} ConsulOptionsType
 *
 * @property {String}  host - default: 127.0.0.1: agent address
 * @property {Number}  port - default: 8500: agent HTTP(S) port
 * @property {Boolean}  secure - default: false: enable HTTPS
 * @property {String[]}  [ca] - array of strings or Buffers of trusted certificates in PEM format
 * @property {Boolean|Function}  [promisify] - convert callback methods to promises
 * @property {Object}  [defaults] - common method call options that will be included with every call (ex: set default token),
 * these options can be override on a per call basis
 */

module.exports = ({ consulOptions, logger }) => {
  const consul = getConsulInstance(consulOptions); // { host, port, secure, defaults: { token } }

  if (!logger?.info) {
    logger = {
      info: console.log, error: console.log, silly: console.log,
    };
  }

  consul._ext('onRequest', (request, next) => {
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

  function common(fnName, { options, withError, result }) {
    return new Promise((resolve, reject) => {
      const callback = (err, res) => {
        if (err) {
          err.message = `consul.${fnName} ERROR: ${err.message}`;
          logger.error(err);
          return withError ? reject(err) : resolve(false);
        }
        resolve(result || res);
      };
      let fn = consul;
      const namesArr = fnName.split('.');
      const method = namesArr.pop();
      namesArr.forEach((v) => {
        fn = fn[v];
      });
      const args = options ? [options, callback] : [callback];
      try {
        // eslint-disable-next-line prefer-spread
        fn[method].apply(fn, args);
      } catch (err) {
        console.log(err); // VVR
      }
    });
  }

  return {
    // Returns fully qualified domain name
    getFQDN(h = os.hostname(), withError = false) {
      return new Promise((resolve, reject) => {
        dns.lookup(h, { hints: dns.ADDRCONFIG }, (err, ip) => {
          if (err) {
            return withError ? reject(err) : resolve();
          }
          dns.lookupService(ip, 0, (err2, hostname) => {
            if (err2) {
              return withError ? reject(err2) : resolve();
            }
            resolve(hostname);
          });
        });
      });
    },
    // Returns the services the agent is managing.  - список сервисов на этом агенте
    agentServiceList(withError) {
      return common('agent.service.list', { withError });
    },

    // Returns the nodes and health info of a service
    consulHealthService(options, withError) {
      return common('health.service', { options, withError });
    },

    async getServiceSocket(serviceName, defaults) {
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
    agentServiceRegister(options, withError) {
      return common('agent.service.register', {
        options, withError, result: true,
      });
    },

    // Deregister a service.
    agentServiceDeregister(serviceId, withError) {
      return common('agent.service.deregister', {
        options: serviceId, withError, result: true,
      });
    },

    // Returns the members as seen by the consul agent. - список агентов (нод)
    agentMembers: (withError) => common('agent.members', { withError }),

    async checkIfServiceRegistered(svcIdOrName) {
      const agentServiceListR = await this.agentServiceList();
      return agentServiceListR
        && Object.values(agentServiceListR)
          .some(({ ID: i, Service: s }) => i === svcIdOrName || s === svcIdOrName);
    },

    async deregisterIfNeed(THIS_SERVICE_ID) {
      const isAlreadyRegistered = await this.checkIfServiceRegistered(THIS_SERVICE_ID);
      if (isAlreadyRegistered) {
        const isDeregister = await this.agentServiceDeregister(THIS_SERVICE_ID);
        if (isDeregister) {
          logger.info(`Previous registration of service '${THIS_SERVICE_ID}' removed from Consul`);
        } else {
          logger.error(`Previous registration of service '${THIS_SERVICE_ID}' was NOT removed from Consul`);
          return false;
        }
      } else {
        logger.info(`Service '${THIS_SERVICE_ID}' is not registered with Consul`);
      }
      return true;
    },

    async registerThisService(options) {
      const {
        registerConfig,
        thisService,
        force = true,
      } = options;
      const THIS_SERVICE_ID = registerConfig.id || registerConfig.name;

      const thisServicePort = thisService?.port || registerConfig.port;

      const hostName = process.env.HOST_HOSTNAME || thisService?.host || await this.getFQDN();
      const regOptions = _.merge(_.cloneDeep(registerConfig), {
        port: thisServicePort,
        address: hostName,
        meta: {
          env: process.env.NODE_ENV,
          host: hostName,
          port: String(thisServicePort),
        },
        check: { http: `http://${hostName}:${thisServicePort}/health` },
      });

      const isAlreadyRegistered = await this.checkIfServiceRegistered(THIS_SERVICE_ID);
      if (force) {
        const isDeregister = await this.agentServiceDeregister(THIS_SERVICE_ID);
        if (isDeregister) {
          logger.info(`Previous registration of service '${THIS_SERVICE_ID}' removed from Consul`);
        }
      } else if (isAlreadyRegistered) {
        if (isAlreadyRegistered) {
          return true;
        }
      }
      const isJustRegistered = await this.agentServiceRegister(regOptions);
      if (isJustRegistered) {
        logger.info(`This Service '${THIS_SERVICE_ID}' is registered in Consul`);
      } else {
        logger.error(`This service '${THIS_SERVICE_ID}' is NOT registered in Consul`);
      }
    },
    // VVR    regOptions.meta.db = `[${dbInfo.server}].[${dbInfo.database}]`;
  };
};
