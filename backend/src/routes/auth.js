// backend/src/routes/auth.js
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { hash as argon2hash, verify as argon2verify } from '@node-rs/argon2';
import { SignJWT, jwtVerify } from 'jose';
import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../db/models/index.js';

const router = Router();



const ADMIN_USER       = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS_HASH  = (process.env.ADMIN_PASS_HASH || '').trim();

const ACCESS_TTL_MIN   = Number(process.env.AUTH_ACCESS_TTL_MIN || 15);    
const REFRESH_TTL_DAYS = Number(process.env.AUTH_REFRESH_TTL_DAYS || 90);   

const JWT_SECRET       = (process.env.AUTH_JWT_SECRET || 'dev-secret-please-change').trim();
const REFRESH_SECRET   = (process.env.REFRESH_JWT_SECRET || JWT_SECRET).trim();

const COOKIE_NAME      = process.env.AUTH_REFRESH_COOKIE || 'admin_rt';
const COOKIE_PATH      = process.env.AUTH_REFRESH_PATH || '/api/auth/admin/refresh';

const isProd           = process.env.NODE_ENV === 'production';


const USER_JWT_SECRET   = (process.env.USER_JWT_SECRET || JWT_SECRET).trim();
const USER_JWT_TTL_DAYS = Number(process.env.USER_JWT_TTL_DAYS || 7);


const USER_ACCESS_COOKIE = (process.env.USER_ACCESS_COOKIE || 'user_at').trim();



const te   = new TextEncoder();
const aKey = te.encode(JWT_SECRET);        
const rKey = te.encode(REFRESH_SECRET);   
const uKey = te.encode(USER_JWT_SECRET);   



const sha256hex = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function normEmail(e = '') {
  return String(e || '').trim().toLowerCase();
}
function isEmail(e = '') {
  return /^[^@]+@[^@]+\.[^@]+$/.test(String(e));
}


async function signAdminAccess(uid) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + ACCESS_TTL_MIN * 60;
  return new SignJWT({ sub: uid, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now).setExpirationTime(exp)
    .setIssuer('pulse.admin').setAudience('pulse.admin')
    .sign(aKey);
}
async function signAdminRefresh(uid, jti) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + REFRESH_TTL_DAYS * 24 * 60 * 60;
  return new SignJWT({ sub: uid, type: 'refresh', jti })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now).setExpirationTime(exp)
    .setIssuer('pulse.admin').setAudience('pulse.admin')
    .sign(rKey);
}
async function verifyAdminAccess(token) {
  const { payload } = await jwtVerify(token, aKey, { issuer: 'pulse.admin', audience: 'pulse.admin' });
  return payload;
}
async function verifyAdminRefresh(token) {
  const { payload } = await jwtVerify(token, rKey, { issuer: 'pulse.admin', audience: 'pulse.admin' });
  if (payload?.type !== 'refresh' || !payload?.jti) throw new Error('bad refresh');
  return payload;
}
function setRefreshCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: COOKIE_PATH,
    maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}
function clearRefreshCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: COOKIE_PATH, httpOnly: true, sameSite: 'strict', secure: isProd });
}
function readCookie(req, name) {
  const src = req.headers?.cookie || '';
  const map = Object.fromEntries(
    src.split(';').map((v) => {
      const i = v.indexOf('=');
      if (i < 0) return [v.trim(), ''];
      return [v.slice(0, i).trim(), decodeURIComponent(v.slice(i + 1))];
    })
  );
  return map[name];
}


async function signUserToken(userId, extra = {}) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + USER_JWT_TTL_DAYS * 24 * 60 * 60;
  return new SignJWT({ sub: userId, role: 'user', ...extra })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now).setExpirationTime(exp)
    .setIssuer('pulse.user').setAudience('pulse.user')
    .sign(uKey);
}
async function verifyUserToken(token) {
  const { payload } = await jwtVerify(token, uKey, { issuer: 'pulse.user', audience: 'pulse.user' });
  return payload;
}
function setUserAccessCookie(res, token) {
  res.cookie(USER_ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',               
    maxAge: USER_JWT_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}
function clearUserAccessCookie(res) {
  res.clearCookie(USER_ACCESS_COOKIE, { path: '/', httpOnly: true, sameSite: 'lax', secure: isProd });
}



const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many attempts. Try later.' },
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many registrations. Try later.' },
});



router.post('/admin/login', loginLimiter, async (req, res) => {
  try {
    const { username = '', password = '' } = req.body || {};
    const genericErr = () => res.status(401).json({ ok: false, error: 'Invalid credentials' });

    if (!ADMIN_PASS_HASH) {
      console.error('[auth] ADMIN_PASS_HASH not set');
      return res.status(500).json({ ok: false, error: 'Auth not configured' });
    }
    if (String(username) !== String(ADMIN_USER)) return genericErr();

    await sleep(150);

    const ok = await argon2verify(ADMIN_PASS_HASH, password);
    if (!ok) return genericErr();

    const uid = String(ADMIN_USER);
    const access  = await signAdminAccess(uid);
    const jti     = uuidv4();
    const refresh = await signAdminRefresh(uid, jti);

    setRefreshCookie(res, refresh);
    return res.json({ ok: true, token: access, user: { username: uid, role: 'admin' } });
  } catch (e) {
    console.error('[POST /api/auth/admin/login]', e);
    return res.status(500).json({ ok: false, error: 'Login failed' });
  }
});

