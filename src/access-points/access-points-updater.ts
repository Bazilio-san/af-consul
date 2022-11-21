/* eslint-disable no-console */
// noinspection JSUnusedGlobalSymbols

import { cyan, green, magenta, red, reset } from '../lib/color';
import loggerStub from '../lib/logger-stub';
import { getConsulApiCached } from '../index';
import {
  IAccessPoint,
  IAccessPoints,
  ICLOptions,
  IConsulAPI,
  IConsulHealthServiceInfo,
} from '../interfaces';
import { sleep } from '../lib/utils';
import { DEBUG } from '../constants';

const PREFIX = 'AP-UPDATER';

const dbg = { on: /\bAP-UPDATER\*?/i.test(DEBUG) || DEBUG === '*' };
const debug = (msg: string) => {
  if (dbg.on) {
    console.log(`${magenta}${PREFIX}${reset}: ${msg}`);
  }
};

const UPDATE_INTERVAL_IF_CONSUL_REGISTER_SUCCESS_MILLIS = Number(process.env.UPDATE_INTERVAL_IF_CONSUL_REGISTER_SUCCESS_MILLIS) || (2 * 60_000);

// A stub in case such a function is not set for the access point in the configuration
function retrieveProps (accessPoint: IAccessPoint, host: string, meta?: any) {
  const port = Number(meta?.port) || accessPoint.port;
  return { host, port };
}

// Служит для исключения повторного опроса consulID в пределах одного цикла updateAccessPoints
let oneUpdateCache: { [consulServiceName: string]: IConsulHealthServiceInfo[] } = {};

export async function updateAccessPoint (clOptions: ICLOptions, accessPoint: IAccessPoint): Promise<-2 | -1 | 0 | 1> {
  if (!accessPoint.updateIntervalIfSuccessMillis) {
    accessPoint.updateIntervalIfSuccessMillis = UPDATE_INTERVAL_IF_CONSUL_REGISTER_SUCCESS_MILLIS;
  }
  if (Date.now() - (accessPoint.lastSuccessUpdate || 0) < accessPoint.updateIntervalIfSuccessMillis) {
    return 0;
  }
  const { consulServiceName } = accessPoint;
  const CONSUL_ID = `${cyan}${consulServiceName}${reset}`;
  let result = oneUpdateCache[consulServiceName];
  if (result) {
    if (result.length) {
      // Точка доступа уже опрошена в этом цикле и она была недоступна
      return 0;
    }
    // Точка доступа еще опрошена в этом цикле и есть сведения по ней. В этом просе будут взяты другие метаданные, нежели в предыдущем updateAccessPoint
  } else {
    // Точка доступа еще не опрошена в этом цикле
    const consulApi: IConsulAPI = await getConsulApiCached(clOptions);
    if (!consulApi) {
      clOptions.logger?.warn(`${PREFIX}: Failed to get consul API`);
      return -2;
    }
    debug(`${reset}Polling ${CONSUL_ID}`);
    result = await consulApi.consulHealthService({ options: { service: consulServiceName, passing: true } });
    oneUpdateCache[consulServiceName] = result;
  }

  const { Address: host, Meta: meta } = result?.[0]?.Service || {};
  if (!host) {
    clOptions.logger?.warn(`${red}There is no information for ${CONSUL_ID}`);
    accessPoint.lastSuccessUpdate = 0;
    const wasReachable = accessPoint.isReachable;
    accessPoint.isReachable = false;
    if (wasReachable) {
      clOptions.em?.emit('access-point-updated', { accessPoint, changes: [['isReachable', true, false]] });
    }
    return -1;
  }
  accessPoint.isReachable = true;
  accessPoint.lastSuccessUpdate = Date.now();

  // If the retrieveProps function is not set for the access point in the configuration, use the stub
  if (typeof accessPoint.retrieveProps !== 'function') {
    accessPoint.retrieveProps = retrieveProps.bind(null, accessPoint);
  }
  const properties = accessPoint.retrieveProps(host, meta);
  const changes = accessPoint.setProps?.(properties)?.getChanges?.();

  if (changes?.length) {
    accessPoint.meta = meta;
    clOptions.em?.emit('access-point-updated', { accessPoint, changes });
  } else {
    debug(`${green}The data is up-to-date ${CONSUL_ID}`);
  }
  return 1;
}

export async function updateAccessPoints (clOptions: ICLOptions): Promise<boolean> {
  const accessPoints = Object.values(<IAccessPoints>clOptions.config.accessPoints).filter((ap: any) => ap?.isAP);
  const result = [];
  for (let i = 0; i < accessPoints.length; i++) {
    const accessPoint: IAccessPoint = accessPoints[i];
    // eslint-disable-next-line no-await-in-loop
    const res = await updateAccessPoint(clOptions, accessPoint);
    result.push(res);
  }
  const updatedCount = result.filter((v) => v > 0);
  if (updatedCount.length) {
    clOptions.logger?.silly(`${PREFIX}: updated ${updatedCount.length} access point(s)`);
    clOptions.em?.emit('access-points-updated');
  }
  return !!updatedCount;
}

export const accessPointsUpdater = {
  isStarted: false,
  isAnyUpdated: false,
  _timerId: setTimeout(() => null, 0),
  _logger: loggerStub,
  start (clOptions: ICLOptions, updateInterval: number = 10_000): number {
    if (this.isStarted) {
      return 0;
    }
    this._logger = clOptions.logger || loggerStub;
    const doLoop = async () => {
      try {
        oneUpdateCache = {};
        const isAnyUpdated = await updateAccessPoints(clOptions);
        if (isAnyUpdated) {
          this.isAnyUpdated = true;
        }
      } catch (err) {
        this._logger?.error(err);
      }
      clearTimeout(this._timerId);
      this._timerId = setTimeout(doLoop, updateInterval);
    };
    doLoop().then((r) => r);
    this.isStarted = true;
    this._logger.info('Access point updater started');
    return 1;
  },
  async waitForAnyUpdated (timeout: number = 10_000): Promise<boolean> {
    const start = Date.now();
    while (!this.isAnyUpdated && (Date.now() - start < timeout)) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(100);
    }
    return this.isAnyUpdated;
  },
  stop () {
    clearTimeout(this._timerId);
    this.isStarted = false;
    this._logger.info('Access point updater stopped');
  },
};
