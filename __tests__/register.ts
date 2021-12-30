/* eslint-disable no-console */
import initConsulAgent from './init-consul-agent';

const registerInConsul = async () => {
  const { registerService, consulUI } = await initConsulAgent();
  const isRegistered = await registerService();
  if (isRegistered) {
    console.log(`Consul UI: ${consulUI}`);
  }
};
registerInConsul().then((r) => r);
export default registerInConsul;
