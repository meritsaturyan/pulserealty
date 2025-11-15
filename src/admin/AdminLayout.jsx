// src/admin/AdminLayout.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { io } from 'socket.io-client';


function normalizeHostname(host = '') {
  const map = {
    'а':'a','с':'c','е':'e','о':'o','р':'p','х':'x','к':'k','у':'y','м':'m','т':'t','ն':'h','в':'v',
    'А':'A','С':'C','Е':'E','О':'O','Р':'P','Х':'X','К':'K','У':'Y','Մ':'M','Տ':'T','Ն':'H','Վ':'V',
  };
  return String(host).replace(/./g, ch => map[ch] ?? ch);
}
function sanitizeBase(u = '') {
  try {
    const url = new URL(String(u));
    url.hostname = normalizeHostname(url.hostname);
    return url.toString().replace(/\/$/, '');
  } catch {
    return String(u || '').replace(/\/$/, '');
  }
}

const { API_BASE, WS_BASE, WS_PATH } = (() => {
  const w = typeof window !== 'undefined' ? window : {};
  const loc = w.location || { origin: 'http://localhost:3000' };

  const origin = new URL(loc.origin || 'http://localhost:3000');
  origin.hostname = normalizeHostname(origin.hostname);
  const isLocal = /^(localhost|127\.0\.0\.1)$/i.test(origin.hostname);

  const apiDev = isLocal ? `${origin.protocol}//localhost:5050` : origin.origin;
  const wsDev  = isLocal ? `ws://localhost:5050` : origin.origin;

  const api  = sanitizeBase(w.__PULSE_API_BASE || `${apiDev}`);
  const ws   = sanitizeBase(w.__PULSE_WS_BASE  || `${wsDev}`);
  const path = (w.__PULSE_SOCKET_PATH || w.__PULSE_WS_PATH || '/socket.io');

  return { API_BASE: api, WS_BASE: ws, WS_PATH: path };
})();

const pick = (obj, keys, def = '') => {
  for (const k of keys) if (obj?.[k] != null && obj[k] !== '') return obj[k];
  return def;
};
function normalizeCustomerForCache(cRaw) {
  const c = cRaw?.get ? cRaw.get({ plain: true }) : (cRaw || {});
  const full_name = String(pick(c, ['full_name','fullName','name'], '')).trim();
  const email     = String(pick(c, ['email','emailAddress'], '')).trim();
  const phone     = String(pick(c, ['phone','phone_number','phoneNumber','tel'], '')).trim();
  const note      = String(pick(c, ['note','comment','remarks'], ''));
  const threadId  = pick(c, ['threadId','thread_id','tid'], null) || null;
  const source    = pick(c, ['source','src'], null) || null;
  const page      = pick(c, ['page','referrer','from'], null) || null;
  const propertyTitle = pick(c, ['propertyTitle','property_title','propertyName'], null) || null;
  const propertyId    = pick(c, ['propertyId','property_id','pid'], null);
  const createdAt = pick(c, ['created_at','createdAt','created','timestamp','ts'], null) || Date.now();
  return {
    id: c.id ?? c.ID ?? c._id ?? Math.random().toString(36).slice(2),
    full_name, email, phone, note,
    threadId, source, page, propertyTitle, propertyId,
    createdAt,
  };
}


const Wrap = styled.div`display:flex; min-height:100vh; background:#fff;`;
const Side = styled.aside`
  width:240px; background:#1f2937; color:#fff; padding:16px;
  display:flex; flex-direction:column; gap:12px; position:sticky; top:0; height:100vh;
`;
const Title = styled.div`font-weight:800; margin:4px 0 8px; opacity:.95;`;
const NavBtn = styled(Link)`
  display:flex; align-items:center; justify-content:space-between;
  width:100%; padding:10px 12px; color:${p=>p.$active?'#0f172a':'#e5e7eb'};
  background:${p=>p.$active?'#facc15':'transparent'}; border-radius:8px; text-decoration:none; font-weight:700;
  &:hover{ background:${p=>p.$active?'#facc15':'rgba(255,255,255,.08)'}; color:#fff; }
`;
const Badge = styled.span`
  min-width:20px; height:20px; padding:0 6px; border-radius:999px; background:#ef4444; color:#fff;
  font-size:12px; font-weight:800; display:inline-flex; align-items:center; justify-content:center;
`;
const Divider = styled.hr`border:none; height:1px; background:rgba(255,255,255,.12); margin:8px 0;`;
const LogoutBtn = styled.button`
  display:block; width:100%; padding:12px; border:none; border-radius:10px; background:#ef4444; color:#fff;
  font-weight:800; cursor:pointer; margin-top:auto; &:hover{ filter:brightness(.95); }
`;
const Main = styled.main`flex:1; padding:16px;`;


