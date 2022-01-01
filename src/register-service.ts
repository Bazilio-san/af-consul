// noinspection JSUnusedGlobalSymbols

import loggerStub from './logger-stub';
import { getAPI } from '../src';
import { IGetRegisterConfigOptions, IRegisterCyclic } from './types';
import { cyan, green, reset } from './color';

const prefix = 'CONSUL-REG:';

const DEFAULT_INTERVAL = 60_000;

const calcHealthCheckInterval = (options: IGetRegisterConfigOptions) => {
  const { interval = '' } = options.config.consul.healthCheck || {};
  const toMills = (timeStr: string): number => {
    const re = /^(\d+)([sm])$/;
    const matches = re.exec(timeStr);
    if (!matches) {
      return 0;
    }
    return Number(matches[1]) * 1000 * (matches[2] === 's' ? 1 : 60);
  };
  return toMills(interval);
};

export const registerCyclic: IRegisterCyclic = {
  isStarted: false,
  skipNextUntil: 0,
  healthCheckIntervalMillis: 0,
  registerIntervalMillis: 0,
  options: null,
  async start(opt?: IGetRegisterConfigOptions): Promise<-1 | 0 | 1> {
    if (!opt && !this.options) {
      return -1;
    }
    if (this.isStarted) {
      return 0;
    }
    let timerId: any;
    const options = (opt || this.options) as IGetRegisterConfigOptions;
    this.healthCheckIntervalMillis = calcHealthCheckInterval(options);
    if (options.registerInterval) {
      this.registerIntervalMillis = options.registerInterval;
    } else {
      this.registerIntervalMillis = (this.healthCheckIntervalMillis * 1.5) || DEFAULT_INTERVAL;
    }
    if (!options.logger) {
      options.logger = loggerStub;
    }
    const { consulApi, registerConfig, consulUI, serviceId } = await getAPI(options);
    options.logger?.info(`Consul UI: ${consulUI}`);

    options.em?.on('health-check', () => {
      this.skipNextUntil = Date.now() + (this.healthCheckIntervalMillis * 1.5);
    });

    const doLoop = async () => {
      if (this.skipNextUntil < Date.now()) {
        try {
          if (this.isStarted) {
            options.logger?.silly(`${green}${prefix}${reset} Service ${cyan}${serviceId}${reset} registration check...`);
          }
          const registerType = this.isStarted ? (options?.registerType || 'if-config-differ') : 'force';
          await consulApi.registerService({ registerConfig, registerType });
        } catch (err: Error | any) {
          err.message = `${prefix} ERROR: ${err.message}`;
          options.logger?.error(err);
        }
        this.skipNextUntil = 0;
      } else {
        options.logger?.silly(`${green}${prefix}${reset}: Skip registration check after health check`);
      }
      clearTimeout(timerId);
      timerId = setTimeout(doLoop, this.registerIntervalMillis);
    };
    doLoop().then((r) => r);
    this.isStarted = true;
    return 1;
  },
};
