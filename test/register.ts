/* eslint-disable no-console */
import initConsulAgent from './init-consul-agent';

initConsulAgent().then(async ({ registerService, consulApi, serviceId }) => {
  consulApi.consulHealthService({ service: serviceId, passing: true }).then((result: any) => {
    registerService().then((result2: any) => {
      // console.log(result2);
    });
  });
});
