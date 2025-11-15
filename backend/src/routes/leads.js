// backend/src/routes/leads.js
import { Router } from 'express';
import Joi from 'joi';
import { Op } from 'sequelize';
import { Lead, Customer, Property } from '../db/models/index.js';
import { createCallbackLead, createPropertyLead } from '../services/bitrix.js';

const router = Router();

const phoneRegex = /^[0-9+()\-.\s]{5,40}$/;

const cbSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  phone: Joi.string().trim().pattern(phoneRegex).required(),
  comment: Joi.string().allow('', null),
  comments: Joi.string().allow('', null),
  propertyId: Joi.string().trim().allow('', null),
  pageUrl: Joi.string().uri().allow('', null),
});

const propLeadSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  phone: Joi.string().trim().pattern(phoneRegex).required(),
  email: Joi.string().trim().email().allow('', null),
  propertyId: Joi.string().trim().required(),
  propertyTitle: Joi.string().trim().allow('', null),
  propertyUrl: Joi.string().uri().allow('', null),
  priceUSD: Joi.number().min(0).allow(null),
  currency: Joi.string().valid('USD', 'AMD', 'EUR').default('USD'),
  comment: Joi.string().allow('', null),
});

const sellSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  phone: Joi.string().trim().pattern(phoneRegex).required(),
  email: Joi.string().trim().email().allow('', null),
  propertyType: Joi.string().trim().allow('', null),
  dealType: Joi.string().trim().allow('', null),
  note: Joi.string().allow('', null),
  pageUrl: Joi.string().uri().allow('', null),
});

const normalizePhone = (s = '') => String(s).replace(/[^\d+]/g, '');
const lower = (s = '') => String(s || '').toLowerCase();
const toMs = (d) => (d instanceof Date ? d.getTime() : (d ? new Date(d).getTime() : Date.now()));


router.post('/callback', async (req, res) => {
  const t = await Lead.sequelize.transaction();
  try {
    const body = await cbSchema.validateAsync(req.body || {}, { stripUnknown: true });

    const payload = {
      name: body.name.trim(),
      phone: body.phone.trim(),
      phoneNormalized: normalizePhone(body.phone),
      comment: body.comment ?? body.comments ?? '',
      propertyId: String(body.propertyId || '').trim(),
      pageUrl: body.pageUrl || '',
      referer: req.headers.referer || '',
      origin: req.headers.origin || '',
      ua: req.headers['user-agent'] || '',
      source: 'callback',
    };

    let customer = await Customer.findOne({ where: { phone: payload.phone }, transaction: t });
    if (!customer) {
      customer = await Customer.create(
        {
          full_name: payload.name,
          email: '',
          phone: payload.phone,
          note: payload.comment || '',
        },
        { transaction: t }
      );
    }

    const property_id =
      payload.propertyId && /^\d+$/.test(payload.propertyId) ? Number(payload.propertyId) : null;

    const lead = await Lead.create(
      {
        property_id,
        customer_id: customer.id,
        source: 'callback',
        status: 'new',
        message: JSON.stringify({

          name: payload.name,
          phone: payload.phone,
          email: '',

          comment: payload.comment,
          pageUrl: payload.pageUrl,
          referer: payload.referer,
          origin: payload.origin,
          ua: payload.ua,
        }),
      },
      { transaction: t }
    );

    let bitrixOk = false;
    let bitrix = null;
    try {
      bitrix = await createCallbackLead(payload);
      bitrixOk = true;
    } catch (e) {
      console.warn('[leads/callback] Bitrix failed:', e?.message || e);
    }

    await t.commit();

    try {
      const chatNsp = req.app?.get('io')?.of('/chat');
      chatNsp?.to('admins')?.emit('leads:new', { id: lead.id, source: 'callback' });
    } catch {}

    return res.json({ ok: true, id: lead.id, bitrixOk, bitrix });
  } catch (err) {
    await t.rollback();
    console.error('[POST /api/leads/callback]', err);
    return res.status(400).json({ ok: false, error: err.message || 'validation failed' });
  }
});


