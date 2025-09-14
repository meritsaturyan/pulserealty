// src/admin/PropertyForm.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getProperties,
  getPropertiesCached,
  getPropertyImages,
  saveProperty,
  getPropertyPanoramas,
  getPropertyPanos,
  setPropertyPanoramas,
  syncLocalPanosToCloud,
} from '../data/db';



  

import PanoUploader from '../components/PanoUploader';


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

const PhotosHead = styled.div`
  display:flex; justify-content:space-between; align-items:center;
  gap:12px; margin-bottom:8px;
`;
const Help = styled.div`font-size:12px; color:#6b7280;`;

const ThumbsRow = styled.div`
  display:flex;
  flex-wrap:nowrap;
  gap:8px;

  height: var(--thumbH);
  width:100%;
  overflow-x:auto;
  overflow-y:hidden;
  -webkit-overflow-scrolling:touch;

  scrollbar-width:auto;
  scrollbar-color:#cbd5e1 #f1f5f9;
  &::-webkit-scrollbar{ height:10px; }
  &::-webkit-scrollbar-track{ background:#f1f5f9; border-radius:9999px; }
  &::-webkit-scrollbar-thumb{ background:#cbd5e1; border-radius:9999px; }
  &::-webkit-scrollbar-thumb:hover{ background:#94a3b8; }
`;

const Thumb = styled.div`
  position:relative;
  flex:0 0 var(--cellW);
  height: calc(var(--thumbH) - 16px);
  border-radius:8px;
  overflow:hidden;
  background:#eee;
  user-select:none;

  img{ width:100%; height:100%; object-fit:cover; display:block; }

  /* кнопки управления на миниатюре */
  .btns{
    position:absolute; left:6px; right:6px; bottom:6px;
    display:flex; gap:6px; justify-content:space-between;
  }
  .btn{
    background:rgba(0,0,0,.65); color:#fff; border:none; border-radius:6px;
    padding:4px 6px; font-size:12px; cursor:pointer;
  }
  .del{
    position:absolute; top:6px; right:6px;
    background:rgba(0,0,0,.65); color:#fff; border:none; border-radius:6px;
    padding:4px 6px; font-size:12px; cursor:pointer;
  }

  &.dragging{ opacity:.7; outline:2px solid #111319; }
  &.drag-over{ outline:2px dashed #111319; }
`;

const CoverBadge = styled.span`
  position:absolute; left:6px; top:6px;
  background:rgba(17,19,25,.85); color:#fff; font-size:10px;
  padding:2px 6px; border-radius:999px;
`;

const ScrollControls = styled.div`
  display:flex; align-items:center; justify-content:space-between;
  gap:8px; margin-top:8px;
`;
const ArrowBtn = styled.button`
  min-width:36px; height:28px; border:none; border-radius:8px;
  background:#e5e7eb; color:#111; font-weight:700; cursor:pointer;
  opacity:${p => p.disabled ? 0.5 : 1}; pointer-events:${p => p.disabled ? 'none' : 'auto'};
`;

const Grid = styled.div`
  display:grid;
  grid-template-columns: minmax(0,1fr) minmax(0,1fr);
  gap:12px;

  @media (max-width:900px){
    grid-template-columns:1fr;
  }
`;
const Field = styled.div`display:flex; flex-direction:column; gap:6px; min-width:0;`;
const Label = styled.label`font-size:13px; color:#6b7280;`;
const Input = styled.input`width:100%; padding:10px 12px; border:1px solid #e5e7eb; border-radius:8px;`;
const Textarea = styled.textarea`width:100%; min-height:120px; padding:10px 12px; border:1px solid #e5e7eb; border-radius:8px; resize:vertical;`;
const Select = styled.select`width:100%; padding:10px 12px; border:1px solid #e5e7eb; border-radius:8px;`;
const Actions = styled.div`margin-top:16px; display:flex; gap:10px;`;
const Btn = styled.button`
  padding:10px 14px; border-radius:8px; border:none; font-weight:600; cursor:pointer;
  &:first-child{ background:#111319; color:#fff; }
  &:last-child{ background:#f3f4f6; }
`;

/* ===== Добавлено для удобств ===== */
const AmenGrid = styled.div`
  display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px 16px;
  @media (max-width:600px){ grid-template-columns:1fr; }
`;
const AmenItem = styled.label`
  display:flex; align-items:center; gap:10px; font-size:14px; color:#374151;
  input{ width:18px; height:18px; }
`;
const AMENITIES = [
  'Օդորակիչ',
  'Սպա և մերսում',
  'Սպորտդահլիճ',
  'Լողավազան',
  'Ահազանգման համակարգ',
  'Կենտրոնական ջեռուցում',
  'Ինտերնետ',
  'Լվացքատուն',
  'Թույլատրվում են կենդանիներ',
  'Պատուհանի վարագույրներ',
  'Անվճար Wi-Fi',
  'Ավտոկայանատեղի',
];

/* ===== Справочники ===== */
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

