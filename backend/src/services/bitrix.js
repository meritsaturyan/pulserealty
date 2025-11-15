// backend/src/services/bitrix.js
import axios from 'axios';

const {
  BITRIX_BASE,
  BITRIX_USER_ID,
  BITRIX_WEBHOOK,
  BITRIX_LEAD_ADD_PATH = 'crm.lead.add.json',
  BITRIX_PRODUCT_ADD_PATH = 'catalog.product.add.json',
  BITRIX_PRODUCT_UPDATE_PATH = 'catalog.product.update.json',
  BITRIX_PRODUCT_LIST_PATH = 'catalog.product.list.json',
} = process.env;

function ensureEnv() {
  if (!BITRIX_BASE || !BITRIX_USER_ID || !BITRIX_WEBHOOK) {
    throw new Error(
      'Bitrix env is not configured. Set BITRIX_BASE, BITRIX_USER_ID, BITRIX_WEBHOOK in .env'
    );
  }
}

function buildUrl(path) {
  // https://domain/rest/{userId}/{webhook}/{path}
  return `${BITRIX_BASE.replace(/\/$/, '')}/${BITRIX_USER_ID}/${BITRIX_WEBHOOK}/${path}`;
}

async function bitrixPost(path, payload) {
  ensureEnv();
  const url = buildUrl(path);
  try {
    const { data } = await axios.post(url, payload, { timeout: 10000 });
    if (data && data.error) {
      const e = new Error(
        `${data.error}: ${data.error_description || 'Unknown Bitrix error'}`
      );
      e.status = 400;
      e.data = data;
      throw e;
    }
    return data;
  } catch (err) {
    if (err.response) {
      const { status, data } = err.response;
      const e = new Error(
        `Bitrix ${status}: ${data?.error || 'ERR'} - ${data?.error_description || 'request failed'}`
      );
      e.status = status;
      e.data = data;
      throw e;
    }
    throw err;
  }
}


export async function createCallbackLead({
  name,
  phone,
  comment,
  comments,
  propertyId = '',
  pageUrl = '',
}) {
  const commentsFinal = comment ?? comments ?? '';
  const payload = {
    fields: {
      TITLE: 'Նոր լիդ',
      NAME: name,
      PHONE: [{ VALUE: phone, VALUE_TYPE: 'WORK' }],
      COMMENTS: commentsFinal,
      UF_CRM_1756217953009: propertyId || undefined,
      UF_CRM_1756218020552: pageUrl || undefined,
    },
  };
  return bitrixPost(BITRIX_LEAD_ADD_PATH, payload);
}


export async function createPropertyLead({
  name,
  phone,
  email = '',
  propertyId,
  propertyTitle = '',
  propertyUrl = '',
  priceUSD = null,
  currency = 'USD',
  comment = '',
}) {
  const fields = {
    TITLE: 'Նոր լիդ',
    NAME: name,
    PHONE: [{ VALUE: phone, VALUE_TYPE: 'WORK' }],
    UF_CRM_1756217953009: propertyId,
    UF_CRM_1756218197249: propertyTitle || undefined,
    UF_CRM_1756218282587: propertyUrl || undefined,
    COMMENTS: comment || '',
    UF_CRM_PROP_CURRENCY: currency || 'USD',
  };

  if (email) {
    fields.EMAIL = [{ VALUE: email, VALUE_TYPE: 'WORK' }];
  }
  if (priceUSD != null) {
    fields.OPPORTUNITY = Number(priceUSD) || 0;
    fields.CURRENCY_ID = 'USD'; // в ТЗ цена передаётся в USD
  }

  return bitrixPost(BITRIX_LEAD_ADD_PATH, { fields });
}



