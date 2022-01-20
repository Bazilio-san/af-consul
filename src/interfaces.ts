import Consul from 'consul';
import EventEmitter from 'events';

export type Maybe<T> = T | undefined;
export type Nullable<T> = T | null;

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

export interface IRegisterConfig extends Consul.Agent.Service.RegisterOptions {
  id: string;
  check?: IRegisterCheck;
  checks?: IRegisterCheck[];
  connect?: any;
  proxy?: any;
  taggedAddresses?: any;
}

export type TRegisterType = 'if-not-registered' | 'if-config-differ' | 'force';

export interface IRegisterOptions {
  registerType?: TRegisterType,
  deleteOtherInstance?: boolean,
  noAlreadyRegisteredMessage?: boolean,
}

export type TRegisterResult = 'already' | 'just' | false;

export interface IConsul extends Consul.Consul {
  _ext(eventName: 'onRequest' | 'onResponse', callback: (request: any, next: Function) => void): void;

  _defaults: any;
  _get: (...args: any[]) => any;
}

export interface IConsulAgentOptions extends Consul.ConsulOptions {
  host: string;
  port: string;
}

export type TLoggerMethod = (...args: unknown[]) => any;

export interface ILogger {
  silly: TLoggerMethod;
  debug: TLoggerMethod;
  info: TLoggerMethod;
  warn: TLoggerMethod;
  error: TLoggerMethod;
}

export interface IAccessPoint {
  consulServiceName: string,
  id?: string,
  title?: string,
  port?: number | null,
  host?: string | null,
  setProps?: (data: Record<string, any> | null) => IAccessPoint | undefined,
  isAP?: true,
  lastSuccessUpdate?: number,
  idHostPortUpdated?: boolean,
  getChanges?: () => [string, any, any][] | undefined,
  updateIntervalIfSuccessMillis?: number,

  [propName: string]: any
}

export interface IAccessPoints {
  [apKey: string]: IAccessPoint;
}

export interface IAFConsulConfig {
  accessPoints?: IAccessPoints,
  consul: {
    agent: {
      isRegisterServiceOnStart?: boolean,
      host?: string, // || FQDN || env.HOST_HOSTNAME || config.consul.service?.host || '127.0.0.1'
      port?: string, // || 8500
      secure?: boolean,
      token?: string,
    },
    check?: IRegisterCheck,
    service: {
      name: string,
      instance: string,
      version: string,
      description: string,
      tags?: string | string[],
      meta?: string | object,
      host?: Nullable<string>,
      port?: Nullable<string | number>
    },
  },
  webServer: any,
}

export type TCommonFnResult = any;

type TMethod<T> = (...args: any[]) => T;

export interface ICLOptions {
  config: IAFConsulConfig,
  logger?: ILogger,
  em?: EventEmitter,

  projectId?: string,
  getConsulUIAddress?: TMethod<string>,
  hash?: string,
}

export interface IConsulServiceInfo {
  ID: string,
  Service: string,
  Tags?: string[],
  Meta?: {
    [prop: string]: Nullable<string | number | boolean>,
  },
  Port: number,
  Address: string,
  Weights?: { Passing: number, Warning: number },
  EnableTagOverride?: boolean,
  Datacenter?: string,

  [prop: string]: any,
}

export interface IConsulAPI {
  agentServiceList: (agentOptions?: IConsulAgentOptions, withError?: boolean) => Promise<{ [serviceName: string]: IConsulServiceInfo }>,
  consulHealthService: (options: Consul.Health.ServiceOptions, withError?: boolean) => Promise<TCommonFnResult>,
  getServiceInfo: (serviceName: string, withError?: boolean) => Promise<Maybe<IConsulServiceInfo>>,
  getServiceSocket: (serviceName: string, defaults: ISocketInfo) => Promise<ISocketInfo>,
  agentServiceRegister: (options: IRegisterConfig, withError?: boolean) => Promise<boolean>,
  agentServiceDeregister: (serviceId: string, agentOptions?: IConsulAgentOptions, withError?: boolean) => Promise<TCommonFnResult>,
  deregisterIfNeed: (serviceId: string, agentHost?: string, agentPort?: string) => Promise<boolean>,
  agentMembers: (withError?: boolean) => Promise<TCommonFnResult>,
  checkIfServiceRegistered: (serviceIdOrName: string, agentOptions?: IConsulAgentOptions) => Promise<boolean>,
  registerService: (registerConfig: IRegisterConfig, registerOptions: IRegisterOptions) => Promise<TRegisterResult>,

  agentOptions: IConsulAgentOptions,
  getConsulAgentOptions: (config: IAFConsulConfig) => Promise<IConsulAgentOptions>,
}

export interface ICyclicStartArgs {
  cLOptions?: ICLOptions,
  registerInterval?: number,
  registerType?: TRegisterType,
  deleteOtherInstance?: boolean,
  noAlreadyRegisteredMessage?: boolean,
}

export interface IRegisterCyclic {
  isStarted: boolean,
  skipNextRegisterAttemptUntil: number,
  healthCheckIntervalMillis: number,
  registerIntervalMillis: number,
  options: ICLOptions,
  _timerId: ReturnType<typeof setTimeout>,
  _logger: ILogger,

  start: (cyclicStartArgs?: ICyclicStartArgs) => Promise<-1 | 0 | 1>
  stop: () => void
}

export interface IApi extends IConsulAPI {
  registerConfig: IRegisterConfig,
  getConsulUIAddress: TMethod<string>,
  serviceId: string,
  register: {
    once: (registerType?: TRegisterType) => Promise<TRegisterResult>,
    cyclic: IRegisterCyclic,
  }
  deregister: (svcId?: string, agentHost?: string, agentPort?: string) => Promise<boolean>
}

export interface ICache<T> {
  [hash: string]: {
    created: number,
    value: T
  }
}
