export const PREFIX = 'AF-CONSUL';
export const MAX_API_CACHED = 3;

export const CONSUL_AP_UPDATE_TIMEOUT_MILLIS = Number(process.env.CONSUL_AP_UPDATE_TIMEOUT_MILLIS) || 10_000;
export const DEBUG = (String(process.env.DEBUG || '')).trim();
export const CONSUL_DEBUG_ON = DEBUG.split(/[ ,]/).some((v) => /af-consul/i.test(v) || v === '*');
export const FORCE_EVERY_REGISTER_ATTEMPT = !!process.env.FORCE_EVERY_REGISTER_ATTEMPT;
