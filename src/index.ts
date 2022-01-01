import { getFQDN } from './get-fqdn';
import { getAPI, getConsulApiAndAgentOptions, getConsulApiCached, getRegisterConfig, getServiceID } from './get-config';
import { getConsulApi } from './api';
import { registerService } from './register-service';

export { AccessPoints } from './access-points';
export { accessPointsUpdater } from './access-points-updater';
export {
  getServiceID,
  getFQDN,
  getConsulApiAndAgentOptions,
  getConsulApiCached,
  getRegisterConfig,
  getAPI,
  getConsulApi,
  registerService,
};
