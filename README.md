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
import { getConsulApiAndAgentOptions, getRegisterConfig } from '../src';

let cf: any;

const config = {
    consul: {
        healthCheck: {
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
            name: process.env.CONSUL_SERVICE_NAME || 'service-name',
            instance: process.env.CONSUL_SERVICE_INSTANCE || 'inst',
            version: process.env.CONSUL_SERVICE_VERSION || '0.0.0',
            description: process.env.CONSUL_SERVICE_DESCRIPTION || 'test service',
            tags: process.env.CONSUL_SERVICE_TAGS || [
                'anytag',
            ],
            meta: process.env.CONSUL_SERVICE_META || { project: 'myProject' },
            host: process.env.CONSUL_SERVICE_HOST || null,
            port: process.env.CONSUL_SERVICE_PORT || null,
        },
    },
    webServer: { host: process.env.WS_HOST || '0.0.0.0' },
};

const initConsulAgent = async () => {
    if (!cf) {
        const { consulApi, consulAgentOptions } = getConsulApiAndAgentOptions({ config, logger });
        const { consulUI, registerConfig, serviceId } = await getRegisterConfig({
            config,
            uiHost: 'consul.work',
            dn: 'cep',
        });

        logger.info(`CONSUL AGENT OPTIONS: \n${JSON.stringify(consulAgentOptions, undefined, 2)}`);
        logger.info(`REGISTER CONFIG: \n${JSON.stringify(registerConfig, undefined, 2)}`);

        cf = {
            consulApi,
            consulAgentOptions,
            consulUI,
            registerConfig,
            serviceId,
            registerService: (forceReRegister = false) => consulApi.registerService({ registerConfig, forceReRegister }),
            deregister: (svcId = serviceId) => consulApi.deregisterIfNeed(svcId),
        };
    }
    return cf;
};

initConsulAgent().then(({ registerService }) => {
    registerService().then(() => null);
});

initConsulAgent().then(({ deregister }) => {
    deregister().then(() => null);
});

```
