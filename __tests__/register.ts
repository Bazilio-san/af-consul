/* eslint-disable no-console */
import getConsulAPI from './get-consul-api';

const registerInConsul = async () => {
  const { register, consulUI } = await getConsulAPI();
  const isRegistered = await register();
  if (isRegistered) {
    console.log(`Consul UI: ${consulUI}`);
  }
};
registerInConsul().then((r) => r);
export default registerInConsul;
