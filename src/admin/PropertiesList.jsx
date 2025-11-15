// src/admin/PropertiesList.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import {
  getProperties as apiGetProperties,
  getPropertiesCached as apiGetPropertiesCached,
  deleteProperty as apiDeleteProperty,
} from '../data/db';

const Page = styled.div`background:#fff;border-radius:12px;padding:20px;`;
const Head = styled.div`display:flex;gap:12px;align-items:center;justify-content:space-between;margin-bottom:12px;`;
const Search = styled.input`flex:1;max-width:460px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;`;
const AddBtn = styled(Link)`
  background:#111319;color:#fff;text-decoration:none;border-radius:8px;
  padding:10px 14px;font-weight:600;
`;
const Table = styled.table`
  width:100%; border-collapse:collapse; background:#fff; overflow:hidden;
  th, td{ padding:12px; border-bottom:1px solid #eef0f3; text-align:left; vertical-align:middle; }
  th{ color:#6b7280; font-weight:600; font-size:13px; }
`;
const Img = styled.img`width:72px;height:48px;object-fit:cover;border-radius:6px;display:block;background:#f3f4f6;`;
const Action = styled(Link)`color:#1f4ad7; margin-right:12px; white-space:nowrap;`;
const DangerBtn = styled.button`color:#e11d48;background:none;border:none;cursor:pointer;white-space:nowrap;`;

const LocalBadge = styled.span`
  margin-left:8px; padding:2px 6px; border-radius:6px;
  background:#fef3c7; color:#92400e; font-size:11px; font-weight:600;
  border:1px solid #fde68a;
`;

const fmt = (n) => {
  if (typeof n === 'number') return n.toLocaleString();
  const maybe = Number(n);
  return Number.isFinite(maybe) ? maybe.toLocaleString() : (n ?? '');
};

export default function PropertiesList() {

  const initial = apiGetPropertiesCached();
  const [rows, setRows] = useState(Array.isArray(initial) ? initial : []);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(!initial?.length);


  const lastNonEmptyRef = useRef(Array.isArray(initial) ? initial : []);

  const refreshFromServer = useCallback(async () => {
    setLoading(true);
    try {

      const list = await apiGetProperties({ limit: 200 });
      setRows(Array.isArray(list) ? list : []);
    } catch {

      const cached = apiGetPropertiesCached();
      setRows(Array.isArray(cached) ? cached : []);
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    let mounted = true;

    refreshFromServer();

    const onChange = () => {
      if (!mounted) return;
      const cached = apiGetPropertiesCached();
      setRows(Array.isArray(cached) ? cached : []);
      setLoading(false);
    };

    window.addEventListener('pulse:properties-changed', onChange);
    window.addEventListener('storage', onChange);


    const onFocus = () => refreshFromServer();
    window.addEventListener('focus', onFocus);

    return () => {
      mounted = false;
      window.removeEventListener('pulse:properties-changed', onChange);
      window.removeEventListener('storage', onChange);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshFromServer]);

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
    return base.filter((p) => {
      const haystack = `${p?.id ?? ''} ${p?.title ?? ''} ${p?.description ?? ''} ${p?.type ?? ''} ${p?.status ?? ''}`.toLowerCase();
      return haystack.includes(s);
    });
  }, [displayRows, q]);

  const onDelete = useCallback(async (id, title) => {
    if (!id) return;
    if (!window.confirm(`Ջնջե՞լ գույքը${title ? ` «${title}»` : ''}`)) return;


    setRows(prev => {
      const next = Array.isArray(prev) ? prev.filter((p) => String(p?.id) !== String(id)) : [];

      queueMicrotask(() => window.dispatchEvent(new Event('pulse:properties-changed')));
      return next;
    });

    try {
      const res = await apiDeleteProperty(String(id));

      if (res && typeof res === 'object' && 'ok' in res && !res.ok) {
        throw new Error(res?.error || 'Delete failed');
      }
    } catch (e) {
      console.error(e);

      const cached = apiGetPropertiesCached();
      setRows(Array.isArray(cached) ? cached : []);
      alert('Չստացվեց ջնջել');
    }
  }, []);

  return (
    <Page>
      <Head>
        <Search
          placeholder="Որոնել…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search properties"
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

          {(Array.isArray(filtered) ? filtered : []).map((p) => {
            const key = String(p?.id ?? '') || `row_${Math.random().toString(36).slice(2, 8)}`;
            return (
              <tr key={key}>
                <td>
                  {p?.id}
                  {p?._local ? <LocalBadge>LOCAL</LocalBadge> : null}
                </td>
                <td>
                  {Boolean(p?.images?.length || p?.image) ? (
                    <Img src={p?.images?.[0] || p?.image} alt="" />
                  ) : (
                    <div style={{
                      width:72, height:48, borderRadius:6, background:'#f3f4f6',
                      display:'grid', placeItems:'center', color:'#9ca3af', fontSize:12
                    }}>N/A</div>
                  )}
                </td>
                <td>{p?.title || '—'}</td>
                <td>{p?.status || '—'}</td>
                <td>{p?.type || '—'}</td>
                <td>{p?.price != null ? `$${fmt(p.price)}` : '—'}</td>
                <td>{p?.beds ?? '—'}</td>
                <td>{p?.baths ?? '—'}</td>
                <td>
                  <Action to={`/admin/properties/${p?.id}`}>Խմբագրել</Action>
                  <DangerBtn type="button" onClick={() => onDelete(p?.id, p?.title)}>Ջնջել</DangerBtn>
                </td>
              </tr>
            );
          })}

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
