// src/admin/PropertyForm.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import styled from 'styled-components';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getProperties,
  getPropertiesCached,
  getPropertyImages,
  saveProperty,
  getPropertyPanos,
  setPropertyPanoramas,
  syncLocalPanosToCloud,
  deleteProperty as apiDeleteProperty,
} from '../data/db';
import PanoUploader from '../components/PanoUploader';

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const Page = styled.div`background:#fff; border-radius:12px; padding:20px;`;
const Title = styled.h2`margin:0 0 16px 0;`;

const PhotosTop = styled.div`
  --thumbH: 108px;
  --cellW: 120px;
  border:1px dashed #d1d5db;
  border-radius:10px;
  padding:12px 12px 8px;
  background:#fafafa;
  margin-bottom:16px;
`;
const PhotosHead = styled.div`display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:8px;`;
const Help = styled.div`font-size:12px; color:#6b7280;`;
const ThumbsRow = styled.div`
  display:flex; flex-wrap:nowrap; gap:8px;
  height: var(--thumbH);
  width:100%;
  overflow-x:auto; overflow-y:hidden; -webkit-overflow-scrolling:touch;
  scrollbar-width:auto; scrollbar-color:#cbd5e1 #f1f5f9;
  &::-webkit-scrollbar{ height:10px; }
  &::-webkit-scrollbar-track{ background:#f1f5f9; border-radius:9999px; }
  &::-webkit-scrollbar-thumb{ background:#cbd5e1; border-radius:9999px; }
  &::-webkit-scrollbar-thumb:hover{ background:#94a3b8; }
`;
const Thumb = styled.div`
  position:relative; flex:0 0 var(--cellW);
  height: calc(var(--thumbH) - 16px);
  border-radius:8px; overflow:hidden; background:#eee; user-select:none;
  img{ width:100%; height:100%; object-fit:cover; display:block; }
  .btns{ position:absolute; left:6px; right:6px; bottom:6px; display:flex; gap:6px; justify-content:space-between; }
  .btn{ background:rgba(0,0,0,.65); color:#fff; border:none; border-radius:6px; padding:4px 6px; font-size:12px; cursor:pointer; }
  .del{ position:absolute; top:6px; right:6px; background:rgba(0,0,0,.65); color:#fff; border:none; border-radius:6px; padding:4px 6px; font-size:12px; cursor:pointer; }
  &.dragging{ opacity:.7; outline:2px solid #111319; }
  &.drag-over{ outline:2px dashed #111319; }
`;
const CoverBadge = styled.span`
  position:absolute; left:6px; top:6px;
  background:rgba(17,19,25,.85); color:#fff; font-size:10px;
  padding:2px 6px; border-radius:999px;
`;
const ScrollControls = styled.div`display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:8px;`;
const ArrowBtn = styled.button`
  min-width:36px; height:28px; border:none; border-radius:8px;
  background:#e5e7eb; color:#111; font-weight:700; cursor:pointer;
  opacity:${p => p.disabled ? 0.5 : 1}; pointer-events:${p => p.disabled ? 'none' : 'auto'};
`;

const Grid = styled.div`
  display:grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap:12px;
  @media (max-width:900px){ grid-template-columns:1fr; }
`;
const Field = styled.div`display:flex; flex-direction:column; gap:6px; min-width:0;`;
const Label = styled.label`font-size:13px; color:#6b7280;`;
const Input = styled.input`width:100%; padding:10px 12px; border:1px solid #e5e7eb; border-radius:8px;`;
const Textarea = styled.textarea`width:100%; min-height:120px; padding:10px 12px; border:1px solid #e5e7eb; border-radius:8px; resize:vertical;`;
const Select = styled.select`width:100%; padding:10px 12px; border:1px solid #e5e7eb; border-radius:8px;`;
const Actions = styled.div`margin-top:16px; display:flex; gap:10px; flex-wrap:wrap;`;
const Btn = styled.button`
  padding:10px 14px; border-radius:8px; border:none; font-weight:600; cursor:pointer;
  &.primary{ background:#111319; color:#fff; }
  &.ghost{ background:#f3f4f6; }
  &.danger{ background:#fff0f1; color:#e11d48; border:1px solid #fecdd3; }
`;

