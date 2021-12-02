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


```ts
import 'dotenv/config';
import * as os from 'os';
import { logger } from './logger';
import getConsulApi, { ConsulAgentOptions, RegisterOptions } from '../src/index';

const consulAgentOptions: ConsulAgentOptions = {
    host: process.env.CONSUL_AGENT_HOST || os.hostname(),
    port: process.env.CONSUL_AGENT_PORT || '8500',
    secure: !!process.env.CONSUL_AGENT_SECURE,
    defaults: { token: process.env.CONSUL_TOKEN },
};

const isProd = process.env.NODE_ENV === 'production';
const contourType = isProd ? 'prd' : 'dev';
const envCode = isProd ? 'CEPR01' : 'CEPE01';
const instanceName = 'msk'; // Суффикс в имени consul-сервиса
const serviceName = `${process.env.SERVICE_NAME || 'test-service'}-${instanceName}`;
export const thisServiceId = `${contourType}-${envCode}-${serviceName}`.toLowerCase();

const registerConfig: RegisterOptions = {
    id: thisServiceId,
    name: thisServiceId,
    tags: ['test-service'],
    meta: {
        name: 'test-service',
        version: '1.0.0',
        description: 'test service',
    },
    port: Number(consulAgentOptions.port),
    check: {
        name: `Service '${serviceName}'`,
        interval: '10s',
        timeout: '5s',
        deregistercriticalserviceafter: '3m',
    },
};

const consulApi = getConsulApi({ consulAgentOptions, logger });

export const registerService = async () => {
    await consulApi.registerService({ registerConfig });
};

export const deregister = async (serviceId = thisServiceId) => {
    await consulApi.deregisterIfNeed(serviceId);
};

```
