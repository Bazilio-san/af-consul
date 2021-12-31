import Consul from "consul";
import { IAccessPoints } from "./access-points";

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
}

export interface IServiceOptions {
  registerConfig: IRegisterOptions;
  forceReRegister?: boolean;
  noAlreadyRegisteredMessage?: boolean;
}

export interface IConsulAgentOptions extends Consul.ConsulOptions {
}

export interface ILogger {
  /* eslint-disable no-unused-vars */
  silly(...args: unknown[]): any;

  debug(...args: unknown[]): any;

  info(...args: unknown[]): any;

  warn(...args: unknown[]): any;

  error(...args: unknown[]): any;

  /* eslint-enable no-unused-vars */
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
  timeout?: number
}