const AmenGrid = styled.div`display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px 16px; @media (max-width:600px){ grid-template-columns:1fr; }`;
const AmenItem = styled.label`display:flex; align-items:center; gap:10px; font-size:14px; color:#374151; input{ width:18px; height:18px; }`;

const MapBox = styled.div`
  margin-top: 4px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #eef0f3;
  background: #fff;
  .leaflet-container {
    height: 260px;
    width: 100%;
  }
`;
const MapTitle = styled.h3`
  margin: 0 0 10px;
  font-size: 16px;
  font-weight: 700;
  color: #1A3D4D;
`;
const MapRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 8px;
  margin-bottom: 8px;
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const AMENITIES = [
  'Օդորակիչ', 'Սպա և մերսում', 'Սպորտդահլիճ', 'Լողավազան', 'Ահազանգման համակարգ',
  'Կենտրոնական ջեռուցում', 'Ինտերնետ', 'Լվացքատուն', 'Թույլատրվում են կենդանիներ',
  'Պատուհանի վարագույրներ', 'Անվճար Wi-Fi', 'Ավտոկայանատեղի',
];

const regionsWithTowns = {
  Yerevan: ['Ajapnyak', 'Avan', 'Davtashen', 'Erebuni', 'Kanaker-Zeytun', 'Kentron', 'Malatia-Sebastia', 'Nor Nork', 'Nork-Marash', 'Nubarashen', 'Shengavit', 'Arabkir'],
  Aragatsotn: ['Ashtarak', 'Aparan', 'Talin', 'Oshakan', 'Tsaghkahovit'],
  Ararat: ['Artashat', 'Masis', 'Vedi', 'Ararat', 'Lusarat'],
  Armavir: ['Armavir', 'Echmiadzin', 'Metsamor', 'Baghramyan'],
  Gegharkunik: ['Gavar', 'Sevan', 'Vardenis', 'Martuni', 'Chambarak'],
  Lori: ['Vanadzor', 'Alaverdi', 'Stepanavan', 'Spitak', 'Tashir'],
  Kotayk: ['Abovyan', 'Hrazdan', 'Charentsavan', 'Byureghavan', 'Tsaghkadzor'],
  Shirak: ['Gyumri', 'Artik', 'Akhuryan', 'Maralik'],
  Syunik: ['Kapan', 'Goris', 'Sisian', 'Meghri', 'Agarak'],
  VayotsDzor: ['Yeghegnadzor', 'Vayk', 'Jermuk'],
  Tavush: ['Ijevan', 'Dilijan', 'Berd', 'Noyemberyan'],
};

