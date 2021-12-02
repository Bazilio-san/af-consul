import { deregister, thisServiceId } from './config';

const serviceId = process.argv[2] || thisServiceId;
deregister(serviceId).then((r) => r);
