// src/data/db.js

import { apiUrl, API_BASE as API_ORIGIN } from '../lib/apiBase';

const nowTs = () => Date.now();
const genLocalId = () =>
  `loc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const toNumberOrNull = (v) =>
  v === '' || v == null ? null : Number.isFinite(+v) ? +v : null;

const isAuthError = (e) =>
  /401|unauthori[sz]ed|missing\/invalid.*auth/i.test(
    String(e?.message || e || '')
  );
const isNotFoundErr = (e) =>
  /404|not\s*found/i.test(String(e?.message || e || ''));

// ---------- helpers for names ----------

function pickAmenityName(a) {
  if (!a) return '';
  return a.name_hy || a.name_ru || a.name_en || a.code || '';
}
function pickTownName(t) {
  if (!t) return '';
  return t.name_hy || t.name_ru || t.name_en || '';
}
function pickRegionName(r) {
  if (!r) return '';
  return r.name_hy || r.name_ru || r.name_en || '';
}

// ---------- normalize property from server ----------

function adaptProperty(p) {
  if (!p) return null;

  // 1) Картинки: учитываем разные форматы с бэка
  const rawImages =
    Array.isArray(p.images) ? p.images :
    Array.isArray(p.PropertyImages) ? p.PropertyImages :
    Array.isArray(p.propertyImages) ? p.propertyImages :
    [];

  // 2) Панорамы: тоже разные варианты
  const rawPanos =
    Array.isArray(p.panoramas) ? p.panoramas :
    Array.isArray(p.Panoramas) ? p.Panoramas :
    Array.isArray(p.propertyPanoramas) ? p.propertyPanoramas :
    [];

  // 3) Удобства
  const rawAmenities =
    Array.isArray(p.amenities) ? p.amenities :
    Array.isArray(p.Amenities) ? p.Amenities :
    [];

  const imageUrls = rawImages
    .map((i) => {
      if (!i) return null;
      if (typeof i === 'string') return i;
      return i.url || i.image || i.src || null;
    })
    .filter(Boolean);

  const panoUrls = rawPanos
    .map((i) => {
      if (!i) return null;
      if (typeof i === 'string') return i;
      return i.url || i.image || i.src || null;
    })
    .filter(Boolean);

  const area_sq_m = p.area_sq_m ?? p.area ?? null;

  return {
    id: String(p.id ?? genLocalId()),
    title: p.title || '',
    description: p.description || '',
    type: p.type || '',
    status: p.status || '',
    price: toNumberOrNull(p.price),
    currency: p.currency || 'USD',
    beds: toNumberOrNull(p.beds),
    baths: toNumberOrNull(p.baths),
    area_sq_m,
    area: area_sq_m,
    sqft: p.sqft ?? null,
    floor: p.floor ?? null,
    lat: p.lat ?? null,
    lng: p.lng ?? null,
    region_id: p.region_id ?? null,
    town_id: p.town_id ?? null,
    image: p.cover_image || imageUrls[0] || '',
    images: imageUrls,
    panos: panoUrls,
    amenities: rawAmenities.map(pickAmenityName).filter(Boolean),
    Region: p.Region ? { ...p.Region, title: pickRegionName(p.Region) } : null,
    Town: p.Town ? { ...p.Town, title: pickTownName(p.Town) } : null,
    updatedAt: nowTs(),
    _local: Boolean(p._local), // будем фильтровать ниже
  };
}

// ---------- low-level API helpers ----------

async function apiGetJSON(path) {
  const r = await fetch(apiUrl(path), {
    cache: 'no-store',
    credentials: 'include',
  });
  const t = await r.text();
  if (!r.ok) throw new Error(t || `${r.status}`);
  return t ? JSON.parse(t) : null;
}

// может вернуть уже готовый Authorization-заголовок
function getAdminToken() {
  try {
    // Прямой заголовок ("Basic xxx" или "Bearer yyy")
    const direct = localStorage.getItem('pulse:authHeader');
    if (direct) return direct;

    // Старые варианты — просто токен, будем слать как Bearer
    for (const k of [
      'pulse:admin:token',
      'admin_token',
      'admin_jwt',
      'pulse_admin_token',
    ]) {
      const v = localStorage.getItem(k);
      if (v) return v;
    }
  } catch {}
  return '';
}

async function apiJSON(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {};
  if (body != null) headers['content-type'] = 'application/json';
  if (auth) {
    const tok = getAdminToken();
    if (tok) {
      // Если уже выглядит как "Basic xxx" или "Bearer xxx" — отправляем как есть
      if (/^(basic|bearer)\s/i.test(tok)) {
        headers.authorization = tok;
      } else {
        headers.authorization = `Bearer ${tok}`;
      }
    }
  }
  const res = await fetch(apiUrl(path), {
    method,
    headers,
    credentials: 'include',
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  let json = null;
  try {
    json = txt ? JSON.parse(txt) : null;
  } catch {}
  if (!res.ok) {
    throw new Error(json?.error || txt || `${res.status} ${path}`);
  }
  return json;
}

// ---------- local cache (только для сервера, без _local) ----------

const STORAGE_KEY = 'pulse:properties';
const STORAGE_DELETED = 'pulse:properties:deleted';

const cacheRead = () => {
  try {
    const a = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
};

const writeAndEmit = (arr = []) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    window.dispatchEvent(new Event('pulse:properties-changed'));
  } catch {}
};

function readDeleted() {
  try {
    const a = JSON.parse(localStorage.getItem(STORAGE_DELETED) || '[]');
    return new Set(Array.isArray(a) ? a.map(String) : []);
  } catch {
    return new Set();
  }
}
function writeDeleted(set) {
  try {
    localStorage.setItem(
      STORAGE_DELETED,
      JSON.stringify(Array.from(set || []))
    );
    window.dispatchEvent(new Event('pulse:properties-changed'));
  } catch {}
}
function markDeleted(id) {
  const s = readDeleted();
  s.add(String(id));
  writeDeleted(s);
}
function clearDeleted(id) {
  const s = readDeleted();
  s.delete(String(id));
  writeDeleted(s);
}

// публичный доступ к кэшу (например RecentProperties использует)
export function getPropertiesCached() {
  const raw = cacheRead();
  const filtered = (Array.isArray(raw) ? raw : []).filter((p) => !p?._local);

  // Чистим старые _local-объекты из стораджа
  if (filtered.length !== raw.length) {
    cacheWrite(filtered);
  }

  return filtered;
}

function cacheWrite(items = []) {
  const tomb = readDeleted();
  // НИКОГДА не храним _local в кэше
  const filtered = (Array.isArray(items) ? items : [])
    .filter((p) => !tomb.has(String(p.id)))
    .filter((p) => !p?._local);
  writeAndEmit(filtered);
}

function cacheUpsertOne(p) {
  if (!p) return;
  if (p._local) return; // не храним локальные
  const tomb = readDeleted();
  if (tomb.has(String(p.id))) return;
  const list = cacheRead();
  const i = list.findIndex((x) => String(x.id) === String(p.id));
  if (i >= 0) list[i] = { ...list[i], ...p, updatedAt: nowTs() };
  else list.unshift({ ...p, updatedAt: nowTs() });
  cacheWrite(list);
}

function cacheRemoveById(id) {
  cacheWrite(cacheRead().filter((p) => String(p.id) !== String(id)));
}

// ---------- high-level API ----------

export async function getProperties(params = {}) {
  let server = [];
  try {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, v);
    });
    const qs = q.toString();
    const data = await apiGetJSON(`api/properties${qs ? `?${qs}` : ''}`);

    const rawList = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data)
      ? data
      : [];

    server = rawList
      .map(adaptProperty)
      .filter(Boolean)
      .filter((p) => !p._local); // на всякий случай
  } catch (e) {
    console.error('[getProperties] server error, using cache only:', e);
  }

  const tomb = readDeleted();
  const filteredServer = server.filter((p) => !tomb.has(String(p.id)));

  const cached = cacheRead();
  const serverIds = new Set(filteredServer.map((p) => String(p.id)));

  // Берём из кэша только те, которых нет на сервере и которые не _local
  const extraFromCache = cached.filter(
    (p) => !serverIds.has(String(p.id)) && !p._local
  );

  const byId = new Map();
  for (const p of [...filteredServer, ...extraFromCache]) {
    byId.set(String(p.id), p);
  }

  const merged = Array.from(byId.values())
    .filter((p) => !tomb.has(String(p.id)))
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));

  cacheWrite(merged);
  return merged;
}

export async function getProperty(id) {
  try {
    const data = await apiGetJSON(`api/properties/${encodeURIComponent(id)}`);
    const adapted = adaptProperty(data);
    if (adapted && !adapted._local) {
      cacheUpsertOne(adapted);
    }
    return adapted;
  } catch (e) {
    // 404 — нормально для только что созданных локальных id
    if (!isNotFoundErr(e)) {
      console.error('[getProperty] using cache fallback:', e);
    }
    return (
      cacheRead().find((p) => String(p.id) === String(id) && !p._local) || null
    );
  }
}

export async function getPropertyImages(id) {
  const p = await getProperty(id);
  return Array.isArray(p?.images) ? p.images : [];
}

// ---------- PANOS ----------

function ensureLocalProp(id) {
  const props = cacheRead();
  let idx = props.findIndex((p) => String(p?.id) === String(id));
  if (idx === -1) {
    props.push({
      id: String(id),
      image: '',
      images: [],
      panos: [],
      updatedAt: nowTs(),
      _local: false,
    });
    idx = props.length - 1;
    writeAndEmit(props);
  }
  return { props, idx };
}

export const getPropertyPanos = async (id) => {
  const p = await getProperty(id);
  if (Array.isArray(p?.panos) && p.panos.length) return p.panos;

  // если с сервера нет — смотрим локальный кэш (старые данные)
  const { props, idx } = ensureLocalProp(id);
  return Array.isArray(props[idx].panos) ? props[idx].panos : [];
};
export const getPropertyPanoramas = getPropertyPanos;

export function getPropertyPanosLocal(id) {
  const { props, idx } = ensureLocalProp(id);
  return Array.isArray(props[idx].panos) ? props[idx].panos : [];
}

export async function getPropertyPanosCloud(id) {
  try {
    const p = await getProperty(id);
    return Array.isArray(p?.panos) ? p.panos : [];
  } catch {
    return getPropertyPanosLocal(id);
  }
}

export function setPropertyPanoramas(id, images = []) {
  const { props, idx } = ensureLocalProp(id);
  const clean = Array.isArray(images) ? images.filter(Boolean) : [];
  props[idx] = { ...props[idx], panos: clean, updatedAt: nowTs(), _local: false };
  writeAndEmit(props);
  try {
    window.dispatchEvent(
      new CustomEvent('pulse:panos-changed', {
        detail: { propertyId: String(id), count: clean.length },
      })
    );
  } catch {}
}

export async function addPropertyPanos(id, files = []) {
  if (!Array.isArray(files) || !files.length) return getPropertyPanosLocal(id);
  const { props, idx } = ensureLocalProp(id);
  const panos = Array.isArray(props[idx].panos)
    ? props[idx].panos.slice()
    : [];

  const fileToDataURL = (file) =>
    new Promise((resolve, reject) => {
      const rd = new FileReader();
      rd.onload = () => resolve(rd.result);
      rd.onerror = reject;
      rd.readAsDataURL(file);
    });

  for (const f of files) {
    if (!f || !f.type?.startsWith('image/')) continue;
    const dataUrl = await fileToDataURL(f);
    panos.push(dataUrl);
  }
  props[idx] = { ...props[idx], panos, updatedAt: nowTs(), _local: false };
  writeAndEmit(props);
  try {
    window.dispatchEvent(
      new CustomEvent('pulse:panos-changed', {
        detail: { propertyId: String(id), count: panos.length },
      })
    );
  } catch {}
  return panos;
}

export function removePropertyPano(id, removeIndex) {
  const { props, idx } = ensureLocalProp(id);
  const panos = Array.isArray(props[idx].panos)
    ? props[idx].panos.slice()
    : [];
  if (removeIndex >= 0 && removeIndex < panos.length) {
    panos.splice(removeIndex, 1);
    props[idx] = { ...props[idx], panos, updatedAt: nowTs(), _local: false };
    writeAndEmit(props);
    try {
      window.dispatchEvent(
        new CustomEvent('pulse:panos-changed', {
          detail: { propertyId: String(id), count: panos.length },
        })
      );
    } catch {}
  }
  return panos;
}

export async function syncLocalPanosToCloud() {
  // Пока оставим пустым — вся логика идёт через saveProperty
}

// ---------- SAVE / DELETE ----------

// ВАЖНО: Никаких _local тут, только сервер

export async function saveProperty(payload = {}) {
  const id = payload?.id;

  // Нормализация чисел: '', undefined, null → null, остальные → Number
  const num = (v) => toNumberOrNull(v);

  // Нормализация строковых массивов (для amenityCodes)
  const strArray = (arr) =>
    Array.isArray(arr) ? arr.map(String).filter(Boolean) : [];

  // Нормализация id удобств (числа)
  const idArray = (arr) =>
    Array.isArray(arr)
      ? arr
          .map((v) => {
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
          })
          .filter((v) => v != null)
      : [];

  // Картинки: бэкенду нужен массив объектов, хотя у нас часто просто строки
  const normalizeImages = (arr) => {
    if (!Array.isArray(arr)) return [];
    const out = [];
    arr.forEach((item, idx) => {
      if (!item) return;
      if (typeof item === 'string') {
        out.push({ url: item, sort_order: idx });
      } else if (typeof item === 'object') {
        const url = item.url || item.image || item.src;
        if (!url) return;
        const obj = { url, sort_order: item.sort_order ?? idx };
        if (typeof item.is_cover === 'boolean') obj.is_cover = item.is_cover;
        out.push(obj);
      }
    });
    return out;
  };

  const normalizePanos = (arr) => {
    if (!Array.isArray(arr)) return [];
    const out = [];
    arr.forEach((item, idx) => {
      if (!item) return;
      if (typeof item === 'string') {
        out.push({ url: item, sort_order: idx });
      } else if (typeof item === 'object') {
        const url = item.url || item.image || item.src;
        if (!url) return;
        out.push({ url, sort_order: item.sort_order ?? idx });
      }
    });
    return out;
  };

  const body = {
    title: payload.title,
    description: payload.description || '',
    type: payload.type || 'Apartment',
    status: payload.status || 'for_sale',

    price: num(payload.price),
    currency: payload.currency || 'USD',
    beds: num(payload.beds),
    baths: num(payload.baths),
    area_sq_m: num(payload.area_sq_m ?? payload.area),
    floor: num(payload.floor),
    lat: num(payload.lat),
    lng: num(payload.lng),
    region_id: num(payload.region_id),
    town_id: num(payload.town_id),

    cover_image: payload.image || payload.cover_image || '',

    // МАССИВЫ ОБЪЕКТОВ, как ждёт Joi на бэке
    images: normalizeImages(payload.images),
    panoramas: normalizePanos(payload.panoramas || payload.panos),

    amenityIds: idArray(payload.amenityIds),
    amenityCodes: strArray(payload.amenities),
  };

  try {
    const r = id
      ? await apiJSON(`api/properties/${encodeURIComponent(id)}`, {
          method: 'PUT',
          body,
          auth: true,
        })
      : await apiJSON('api/properties', {
          method: 'POST',
          body,
          auth: true,
        });

    const serverItem = r?.item || r;
    const adapted = adaptProperty(serverItem);

    if (!adapted) {
      throw new Error('Empty response from server');
    }

    if (id && String(id) !== String(adapted.id)) {
      cacheRemoveById(id);
      clearDeleted(id);
    }
    clearDeleted(adapted.id);
    cacheUpsertOne(adapted);
    return adapted;
  } catch (e) {
    console.error('[saveProperty] failed:', e);
    // Если не сохранилось на сервере — просто кидаем ошибку,
    // форма покажет "Չստացվեց պահել".
    throw e;
  }
}

export async function deleteProperty(id) {
  try {
    await apiJSON(`api/properties/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      auth: true,
    });
  } catch (e) {
    if (!(isAuthError(e) || isNotFoundErr(e))) {
      console.error('[deleteProperty] failed:', e);
    }
  }
  markDeleted(id);
  cacheRemoveById(id);
  return { ok: true, id };
}

export const API_BASE = API_ORIGIN;
