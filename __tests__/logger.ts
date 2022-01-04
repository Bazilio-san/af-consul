import { getAFLogger } from 'af-logger';

const minLevel = 'silly';
const prefix = 'af-consul';
const logDir = './_log';

const loggerSettings = {
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
