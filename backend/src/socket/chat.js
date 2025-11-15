// backend/src/socket/chat.js
const defaultThreads = new Map();
const defaultMessages = new Map();

const norm = (s = '') => String(s).trim();
const lower = (s = '') => norm(s).toLowerCase();
const genId = (p = 'th_') =>
  `${p}${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

function makeSaveSoon(onSave, ctx) {
  let t = null;
  return function saveSoon() {
    if (!onSave) return;
    if (t) return;
    t = setTimeout(() => {
      t = null;
      try { onSave(ctx); } catch {}
    }, 150);
  };
}

function buildThreadObject(tid) {
  const now = Date.now();
  return {
    id: tid,
    status: 'open',
    createdAt: now,
    lastMessageAt: now,
    lastMessageText: '',
    unreadAdmin: 0,
    unreadUser: 0,
    user: {},
    _announcedNew: false,
  };
}

function ensureThread(threads, messages, tid) {
  const id = String(tid);
  if (!threads.has(id)) {
    threads.set(id, buildThreadObject(id));
  }
  if (!messages.has(id)) messages.set(id, []);
  return threads.get(id);
}

function applyUserMeta(thread, userMeta = {}) {
  if (!thread) return;
  const rawUser = (userMeta && typeof userMeta === 'object' ? userMeta : {}) || {};
  const nested = (rawUser.user && typeof rawUser.user === 'object') ? rawUser.user : {};

  const name  = rawUser.name  ?? nested.name  ?? '';
  const email = rawUser.email ?? nested.email ?? '';
  const phone = rawUser.phone ?? nested.phone ?? '';

  const patch = {};
  if (name)  { patch.name = norm(name);  patch.nameNorm = lower(name); }
  if (email) { patch.email = lower(email); }
  if (phone) { patch.phone = norm(phone); }

  thread.user = { ...(thread.user || {}), ...nested, ...patch };
}

function emitThreadNew(nsp, tid) {
  try { nsp?.to('admins')?.emit('thread:new', { id: tid, threadId: tid }); } catch {}
}
function emitThreadUpdate(nsp, tid, patch = {}) {
  try { nsp?.to('admins')?.emit('thread:update', { id: tid, threadId: tid, ...patch }); } catch {}
}
function emitMessage(nsp, tid, msg) {
  try {
    nsp?.to(tid)?.emit('message', msg);
    nsp?.to('admins')?.emit('message', msg);
  } catch {}
}

/**
 * @param {import('socket.io').Server} io
 * @param {{
 *   threads?: Map<string, any>,
 *   messages?: Map<string, any[]>,
 *   persistMessages?: boolean,
 *   onSave?: (ctx:{threads:Map,messages:Map})=>void
 * }} [stores]
 */
export function attachChatSocket(io, stores = {}) {
  const threads = stores.threads || defaultThreads;
  const messages = stores.messages || defaultMessages;
  const persistMessages = stores.persistMessages !== false;
  const onSave = typeof stores.onSave === 'function' ? stores.onSave : null;
  const saveSoon = makeSaveSoon(onSave, { threads, messages });

  const nsp = io.of('/chat');
  if (nsp._pulseChatSetup) return nsp;
  nsp._pulseChatSetup = true;

  nsp.on('connection', (socket) => {
    try {
      const { role, threadId, name, email, phone } = socket.handshake.query || {};
      const isAdmin = String(role || '') === 'admin';
      const tid = threadId ? String(threadId) : '';

      if (isAdmin) socket.join('admins');
      if (tid) socket.join(tid);

      if (tid) {
        const th = ensureThread(threads, messages, tid);
        applyUserMeta(th, { name, email, phone });
        th.status = 'open';
        th.lastMessageAt = Date.now();

        if (!th._announcedNew) {
          emitThreadNew(nsp, tid);
          th._announcedNew = true;
        }
        emitThreadUpdate(nsp, tid);
        saveSoon();
      }

      socket.emit('joined', { ok: true, room: tid || null, as: isAdmin ? 'admin' : 'user' });
    } catch (e) {
      socket.emit('joined', { ok: false, error: e?.message || 'join failed' });
    }

    socket.on('join', (payload = {}) => {
      try {
        const isAdmin = payload.role === 'admin';
        const tid = payload.threadId ? String(payload.threadId) : '';
        if (isAdmin) socket.join('admins');
        if (tid) socket.join(tid);

        if (tid) {
          const th = ensureThread(threads, messages, tid);
          applyUserMeta(th, payload.userMeta);
          th.status = 'open';
          th.lastMessageAt = Date.now();
          if (!th._announcedNew) {
            emitThreadNew(nsp, tid);
            th._announcedNew = true;
          }
          emitThreadUpdate(nsp, tid);
          saveSoon();
        }

        socket.emit('joined', { ok: true, room: tid || null, as: isAdmin ? 'admin' : 'user' });
      } catch (e) {
        socket.emit('joined', { ok: false, error: e?.message || 'join failed' });
      }
    });

    socket.on('message', (payload = {}, ack) => {
      try {
        const tid = String(payload.threadId || '');
        const text = norm(payload.text || '');
        const sender = payload.sender === 'admin' ? 'admin' : 'user';
        if (!tid || !text) { ack && ack(false); return; }

        const th = ensureThread(threads, messages, tid);
        th.status = 'open';
        th.lastMessageAt = Date.now();
        th.lastMessageText = text;
        if (sender === 'user') th.unreadAdmin += 1;
        if (sender === 'admin') th.unreadUser += 1;

        const msg = { id: genId('m_'), threadId: tid, sender, text, ts: Date.now() };

        if (persistMessages) {
          const list = messages.get(tid) || [];
          list.push(msg);
          messages.set(tid, list);
        }

        emitMessage(nsp, tid, msg);
        emitThreadUpdate(nsp, tid, {
          lastMessageText: text,
          unreadAdmin: th.unreadAdmin,
          unreadUser: th.unreadUser,
        });

        saveSoon();
        ack && ack(true);
      } catch {
        ack && ack(false);
      }
    });

    socket.on('read', ({ threadId, side } = {}) => {
      try {
        const tid = String(threadId || '');
        if (!tid) return;
        const th = ensureThread(threads, messages, tid);
        if (side === 'admin') th.unreadAdmin = 0;
        else if (side === 'user') th.unreadUser = 0;
        else return;
        emitThreadUpdate(nsp, tid, {
          unreadAdmin: th.unreadAdmin,
          unreadUser: th.unreadUser,
        });
        saveSoon();
      } catch {}
    });

    socket.on('typing', ({ threadId, by } = {}) => {
      try {
        const tid = String(threadId || '');
        if (!tid) return;
        nsp.to(tid).emit('typing', { threadId: tid, by: by === 'admin' ? 'admin' : 'user' });
      } catch {}
    });
  });

  return nsp;
}

export default attachChatSocket;

export const chatStores = {
  threads: defaultThreads,
  messages: defaultMessages,
};
