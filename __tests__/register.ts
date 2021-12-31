/* eslint-disable no-console */
import getConsulAPI from './get-consul-api';

const registerInConsul = async () => {
  const { registerService, consulUI } = await getConsulAPI();
  const isRegistered = await registerService();
  if (isRegistered) {
    console.log(`Consul UI: ${consulUI}`);
  }
};
registerInConsul().then((r) => r);
export default registerInConsul;
