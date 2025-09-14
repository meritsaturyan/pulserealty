// src/admin/PropertiesList.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Link, useNavigate } from 'react-router-dom';
import * as dbApi from '../data/db'; 

const Page = styled.div`background:#fff;border-radius:12px;padding:20px;`;
const Head = styled.div`display:flex;gap:12px;align-items:center;justify-content:space-between;margin-bottom:12px;`;
const Search = styled.input`flex:1;max-width:460px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;`;
const AddBtn = styled(Link)`
  background:#111319;color:#fff;text-decoration:none;border-radius:8px;
  padding:10px 14px;font-weight:600;
`;
const Table = styled.table`
  width:100%; border-collapse:collapse; background:#fff; overflow:hidden;
  th, td{ padding:12px; border-bottom:1px solid #eef0f3; text-align:left; }
  th{ color:#6b7280; font-weight:600; font-size:13px; }
`;
const Img = styled.img`width:72px;height:48px;object-fit:cover;border-radius:6px;display:block;`;
const Action = styled(Link)`color:#1f4ad7; margin-right:12px;`;
const DangerBtn = styled.button`color:#e11d48;background:none;border:none;cursor:pointer;`;

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString() : n ?? '');

export default function PropertiesList() {
  const navigate = useNavigate();


  const initial = (dbApi.getPropertiesCached && dbApi.getPropertiesCached()) || [];
  const [rows, setRows] = useState(Array.isArray(initial) ? initial : []);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(!initial.length);


  const lastNonEmptyRef = useRef(Array.isArray(initial) ? initial : []);

  const refresh = () => {
    try {
      const res = (dbApi.getProperties || (() => []))();
      if (res && typeof res.then === 'function') {
        setLoading(true);
        res
          .then((v) => {
            const arr = Array.isArray(v) ? v : [];
            setRows(arr);
          })
          .finally(() => setLoading(false));
      } else {
        const arr = Array.isArray(res) ? res : [];
        setRows(arr);
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();


    const onChange = () => {
      const cached = dbApi.getPropertiesCached ? dbApi.getPropertiesCached() : [];
      setRows(Array.isArray(cached) ? cached : []);
      setLoading(false);
    };
    window.addEventListener('pulse:properties-changed', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('pulse:properties-changed', onChange);
      window.removeEventListener('storage', onChange);
    };

  }, []);


  useEffect(() => {
    if (Array.isArray(rows) && rows.length) {
      lastNonEmptyRef.current = rows;
    }
  }, [rows]);


  const displayRows =
    (Array.isArray(rows) && rows.length) ? rows : (lastNonEmptyRef.current || []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = Array.isArray(displayRows) ? displayRows : [];
    if (!s) return base;
    return base.filter((p) =>
      `${p?.title ?? ''} ${p?.description ?? ''} ${p?.type ?? ''} ${p?.status ?? ''}`
        .toLowerCase()
        .includes(s)
    );
  }, [displayRows, q]);

  const onDelete = async (id) => {
    if (!window.confirm('Ջնջե՞լ գույքը')) return;
    try {
      if (dbApi.deleteProperty) {
        await dbApi.deleteProperty(String(id));
      } else {
        // fallback՝ localStorage
        const STORAGE_KEY = 'pulse:properties';
        const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const next = list.filter((p) => String(p.id) !== String(id));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      window.dispatchEvent(new Event('pulse:properties-changed'));
      refresh();
    } catch (e) {
      console.error(e);
      alert('Չստացվեց ջնջել');
    }
  };

  return (
    <Page>
      <Head>
        <Search
          placeholder="Որոնել…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <AddBtn to="/admin/properties/new">+ Ավելացնել գույք</AddBtn>
      </Head>

      <Table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Լուսանկար</th>
            <th>Վերնագիր</th>
            <th>Կարգավիճակ</th>
            <th>Տիպ</th>
            <th>Գին</th>
            <th>Սեն.</th>
            <th>Սան.</th>
            <th>Գործողություններ</th>
          </tr>
        </thead>
        <tbody>
          {loading && !displayRows.length && (
            <tr>
              <td colSpan={9} style={{ color: '#6b7280', padding: 16 }}>Բեռնում…</td>
            </tr>
          )}

          {(Array.isArray(filtered) ? filtered : []).map((p) => (
            <tr key={p?.id}>
              <td>{p?.id}</td>
              <td><Img src={p?.images?.[0] || p?.image} alt="" /></td>
              <td>{p?.title}</td>
              <td>{p?.status}</td>
              <td>{p?.type}</td>
              <td>${fmt(p?.price)}</td>
              <td>{p?.beds ?? '—'}</td>
              <td>{p?.baths ?? '—'}</td>
              <td>
                <Action to={`/admin/properties/${p?.id}`}>Խմբագրել</Action>
                <DangerBtn onClick={() => onDelete(p?.id)}>Ջնջել</DangerBtn>
              </td>
            </tr>
          ))}

          {!loading && (!Array.isArray(filtered) || filtered.length === 0) && (
            <tr>
              <td colSpan={9} style={{ color: '#6b7280', padding: 16 }}>
                Տվյալներ չկան
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </Page>
  );
}





