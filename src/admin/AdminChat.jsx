// src/admin/AdminChat.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import styled from 'styled-components';
import { io } from 'socket.io-client';
import { API_BASE } from '../lib/apiBase';


function normalizeHostname(host = '') {
  const map = { 'а':'a','с':'c','е':'e','о':'o','р':'p','х':'x','к':'k','у':'y','м':'m','т':'t','ն':'h','в':'v',
                'А':'A','С':'C','Е':'E','О':'O','Р':'P','Х':'X','К':'K','У':'Y','М':'M','Т':'T','Ն':'H','В':'V' };
  return String(host).replace(/./g, ch => map[ch] ?? ch);
}
function sanitizeBase(u = '') {
  try {
    const url = new URL(String(u));
    url.hostname = normalizeHostname(url.hostname);
    return url.toString().replace(/\/$/, '');
  } catch { return String(u || '').replace(/\/$/, ''); }
}
const { WS_BASE, WS_PATH } = (() => {
  const w = typeof window !== 'undefined' ? window : {};
  const loc = w.location || { origin: 'http://localhost:3000' };
  const origin = new URL(loc.origin || 'http://localhost:3000');
  origin.hostname = normalizeHostname(origin.hostname);
  const isLocal = /^(localhost|127\.0\.0\.1)$/i.test(origin.hostname);
  const wsDev  = isLocal ? `ws://localhost:5050` : origin.origin;
  const ws  = sanitizeBase(w.__PULSE_WS_BASE || `${wsDev}`);
  const path = (w.__PULSE_SOCKET_PATH || w.__PULSE_WS_PATH || '/socket.io');
  return { WS_BASE: ws, WS_PATH: path };
})();


const Wrap = styled.div`display:flex;gap:16px;width:100%;height:calc(100vh - 32px);box-sizing:border-box;overflow:hidden;`;
const Left = styled.div`width:320px;border-right:1px solid #eee;height:100%;overflow:auto;background:#fff;border-radius:12px;`;
const Right = styled.div`flex:1;height:100%;min-height:0;display:flex;flex-direction:column;overflow:hidden;background:#fff;border-radius:12px;`;
const ThreadItem = styled.button`
  width:100%;text-align:left;padding:10px;border:none;background:${p=>p.$active?'#fff7e6':'#fff'};
  border-bottom:1px solid #f1f1f1;cursor:pointer;
`;
const Messages = styled.div`flex:1;padding:12px;overflow:auto;background:#fafafa;display:flex;flex-direction:column;`;
const Bubble = styled.div`
  max-width:70%;margin:6px 0;padding:8px 12px;border-radius:12px;align-self:${p=>p.$mine?'flex-end':'flex-start'};
  background:${p=>p.$mine?'#e8f4ff':'#fff'};box-shadow:0 1px 3px rgba(0,0,0,.06);
`;
const Form = styled.form`display:flex;gap:8px;padding:8px;background:#fff;border-top:1px solid #eee;`;
const Input = styled.input`flex:1;padding:10px 12px;border:1px solid #ddd;border-radius:8px;`;


const TOKEN_KEYS = ['pulse:admin:token','__PULSE_TOKEN','pulse_admin_token','token','auth_token','jwt'];
function readToken() {
  try {
    if (typeof window !== 'undefined' && window.__PULSE_TOKEN) return String(window.__PULSE_TOKEN);
    for (const k of TOKEN_KEYS) { const v = localStorage.getItem(k); if (v) return String(v); }
    if (typeof document !== 'undefined') {
      const cookies = `; ${document.cookie}`;
      for (const k of ['token','auth_token']) {
        const parts = cookies.split(`; ${k}=`); if (parts.length === 2) return parts.pop().split(';').shift();
      }
    }
  } catch {}
  return '';
}


