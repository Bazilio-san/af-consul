## Not of interest to third party users

#### Example of settings for registering a service

```js
const registerOptions = {
    name: 'service name',       // (String): service name
    id: 'service ID',           // (String, optional): service ID
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
import os from 'os';
import { logger } from './logger';
import { getAPI } from '../src';

const config = {
    consul: {
        check: {
            interval: process.env.CONSUL_HEALTH_CHECK_INTERVAL || '10s',
            timeout: process.env.CONSUL_HEALTH_CHECK_TMEOUT || '5s',
            deregistercriticalserviceafter: process.env.CONSUL_DEREGISTER_CRITICAL_SERVICE_AFTER || '3m',
        },
        agent: {
            host: process.env.CONSUL_AGENT_HOST || os.hostname(),
            port: process.env.CONSUL_AGENT_PORT || '8500',
            secure: !!process.env.CONSUL_AGENT_SECURE,
            token: process.env.CONSUL_AGENT_TOKEN,
        },
        service: {
            name: process.env.CONSUL_SERVICE_NAME || 'af-consul',
            instance: process.env.CONSUL_SERVICE_INSTANCE || 'test',
            version: process.env.CONSUL_SERVICE_VERSION || '0.0.1',
            description: process.env.CONSUL_SERVICE_DESCRIPTION || 'AF-CONSUL TEST',
            tags: process.env.CONSUL_SERVICE_TAGS || [
                'af',
                'consul',
                'test',
            ],
            meta: process.env.CONSUL_SERVICE_META || { CONSUL_TEST: 12345, line_yellow: 'straight' },
            host: process.env.CONSUL_SERVICE_HOST || null,
            port: process.env.CONSUL_SERVICE_PORT || null,
        },
    },
    webServer: {
        host: process.env.WS_HOST || '0.0.0.0',
        port: process.env.WS_PORT || '10000',
    },
};

const getConsulAPI = async () => getAPI(
    {
        config,
        logger,
        projectId: process.env.PROJECT_ID || 'proj',
    },
);


getConsulAPI().then(({ register }) => {
    register.once().then(() => null);
});

getConsulAPI().then(({ deregister }) => {
    deregister().then(() => null);
});

```
