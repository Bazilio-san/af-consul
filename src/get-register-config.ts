import { getPackageJson, parseMeta, parseTags, removeAroundQuotas } from './lib/utils';
import { ICLOptions, IRegisterConfig } from './interfaces';
import { getFQDNCached } from './lib/fqdn';
import { PREFIX } from './constants';

export const getServiceID = (name: string, instance: string, envCode: string = '') => {
  const p = (process.env.NODE_CONSUL_ENV || process.env.NODE_ENV) === 'production';
  return `${p ? 'prd' : 'dev'}-${envCode}-${name}-${instance}`.toLowerCase();
};

export const getRegisterConfig = async (options: ICLOptions): Promise<IRegisterConfig> => {
  const { config, envCode = '' } = options;
  const { webServer } = config;
  const consulServiceConfig = config?.consul?.service ?? {};
  const { id, host } = consulServiceConfig;
  let { name, instance, version, description, tags, meta, port } = consulServiceConfig;
  name = removeAroundQuotas(name);
  instance = removeAroundQuotas(instance);
  version = removeAroundQuotas(version);
  description = removeAroundQuotas(description);
  tags = parseTags(tags);
  tags = [name, version, ...(tags)];
  if (envCode) {
    tags.push(envCode);
  }
  port = Number(port) || Number(webServer.port);
  if (!port) {
    throw new Error(`${PREFIX}: Port is empty!`);
  }

  const serviceId = id || process.env.CONSUL_SERVICE_ID || getServiceID(name, instance, envCode);

  const address = host || (await getFQDNCached());
  if (!address) {
    throw new Error(`${PREFIX}: Address is empty!`);
  }

  meta = parseMeta(meta, { serviceId, name, instance, address, port });
  const metaObj: Record<string, string> = {
    host: address,
    port: String(port),
    NODE_ENV: process.env.NODE_ENV || '',
  };
  if (name) {
    metaObj.name = name;
  }
  if (version) {
    metaObj.version = version;
  }
  if (description) {
    metaObj.description = description;
  }
  if (instance) {
    metaObj.instance = instance;
  }

  let packageJson = getPackageJson();
  if (packageJson) {
    metaObj.pj_name = packageJson.name;
    metaObj.pj_version = packageJson.version;
  }
  if (metaObj.pj_name !== 'af-consul') {
    packageJson = getPackageJson('/node_modules/af-consul');
    if (packageJson) {
      metaObj.af_consul_version = packageJson.version;
    }
  }
  const registerConfig: IRegisterConfig = {
    id: serviceId,
    name: serviceId,
    port,
    address,
    tags,
    // @ts-ignore
    meta: <Record<string, string>>{ ...metaObj, ...meta },
  };
  const check = { ...(config.consul?.check || {}) };
  [['name', `Service '${name}-${instance}'`], ['timeout', '5s'], ['deregistercriticalserviceafter', '3m']]
    .forEach(([n, v]) => {
      // @ts-ignore
      if (!check[n]) {
        // @ts-ignore
        check[n] = v;
      }
    });
  if (!(check.http || check.tcp || check.script || check.shell)) {
    check.http = `http://${address}:${port}/health`;
  }
  if ((check.http || check.script) && !check.interval) {
    check.interval = '10s';
  }
  registerConfig.check = check;

  if (!config.service) {
    config.service = {};
  }
  config.service.id = serviceId;
  config.service.address = address;
  config.service.fromService = `${serviceId} / ${address}`;

  return registerConfig;
};
