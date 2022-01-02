/* eslint-disable no-console */
import getConsulAPI from './get-consul-api';
import { logger } from './logger';
import { IApi, IConsulServiceInfo, Maybe } from '../src/types';
import { ILoggerMocked, mockLogger } from './test-utils';
import { getFQDNCached } from '../src';
import { serviceConfigDiff } from '../src/utils';
import { apiCache } from '../src/get-api';
import { MAX_API_CACHED } from '../src/constants';

const TIMEOUT_MILLIS = 100_000;

const log: ILoggerMocked = mockLogger(logger);

let api: IApi;
let thisHost: string;
let expectedServiceIfo: IConsulServiceInfo;
let serviceInfo: Maybe<IConsulServiceInfo>;

describe('Test API', () => {
  beforeAll(async () => {
    api = await getConsulAPI();
    thisHost = await getFQDNCached() || '';
    expectedServiceIfo = {
      ID: 'dev-cepe01-af-consul-test',
      Service: 'dev-cepe01-af-consul-test',
      Meta: {
        CONSUL_TEST: '12345',
        NODE_ENV: 'test',
        description: 'AF-CONSUL TEST',
        host: thisHost,
        instance: 'test',
        line_yellow: 'straight',
        name: 'af-consul',
        pj_name: 'af-consul',
        port: '10000',
        version: '0.0.1',
      },
      Port: 10000,
      Address: thisHost,
      // Datacenter: '???',
    };
  }, TIMEOUT_MILLIS);

  test('register', async () => {
    expect(Object.keys(apiCache).length).toBe(1);
    for (let i = 1; i < 6; i++) {
      // eslint-disable-next-line no-await-in-loop
      await getConsulAPI(String(i));
      console.log(api.serviceId);
    }
    expect(Object.keys(apiCache).length).toBe(MAX_API_CACHED);
  }, TIMEOUT_MILLIS);

  test('register', async () => {
    log.info.mockClear();
    const registerResult = await api.register.once();
    expect(!!registerResult).toBe(true);
    expect(log.info.mock.calls.length).toBeGreaterThan(0);
    expect(log.info.mock.calls[0][0]).toMatch(/Service.+(is|already) registered in Consul/);
  }, TIMEOUT_MILLIS);

  test('agentServiceList', async () => {
    const agentServiceList = await api.agentServiceList();
    expect(agentServiceList[api.serviceId]).toMatchObject(expectedServiceIfo);
  }, TIMEOUT_MILLIS);

  test('getServiceInfo', async () => {
    serviceInfo = await api.getServiceInfo(api.serviceId);
    expect(serviceInfo).toMatchObject(expectedServiceIfo);
  }, TIMEOUT_MILLIS);

  test('serviceConfigDiff = []', async () => {
    const diff = serviceConfigDiff(api.registerConfig, serviceInfo);
    expect(diff.length).toEqual(0);
  }, TIMEOUT_MILLIS);

  test('serviceConfigDiff != []', async () => {
    // @ts-ignore
    serviceInfo.Meta.CONSUL_TEST = 'foo';
    const diff = serviceConfigDiff(api.registerConfig, serviceInfo);
    expect(diff.length).toBeGreaterThan(0);
  }, TIMEOUT_MILLIS);
});
