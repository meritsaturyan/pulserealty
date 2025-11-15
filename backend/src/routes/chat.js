// backend/src/routes/chat.js
import { Router } from 'express';
import fs from 'fs';
import path from 'path';



const STORE_PATH =
  process.env.CHAT_STORE ||
  path.resolve(process.cwd(), 'data', 'chat-store.json');

function ensureDirFor(p) {
  try { fs.mkdirSync(path.dirname(p), { recursive: true }); } catch {}
}

function loadStore() {
  try {
    const txt = fs.readFileSync(STORE_PATH, 'utf8');
    const j = JSON.parse(txt);
    const th = new Map(Object.entries(j.threads || {}));
    const msg = new Map(
      Object.entries(j.messages || {}).map(([k, arr]) => [k, Array.isArray(arr) ? arr : []]),
    );
    return { threads: th, messages: msg };
  } catch {
    return { threads: new Map(), messages: new Map() };
  }
}

let { threads, messages } = loadStore();


let _saveTimer = null;
function writeStoreToDisk() {
  ensureDirFor(STORE_PATH);
  const out = {
    threads: Object.fromEntries(threads),
    messages: Object.fromEntries(messages),
  };
  fs.writeFileSync(STORE_PATH, JSON.stringify(out, null, 2), 'utf8');
}
function saveStoreSoon() {
  if (_saveTimer) return;
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    try { writeStoreToDisk(); } catch {}
  }, 150);
}
function flushStoreNow() {
  if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
  try { writeStoreToDisk(); } catch {}
}
['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(sig => {
  try { process.on(sig, () => { try { flushStoreNow(); } finally { process.exit(0); } }); } catch {}
});


