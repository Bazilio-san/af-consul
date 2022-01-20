import * as os from 'os';
import * as dns from 'dns';
import { ICache } from './types';
import { minimizeCache } from './utils';

// Returns fully qualified domain name
export const getFQDN = (h?: string, withError?: boolean, onlyDomain?: boolean): Promise<string | null> => {
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

const fqdnCache: ICache<string> = {};

export const getFQDNCached = async (...args: any[]): Promise<string | null> => {
  const hostNameOrIP = args[0] || os.hostname() || '-';
  minimizeCache(fqdnCache, 10);
  if (!fqdnCache[hostNameOrIP]) {
    const fqdn = await getFQDN(...args);
    if (fqdn) {
      fqdnCache[hostNameOrIP] = {
        created: Date.now(),
        value: fqdn,
      };
    }
  }
  return fqdnCache[hostNameOrIP]?.value || null;
};
