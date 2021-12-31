/* eslint-disable no-console */
import { cyan, green, magenta, red, reset } from './color';
import loggerStub from './logger-stub';
import { IAccessPoint, IAccessPoints } from './access-points';
import { getConsulApiByConfig } from '../src';
import { ICLOptions } from './types';

const PREFIX = 'AP-UPDATER';

const DEBUG = (String(process.env.DEBUG || '')).trim();
const dbg = { on: /\bAP-UPDATER/i.test(DEBUG) };
const debug = (msg: string) => {
  if (dbg.on) {
    console.log(`${magenta}${PREFIX}${reset}: ${msg}`);
  }
};

const UPDATE_INTERVAL_IF_SUCCESS_MILLIS = 2 * 60_000;

let consulApiCached: any;

export const getConsulApi = async (clOptions: ICLOptions) => {
  if (!consulApiCached) {
    const { consulApi } = await getConsulApiByConfig(clOptions);
    consulApiCached = consulApi;
  }
  return consulApiCached;
};

function retrieveProps(accessPoint: IAccessPoint, host: string, meta: any) {
  const port = Number(meta.port) || accessPoint.port;
  return { host, port };
}

export async function updateAccessPoint(clOptions: ICLOptions, accessPoint: IAccessPoint) {
  const consulApi = await getConsulApi(clOptions);
  if (!consulApi) {
    clOptions.logger?.warn(`${PREFIX}: Не удалось получить consul API`);
    return;
  }
  if (!accessPoint.updateIntervalIfSuccessMillis) {
    accessPoint.updateIntervalIfSuccessMillis = UPDATE_INTERVAL_IF_SUCCESS_MILLIS;
  }
  if (Date.now() - (accessPoint.lastSuccessUpdate || 0) < accessPoint.updateIntervalIfSuccessMillis) {
    return;
  }
  const { consulServiceName } = accessPoint;

  const CONSUL_ID = `${cyan}${consulServiceName}${reset}`;
  debug(`${reset}Polling ${CONSUL_ID}`);
  const result = await consulApi.consulHealthService({ service: consulServiceName, passing: true });

  const { Address: host, Meta: meta } = result?.[0]?.Service || {};
  if (!host || !meta) {
    debug(`${red}There is no information for ${CONSUL_ID}`);
    accessPoint.lastSuccessUpdate = 0;
    return;
  }
  accessPoint.lastSuccessUpdate = Date.now();

  if (typeof accessPoint.retrieveProps !== 'function') {
    accessPoint.retrieveProps = retrieveProps.bind(null, accessPoint);
  }
  const properties = accessPoint.retrieveProps(host, meta);
  const changes = accessPoint.setProps?.(properties)?.getChanges?.();
  if (!changes?.length) {
    debug(`${green}The data is up-to-date ${CONSUL_ID}`);
  }
}

export async function updateAccessPoints(clOptions: ICLOptions) {
  const { accessPoints } = clOptions.config;
  return Promise.all(Object.values(<IAccessPoints>accessPoints).filter(({ isAP }: any) => isAP)
    .map((accessPoint) => updateAccessPoint(clOptions, <IAccessPoint>accessPoint)));
}

export const accessPointsUpdater = {
  isStarted: false,
  async start(clOptions: ICLOptions): Promise<number> {
    if (this.isStarted) {
      return 0;
    }
    let timerId: any;
    const { config, timeout = 10_000 } = clOptions;
    const { accessPoints } = config;

    let { logger } = clOptions;
    if (!logger) {
      logger = accessPoints?.logger ?? loggerStub;
    }
    const doLoop = async () => {
      try {
        await updateAccessPoints(clOptions);
      } catch (err) {
        logger?.error(err);
      }
      clearTimeout(timerId);
      timerId = setTimeout(doLoop, timeout);
    };
    doLoop().then((r) => r);
    this.isStarted = true;
    return 1;
  },
};
