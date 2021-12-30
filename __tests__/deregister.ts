import initConsulAgent from './init-consul-agent';

initConsulAgent().then(({ deregister }) => {
  deregister(process.argv[2]).then(() => null);
});