function toSlug(s = '') {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function mapPropertyType(v) {
  const x = String(v || '').toLowerCase();
  if (x === 'apartment') return '93';
  if (x === 'house') return '97';
  if (x === 'villa') return '255';
  if (x === 'land') return '95';
  return undefined;
}

function mapListingStatus(v) {
  const x = String(v || '').toLowerCase();
  if (x === 'for_sale' || x === 'sale' || x === 'sell') return '257';
  if (x === 'for_rent' || x === 'rent') return '259';
  return undefined;
}


function mapBeds(n) {
  const num = Number(n) || 0;
  if (num <= 1) return '131';
  if (num === 2) return '133';
  if (num === 3) return '135';
  if (num === 4) return '137';
  if (num === 5) return '139';
  if (num === 6) return '141';
  if (num === 7) return '143';
  return '147'; 
}
function mapBaths(n) {
  const num = Number(n) || 0;
  if (num <= 1) return '149';
  if (num === 2) return '151';
  if (num >= 3) return '153'; 
  return '153';
}


export async function bitrixAddProduct(input) {
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
    currency = 'USD',
    description,
    lat,
    lng,
    image_urls,
    cover_image_url,
    images_order,
    updated_at,
  } = input || {};

  const fields = {
    NAME: title || 'Untitled',
    CODE: toSlug(title || external_id || Date.now()),
    ACTIVE: 'Y',
    PRICE: price != null ? Number(price) : undefined,
    CURRENCY_ID: currency || 'USD',
    DESCRIPTION: description || '',
    DESCRIPTION_TYPE: 'text',
    XML_ID: external_id || undefined, 
    PROPERTY_159: external_id || undefined,
    PROPERTY_161: address_full || undefined,
    PROPERTY_167: region || undefined,
    PROPERTY_169: town || undefined,
    PROPERTY_171: street || undefined,
    PROPERTY_115: mapPropertyType(property_type),
    PROPERTY_163: mapListingStatus(listing_status),
    PROPERTY_129: beds != null ? mapBeds(beds) : undefined,
    PROPERTY_131: baths != null ? mapBaths(baths) : undefined,
    PROPERTY_127: area_sqft != null ? String(area_sqft) : undefined,
    PROPERTY_165: area_text || undefined,
    PROPERTY_173: updated_at || new Date().toISOString(),
    PROPERTY_175: lat != null ? String(lat) : undefined,
    PROPERTY_177: lng != null ? String(lng) : undefined,
    PROPERTY_179: Array.isArray(image_urls) ? JSON.stringify(image_urls) : undefined,
    PROPERTY_181: cover_image_url || undefined,
    PROPERTY_183: Array.isArray(images_order) ? JSON.stringify(images_order) : undefined,
  };

  return bitrixPost(BITRIX_PRODUCT_ADD_PATH, { fields });
}


export async function bitrixFindProductIdByExternalId(external_id) {
  if (!external_id) return null;
  const payload = {
    filter: {
      xmlId: external_id, 
      
      XML_ID: external_id,
    },
    select: ['id', 'xmlId', 'name'],
    start: -1,
  };
  const data = await bitrixPost(BITRIX_PRODUCT_LIST_PATH, payload);
  const items = data?.result?.items || data?.result || [];
  if (!Array.isArray(items) || items.length === 0) return null;
 
  const first = items[0];
  return first.id || first.ID || null;
}


export async function bitrixUpdateProduct(arg1, arg2) {
  
  if (arg1 && typeof arg1 === 'object' && !Array.isArray(arg1)) {
    const { external_id, fields } = arg1 || {};
    if (!external_id) {
      throw new Error('bitrixUpdateProduct: external_id is required when calling with object');
    }
    const productId = await bitrixFindProductIdByExternalId(external_id);
    if (!productId) {
      throw new Error(`bitrixUpdateProduct: product not found for external_id=${external_id}`);
    }
    return bitrixPost(BITRIX_PRODUCT_UPDATE_PATH, { id: productId, fields });
  }

  
  const productId = arg1;
  const inputFields = arg2 || {};
  if (!productId) {
    throw new Error('bitrixUpdateProduct: productId is required');
  }
  return bitrixPost(BITRIX_PRODUCT_UPDATE_PATH, { id: productId, fields: inputFields });
}
