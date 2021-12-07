import { deregister, thisServiceId } from './configure';

const serviceId = process.argv[2] || thisServiceId;
deregister(serviceId).then((r) => r);
