/* eslint-disable no-console */
// noinspection JSUnusedGlobalSymbols

import loggerStub from './lib/logger-stub';
import { ICLOptions, IConsulAPI, ICyclicStartArgs, IRegisterConfig, IRegisterCyclic } from './interfaces';
import { cyan, green, magenta, reset } from './lib/color';
import { toMills } from './lib/utils';
import { DEBUG, FORCE_EVERY_REGISTER_ATTEMPT, PREFIX } from './constants';

const prefix = 'CONSUL-REG:';
const prefixG = `${green}${prefix}${reset}`;

const DEFAULT_INTERVAL = 60_000;

const isDebugReg = /\baf-consul:(reg|\*)/i.test(DEBUG) || /\baf-consul:\*/i.test(DEBUG);
const debug = (msg: string) => {
  if (isDebugReg) {
    console.log(`${magenta}${PREFIX}${reset}: ${msg}`);
  }
};

export const getRegisterCyclic = (
  opts: ICLOptions,
  consulApi: IConsulAPI,
  registerConfig: IRegisterConfig,
): IRegisterCyclic => ({
  isStarted: false,
  skipNextRegisterAttemptUntil: 0,
  healthCheckIntervalMillis: 0,
  registerIntervalMillis: 0,
  options: opts,
  _timerId: setTimeout(() => null, 0),
  _logger: loggerStub,

  async start (cyclicStartArgs?: ICyclicStartArgs): Promise<-1 | 0 | 1> {
    const {
      cLOptions,
      registerInterval,
      registerType = 'if-not-registered',
      deleteOtherInstance = false,
      noAlreadyRegisteredMessage = false,
    } = cyclicStartArgs || {};

    if (!cLOptions && !this.options) {
      return -1;
    }
    if (this.isStarted) {
      return 0;
    }
    const options = (cLOptions || this.options) as ICLOptions;
    this.healthCheckIntervalMillis = toMills(options.config.consul.check?.interval);
    this.registerIntervalMillis = registerInterval || (this.healthCheckIntervalMillis * 1.5) || DEFAULT_INTERVAL;

    this._logger = options.logger || loggerStub;

    options.em?.on('health-check', () => {
      this.skipNextRegisterAttemptUntil = Date.now() + (this.healthCheckIntervalMillis * 1.5);
    });

    const doLoop = async () => {
      if (FORCE_EVERY_REGISTER_ATTEMPT || this.skipNextRegisterAttemptUntil < Date.now()) {
        try {
          if (this.isStarted) {
            debug(`${prefixG} Service ${cyan}${registerConfig.id}${reset} registration check...`);
          }
          await consulApi.registerService(registerConfig, {
            registerType: (FORCE_EVERY_REGISTER_ATTEMPT || !this.isStarted) ? 'force' : (registerType || 'if-not-registered'),
            deleteOtherInstance,
            noAlreadyRegisteredMessage,
          });
        } catch (err: Error | any) {
          err.message = `${prefix} ERROR: ${err.message}`;
          this._logger.error(err);
        }
        this.skipNextRegisterAttemptUntil = 0;
      } else {
        debug(`${prefixG} Skip registration check after health check`);
      }
      clearTimeout(this._timerId);
      this._timerId = setTimeout(doLoop, this.registerIntervalMillis);
    };
    doLoop().then((r) => r);
    this.isStarted = true;
    const { host, port, defaults } = consulApi.agentOptions.reg;
    this._logger.info(`Cyclic Register of service ${cyan}${registerConfig.id}${reset} started. Agent: ${
      cyan}${host}:${port}${reset}, token: ${cyan}${defaults?.token?.substring(0, 4)}***${reset}`);
    return 1;
  },
  stop () {
    clearTimeout(this._timerId);
    this.isStarted = false;
    this._logger.info(`Cyclic Register of service ${cyan}${registerConfig.id}${reset} stopped`);
  },
});