const norm = (s = '') => String(s).trim();
const normLower = (s = '') => norm(s).toLowerCase();
const genId = (p = 'th_') =>
  `${p}${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

function ensureThread(threadId) {
  const tid = String(threadId);
  if (!threads.has(tid)) {
    const now = Date.now();
    threads.set(tid, {
      id: tid,
      createdAt: now,
      lastMessageAt: now,
      lastMessageText: '',
      unreadAdmin: 0,
      unreadUser: 0,
      status: 'open',
      user: {},        
      _announcedNew: false,
    });
    saveStoreSoon();
  }
  if (!messages.has(tid)) {
    messages.set(tid, []);
    saveStoreSoon();
  }
  return threads.get(tid);
}

function findThreadByUser(user = {}) {
  const nm = user.nameNorm;
  const em = user.email;
  const ph = user.phone;
  for (const t of threads.values()) {
    if (nm && t.user?.nameNorm === nm) return t.id;
    if (em && normLower(t.user?.email) === normLower(em)) return t.id;
    if (ph && norm(t.user?.phone) === norm(ph)) return t.id;
  }
  return null;
}


function parseUser(meta = {}) {
  const rawUser =
    (meta.user && typeof meta.user === 'object' ? meta.user : {}) || {};
  const name  = meta.name  ?? rawUser.name  ?? '';
  const email = meta.email ?? rawUser.email ?? '';
  const phone = meta.phone ?? rawUser.phone ?? '';
  const user = { ...rawUser };
  if (name)  { user.name = norm(name);  user.nameNorm = normLower(name); }
  if (email) user.email = normLower(email);
  if (phone) user.phone = norm(phone);
  return user;
}

function applyUserMetaToThread(thread, meta = {}) {
  if (!thread) return;
  const patch = parseUser(meta);
  if (Object.keys(patch).length) {
    thread.user = { ...(thread.user || {}), ...patch };
    saveStoreSoon();
  }
}


function setupNamespace(io) {
  const nsp = io?.of?.('/chat');
  if (!nsp || nsp._pulseChatSetup) return nsp; 
  nsp._pulseChatSetup = true;

  nsp.on('connection', (socket) => {
    try {
      const q = socket.handshake.query || {};
      const { role, threadId } = q;


      if (String(role || '') === 'admin') socket.join('admins');


      const tid = String(threadId || '').trim();
      if (tid) {
        socket.join(tid);


        const th = ensureThread(tid);
        applyUserMetaToThread(th, {
          name: q.name, email: q.email, phone: q.phone, user: q.user,
        });
        th.status = 'open';
        th.lastMessageAt = Date.now();
        saveStoreSoon();


        try { nsp.to('admins').emit('thread:update', { id: tid, threadId: tid, user: th.user }); } catch {}
      }

      socket.on('join', (payload = {}) => {
        const r = payload.role;
        const t = String(payload.threadId || '').trim();
        if (r === 'admin') socket.join('admins');
        if (t) {
          socket.join(t);
          const th = ensureThread(t);

          applyUserMetaToThread(th, payload.userMeta || payload);
          th.status = 'open';
          th.lastMessageAt = Date.now();
          saveStoreSoon();
          try { nsp.to('admins').emit('thread:update', { id: t, threadId: t, user: th.user }); } catch {}
        }
      });


      socket.on('message', (payload = {}, ack) => {
        try {
          const tid = String(payload.threadId || '').trim();
          const s = payload.sender === 'admin' ? 'admin' : 'user';
          const cleanText = norm(payload.text || '');

          if (!tid || !cleanText) { ack && ack(false); return; }

          const th = ensureThread(tid);
          th.status = 'open';
          th.lastMessageAt = Date.now();
          th.lastMessageText = cleanText;
          if (s === 'user') th.unreadAdmin += 1;
          if (s === 'admin') th.unreadUser += 1;

          const msg = {
            id: genId('m_'),
            threadId: tid,
            sender: s,
            text: cleanText,
            ts: Date.now(),
          };
          const arr = messages.get(tid) || [];
          arr.push(msg);
          if (arr.length > 2000) arr.splice(0, arr.length - 2000);
          messages.set(tid, arr);
          saveStoreSoon();

          try {
            nsp.to(tid).emit('message', msg);
            nsp.to('admins').emit('message', msg);
            nsp.to('admins').emit('thread:update', {
              id: tid,
              threadId: tid,
              lastMessageText: cleanText,
              unreadAdmin: th.unreadAdmin,
              unreadUser: th.unreadUser,
              user: th.user,
            });
          } catch {}

          ack && ack(true);
        } catch {
          ack && ack(false);
        }
      });


      socket.on('read', (payload = {}) => {
        const tid = String(payload.threadId || '').trim();
        const side = String(payload.side || 'user');
        if (!tid) return;
        const th = ensureThread(tid);
        if (side === 'user') th.unreadUser = 0;
        if (side === 'admin') th.unreadAdmin = 0;
        saveStoreSoon();
        try {
          nsp.to('admins').emit('thread:update', {
            id: tid, threadId: tid,
            unreadAdmin: th.unreadAdmin,
            unreadUser: th.unreadUser,
          });
        } catch {}
      });

      socket.on('disconnect', () => {});
    } catch {/* no-op */}
  });

  return nsp;
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


export default function buildChatRoutes(io) {
  const r = Router();
  const nsp = setupNamespace(io);




  r.post('/start', async (req, res) => {
    try {
      const meta = req.body || {};
      const user = parseUser(meta);

      let tid = norm(meta.threadId || meta.id || req.headers['x-thread-id'] || '');
      if (!tid) {
        const found = findThreadByUser(user);
        if (found) tid = found;
      }
      if (!tid) tid = genId('th_');

      const th = ensureThread(tid);
      applyUserMetaToThread(th, user);
      th.status = 'open';
      th.lastMessageAt = Date.now();
      saveStoreSoon();

      if (!th._announcedNew) {
        emitThreadNew(nsp, tid);
        th._announcedNew = true;
        saveStoreSoon();
      }
      emitThreadUpdate(nsp, tid, { user: th.user });

      return res.json({ ok: true, threadId: tid, thread: th });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message || 'start failed' });
    }
  });


  r.post('/message', async (req, res) => {
    try {
      const { threadId, text, sender } = req.body || {};
      if (!threadId || !text)
        return res.status(400).json({ ok: false, error: 'missing fields' });

      const tid = String(threadId);
      const cleanText = norm(text);
      const s = sender === 'admin' ? 'admin' : 'user';

      const th = ensureThread(tid);
      th.status = 'open';
      th.lastMessageAt = Date.now();
      th.lastMessageText = cleanText;
      if (s === 'user') th.unreadAdmin += 1;
      if (s === 'admin') th.unreadUser += 1;

      const msg = { id: genId('m_'), threadId: tid, sender: s, text: cleanText, ts: Date.now() };
      const arr = messages.get(tid) || [];
      arr.push(msg);
      if (arr.length > 2000) arr.splice(0, arr.length - 2000);
      messages.set(tid, arr);
      saveStoreSoon();

      emitMessage(nsp, tid, msg);
      emitThreadUpdate(nsp, tid, {
        lastMessageText: cleanText,
        unreadAdmin: th.unreadAdmin,
        unreadUser: th.unreadUser,
        user: th.user,
      });

      return res.json({ ok: true, message: msg });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message || 'send failed' });
    }
  });


  r.get('/threads', async (_req, res) => {
    try {
      const all = Array.from(threads.values())
        .sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0))
        .slice(0, 200);
      return res.json(all);
    } catch (e) {
      return res.status(500).json({ error: e.message || 'list failed' });
    }
  });


  r.get('/:id/messages', async (req, res) => {
    try {
      const tid = String(req.params.id);
      ensureThread(tid);
      const arr = (messages.get(tid) || [])
        .slice()
        .sort((a, b) => (a.ts || 0) - (b.ts || 0));
      return res.json(arr);
    } catch (e) {
      return res.status(500).json({ error: e.message || 'history failed' });
    }
  });



  r.post('/threads', async (req, res) => {
    try {
      const meta = req.body || {};
      const user = parseUser(meta);

      let tid = norm(meta.threadId || meta.id || req.headers['x-thread-id'] || '');
      if (!tid) {
        const found = findThreadByUser(user);
        if (found) tid = found;
      }
      if (!tid) tid = genId('th_');

      const th = ensureThread(tid);
      applyUserMetaToThread(th, user);
      th.status = 'open';
      th.lastMessageAt = Date.now();
      saveStoreSoon();

      if (!th._announcedNew) {
        emitThreadNew(nsp, tid);
        th._announcedNew = true;
        saveStoreSoon();
      }
      emitThreadUpdate(nsp, tid, { user: th.user });

      return res.json({ ...th });
    } catch (e) {
      return res.status(500).json({ error: e.message || 'thread create failed' });
    }
  });

  r.get('/threads/:id/messages', async (req, res) => {
    try {
      const tid = String(req.params.id);
      ensureThread(tid);
      const arr = (messages.get(tid) || [])
        .slice()
        .sort((a, b) => (a.ts || 0) - (b.ts || 0));
      return res.json(arr);
    } catch (e) {
      return res.status(500).json({ error: e.message || 'messages fetch failed' });
    }
  });

  r.post('/threads/:id/messages', async (req, res) => {
    try {
      const tid = String(req.params.id);
      const { role, text } = req.body || {};
      if (!text) return res.status(400).json({ error: 'text is required' });

      const s = role === 'admin' ? 'admin' : 'user';
      const cleanText = norm(text);

      const th = ensureThread(tid);
      th.status = 'open';
      th.lastMessageAt = Date.now();
      th.lastMessageText = cleanText;
      if (s === 'user') th.unreadAdmin += 1;
      if (s === 'admin') th.unreadUser += 1;

      const msg = {
        id: genId('m_'),
        threadId: tid,
        sender: s,
        text: cleanText,
        ts: Date.now(),
      };
      const arr = messages.get(tid) || [];
      arr.push(msg);
      if (arr.length > 2000) arr.splice(0, arr.length - 2000);
      messages.set(tid, arr);
      saveStoreSoon();

      emitMessage(nsp, tid, msg);
      emitThreadUpdate(nsp, tid, {
        lastMessageText: cleanText,
        unreadAdmin: th.unreadAdmin,
        unreadUser: th.unreadUser,
        user: th.user,
      });

      return res.json({ id: msg.id, role: s, text: cleanText, createdAt: msg.ts });
    } catch (e) {
      return res.status(500).json({ error: e.message || 'send failed' });
    }
  });

  return r;
}


export const chatStore = {
  get threads() { return threads; },
  get messages() { return messages; },
};
export { saveStoreSoon, flushStoreNow };
