import getConsulAPI from './get-consul-api';

getConsulAPI().then(({ deregister }) => {
  deregister(process.argv[2]).then(() => null);
});