const DEFAULT_LAT = 40.1772;   // Yerevan
const DEFAULT_LNG = 44.50349;

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapClickSetter({ onChange }) {
  useMapEvents({
    click(e) {
      if (!onChange) return;
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const readFileAsDataURL = (file) => new Promise((resolve, reject) => {
  const fr = new FileReader();
  fr.onload = () => resolve(fr.result);
  fr.onerror = reject;
  fr.readAsDataURL(file);
});

const compressDataUrl = (dataUrl, maxW = 1600, maxH = 1600, quality = 0.8) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.width, h = img.height;
      const ratio = Math.min(maxW / w, maxH / h, 1);
      const cw = Math.round(w * ratio);
      const ch = Math.round(h * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = cw; canvas.height = ch;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, cw, ch);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });

const normalizeStatus = (s) => {
  if (!s) return 'for_sale';
  const v = String(s).toLowerCase();
  if (v === 'for sale' || v === 'վաճառք' || v === 'продажа' || v === 'for_sale') return 'for_sale';
  if (v === 'for rent' || v === 'վարձով' || v === 'аренда' || v === 'for_rent') return 'for_rent';
  return v;
};
const labelForStatus = (s) => (normalizeStatus(s) === 'for_rent' ? 'Վարձով' : 'Վաճառք');
const numOrNull = (v) => (v === '' || v == null ? null : Number(v));

export default function PropertyForm() {
  const params = useParams();
  const navigate = useNavigate();
  const isEdit = params.id && params.id !== 'new';

  const [all, setAll] = useState(() => getPropertiesCached() || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.resolve(getProperties())
      .then(items => { if (alive) setAll(Array.isArray(items) ? items : []); })
      .catch(() => { if (alive) setAll(getPropertiesCached() || []); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const current = useMemo(() => {
    const arr = Array.isArray(all) ? all : [];
    return isEdit ? arr.find(p => String(p.id) === String(params.id)) : null;
  }, [all, isEdit, params.id]);

  const [draftId] = useState(() => String(Date.now()));
  const propId = isEdit ? (current?.id ?? params.id) : draftId;

  const [form, setForm] = useState(() => ({
    title: current?.title || '',
    status: normalizeStatus(current?.status || 'for_sale'),
    type: current?.type || 'Apartment',
    price: current?.price ?? '',
    beds: current?.beds ?? '',
    baths: current?.baths ?? '',
    sqft: current?.sqft ?? current?.area ?? '',
    region: current?.region || current?.Region?.title || '',
    town: current?.town || current?.Town?.title || '',
    street: current?.street || '',
    description: current?.description || '',
    images: current?.images || (current?.image ? [current.image] : []),
    floor: current?.floor || '',
    amenities: Array.isArray(current?.amenities) ? current.amenities : [],
    lat: current?.lat ?? '',
    lng: current?.lng ?? '',
  }));

  useEffect(() => {
    if (!isEdit || !current) return;
    setForm(prev => ({
      ...prev,
      title: current.title || '',
      status: normalizeStatus(current.status || 'for_sale'),
      type: current.type || 'Apartment',
      price: current.price ?? '',
      beds: current.beds ?? '',
      baths: current.baths ?? '',
      sqft: current.sqft ?? current.area ?? '',
      region: current.region || current.Region?.title || '',
      town: current.town || current.Town?.title || '',
      street: current.street || '',
      description: current.description || '',
      images: current.images || (current.image ? [current.image] : []),
      floor: current.floor || '',
      amenities: Array.isArray(current.amenities) ? current.amenities : [],
      lat: current.lat ?? '',
      lng: current.lng ?? '',
    }));
  }, [isEdit, current]);

  useEffect(() => {
    (async () => {
      if (!isEdit) return;
      const id = current?.id || params.id;
      if (!id) return;
      try {
        const imgs = await getPropertyImages(id);
        if (imgs?.length) {
          setForm(prev => ({ ...prev, images: imgs }));
        } else if (current?.image) {
          setForm(prev => ({ ...prev, images: [current.image] }));
        }
      } catch { /* silently */ }
    })();
  }, [current?.id, isEdit, params.id, current?.image]);

  const towns = useMemo(
    () => (form.region ? regionsWithTowns[form.region] || [] : []),
    [form.region]
  );
  useEffect(() => {
    if (form.region && towns.length && !towns.includes(form.town)) {
      setForm(prev => ({ ...prev, town: '' }));
    }
  }, [form.region, towns, form.town]);

  const onChange = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }));
  const toggleAmenity = (name) =>
    setForm(prev => {
      const set = new Set(prev.amenities || []);
      set.has(name) ? set.delete(name) : set.add(name);
      return { ...prev, amenities: [...set] };
    });

  const rowRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const updateArrows = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanLeft(el.scrollLeft > 0);
    setCanRight(el.scrollLeft < max - 1);
  }, []);

  const onFiles = async (files) => {
    if (!files) return;
    const list = Array.from(files).slice(0, 80);
    const out = [];
    for (const file of list) {
      try {
        const raw = await readFileAsDataURL(file);
        const compressed = await compressDataUrl(raw, 1600, 1600, 0.8);
        out.push(compressed);
      } catch { /* ignore one failed file */ }
    }
    if (out.length) setForm(prev => ({ ...prev, images: [...(prev.images || []), ...out] }));
    setTimeout(updateArrows, 0);
  };
  const removeImage = (idx) => setForm(prev => ({ ...prev, images: (prev.images || []).filter((_, i) => i !== idx) }));

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    updateArrows();
    const onScroll = () => updateArrows();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [form.images?.length, updateArrows]);

  const nudge = (dir) => rowRef.current?.scrollBy({ left: dir * 360, behavior: 'smooth' });

  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const moveItem = (arr, from, to) => {
    const a = [...arr];
    if (from === to || from < 0 || to < 0 || from >= a.length || to >= a.length) return a;
    const [m] = a.splice(from, 1);
    a.splice(to, 0, m);
    return a;
  };
  const onDragStart = (e, i) => {
    setDragIdx(i);
    try { e.dataTransfer.setData('text/plain', String(i)); } catch { }
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const onDragEnter = (i) => { if (dragIdx !== null && dragIdx !== i) setOverIdx(i); };
  const onDragLeave = () => setOverIdx(null);
  const onDrop = (e, to) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    const from = Number.isInteger(+data) ? parseInt(data, 10) : dragIdx;
    if (from === null || Number.isNaN(from)) { setDragIdx(null); setOverIdx(null); return; }
    setForm(prev => ({ ...prev, images: moveItem(prev.images || [], from, to) }));
    setDragIdx(null); setOverIdx(null);
    setTimeout(updateArrows, 0);
  };
  const onDragEnd = () => { setDragIdx(null); setOverIdx(null); };
  const moveLeft = (i) => setForm(prev => ({ ...prev, images: moveItem(prev.images || [], i, Math.max(0, i - 1)) }));
  const moveRight = (i) => setForm(prev => ({ ...prev, images: moveItem(prev.images || [], i, Math.min((prev.images?.length || 1) - 1, i + 1)) }));
  const makeCover = (i) => setForm(prev => ({ ...prev, images: moveItem(prev.images || [], i, 0) }));

  const handleGeocode = async () => {
    const parts = [form.region, form.town, form.street].filter(Boolean);
    const q = parts.join(', ');
    if (!q) return;

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'hy,en;q=0.8,ru;q=0.6' },
      });
      const data = await res.json();
      if (Array.isArray(data) && data.length) {
        const hit = data[0];
        setForm(f => ({
          ...f,
          lat: hit.lat,
          lng: hit.lon,
        }));
      } else {
        alert('Հասցեն չի գտնվել քարտեզում');
      }
    } catch (e) {
      alert('Սխալ քարտեզի հարցման ժամանակ');
    }
  };

  const save = async () => {
    if (!form.title.trim()) { alert('Գրեք վերնագիր'); return; }
    if (form.price === '' || Number(form.price) < 0) { alert('Գրեք գինը'); return; }
    if (!form.region) { alert('Ընտրեք մարզը'); return; }

    const editingId = isEdit ? (current?.id ?? params.id) : null;
    const draftLocalId = String(propId);

    const panosLocal = (await getPropertyPanos(editingId || draftLocalId)) || [];

    const payloadBase = {
      title: form.title,
      type: form.type,
      status: normalizeStatus(form.status),
      price: numOrNull(form.price),
      beds: numOrNull(form.beds),
      baths: numOrNull(form.baths),
      sqft: numOrNull(form.sqft),
      area: numOrNull(form.sqft),
      area_sq_m: numOrNull(form.sqft),
      floor: form.floor || null,

      region: form.region || '',
      town: form.town || '',
      street: form.street || '',
      description: form.description || '',
      amenities: Array.isArray(form.amenities) ? form.amenities : [],
      image: (form.images && form.images[0]) || '',
      images: form.images || [],
      panos: panosLocal,
      updatedAt: new Date().toISOString(),

      lat: numOrNull(form.lat),
      lng: numOrNull(form.lng),
    };

  const payload = editingId
      ? { id: editingId, ...payloadBase }
      : { id: draftLocalId, ...payloadBase };

    setLoading(true);
    try {
      const saved = await saveProperty(payload);
      const savedId = String(saved?.id ?? editingId ?? draftLocalId);

      if (!editingId && saved?.id && draftLocalId !== String(saved.id)) {
        try {
          const draftPanos = await getPropertyPanos(draftLocalId);
          if (draftPanos?.length) {
            setPropertyPanoramas(String(saved.id), draftPanos);
          }
        } catch { /* noop */ }
      }

      try {
        await syncLocalPanosToCloud(savedId);
        window.dispatchEvent(new CustomEvent('pulse:panos-changed', {
          detail: { propertyId: savedId }
        }));
      } catch (e) {
        console.error('Failed to sync panos to cloud', e);
      }

      window.dispatchEvent(new Event('pulse:properties-changed'));
      alert('Պահպանված է');
      navigate('/admin/properties');
    } catch (e) {
      console.error(e);
      alert('Չստացվեց պահել');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    const targetId = current?.id ?? params.id;
    if (!targetId) return;
    if (!window.confirm('Ջնջե՞լ այս գույքը։')) return;

    setLoading(true);
    try {
      await apiDeleteProperty(String(targetId));
      window.dispatchEvent(new Event('pulse:properties-changed'));
      navigate('/admin/properties');
    } catch (e) {
      console.error(e);
      alert('Չհաջողվեց ջնջել: ' + (e?.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const centerLat = Number(form.lat) || DEFAULT_LAT;
  const centerLng = Number(form.lng) || DEFAULT_LNG;

  return (
    <Page>
      <Title>{isEdit ? 'Խմբագրել գույքը' : 'Ավելացնել գույք'}</Title>

      <PhotosTop>
        <PhotosHead>
          <Label htmlFor="photos">Լուսանկարներ</Label>
          <Help>
            Քաշեք ու տեղափոխեք՝ լուսանկարների կարգը փոխելու համար • Առաջինը՝ շապիկ • Նկարները ավտոմատ սեղմվում են
          </Help>
        </PhotosHead>

        <Input id="photos" type="file" accept="image/*" multiple onChange={(e) => onFiles(e.target.files)} />

        {!!(form.images && form.images.length) && (
          <>
            <ThumbsRow ref={rowRef}>
              {form.images.map((src, i) => (
                <Thumb
                  key={`${src}-${i}`}
                  draggable
                  onDragStart={(e) => onDragStart(e, i)}
                  onDragOver={onDragOver}
                  onDragEnter={() => onDragEnter(i)}
                  onDragLeave={onDragLeave}
                  onDrop={(e) => onDrop(e, i)}
                  onDragEnd={onDragEnd}
                  className={`${dragIdx === i ? 'dragging' : ''} ${overIdx === i ? 'drag-over' : ''}`}
                  title="Drag to reorder"
                >
                  {i === 0 && <CoverBadge>Շապիկ</CoverBadge>}
                  <img src={src} alt={`photo-${i}`} />
                  <button type="button" className="del" onClick={() => removeImage(i)}>✕</button>
                  <div className="btns">
                    <button type="button" className="btn" onClick={() => moveLeft(i)}>↤</button>
                    <button type="button" className="btn" onClick={() => makeCover(i)}>★</button>
                    <button type="button" className="btn" onClick={() => moveRight(i)}>↦</button>
                  </div>
                </Thumb>
              ))}
            </ThumbsRow>

            <ScrollControls>
              <ArrowBtn onClick={() => nudge(-1)} disabled={!canLeft}>←</ArrowBtn>
              <div style={{ flex: 1 }} />
              <ArrowBtn onClick={() => nudge(1)} disabled={!canRight}>→</ArrowBtn>
            </ScrollControls>
          </>
        )}
      </PhotosTop>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 8px 0' }}>360° պանորամաներ</h3>
        <PanoUploader key={propId} propertyId={propId} />
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
          Ավելացրեք մեկ կամ մի քանի 360° նկար (equirectangular). Նկարները պահպանվում են տեղային և կցվում են այս գույքին։
        </div>
      </div>

      <Grid>
        <Field>
          <Label htmlFor="title">Վերնագիր</Label>
          <Input id="title" placeholder="Վերնագիր" value={form.title} onChange={onChange('title')} />
        </Field>

        <Field>
          <Label htmlFor="status">Գործարքի տեսակ</Label>
          <Select id="status" value={form.status} onChange={onChange('status')}>
            <option value="for_sale">Վաճառք</option>
            <option value="for_rent">Վարձով</option>
          </Select>
        </Field>

        <Field>
          <Label htmlFor="type">Գույքի տեսակ</Label>
          <Select id="type" value={form.type} onChange={onChange('type')}>
            <option value="Apartment">Բնակարան</option>
            <option value="House">Տուն</option>
            <option value="Villa">Վիլլա</option>
            <option value="Land">Հող</option>
          </Select>
        </Field>

        <Field>
          <Label htmlFor="price">Գին (USD)</Label>
          <Input id="price" inputMode="decimal" type="number" placeholder="Գին" value={form.price} onChange={onChange('price')} />
        </Field>

        <Field>
          <Label htmlFor="beds">Սենյակներ</Label>
          <Input id="beds" type="number" min="0" placeholder="Սենյակներ" value={form.beds} onChange={onChange('beds')} />
        </Field>

        <Field>
          <Label htmlFor="baths">Սանհանգույց</Label>
          <Input id="baths" type="number" min="0" placeholder="Սանհանգույց" value={form.baths} onChange={onChange('baths')} />
        </Field>

        <Field>
          <Label htmlFor="sqft">Մակերես (sqft)</Label>
          <Input id="sqft" type="number" min="0" placeholder="Մակերես (sqft)" value={form.sqft} onChange={onChange('sqft')} />
        </Field>

        <Field>
          <Label htmlFor="floor">Հարկ</Label>
          <Input id="floor" placeholder="Օր. 3/4" value={form.floor || ''} onChange={onChange('floor')} />
        </Field>

        <Field>
          <Label htmlFor="region">Մարզ</Label>
          <Select id="region" value={form.region} onChange={onChange('region')}>
            <option value="">— Ընտրեք մարզը —</option>
            {Object.keys(regionsWithTowns).map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>
        </Field>

        <Field>
          <Label htmlFor="town">Քաղաք / Վարչ. շրջան</Label>
          <Select id="town" value={form.town} onChange={onChange('town')} disabled={!form.region}>
            <option value="">{form.region ? '— Ընտրեք քաղաքը —' : 'Նախ ընտրեք մարզը'}</option>
            {(regionsWithTowns[form.region] || []).map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>

        <Field>
          <Label htmlFor="street">Փողոց / Հասցե</Label>
          <Input id="street" placeholder="Փողոց / Հասցե" value={form.street} onChange={onChange('street')} />
        </Field>

        <Field style={{ gridColumn: 'span 2' }}>
          <MapBox>
            <MapTitle>Քարտեզում հասցեն</MapTitle>
            <MapRow>
              <Input
                placeholder="Փողոց / հասցե (քաղաքը կավելացվի ավտոմատ)"
                value={form.street}
                onChange={onChange('street')}
              />
              <Input
                type="number"
                step="0.000001"
                placeholder="Լատ (lat)"
                value={form.lat ?? ''}
                onChange={onChange('lat')}
              />
              <Input
                type="number"
                step="0.000001"
                placeholder="Լոնգ (lng)"
                value={form.lng ?? ''}
                onChange={onChange('lng')}
              />
            </MapRow>

            <button
              type="button"
              onClick={handleGeocode}
              style={{
                marginBottom: 8,
                padding: '8px 12px',
                borderRadius: 8,
                border: 'none',
                background: '#f0ae00',
                color: '#111',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Գտնել քարտեզում ըստ հասցեի
            </button>

            <MapContainer
              center={[centerLat, centerLng]}
              zoom={15}
              scrollWheelZoom={false}
              style={{ borderRadius: 12, overflow: 'hidden' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              <Marker position={[centerLat, centerLng]} icon={defaultIcon} />
              <MapClickSetter
                onChange={(lat, lng) =>
                  setForm(f => ({
                    ...f,
                    lat: lat.toFixed(6),
                    lng: lng.toFixed(6),
                  }))
                }
              />
            </MapContainer>
          </MapBox>
        </Field>

        <Field style={{ gridColumn: 'span 2' }}>
          {/* блок удобств пока убран по твоей просьбе */}
          {/* <Label>Հարմարություններ</Label>
          <AmenGrid>
            {AMENITIES.map(a => (
              <AmenItem key={a}>
                <input
                  type="checkbox"
                  checked={(form.amenities || []).includes(a)}
                  onChange={() => toggleAmenity(a)}
                />
                <span>{a}</span>
              </AmenItem>
            ))}
          </AmenGrid> */}
        </Field>

        <Field style={{ gridColumn: 'span 2' }}>
          <Label htmlFor="desc">Նկարագրություն</Label>
          <Textarea id="desc" placeholder="Նկարագրություն" value={form.description} onChange={onChange('description')} />
        </Field>
      </Grid>

      <Actions>
        <Btn className="primary" onClick={save} disabled={loading}>{loading ? 'Բեռնում…' : 'Պահպանել'}</Btn>
        <Btn className="ghost" type="button" onClick={() => navigate('/admin/properties')}>Չեղարկել</Btn>
        {isEdit && (
          <Btn className="danger" type="button" onClick={onDelete} disabled={loading}>Ջնջել</Btn>
        )}
        <div style={{ marginLeft: 'auto', color: '#6b7280', alignSelf: 'center' }}>
          {isEdit ? `ID: ${current?.id ?? params.id}` : `Կարգավիճակ: ${labelForStatus(form.status)}`}
        </div>
      </Actions>
    </Page>
  );
}
