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

const e = process.env;
const config = {
  consul: {
    check: {
      interval: e.CONSUL_HEALTH_CHECK_INTERVAL || '1s',
      timeout: e.CONSUL_HEALTH_CHECK_TMEOUT || '1s',
      deregistercriticalserviceafter: e.CONSUL_DEREGISTER_CRITICAL_SERVICE_AFTER || '1m',
    },
    agent: {
      reg: {
        host: e.CONSUL_AGENT_HOST || thisHostName,
        port: e.CONSUL_AGENT_PORT || '8500',
        secure: e.CONSUL_AGENT_SECURE,
        token: e.CONSUL_AGENT_TOKEN,
      },
      dev: {
        dc: e.CONSUL_AGENT_DEV_DC || 'dc-dev',
        host: e.CONSUL_AGENT_DEV_HOST || thisHostName,
        port: e.CONSUL_AGENT_DEV_PORT || '8500',
        secure: e.CONSUL_AGENT_DEV_SECURE,
        token: e.CONSUL_AGENT_DEV_TOKEN,
      },
      prd: {
        dc: e.CONSUL_AGENT_PRD_DC || 'dc-prd',
        host: e.CONSUL_AGENT_PRD_HOST || thisHostName,
        port: e.CONSUL_AGENT_PRD_PORT || '8500',
        secure: e.CONSUL_AGENT_PRD_SECURE,
        token: e.CONSUL_AGENT_PRD_TOKEN,
      },
    },
    // Details of the service being registered with consul
    service: {
      name: e.CONSUL_SERVICE_NAME || 'af-consul',
      instance: e.CONSUL_SERVICE_INSTANCE || 'test',
      version: e.CONSUL_SERVICE_VERSION || '0.0.1',
      description: e.CONSUL_SERVICE_DESCRIPTION || 'AF-CONSUL TEST',
      tags: e.CONSUL_SERVICE_TAGS || ['af', 'consul', 'test'],
      meta: e.CONSUL_SERVICE_META || { CONSUL_TEST: 12345, line_yellow: 'straight' },
      host: e.CONSUL_SERVICE_HOST || null,
      port: e.CONSUL_SERVICE_PORT || null,
    },
  },
  webServer: {
    host: e.WS_HOST || '0.0.0.0',
    port: e.WS_PORT || '10000',
  },
}
```

## Идентификаторы отладки

    AP-UPDATER       - access-points-updater:   
          - Polling ${CONSUL_ID}   
          - The data is up-to-date ${CONSUL_ID}
    
    af-consul 		 
        `${yellow} REGISTER CONFIG:\n${JSON.stringify(registerConfig, undefined, 2)}\n${reset}`
        `CONSUL AGENT OPTIONS:\n${JSON.stringify(fullConsulAgentOptions, undefined, 2)}`
        `${rqId}HTTP Status: ${statusCode}`
        `${rqId}res.body not found! res: ${res}`
        `No info about service ID ${cyan}${serviceName}`
        `${prefixG} Skip registration check after health check`    
    
    af-consul:curl
        const msg = dbg.curl ? getCurl(request, true) : getHttpRequestText(request);
        `[${request._id_}] ${yellow}${msg}${reset}`
    
    af-consul:reg
        `${PREFIX}: updated ${updatedCount.length} access point(s)`
        `${prefixG} Service ${cyan}${registerConfig.id}${reset} registration check...`
