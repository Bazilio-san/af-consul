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
export const reset = '\x1b[0m';
export const yellow = '\x1b[33m';
export const magenta = '\x1b[35m';
export const cyan = '\x1b[36m';