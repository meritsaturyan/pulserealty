// backend/src/index.js
import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { Server } from 'socket.io';

import buildChatRoutes, { chatStore } from './routes/chat.js';
import authRouter from './routes/auth.js';
import leadsRouter from './routes/leads.js';
import buildCustomersRoutes from './routes/customers.js';
import propertiesRouter from './routes/properties.js';
import { attachChatSocket } from './socket/chat.js';

import { initDb } from './db/models/index.js';
import { sequelize } from './db/sequelize.js';


const PORT = Number(process.env.PORT || 5050);
const SOCKET_PATH = process.env.SOCKET_PATH || '/socket.io';


const ALLOWED_ORIGINS = String(process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);


app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(compression());
app.use(express.json({ limit: process.env.JSON_LIMIT || '20mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.JSON_LIMIT || '20mb' }));
app.use(cookieParser());


const corsOptionsExpress = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.length === 0) return cb(null, true);
    return ALLOWED_ORIGINS.includes(origin)
      ? cb(null, true)
      : cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
};
app.use(cors(corsOptionsExpress));
app.options('*', cors(corsOptionsExpress));


app.use(
  '/api/',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.RATELIMIT_PER_WINDOW || 1000),
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'Too many requests, slow down.' },
  })
);


const healthPayload = () => ({ ok: true, ts: Date.now() });
app.get('/health', (_req, res) => res.status(200).json(healthPayload()));
app.get('/api/health', (_req, res) => res.status(200).json(healthPayload()));
app.get('/ping', (_req, res) => res.sendStatus(204));
app.get('/api/ping', (_req, res) => res.sendStatus(204));

app.get('/healthz', (_req, res) => res.status(200).json({ ok: true }));
app.get('/api/healthz', (_req, res) => res.status(200).json({ ok: true }));


const server = http.createServer(app);

const corsOptionsSocket = {
  origin: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : true,
  credentials: true,
};
const io = new Server(server, { path: SOCKET_PATH, cors: corsOptionsSocket });
app.set('io', io);


attachChatSocket(io, {
  threads: chatStore.threads,   
  messages: chatStore.messages, 
  persistMessages: true,
});


app.use('/api/auth', authRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/customers', buildCustomersRoutes(io));
app.use('/api/properties', propertiesRouter);
app.use('/api/chat', buildChatRoutes(io));


app.use('/api/*', (_req, res) => {
  res.status(404).json({ ok: false, error: 'Not found' });
});


app.use((err, _req, res, _next) => {
  if (err && (err.isJoi || err.name === 'ValidationError')) {
    return res.status(400).json({ ok: false, error: err.message });
  }
  if (String(err?.message || '').startsWith('CORS: origin')) {
    return res.status(403).json({ ok: false, error: err.message });
  }
  if (err && err.message === 'Too many requests, please try again later.') {
    return res.status(429).json({ ok: false, error: err.message });
  }
  console.error('[ERROR]', err);
  const status = err?.status || 500;
  return res.status(status).json({ ok: false, error: err?.message || 'Internal error' });
});


const shutdown = async (signal) => {
  try {
    console.log(`${signal}: closing HTTP/WS & DB...`);
    await new Promise((r) => server.close(r));
    io?.removeAllListeners();
    await sequelize.close().catch(() => {});
  } finally {
    process.exit(0);
  }
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));


try {
  await initDb();
  console.log('[DB] connected');

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`HTTP  listening on http://0.0.0.0:${PORT}`);
    console.log(`WS    path=${SOCKET_PATH}, ns=/chat`);
    if (ALLOWED_ORIGINS.length) {
      console.log('CORS allowed:', ALLOWED_ORIGINS.join(', '));
    } else {
      console.log('CORS allowed: (any origin, reflected) — dev-friendly');
    }
  });

  server.on('error', (err) => {
    console.error('[SERVER] Error:', err?.message || err);
    if (err.code === 'EADDRINUSE') {
      console.error(`[SERVER] Port ${PORT} is already in use`);
    }
  });
} catch (e) {
  console.error('[DB] init failed:', e?.message || e);
  console.error('[DB] Stack:', e?.stack);
  console.error('[DB] Make sure DATABASE_URL or PostgreSQL credentials are set correctly');
  process.exit(1);
}

export default app;
