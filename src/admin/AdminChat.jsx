// src/admin/AdminChat.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import styled from 'styled-components';
import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:4000';
const WS_BASE  = 'http://localhost:4000';

/* ====== Layout: скроллим только внутри колонок ====== */
const Wrap = styled.div`
  display: flex;
  gap: 16px;
  width: 100%;
  height: calc(100vh - 32px);
  box-sizing: border-box;
  overflow: hidden;
`;
const Left = styled.div`
  width: 320px;
  border-right: 1px solid #eee;
  height: 100%;
  overflow: auto;
`;
const Right = styled.div`
  flex: 1;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;
const ThreadItem = styled.button`
  width: 100%;
  text-align: left;
  padding: 10px;
  border: none;
  background: ${p => p.$active ? '#fff7e6' : '#fff'};
  border-bottom: 1px solid #f1f1f1;
  cursor: pointer;
`;
const Messages = styled.div`
  flex: 1;
  padding: 12px;
  overflow: auto;
  background: #fafafa;
`;
const Bubble = styled.div`
  max-width: 70%;
  margin: 6px 0;
  padding: 8px 12px;
  border-radius: 12px;
  align-self: ${p => p.$mine ? 'flex-end' : 'flex-start'};
  background: ${p => p.$mine ? '#e8f4ff' : '#fff'};
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
`;
const Form = styled.form`
  display: flex;
  gap: 8px;
  padding: 8px;
  background: #fff;
  border-top: 1px solid #eee;
