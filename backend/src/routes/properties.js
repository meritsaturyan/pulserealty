import { Router } from 'express';
import Joi from 'joi';
import { bitrixAddProduct, bitrixUpdateProduct } from '../services/bitrix.js';
import { toBitrixProductFields } from '../utils/bitrixMap.js';

const router = Router();

/** POST /api/properties/bitrix/sync
 * Тело — один объект или массив объектов с вашими полями (см. toBitrixProductFields)
 * Передавайте заголовок X-Sync-Token: <SYNC_TOKEN> для защиты
 */
const singleSchema = Joi.object({
  external_id: Joi.string().required(),
  title: Joi.string().required(),
  address_full: Joi.string().allow(''),
  region: Joi.string().allow(''),
  town: Joi.string().allow(''),
  street: Joi.string().allow(''),
  property_type: Joi.string().valid('Apartment', 'House', 'Villa', 'Land').required(),
  listing_status: Joi.string().valid('for_sale', 'for_rent').required(),
  beds: Joi.alternatives(Joi.number().integer().min(1).max(8), Joi.string().valid('8+')),
  baths: Joi.alternatives(Joi.number().integer().min(1).max(3), Joi.string().valid('3+')),
  area_sqft: Joi.number().min(0).allow(null),
  area_text: Joi.string().allow(''),
  price: Joi.number().min(0).required(),
  currency: Joi.string().valid('USD', 'AMD', 'EUR').default('USD'),
  description: Joi.string().allow(''),
  lat: Joi.number().allow(null),
  lng: Joi.number().allow(null),
  image_urls: Joi.array().items(Joi.string().uri()),
  cover_image_url: Joi.string().uri().allow(''),
  images_order: Joi.array().items(Joi.string()),
  updated_at: Joi.string().isoDate()
});

router.post('/bitrix/sync', async (req, res, next) => {
  try {
    if ((req.get('X-Sync-Token') || '') !== (process.env.SYNC_TOKEN || '')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const incoming = Array.isArray(req.body) ? req.body : [req.body];
    const clean = [];
    for (const item of incoming) {
      clean.push(await singleSchema.validateAsync(item, { stripUnknown: true }));
    }

    const results = [];
    for (const p of clean) {
      const fields = toBitrixProductFields(p);
      // Здесь примитивно: пробуем add; если внешний ID уже есть — можно вызывать update
      // Для корректного update нужен ID продукта в Bitrix; если он у вас сохр., вызывайте updateProduct(id, ...)
      const resAdd = await bitrixAddProduct(fields);
      results.push({ external_id: p.external_id, add: resAdd });
    }

    res.json({ ok: true, count: results.length, results });
  } catch (err) { next(err); }
});

export default router;
