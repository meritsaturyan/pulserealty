// backend/src/routes/properties.js
import { Router } from 'express';
import Joi from 'joi';
import { sequelize } from '../db/sequelize.js';
import {
  Property,
  PropertyImage,
  Panorama,
  Region,
  Town,
  Amenity,
} from '../db/models/index.js';
import { requireAdmin } from './auth.js';

const router = Router();


const buildInclude = () => ([
  { model: Region, attributes: ['id', 'name_en', 'name_ru', 'name_hy'] },
  { model: Town,   attributes: ['id', 'name_en', 'name_ru', 'name_hy'] },
  {
    model: Amenity,
    as: 'amenities',
    through: { attributes: [] },
    attributes: ['id','code','name_en','name_ru','name_hy'],
  },
  {
    model: PropertyImage,
    as: 'images',
    attributes: ['id','url','sort_order','is_cover'],
    separate: true,
    order: [['sort_order','ASC'],['id','ASC']],
  },
  {
    model: Panorama,
    as: 'panoramas',
    attributes: ['id','url','sort_order'],
    separate: true,
    order: [['sort_order','ASC'],['id','ASC']],
  },
]);


const urlLike = Joi.string().trim().custom((v, helpers) => {
  if (!v) return helpers.error('any.invalid');
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith('/')) return v;
  if (/^data:image\/[a-z0-9+.\-]+;base64,/i.test(v)) return v;
  return helpers.error('string.uri'); 
}, 'url-like validator')
.messages({ 'string.uri': 'url must be http(s), /path or data:image/* base64' });


const baseSchema = Joi.object({
  title: Joi.string().trim().min(2).max(300).required(),
  description: Joi.string().allow('', null),
  type: Joi.string().valid('Apartment','House','Villa','Land','Commercial','Office','Other').optional(),
  status: Joi.string().valid('for_sale','for_rent','sold','archived','reserved','other').optional(),
  price: Joi.number().min(0).allow(null),
  currency: Joi.string().valid('USD','AMD','EUR','RUB').default('USD'),
  beds: Joi.number().integer().min(0).allow(null),
  baths: Joi.number().integer().min(0).allow(null),
  area_sq_m: Joi.number().min(0).allow(null),
  floor: Joi.alternatives().try(Joi.number().integer(), Joi.string().trim().max(20)).allow(null),
  lat: Joi.number().allow(null),
  lng: Joi.number().allow(null),
  region_id: Joi.number().integer().allow(null),
  town_id: Joi.number().integer().allow(null),

  images: Joi.array().max(80).items(
    Joi.object({
      url: urlLike.required(),
      sort_order: Joi.number().integer().min(0).default(0),
      is_cover: Joi.boolean().default(false),
    })
  ).default([]),

  panoramas: Joi.array().max(80).items(
    Joi.object({
      url: urlLike.required(),
      sort_order: Joi.number().integer().min(0).default(0),
    })
  ).default([]),

  amenityIds: Joi.array().items(Joi.number().integer()).default([]),
  amenityCodes: Joi.array().items(Joi.string().trim()).default([]),
});

const adaptOut = (p) => (p ? (p.toJSON ? p.toJSON() : p) : null);

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(+(req.query.limit || 50), 200);
    const offset = Math.max(+(req.query.offset || 0), 0);

    const where = {};
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.type)   where.type   = String(req.query.type);

    const { rows, count } = await Property.findAndCountAll({
      where,
      include: buildInclude(),
      order: [['id', 'DESC']],
      limit,
      offset,
    });

    res.json({ ok: true, items: rows.map(adaptOut), total: count, limit, offset });
  } catch (e) {
    console.error('[GET /api/properties]', e);
    res.status(500).json({ ok: false, error: e.message || 'list failed' });
  }
});


