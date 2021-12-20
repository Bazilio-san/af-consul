import initConsulAgent from './init-consul-agent';

initConsulAgent().then(({ registerService }) => {
  registerService().then(() => null);
});
