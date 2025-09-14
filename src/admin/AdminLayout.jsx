// src/admin/AdminLayout.jsx
import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:4000';
const WS_BASE  = 'http://localhost:4000';

const Wrap = styled.div`display:flex; min-height:100vh; background:#f6f7fb;`;
const Side = styled.aside`
  width:240px; background:#0f172a; color:#fff; padding:16px;
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

async function apiGetJSON(path) {
  try {
    const r = await fetch(`${API_BASE}${path}`, { cache:'no-store', headers:{'cache-control':'no-cache', pragma:'no-cache'} });
    if (!r.ok) return null;
    const t = await r.text(); if (!t) return null;
    return JSON.parse(t);
  } catch { return null; }
}
const parseList = (r) => (Array.isArray(r) ? r : r?.items || r?.data || []);

export default function AdminLayout() {
  const loc = useLocation();
  const navigate = useNavigate();

  const [totalUnread, setTotalUnread] = useState(() =>
    Number(localStorage.getItem('pulse:chat:unreadAdminTotal') || 0)
  );

  // слушаем сокет и считаем непрочитанные — ТОЛЬКО в лейауте
  useEffect(() => {
    const socket = io(`${WS_BASE}/chat`, { path:'/socket.io', transports:['websocket','polling'] });
    socket.emit('join', { role: 'admin' });

    const refresh = async () => {
      const r = await apiGetJSON('/api/chat/threads');
      const items = parseList(r);
      const total = items.reduce((s, th) => s + Number(th.unreadAdmin || 0), 0);
      try {
        localStorage.setItem('pulse:chat:unreadAdminTotal', String(total));
        localStorage.setItem('pulse:chat:unreadAdminMap', JSON.stringify(
          Object.fromEntries(items.map(x => [x.id, Number(x.unreadAdmin || 0)]))
        ));
      } catch {}
      setTotalUnread(total);
    };

    socket.on('thread:new', refresh);
    socket.on('thread:update', refresh);
    refresh();

    const t = setInterval(refresh, 15000);
    return () => {
      clearInterval(t);
      socket.off('thread:new', refresh);
      socket.off('thread:update', refresh);
      socket.close();
    };
  }, []);

  // Заходим на страницу чата → гасим бейдж (без изменений кода чата)
  useEffect(() => {
    if (loc.pathname.startsWith('/admin/chat')) {
      setTotalUnread(0);
      try { localStorage.setItem('pulse:chat:unreadAdminTotal', '0'); } catch {}
    }
  }, [loc.pathname]);

  const logout = () => {
    try {
      localStorage.removeItem('pulse_admin_token');
      localStorage.removeItem('pulse_admin_user');
      localStorage.removeItem('pulse_token');
      localStorage.removeItem('pulse_user');
      window.dispatchEvent(new CustomEvent('pulse:admin-auth', { detail: null }));
    } finally {
      navigate('/admin/login', { replace: true });
    }
  };

  const onMain  = loc.pathname === '/admin';
  const onProps = loc.pathname.startsWith('/admin/properties');
  const onChat  = loc.pathname.startsWith('/admin/chat');
  const onCust  = loc.pathname.startsWith('/admin/customers');

  return (
    <Wrap>
      <Side>
        <Title>Pulse Admin</Title>

        <NavBtn to="/admin" $active={onMain}><span>Գլխավոր</span></NavBtn>
        <NavBtn to="/admin/properties" $active={onProps}><span>Գույքեր</span></NavBtn>

        <NavBtn to="/admin/chat" $active={onChat}>
          <span>Չատ</span>
          {totalUnread > 0 && <Badge>{totalUnread}</Badge>}
        </NavBtn>

        {/* Полностью отдельная страница, без связей с чатом */}
        <NavBtn to="/admin/customers" $active={onCust}>
          <span>Հաճախորդների տվյալներ</span>
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










