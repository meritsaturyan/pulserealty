// backend/src/services/bitrix.js
import axios from 'axios';

const {
    BITRIX_BASE,
    BITRIX_USER_ID,
    BITRIX_WEBHOOK,
    BITRIX_LEAD_ADD_PATH = 'crm.lead.add.json',
    BITRIX_PRODUCT_ADD_PATH = 'catalog.product.add.json',
    BITRIX_PRODUCT_UPDATE_PATH = 'catalog.product.update.json',
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
        const { data } = await axios.post(url, payload, { timeout: 5000 });
        if (data && data.error) {
            // Bitrix вернул ошибку в теле
            const e = new Error(`${data.error}: ${data.error_description || 'Unknown Bitrix error'}`);
            e.status = 401;
            throw e;
        }
        return data;
    } catch (err) {
        // добавим больше контекста
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

/**
 * 1) Callback lead (Покупатель просит «ПЕРЕЗВОНИТЬ»)
 * Поля из ТЗ:
 * NAME, PHONE[], COMMENTS, UF_CRM_1756217953009 (propertyId), UF_CRM_1756218020552 (pageUrl)
 */
export async function createCallbackLead({
    name,
    phone,
    comments = '',
    propertyId = '',
    pageUrl = '',
}) {
    const payload = {
        fields: {
            TITLE: 'Նոր լիդ',
            NAME: name,
            PHONE: [{ VALUE: phone, VALUE_TYPE: 'WORK' }],
            COMMENTS: comments,
            UF_CRM_1756217953009: propertyId || undefined,
            UF_CRM_1756218020552: pageUrl || undefined,
        },
    };
    return bitrixPost(BITRIX_LEAD_ADD_PATH, payload);
}

/**
 * 2) Заявка по конкретному объекту (PropertyDetails)
 * ТЗ:
 * NAME, PHONE[], EMAIL[], UF_CRM_1756217953009 (propertyId),
 * UF_CRM_1756218197249 (propertyTitle), UF_CRM_1756218282587 (propertyUrl),
 * OPPORTUNITY (цена), CURRENCY_ID, UF_CRM_PROP_CURRENCY, COMMENTS
 */
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
        fields.CURRENCY_ID = 'USD'; // по ТЗ цена в USD
    }

    return bitrixPost(BITRIX_LEAD_ADD_PATH, { fields });
}

/**
 * 3) Каталог — добавление продукта (объекта)
 * Маппинг полей из ТЗ:
 * external_id => PROPERTY_159
 * title => NAME (+ CODE = slug)
 * address_full => PROPERTY_161
 * region => PROPERTY_167
 * town => PROPERTY_169
 * street => PROPERTY_171
 * property_type => PROPERTY_115 (Apartment-93 / House-97 / Villa-255 / Land-95)
 * listing_status => PROPERTY_163 (for_sale-257 / for_rent-259)
 * beds => PROPERTY_129 (значения списков см. ТЗ)
 * baths => PROPERTY_131 (в ТЗ было PROPERTY_129 второй раз — используем отдельное поле 131)
 * area_sqft => PROPERTY_127
 * area_text => PROPERTY_165
 * price => PRICE
 * currency => CURRENCY_ID (USD/AMD/EUR)
 * description => DESCRIPTION (+ DESCRIPTION_TYPE="text")
 * lat => PROPERTY_175
 * lng => PROPERTY_177
 * image_urls[] (JSON) => PROPERTY_179
 * cover_image_url => PROPERTY_181
 * images_order[] (JSON) => PROPERTY_183
 * updated_at (ISO) => PROPERTY_173
 */
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

// Простейшие маппинги списков для beds/baths (если нужно — подстрой под свои значения)
function mapBeds(n) {
    // 1 => 131, 2 => 133, 3 => 135, 4 => 137, 5 => 139, 6 => 141, 7 => 143, 8+ => 147
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
    // 1 => 149, 2 => 151, 3 => 153, 3+ => 155
    const num = Number(n) || 0;
    if (num <= 1) return '149';
    if (num === 2) return '151';
    if (num >= 3) return '153'; // или '155' для 3+, при желании скорректируй
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

export async function bitrixUpdateProduct(productId, inputFields = {}) {
    if (!productId) {
        throw new Error('bitrixUpdateProduct: productId is required');
    }
    // Bitrix update API: catalog.product.update.json
    // Принимает { id, fields: { ... } }
    return bitrixPost(BITRIX_PRODUCT_UPDATE_PATH, {
        id: productId,
        fields: inputFields,
    });
}



