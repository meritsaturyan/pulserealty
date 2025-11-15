// src/middleware/auth.js
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';



export function authRequired(req, res, next) {
  try {
    if (req.method === 'OPTIONS') return next();

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[auth] Missing JWT_SECRET');
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: 'Server misconfigured' });
    }


    const auth = req.headers.authorization || req.headers.Authorization || '';
    const match = /^bearer\s+(.+)$/i.exec(String(auth).trim());
    const headerToken = match ? match[1] : null;
    const cookieToken = req.cookies?.token || req.cookies?.auth_token || null;
    const xToken = req.headers['x-access-token'] || null;

   

    const token = headerToken || cookieToken || xToken;
    if (!token) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'No token' });
    }


    const p = jwt.verify(token, secret, { clockTolerance: 5 });


    const uid = p.uid || p.sub || null;
    const email = p.email || '';
    const name = p.name || '';

    if (!uid) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Invalid token' });
    }

    req.user = { uid, email, name };
    return next();
  } catch (err) {
    console.warn('[auth] Verify failed:', err?.name, err?.message);
    return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Invalid token' });
  }
}

export default authRequired;
