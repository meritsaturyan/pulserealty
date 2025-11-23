// src/lib/chatClient.js
import { io } from "socket.io-client";


const stripSlash = (u="") => String(u||"").replace(/\/$/, "");
const ensureOrigin = (u="") => {
  try {
    const url = new URL(String(u));
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return stripSlash(url.toString());
  } catch { return ""; }
};

(function initGlobals() {
  const w = typeof window !== "undefined" ? window : {};


  const gApi  = stripSlash(w.__PULSE_API_BASE || "");
  const gWs   = stripSlash(w.__PULSE_WS_BASE  || "");
  const gPath = w.__PULSE_SOCKET_PATH || "/socket.io";

  w.__PULSE_API_BASE = ensureOrigin(gApi); 
  w.__PULSE_WS_BASE  = ensureOrigin(gWs);  
  w.__PULSE_SOCKET_PATH = gPath;
})();


export const API_BASE = stripSlash(window.__PULSE_API_BASE);
export const WS_BASE  = stripSlash(window.__PULSE_WS_BASE);
export const WS_PATH  = window.__PULSE_SOCKET_PATH || "/socket.io";



const USER_TOKEN_KEYS = ["pulse:user:token","__PULSE_USER_TOKEN","user_token","token"];
function readUserToken() {
  try {
    if (typeof window !== "undefined" && window.__PULSE_USER_TOKEN)
      return String(window.__PULSE_USER_TOKEN);
    for (const k of USER_TOKEN_KEYS) {
      const v = localStorage.getItem(k);
      if (v) return String(v);
    }
    if (typeof document !== "undefined") {
      const cookies = `; ${document.cookie}`;
      for (const k of ["user_token","token"]) {
        const parts = cookies.split(`; ${k}=`);
        if (parts.length === 2) return parts.pop().split(";").shift();
      }
    }
  } catch {}
  return "";
}



function withAuthHeaders(extra = {}) {
  const t = readUserToken();
  return t ? { ...extra, Authorization: `Bearer ${t}` } : extra;
}


function withTimeout(promise, ms = 6000) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

function ensureApiPath(path) {
  const p = String(path || '');
  if (p.startsWith('/api/')) return p;
  if (p === '/api' || p === 'api') return '/api';
  return p.startsWith('/') ? `/api${p}` : `/api/${p}`;
}


async function fetchJsonSmart(path, init = {}) {
  const p = ensureApiPath(path);
  const hasAbs = !!API_BASE;

  if (hasAbs) {
    const abs = `${API_BASE}${p}`;
    try {
      const r1 = await withTimeout(fetch(abs, init));
      const t1 = await r1.text();
      if (!r1.ok) throw new Error(`${r1.status} ${p}: ${t1 || ''}`);
      return t1 ? JSON.parse(t1) : null;
    } catch {
      // fall through to relative fetch
    }
  }

  const rel = p; 
  const r2 = await withTimeout(fetch(rel, init));
  const t2 = await r2.text();
  if (!r2.ok) throw new Error(`${r2.status} ${p}: ${t2 || ''}`);
  return t2 ? JSON.parse(t2) : null;
}


async function apiGet(path) {
  const init = {
    cache: "no-store",
    credentials: "include",
    headers: withAuthHeaders({ "cache-control": "no-cache", pragma: "no-cache" }),
  };
  return fetchJsonSmart(path, init);
}

async function apiPost(path, body) {
  const init = {
    method: "POST",
    credentials: "include",
    headers: withAuthHeaders({ "content-type": "application/json" }),
    body: JSON.stringify(body || {}),
  };
  return fetchJsonSmart(path, init);
}


let cachedMe = null;
async function fetchCurrentUser() {
  if (cachedMe) return cachedMe;
  try {
    const r = await apiGet("/api/auth/me");
    const u = r?.user || r || null;
    if (u && (u.name || u.email)) cachedMe = { name: u.name, email: u.email };
  } catch {}
  return cachedMe;
}
function mergeUserMeta(pref = {}, fallback = {}) {
  const out = { ...(fallback || {}), ...(pref || {}) };
  if (out.name)  out.name  = String(out.name).trim();
  if (out.email) out.email = String(out.email).trim().toLowerCase();
  if (out.phone) out.phone = String(out.phone).trim();
  return out;
}



const LS_TID_KEYS = ["pulse:chat:threadId", "pulse:chat:tid", "chat:threadId"];
const LS_HIST_PREFIX = "pulse:chat:history:";
const MAX_CACHE = 300;

