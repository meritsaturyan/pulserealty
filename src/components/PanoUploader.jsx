// src/components/PanoUploader.jsx
import { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import {
  getPropertyPanosLocal,
  getPropertyPanosCloud,
  setPropertyPanoramas,
  removePropertyPano,
  syncLocalPanosToCloud,
} from '../data/db';

const Wrap = styled.div`border:1px solid #e5e7eb;border-radius:12px;padding:12px;background:#fff;`;
const Title = styled.div`font-weight:700;margin-bottom:10px;`;
const Controls = styled.div`
  display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;
  input[type=file]{display:none;}
  label,button{padding:8px 12px;border-radius:8px;border:1px solid #d1d5db;background:#fff;cursor:pointer;font-weight:600;}
`;
const Small = styled.div`margin-top:6px;color:#6b7280;font-size:12px;`;
const Row = styled.div`display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;`;
const Thumb = styled.div`
  position:relative;width:140px;height:90px;border-radius:8px;overflow:hidden;background:#f3f4f6;box-shadow:0 1px 3px rgba(0,0,0,.06);
  img{width:100%;height:100%;object-fit:cover;display:block;}
  button.remove{
    position:absolute;top:6px;right:6px;border:none;background:rgba(0,0,0,.55);color:#fff;border-radius:9999px;width:26px;height:26px;cursor:pointer;
  }
`;

const getLang = () => document.documentElement.lang || localStorage.getItem('lang') || 'hy';
const TXT = {
  hy: {
    title: '360° պանորամաներ',
    choose: 'Ընտրել ֆայլեր',
    paste: 'Կպցնել (Ctrl/⌘+V)',
    clear: 'Մաքրել բոլորը',
    sync: 'Սինխրոնացնել',
    hint: 'Վերբեռնեք equirectangular (2:1), օրինակ՝ 6000×3000։ Մասնավորապես JPG/PNG/WebP ֆորմատներով։',
    nothing: 'Պանորամաներ դեռ չկան',
    errSome: (n)=>`Հետևյալ ֆայլերը չեն աջակցվում և չեն ավելացվել: ${n}`,
  },
  ru: {
    title: 'Панорамы 360°',
    choose: 'Выбрать файлы',
    paste: 'Вставить (Ctrl/⌘+V)',
    clear: 'Очистить все',
    sync: 'Синхронизировать',
    hint: 'Загружайте equirectangular (2:1), напр. 6000×3000. Рекомендуемые форматы: JPG/PNG/WebP.',
    nothing: 'Панорам пока нет',
    errSome: (n)=>`Эти файлы не поддерживаются и не добавлены: ${n}`,
  },
  en: {
    title: '360° panoramas',
    choose: 'Choose files',
    paste: 'Paste (Ctrl/⌘+V)',
    clear: 'Clear all',
    sync: 'Sync',
    hint: 'Upload equirectangular (2:1), e.g. 6000×3000. Preferred formats: JPG/PNG/WebP.',
    nothing: 'No panoramas yet',
    errSome: (n)=>`Unsupported files skipped: ${n}`,
  },
};

function isDisplayable(type='') {
  return /image\/(jpeg|jpg|png|webp)/i.test(type);
}

async function fileToDataURLSmart(file) {
  const toDataURL = (blob) =>
    new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(blob);
    });

  if (isDisplayable(file.type)) {
    return await toDataURL(file);
  }


  try {
    const bmp = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bmp, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    return dataUrl;
  } catch {

    throw new Error('unsupported');
  }
}

export default function PanoUploader({ propertyId }) {
  const lang = getLang();
  const t = TXT[lang] || TXT.hy;

  const [panos, setPanos] = useState([]);
  const hasPanos = panos.length > 0;

  const load = useCallback(async () => {
    let local = [];
    try { local = getPropertyPanosLocal(propertyId) || []; } catch {}
    if (!Array.isArray(local)) local = [];
    setPanos(local);

    if (!local.length) {
      try {
        const cloud = await getPropertyPanosCloud(propertyId);
        if (Array.isArray(cloud) && cloud.length) setPanos(cloud);
      } catch {}
    }
  }, [propertyId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onChange = (e) => {
      const pid = e?.detail?.propertyId;
      if (!pid || String(pid) === String(propertyId)) {
        try {
          const cur = getPropertyPanosLocal(propertyId) || [];
          setPanos(Array.isArray(cur) ? cur : []);
        } catch {}
      }
    };
    window.addEventListener('pulse:panos-changed', onChange);
    return () => window.removeEventListener('pulse:panos-changed', onChange);
  }, [propertyId]);

  const appendPanoramas = async (filesOrBlobs=[]) => {
    const current = Array.isArray(panos) ? panos.slice() : [];
    const added = [];
    const failed = [];

    for (const f of filesOrBlobs) {
      try {
        const url = await fileToDataURLSmart(f);
        if (url) added.push(url);
      } catch {
        failed.push(f.name || 'file');
      }
    }

    if (added.length) {
      const next = [...current, ...added];
      await setPropertyPanoramas(propertyId, next);
      setPanos(next);
    }

    if (failed.length) {
      alert(t.errSome(failed.join(', ')));
    }
  };

  const onFiles = async (evt) => {
    const list = Array.from(evt?.target?.files || []);
    if (!list.length) return;
    await appendPanoramas(list);
    try { if (evt?.target) evt.target.value = ''; } catch {}
  };

  const onPaste = async (evt) => {
    const items = Array.from(evt.clipboardData?.items || []);
    const imgs = [];
    for (const it of items) {
      if (it.kind === 'file') {
        const f = it.getAsFile?.();
        if (f) imgs.push(f);
      }
    }
    if (!imgs.length) return;
    await appendPanoramas(imgs);
  };

  const onRemove = async (idx) => {
    try {
      const next = panos.slice();
      next.splice(idx, 1);
      await setPropertyPanoramas(propertyId, next);
      setPanos(next);
    } catch {}
  };

  const onClearAll = async () => {
    await setPropertyPanoramas(propertyId, []);
    setPanos([]);
  };

  const onSync = async () => {
    try {
      await syncLocalPanosToCloud(propertyId);
      await load();
    } catch (e) {
      console.warn('[PanoUploader] sync error:', e);
    }
  };

  return (
    <Wrap onPaste={onPaste}>
      <Title>{t.title}</Title>

      <Controls>
        <label>
          <input
            type="file"

            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={onFiles}
          />
          {t.choose}
        </label>
        <button type="button" onClick={onSync}>{t.sync}</button>
        <button type="button" onClick={onClearAll} disabled={!hasPanos}>{t.clear}</button>
      </Controls>

      <Small>{t.hint}</Small>
      {!hasPanos && <Small style={{marginTop:8}}>{t.nothing}</Small>}

      {hasPanos && (
        <Row>
          {panos.map((src, i) => (
            <Thumb key={`${i}-${src.slice(0,25)}`}>
              <img src={src} alt={`pano-${i}`} />
              <button className="remove" type="button" onClick={() => onRemove(i)}>×</button>
            </Thumb>
          ))}
        </Row>
      )}
    </Wrap>
  );
}
