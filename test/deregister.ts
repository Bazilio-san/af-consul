import { deregister, thisServiceId } from './test-reg';

const serviceId = process.argv[2] || thisServiceId;
deregister(serviceId).then((r) => r);
