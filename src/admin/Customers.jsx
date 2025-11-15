// src/admin/Customers.jsx
import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { io } from 'socket.io-client';
import { API_BASE, WS_BASE as WS_BASE_LIB, SOCKET_PATH as SOCKET_PATH_LIB } from '../lib/apiBase';

const API_ENV = process.env.REACT_APP_API_URL || '/api';
const SAFE_API_BASE = (API_BASE || API_ENV).replace(/\/$/, '');


function normalizeHostname(host = '') {
  const map = {
    'а':'a','с':'c','е':'e','о':'o','р':'p','х':'x','к':'k','у':'y','м':'m','т':'t','ն':'h','в':'v',
    'А':'A','С':'C','Е':'E','О':'O','Р':'P','Х':'X','К':'K','У':'Y','М':'M','Տ':'T','Ն':'H','В':'V',
  };
  return String(host).replace(/./g, ch => map[ch] ?? ch);
}
function wsBaseFromEnvOrOrigin() {
  if (WS_BASE_LIB) return WS_BASE_LIB.replace(/\/$/, '');
  const env = process.env.REACT_APP_WS_URL;
  if (env) return env.replace(/\/$/, '');
  try {
    const loc = window.location;
    const isLocal = /^(localhost|127\.0\.0\.1)$/i.test(loc.hostname);
    const origin = new URL(loc.origin);
    origin.hostname = normalizeHostname(origin.hostname);
    origin.protocol = origin.protocol === 'https:' ? 'wss:' : 'ws:';
    if (isLocal) return `ws://localhost:5050`;
    return origin.origin;
  } catch {
    return '';
  }
}
const WS_BASE = wsBaseFromEnvOrOrigin();
const SOCKET_PATH = (SOCKET_PATH_LIB || '/socket.io').replace(/\/?$/, '');
const PAGE_PATH = '/admin/customers';


const Wrap = styled.div`padding: 12px;`;
const Title = styled.h2`margin: 8px 0 16px;`;
const TopBar = styled.div`display:flex; gap:12px; margin-bottom:12px;`;
const Input = styled.input`
  flex:1; max-width:520px; padding:10px 12px; border:1px solid #ddd; border-radius:8px;
`;
const Table = styled.table`
  width:100%; border-collapse: collapse; background:#fff; border:1px solid #eee; border-radius:10px; overflow:hidden;
  th, td { padding:10px 12px; border-bottom:1px solid #f1f1f1; font-size:14px; vertical-align:top; }
  th { text-align:left; background:#fafafa; position:sticky; top:0; z-index:1; }
  tr:hover { background:#fffdf4; }
  td a { color:#0a66c2; text-decoration:none; }
  td a:hover { text-decoration:underline; }
`;
const Muted = styled.div`color:#888;`;


