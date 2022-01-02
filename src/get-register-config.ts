import { getPackageJson, parseMeta, parseTags, removeAroundQuotas } from './utils';
import { ICLOptions, IRegisterConfig } from './types';
import { getFQDNCached } from './fqdn';
import { PREFIX } from './constants';

export const getServiceID = (name: string, instance: string, projectId: string = '') => {
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
  meta = parseMeta(meta);
  port = Number(port) || Number(webServer.port);
  if (!port) {
    throw new Error(`${PREFIX}: Port is empty!`);
  }

  const serviceId = getServiceID(name, instance, projectId);

  const address = host || (await getFQDNCached());
  if (!address) {
    throw new Error(`${PREFIX}: Address is empty!`);
  }

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
    address, // VVQ Добавить версию AF-Consul, добавить версию продукта
    tags,
    meta: { ...metaObj, ...meta },
  };
  let { check } = config.consul || {};
  if (!check) {
    check = {
      interval: '10s',
      timeout: '5s',
      deregistercriticalserviceafter: '3m',
    };
  }
  if (!check.name) {
    check.name = `Service '${name}-${instance}'`;
  }
  if (!check.http && !check.tcp && !check.script && !check.shell) {
    check.http = `http://${address}:${port}/health`;
  }
  if ((check.http || check.script) && !check.interval) {
    check.interval = '10s';
  }
  registerConfig.check = check;

  return registerConfig;
};
