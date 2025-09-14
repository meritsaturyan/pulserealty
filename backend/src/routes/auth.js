// src/routes/auth.js
import { Router } from 'express';
import Joi from 'joi';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, FieldValue } from '../services/firebase.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const USERS_COL =
  process.env.FIRESTORE_COLLECTION_USERS || 'users';

// Валидации
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(100).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(100).required()
});

// helper: выдача JWT
function signToken(userId, email) {
  return jwt.sign({ sub: userId, email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = await registerSchema.validateAsync(
      req.body,
      { stripUnknown: true }
    );

    const normEmail = email.toLowerCase().trim();

    // Проверим, не существует ли уже пользователь
    const dupSnap = await db()
      .collection(USERS_COL)
      .where('email', '==', normEmail)
      .limit(1)
      .get();

    if (!dupSnap.empty) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const docRef = await db().collection(USERS_COL).add({
      name,
      email: normEmail,
      passwordHash: hash,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    const token = signToken(docRef.id, normEmail);
    res.json({
      ok: true,
      token,
      user: { id: docRef.id, name, email: normEmail }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = await loginSchema.validateAsync(req.body, {
      stripUnknown: true
    });
    const normEmail = email.toLowerCase().trim();

    const snap = await db()
      .collection(USERS_COL)
      .where('email', '==', normEmail)
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const doc = snap.docs[0];
    const user = { id: doc.id, ...doc.data() };

    const ok = await bcrypt.compare(password, user.passwordHash || '');
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user.id, normEmail);
    res.json({
      ok: true,
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me  (проверка токена)
router.get('/me', async (req, res) => {
  try {
    const auth = String(req.headers.authorization || '');
    const [, token] = auth.split(' ');
    if (!token) return res.status(401).json({ error: 'No token' });

    const payload = jwt.verify(token, JWT_SECRET);
    const doc = await db().collection(USERS_COL).doc(payload.sub).get();
    if (!doc.exists) return res.status(404).json({ error: 'User not found' });

    const u = doc.data();
    res.json({ ok: true, user: { id: doc.id, name: u.name, email: u.email } });
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;


