// src/components/PanoUploader.jsx
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import {
    getPropertyPanos,
    setPropertyPanoramas,
    removePropertyPano,
  } from '../data/db';
  

const Wrap = styled.div`
  border:1px dashed #d1d5db;
  border-radius:10px;
  padding:12px;
  margin-top:12px;
  background:#fafafa;
`;

const Title = styled.div`
  font-weight:700; margin-bottom:10px; color:#1A3D4D;
`;

const Row = styled.div`
  display:flex; gap:12px; align-items:center; flex-wrap:wrap;
`;

const Thumb = styled.div`
  position:relative;
  width:120px; height:60px;    /* 2:1, чтобы соответствовать equirectangular */
  border-radius:8px; overflow:hidden;
  border:1px solid #e5e7eb; background:#fff;

  img{ width:100%; height:100%; object-fit:cover; display:block; }

  .del{
    position:absolute; top:6px; right:6px;
    border:none; background:rgba(0,0,0,.55); color:#fff;
    border-radius:6px; padding:4px 6px; cursor:pointer;
  }
  .badge{
    position:absolute; left:6px; bottom:6px;
    background:rgba(17,19,25,.85); color:#fff; font-size:10px;
    padding:2px 6px; border-radius:999px;
  }
`;

/** helper: читаем File -> dataURL */
const fileToDataURL = (file) =>
  new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });

  const compressDataUrl = (dataUrl, maxW = 4096, maxH = 2048, quality = 0.8) =>
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


  export default function PanoUploader({ propertyId }) {
    const [items, setItems] = useState([]);
    const inputRef = useRef(null);
  
    // первичная загрузка + обновление по событию
    useEffect(() => {
      const refresh = () => setItems(getPropertyPanos(propertyId) || []);
      refresh();
      const onChange = (e) => {
        const pid = e?.detail?.propertyId;
        if (!pid || String(pid) === String(propertyId)) refresh();
      };
      window.addEventListener('pulse:panos-changed', onChange);
      return () => window.removeEventListener('pulse:panos-changed', onChange);
    }, [propertyId]);
  
    const onFiles = async (e) => {
        const files = Array.from(e.target.files || []).filter(f => f && f.type?.startsWith('image/'));
        if (!files.length) return;
      
        // текущие локальные панорамы
        const current = getPropertyPanos(propertyId) || [];
        const toAdd = [];
      
        for (const f of files) {
          try {
            const raw = await fileToDataURL(f);
      
            // 1) первичное сжатие до 4096×2048
            let out = await compressDataUrl(raw, 4096, 2048, 0.8);
      
            // 2) если всё ещё крупно (> ~950KB), ужмём сильнее
            const approxBytes = Math.ceil(out.length * 0.75); // грубая оценка base64→bytes
            if (approxBytes > 950 * 1024) {
              out = await compressDataUrl(out, 3000, 1500, 0.75);
            }
      
            toAdd.push(out);
          } catch {}
        }
      
        const merged = [...current, ...toAdd];
      
        // записываем целиком массив (и шлём событие из db.js)
        setPropertyPanoramas(propertyId, merged);
        setItems(merged);
      
        if (inputRef.current) inputRef.current.value = '';
      };
      
  
    const onRemove = (i) => {
      const updated = removePropertyPano(propertyId, i);
      if (Array.isArray(updated)) setItems(updated);
    };
  
    return (
      <Wrap>
        <Title>360° панорамы</Title>
        <Row style={{ marginBottom: 10 }}>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onFiles}
          />
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            Загрузите equirectangular (2:1), например 6000×3000 — превью появятся ниже.
          </div>
        </Row>
  
        {!!items.length && (
          <Row>
            {items.map((src, i) => (
              <Thumb key={i} title={`Պանորամա #${i + 1}`}>
                <img src={src} alt={`pano-${i}`} />
                <button className="del" type="button" onClick={() => onRemove(i)}>✕</button>
                <span className="badge">{i + 1}</span>
              </Thumb>
            ))}
          </Row>
        )}
      </Wrap>
    );
  }
  


