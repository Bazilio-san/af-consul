import { ILogObject } from 'tslog/src/interfaces';
import { LoggerEx } from 'af-logger';
import { TLoggerMethod } from '../../src/interfaces';
import Mock = jest.Mock;

export const setProperty = (object: any, property: string, value: any) => {
  const originalProperty = Object.getOwnPropertyDescriptor(object, property);
  Object.defineProperty(object, property, { value });
  return originalProperty;
};

export type TLoggerMethodMocked = TLoggerMethod & Mock;

export interface ILoggerMocked {
  silly: TLoggerMethodMocked;
  debug: TLoggerMethodMocked;
  info: TLoggerMethodMocked;
  warn: TLoggerMethodMocked;
  error: TLoggerMethodMocked;
}

export const mockLogger = (logger: LoggerEx): ILoggerMocked => {
  ['silly', 'debug', 'info', 'warn', 'error'].forEach((fnName) => {
    if (logger[fnName]._isMockFunction) {
      return;
    }
    const old = logger[fnName];
    logger[fnName] = jest.fn<ILogObject, any[]>((...args) => old.apply(logger, args));
  });
  return logger as unknown as ILoggerMocked;
};
