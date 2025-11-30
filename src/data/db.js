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

function adaptProperty(p) {
  if (!p) return null;


  const rawImages =
    Array.isArray(p.images) ? p.images :
    Array.isArray(p.PropertyImages) ? p.PropertyImages :
    Array.isArray(p.propertyImages) ? p.propertyImages :
    [];


  const rawPanos =
    Array.isArray(p.panoramas) ? p.panoramas :
    Array.isArray(p.Panoramas) ? p.Panoramas :
    Array.isArray(p.propertyPanoramas) ? p.propertyPanoramas :
    [];


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
    _local: Boolean(p._local),
  };
}

async function apiGetJSON(path) {
  const r = await fetch(apiUrl(path), {
    cache: 'no-store',
    credentials: 'include',
  });
  const t = await r.text();
  if (!r.ok) throw new Error(t || `${r.status}`);
  return t ? JSON.parse(t) : null;
}

function getAdminToken() {
  try {
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
    if (tok) headers.authorization = `Bearer ${tok}`;
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
  if (!res.ok) throw new Error(json?.error || txt || `${res.status} ${path}`);
  return json;
}

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


export function getPropertiesCached() {
  return cacheRead();
}

function cacheWrite(items = []) {
  const tomb = readDeleted();
  const filtered = (Array.isArray(items) ? items : []).filter(
    (p) => !tomb.has(String(p?.id))
  );
  writeAndEmit(filtered);
}
function cacheUpsertOne(p) {
  if (!p) return;
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



export async function getProperties(params = {}) {
  let server = [];
  try {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, v);
    });
    const qs = q.toString();
    const data = await apiGetJSON(`api/properties${qs ? `?${qs}` : ''}`);
    server = (
      Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : []
    ).map(adaptProperty);
  } catch {

  }

  const tomb = readDeleted();
  const filteredServer = server.filter((p) => !tomb.has(String(p.id)));

  const cached = cacheRead();
  const serverIds = new Set(filteredServer.map((p) => String(p.id)));
  const locals = cached.filter(
    (p) => p && (p._local || !serverIds.has(String(p.id)))
  );

  const byId = new Map();
  for (const p of [...locals, ...filteredServer]) byId.set(String(p.id), p);
  const merged = Array.from(byId.values())
    .filter((p) => !tomb.has(String(p.id)))
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));

  cacheWrite(merged);


  try {
    syncLocalDraftsToCloud();
  } catch {}

  return merged;
}

export async function getProperty(id) {
  try {
    const data = await apiGetJSON(`api/properties/${encodeURIComponent(id)}`);
    const adapted = adaptProperty(data);
    if (adapted) {
      cacheUpsertOne(adapted);
    }
    return adapted;
  } catch {
    return cacheRead().find((p) => String(p.id) === String(id)) || null;
  }
}

export async function getPropertyImages(id) {
  const p = await getProperty(id);
  return Array.isArray(p?.images) ? p.images : [];
}



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
      _local: true,
    });
    idx = props.length - 1;
    writeAndEmit(props);
  }
  return { props, idx };
}

const fileToDataURL = (file) =>
  new Promise((resolve, reject) => {
    const rd = new FileReader();
    rd.onload = () => resolve(rd.result);
    rd.onerror = reject;
    rd.readAsDataURL(file);
  });

