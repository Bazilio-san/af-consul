// import 'dotenv/config';
import getConsulAPI from './get-consul-api';

getConsulAPI().then(({ deregister }) => {
  const [, , svcId, agentHost, agentPort] = process.argv;
  deregister(svcId, agentHost, agentPort).then(() => null);
});
