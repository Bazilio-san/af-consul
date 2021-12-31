import * as os from 'os';
import * as dns from 'dns';

// Returns fully qualified domain name
export const getFQDN = (h?: string, withError?: boolean, onlyDomain?: boolean) => {
  h = h || os.hostname();
  return new Promise((resolve, reject) => {
    dns.lookup(h as string, { hints: dns.ADDRCONFIG }, (err: any, ip: string) => {
      if (err) {
        return withError ? reject(err) : resolve(null);
      }
      dns.lookupService(ip, 0, (err2, hostname) => {
        if (err2) {
          return withError ? reject(err2) : resolve(null);
        }
        if (onlyDomain && !/\.[a-z]+$/i.test(hostname)) {
          resolve(null);
          return;
        }
        resolve(hostname);
      });
    });
  });
};
