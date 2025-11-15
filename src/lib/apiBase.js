// src/lib/apiBase.js


const w = typeof window !== 'undefined' ? window : {};
const loc = w.location || { protocol: 'http:', hostname: 'localhost', port: '', host: 'localhost:3000' };


const trimSlash = (s = '') => String(s).replace(/\/+$/, '');

const host = loc.host || (loc.port ? `${loc.hostname}:${loc.port}` : loc.hostname);


let apiFromGlobal = trimSlash(w.__PULSE_API_BASE || '');
let wsFromGlobal  = trimSlash(w.__PULSE_WS_BASE  || '');


const isLocalhost =
  /^(localhost|127\.0\.0\.1)$/i.test(loc.hostname || '') ||
  (loc.hostname || '').endsWith('.local');

const devApi = isLocalhost ? 'http://localhost:5050' : `${loc.protocol}//${host}`;

const pageIsHttps = String(loc.protocol).toLowerCase() === 'https:';
const devWs  = isLocalhost
  ? (pageIsHttps ? 'wss://localhost:5050' : 'ws://localhost:5050')
  : `${pageIsHttps ? 'wss' : 'ws'}://${host}`;

export const API_BASE = trimSlash(apiFromGlobal || devApi);
export const WS_BASE  = trimSlash(wsFromGlobal  || devWs);


export const SOCKET_PATH = w.__PULSE_SOCKET_PATH || '/socket.io';


export const apiUrl = (path = '') =>
  `${API_BASE}${String(path).startsWith('/') ? path : `/${path}`}`;
