import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';

export function authRequired(req, res, next) {
  try {
    const hdr = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!token) return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'No token' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { uid, email, name }
    next();
  } catch {
    return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Invalid token' });
  }
}

export function signToken(user) {
  return jwt.sign(
    { uid: user.id, email: user.email, name: user.name || '' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || '7d' }
  );
}
