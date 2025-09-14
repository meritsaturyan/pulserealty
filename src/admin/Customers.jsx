// src/admin/Customers.jsx
import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

const API_BASE = 'http://localhost:4000';

const Wrap  = styled.div`display:flex; flex-direction:column; gap:14px;`;
const H1    = styled.h2`margin:0;`;
const Top   = styled.div`display:flex; gap:10px; align-items:center; flex-wrap:wrap;`;
const Input = styled.input`
  padding:10px 12px; border:1px solid #e5e7eb; border-radius:10px; min-width:280px; outline:none;
  &:focus{ border-color:#94a3b8; box-shadow:0 0 0 3px rgba(148,163,184,.2); }
`;
const Table = styled.table`
  width:100%; border-collapse:separate; border-spacing:0 8px;
  th{ text-align:left; font-weight:800; color:#334155; padding:6px 10px; }
  td{ background:#fff; padding:10px; border-top:1px solid #e5e7eb; border-bottom:1px solid #e5e7eb; }
  tr td:first-child{ border-left:1px solid #e5e7eb; border-top-left-radius:10px; border-bottom-left-radius:10px; }
  tr td:last-child{ border-right:1px solid #e5e7eb; border-top-right-radius:10px; border-bottom-right-radius:10px; }
`;
const Empty = styled.div`padding:24px; color:#64748b;`;

async function apiGetJSON(path) {
  try {
    const r = await fetch(`${API_BASE}${path}`, {
      cache: 'no-store',
      headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
    });
    if (!r.ok) return null;
    const t = await r.text();
    if (!t) return null;
    return JSON.parse(t);
  } catch {
    return null;
  }
}

const parseList = (r) => (Array.isArray(r) ? r : r?.items || r?.data || []);
const tsToMs = (v) =>
  v && typeof v === 'object' && v._seconds
    ? v._seconds * 1000
    : typeof v === 'number'
    ? v
    : null;

export default function Customers() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await apiGetJSON('/api/customers');
    const list = parseList(r).map((x) => ({
      id: x.id || x.threadId || Math.random().toString(36).slice(2),
      name: x.name || '',
      email: x.email || '',
      phone: x.phone || '',
      createdAt: tsToMs(x.createdAt) || Date.now(),
    }));
    // последние — наверх
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    setRows(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000); // лёгкое автообновление
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return rows;
    return rows.filter((r) => {
      const bag = [r.name, r.email, r.phone].map((s) =>
        String(s || '').toLowerCase()
      );
      return bag.some((s) => s.includes(qq));
    });
  }, [q, rows]);

  const fmtDate = (ms) => {
    if (!ms) return '—';
    try {
      const d = new Date(ms);
      return d.toLocaleString();
    } catch {
      return '—';
    }
  };

  return (
    <Wrap>
      <H1>Հաճախորդների տվյալներ</H1>

      <Top>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Որոնում՝ Անուն, email, հեռախոս…"
        />
        {loading && <span style={{ color: '#64748b' }}>Թարմացում…</span>}
      </Top>



      {filtered.length === 0 ? (
        <Empty>{loading ? 'Բեռնում…' : 'Դատարկ է։ Կլինեն գրառումներ, երբ հաճախորդներ լրացնեն ձևը Details-ում.'}</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Անուն</th>
              <th>Email</th>
              <th>Հեռախոս</th>
              <th>Ավելացվել է</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.name || '—'}</td>
                <td>{r.email || '—'}</td>
                <td>{r.phone || '—'}</td>
                <td style={{ color: '#64748b' }}>{fmtDate(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Wrap>
  );
}