const TOKEN_KEYS = ['__PULSE_TOKEN','pulse_admin_token','token','auth_token','jwt'];
function readToken() {
  try {
    if (typeof window !== 'undefined' && window.__PULSE_TOKEN) return String(window.__PULSE_TOKEN);
    for (const k of TOKEN_KEYS) {
      const v = localStorage.getItem(k);
      if (v) return String(v);
    }
    if (typeof document !== 'undefined') {
      const cookies = `; ${document.cookie}`;
      for (const k of ['token','auth_token']) {
        const parts = cookies.split(`; ${k}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
      }
    }
  } catch {}
  return '';
}

async function apiGetJSON(path) {
  try {
    const token = readToken();
    const r = await fetch(`${API_BASE}${path}`, {
      cache: 'no-store',
      credentials: 'include',
      headers: {
        'cache-control':'no-cache',
        pragma:'no-cache',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!r.ok) return null;
    const t = await r.text(); if (!t) return null;
    return JSON.parse(t);
  } catch { return null; }
}
const parseList = (r) => (Array.isArray(r) ? r : r?.items || r?.data || []);


const LS_SELL_SEEN_IDS = 'pulse:sell:seenIds';
const LS_SELL_NEW_COUNT = 'pulse:sell:newCount';

function getSeenIds() {
  try {
    const raw = localStorage.getItem(LS_SELL_SEEN_IDS);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch { return new Set(); }
}
function setSeenIds(setLike) {
  try {
    localStorage.setItem(LS_SELL_SEEN_IDS, JSON.stringify(Array.from(setLike || [])));
  } catch {}
}
function setSellNewCount(n) {
  try { localStorage.setItem(LS_SELL_NEW_COUNT, String(Number(n) || 0)); } catch {}
}


export default function AdminLayout() {
  const loc = useLocation();
  const navigate = useNavigate();
  const locPath = loc.pathname;

  const [totalUnread, setTotalUnread] = useState(0);
  const [sellNew, setSellNew] = useState(() => {
    try { return Number(localStorage.getItem(LS_SELL_NEW_COUNT) || 0); } catch { return 0; }
  });
  const [custNew, setCustNew] = useState(0);


  const seenCustomerIdsRef = useRef(new Set());

  useEffect(() => {
    const onUnread = (e) => setTotalUnread(Number(e?.detail?.total ?? 0));
    window.addEventListener('pulse:admin-unread-changed', onUnread);
    try {
      const v = Number(localStorage.getItem('pulse:chat:unreadAdminTotal') || 0);
      setTotalUnread(v);
    } catch {}
    return () => window.removeEventListener('pulse:admin-unread-changed', onUnread);
  }, []);

  useEffect(() => {
    const token = readToken();

    const socket = io(`${WS_BASE}/chat`, {
      path: WS_PATH,
      transports: ['websocket','polling'],
      withCredentials: true,
      autoConnect: true,
      auth: token ? { token } : undefined,
    });

    socket.on('connect_error', (e) =>
      console.warn('[AdminLayout] WS connect error:', e?.message || e)
    );

    socket.emit('join', { role: 'admin' });

    const getReadLocks = () => {
      try { return JSON.parse(localStorage.getItem('pulse:chat:readLocksAdmin') || '{}') || {}; }
      catch { return {}; }
    };

    const refreshThreads = async () => {
      const r = await apiGetJSON('/api/chat/threads');
      const items = parseList(r) || [];
      const onlyNamed = items.filter(t => String(t?.user?.name || '').trim().length > 0);
      const locks = getReadLocks();
      const applied = onlyNamed.map(t => {
        const unread = Number(t.unreadAdmin || 0);
        if (locks[t.id] && unread === 0) return { ...t, unreadAdmin: 0 };
        return { ...t, unreadAdmin: unread };
      });
      const total = applied.reduce((s, th) => s + Number(th.unreadAdmin || 0), 0);
      try {
        localStorage.setItem('pulse:chat:unreadAdminTotal', String(total));
        localStorage.setItem('pulse:chat:unreadAdminMap',
          JSON.stringify(Object.fromEntries(applied.map(x => [x.id, Number(x.unreadAdmin || 0)])))
        );
      } catch {}
      setTotalUnread(total);
    };

    socket.on('thread:new', refreshThreads);
    socket.on('thread:update', refreshThreads);
    socket.on('message', (m) => { if (m?.sender === 'user') refreshThreads(); });
    refreshThreads();


    const recomputeSellBadge = async (initIfEmpty = false) => {
      const r = await apiGetJSON('/api/leads/sell');
      const items = parseList(r) || [];

      const currentIds = new Set(items.map(it => it?.id).filter(Boolean));
      let seen = getSeenIds();


      if (initIfEmpty && seen.size === 0) {
        setSeenIds(currentIds);
        setSellNew(0);
        setSellNewCount(0);
        return;
      }


      let cnt = 0;
      currentIds.forEach(id => { if (!seen.has(id)) cnt += 1; });
      setSellNew(cnt);
      setSellNewCount(cnt);
    };


    recomputeSellBadge(true);


    const onSellNew = (payload) => {
      const newId = payload?.id ?? payload?.item?.id;
      if (window.location.pathname.startsWith('/admin/sell-leads')) {

        (async () => {
          const r = await apiGetJSON('/api/leads/sell');
          const items = parseList(r) || [];
          const seen = new Set(items.map(it => it?.id).filter(Boolean));
          setSeenIds(seen);
          setSellNew(0);
          setSellNewCount(0);
        })();
      } else {

        const seen = getSeenIds();
        if (newId && !seen.has(newId)) {
          setSellNew(n => {
            const next = (Number.isFinite(n) ? n : 0) + 1;
            setSellNewCount(next);
            return next;
          });
        } else {

          recomputeSellBadge(false);
        }
      }
    };
    socket.on('sell:new', onSellNew);


    const onCustomersNew = (payload) => {
      const raw = payload?.item ? payload.item : (payload || {});
      const id = raw?.id;

      if (id != null && seenCustomerIdsRef.current.has(id)) return;
      if (id != null) seenCustomerIdsRef.current.add(id);

      if (!window.location.pathname.startsWith('/admin/customers')) {
        setCustNew(n => (Number.isFinite(n) ? n : 0) + 1);
      } else {
        setCustNew(0);
      }


      try {
        const norm = normalizeCustomerForCache({ created_at: Date.now(), ...raw });
        const prev = JSON.parse(localStorage.getItem('pulse:admin:customers') || '[]');
        const next = [norm, ...prev];
        const seen = new Set();
        const deduped = next.filter(x => {
          const xid = x?.id;
          if (xid == null) return true;
          if (seen.has(xid)) return false;
          seen.add(xid);
          return true;
        });
        localStorage.setItem('pulse:admin:customers', JSON.stringify(deduped));
      } catch {}
    };
    socket.on('customers:new', onCustomersNew);

    return () => {
      socket.off('thread:new', refreshThreads);
      socket.off('thread:update', refreshThreads);
      socket.off('message', refreshThreads);
      socket.off('sell:new', onSellNew);
      socket.off('customers:new', onCustomersNew);
      socket.close();
    };
  }, []);


  useEffect(() => {
    if (locPath.startsWith('/admin/chat')) {
      setTotalUnread(0);
      try { localStorage.setItem('pulse:chat:unreadAdminTotal', '0'); } catch {}
    }

    if (locPath.startsWith('/admin/sell-leads')) {

      (async () => {
        try {
          const r = await fetch(`${API_BASE}/api/leads/sell`, { cache:'no-store', credentials:'include' });
          const t = await r.text();
          const data = t ? JSON.parse(t) : null;
          const items = Array.isArray(data) ? data : (data?.items || []);
          const seen = new Set(items.map(it => it?.id).filter(Boolean));
          setSeenIds(seen);
        } catch {

        }
        setSellNew(0);
        setSellNewCount(0);
      })();
    }

    if (locPath.startsWith('/admin/customers')) {
      setCustNew(0);

      seenCustomerIdsRef.current = new Set();
    }
  }, [locPath]);

  const logout = () => {
    const nav = navigate;
    try {
      localStorage.removeItem('pulse_admin_token');
      localStorage.removeItem('pulse_admin_user');
      localStorage.removeItem('pulse_token');
      localStorage.removeItem('pulse_user');
      window.dispatchEvent(new CustomEvent('pulse:admin-auth', { detail: null }));
    } finally {
      nav('/admin/login', { replace: true });
    }
  };

  const onMain  = locPath === '/admin' || locPath === '/admin/properties';
  const onProps = locPath.startsWith('/admin/properties/new') || /\/admin\/properties\/[^/]+$/.test(locPath);
  const onChat  = locPath.startsWith('/admin/chat');
  const onCust  = locPath.startsWith('/admin/customers');
  const onSell  = locPath.startsWith('/admin/sell-leads');

  return (
    <Wrap>
      <Side>
        <Title>Pulse Admin</Title>

        <NavBtn to="/admin/properties" $active={onMain}><span>Գլխավոր</span></NavBtn>

        <NavBtn to="/admin/properties/new" $active={onProps}><span>Գույքեր</span></NavBtn>

        <NavBtn to="/admin/chat" $active={onChat}>
          <span>Չատ</span>
          {totalUnread > 0 && <Badge>{totalUnread}</Badge>}
        </NavBtn>

        <NavBtn to="/admin/customers" $active={onCust}>
          <span>Հաճախորդների տվյալներ</span>
          {custNew > 0 && <Badge>{custNew}</Badge>}
        </NavBtn>

        <NavBtn to="/admin/sell-leads" $active={onSell}>
          <span>Վաճառքի անշարժ գույք</span>
          {sellNew > 0 && <Badge>{sellNew}</Badge>}
        </NavBtn>

        <Divider />
        <LogoutBtn onClick={logout}>Դուրս գալ</LogoutBtn>
      </Side>

      <Main>
        <Outlet />
      </Main>
    </Wrap>
  );
}
