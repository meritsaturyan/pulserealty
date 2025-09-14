// backend/src/index.js
import 'dotenv/config';

import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { Server as SocketIOServer } from 'socket.io';

import { initFirebaseAdmin } from './services/firebase.js';
import authRoutes from './routes/auth.js';
import leadRoutes from './routes/leads.js';
import buildChatRoutes from './routes/chat.js';     // фабрика роутов чата (нужно передать io)
import customersRoutes from './routes/customers.js';
import propRoutes from './routes/properties.js';
import { attachChatSocket } from './socket/chat.js';

// Инициализация Firebase Admin — если нет ключей, выходим
try {
  initFirebaseAdmin();
  console.log('[firebase] initialized');
} catch (e) {
  console.error('[firebase] init error:', e?.message || e);
  process.exit(1);
}

const app = express();
const server = http.createServer(app);

// ----- CORS -----
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
  : '*';

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan(process.env.LOG_LEVEL || 'dev'));

// ----- Rate limit -----
app.use(
  rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
    max: Number(process.env.RATE_LIMIT_MAX || 120),
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ----- Socket.IO -----
const io = new SocketIOServer(server, {
  path: '/socket.io',
  cors: { origin: corsOrigins, credentials: true, methods: ['GET', 'POST'] },
});

// навешиваем обработчики для namespace /chat
attachChatSocket(io);

// ----- Health -----
app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// ----- REST маршруты -----
app.use('/api/auth',       authRoutes);
app.use('/api/leads',      leadRoutes);
app.use('/api/chat',       buildChatRoutes(io)); // ВАЖНО: вызываем фабрику с io
app.use('/api/customers',  customersRoutes);
app.use('/api/properties', propRoutes);

// ----- Ошибки -----
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

// ----- Start -----
const PORT = Number(process.env.PORT || 4000);
server.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
  console.log('Socket.io path: /socket.io');
});








