import loggerStub from './logger-stub';
import { blue, cyan, green, magenta, reset } from './color';
import { IAccessPoint, IAccessPoints, ILogger, Maybe } from './types';
import { isObject } from './utils';

const PREFIX = 'ACCESS-POINT';

const _logger_ = Symbol.for('_logger_');

// eslint-disable-next-line import/prefer-default-export
export class AccessPoints {
  private readonly [_logger_]: ILogger;

  constructor(accessPoints: IAccessPoints, logger?: ILogger) {
    this[_logger_] = logger || loggerStub;
    if (!accessPoints) {
      const msg = 'Empty argument "accessPoints" passed to constructor';
      this[_logger_].error(msg);
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

  addAP(apKey: string, apData: any): Maybe<IAccessPoint> {
    if (!apData || !isObject(apData)) {
      return undefined;
    }
    if (!apData.consulServiceName) {
      this[_logger_].error(`"${apKey}" access point not added because it lacks "consulServiceName" property`);
      return undefined;
    }
    const accessPoint: Record<string, any> = {};
    Object.defineProperty(accessPoint, 'isAP', { value: true });
    Object.defineProperty(accessPoint, 'lastSuccessUpdate', { value: 0, writable: true });
    this[apKey] = accessPoint;
    Object.entries(apData).forEach(([propName, v]) => {
      accessPoint[propName] = AccessPoints.normalizeValue(propName, v);
    });
    accessPoint.id = apKey;
    accessPoint.title = accessPoint.title || apKey;
    accessPoint.setProps = this.setAP.bind(this, apKey);

    return AccessPoints.getPureProps(accessPoint);
  }

  setAP(apKey: string, apData: Record<string, any> | null): Maybe<IAccessPoint> {
    if (!apData) {
      return undefined;
    }
    const accessPoint = this[apKey];
    if (!accessPoint) {
      return this.addAP(apKey, apData);
    }
    /* istanbul ignore if */
    if (!accessPoint.isAP) {
      Object.defineProperty(accessPoint, 'isAP', { value: true });
      Object.defineProperty(accessPoint, 'lastSuccessUpdate', { value: 0, writable: true });
    }
    const was: string[] = [];
    const became: string[] = [];
    const changes: any[] = [];

    const msgVal = (propName: string, propValue: any, valueColor: string) => {
      const ret = (v: any, color = blue) => `${cyan}${propName}${reset}: ${color}${v}${reset}`;
      return (propValue == null || propValue === '') ? ret(`[${String(propValue)}]`) : ret(propValue, valueColor);
    };

    Object.entries(apData).forEach(([propName, newV]) => {
      if (newV === undefined) {
        return;
      }
      const oldV = accessPoint[propName];
      newV = AccessPoints.normalizeValue(propName, newV);
      if (oldV !== newV) {
        was.push(msgVal(propName, oldV, magenta));
        became.push(msgVal(propName, newV, green));
        changes.push([propName, oldV, newV]);
      }
      accessPoint[propName] = newV;
    });
    if (was.length) {
      this[_logger_].info(`${PREFIX}: Change AP for ${cyan}${accessPoint.consulServiceName}${reset} to ${became.join('; ')}  from  ${was.join('; ')}`);
    }
    const result = AccessPoints.getPureProps(accessPoint);
    result.getChanges = () => (changes.length ? changes : undefined);
    return result;
  }

  getAP(accessPointKey: string): Maybe<IAccessPoint> {
    if (accessPointKey) {
      const accessPoint = this[accessPointKey];
      if (!accessPoint?.isAP) {
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
      if (!accessPoint?.isAP) {
        return undefined;
      }
      return AccessPoints.getPureProps(accessPoint);
    }
    const accessPoints = Object.create(null);
    Object.values(this).filter((ap) => ap?.isAP).forEach((accessPoint) => {
      accessPoints[accessPoint.id] = AccessPoints.getPureProps(accessPoint);
    });
    return accessPoints;
  }
}
