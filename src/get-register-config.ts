import { getPackageJson, parseMeta, parseTags, removeAroundQuotas } from './lib/utils';
import { ICLOptions, IRegisterConfig } from './interfaces';
import { getFQDNCached } from './lib/fqdn';
import { PREFIX } from './constants';

export const getServiceID = (name: string, instance: string, projectId: string = '') => {
  if (process.env.CONSUL_SERVICE_ID) {
    return process.env.CONSUL_SERVICE_ID;
  }
  const p = process.env.NODE_ENV === 'production';
  return `${p ? 'prd' : 'dev'}-${projectId || ''}${p ? 'r' : 'e'}01-${name}-${instance}`.toLowerCase();
};

export const getRegisterConfig = async (options: ICLOptions): Promise<IRegisterConfig> => {
  const { config, projectId = '' } = options;
  const { webServer } = config;

  // eslint-disable-next-line prefer-const
  let { name, instance, version, description, tags, meta, host, port } = config?.consul?.service ?? {};
  name = removeAroundQuotas(name);
  instance = removeAroundQuotas(instance);
  version = removeAroundQuotas(version);
  description = removeAroundQuotas(description);
  tags = parseTags(tags);
  tags = [name, version, ...(tags)];
  if (projectId) {
    tags.push(projectId);
  }
  port = Number(port) || Number(webServer.port);
  if (!port) {
    throw new Error(`${PREFIX}: Port is empty!`);
  }

  const serviceId = getServiceID(name, instance, projectId);

  const address = host || (await getFQDNCached());
  if (!address) {
    throw new Error(`${PREFIX}: Address is empty!`);
  }

  meta = parseMeta(meta, {
    serviceId, name, instance, address, port,
  });
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
    meta: <Record<string, string>>{ ...metaObj, ...meta },
  };
  const check = { ...(config.consul?.check || {}) };
  [['name', `Service '${name}-${instance}'`], ['timeout', '5s'], ['deregistercriticalserviceafter', '3m']]
    .forEach(([n, v]) => {
      if (!check[n]) {
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

  return registerConfig;
};
