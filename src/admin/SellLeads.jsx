// src/admin/SellLeads.jsx
import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { io } from 'socket.io-client';


function normalizeHostname(host = '') {
  const map = {
    'а':'a','с':'c','е':'e','о':'o','р':'p','х':'x','к':'k','у':'y','м':'m','т':'t','н':'h','в':'v',
    'А':'A','С':'C','Е':'E','О':'O','Р':'P','Х':'X','К':'K','У':'Y','М':'M','Т':'T','Н':'H','В':'V',
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

  const api = sanitizeBase(w.__PULSE_API_BASE || `${apiDev}`);
  const ws  = sanitizeBase(w.__PULSE_WS_BASE  || `${wsDev}`);
  const path = (w.__PULSE_SOCKET_PATH || w.__PULSE_WS_PATH || '/socket.io');

  return { API_BASE: api, WS_BASE: ws, WS_PATH: path };
})();

async function apiGetJSON(path) {

  const urlAbs = `${API_BASE}${path}`;
  const urlRel = path; 


  const withTimeout = (p, ms = 6000) =>
    Promise.race([
      p,
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
    ]);

  const opts = { cache: 'no-store', credentials: 'include', headers: { 'cache-control':'no-cache', pragma:'no-cache' } };


  try {
    const r1 = await withTimeout(fetch(urlAbs, opts));
    if (r1.ok) return await r1.json();

  } catch (_) {

  }

  const r2 = await withTimeout(fetch(urlRel, opts));
  if (!r2.ok) throw new Error(`HTTP ${r2.status}`);
  return await r2.json();
}


const Page = styled.div`background:#fff;border-radius:12px;padding:20px;`;
const Head = styled.div`display:flex;gap:12px;align-items:center;justify-content:space-between;margin-bottom:12px;`;
const Search = styled.input`flex:1;max-width:460px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;`;
const Table = styled.table`
  width:100%; border-collapse:collapse; background:#fff;
  th, td{ padding:12px; border-bottom:1px solid #eef0f3; text-align:left; }
  th{ color:#6b7280; font-weight:600; font-size:13px; white-space:nowrap; }
`;
const Muted = styled.span`color:#6b7280;`;


const fmtDT = (ms) => {
  if (!ms) return '—';
  try {
    const d = new Date(ms);
    const dd = d.toLocaleDateString('hy-AM');
    const tt = d.toLocaleTimeString('hy-AM', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `${dd}, ${tt}`;
  } catch { return '—'; }
};


function getAdminSocket() {
  const w = typeof window !== 'undefined' ? window : {};
  if (w.__PULSE_ADMIN_SOCKET && w.__PULSE_ADMIN_SOCKET.connected) return w.__PULSE_ADMIN_SOCKET;
  if (w.__PULSE_ADMIN_SOCKET && !w.__PULSE_ADMIN_SOCKET.connected) return w.__PULSE_ADMIN_SOCKET;

  const s = io(`${WS_BASE}/chat`, {
    path: WS_PATH,
    transports: ['websocket', 'polling'],
    withCredentials: true,
    autoConnect: true,
  });
  s.on('connect_error', (e) => console.warn('[SellLeads] WS error:', e?.message || e));

  s.emit('join', { role: 'admin' });
  w.__PULSE_ADMIN_SOCKET = s;
  return s;
}

export default function SellLeads() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const loadLeads = async () => {
    try {
      setErr('');
      setLoading(true);
      const j = await apiGetJSON('/api/leads/sell');
      setRows(Array.isArray(j?.items) ? j.items : Array.isArray(j) ? j : []);
    } catch (e) {
      console.warn('[SellLeads] loadLeads failed:', e?.message || e);
      setErr('Չհաջողվեց բեռնել տվյալները'); 
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLeads(); }, []);

  useEffect(() => {
    const socket = getAdminSocket();
    const refresh = () => loadLeads();
    socket.on('sell:new', refresh);
    return () => { socket.off('sell:new', refresh); };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = Array.isArray(rows) ? rows : [];
    if (!s) return base;
    return base.filter((x) =>
      [
        x?.name, x?.phone, x?.email,
        x?.propertyType, x?.dealType, x?.note,
        String(x?.createdAt || ''),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(s)
    );
  }, [rows, q]);

  return (
    <Page>
      <Head>
        <h2 style={{margin:0}}>Վաճառքի անշարժ գույք</h2>
        <Search
          placeholder="Փնտրել՝ Անուն, Հեռախոս, Տեսակ, Գործարք..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </Head>

      <Table>
        <thead>
          <tr>
            <th>Ամսաթիվ</th>
            <th>Անուն</th>
            <th>Հեռախոս</th>
            <th>Email</th>
            <th>Տեսակ</th>
            <th>Գործարք</th>
            <th>Նշումներ</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr><td colSpan={7}><Muted>Բեռնում…</Muted></td></tr>
          )}
          {!loading && err && (
            <tr><td colSpan={7}><Muted>{err}</Muted></td></tr>
          )}
          {!loading && !err && filtered.length === 0 && (
            <tr><td colSpan={7}><Muted>Տվյալներ չկան</Muted></td></tr>
          )}
          {!loading && !err && filtered.map((x) => (
            <tr key={x.id}>
              <td>{fmtDT(x.createdAt)}</td>
              <td>{x.name || '—'}</td>
              <td>{x.phone || '—'}</td>
              <td>{x.email || '—'}</td>
              <td>{x.propertyType || '—'}</td>
              <td>{x.dealType || '—'}</td>
              <td style={{maxWidth:420, whiteSpace:'pre-wrap'}}>{x.note || <Muted>—</Muted>}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Page>
  );
}
