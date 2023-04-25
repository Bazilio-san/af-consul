import * as http from 'http';
import * as https from 'https';
import { AccessPoints } from './access-points';
import { CONSUL_AP_UPDATE_TIMEOUT_MILLIS } from '../constants';

export const isHttpAvailable = (url: string) => new Promise((resolve) => {
  const client = /^https:/i.test(url) ? https : http;
  client.request(url, (r: any) => resolve(r.statusCode > 0)).on('error', () => resolve(false)).end();
});

export const checkAccessPointAvailability = async (accessPoints: AccessPoints, accessPointId: string, onError: (errorMessage: string) => false) => {
  const it = `Access point "${accessPointId}"`;
  const ap = accessPoints.getAP(accessPointId);
  if (!ap) {
    return onError(`${it} is not found`);
  }
  if (!ap.waitForHostPortUpdated) {
    return onError(`${it} has no method "waitForHostPortUpdated"`);
  }
  if (!(await ap.waitForHostPortUpdated(CONSUL_AP_UPDATE_TIMEOUT_MILLIS))) {
    return onError(`${it} update timed out`);
  }
  const { host, port, protocol = 'http', path = '' } = ap;
  const url = `${protocol}://${host}:${port}${path}`;
  if (!(await isHttpAvailable(url))) {
    return onError(`${it} is not available`);
  }
  return true;
};