const readFileAsDataURL = (file) =>
  new Promise((resolve, reject) => {
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

export default function PropertyForm() {
  const params = useParams();
  const navigate = useNavigate();
  const isEdit = params.id && params.id !== 'new';

  


  const [all, setAll] = useState(() => getPropertiesCached());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.resolve(getProperties())
      .then(items => { if (alive) setAll(Array.isArray(items) ? items : []); })
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
    status: current?.status || 'For Sale',
    type: current?.type || 'Apartment',
    price: current?.price ?? '',
    beds: current?.beds ?? '',
    baths: current?.baths ?? '',
    sqft: current?.sqft ?? current?.area ?? '',
    region: current?.region || '',
    town: current?.town || '',
    street: current?.street || '',
    description: current?.description || '',
    images: current?.images || (current?.image ? [current.image] : []),
    floor: current?.floor || '',
    amenities: Array.isArray(current?.amenities) ? current.amenities : [],
  }));

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
      } catch { }
    })();
  }, [current?.id]);

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

  const updateArrows = () => {
    const el = rowRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanLeft(el.scrollLeft > 0);
    setCanRight(el.scrollLeft < max - 1);
  };

  const onFiles = async (files) => {
    const list = Array.from(files).slice(0, 80);
    const out = [];
    for (const file of list) {
      try {
        const raw = await readFileAsDataURL(file);
        const compressed = await compressDataUrl(raw, 1600, 1600, 0.8);
        out.push(compressed);
      } catch { }
    }
    if (out.length) setForm(prev => ({ ...prev, images: [...(prev.images || []), ...out] }))
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
  }, [form.images?.length]);

  const nudge = (dir) => {
    const el = rowRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 360, behavior: 'smooth' });
  };

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
  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const onDragEnter = (i) => {
    if (dragIdx === null || dragIdx === i) return;
    setOverIdx(i);
  };
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

  const moveLeft  = (i) => setForm(prev => ({ ...prev, images: moveItem(prev.images || [], i, Math.max(0, i - 1)) }));
  const moveRight = (i) => setForm(prev => ({ ...prev, images: moveItem(prev.images || [], i, Math.min((prev.images?.length || 1) - 1, i + 1)) }));
  const makeCover = (i) => setForm(prev => ({ ...prev, images: moveItem(prev.images || [], i, 0) }));


  const save = async () => {
    if (!form.title.trim()) { alert('Գրեք վերնագիր'); return; }
    if (!form.price || Number(form.price) < 0) { alert('Գրեք գինը'); return; }
    if (!form.region) { alert('Ընտրեք մարզը'); return; }
  
    const id = isEdit ? (current?.id ?? params.id) : draftId;
  
    // если id сменился, перенесем временные панорамы
    try {
      const oldId = String(propId);
      const newId = String(id);
      if (oldId !== newId) {
        const draftPanos = getPropertyPanos(oldId) || [];
        if (draftPanos.length) setPropertyPanoramas(newId, draftPanos);
      }
    } catch (_) {}
  
    const payload = {
      ...current,
      ...form,
      id,
      image: (form.images && form.images[0]) || '',
      sqft: form.sqft,
      area: form.sqft,
      updatedAt: new Date().toISOString(),
    };
  
    try {
      await saveProperty(payload);
  
      // синхронизируем локальные панорамы (localStorage) в Firestore /panoramas
      try {
        await syncLocalPanosToCloud(id);
        window.dispatchEvent(new CustomEvent('pulse:panos-changed', {
          detail: { propertyId: String(id) }
        }));
      } catch (e) {
        console.error('Failed to sync panos to cloud', e);
      }
  
      window.dispatchEvent(new Event('pulse:properties-changed'));
      alert('Պահպանված է');
      navigate('/admin/properties');
    } catch (e) {
      console.error(e);
      alert('Չստացվեց պահել Firestore-ում');
    }
  };
  
    
  

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

        <Input
          id="photos"
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => onFiles(e.target.files)}
        />

        {!!(form.images && form.images.length) && (
          <>
            <ThumbsRow ref={rowRef}>
              {form.images.map((src, i) => (
                <Thumb
                  key={i}
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
            <option value="For Sale">Վաճառք</option>
            <option value="For Rent">Վարձով</option>
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
          <Input id="price" type="number" placeholder="Գին" value={form.price} onChange={onChange('price')} />
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

        {/* Блок выбора удобств */}
        <Field style={{ gridColumn: 'span 2' }}>
          <Label>Հարմարություններ</Label>
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
          </AmenGrid>
        </Field>

        <Field style={{ gridColumn: 'span 2' }}>
          <Label htmlFor="desc">Նկարագրություն</Label>
          <Textarea id="desc" placeholder="Նկարագրություն" value={form.description} onChange={onChange('description')} />
        </Field>

      </Grid>

      <Actions>
        <Btn onClick={save} disabled={loading}>{loading ? 'Բեռնում…' : 'Պահպանել'}</Btn>
        <Btn type="button" onClick={() => navigate('/admin/properties')}>Չեղարկել</Btn>
      </Actions>
    </Page>
  );
}


















