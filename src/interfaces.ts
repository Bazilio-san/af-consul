import Consul from 'consul';
import EventEmitter from 'events';
import { AccessPoints } from './access-points/access-points';

export type Maybe<T> = T | undefined;
export type Nullable<T> = T | null;
export type TBooleanLike = 'true' | 'false' | 'yes' | 'no' | '1' | '0' | 1 | 0;

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
  dc?: string;
}

export interface IFullConsulAgentOptions {
  reg: IConsulAgentOptions,
  dev: IConsulAgentOptions,
  prd: IConsulAgentOptions
}

export type TLoggerMethod = (...args: unknown[]) => any;

export interface ILogger {
  silly: TLoggerMethod;
  debug: TLoggerMethod;
  info: TLoggerMethod;
  warn: TLoggerMethod;
  error: TLoggerMethod;
}

export interface IMeta {
  [prop: string]: Nullable<string | number | boolean>,
}

export interface IAccessPoint {
  consulServiceName: string,
  id?: string,
  title?: string,
  port?: number | null,
  host?: string | null,
  setProps?: (data: Record<string, any> | null) => IAccessPoint | undefined,
  isAP?: true,
  meta?: IMeta,
  isReachable?: boolean,
  lastSuccessUpdate?: number,
  idHostPortUpdated?: boolean,
  getChanges?: () => [string, any, any][] | undefined,
  updateIntervalIfSuccessMillis?: number,

  [propName: string]: any
}

export interface IAccessPoints {
  [apKey: string]: IAccessPoint;
}

export interface IConsulAgentConfig {
  isRegisterServiceOnStart?: boolean,
  host?: string, // || FQDN || env.HOST_HOSTNAME || config.consul.service?.host || '127.0.0.1'
  port?: string, // || 8500
  secure?: string | TBooleanLike | boolean,
  token?: string,
  dc?: string;
}

export interface IFullConsulAgentConfig {
  reg: IConsulAgentConfig,
  dev?: IConsulAgentConfig,
  prd?: IConsulAgentConfig
}

export interface IAFConsulConfig {
  agent: IFullConsulAgentConfig,
  check?: IRegisterCheck,
  service: {
    name: string,
    instance: string,
    version: string,
    description: string,
    tags?: string | string[],
    meta?: string | IMeta,
    host?: Nullable<string>,
    port?: Nullable<string | number>
  },
}

export interface IAFConfig {
  accessPoints?: IAccessPoints | AccessPoints,
  consul: IAFConsulConfig,
  webServer: any,
}

export type TCommonFnResult = any;

type TMethod<T> = (...args: any[]) => T;

export interface ICLOptions {
  config: IAFConfig,
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
  Meta?: IMeta,
  Port: number,
  Address: string,
  Weights?: { Passing: number, Warning: number },
  EnableTagOverride?: boolean,
  Datacenter?: string,

  // Service attributes
  Proxy?: object, // { MeshGateway: {}, Expose: {} }
  Connect?: object, // { MeshGateway: {}, Expose: {} }
  CreateIndex?: number,
  ModifyIndex?: number,

  [prop: string]: any,
}

export interface IConsulNodeInfo {
  ID: string,
  Node?: string,
  Address: string,
  Datacenter?: string,
  TaggedAddresses?: object, // { lan: <ip>, lan_ipv4: <ip>, wan: <ip>, wan_ipv4: <ip> }
  Meta?: IMeta,
  CreateIndex?: number,
  ModifyIndex?: number,
}

export interface IConsulHealthServiceInfo {
  Node?: IConsulNodeInfo,
  Service?: IConsulServiceInfo,
  Checks?: any[]
}

export interface IAPIArgs {
  consulInstance?: IConsul,
  agentOptions?: IConsulAgentOptions,
  options?: any;
  withError?: boolean;
  result?: any
}

export interface IConsulAPI {
  agentServiceList: (apiArgs?: IAPIArgs) => Promise<{ [serviceName: string]: IConsulServiceInfo }>,
  catalogServiceList(dc: string, apiArgs?: IAPIArgs): Promise<{ [serviceId: string]: string[] }>,
  consulHealthService: (apiArgs: IAPIArgs) => Promise<IConsulHealthServiceInfo[]>,
  getServiceInfo: (serviceName: string) => Promise<Maybe<IConsulServiceInfo>>,
  getServiceSocket: (serviceName: string, defaults: ISocketInfo) => Promise<ISocketInfo>,
  agentServiceRegister: (options: IRegisterConfig, withError?: boolean) => Promise<boolean>,
  agentServiceDeregister: (serviceId: string, apiArgs?: IAPIArgs) => Promise<boolean>,
  deregisterIfNeed: (serviceId: string, agentOptions?: IConsulAgentOptions) => Promise<boolean>,
  agentMembers: (apiArgs?: IAPIArgs) => Promise<TCommonFnResult>,
  checkIfServiceRegistered: (serviceIdOrName: string, apiArgs?: IAPIArgs) => Promise<Maybe<IConsulHealthServiceInfo>>,
  registerService: (registerConfig: IRegisterConfig, registerOptions: IRegisterOptions) => Promise<TRegisterResult>,

  agentOptions: IFullConsulAgentOptions,
  getConsulAgentOptions: (clOptions: ICLOptions) => Promise<IFullConsulAgentOptions>,
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

export interface IAFConsulAPI extends IConsulAPI {
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
