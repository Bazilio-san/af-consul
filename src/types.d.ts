import Consul from "consul";
import { IAccessPoints } from "./access-points";
import EventEmitter from "events";

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

export interface IConfig {
  accessPoints?: IAccessPoints,
  consul: {
    agent: {
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

export interface ICLOptions {
  config: IConfig,
  logger?: ILogger,
  em?: EventEmitter,

  accessPointsUpdateInterval?: number // VVR перенсти в ap.config
  projectId?: string,
  getConsulUIAddress?: TMethod<string>,
}

export type TCommonFnResult = any;

// type TProperty = any; VVR
// [functionName: string]: TProperty | TMethod<any>, VVR

type TMethod<T> = (...args: any[]) => T;

export interface IConsulAPI {
  agentServiceList: (withError?: boolean) => Promise<{ [serviceName: string]: IConsulServiceInfo }>,
  consulHealthService: (options: Consul.Health.ServiceOptions, withError?: boolean) => Promise<TCommonFnResult>,
  getServiceInfo: (serviceName: string, withError?: boolean) => Promise<Maybe<IConsulServiceInfo>>,
  getServiceSocket: (serviceName: string, defaults: ISocketInfo) => Promise<ISocketInfo>,
  agentServiceRegister: (options: IRegisterConfig, withError?: boolean) => Promise<boolean>,
  agentServiceDeregister: (serviceId: string, withError?: boolean) => Promise<TCommonFnResult>,
  deregisterIfNeed: (serviceId: string) => Promise<boolean>,
  agentMembers: (withError?: boolean) => Promise<TCommonFnResult>,
  checkIfServiceRegistered: (serviceIdOrName: string) => Promise<boolean>,
  registerService: (registerConfig: IRegisterConfig, registerOptions: IRegisterOptions) => Promise<TRegisterResult>,

  agentOptions: IConsulAgentOptions,
  getConsulAgentOptions: (config: IConfig) => Promise<IConsulAgentOptions>,
}

export interface IRegisterCyclic {
  isStarted: boolean,
  skipNextUntil: number,
  healthCheckIntervalMillis: number,
  registerIntervalMillis: number,
  options: ICLOptions,
  start: (opt?: ICLOptions, registerInterval?: number, registerType?: TRegisterType) => Promise<-1 | 0 | 1>
}

export interface IApi extends IConsulAPI {
  registerConfig: IRegisterConfig,
  getConsulUIAddress: TMethod<string>,
  serviceId: string,
  register: {
    once: (registerType?: TRegisterType) => Promise<TRegisterResult>,
    cyclic: IRegisterCyclic,
  }
  deregister: (svcId?: string) => Promise<boolean>
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

export interface ICache<T> {
  [hash: string]: {
    created: number,
    value: T
  }
}