async function apiGetJSON(path) {
  const url = `${API_BASE}${path}`;
  const token = readToken();
  const res = await fetch(url, {
    cache: 'no-store', credentials: 'include',
    headers: { 'cache-control': 'no-cache', pragma: 'no-cache', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (res.status === 204 || res.status === 304) return null;
  const text = await res.text(); if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}
const parseList = (r) => (Array.isArray(r) ? r : r?.items || r?.data || []);


function normalizeThread(t = {}) {
  const id = String(t.id || t.threadId || '');
  const user = (t.user && typeof t.user === 'object') ? t.user : {};
  return { ...t, id, user };
}

const prettyName = (t = {}) =>
  (t.user?.name && String(t.user.name).trim()) ||
  (t.user?.email && String(t.user.email).trim()) ||
  (t.user?.phone && String(t.user.phone).trim()) ||
  (t.name && String(t.name).trim()) ||
  (t.title && String(t.title).trim()) ||
  String(t.id || t.threadId || 'Հաճախորդ');

const tsToMs = (v) =>
  (v && typeof v === 'object' && v._seconds != null) ? v._seconds * 1000 :
  (v && typeof v?.toMillis === 'function') ? v.toMillis() :
  (v && v.seconds != null) ? v.seconds * 1000 :
  (typeof v === 'number' ? v : 0);

function normKey(t) {
  const n = (t?.user?.name || '').trim().toLowerCase(); if (n) return `name:${n}`;
  const e = (t?.user?.email || '').trim().toLowerCase(); if (e) return `email:${e}`;
  const p = (t?.user?.phone || '').trim(); if (p) return `phone:${p}`;
  return `id:${t?.id || t?.threadId || ''}`;
}
function dedupeThreads(list) {
  const map = new Map();
  for (const raw of (list || [])) {
    const t = normalizeThread(raw);           
    const key = normKey(t);
    const cur = map.get(key);
    if (!cur) { map.set(key, t); continue; }
    const a = tsToMs(cur.lastMessageAt); const b = tsToMs(t.lastMessageAt);
    if (b > a) map.set(key, t);
  }
  return Array.from(map.values()).sort((a,b) => tsToMs(b.lastMessageAt) - tsToMs(a.lastMessageAt));
}


function getAdminSocket() {
  const w = typeof window !== 'undefined' ? window : {};
  if (w.__PULSE_ADMIN_SOCKET) return w.__PULSE_ADMIN_SOCKET;
  const token = readToken();
  const s = io(`${WS_BASE}/chat`, {
    path: WS_PATH, transports: ['websocket','polling'], withCredentials: true,
    autoConnect: true, reconnection: true, auth: token ? { token } : undefined,
  });
  s.on('connect_error', (e) => console.warn('[AdminChat] WS connect error:', e?.message || e));
  s.emit('join', { role: 'admin' });
  w.__PULSE_ADMIN_SOCKET = s;
  return s;
}


export default function AdminChat() {
  const [threads, setThreads] = useState([]);
  const [active, setActive] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const listRef = useRef(null);

  const readLocks = useRef({});
  const sigRef = useRef({});

  const safeDispatchUnread = useCallback((total) => {
    const fire = () => {
      try { window.dispatchEvent(new CustomEvent('pulse:admin-unread-changed', { detail: { total } })); } catch {}
    };
    if (typeof queueMicrotask === 'function') queueMicrotask(fire); else setTimeout(fire, 0);
  }, []);
  useEffect(() => {
    try { readLocks.current = JSON.parse(localStorage.getItem('pulse:chat:readLocksAdmin') || '{}'); } catch {}
    try { localStorage.setItem('pulse:chat:unreadAdminTotal', '0'); } catch {}
    safeDispatchUnread(0);
    getAdminSocket();
  }, [safeDispatchUnread]);

  const publishUnreadTotal = useCallback((arr) => {
    const total = (Array.isArray(arr) ? arr : []).reduce((s, t) => s + Number(t?.unreadAdmin || 0), 0);
    try { localStorage.setItem('pulse:chat:unreadAdminTotal', String(total)); } catch {}
    safeDispatchUnread(total);
  }, [safeDispatchUnread]);

  const applyReadLocks = useCallback((list) => {
    const locked = readLocks.current || {};
    return (list || []).map(t => locked[t.id] ? { ...t, unreadAdmin: 0 } : t);
  }, []);


  const loadThreads = useCallback(async () => {
    try {
      const r = await apiGetJSON('/api/chat/threads');
      if (r == null) return;
      const raw = parseList(r);


      const normalized = raw.map(normalizeThread);
      const withLocks = applyReadLocks(normalized);
      const deduped   = dedupeThreads(withLocks);

      setThreads(deduped);
      publishUnreadTotal(deduped);
    } catch (e) {
      console.warn('threads load failed', e);
    }
  }, [applyReadLocks, publishUnreadTotal]);

  const loadMessages = useCallback(async (id) => {
    if (!id) { setMsgs([]); return; }
    try {
      const r = await apiGetJSON(`/api/chat/${encodeURIComponent(id)}/messages`);
      const arr = r == null ? [] : parseList(r);
      setMsgs(arr);
      queueMicrotask(() => listRef.current?.scrollTo({ top: 1e9, behavior: 'auto' }));
    } catch (e) {
      console.warn('messages load failed', e);
    }
  }, []);

  useEffect(() => { loadThreads(); }, [loadThreads]);
  useEffect(() => {
    const t = setInterval(loadThreads, 4000);
    return () => clearInterval(t);
  }, [loadThreads]);

  useEffect(() => {
    const socket = getAdminSocket();

    const onMessage = (m) => {
      if (!m?.threadId) return;
      const tid = String(m.threadId);

      if (m.sender === 'user') {
        readLocks.current[tid] = false;
        try { localStorage.setItem('pulse:chat:readLocksAdmin', JSON.stringify(readLocks.current)); } catch {}
      }

      setThreads(prev => {
        let next = prev.map(t =>
          t.id === tid
            ? { ...t, lastMessageText: m.text, unreadAdmin: m.sender==='user' ? (Number(t.unreadAdmin||0)+1) : t.unreadAdmin }
            : t
        );
        next = dedupeThreads(next);
        next = applyReadLocks(next);
        publishUnreadTotal(next);
        return next;
      });

      if (tid === active) {
        const sig = `${m.sender}|${m.text}`;
        const now = Date.now();
        const last = sigRef.current[sig] || 0;
        if (now - last < 1500) return;
        sigRef.current[sig] = now;

        setMsgs(prev => {
          const cleaned = prev.filter(x => !(x?._temp && x.sender === m.sender && x.text === m.text));
          return [...cleaned, m];
        });
        queueMicrotask(() => listRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }));
      }
    };


    const onThreadUpdate = (patch = {}) => {
      if (!patch?.id) return loadThreads();
      setThreads(prev => prev.map(t =>
        t.id === String(patch.id)
          ? normalizeThread({ ...t, ...patch, user: { ...(t.user || {}), ...(patch.user || {}) } })
          : t
      ));
    };

    const onThreadNew = () => loadThreads();

    socket.on('message', onMessage);
    socket.on('thread:update', onThreadUpdate);
    socket.on('thread:new', onThreadNew);

    return () => {
      socket.off('message', onMessage);
      socket.off('thread:update', onThreadUpdate);
      socket.off('thread:new', onThreadNew);
    };
  }, [active, applyReadLocks, loadThreads, publishUnreadTotal]);


  useEffect(() => {
    if (!active && threads.length > 0) selectThread(threads[0].id);

  }, [threads, active]);


  const selectThread = async (id) => {
    if (!id) return;
    setActive(id);

    readLocks.current[id] = true;
    try { localStorage.setItem('pulse:chat:readLocksAdmin', JSON.stringify(readLocks.current)); } catch {}

    const socket = getAdminSocket();
    socket.emit('join', { threadId: id, role: 'admin' });
    await loadMessages(id);
    socket.emit('read', { threadId: id, side: 'admin' });

    setThreads(prev => {
      const next = prev.map(t => t.id === id ? { ...t, unreadAdmin: 0 } : t);
      publishUnreadTotal(next);
      return next;
    });

    queueMicrotask(() => listRef.current?.scrollTo({ top: 1e9, behavior: 'auto' }));
  };


  const send = (e) => {
    e.preventDefault();
    if (!text.trim() || !active) return;

    const payload = { threadId: active, text: text.trim(), sender: 'admin' };
    const mine = { ...payload, id: `c-${Date.now()}-${Math.random().toString(36).slice(2)}`, ts: Date.now(), _temp: true };
    setMsgs(prev => [...prev, mine]);
    setThreads(prev => prev.map(t => t.id === active ? { ...t, lastMessageText: payload.text } : t));
    setText('');
    queueMicrotask(() => listRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }));

    const socket = getAdminSocket();
    let acked = false;
    const timer = setTimeout(async () => {
      if (acked) return;
      try {
        const token = readToken();
        await fetch(`${API_BASE}/api/chat/message`, {
          method: 'POST', credentials: 'include',
          headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.warn('[AdminChat] HTTP fallback failed:', err?.message || err);
      }
    }, 1500);

    try {
      socket.emit('message', payload, (ok) => { acked = !!ok; if (acked) clearTimeout(timer); });
    } catch {}
  };

  const activeInfo = useMemo(() => threads.find(t => t.id === active), [threads, active]);

  return (
    <Wrap>
      <Left>
        {threads.length === 0 && (
          <div style={{ padding: 12, color: '#888' }}>
            Այստեղ կհայտնվեն չաթերը՝ անկախ նրանից, օգտատերը նշել է անունը, թե ոչ։
          </div>
        )}
        {threads.map(t => (
          <ThreadItem key={t.id} onClick={() => selectThread(t.id)} $active={t.id===active}>
            <div style={{fontWeight:700}}>{prettyName(t)}</div>
            <div style={{fontSize:12, color:'#666'}}>{t.lastMessageText || '—'}</div>
            {Number((t.unreadAdmin||0)) > 0
              ? <div style={{fontSize:12, color:'#d00'}}>Չկարդացված՝ {Number(t.unreadAdmin||0)}</div>
              : <div style={{fontSize:12, color:'#16a34a'}}>Կարդացված է</div>}
          </ThreadItem>
        ))}
      </Left>

      <Right>
        <div style={{padding:'8px 12px', borderBottom:'1px solid #eee', background:'#fff'}}>
          {activeInfo ? prettyName(activeInfo) : 'Ընտրեք զրույցը'}
        </div>

        <Messages ref={listRef}>
          {msgs.map(m => (
            <Bubble key={m.id || `${m.ts}-${Math.random()}`} $mine={m.sender==='admin'}>
              <div style={{whiteSpace:'pre-wrap'}}>{m.text}</div>
            </Bubble>
          ))}
        </Messages>

        <Form onSubmit={send}>
          <Input
            value={text}
            onChange={e=>setText(e.target.value)}
            placeholder={active ? 'Ձեր պատասխանը…' : 'Նախ ընտրեք զրույցը'}
            disabled={!active}
            onKeyDown={(e)=>{ if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(e);} }}
          />
          <button type="submit" disabled={!active || !text.trim()}>Ուղարկել</button>
        </Form>
      </Right>
    </Wrap>
  );
}
