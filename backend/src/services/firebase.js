// backend/src/services/firebase.js
import admin from 'firebase-admin';

let inited = false;

export function initFirebaseAdmin() {
  if (inited || admin.apps.length) return;

  try {
    let credential = null;

    // Вариант 1: весь JSON сервис-аккаунта в переменной окружения
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (raw) {
      try {
        const json = JSON.parse(raw);
        if (json.private_key && json.private_key.includes('\\n')) {
          json.private_key = json.private_key.replace(/\\n/g, '\n');
        }
        credential = admin.credential.cert(json);
      } catch (e) {
        console.warn('[firebase] bad FIREBASE_SERVICE_ACCOUNT_JSON:', e.message);
      }
    }

    // Вариант 2: GOOGLE_APPLICATION_CREDENTIALS указывает на файл *.json
    if (!credential && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      credential = admin.credential.applicationDefault();
    }

    // Вариант 3: ADC (gcloud / локальные креды)
    if (!credential) {
      try { credential = admin.credential.applicationDefault(); } catch {}
    }

    // Инициализация. Даже если нет credential — попытаемся ADC.
    admin.initializeApp(
      credential ? { credential } : undefined
    );
    inited = true;

    const fs = admin.firestore();

    // Эмулятор Firestore (если задан)
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      fs.settings({ host: process.env.FIRESTORE_EMULATOR_HOST, ssl: false });
      console.log('[firebase] Using Firestore emulator at', process.env.FIRESTORE_EMULATOR_HOST);
    }

    console.log('[firebase] Admin initialized');
  } catch (e) {
    // Не падаем — сервер сможет стартовать, а вот обращения к БД вернут 500
    console.warn('[firebase] init failed:', e?.message || e);
  }
}

export const db = () => {
  // Если admin не инициализирован — бросим понятную ошибку в момент запроса
  if (!admin.apps.length) {
    throw new Error('Firebase not initialized. Provide credentials or set FIRESTORE_EMULATOR_HOST.');
  }
  return admin.firestore();
};

export const FieldValue = admin.firestore.FieldValue;


