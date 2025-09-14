// backend/src/routes/customers.js
import { Router } from 'express';
import { db, FieldValue } from '../services/firebase.js';

const COLLECTION = process.env.FIRESTORE_COLLECTION_CUSTOMERS || 'customers';

const router = Router();

/**
 * Создание карточки клиента из формы Details
 * body: { name, email, phone, threadId? }
 */
router.post('/', async (req, res) => {
  try {
    const { name = '', email = '', phone = '', threadId = '' } = req.body || {};

    if (!name.trim() || !phone.trim()) {
      return res.status(400).json({ ok: false, error: 'name and phone are required' });
    }

    const payload = {
      name: String(name).trim(),
      email: String(email || '').trim(),
      phone: String(phone).trim(),
      threadId: String(threadId || '').trim(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      source: 'details',
    };

    await db().collection(COLLECTION).add(payload);
    return res.json({ ok: true });
  } catch (e) {
    console.error('[POST /api/customers]', e);
    return res.status(500).json({ ok: false, error: e.message || 'create failed' });
  }
});

/**
 * Список клиентов (для админки)
 */
router.get('/', async (_req, res) => {
  try {
    const snap = await db()
      .collection(COLLECTION)
      .orderBy('createdAt', 'desc')
      .limit(500)
      .get();

    const items = snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
    res.set('cache-control', 'no-store');
    return res.json({ ok: true, items });
  } catch (e) {
    console.error('[GET /api/customers]', e);
    return res.status(500).json({ ok: false, error: e.message || 'list failed' });
  }
});

export default router;