function currentTID() {
  try {
    for (const k of LS_TID_KEYS) {
      const v = localStorage.getItem(k);
      if (v) return v;
    }
  } catch {}
  return "";
}
function setThreadIdLS(tid) {
  try { for (const k of LS_TID_KEYS) localStorage.setItem(k, String(tid || "")); } catch {}
}
function removeThreadIdLS() {
  try { for (const k of LS_TID_KEYS) localStorage.removeItem(k); } catch {}
}
function clearHistoryLS(tid) {
  try { if (tid) localStorage.removeItem(LS_HIST_PREFIX + tid); } catch {}
}
function readHistoryLS(tid) {
  if (!tid) return [];
  try {
    const raw = localStorage.getItem(LS_HIST_PREFIX + tid) || "[]";
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function writeHistoryLS(tid, arr) {
  if (!tid) return;
  try {
    const trimmed = (arr || []).slice(-MAX_CACHE);
    localStorage.setItem(LS_HIST_PREFIX + tid, JSON.stringify(trimmed));
  } catch {}
}
function mergeHistory(base = [], add = []) {
  const sig = m => `${m.sender}|${m.text}|${m.ts}`;
  const map = new Map();
  [...base, ...add].forEach(m => { if (m && m.ts != null) map.set(sig(m), m); });
  return Array.from(map.values()).sort((a,b)=> (a.ts||0)-(b.ts||0));
}
function appendToHistoryLS(tid, msg) {
  if (!tid || !msg) return;
  const cur = readHistoryLS(tid);
  writeHistoryLS(tid, mergeHistory(cur, [msg]));
}



let socket;
const listeners = new Set();

let readyTid = "";
let resolveReady = null;
let readyTidPromise = new Promise(r => (resolveReady = r));

let currentRole = "user";

function destroySocket() {
  try { socket?.removeAllListeners?.(); } catch {}
  try { socket?.disconnect?.(); } catch {}
  socket = undefined;
}

function createSocket({ tid, role = "user", meta = {} } = {}) {
  if (!tid) return;
  const needRecreate =
    !socket ||
    socket?.io?.opts?.query?.role !== role ||
    socket?.io?.opts?.query?.threadId !== tid;

  if (!needRecreate) return socket;

  destroySocket();
  currentRole = role;

  const chatNs = WS_BASE ? `${WS_BASE}/chat` : "/chat";  
socket = io(chatNs, {

    path: WS_PATH,
    transports: ["websocket"],
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    query: { role, threadId: tid, name: meta?.name, email: meta?.email, phone: meta?.phone },
  });

  socket.on("connect_error", (e) => {
    console.warn("[chatClient] WS connect error:", e?.message || e);
  });

  socket.on("connect", () => {
    try { socket.emit("join", { role, threadId: tid, userMeta: meta }); } catch {}
  });

  socket._seen = Object.create(null);
  socket.on("message", (m) => {
    if (!m || !m.text) return;
    const t = readyTid || m.threadId || currentTID();
    if (!t) return;

    const sig = `${m.threadId || ""}|${m.sender || ""}|${m.text}|${m.ts || ""}`;
    const now = Date.now();
    const last = socket._seen[sig] || 0;
    if (now - last < 200) return;
    socket._seen[sig] = now;

    appendToHistoryLS(t, {
      id: m.id, threadId: t, sender: m.sender, text: m.text, ts: m.ts || Date.now()
    });

    listeners.forEach(fn => { try { fn({ ...m, threadId: t }); } catch {} });
  });

  return socket;
}

function ensureJoined(tid, meta = {}) {
  if (!tid) return;
  if (!socket) createSocket({ tid: readyTid || tid, role: currentRole, meta });
  try { socket.emit("join", { role: currentRole, threadId: tid, userMeta: meta }); } catch {}
}



async function fetchHistory(tid) {
  if (!tid) return [];
  const r = await apiGet(`/api/chat/${tid}/messages`);
  return Array.isArray(r?.items) ? r.items : (Array.isArray(r) ? r : []);
}
function emitHistoryToListeners(tid, arr) {
  (arr || []).forEach(m => {
    const msg = { ...m, threadId: m.threadId || tid, _history: true };
    listeners.forEach(fn => { try { fn(msg); } catch {} });
  });
}



function clearThreadLocal() {
  const old = readyTid || currentTID();
  if (old) clearHistoryLS(old);
  removeThreadIdLS();
  readyTid = "";
}

export async function getOrCreateThread(userMeta = {}) {
  const me = await fetchCurrentUser();
  const effectiveMeta = mergeUserMeta(userMeta, me);

  let tid = readyTid || currentTID();
  if (!tid) {
    const r = await apiPost("/api/chat/start", effectiveMeta || {});
    tid = r?.threadId || "";
    if (tid) setThreadIdLS(tid);
  }

  readyTid = tid;
  resolveReady?.(tid);

  createSocket({ tid, role: "user", meta: effectiveMeta });

  const cached = readHistoryLS(tid);
  if (cached.length) emitHistoryToListeners(tid, cached);

  try {
    const server = await fetchHistory(tid);
    if (server && server.length) {
      const merged = mergeHistory(cached, server);
      writeHistoryLS(tid, merged);
      emitHistoryToListeners(tid, merged);
    }
  } catch (e) {
    console.warn("[chatClient] fetchHistory failed:", e?.message || e);
  }

  return tid;
}

export async function connect(userMeta = {}) {
  await getOrCreateThread(userMeta);
}

export async function startNewThread(userMeta = {}) {
  const me = await fetchCurrentUser();
  const effectiveMeta = mergeUserMeta(userMeta, me);

  destroySocket();
  clearThreadLocal();

  return await getOrCreateThread(effectiveMeta);
}
export const resetForAccount = startNewThread;

export async function setUserMeta(userMeta = {}, opts = {}) {
  if (opts?.forceNew) return await startNewThread(userMeta);
  return await getOrCreateThread(userMeta);
}

export async function connectAsAdmin(threadId, meta = {}) {
  const me = await fetchCurrentUser();
  const effectiveMeta = mergeUserMeta(meta, me);

  let tid = String(threadId || readyTid || currentTID() || "");
  if (!tid) {
    const r = await apiPost("/api/chat/start", effectiveMeta || {});
    tid = r?.threadId || "";
    if (tid) setThreadIdLS(tid);
  }

  readyTid = tid;
  resolveReady?.(tid);

  createSocket({ tid, role: "admin", meta: effectiveMeta });
  ensureJoined(tid, effectiveMeta);
  return tid;
}

export function switchToThread(threadId) {
  const tid = String(threadId || "");
  if (!tid) return;
  readyTid = tid;
  setThreadIdLS(tid);
  ensureJoined(tid);
}

export function onMessage(handler) {
  listeners.add(handler);

  if (readyTid) {
    try {
      const cached = readHistoryLS(readyTid);
      cached.forEach(m => handler({ ...m, threadId: readyTid, _history: true }));
    } catch {}
  } else {
    readyTidPromise.then((tid) => {
      try {
        const cached = readHistoryLS(tid);
        cached.forEach(m => handler({ ...m, threadId: tid, _history: true }));
      } catch {}
    });
  }

  return () => listeners.delete(handler);
}

export async function sendMessage({ text }) {
  const clean = String(text || "").trim();
  if (!clean) return;

  if (!readyTid) await getOrCreateThread({});

  const tid = readyTid;
  const me = await fetchCurrentUser();
  createSocket({ tid, role: currentRole, meta: me || {} });

  let acked = false;

  const timer = setTimeout(async () => {
    if (acked) return;
    try {
      const sent = await apiPost("/api/chat/message", {
        threadId: tid,
        text: clean,
        sender: currentRole === "admin" ? "admin" : "user",
      });
      const msg = sent?.message || {
        id: `m_${Date.now()}`, threadId: tid,
        sender: currentRole === "admin" ? "admin" : "user",
        text: clean, ts: Date.now()
      };
      appendToHistoryLS(tid, msg);
      listeners.forEach(fn => { try { fn(msg); } catch {} });
    } catch (e) {
      console.warn("[chatClient] HTTP fallback failed:", e?.message || e);
    }
  }, 800);

  try {
    socket.emit("message", {
      threadId: tid,
      text: clean,
      sender: currentRole === "admin" ? "admin" : "user"
    }, (ok) => {
      acked = !!ok;
      if (acked) clearTimeout(timer);
    });
  } catch {}
}

export function markRead(threadId) {
  const tid = threadId || readyTid || currentTID();
  if (!tid) return;
  if (socket) {
    socket.emit("read", { threadId: tid, side: currentRole === "admin" ? "admin" : "user" });
  }
}



export function adminJoin(threadId) {
  const tid = String(threadId || "");
  if (!tid) return;
  if (currentRole !== "admin") {
    createSocket({ tid, role: "admin" });
  }
  ensureJoined(tid);
}

export async function sendAdminMessage(threadId, text) {
  const tid = String(threadId || readyTid || currentTID() || "");
  const clean = String(text || "").trim();
  if (!tid || !clean) return;

  const me = await fetchCurrentUser();
  createSocket({ tid, role: "admin", meta: me || {} });

  let acked = false;
  const timer = setTimeout(async () => {
    if (acked) return;
    try {
      const r = await apiPost("/api/chat/message", { threadId: tid, text: clean, sender: "admin" });
      const msg = r?.message || { id: `m_${Date.now()}`, threadId: tid, sender: "admin", text: clean, ts: Date.now() };
      appendToHistoryLS(tid, msg);
      listeners.forEach(fn => { try { fn(msg); } catch {} });
    } catch (e) {
      console.warn("[chatClient] admin HTTP fallback failed:", e?.message || e);
    }
  }, 800);

  try {
    socket.emit("message", { threadId: tid, text: clean, sender: "admin" }, (ok) => {
      acked = !!ok;
      if (acked) clearTimeout(timer);
    });
  } catch {}
}



const chat = {
  API_BASE, WS_BASE, WS_PATH,
  connect, getThreadId: () => readyTid || currentTID(), getOrCreateThread,
  onMessage, sendMessage, markRead,
  startNewThread, resetForAccount, setUserMeta,
  connectAsAdmin, switchToThread, adminJoin, sendAdminMessage,
};


export { apiGet, apiPost, withAuthHeaders };

export default chat;
