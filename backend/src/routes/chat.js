// backend/src/routes/chat.js
import { Router } from 'express';
import { db, FieldValue } from '../services/firebase.js';

const CHAT_COLLECTION = process.env.FIRESTORE_COLLECTION_CHATS || 'chats';

/**
 * Экспортируем ФУНКЦИЮ, чтобы передать сюда io.
 * В index.js нужно будет подключить так:
 *   import buildChatRoutes from './routes/chat.js';
 *   app.use('/api/chat', buildChatRoutes(io));
 */
export default function buildChatRoutes(io) {
  const r = Router();
  const nsp = io?.of?.('/chat');

  r.use((req, _res, next) => { req._ts = Date.now(); next(); });

  // Создать/вернуть threadId (используется фронтом при старте)
  r.post('/start', async (req, res) => {
    try {
      const meta = req.body || {};
      const tid = String(
        meta.threadId ||
        meta.id ||
        req.headers['x-thread-id'] ||
        `th_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
      );

      const thRef = db().collection(CHAT_COLLECTION).doc(tid);
      await thRef.set({
        createdAt: FieldValue.serverTimestamp(),
        lastMessageAt: FieldValue.serverTimestamp(),
        user: meta || {},
        lastMessageText: '',
        unreadAdmin: 0,
        unreadUser: 0,
        status: 'open',
      }, { merge: true });

      // Сообщим админам о новом треде
      try {
        nsp?.to('admins')?.emit('thread:new', { threadId: tid });
        nsp?.to('admins')?.emit('thread:update', { threadId: tid });
      } catch {}

      return res.json({ ok: true, threadId: tid });
    } catch (e) {
      console.error('[POST /api/chat/start]', e);
      return res.status(500).json({ ok: false, error: e.message || 'start failed' });
    }
  });

  // Fallback отправки сообщения по HTTP (если WS недоступен)
  r.post('/message', async (req, res) => {
    try {
      const { threadId, text, sender } = req.body || {};
      if (!threadId || !text) {
        return res.status(400).json({ ok: false, error: 'missing fields' });
      }

      const tid = String(threadId);
      const cleanText = String(text).trim();
      const s = sender === 'admin' ? 'admin' : 'user';

      const thRef = db().collection(CHAT_COLLECTION).doc(tid);

      // Пишем в Firestore
      await thRef.collection('messages').add({
        sender: s,
        text: cleanText,
        ts: FieldValue.serverTimestamp(),
      });
      await thRef.set({
        lastMessageAt: FieldValue.serverTimestamp(),
        lastMessageText: cleanText,
        unreadAdmin: s === 'user' ? FieldValue.increment(1) : FieldValue.increment(0),
        unreadUser:  s === 'admin' ? FieldValue.increment(1) : FieldValue.increment(0),
      }, { merge: true });

      // Шлём в сокет, чтобы клиент/админ увидели сразу
      try {
        const outgoing = { threadId: tid, sender: s, text: cleanText, ts: Date.now() };
        nsp?.to(`thread:${tid}`)?.emit('message', outgoing);
        nsp?.to('admins')?.emit('thread:update', { threadId: tid });
        nsp?.to('admins')?.emit('thread:new', { threadId: tid });
      } catch (e) {
        console.warn('[POST /api/chat/message] socket emit failed:', e?.message || e);
      }

      return res.json({ ok: true });
    } catch (e) {
      console.error('[POST /api/chat/message]', e);
      return res.status(500).json({ ok: false, error: e.message || 'send failed' });
    }
  });

  // Список тредов для админки
  r.get('/threads', async (_req, res) => {
    try {
      const snap = await db().collection(CHAT_COLLECTION)
        .orderBy('lastMessageAt', 'desc')
        .limit(200)
        .get();

      const items = snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
      res.set('cache-control', 'no-store');
      return res.json({ ok: true, items });
    } catch (e) {
      console.error('[GET /api/chat/threads]', e);
      return res.status(500).json({ ok: false, error: e.message || 'list failed' });
    }
  });

  // История сообщений конкретного треда
  r.get('/:id/messages', async (req, res) => {
    try {
      const tid = String(req.params.id);
      const snap = await db().collection(CHAT_COLLECTION).doc(tid)
        .collection('messages')
        .orderBy('ts', 'asc')
        .limit(1000)
        .get();

      const items = snap.docs.map(d => {
        const data = d.data() || {};
        let tsNum = Date.now();
        const ts = data.ts;
        if (ts && typeof ts.toMillis === 'function') tsNum = ts.toMillis();
        else if (ts && ts.seconds != null) tsNum = ts.seconds * 1000;
        return { id: d.id, threadId: tid, sender: data.sender, text: data.text, ts: tsNum };
      });

      res.set('cache-control', 'no-store');
      return res.json({ ok: true, items });
    } catch (e) {
      console.error('[GET /api/chat/:id/messages]', e);
      return res.status(500).json({ ok: false, error: e.message || 'history failed' });
    }
  });

  return r;
}



