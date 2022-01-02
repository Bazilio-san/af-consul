// noinspection JSUnusedGlobalSymbols

import loggerStub from './logger-stub';
import { ICLOptions, IConsulAPI, IRegisterConfig, IRegisterCyclic, TRegisterType } from './types';
import { cyan, green, reset } from './color';
import { toMills } from './utils';

const prefix = 'CONSUL-REG:';
const prefixG = `${green}${prefix}${reset}`;

const DEFAULT_INTERVAL = 60_000;

export const getRegisterCyclic = (
  opts: ICLOptions,
  consulApi: IConsulAPI,
  registerConfig: IRegisterConfig,
): IRegisterCyclic => ({
  isStarted: false,
  skipNextUntil: 0,
  healthCheckIntervalMillis: 0,
  registerIntervalMillis: 0,
  options: opts,

  async start(
    opt?: ICLOptions,
    registerInterval?: number,
    registerType?: TRegisterType,
  ): Promise<-1 | 0 | 1> {
    if (!opt && !this.options) {
      return -1;
    }
    if (this.isStarted) {
      return 0;
    }
    let timerId: any;
    const options = (opt || this.options) as ICLOptions;
    this.healthCheckIntervalMillis = toMills(options.config.consul.check?.interval);
    this.registerIntervalMillis = registerInterval || (this.healthCheckIntervalMillis * 1.5) || DEFAULT_INTERVAL;

    const logger = options.logger || loggerStub;

    options.em?.on('health-check', () => {
      this.skipNextUntil = Date.now() + (this.healthCheckIntervalMillis * 1.5);
    });

    const doLoop = async () => {
      if (this.skipNextUntil < Date.now()) {
        try {
          if (this.isStarted) {
            logger.silly(`${prefixG} Service ${cyan}${registerConfig.id}${reset} registration check...`);
          }
          await consulApi.registerService(registerConfig, { registerType: this.isStarted ? (registerType || 'if-config-differ') : 'force' });
        } catch (err: Error | any) {
          err.message = `${prefix} ERROR: ${err.message}`;
          logger.error(err);
        }
        this.skipNextUntil = 0;
      } else {
        logger.silly(`${prefixG}: Skip registration check after health check`);
      }
      clearTimeout(timerId);
      timerId = setTimeout(doLoop, this.registerIntervalMillis);
    };
    doLoop().then((r) => r);
    this.isStarted = true;
    return 1;
  },
});