router.get('/:id', async (req, res) => {
  try {
    const p = await Property.findByPk(req.params.id, { include: buildInclude() });
    if (!p) return res.status(404).json({ ok: false, error: 'not found' });
    res.json(adaptOut(p));
  } catch (e) {
    console.error('[GET /api/properties/:id]', e);
    res.status(500).json({ ok: false, error: e.message || 'get failed' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const body = await baseSchema.validateAsync(req.body || {}, { stripUnknown: true });

    const created = await Property.create({
      title: body.title,
      description: body.description || '',
      type: body.type || 'Apartment',
      status: body.status || 'for_sale',
      price: body.price ?? null,
      currency: body.currency || 'USD',
      beds: body.beds ?? null,
      baths: body.baths ?? null,
      area_sq_m: body.area_sq_m ?? null,
      floor: body.floor ?? null, 
      lat: body.lat ?? null,
      lng: body.lng ?? null,
      region_id: body.region_id ?? null,
      town_id: body.town_id ?? null,
    }, { transaction: t });


    let coverUrl = '';
    if (Array.isArray(body.images) && body.images.length) {
      const anyCoverMarked = body.images.some(i => !!i.is_cover);
      for (let i = 0; i < body.images.length; i++) {
        const img = body.images[i];
        const isCover = anyCoverMarked ? !!img.is_cover : i === 0;
        if (isCover && !coverUrl) coverUrl = img.url;
        await PropertyImage.create({
          property_id: created.id,
          url: img.url,
          sort_order: img.sort_order ?? i,
          is_cover: isCover,
        }, { transaction: t });
      }
    }


    if (Array.isArray(body.panoramas)) {
      for (let i = 0; i < body.panoramas.length; i++) {
        const pano = body.panoramas[i];
        await Panorama.create({
          property_id: created.id,
          url: pano.url,
          sort_order: pano.sort_order ?? i,
        }, { transaction: t });
      }
    }


    const amenIds = new Set();
    if (Array.isArray(body.amenityIds)) body.amenityIds.forEach(v => amenIds.add(Number(v)));
    if (Array.isArray(body.amenityCodes) && body.amenityCodes.length) {
      const list = await Amenity.findAll({ where: { code: body.amenityCodes }, transaction: t });
      list.forEach(a => amenIds.add(a.id));
    }
    if (amenIds.size) await created.setAmenities(Array.from(amenIds), { transaction: t });


    if (coverUrl) {
      await created.update({ cover_image: coverUrl }, { transaction: t });
    }

    await t.commit();

    const fresh = await Property.findByPk(created.id, { include: buildInclude() });
    res.status(201).json({ ok: true, item: adaptOut(fresh) });
  } catch (e) {
    await t.rollback();
    console.error('[POST /api/properties]', e);
    res.status(400).json({ ok: false, error: e.message || 'create failed' });
  }
});


router.put('/:id', requireAdmin, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = req.params.id;
    const body = await baseSchema.validateAsync(req.body || {}, { stripUnknown: true });

    const prop = await Property.findByPk(id, { transaction: t });
    if (!prop) return res.status(404).json({ ok: false, error: 'not found' });

    await prop.update({
      title: body.title,
      description: body.description || '',
      type: body.type || 'Apartment',
      status: body.status || 'for_sale',
      price: body.price ?? null,
      currency: body.currency || 'USD',
      beds: body.beds ?? null,
      baths: body.baths ?? null,
      area_sq_m: body.area_sq_m ?? null,
      floor: body.floor ?? null,
      lat: body.lat ?? null,
      lng: body.lng ?? null,
      region_id: body.region_id ?? null,
      town_id: body.town_id ?? null,
    }, { transaction: t });


    await PropertyImage.destroy({ where: { property_id: id }, transaction: t });

    let coverUrl = '';
    if (Array.isArray(body.images)) {
      const anyCoverMarked = body.images.some(i => !!i.is_cover);
      for (let i = 0; i < body.images.length; i++) {
        const img = body.images[i];
        const isCover = anyCoverMarked ? !!img.is_cover : i === 0;
        if (isCover && !coverUrl) coverUrl = img.url;
        await PropertyImage.create({
          property_id: id,
          url: img.url,
          sort_order: img.sort_order ?? i,
          is_cover: isCover,
        }, { transaction: t });
      }
    }


    await Panorama.destroy({ where: { property_id: id }, transaction: t });
    if (Array.isArray(body.panoramas)) {
      for (let i = 0; i < body.panoramas.length; i++) {
        const pano = body.panoramas[i];
        await Panorama.create({
          property_id: id,
          url: pano.url,
          sort_order: pano.sort_order ?? i,
        }, { transaction: t });
      }
    }


    const amenIds = new Set();
    if (Array.isArray(body.amenityIds)) body.amenityIds.forEach(v => amenIds.add(Number(v)));
    if (Array.isArray(body.amenityCodes) && body.amenityCodes.length) {
      const list = await Amenity.findAll({ where: { code: body.amenityCodes }, transaction: t });
      list.forEach(a => amenIds.add(a.id));
    }
    await prop.setAmenities(Array.from(amenIds), { transaction: t });


    await prop.update({ cover_image: coverUrl || null }, { transaction: t });

    await t.commit();

    const fresh = await Property.findByPk(id, { include: buildInclude() });
    res.json({ ok: true, item: adaptOut(fresh) });
  } catch (e) {
    await t.rollback();
    console.error('[PUT /api/properties/:id]', e);
    res.status(400).json({ ok: false, error: e.message || 'update failed' });
  }
});


router.delete('/:id', requireAdmin, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = req.params.id;


    await PropertyImage.destroy({ where: { property_id: id }, transaction: t });
    await Panorama.destroy({ where: { property_id: id }, transaction: t });

    const p = await Property.findByPk(id, { transaction: t });
    if (p) await p.setAmenities([], { transaction: t });

    await Property.destroy({ where: { id }, transaction: t });

    await t.commit();
    res.json({ ok: true });
  } catch (e) {
    await t.rollback();
    console.error('[DELETE /api/properties/:id]', e);
    res.status(400).json({ ok: false, error: e.message || 'delete failed' });
  }
});

export default router;