router.post('/property', async (req, res) => {
  const t = await Lead.sequelize.transaction();
  try {
    const body = await propLeadSchema.validateAsync(req.body || {}, { stripUnknown: true });

    const payload = {
      name: body.name.trim(),
      phone: body.phone.trim(),
      phoneNormalized: normalizePhone(body.phone),
      email: lower(body.email || '').trim(),
      propertyId: body.propertyId,
      propertyTitle: body.propertyTitle || '',
      propertyUrl: body.propertyUrl || '',
      priceUSD: body.priceUSD ?? null,
      currency: body.currency,
      comment: body.comment || '',
      referer: req.headers.referer || '',
      origin: req.headers.origin || '',
      ua: req.headers['user-agent'] || '',
      source: 'property',
    };

    let customer = await Customer.findOne({ where: { phone: payload.phone }, transaction: t });
    if (!customer) {
      customer = await Customer.create(
        {
          full_name: payload.name,
          email: payload.email,
          phone: payload.phone,
          note: payload.comment || '',
        },
        { transaction: t }
      );
    }

    const property_id = /^\d+$/.test(payload.propertyId) ? Number(payload.propertyId) : null;

    const lead = await Lead.create(
      {
        property_id,
        customer_id: customer.id,
        source: 'property',
        status: 'new',
        message: JSON.stringify({

          name: payload.name,
          phone: payload.phone,
          email: payload.email,


          propertyTitle: payload.propertyTitle,
          propertyUrl: payload.propertyUrl,
          priceUSD: payload.priceUSD,
          currency: payload.currency,
          comment: payload.comment,
          referer: payload.referer,
          origin: payload.origin,
          ua: payload.ua,
        }),
      },
      { transaction: t }
    );

    let bitrixOk = false;
    let bitrix = null;
    try {
      bitrix = await createPropertyLead(payload);
      bitrixOk = true;
    } catch (e) {
      console.warn('[leads/property] Bitrix failed:', e?.message || e);
    }

    await t.commit();

    try {
      const chatNsp = req.app?.get('io')?.of('/chat');
      chatNsp?.to('admins')?.emit('leads:new', { id: lead.id, source: 'property' });
    } catch {}

    return res.json({ ok: true, id: lead.id, bitrixOk, bitrix });
  } catch (err) {
    await t.rollback();
    console.error('[POST /api/leads/property]', err);
    return res.status(400).json({ ok: false, error: err.message || 'validation failed' });
  }
});


router.post('/sell', async (req, res) => {
  const t = await Lead.sequelize.transaction();
  try {
    const body = await sellSchema.validateAsync(req.body || {}, { stripUnknown: true });

    const payload = {
      name: body.name.trim(),
      phone: body.phone.trim(),
      phoneNormalized: normalizePhone(body.phone),
      email: lower(body.email || '').trim(),
      propertyType: body.propertyType || '',
      dealType: body.dealType || '',
      note: body.note || '',
      pageUrl: body.pageUrl || '',
      referer: req.headers.referer || '',
      origin: req.headers.origin || '',
      ua: req.headers['user-agent'] || '',
      source: 'sell',
    };

    let customer = await Customer.findOne({ where: { phone: payload.phone }, transaction: t });
    if (!customer) {
      customer = await Customer.create(
        {
          full_name: payload.name,
          email: payload.email,
          phone: payload.phone,
          note: payload.note || '',
        },
        { transaction: t }
      );
    }

    const lead = await Lead.create(
      {
        property_id: null,
        customer_id: customer.id,
        source: 'sell',
        status: 'new',
        message: JSON.stringify({

          name: payload.name,
          phone: payload.phone,
          email: payload.email,


          propertyType: payload.propertyType,
          dealType: payload.dealType,
          note: payload.note,
          pageUrl: payload.pageUrl,
          referer: payload.referer,
          origin: payload.origin,
          ua: payload.ua,
        }),
      },
      { transaction: t }
    );

    await t.commit();

    try {
      const chatNsp = req.app?.get('io')?.of('/chat');
      chatNsp?.to('admins')?.emit('sell:new', { id: lead.id });
    } catch {}

    return res.json({ ok: true, id: lead.id });
  } catch (err) {
    await t.rollback();
    console.error('[POST /api/leads/sell]', err);
    return res.status(400).json({ ok: false, error: err.message || 'validation failed' });
  }
});


router.get('/sell', async (_req, res) => {
  try {
    const itemsRaw = await Lead.findAll({
      where: { source: 'sell' },
      order: [['id', 'DESC']],
      limit: 1000,

      include: [
        { model: Customer, required: false, attributes: ['full_name', 'email', 'phone'] },
      ],
    });

    const items = itemsRaw.map((l) => {
      const plain = l.get ? l.get({ plain: true }) : l;

      let ext = {};
      try {
        const m = plain.message;
        if (m && typeof m === 'string') ext = JSON.parse(m) || {};
        else if (m && typeof m === 'object') ext = m;
      } catch {
        ext = {};
      }

      const c = plain.customer || {};

      return {
        id: plain.id,
        createdAt: toMs(plain.created_at || plain.createdAt),

        name: ext.name || c.full_name || '',
        phone: ext.phone || c.phone || '',
        email: ext.email || c.email || '',
        propertyType: ext.propertyType || '',
        dealType: ext.dealType || '',
        note: ext.note || '',
      };
    });

    res.set('cache-control', 'no-store');
    return res.json({ ok: true, items });
  } catch (e) {
    console.error('[GET /api/leads/sell]', e);
    return res.status(500).json({ ok: false, error: e?.message || 'list failed' });
  }
});

export default router;