`;
const Input = styled.input`
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
`;

/* ====== socket ====== */
const socket = io(`${WS_BASE}/chat`, { path: '/socket.io', transports: ['websocket', 'polling'] });

async function apiGetJSON(path) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { cache: 'no-store', headers: { 'cache-control': 'no-cache', pragma: 'no-cache' } });
  if (res.status === 204 || res.status === 304) return null;
  const text = await res.text(); if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}
const parseList = (r) => (Array.isArray(r) ? r : r?.items || r?.data || []);
const prettyName = (t) => t?.user?.name || t?.user?.email || t?.user?.phone || t?.title || t?.id || 'Գործընկեր';

/* ====== Persisted read-locks ====== */
const LOCKS_KEY = 'pulse:chat:readLocksAdmin';
const loadLocks = () => {
  try { return JSON.parse(localStorage.getItem(LOCKS_KEY) || '{}'); } catch { return {}; }
};
const saveLocks = (obj) => {
  try { localStorage.setItem(LOCKS_KEY, JSON.stringify(obj || {})); } catch {}
};

export default function AdminChat() {
  const [threads, setThreads] = useState([]);
  const [active, setActive] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const listRef = useRef(null);

  // локальные замки «прочитано», ПЕРСИСТЕНТНЫЕ
  const readLocks = useRef({});

  useEffect(() => {
    // поднимем замки из localStorage сразу при монтировании
    readLocks.current = loadLocks();
    socket.emit('join', { role: 'admin' });
  }, []);

  const publishUnreadTotal = useCallback((arr) => {
    const total = (Array.isArray(arr) ? arr : []).reduce((s, t) => s + Number(t?.unreadAdmin || 0), 0);
    localStorage.setItem('pulse:chat:unreadAdminTotal', String(total));
    window.dispatchEvent(new CustomEvent('pulse:admin-unread-changed', { detail: { total } }));
  }, []);

  const applyReadLocks = useCallback((list) => {
    const locked = readLocks.current || {};
    return (list || []).map(t => locked[t.id] ? { ...t, unreadAdmin: 0 } : t);
  }, []);

  const loadThreads = useCallback(async () => {
    try {
      const r = await apiGetJSON('/api/chat/threads');
      if (r == null) return;
      const list = applyReadLocks(parseList(r));  // ← гасим server unread, если у нас локально «прочитано»
      setThreads(list);
      publishUnreadTotal(list);
    } catch (e) { console.warn('threads load failed', e); }
  }, [applyReadLocks, publishUnreadTotal]);

  const loadMessages = useCallback(async (id) => {
    if (!id) { setMsgs([]); return; }
    try {
      const r = await apiGetJSON(`/api/chat/${id}/messages`);
      setMsgs(r == null ? [] : parseList(r));
    } catch (e) { console.warn('messages load failed', e); }
  }, []);

  useEffect(() => { loadThreads(); }, [loadThreads]);
  useEffect(() => {
    const t = setInterval(loadThreads, 4000);
    return () => clearInterval(t);
  }, [loadThreads]);

  useEffect(() => {
    const onMessage = (m) => {
      if (!m?.threadId) return;
      const tid = m.threadId;

      // если это клиент — снимаем локальный замок и сохраняем в localStorage
      if (m.sender === 'user') {
        readLocks.current[tid] = false;
        saveLocks(readLocks.current);
      }

      // если новый thread — добавим
      setThreads(prev => {
        const exists = prev.some(t => t.id === tid);
        let next = exists ? prev : [{ id: tid, lastMessageText: m.text, user: {}, unreadAdmin: (m.sender === 'user' ? 1 : 0) }, ...prev];

        // обновим preview + счётчики
        next = next.map(t => {
          if (t.id !== tid) return t;
          const upd = { ...t, lastMessageText: m.text };
          if (m.sender === 'user') {
            // если замка нет (или снят), увеличиваем
            if (!readLocks.current[tid]) {
              upd.unreadAdmin = Number(upd.unreadAdmin || 0) + 1;
            }
          }
          return upd;
        });

        next = applyReadLocks(next);   // ← если тред «прочитан» локально — принудительно 0
        publishUnreadTotal(next);
        return next;
      });

      if (tid === active) {
        setMsgs(prev => [...prev, m]);
        queueMicrotask(() => listRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }));
      }
    };

    const refresh = () => loadThreads();

    socket.on('message', onMessage);
    socket.on('thread:update', refresh);
    socket.on('thread:new', refresh);

    return () => {
      socket.off('message', onMessage);
      socket.off('thread:update', refresh);
      socket.off('thread:new', refresh);
    };
  }, [active, applyReadLocks, loadThreads, publishUnreadTotal]);

  // автоселект первого треда
  useEffect(() => {
    if (!active && threads.length > 0) selectThread(threads[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads, active]);

  const selectThread = async (id) => {
    if (!id) return;
    setActive(id);

    // ставим «прочитано» локально и сохраняем
    readLocks.current[id] = true;
    saveLocks(readLocks.current);

    socket.emit('join', { threadId: id, role: 'admin' });
    await loadMessages(id);
    socket.emit('read', { threadId: id, side: 'admin' });

    setThreads(prev => {
      const next = prev.map(t => t.id === id ? { ...t, unreadAdmin: 0 } : t);
      publishUnreadTotal(next);
      return next;
    });

    queueMicrotask(() => listRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }));
  };

  const send = (e) => {
    e.preventDefault();
    if (!text.trim() || !active) return;
    const payload = { threadId: active, text: text.trim(), sender: 'admin' };
    socket.emit('message', payload); // ждём эхо от сервера
    setText('');
    queueMicrotask(() => listRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }));
  };

  const activeInfo = useMemo(() => threads.find(t => t.id === active), [threads, active]);

  return (
    <Wrap>
      <Left>
        {threads.length === 0 && (
          <div style={{ padding: 12, color: '#888' }}>
            Пока нет диалогов. Откройте страницу объекта и отправьте сообщение из мини-чата.
          </div>
        )}
        {threads.map(t => (
          <ThreadItem key={t.id} onClick={() => selectThread(t.id)} $active={t.id===active}>
            <div style={{fontWeight:700}}>{prettyName(t)}</div>
            <div style={{fontSize:12, color:'#666'}}>{t.lastMessageText}</div>
            {Number((t.unreadAdmin||0)) > 0
              ? <div style={{fontSize:12, color:'#d00'}}>Непрочитано: {Number(t.unreadAdmin||0)}</div>
              : <div style={{fontSize:12, color:'#16a34a'}}>Прочитано</div>}
          </ThreadItem>
        ))}
      </Left>

      <Right>
        <div style={{padding:'8px 12px', borderBottom:'1px solid #eee', background:'#fff'}}>
          {activeInfo ? prettyName(activeInfo) : 'Выберите диалог'}
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
            placeholder={active ? 'Ваш ответ…' : 'Сначала выберите диалог'}
            disabled={!active}
            onKeyDown={(e)=>{ if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(e);} }}
          />
          <button type="submit" disabled={!active || !text.trim()}>Отправить</button>
        </Form>
      </Right>
    </Wrap>
  );
}
















