export const PREFIX = 'AF-CONSUL';
export const MAX_API_CACHED = 3;

export const DEBUG = (String(process.env.DEBUG || '')).trim();
export const CONSUL_DEBUG_ON = /\baf-consul:?\*?/i.test(DEBUG) || DEBUG === '*';
export const { FORCE_EVERY_REGISTER_ATTEMPT } = process.env;
