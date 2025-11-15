// src/components/AuthModal.jsx
import React, { useState } from 'react';
import styled from 'styled-components';
import { API_BASE } from '../lib/apiBase';

const Backdrop = styled.div`
  position: fixed; inset: 0; background: rgba(0,0,0,.45);
  display: ${({ open }) => (open ? 'flex' : 'none')};
  align-items: center; justify-content: center; z-index: 1000;
`;

const Card = styled.div`
  width: min(520px, 92vw);
  background: #fff; border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,.2);
  padding: 18px; position: relative;
`;

const Tabs = styled.div` display:flex; gap:8px; margin-bottom:12px; `;
const Tab = styled.button`
  flex:1; padding:12px 0; font-weight:700; border:none; cursor:pointer;
  background: ${({ $active }) => ($active ? '#f0ae00' : '#f3f4f6')};
  color: ${({ $active }) => ($active ? '#fff' : '#374151')};
  border-radius: ${({ $active }) => ($active ? '8px 8px 0 0' : '8px')};
  display:flex; align-items:center; justify-content:center; gap:6px; font-size:15px;
`;

const Close = styled.button`
  position:absolute; right:10px; top:10px; border:none; background:#fff4; width:28px; height:28px;
  border-radius:50%; cursor:pointer; font-weight:700;
`;

const Field = styled.input`
  width:100%; padding:12px 14px; border:1px solid #e5e7eb; border-radius:8px; outline:none;
  font-size:15px; color:#111; background:#fff; margin-top:10px;
  &:focus{ border-color:#f0ae00; box-shadow:0 0 0 3px rgba(240,174,0,.15); }
`;

const Primary = styled.button`
  width:100%; margin-top:14px; padding:12px 16px; border:none; border-radius:8px;
  background:#f0ae00; color:#fff; font-weight:800; cursor:pointer; font-size:15px;
  opacity:${({ disabled }) => (disabled ? .7 : 1)};
`;

const ErrorBox = styled.div`
  margin-top:10px; background:#fee2e2; color:#991b1b; border:1px solid #fecaca; padding:10px; border-radius:8px;
`;

export default function AuthModal({ open, onClose, onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  // login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // register
  const [name, setName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  // common
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const close = () => {
    setErr('');
    onClose?.();
  };

  async function doLogin(e) {
    e.preventDefault();
    setErr('');
    if (!email || !password) { setErr('Լրացրեք email և գաղտնաբառ'); return; }
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });


      let data = null;
      try { data = await r.json(); } catch { data = null; }

      if (!r.ok || !data?.ok) {
        const msg =
          data?.error ||
          (r.status === 403 ? 'CORS: origin не разрешён на бэке' : 'Սխալ մուտք');
        throw new Error(msg);
      }

      if (data.token) {
        localStorage.setItem('pulse_token', data.token);
      }
      if (data.user) {
        localStorage.setItem('pulse_user', JSON.stringify(data.user));
      }
      window.dispatchEvent(new CustomEvent('pulse:auth', { detail: data.user }));
      onAuth?.(data.user);
      close();
    } catch (e2) {
      setErr(e2.message || 'Սխալ մուտք');
    } finally {
      setLoading(false);
    }
  }

  async function doRegister(e) {
    e.preventDefault();
    setErr('');
    if (!name || !regEmail || !regPassword) { setErr('Անուն, email և գաղտնաբառ պարտադիր են'); return; }
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email: regEmail, password: regPassword })
      });

      let data = null;
      try { data = await r.json(); } catch { data = null; }

      if (!r.ok || !data?.ok) {
        const msg =
          data?.error ||
          (r.status === 409 ? 'Այս email-ով օգտվող արդեն կա' :
           r.status === 403 ? 'CORS: origin не разрешён на բэке' :
           'Չհաջողվեց գրանցվել');
        throw new Error(msg);
      }

      if (data.token) {
        localStorage.setItem('pulse_token', data.token);
      }
      if (data.user) {
        localStorage.setItem('pulse_user', JSON.stringify(data.user));
      }
      window.dispatchEvent(new CustomEvent('pulse:auth', { detail: data.user }));
      onAuth?.(data.user);
      close();
    } catch (e2) {
      setErr(e2.message || 'Չհաջողվեց գրանցվել');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Backdrop open={open} onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <Card onMouseDown={(e)=>e.stopPropagation()}>
        <Close onClick={close}>✕</Close>

        <Tabs>
          <Tab $active={isLogin} onClick={() => setIsLogin(true)}>🔐 Մուտք</Tab>
          <Tab $active={!isLogin} onClick={() => setIsLogin(false)}>👤 Գրանցում</Tab>
        </Tabs>

        {isLogin ? (
          <form onSubmit={doLogin} noValidate>
            <Field
              type="email"
              placeholder="Էլ. հասցե"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              autoComplete="email"
            />
            <Field
              type="password"
              placeholder="Գաղտնաբառ"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <Primary type="submit" disabled={loading}>{loading ? 'Մուտք…' : 'Մուտք գործել'}</Primary>
            {err && <ErrorBox>{err}</ErrorBox>}
          </form>
        ) : (
          <form onSubmit={doRegister} noValidate>
            <Field
              type="text"
              placeholder="Անուն"
              value={name}
              onChange={(e)=>setName(e.target.value)}
              autoComplete="name"
            />
            <Field
              type="email"
              placeholder="Էլ. հասցե"
              value={regEmail}
              onChange={(e)=>setRegEmail(e.target.value)}
              autoComplete="email"
            />
            <Field
              type="password"
              placeholder="Գաղտնաբառ (առնվազն 6 նշան)"
              value={regPassword}
              onChange={(e)=>setRegPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
            />
            <Primary type="submit" disabled={loading}>{loading ? 'Գրանցում…' : 'Գրանցվել'}</Primary>
            {err && <ErrorBox>{err}</ErrorBox>}
          </form>
        )}
      </Card>
    </Backdrop>
  );
}
