// backend/src/utils/bitrixMap.js
import slugify from 'slugify';


const TYPE_TO_BITRIX = {
  apartment: '93',
  house: '97',
  villa: '255',
  land: '95',
};

const STATUS_TO_BITRIX = {
  for_sale: '257',
  sale: '257',
  sell: '257',
  for_rent: '259',
  rent: '259',
};


const BEDS_MAP = {
  1: '131',
  2: '133',
  3: '135',
  4: '137',
  5: '139',
  6: '141',
  7: '143',
  8: '145',
  '8+': '147',
};


const BATHS_MAP = {
  1: '149',
  2: '151',
  3: '153',
  '3+': '155',
};

const toLower = (s) => String(s ?? '').toLowerCase().trim();

function normalizeBeds(v) {
  if (v === '8+' || String(v).trim() === '8+') return '8+';
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  if (n >= 8) return '8+';
  return String(n);
}

function normalizeBaths(v) {
  if (v === '3+' || String(v).trim() === '3+') return '3+';
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  if (n >= 3) return '3+';
  return String(Math.min(n, 3));
}

function compact(obj) {
  Object.keys(obj).forEach((k) => {
    if (obj[k] === undefined) delete obj[k];
  });
  return obj;
}


export function toBitrixProductFields(p = {}) {
  const {
    external_id,
    title,
    address_full,
    region,
    town,
    street,
    property_type,
    listing_status,
    beds,
    baths,
    area_sqft,
    area_text,
    price,
    currency,
    description,
    lat,
    lng,
    image_urls,
    cover_image_url,
    images_order,
    updated_at,
  } = p;

  const NAME = (String(title ?? '').trim() || 'Untitled').slice(0, 255);
  const CODE = slugify(NAME, { lower: true, strict: true }).slice(0, 100);

  const typeId = TYPE_TO_BITRIX[toLower(property_type)];
  const statusId = STATUS_TO_BITRIX[toLower(listing_status)];

  const bedsKey = normalizeBeds(beds);
  const bathsKey = normalizeBaths(baths);

  const fields = {

    NAME,
    CODE,
    ACTIVE: 'Y',
    XML_ID: external_id || undefined, 
    PRICE: price != null ? Number(price) : undefined,
    CURRENCY_ID: (currency || 'USD').toUpperCase(),
    DESCRIPTION: String(description || ''),
    DESCRIPTION_TYPE: 'text',


    PROPERTY_159: external_id ? String(external_id) : undefined, 
    PROPERTY_161: address_full ? String(address_full) : undefined,
    PROPERTY_167: region ? String(region) : undefined,
    PROPERTY_169: town ? String(town) : undefined,
    PROPERTY_171: street ? String(street) : undefined,

    PROPERTY_115: typeId,   
    PROPERTY_163: statusId, 

    PROPERTY_129: bedsKey ? BEDS_MAP[bedsKey] : undefined,  
    PROPERTY_131: bathsKey ? BATHS_MAP[bathsKey] : undefined, 

    PROPERTY_127: area_sqft != null ? String(area_sqft) : undefined,
    PROPERTY_165: area_text ? String(area_text) : undefined,

    PROPERTY_173: updated_at || new Date().toISOString(),
    PROPERTY_175: lat != null ? String(lat) : undefined,
    PROPERTY_177: lng != null ? String(lng) : undefined,


    PROPERTY_179: Array.isArray(image_urls) ? JSON.stringify(image_urls) : undefined,
    PROPERTY_181: cover_image_url || undefined,
    PROPERTY_183: Array.isArray(images_order) ? JSON.stringify(images_order) : undefined,
  };

  return compact(fields);
}

export { TYPE_TO_BITRIX, STATUS_TO_BITRIX, BEDS_MAP, BATHS_MAP };
