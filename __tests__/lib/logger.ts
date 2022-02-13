import { getAFLogger } from 'af-logger';
import { ILoggerSettings } from 'af-logger/dist/types/interfaces';

const minLevel = 'silly';
const prefix = 'af-consul';
const logDir = './_log';

const loggerSettings: ILoggerSettings = {
  minLevel,
  name: prefix,
  filePrefix: prefix,
  logDir,
  minLogSize: 0,
  minErrorLogSize: 0,
  // displayLoggerName: true,
  // displayFunctionName: true,
  // displayFilePath: 'displayAll',
  // emitter: em,
  fileLoggerMap: {
    silly: 'info',
    info: 'info',
    error: 'error',
    fatal: 'error',
  },
};

const { logger } = getAFLogger(loggerSettings);

export { logger };
