import * as fs from 'fs';
import { ICache, IConsulServiceInfo, IRegisterConfig } from '../interfaces';

export const removeAroundQuotas = (str: string): string => {
  if (!str) {
    return str;
  }
  const re = /^(["'])([^\r\n]+)(\1)$/;
  while (re.test(str)) {
    str = str.replace(re, '$2');
  }
  return str;
};

export const parseBoolean = (bv: any): boolean => {
  if (typeof bv === 'boolean' || typeof bv === 'number') {
    return !!bv;
  }
  if (typeof bv !== 'string') {
    bv = String(bv);
  }
  return !/^(false|no|0)$/i.test(bv.trim().toLowerCase());
};

export const substitutePercentBracket = (v: string, data: object): string => {
  const re = /%?{([^}]+)}/g;
  let result: string = v;
  const matches = [...v.matchAll(re)];
  matches.forEach(([found, propName]) => {
    const substitution = String(data[propName] || '');
    result = result.replace(found, substitution);
  });
  return result;
};

export const substitute = (meta: any, data: any): void => {
  Object.entries(meta).forEach(([k, v]) => {
    if (typeof v === 'string') {
      meta[k] = substitutePercentBracket(v, data);
    }
  });
};

export const parseMeta = (m: string | object | undefined, data: object) => {
  const metaData = {} as any;
  if (!m) {
    return metaData;
  }
  const fillMetaData = (o: object) => {
    Object.entries(o).forEach(([k, v]) => {
      if (!['string', 'number'].includes(typeof v)) {
        v = String(v);
      }
      if (/^[A-Z][A-Z_\d]+$/i.test(k)) {
        metaData[k] = v;
      }
    });
  };

  if (typeof m === 'string') {
    m = removeAroundQuotas(m);
    if (m.startsWith('{')) {
      try {
        fillMetaData(JSON.parse(m));
      } catch (e) { //
      }
    } else if (m.includes('=')) {
      m.split(/;/g).forEach((pair) => {
        const i = pair.indexOf('=');
        if (i < 0) {
          return;
        }
        const k = pair.substring(0, i).trim();
        const v = pair.substring(i + 1).trim();
        if (k) {
          metaData[k] = v;
        }
      });
    }
  } else if (typeof m === 'object' && !Array.isArray(m)) {
    fillMetaData(m);
  }
  substitute(metaData, data);
  return metaData;
};

export const parseTags = (t: any): string[] => {
  if (typeof t === 'string') {
    t = removeAroundQuotas(t);
    return t.split(/;/g).map((v: string) => v.trim()).filter((v: string) => v);
  }
  if (typeof t === 'number') {
    return [String(t)];
  }
  if (Array.isArray(t)) {
    return t.map((v) => String(v).trim()).filter((v) => v);
  }
  return [];
};

export const serviceConfigDiff = (registerConfig: IRegisterConfig, serviceInfo: IConsulServiceInfo | undefined): any[] => {
  if (!serviceInfo) {
    return ['id', registerConfig.id, 'ID', undefined];
  }
  const mastBeEquals = [['id', 'ID'], ['name', 'Service'], ['port', 'Port'], ['address', 'Address']];
  let diff: any[] = [];
  mastBeEquals.some(([p1, p2]) => {
    if (registerConfig[p1 as keyof IRegisterConfig] !== serviceInfo[p2]) {
      diff = [p1, registerConfig[p1 as keyof IRegisterConfig], p2, serviceInfo[p2]];
      return true;
    }
    return false;
  });
  if (!diff.length) {
    const { meta } = registerConfig;
    const { Meta = {} } = serviceInfo;
    Object.entries(meta as { [s: string]: string }).some(([p, v]) => {
      if (v !== Meta[p]) {
        diff = [`meta.${p}`, v, `Meta.${p}`, Meta[p]];
        return true;
      }
      return false;
    });
  }
  return diff;
};

export const minimizeCache = <T> (cache: ICache<T>, maxItems: number) => {
  const len = Object.keys(cache).length;
  if (len >= maxItems) {
    const sortedDesc = Object.entries(cache)
      .sort((a, b) => b[1].created - a[1].created);
    sortedDesc.splice(0, maxItems - 1);
    sortedDesc.map(([h]) => h).forEach((h) => {
      delete cache[h];
    });
  }
};

/**
 * String in format \d+(s|m) in milliseconds
 */
export const toMills = (timeStr: string = ''): number => {
  const re = /^(\d+)([sm])$/;
  const matches = re.exec(timeStr);
  if (!matches) {
    return 0;
  }
  return Number(matches[1]) * 1000 * (matches[2] === 's' ? 1 : 60);
};

export const getPackageJson = (relPathToProjRoot: string = '') => {
  try {
    const rootDir = process.cwd();
    const packageJson = `${rootDir}${relPathToProjRoot}/package.json`;
    if (fs.existsSync(packageJson)) {
      return JSON.parse(fs.readFileSync(packageJson, { encoding: 'utf8' }));
    }
  } catch (err) {
    //
  }
};

export const sleep = async (timeOut: number) => new Promise((resolve) => {
  setTimeout(resolve, timeOut);
});

export const isObject = (v: any): boolean => v != null
  && typeof v === 'object'
  && !Array.isArray(v)
  && !(v instanceof Date)
  && !(v instanceof Set)
  && !(v instanceof Map);
