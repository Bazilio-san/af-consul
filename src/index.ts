import { getFQDN } from './get-fqdn';
import { getAPI, prepareConsulApiByCLOptions, getConsulApiCached, getRegisterConfig, getServiceID } from './get-config';
import { prepareConsulAPI } from './prepare-consul-api';

export { AccessPoints } from './access-points';
export { accessPointsUpdater } from './access-points-updater';
export {
  getServiceID,
  getFQDN,
  prepareConsulApiByCLOptions,
  getConsulApiCached,
  getRegisterConfig,
  getAPI,
  prepareConsulAPI,
};