router.post('/admin/refresh', async (req, res) => {
  try {
    const rt = readCookie(req, COOKIE_NAME);
    if (!rt) return res.status(401).json({ ok: false, error: 'No refresh' });

    const payload = await verifyAdminRefresh(rt);

    const access = await signAdminAccess(String(payload.sub));
    const newJti = uuidv4();
    const newRt  = await signAdminRefresh(String(payload.sub), newJti);
    setRefreshCookie(res, newRt);

    return res.json({ ok: true, token: access });
  } catch (e) {
    console.error('[POST /api/auth/admin/refresh]', e?.message || e);
    clearRefreshCookie(res);
    return res.status(401).json({ ok: false, error: 'Refresh failed' });
  }
});

router.post('/admin/logout', async (_req, res) => {
  try {
    clearRefreshCookie(res);
    return res.json({ ok: true });
  } catch {
    clearRefreshCookie(res);
    return res.json({ ok: true });
  }
});

router.get('/admin/me', async (req, res) => {
  try {
    const auth = String(req.headers.authorization || '');
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return res.status(401).json({ ok: false, error: 'No token' });
    const token = m[1];
    const payload = await verifyAdminAccess(token);
    if (payload?.role !== 'admin') throw new Error('not admin');
    return res.json({ ok: true, user: { username: String(payload.sub), role: 'admin' } });
  } catch {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
});


router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { name = '', email = '', password = '' } = req.body || {};
    const n = String(name || '').trim();
    const e = normEmail(email);
    const p = String(password || '');

    if (n.length < 2)  return res.status(400).json({ ok: false, error: 'Name too short' });
    if (!isEmail(e))   return res.status(400).json({ ok: false, error: 'Invalid email' });
    if (p.length < 6)  return res.status(400).json({ ok: false, error: 'Password too short' });

    const existing = await User.findOne({ where: { email: e } });
    if (existing)      return res.status(409).json({ ok: false, error: 'Email already used' });

    const password_hash = await argon2hash(p);
    const user = await User.create({ name: n, email: e, password_hash });

    const token = await signUserToken(String(user.id), { email: user.email, name: user.name });

    setUserAccessCookie(res, token);

    return res.status(201).json({ ok: true, token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) {
    console.error('[POST /api/auth/register]', e);
    return res.status(400).json({ ok: false, error: e.message || 'register failed' });
  }
});


router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email = '', password = '' } = req.body || {};
    const e = normEmail(email);
    const p = String(password || '');

    if (!isEmail(e))  return res.status(400).json({ ok: false, error: 'Invalid email' });
    if (p.length < 1) return res.status(400).json({ ok: false, error: 'Password required' });

    const user = await User.findOne({ where: { email: e } });
    if (!user)        return res.status(401).json({ ok: false, error: 'Invalid credentials' });

    const ok = await argon2verify(user.password_hash, p);
    if (!ok)          return res.status(401).json({ ok: false, error: 'Invalid credentials' });

    const token = await signUserToken(String(user.id), { email: user.email, name: user.name });


    setUserAccessCookie(res, token);

    return res.json({ ok: true, token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) {
    console.error('[POST /api/auth/login]', e);
    return res.status(400).json({ ok: false, error: e.message || 'login failed' });
  }
});


router.post('/logout', async (_req, res) => {
  try {
    clearUserAccessCookie(res);
    return res.json({ ok: true });
  } catch {
    clearUserAccessCookie(res);
    return res.json({ ok: true });
  }
});


router.get('/me', async (req, res) => {
  try {

    let token = '';
    const auth = String(req.headers.authorization || '');
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (m) token = m[1];


    if (!token) token = readCookie(req, USER_ACCESS_COOKIE);


    if (!token && req.headers['x-auth-token']) token = String(req.headers['x-auth-token']);
    if (!token && req.query?.token)            token = String(req.query.token);

    if (!token) return res.status(401).json({ ok: false, error: 'No token' });

    const payload = await verifyUserToken(token);
    if (payload?.role !== 'user') throw new Error('not user');

    const user = await User.findByPk(payload.sub);
    if (!user) return res.status(404).json({ ok: false, error: 'not found' });

    return res.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, role: 'user' } });
  } catch (e) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
});



export async function requireAdmin(req, res, next) {
  try {
    const auth = String(req.headers.authorization || '');
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return res.status(401).json({ ok: false, error: 'No token' });
    const token = m[1];
    const payload = await verifyAdminAccess(token);
    if (payload?.role !== 'admin') throw new Error('not admin');
    req.admin = { username: String(payload.sub) };
    return next();
  } catch {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
}

export default router;
