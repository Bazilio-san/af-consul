// noinspection JSUnusedGlobalSymbols

import { AsyncLocalStorage } from 'async_hooks';
import { Logger } from 'tslog';
// eslint-disable-next-line import/no-unresolved
import { TLogLevelName } from 'tslog/src/interfaces';

export const asyncLocalStorage: AsyncLocalStorage<{ requestId: string }> = new AsyncLocalStorage();

export class LoggerEx extends Logger {
  public isLevel(levelName: TLogLevelName): boolean {
    // @ts-ignore
    const { _logLevels: logLevels, settings: { minLevel } } = this;
    return logLevels.indexOf(levelName) >= logLevels.indexOf(minLevel);
  }
}

export const logger = new LoggerEx({
  name: 'af-consul',
  displayLoggerName: false,
  displayFunctionName: false,
  displayFilePath: 'hidden',
  minLevel: 'silly' as TLogLevelName,
  requestId: (): string => asyncLocalStorage.getStore()?.requestId as string,
});
