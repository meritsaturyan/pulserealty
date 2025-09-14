// src/data/db.js
import { db } from '../lib/firebase';
import {
  collection, getDocs, onSnapshot, doc, setDoc, deleteDoc, getDoc,
  serverTimestamp, query, orderBy, writeBatch
} from 'firebase/firestore';

const COLLECTION = 'properties';
const STORAGE_KEY = 'pulse:properties';

/* =========================
   КЭШ СВОЙСТВ (localStorage)
   ========================= */
const cacheWrite = (items = []) => {
  try {
    const prevRaw = localStorage.getItem(STORAGE_KEY) || '[]';
    const prev = JSON.parse(prevRaw);
    const prevArr = Array.isArray(prev) ? prev.filter(Boolean) : [];

    // id -> panos из предыдущего кэша
    const panoMap = new Map(
      prevArr.map(p => [String(p?.id), Array.isArray(p?.panos) ? p.panos : undefined])
    );

    // id, пришедшие из Firestore
    const incomingIds = new Set((Array.isArray(items) ? items : []).map(p => String(p?.id)));

    // 1) переносим локальные panos к объектам из Firestore
    const merged = (Array.isArray(items) ? items : []).map(p => {
      const keepPanos = panoMap.get(String(p?.id));
      return keepPanos ? { ...p, panos: keepPanos } : p;
    });

    // 2) добавляем локальные черновики, которых нет в Firestore
    for (const p of prevArr) {
      const id = String(p?.id);
      if (!incomingIds.has(id)) merged.push(p);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {}
};

export const getPropertiesCached = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
};

/* ===============
   Firestore CRUD
   =============== */
const normalizeSnap = (snap) =>
  snap.docs.map(d => {
    const data = d.data() || {};
    const updatedAt =
      data.updatedAt?.toMillis ? data.updatedAt.toMillis() :
      (typeof data.updatedAt === 'number' ? data.updatedAt : null);
    return { id: d.id, ...data, updatedAt };
  });

export async function getProperties() {
  try {
    const q = query(collection(db, COLLECTION), orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    const items = normalizeSnap(snap);
    cacheWrite(items);
    return getPropertiesCached();
  } catch {
    return getPropertiesCached();
  }
}

export async function getProperty(id) {
  const ref = doc(db, COLLECTION, String(id));
  const s = await getDoc(ref);
  return s.exists() ? { id: s.id, ...s.data() } : null;
}

export async function getPropertyImages(id) {
  const phCol = collection(db, COLLECTION, String(id), 'photos');
  const q = query(phCol, orderBy('idx', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => (d.data()?.src)).filter(Boolean);
}

export function subscribeProperties(callback) {
  const q = query(collection(db, COLLECTION), orderBy('updatedAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const items = normalizeSnap(snap);
    cacheWrite(items);
    callback(getPropertiesCached());
    window.dispatchEvent(new Event('pulse:properties-changed'));
  });
}

/* =======================================
   ЛОКАЛЬНОЕ ХРАНИЛИЩЕ + ПАНОРАМЫ (DataURL)
   ======================================= */
function readPropsLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || '[]';
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function writePropsLocal(arr) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {}
  window.dispatchEvent(new Event('pulse:properties-changed'));
}
function ensureLocalProp(id) {
  const props = readPropsLocal();
  let idx = props.findIndex(p => String(p?.id) === String(id));
  if (idx === -1) {
    props.push({ id: String(id), image: '', images: [], panos: [], updatedAt: Date.now() });
    idx = props.length - 1;
    writePropsLocal(props);
  }
  return { props, idx };
}
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const rd = new FileReader();
    rd.onload = () => resolve(rd.result);
    rd.onerror = reject;
    rd.readAsDataURL(file);
  });
}

/** Локально: добавить 360° фото; вернёт обновлённый массив panos */
export async function addPropertyPanos(id, files = []) {
  if (!files || !files.length) return [];
  const props = readPropsLocal();

  let idx = props.findIndex(p => String(p?.id) === String(id));
  if (idx === -1) {
    props.push({ id: String(id), images: [], panos: [] });
    idx = props.length - 1;
  }

  const panos = Array.isArray(props[idx].panos) ? props[idx].panos.slice() : [];
  for (const f of files) {
    if (!f || !f.type?.startsWith('image/')) continue;
    const dataUrl = await fileToDataURL(f);
    panos.push(dataUrl);
  }
  props[idx] = { ...props[idx], panos };
  writePropsLocal(props);

  try {
    window.dispatchEvent(new CustomEvent('pulse:panos-changed', {
      detail: { propertyId: String(id), count: panos.length }
    }));
  } catch {}

  return panos;
}

/** Локально: удалить 360° фото по индексу */
export function removePropertyPano(id, removeIndex) {
  const props = readPropsLocal();
  const idx = props.findIndex(p => String(p?.id) === String(id));
  if (idx === -1) return [];

  const panos = Array.isArray(props[idx].panos) ? props[idx].panos.slice() : [];
  if (removeIndex >= 0 && removeIndex < panos.length) {
    panos.splice(removeIndex, 1);
    props[idx] = { ...props[idx], panos };
    writePropsLocal(props);
    try {
      window.dispatchEvent(new CustomEvent('pulse:panos-changed', {
        detail: { propertyId: String(id), count: panos.length }
      }));
    } catch {}
  }
  return panos;
}

