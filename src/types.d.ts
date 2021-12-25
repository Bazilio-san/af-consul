import Consul from "consul";

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

export abstract class AbstractConsulLogger {
  /* eslint-disable no-unused-vars */
  abstract silly(...args: unknown[]): any;

  abstract info(...args: unknown[]): any;

  abstract warn(...args: unknown[]): any;

  abstract error(...args: unknown[]): any;

  /* eslint-enable no-unused-vars */
}
