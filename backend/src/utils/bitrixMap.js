import slugify from 'slugify';

/** Карта значений согласно вашему ТЗ */
const TYPE_TO_BITRIX = { Apartment: '93', House: '97', Villa: '255', Land: '95' };
const STATUS_TO_BITRIX = { for_sale: '257', for_rent: '259' };

/** beds/baths — у вас «селекты» с фиксированными ID: пример для 1..8 / 1..3+ */
const BEDS_MAP = { 1: '131', 2: '133', 3: '135', 4: '137', 5: '139', 6: '141', 7: '143', 8: '145', '8+': '147' };
const BATHS_MAP = { 1: '149', 2: '151', 3: '153', '3+': '155' };

export function toBitrixProductFields(p) {
  const {
    external_id, title, address_full, region, town, street,
    property_type, listing_status, beds, baths,
    area_sqft, area_text,
    price, currency, description,
    lat, lng,
    image_urls, cover_image_url, images_order,
    updated_at
  } = p;

  // NAME/CODE
  const NAME = String(title || '').trim() || 'Untitled';
  const CODE = slugify(NAME, { lower: true, strict: true });

  const fields = {
    NAME,
    CODE,
    ACTIVE: 'Y',
    PRICE: Number(price || 0),
    CURRENCY_ID: (currency || 'USD').toUpperCase(),
    DESCRIPTION: String(description || ''),
    DESCRIPTION_TYPE: 'text',

    // поле-карта
    PROPERTY_159: String(external_id || ''), // external id
    'NAME-CODE': undefined, // в Bitrix NAME/CODE уже заданы выше

    PROPERTY_161: String(address_full || ''),
    PROPERTY_167: String(region || ''),
    PROPERTY_169: String(town || ''),
    PROPERTY_171: String(street || ''),

    PROPERTY_115: TYPE_TO_BITRIX[property_type] || undefined,
    PROPERTY_163: STATUS_TO_BITRIX[listing_status] || undefined,

    PROPERTY_129: BEDS_MAP[beds] || undefined, // rooms
    PROPERTY_131: BATHS_MAP[baths] || undefined, // bathrooms (в примере у вас было PROPERTY_131)

    PROPERTY_127: area_sqft != null ? String(area_sqft) : undefined,
    PROPERTY_165: String(area_text || ''),

    PROPERTY_173: updated_at || new Date().toISOString(),

    PROPERTY_175: lat != null ? String(lat) : undefined,
    PROPERTY_177: lng != null ? String(lng) : undefined,

    PROPERTY_179: Array.isArray(image_urls) ? JSON.stringify(image_urls) : undefined,
    PROPERTY_181: cover_image_url || undefined,
    PROPERTY_183: Array.isArray(images_order) ? JSON.stringify(images_order) : undefined
  };

  // Удаляем undefined, чтобы не слать пустые
  Object.keys(fields).forEach(k => fields[k] === undefined && delete fields[k]);
  return fields;
}
