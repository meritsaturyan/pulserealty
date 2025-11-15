// src/utils/formatters.js
export function pickAmenityName(a) {
    if (!a) return '';
    if (typeof a === 'string') return a;
    return a.name_hy || a.name_ru || a.name_en || a.code || String(a.id || '');
}

export function regionTitle(p) {
    return p?.region_title || p?.Region?.name_hy || p?.Region?.name_ru || p?.Region?.name_en || '';
}

export function townTitle(p) {
    return p?.town_title || p?.Town?.name_hy || p?.Town?.name_ru || p?.Town?.name_en || '';
}
