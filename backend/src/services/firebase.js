// src/services/firebase.js
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

let inited = false;
function init() {
  if (inited) return;
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (b64) {
    const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    initializeApp({ credential: cert(json) });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    initializeApp({ credential: applicationDefault() });
  } else {
   
    try {
      const json = JSON.parse(
        require('fs').readFileSync('./serviceAccountKey.json', 'utf8')
      );
      initializeApp({ credential: cert(json) });
    } catch {
      initializeApp({ credential: applicationDefault() });
    }
  }
  inited = true;
}

export function db() {
  init();
  return getFirestore();
}

export { FieldValue };



export const CHAT_COLLECTION =
  process.env.FIRESTORE_COLLECTION_CHATS || 'chats';

const threadRef = (tid) =>
  db().collection(CHAT_COLLECTION).doc(String(tid));

const genThreadId = () =>
  'th_' + Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8);


export async function ensureThread(threadId, userMeta = {}) {
  const tid = String(threadId);
  const ref = threadRef(tid);
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
  } else if (userMeta && Object.keys(userMeta).length) {
    
    await ref.set({ user: { ...(snap.data()?.user || {}), ...userMeta } }, { merge: true });
  }
  return ref;
}


export async function createThreadIfNeeded(userMeta = {}) {
  const tid = genThreadId();
  await ensureThread(tid, userMeta);
  return tid;
}


export async function saveMessageToStore(threadId, { sender, text, ts }) {
  const tid = String(threadId);
  const ref = await ensureThread(tid);

  await ref.collection('messages').add({
    sender: sender === 'admin' ? 'admin' : 'user',
    text: String(text || ''),
    ts: ts ? new Date(ts) : FieldValue.serverTimestamp(),
  });

  await ref.set(
    {
      lastMessageAt: FieldValue.serverTimestamp(),
      lastMessageText: String(text || ''),
      unreadAdmin:
        sender === 'user' ? FieldValue.increment(1) : FieldValue.increment(0),
      unreadUser:
        sender === 'admin' ? FieldValue.increment(1) : FieldValue.increment(0),
    },
    { merge: true }
  );
}


export async function getMessages(threadId, limit = 500) {
  const tid = String(threadId);
  const snap = await threadRef(tid)
    .collection('messages')
    .orderBy('ts', 'asc')
    .limit(limit)
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}


export async function markThreadRead(threadId, side = 'user') {
  const tid = String(threadId);
  const ref = threadRef(tid);
  const patch =
    side === 'admin'
      ? { unreadAdmin: 0 }
      : side === 'user'
      ? { unreadUser: 0 }
      : {};
  if (Object.keys(patch).length) await ref.set(patch, { merge: true });
}
