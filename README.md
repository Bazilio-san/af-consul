## Not of interest to third party users

#### Example of settings for registering a service

```js
const registerOptions = {
    name: 'serviceName',       // (String): service name
    id: 'serviceID',           // (String, optional): service ID
    tags: ['tag1'],            // (String[], optional): service tags
    address: '0.0.0.0',        // (String, optional): service IP address
    port: 9602,                // (Integer, optional): service port
    meta: {},                  // (Object, optional): metadata linked to the service instance
    check: {                   // (Object, optional): service check
        http: '',              // (String): URL endpoint, requires interval
        tcp: '',               // (String): host:port to test, passes if connection is established, fails otherwise
        script: '',            //  (String): path to check script, requires interval
        dockercontainerid: '', //  (String, optional): Docker container ID to run script
        shell: '',             //  (String, optional): shell in which to run script (currently only supported with Docker)
        interval: '',          //  (String): interval to run check, requires script (ex: 15s)
        timeout: '',           //  (String, optional): timeout for the check (ex: 10s)
        ttl: '',               //  (String): time to live before check must be updated, instead of http/tcp/script and interval (ex: 60s)
        notes: '',             //  (String, optional): human readable description of check
        status: '',            //  (String, optional): initial service status
        deregistercriticalserviceafter: '' //  (String, optional, Consul 0.7+): timeout after which to automatically deregister service if check remains in critical state
    },
    checks: [{}],              //  (Object[], optional): service checks (see check above)
    connect: {},               // (Object, optional): specifies the configuration for Connect
    proxy: {},                 // (Object, optional): specifies the configuration for a Connect proxy instance
    taggedAddresses: {}        // (Object, optional): specifies a map of explicit LAN and WAN addresses for the service instance
};


```


#### Usage example


```js
const config = require('config');
const getConsulApi = require('af-consul');
const logger = require('./logger');

const {
  name, version, description, consul: {
    agent: {
      host, port, secure, token,
    },
  }, webServer,
} = config;

const consulOptions = {
  host, port, secure,
};
if (token) {
  consulOptions.defaults = { token };
}

const instanceName = '<instance_name>';
const serviceName = `<this_service_name>`;
const THIS_SERVICE_ID = '<this_service_id>'.toLowerCase();

const registerConfig = {
  id: THIS_SERVICE_ID,
  name: THIS_SERVICE_ID,
  tags: [name, version],
  meta: {
    name,
    version,
    description,
    instance: instanceName,
  },
  port: webServer.port,
  check: {
    name: `Service '${serviceName}'`,
    // http: `http://<host>:<port>/health`, // Устанавливается в registerThisService()
    interval: '10s',
    timeout: '5s',
    deregistercriticalserviceafter: '3m',
  },
};

const consulApi = getConsulApi({ consulOptions, logger });

const registerThisService = async () => {
  await consulApi.registerThisService({ registerConfig });
};

const deregister = async (serviceId = THIS_SERVICE_ID) => {
  await consulApi.deregisterIfNeed(serviceId);
};

module.exports = {
  registerThisService,
  deregister,
  THIS_SERVICE_ID,
};

```
