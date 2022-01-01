import { IRegisterOptions, IConsulServiceInfo } from './types';

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

export const parseMeta = (m: string | object) => {
  const metaData = {};

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

export const serviceConfigDiff = (registerConfig: IRegisterOptions, serviceInfo: IConsulServiceInfo): any[] => {
  const mastBeEquals = [['id', 'ID'], ['name', 'Service'], ['port', 'Port'], ['address', 'Address']];
  let diff: any[] = [];
  mastBeEquals.some(([p1, p2]) => {
    if (registerConfig[p1] !== serviceInfo[p2]) {
      diff = [p1, registerConfig[p1], p2, serviceInfo[p2]];
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
