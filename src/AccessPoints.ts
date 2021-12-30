import loggerStub from './logger-stub';
import { cyan as c, green as g, magenta as m, reset as rs } from './color';

const PREFIX = 'ACCESS-POINT';
const _ap_ = Symbol.for('_ap_');
const _lastSuccessUpdate_ = Symbol.for('_lastSuccessUpdate_');

export interface IAccessPoint {
  consulServiceName: string,
  id?: string,
  title?: string,
  port?: number | null,
  host?: string | null,
  setProps?: (data: Record<string, any> | null) => IAccessPoint | undefined,
  [_ap_]?: true,
  [_lastSuccessUpdate_]?: 0,
  getChanges?: () => [string, any, any][] | undefined,

  [propName: string]: any
}

export type IMayBeAccessPoint = IAccessPoint | undefined;

// eslint-disable-next-line import/prefer-default-export
export class AccessPoints {
  logger: any;

  constructor(accessPoints: { [s: string]: Record<string, any>; }, logger: any = loggerStub) {
    this.logger = logger;
    if (!accessPoints) {
      const msg = 'Empty argument "accessPoints" passed to constructor';
      this.logger.error(msg);
      throw new Error(msg);
    }
    Object.entries(accessPoints).forEach(([apKey, apData]) => {
      this.addAP(apKey, apData);
    });
  }

  static normalizePort(port: unknown) {
    return Number(port) || null;
  }

  static normalizeProtocol(protocol: string | null) {
    if (!protocol || !/^https?$/i.test(protocol)) {
      protocol = 'http';
    }
    return protocol?.toLowerCase();
  }

  static normalizeValue(propName: string, propValue: any) {
    switch (propName) {
      case 'port':
        return AccessPoints.normalizePort(propValue);
      case 'protocol':
        return AccessPoints.normalizeProtocol(propValue);
      default:
        return propValue;
    }
  }

  static getPureProps(accessPointSource: Record<string, any>): IAccessPoint {
    const accessPoint = Object.create(null);
    Object.entries(accessPointSource).forEach(([propName, propValue]) => {
      if (propValue === undefined || typeof propValue === 'function') {
        return;
      }
      if (typeof propValue === 'object' && propValue !== null) {
        accessPoint[propName] = { ...propValue };
        return;
      }
      accessPoint[propName] = propValue;
    });
    return accessPoint;
  }

  addAP(apKey: string, apData: Record<string, any> | null): IMayBeAccessPoint {
    if (!apData) {
      return undefined;
    }
    if (!apData.consulServiceName) {
      this.logger.error(`"${apKey}" access point not added because it lacks "consulServiceName" property`);
      return undefined;
    }
    const accessPoint: Record<string, any> = { [_ap_]: true };
    Object.defineProperty(accessPoint, 'isAP', { value: true });
    this[apKey] = accessPoint;
    Object.entries(apData).forEach(([propName, v]) => {
      accessPoint[propName] = AccessPoints.normalizeValue(propName, v);
    });
    accessPoint.id = apKey;
    accessPoint.title = accessPoint.title || apKey;
    accessPoint.setProps = this.setAP.bind(this, apKey);

    return AccessPoints.getPureProps(accessPoint);
  }

  setAP(apKey: string, apData: Record<string, any> | null): IMayBeAccessPoint {
    if (!apData) {
      return undefined;
    }
    const accessPoint = this[apKey];
    if (!accessPoint) {
      return this.addAP(apKey, apData);
    }
    /* istanbul ignore if */
    if (!accessPoint[_ap_]) {
      accessPoint[_ap_] = true;
    }
    const was: string[] = [];
    const became: string[] = [];
    const changes: any[] = [];

    Object.entries(apData).forEach(([propName, newV]) => {
      if (newV === undefined) {
        return;
      }
      const oldV = accessPoint[propName];
      newV = AccessPoints.normalizeValue(propName, newV);
      if (oldV !== newV) {
        was.push(`${c}${propName}${rs}: ${m}${oldV}${rs}`);
        became.push(`${c}${propName}${rs}: ${g}${newV}${rs}`);
        changes.push([propName, oldV, newV]);
      }
      accessPoint[propName] = newV;
    });
    if (was.length) {
      this.logger.info(`${PREFIX}: Change AP for ${c}${accessPoint.consulServiceName}${rs} to ${became.join('; ')}  from  ${was.join('; ')}`);
    }
    const result = AccessPoints.getPureProps(accessPoint);
    result.getChanges = () => (changes.length ? changes : undefined);
    return result;
  }

  getAP(accessPointKey: string): IMayBeAccessPoint {
    if (accessPointKey) {
      const accessPoint = this[accessPointKey];
      if (!accessPoint || !accessPoint[_ap_]) {
        return undefined;
      }
      return accessPoint;
    }
    return undefined;
  }

  /**
   * Если передан accessPointKey, то возвращается этот AP, если есть.
   * Если accessPointKey НЕ передан, то возвращаются ВСЕ AP
   */
  get(accessPointKey?: string) {
    if (accessPointKey) {
      const accessPoint = this[accessPointKey];
      if (!accessPoint || !accessPoint[_ap_]) {
        return undefined;
      }
      return AccessPoints.getPureProps(accessPoint);
    }
    const accessPoints = Object.create(null);
    Object.entries(this).forEach(([apKey, accessPoint]) => {
      if (accessPoint[_ap_]) {
        accessPoints[apKey] = AccessPoints.getPureProps(accessPoint);
      }
    });
    return accessPoints;
  }
}