export const getPropertyPanos = async (id) => {
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
  props[idx] = { ...props[idx], panos: clean, updatedAt: nowTs() };
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
  const panos = Array.isArray(props[idx].panos) ? props[idx].panos.slice() : [];
  for (const f of files) {
    if (!f || !f.type?.startsWith('image/')) continue;
    const dataUrl = await fileToDataURL(f);
    panos.push(dataUrl);
  }
  props[idx] = { ...props[idx], panos, updatedAt: nowTs() };
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
  const panos = Array.isArray(props[idx].panos) ? props[idx].panos.slice() : [];
  if (removeIndex >= 0 && removeIndex < panos.length) {
    panos.splice(removeIndex, 1);
    props[idx] = { ...props[idx], panos, updatedAt: nowTs() };
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

export async function syncLocalPanosToCloud(propertyId) {
  const id = String(propertyId || '');
  if (!id) return;


  const token = getAdminToken();
  if (!token) return;

  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

  const { props, idx } = ensureLocalProp(id);
  const current = props[idx];
  const panos = Array.isArray(current.panos) ? current.panos : [];
  if (!panos.length) return;

  try {

    const body = {
      items: panos.map((dataUrl, sort_order) => ({ dataUrl, sort_order })),
    };

    const res = await apiJSON(
      `api/properties/${encodeURIComponent(id)}/panoramas`,
      {
        method: 'PUT',
        body,
        auth: true,
      }
    );

    const items = Array.isArray(res?.items)
      ? res.items
      : Array.isArray(res)
      ? res
      : [];


    const serverUrls = items
      .map((i) => {
        if (!i) return null;
        if (typeof i === 'string') return i;
        return i.url || i.image || i.src || null;
      })
      .filter(Boolean);

    if (!serverUrls.length) return;


    props[idx] = {
      ...current,
      panos: serverUrls,
      updatedAt: nowTs(),

    };
    writeAndEmit(props);


    try {
      const fresh = await getProperty(id);
      if (fresh) cacheUpsertOne(fresh);
    } catch {

    }
  } catch (e) {

    if (isAuthError(e)) return;
    console.warn('[db] syncLocalPanosToCloud error', e);
  }
}



const normalizeMediaArray = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map((u, i) =>
      typeof u === 'string'
        ? { url: u, sort_order: i }
        : u && u.url
        ? { url: String(u.url), sort_order: i }
        : null
    )
    .filter(Boolean);

function buildPropertyBody(payload = {}) {
  return {
    title: payload.title,
    description: payload.description || '',
    type: payload.type || 'Apartment',
    status: payload.status || 'for_sale',
    price: payload.price ?? null,
    currency: payload.currency || 'USD',
    beds: payload.beds ?? null,
    baths: payload.baths ?? null,
    area_sq_m: payload.area_sq_m ?? payload.area ?? null,
    floor: payload.floor ?? null,
    lat: payload.lat ?? null,
    lng: payload.lng ?? null,
    region_id: payload.region_id ?? null,
    town_id: payload.town_id ?? null,
    cover_image: payload.image || payload.cover_image || '',
    images: normalizeMediaArray(payload.images),
    panoramas: normalizeMediaArray(payload.panoramas || payload.panos),
    amenityIds: [],
    amenityCodes: Array.isArray(payload.amenities)
      ? payload.amenities.map(String)
      : [],
  };
}

export async function saveProperty(payload = {}) {
  const id = payload?.id;
  const body = buildPropertyBody(payload);

  let serverItem = null;
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
    serverItem = r?.item || r;
  } catch (e) {

    console.warn('[db] saveProperty: fallback to local draft', e);
    const local = adaptProperty({
      ...body,
      id: id || genLocalId(),
      _local: true,
    });
    cacheUpsertOne(local);
    return local;
  }

  const adapted = adaptProperty(serverItem);
  if (!adapted) return null;

  if (id && String(id) !== String(adapted.id)) {
    cacheRemoveById(id);
    clearDeleted(id);
  }
  clearDeleted(adapted.id);
  cacheUpsertOne(adapted);
  return adapted;
}

export async function deleteProperty(id) {
  try {
    await apiJSON(`api/properties/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      auth: true,
    });
  } catch (e) {
    if (!(isAuthError(e) || isNotFoundErr(e))) {

    }
  }
  markDeleted(id);
  cacheRemoveById(id);
  return { ok: true, id };
}



async function syncLocalDraftsToCloud() {
  let token = '';
  try {
    token = getAdminToken();
  } catch {
    token = '';
  }
  if (!token) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

  const cached = cacheRead();
  const drafts = cached.filter((p) => p && p._local);

  if (!drafts.length) return;

  for (const draft of drafts) {
    try {
      const body = buildPropertyBody(draft);
      const r = await apiJSON('api/properties', {
        method: 'POST',
        body,
        auth: true,
      });
      const serverItem = r?.item || r;
      const adapted = adaptProperty(serverItem);
      if (!adapted) continue;

      cacheRemoveById(draft.id);
      clearDeleted(draft.id);
      clearDeleted(adapted.id);
      cacheUpsertOne(adapted);


      try {
        await syncLocalPanosToCloud(adapted.id);
      } catch {}
    } catch (e) {
      if (isAuthError(e)) break;
    }
  }
}

export const API_BASE = API_ORIGIN;
