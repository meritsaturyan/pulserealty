// src/admin/propertyStore.js
import seed from '../data/properties';


const KEY = 'properties_store_v1';


export function getAll() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return seed.slice(); 
}


function persist(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}


function nextId(list) {
  return list.length ? Math.max(...list.map(p => Number(p.id) || 0)) + 1 : 1;
}


export function upsert(item) {
  const list = getAll();
  if (item.id) {
    const idx = list.findIndex(p => String(p.id) === String(item.id));
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...item };
    } else {
      list.push(item);
    }
  } else {
    list.push({ ...item, id: nextId(list) });
  }
  persist(list);
}


export function removeById(id) {
  const list = getAll().filter(p => String(p.id) !== String(id));
  persist(list);
}


export function resetToSeed() {
  persist(seed.slice());
}


export function findById(id) {
  return getAll().find(p => String(p.id) === String(id));
}
