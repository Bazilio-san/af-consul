/* eslint-disable no-console */
// noinspection JSUnusedGlobalSymbols

import getConsulAPI from './get-consul-api';

const registerInConsul = async () => {
  const api = await getConsulAPI();
  const isRegistered = await api.register.once();
  if (isRegistered) {
    console.log(`Registered ${api.serviceId}`);
  }
};
registerInConsul().then((r) => r);
export default registerInConsul;