/** Локально: прочитать 360° фото */
export function getPropertyPanosLocal(id) {
  const props = readPropsLocal();
  const prop = props.find(p => String(p?.id) === String(id));
  return Array.isArray(prop?.panos) ? prop.panos : [];
}

/** Алиас для совместимости со старым импортом */
export const getPropertyPanos = getPropertyPanosLocal;
export const getPropertyPanoramas = getPropertyPanosLocal;

/** Полная замена массива панорам (локально) */
export function setPropertyPanoramas(id, images = []) {
  const { props, idx } = ensureLocalProp(id);
  const clean = Array.isArray(images) ? images.filter(Boolean) : [];
  props[idx] = { ...props[idx], panos: clean, updatedAt: Date.now() };
  writePropsLocal(props);
  try {
    window.dispatchEvent(new CustomEvent('pulse:panos-changed', {
      detail: { propertyId: String(id), count: clean.length }
    }));
  } catch {}
}

/* ==============================
   Firestore: панорамы (cloud)
   ============================== */

/** Прочитать панорамы из Firestore (подколлекция /panoramas) */
export async function getPropertyPanosCloud(id) {
  try {
    const phCol = collection(db, COLLECTION, String(id), 'panoramas');
    const qy = query(phCol, orderBy('idx', 'asc'));
    const snap = await getDocs(qy);
    return snap.docs.map(d => (d.data()?.src)).filter(Boolean);
  } catch {
    return [];
  }
}

/** Синхронизировать локальные панорамы в Firestore (/panoramas) */
export async function syncLocalPanosToCloud(id) {
  const local = getPropertyPanosLocal(id);
  const phCol = collection(db, COLLECTION, String(id), 'panoramas');

  // удалить старые
  const old = await getDocs(phCol);
  if (!old.empty) {
    const batchDel = writeBatch(db);
    old.forEach(d => batchDel.delete(d.ref));
    await batchDel.commit();
  }

  // записать новые
  if (Array.isArray(local) && local.length) {
    const CHUNK = 400;
    for (let i = 0; i < local.length; i += CHUNK) {
      const part = local.slice(i, i + CHUNK);
      const batch = writeBatch(db);
      part.forEach((src, j) => {
        const dref = doc(phCol);
        batch.set(dref, { idx: i + j, src });
      });
      await batch.commit();
    }
  }
}

/* ==============================
   Сохранение Property в Firestore
   ============================== */
   export async function saveProperty(payload) {
    const id = String(payload.id || Date.now());
    const allImgs = Array.isArray(payload.images) ? payload.images : [];
    const cover = allImgs[0] || payload.image || '';
  
    const main = {
      ...payload,
      id,
      image: cover,
      images: [],              // фото уходим в подколлекцию
      updatedAt: serverTimestamp(),
    };
  
    // 1) пишем документ
    const propRef = doc(db, COLLECTION, id);
    await setDoc(propRef, main, { merge: true });
  
    // 2) полностью пересобираем подколлекцию photos
    const phCol = collection(db, COLLECTION, id, 'photos');
  
    const old = await getDocs(phCol);
    if (!old.empty) {
      const batchDel = writeBatch(db);
      old.forEach(d => batchDel.delete(d.ref));
      await batchDel.commit();
    }
  
    if (allImgs.length) {
      const CHUNK = 450;
      for (let i = 0; i < allImgs.length; i += CHUNK) {
        const part = allImgs.slice(i, i + CHUNK);
        const batch = writeBatch(db);
        part.forEach((src, j) => {
          const dref = doc(phCol);
          batch.set(dref, { idx: i + j, src });
        });
        await batch.commit();
      }
    }
  
    // 3) ВАЖНО: синхронизируем локальный кэш и сохраняем panos
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || '[]';
      const props = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
      let idx = props.findIndex(p => String(p?.id) === id);
      if (idx === -1) {
        // если не было — создаём «черновик»
        props.push({ id, panos: [], images: [] });
        idx = props.length - 1;
      }
      const keepPanos = Array.isArray(props[idx].panos) ? props[idx].panos : [];
      // обновляем все поля из main, но panos оставляем как было
      props[idx] = { ...props[idx], ...main, id, panos: keepPanos, updatedAt: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(props));
    } catch {}
  
    // 4) оповестим слушателей и список
    window.dispatchEvent(new Event('pulse:properties-changed'));
  }
  

export async function deleteProperty(id) {
  const phCol = collection(db, COLLECTION, String(id), 'photos');
  const snap = await getDocs(phCol);
  if (!snap.empty) {
    const CHUNK = 450;
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += CHUNK) {
      const part = docs.slice(i, i + CHUNK);
      const batch = writeBatch(db);
      part.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  }

  // удалить и панорамы
  const panoCol = collection(db, COLLECTION, String(id), 'panoramas');
  const ps = await getDocs(panoCol);
  if (!ps.empty) {
    const CHUNK = 450;
    const docs = ps.docs;
    for (let i = 0; i < docs.length; i += CHUNK) {
      const part = docs.slice(i, i + CHUNK);
      const batch = writeBatch(db);
      part.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  }

  await deleteDoc(doc(db, COLLECTION, String(id)));
  window.dispatchEvent(new Event('pulse:properties-changed'));
}














