import Consul from "consul";
import { IAccessPoints } from "./access-points";
import EventEmitter from "events";

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
  check?: IRegisterCheck | undefined;
  checks?: IRegisterCheck[] | undefined;
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
    healthCheck?: any,
    service: any,
  },
  webServer: any,
}

export interface ICLOptions {
  config: IConfig,
  logger?: ILogger,
  em?: EventEmitter,
  timeout?: number
  force?: boolean
}

export type TRegisterServiceResult = 'already' | 'just' | false;
export type TCommonFnResult = any;

export interface IConsulAPI {
  agentServiceList: (withError?: boolean) => Promise<{ [serviceName: string]: IConsulServiceInfo }>,
  consulHealthService: (options: Consul.Health.ServiceOptions, withError?: boolean) => Promise<TCommonFnResult>,
  getServiceInfo: (serviceName: string, withError?: boolean) => Promise<any>,
  getServiceSocket: (serviceName: string, defaults: ISocketInfo) => Promise<ISocketInfo>,
  agentServiceRegister: (options: IRegisterOptions, withError?: boolean) => Promise<boolean>,
  agentServiceDeregister: (serviceId: string, withError?: boolean) => Promise<TCommonFnResult>,
  deregisterIfNeed: (serviceId: string) => Promise<boolean>,
  agentMembers: (withError?: boolean) => Promise<TCommonFnResult>,
  checkIfServiceRegistered: (serviceIdOrName: string) => Promise<boolean>,
  registerService: (options: IServiceOptions) => Promise<TRegisterServiceResult>,

  [functionName: string]: (...args: any[]) => any,
}

export interface IAPInAgentOptions {
  consulApi: IConsulAPI;
  consulAgentOptions: IConsulAgentOptions;
}

interface IGetRegisterConfigOptions extends ICLOptions {
  uiHost: string,
  dn: string,
  check?: IRegisterCheck,
  registerType?: TRegisterType
}

interface IRegisterConfig {
  registerConfig: IRegisterOptions,
  consulUI: string,
  serviceId: string
}

export type IApi = IRegisterConfig & IAPInAgentOptions & {
  register: (registerType?: TRegisterType) => Promise<TRegisterServiceResult>,
  deregister: (svcId?: string) => Promise<boolean>,
}


interface IConsulServiceInfo {
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