async function apiGetJSON(path) {
  try {
    const url = `${SAFE_API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
    const r = await fetch(url, { cache: 'no-store', credentials: 'include' });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}


function fmt(ts) {
  if (!ts) return '';
  const n = Number(ts);
  if (Number.isFinite(n) && n > 0) {
    const d = new Date(n);
    if (!isNaN(d)) return d.toLocaleString();
  }
  try { return new Date(ts).toLocaleString(); } catch { return ''; }
}


const pick = (obj, keys, def = '') => {
  for (const k of keys) if (obj?.[k] != null && obj[k] !== '') return obj[k];
  return def;
};


function normalizeItem(cRaw) {
  const c = cRaw?.get ? cRaw.get({ plain: true }) : cRaw || {};

  const full_name = String(pick(c, ['full_name', 'fullName', 'name'], '')).trim();
  const email = String(pick(c, ['email', 'emailAddress'], '')).trim();
  const phone = String(pick(c, ['phone', 'phone_number', 'phoneNumber', 'tel'], '')).trim();
  const note = String(pick(c, ['note', 'comment', 'remarks'], ''));

  const threadId = pick(c, ['threadId', 'thread_id', 'tid'], null) || null;
  const source   = pick(c, ['source', 'src'], null) || null;
  const page     = pick(c, ['page', 'referrer', 'from'], null) || null;
  const propertyTitle = pick(c, ['propertyTitle', 'property_title', 'propertyName'], null) || null;
  const propertyId    = pick(c, ['propertyId', 'property_id', 'pid'], null);

  const createdAt =
    pick(c, ['created_at', 'createdAt', 'created', 'timestamp', 'ts'], null) || null;

  return {
    id: c.id ?? c.ID ?? c._id ?? Math.random().toString(36).slice(2),
    full_name,
    email,
    phone,
    note,
    threadId,
    source,
    page,
    propertyTitle,
    propertyId,
    createdAt,
  };
}


const LS_ITEMS  = 'pulse:admin:customers';
const LS_UNSEEN = 'pulse:admin:customers-unseen';

function readItemsCache() {
  try {
    const raw = localStorage.getItem(LS_ITEMS);
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function writeItemsCache(list) {
  try { localStorage.setItem(LS_ITEMS, JSON.stringify(list)); } catch {}
}
function getUnseen() {
  return Number(localStorage.getItem(LS_UNSEEN) || '0') || 0;
}
function setUnseen(v) {
  const n = Math.max(0, Number(v) || 0);
  localStorage.setItem(LS_UNSEEN, String(n));
  window.dispatchEvent(new CustomEvent('pulse:admin:customers-unseen', { detail: { total: n } }));
}
function incUnseen(delta = 1) { setUnseen(getUnseen() + Number(delta || 1)); }
function resetUnseen() { setUnseen(0); }


export default function Customers() {

  const [items, setItems] = useState(() => readItemsCache());
  const [q, setQ] = useState('');


  const setItemsAndCache = (list) => { setItems(list); writeItemsCache(list); };


  const load = async () => {
    const resp = await apiGetJSON('/customers');
    if (!resp) return; 
    const list = Array.isArray(resp?.items) ? resp.items : (Array.isArray(resp) ? resp : []);
    const normalized = list.map(normalizeItem);
    setItemsAndCache(normalized);
  };

  useEffect(() => {

    if (window.location.pathname === PAGE_PATH) resetUnseen();

    load();

    let socket;
    try {

      socket = window.__pulseCustomersSock || io(`${WS_BASE}/chat`, {
        path: SOCKET_PATH,
        transports: ['websocket', 'polling'],
        withCredentials: true,
        autoConnect: true,
        reconnection: true,
      });
      window.__pulseCustomersSock = socket;

      socket.on('connect_error', (e) => console.warn('[Customers] WS error:', e?.message || e));
      socket.emit('join', { role: 'admin' });


      const onNew = (payload) => {
        if (!payload) return;

        const raw = payload.item ? payload.item : payload;
        const normalized = normalizeItem({
          created_at: Date.now(), 
          ...raw,
        });


        setItems((prev) => {
          const next = [normalized, ...prev];
          const seen = new Set();
          const deduped = next.filter(x => {
            const id = x?.id;
            if (id == null) return true;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          });
          writeItemsCache(deduped); 
          return deduped;
        });

        const onCustomersPage = window.location.pathname === PAGE_PATH;
        if (document.hidden || !onCustomersPage) {
          incUnseen(1);
        }
      };


      socket.off('customers:new', onNew);
      socket.on('customers:new', onNew);
    } catch (e) {
      console.warn('[Customers] socket init failed:', e);
    }


    const onWake = () => {
      if (window.location.pathname === PAGE_PATH) {
        resetUnseen();
        load(); 
      }
    };
    window.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);


    const t = setInterval(load, 20000);

    return () => {
      clearInterval(t);
      window.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);

    };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return (items || []).filter(x =>
      (x.full_name||'').toLowerCase().includes(s) ||
      (x.email||'').toLowerCase().includes(s) ||
      (x.phone||'').toLowerCase().includes(s) ||
      (x.note||'').toLowerCase().includes(s) ||
      (String(x.propertyId||'')).toLowerCase().includes(s) ||
      (x.propertyTitle||'').toLowerCase().includes(s) ||
      (x.source||'').toLowerCase().includes(s) ||
      (x.page||'').toLowerCase().includes(s) ||
      (x.threadId||'').toLowerCase().includes(s)
    );
  }, [items, q]);

  return (
    <Wrap>
      <Title>Հաճախորդների տվյալներ</Title>

      <TopBar>
        <Input
          placeholder="Որոնել՝ Անուն, email, հեռախոս, գույք, էջ, նշում…"
          value={q}
          onChange={e=>setQ(e.target.value)}
        />
      </TopBar>

      {!filtered.length ? (
        <Muted>Դատարկ է։ Կլինեն գրառումներ, երբ հաճախորդները լրացնեն ձևը։</Muted>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Ամսաթիվ</th>
              <th>Անուն</th>
              <th>Հեռախոս</th>
              <th>Email</th>
              <th>Աղբյուր</th>
              <th>Գույք</th>
              <th>Էջ</th>
              <th>Thread</th>
              <th>Նշում</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(it => (
              <tr key={it.id}>
                <td>{fmt(it.createdAt)}</td>
                <td>{it.full_name}</td>
                <td>{it.phone}</td>
                <td>{it.email}</td>
                <td>{it.source || ''}</td>
                <td>
                  {it.propertyTitle || (it.propertyId ? `#${it.propertyId}` : '')}
                  {it.propertyId ? (
                    <>
                      {' '}
                      <a href={`/property/${it.propertyId}`} target="_blank" rel="noreferrer">բացել</a>
                    </>
                  ) : null}
                </td>
                <td>
                  {it.page ? <a href={it.page} target="_blank" rel="noreferrer">բացել</a> : ''}
                </td>
                <td style={{whiteSpace:'nowrap'}}>{it.threadId || ''}</td>
                <td style={{whiteSpace:'pre-wrap'}}>{it.note}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Wrap>
  );
}
