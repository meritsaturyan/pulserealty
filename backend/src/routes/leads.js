import { Router } from 'express';
import Joi from 'joi';
import { createCallbackLead, createPropertyLead } from '../services/bitrix.js';
import { db, FieldValue } from '../services/firebase.js';

const router = Router();

/** 1) Callback lead */
const cbSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  phone: Joi.string().min(5).max(40).required(),
  comments: Joi.string().allow(''),
  propertyId: Joi.string().allow(''),
  pageUrl: Joi.string().uri().allow('')
});

router.post('/callback', async (req, res, next) => {
  try {
    const body = await cbSchema.validateAsync(req.body, { stripUnknown: true });

    const normalized = {
      ...body,
      comment: body.comment ?? body.comments ?? '',
    };
    await db().collection('leads_callbacks').add({
      ...normalized,
      createdAt: FieldValue.serverTimestamp(),
    });
    const result = await createCallbackLead(normalized);

    res.json({ ok: true, bitrix: result });
  } catch (err) { next(err); }
});

/** 2) Property lead */
const propLeadSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  phone: Joi.string().min(5).max(40).required(),
  email: Joi.string().email().allow(''),
  propertyId: Joi.string().required(),
  propertyTitle: Joi.string().allow(''),
  propertyUrl: Joi.string().uri().allow(''),
  priceUSD: Joi.number().min(0).allow(null),
  currency: Joi.string().valid('USD', 'AMD', 'EUR').default('USD'),
  comment: Joi.string().allow('')
});

router.post('/property', async (req, res, next) => {
  try {
    const body = await propLeadSchema.validateAsync(req.body, { stripUnknown: true });
    await db().collection('leads_properties').add({
      ...body,
      createdAt: FieldValue.serverTimestamp()
    });
    const result = await createPropertyLead(body);
    res.json({ ok: true, bitrix: result });
  } catch (err) { next(err); }
});

export default router;
