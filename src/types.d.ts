import Consul from "consul";
import { IAccessPoints } from "./access-points";
import EventEmitter from "events";

export type Maybe<T> = T | undefined;

export interface ISocketInfo {
  host: string;
  port: string | number;
}

export interface IRegisterCheck extends Consul.Agent.Service.RegisterCheck {
  name?: string;
  tcp?: string;
  dockercontainerid?: string;
  shell?: string;
  timeout?: string;
  deregistercriticalserviceafter?: string;
}

export interface IRegisterOptions extends Consul.Agent.Service.RegisterOptions {
  check?: IRegisterCheck;
  checks?: IRegisterCheck[];
  connect?: any;
  proxy?: any;
  taggedAddresses?: any;
}

export interface IConsul extends Consul.Consul {
  _ext(eventName: 'onRequest' | 'onResponse', callback: (request: any, next: Function) => void): void;

  _defaults: any;
  _get: (...args: any[]) => any;
}

export type TRegisterType = 'if-not-registered' | 'if-config-differ' | 'force';

export interface IServiceOptions {
  registerConfig: IRegisterOptions;
  registerType?: TRegisterType;
  noAlreadyRegisteredMessage?: boolean;
}

export interface IConsulAgentOptions extends Consul.ConsulOptions {
}

export type TLoggerMethod = (...args: unknown[]) => any;

export interface ILogger {
  silly: TLoggerMethod;
  debug: TLoggerMethod;
  info: TLoggerMethod;
  warn: TLoggerMethod;
  error: TLoggerMethod;
}

export interface IConfig {
  accessPoints?: IAccessPoints,
  consul: {
    agent: any,
    healthCheck?: {
      interval?: string,
      timeout?: string,
      deregistercriticalserviceafter?: string,
    },
    service: any,
  },
  webServer: any,
}

export interface ICLOptions {
  config: IConfig,
  logger?: ILogger,
  em?: EventEmitter,
  registerInterval?: number
  accessPointsUpdateInterval?: number
  force?: boolean
}

export type TRegisterServiceResult = 'already' | 'just' | false;
export type TCommonFnResult = any;

type TProperty = any;
type TMethod = (...args: any[]) => any;

export interface IConsulAPI {
  agentOptions: IConsulAgentOptions,
  agentServiceList: (withError?: boolean) => Promise<{ [serviceName: string]: IConsulServiceInfo }>,
  consulHealthService: (options: Consul.Health.ServiceOptions, withError?: boolean) => Promise<TCommonFnResult>,
  getServiceInfo: (serviceName: string, withError?: boolean) => Promise<Maybe<IConsulServiceInfo>>,
  getServiceSocket: (serviceName: string, defaults: ISocketInfo) => Promise<ISocketInfo>,
  agentServiceRegister: (options: IRegisterOptions, withError?: boolean) => Promise<boolean>,
  agentServiceDeregister: (serviceId: string, withError?: boolean) => Promise<TCommonFnResult>,
  deregisterIfNeed: (serviceId: string) => Promise<boolean>,
  agentMembers: (withError?: boolean) => Promise<TCommonFnResult>,
  checkIfServiceRegistered: (serviceIdOrName: string) => Promise<boolean>,
  registerService: (options: IServiceOptions) => Promise<TRegisterServiceResult>,

  [functionName: string]: TProperty | TMethod,
}

export interface IGetRegisterConfigOptions extends ICLOptions {
  uiHost: string,
  dn: string,
  check?: IRegisterCheck, // Альтернатива config.consul.healthCheck (который ограничен в значениях). Если указано, то имеет высокий приоритет.
  registerType?: TRegisterType
}

export interface IRegisterConfig {
  registerConfig: IRegisterOptions,
  consulUI: string,
  serviceId: string
}

export type IApi = IRegisterConfig & {
  consulApi: IConsulAPI,
  register: (registerType?: TRegisterType) => Promise<TRegisterServiceResult>,
  registerCyclic: IRegisterCyclic,
  deregister: (svcId?: string) => Promise<boolean>,
}


export interface IConsulServiceInfo {
  ID: string,
  Service: string,
  Tags?: string[],
  Meta?: {
    [prop: string]: string | number | boolean | null,
  },
  Port: number,
  Address: string,
  Weights?: { Passing: number, Warning: number },
  EnableTagOverride?: boolean,
  Datacenter?: string,
  [prop: string]: any,
}

export interface IRegisterCyclic {
  isStarted: boolean,
  skipNextUntil: number,
  healthCheckIntervalMillis: number,
  registerIntervalMillis: number,
  options: IGetRegisterConfigOptions | null,
  start: (opt?: IGetRegisterConfigOptions) => Promise<-1 | 0| 1>
}
