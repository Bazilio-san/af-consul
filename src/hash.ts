import * as _ from 'lodash';
import * as XXH from 'xxhashjs';
import { ICLOptions, IConfig } from './types';
import { isObject } from './utils';

const getHash = (data: any, base: '32' | '64' = '32', seed: number = 0xCAFEBABE) => {
  let stringToHash = '';
  if (data === undefined) {
    stringToHash = '#thisisundefined#';
  } else if (data === null) {
    stringToHash = '#thisisnull#';
  } else if (data === '') {
    stringToHash = '#thisisemptystring#';
  } else if (Array.isArray(data)) {
    const arr = data.map((value) => ([value, getHash(String(value) + (typeof value), '32', seed)]));
    arr.sort(([, a], [, b]) => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    });
    stringToHash = JSON.stringify(arr.map(([v]) => v));
  } else if (isObject(data)) {
    const op = Object.prototype.toString.call(data); // === '[object Date]'
    switch (op) {
      case '[object Function]':
      case '[object Date]':
        stringToHash += data.toString();
        break;
      // case '[object Object]':
      default: {
        const keys = Object.keys(data).sort();
        keys.forEach((key) => {
          stringToHash += key + getHash(data[key], base, seed);
        });
      }
    }
  } else if (typeof data === 'string') {
    stringToHash = data;
  } else if (typeof data === 'number') {
    stringToHash = `i${String(data)}`;
  } else if (typeof data === 'boolean') {
    stringToHash = `b${data ? 1 : 0}`;
  } else if (typeof data === 'function') {
    stringToHash = `f${data.toString()}`;
  }
  return XXH[`h${base}`](stringToHash, seed).toString(16);
};

export const getConfigHash = (options: ICLOptions): string => {
  const opt = _.pick(options, ['config', 'projectId']);
  opt.config = _.pick(opt.config, ['consul', 'webServer']) as IConfig;
  const hash = getHash(opt);
  options.hash = hash;
  return hash;
};
