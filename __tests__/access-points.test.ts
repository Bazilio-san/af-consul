import { AccessPoints } from '../src';
import { logger } from './logger';
import { setProperty } from './test-utils';
import { IAccessPoint } from '../src/types';

const config = {
  accessPoints: {
    wso2siAPI: {
      title: 'WSO2 SI API',
      consulServiceName: 'dev-cepe01-wso2si-d2',
      host: null,
      port: 9443,
      protocol: 'https',
      user: 'admin',
      pass: 'admin',
    },
    wso2siParams: {
      title: 'WSO2 SI Params',
      consulServiceName: 'dev-cepe01-wso2si-d2',
      host: null,
      port: 9901,
    },
    wso2toolingAPI: {
      title: 'WSO2 Tooling API',
      consulServiceName: 'dev-cepe01-wso2tooling-d2',
      host: null,
      port: 9390,
      user: 'admin',
      pass: 'admin',
    },
    wso2toolingParams: {
      title: 'WSO2 Tooling Params',
      consulServiceName: 'dev-cepe01-wso2tooling-d2',
      host: null,
      port: 9902,
    },
  },
};

const cfg = { accessPoints: new AccessPoints(config.accessPoints) };

const mockLoggerError = jest.fn((...args) => {
  logger.error(...args);
});

const mockLoggerInfo = jest.fn((...args) => {
  logger.info(...args);
});
const _logger_ = Symbol.for('_logger_');

setProperty(cfg.accessPoints[_logger_], 'error', mockLoggerError);
setProperty(cfg.accessPoints[_logger_], 'info', mockLoggerInfo);

describe('Access Points test', () => {
  test('Checking the initial state of all AP', () => {
    const expected = {
      wso2siAPI: {
        id: 'wso2siAPI',
        title: 'WSO2 SI API',
        consulServiceName: 'dev-cepe01-wso2si-d2',
        host: null,
        port: 9443,
        protocol: 'https',
        user: 'admin',
        pass: 'admin',
      },
      wso2siParams: {
        id: 'wso2siParams',
        title: 'WSO2 SI Params',
        consulServiceName: 'dev-cepe01-wso2si-d2',
        host: null,
        port: 9901,
      },
      wso2toolingAPI: {
        id: 'wso2toolingAPI',
        title: 'WSO2 Tooling API',
        consulServiceName: 'dev-cepe01-wso2tooling-d2',
        host: null,
        port: 9390,
        user: 'admin',
        pass: 'admin',
      },
      wso2toolingParams: {
        id: 'wso2toolingParams',
        title: 'WSO2 Tooling Params',
        consulServiceName: 'dev-cepe01-wso2tooling-d2',
        host: null,
        port: 9902,
      },
    };
    const result = cfg.accessPoints.get();
    expect(result).toMatchObject(expected);
  });

  test('Getting information about a specific AP', () => {
    const expected = {
      title: 'WSO2 SI API',
      consulServiceName: 'dev-cepe01-wso2si-d2',
      host: null,
      port: 9443,
      protocol: 'https',
      user: 'admin',
      pass: 'admin',
    };
    const result = cfg.accessPoints.get('wso2siAPI');
    expect(result).toMatchObject(expected);
  });

  test('Getting information about non existent AP', () => {
    const result = cfg.accessPoints.get('foo');
    expect(result).toBe(undefined);
  });

  test('Change AP settings', () => {
    const expected = {
      title: 'WSO2 SI API',
      consulServiceName: 'dev-cepe01-wso2si-d2',
      host: 'new-host',
      port: 456,
      protocol: 'https',
      user: 'admin',
      pass: 'admin',
      anyProp: true,
    };

    const result1 = cfg.accessPoints.setAP('wso2siAPI', {
      host: 'new-host', port: '456', anyProp: true, undefProp: undefined,
    });
    expect(result1).toMatchObject(expected);

    const result2 = cfg.accessPoints.get('wso2siAPI');
    expect(result2).toMatchObject(expected);

    expect(mockLoggerInfo.mock.calls.length).toBe(1);
  });

  test('Update AP itself', () => {
    const expected = {
      title: 'WSO2 SI API',
      consulServiceName: 'dev-cepe01-wso2si-d2',
      host: 'Update-host-self',
      port: 45687,
      protocol: 'https',
      user: 'admin',
      p: 'eee',
    };
    const wso2siAPI = cfg.accessPoints.getAP('wso2siAPI');
    const changedAP = wso2siAPI?.setProps?.({
      host: 'Update-host-self', port: 45687, p: 'eee',
    });
    const changes = changedAP?.getChanges?.();
    expect(changes?.length).toBe(3);
    expect(changes).toMatchObject([
      ['host', 'new-host', 'Update-host-self'],
      ['port', 456, 45687],
      ['p', undefined, 'eee'],
    ]);
    const data = cfg.accessPoints.get('wso2siAPI');
    expect(data).toMatchObject(expected);
  });

  test('New AP', () => {
    const expected = {
      title: 'new title',
      consulServiceName: 'dev-cepe01-new-d2',
      host: 'new-host2',
      port: 4562,
      protocol: 'http',
      anyProp: true,
      anyObj: { pr1: 1, pr2: 'eeee' },
    };
    expect(cfg.accessPoints.get('newAP')).toBe(undefined);

    cfg.accessPoints.setAP('newAP', {
      title: 'new title',
      consulServiceName: 'dev-cepe01-new-d2',
      host: 'new-host2',
      port: 4562,
      protocol: 'htt',
      anyProp: true,
      anyObj: { pr1: 1, pr2: 'eeee' },
      anyUndef: undefined,
      anyFn: () => {
        const a = 123;
        return a + 1;
      },
    });
    expect(cfg.accessPoints.get('newAP')).toMatchObject(expected);
  });

  test('Add new AP with no data specified', () => {
    expect(cfg.accessPoints.addAP('empty', null)).toBe(undefined);
  });

  test('Update AP with no data specified', () => {
    expect(cfg.accessPoints.setAP('empty', null)).toBe(undefined);
  });

  test('Test waitForHostPortUpdated()', async () => {
    const ap = cfg.accessPoints.getAP('wso2siAPI') as IAccessPoint;
    setTimeout(() => {
      ap.setProps?.({ host: 'new-host' });
    }, 2000);
    const isUpdated = await ap.waitForHostPortUpdated?.(10_000);
    expect(isUpdated).toBe(true);
  }, 15_000);

  test('Update AP with no consulServiceName specified', () => {
    expect(cfg.accessPoints.setAP('noConsulServiceName', { title: 'new title' })).toBe(undefined);
    expect(mockLoggerError.mock.calls.length).toBe(1);
  });
});
