import loggerStub from './logger-stub';
import { getAPI } from '../src';
import { IGetRegisterConfigOptions } from './types';

export async function reg(options: IGetRegisterConfigOptions) {
  const { register, consulUI } = await getAPI(options);
  const registerResult = await register(options.force ? 'force' : 'if-not-registered');
  if (registerResult) {
    options.logger?.info(`Consul UI: ${consulUI}`);
  }
}

export const registerService = {
  isStarted: false,
  async start(options: IGetRegisterConfigOptions): Promise<number> {
    if (this.isStarted) {
      return 0;
    }
    let timerId: any;
    const { timeout = 60_000 } = options;
    options.force = true;

    if (!options.logger) {
      options.logger = loggerStub;
    }
    const doLoop = async () => {
      try {
        await reg(options);
        options.force = false;
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
