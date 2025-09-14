// src/socket/chat.js
import { db, FieldValue } from '../services/firebase.js';

const CHAT_COLLECTION = process.env.FIRESTORE_COLLECTION_CHATS || 'chats';

/**
 * Схема Firestore
 * chats/{threadId}:
 *   { createdAt, lastMessageAt, user: {...}, lastMessageText, unreadAdmin, unreadUser, status }
 * chats/{threadId}/messages/{autoId}:
 *   { sender: 'user'|'admin', text, ts }
 */

const room = (id) => `thread:${String(id)}`;
const adminRoom = () => `admins`;

/** Создать карточку треда при отсутствии. Возвращает { ref, created }. */
async function ensureThread(threadId, userMeta = {}) {
  const tid = String(threadId);
  const ref = db().collection(CHAT_COLLECTION).doc(tid);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set(
      {
        createdAt: FieldValue.serverTimestamp(),
        lastMessageAt: FieldValue.serverTimestamp(),
        user: userMeta || {},
        lastMessageText: '',
        unreadAdmin: 0,
        unreadUser: 0,
        status: 'open',
      },
      { merge: true }
    );
    return { ref, created: true };
  }
  return { ref, created: false };
}

export function attachChatSocket(io) {
  const nsp = io.of('/chat');

  nsp.on('connection', (socket) => {
    // JOIN: { threadId?, role: 'user'|'admin', userMeta? }
    socket.on('join', async ({ threadId, role = 'user', userMeta = {} } = {}) => {
      try {
        socket.data.role = role;

        // админ сразу слушает общий канал обновлений списка
        if (role === 'admin') socket.join(adminRoom());

        if (!threadId) return; // у админа threadId может появиться позже при selectThread

        const tid = String(threadId);
        socket.data.threadId = tid;
        socket.join(room(tid));

        // гарантируем наличие карточки треда
        const { created } = await ensureThread(tid, userMeta);

        if (created) {
          // чтобы появился в списке у админа
          nsp.to(adminRoom()).emit('thread:new', { threadId: tid });
          nsp.to(adminRoom()).emit('thread:update', { threadId: tid });
        }
      } catch (e) {
        console.error('[chat.join] unexpected error:', e?.message || e);
      }
    });

    /**
     * Сообщение с ACK: socket.emit('message', payload, (ok) => { ... });
     * payload: { threadId?, text, sender? }
     * sender можно не передавать — берётся из socket.data.role
     */
    socket.on('message', async (payload = {}, ack) => {
      try {
        let { threadId, text, sender } = payload;
        threadId ||= socket.data.threadId;
        const cleanText = String(text || '').trim();

        if (!threadId || !cleanText) {
          if (ack) ack(false);
          return;
        }

        const tid = String(threadId);
        const resolvedSender =
          sender === 'admin' || socket.data.role === 'admin' ? 'admin' : 'user';

        // наличие карточки треда (на случай, если клиент не делал join раньше)
        const { ref: thRef, created } = await ensureThread(tid);

        // пишем сообщение
        await thRef.collection('messages').add({
          sender: resolvedSender,
          text: cleanText,
          ts: FieldValue.serverTimestamp(),
        });

        // обновляем карточку треда
        await thRef.set(
          {
            lastMessageAt: FieldValue.serverTimestamp(),
            lastMessageText: cleanText,
            unreadAdmin:
              resolvedSender === 'user' ? FieldValue.increment(1) : FieldValue.increment(0),
            unreadUser:
              resolvedSender === 'admin' ? FieldValue.increment(1) : FieldValue.increment(0),
          },
          { merge: true }
        );

        // realtime всем участникам комнаты
        const outgoing = {
          threadId: tid,
          sender: resolvedSender,
          text: cleanText,
          ts: Date.now(),
        };
        nsp.to(room(tid)).emit('message', outgoing);

        // обновить превью/бейджи у админа
        if (created) nsp.to(adminRoom()).emit('thread:new', { threadId: tid });
        nsp.to(adminRoom()).emit('thread:update', { threadId: tid });

        if (ack) ack(true);
      } catch (e) {
        console.error('[chat.message] unexpected error:', e?.message || e);
        if (ack) ack(false);
      }
    });

    // Пометить как прочитанные: { threadId, side: 'admin'|'user' }
    socket.on('read', async ({ threadId, side } = {}) => {
      try {
        if (!threadId) return;
        const tid = String(threadId);
        const thRef = db().collection(CHAT_COLLECTION).doc(tid);

        await thRef.set(
          {
            unreadAdmin: side === 'admin' ? 0 : undefined,
            unreadUser: side === 'user' ? 0 : undefined,
          },
          { merge: true }
        );

        nsp.to(adminRoom()).emit('thread:update', { threadId: tid });
      } catch (e) {
        console.error('[chat.read] unexpected error:', e?.message || e);
      }
    });

    socket.on('disconnect', () => {});
  });
}





