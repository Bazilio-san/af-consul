// noinspection JSUnusedGlobalSymbols

import loggerStub from './logger-stub';
import { getAPI } from '../src';
import { IGetRegisterConfigOptions, IRegisterCyclic } from './types';

export const registerCyclic: IRegisterCyclic = {
  isStarted: false,
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
    const { timeout = 60_000 } = options;

    if (!options.logger) {
      options.logger = loggerStub;
    }
    const { consulApi, registerConfig, consulUI } = await getAPI(options);
    options.logger?.info(`Consul UI: ${consulUI}`);

    const doLoop = async () => {
      try {
        const registerType = this.isStarted ? (options?.registerType || 'if-config-differ') : 'force';
        await consulApi.registerService({ registerConfig, registerType });
      } catch (err) {
        options.logger?.error(err);
      }
      clearTimeout(timerId);
      timerId = setTimeout(doLoop, timeout);
    };
    doLoop().then((r) => r);
    this.isStarted = true;
    return 1;
  },
};
