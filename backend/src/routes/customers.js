// backend/src/routes/customers.js
import { Router } from 'express';
import Joi from 'joi';
import { Op } from 'sequelize';
import { Customer } from '../db/models/index.js';
import { sequelize } from '../db/sequelize.js';

export default function buildCustomersRoutes(io) {
  const r = Router();
  const chatNsp = io?.of?.('/chat');


  const DIALECT = (() => {
    try { return sequelize.getDialect?.() || ''; } catch { return ''; }
  })();
  const CI_LIKE = DIALECT === 'postgres' ? Op.iLike : Op.like;


  const createSchema = Joi.object({
    full_name: Joi.string().trim().min(1),
    name: Joi.string().trim().min(1),

    email: Joi.string().email().allow(null, ''),
    phone: Joi.string().trim().min(3).required(),
    note: Joi.string().allow('', null),


    threadId: Joi.string().trim().allow('', null),
    source: Joi.string().trim().allow('', null),
    page: Joi.string().trim().allow('', null),
    propertyTitle: Joi.string().trim().allow('', null),
    propertyId: Joi.alternatives().try(Joi.string(), Joi.number()).allow('', null),
  }).custom((v, helpers) => {
    if (!v.full_name && !v.name) {
      return helpers.error('any.custom', { message: 'full_name (или name) обязателен' });
    }
    return v;
  });


  r.post('/', async (req, res) => {
    try {
      const data = await createSchema.validateAsync(req.body, { stripUnknown: true });

      const payload = {
        full_name: (data.full_name || data.name || '').trim(),
        email: (data.email || '').trim(),
        phone: (data.phone || '').trim(),
        note: data.note || '',


        threadId: data.threadId || null,
        source: data.source || null,
        page: data.page || null,
        propertyTitle: data.propertyTitle || null,
        propertyId: data.propertyId ?? null,
      };

      const created = await Customer.create(payload);


      try {
        const createdAt =
          created.created_at || created.createdAt || new Date().toISOString();

        const eventPayload = {
          id: created.id,
          ...payload,
          created_at: createdAt,
        };

        chatNsp?.emit?.('customers:new', eventPayload);

        chatNsp?.to?.('admins')?.emit?.('customers:new', eventPayload);


        if (payload.threadId) {
          const upd = {
            id: String(payload.threadId),
            threadId: String(payload.threadId),
            user: {
              name: payload.full_name,
              email: payload.email,
              phone: payload.phone,
            },
          };
          chatNsp?.emit?.('thread:update', upd);
          chatNsp?.to?.('admins')?.emit?.('thread:update', upd);
        }
      } catch (e) {
        console.warn('[customers] realtime emit failed:', e?.message || e);
      }

      res.set('cache-control', 'no-store');
      return res.status(201).json({ ok: true, id: created.id, item: created });
    } catch (e) {
      console.error('[POST /api/customers] failed:', e);
      const msg = e?.message || 'save failed';
      const code =
        (e?.isJoi || String(msg).includes('обязателен')) ? 400 : 500;
      return res.status(code).json({ ok: false, error: msg });
    }
  });


  r.get('/', async (req, res) => {
    try {
      const { q, limit = 1000, offset = 0 } = req.query;

      const where = {};
      if (q) {
        const s = String(q).trim();
        if (s) {
          where[Op.or] = [
            { full_name: { [CI_LIKE]: `%${s}%` } },
            { email:     { [CI_LIKE]: `%${s}%` } },
            { phone:     { [CI_LIKE]: `%${s}%` } },
            { note:      { [CI_LIKE]: `%${s}%` } },
          ];
        }
      }

      const itemsRaw = await Customer.findAll({
        where,
        order: [['id', 'DESC']],
        limit: Number(limit),
        offset: Number(offset),
      });

      const items = itemsRaw.map((c) => {
        const plain = c.get ? c.get({ plain: true }) : c;
        const createdAt =
          plain.created_at || plain.createdAt || c.createdAt || null;

        return {
          id: plain.id,
          full_name: plain.full_name || '',
          email: plain.email || '',
          phone: plain.phone || '',
          note: plain.note || '',


          threadId: plain.threadId || null,
          source: plain.source || null,
          page: plain.page || null,
          propertyTitle: plain.propertyTitle || null,
          propertyId: plain.propertyId ?? null,

          created_at: createdAt,
          createdAt: createdAt,
        };
      });

      res.set('cache-control', 'no-store');
      return res.json({ ok: true, items });
    } catch (e) {
      console.error('[GET /api/customers] failed:', e);
      return res.status(500).json({ ok: false, error: e?.message || 'list failed' });
    }
  });

  return r;
}
