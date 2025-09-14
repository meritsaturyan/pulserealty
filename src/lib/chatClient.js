// src/lib/chatClient.js
import { io } from 'socket.io-client';

const WS_BASE = 'http://localhost:4000';
const nsp = '/chat';

const LS_UNREAD_USER = 'pulse:chat:unreadUserMap';

const unreadMapGet = () => {
  try { return JSON.parse(localStorage.getItem(LS_UNREAD_USER) || '{}'); } catch { return {}; }
};
const unreadMapSet = (map) => {
  localStorage.setItem(LS_UNREAD_USER, JSON.stringify(map));
  const total = Object.values(map).reduce((s, v) => s + Number(v || 0), 0);
  window.dispatchEvent(new CustomEvent('pulse:chat-unread-changed', { detail: { total, map } }));
};

const unreadInc = (threadId, n = 1) => {
  const m = unreadMapGet();
  m[threadId] = Number(m[threadId] || 0) + n;
  unreadMapSet(m);
};
const unreadClearThread = (threadId) => {
  const m = unreadMapGet();
  if (m[threadId]) { delete m[threadId]; unreadMapSet(m); }
};
const unreadTotal = () => Object.values(unreadMapGet()).reduce((s, v) => s + Number(v || 0), 0);

class ChatClient {
  constructor() {
    this.socket = io(`${WS_BASE}${nsp}`, { path: '/socket.io', transports: ['websocket', 'polling'] });
    this._threadId = null;
    this._subs = new Set();

    this.socket.on('connect', () => {
      // пользователь по умолчанию
      this.socket.emit('join', { role: 'user', threadId: this._threadId || undefined });
    });

    this.socket.on('message', (m) => {
      // пробрасываем наружу
      this._subs.forEach(fn => { try { fn(m); } catch {} });

      // если пришло от админа — увеличим непрочитанные, если чат не открыт/не помечен прочитанным
      if (m?.sender === 'admin' && m?.threadId) {
        unreadInc(m.threadId, 1);
      }
    });
  }

  async connect(meta = {}) {
    // no-op; сразу подключаемся в конструкторе
    return true;
  }

  async getOrCreateThread(meta = {}) {
    if (this._threadId) return this._threadId;

    // создаём через REST
    const res = await fetch('/api/chat/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(meta || {})
    }).then(r => r.json()).catch(() => null);
    const tid = res?.threadId || meta?.threadId;
    this._threadId = String(tid);

    // вступаем в комнату
    this.socket.emit('join', { role: 'user', threadId: this._threadId, userMeta: meta || {} });
    return this._threadId;
  }

  getThreadId() { return this._threadId; }

  onMessage(fn) {
    this._subs.add(fn);
    return () => this._subs.delete(fn);
  }

  async sendMessage({ text }) {
    if (!this._threadId || !text?.trim()) return;
    this.socket.emit('message', { threadId: this._threadId, text: String(text), sender: 'user' });
  }

  markRead(threadId = this._threadId) {
    if (!threadId) return;
    this.socket.emit('read', { threadId, side: 'user' });
    unreadClearThread(threadId);
  }

  // экспорт хелперов
  getUnreadTotal() { return unreadTotal(); }
  getUnreadMap() { return unreadMapGet(); }
}

const chat = new ChatClient();
export default chat;







