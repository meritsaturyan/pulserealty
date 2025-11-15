// backend/src/db/sequelize.js
import { Sequelize } from 'sequelize';

const {

  DATABASE_URL,


  PGHOST = 'localhost',
  PGPORT = '5432',
  PGDATABASE = 'pulserealty',
  PGUSER = 'postgres',
  PGPASSWORD = 'postgres',


  DB_SSL,       
  PGSSLMODE,   
  DEBUG_SQL,  
  NODE_ENV,
  DB_POOL_MAX,
  DB_POOL_MIN,
  DB_POOL_IDLE,
  DB_POOL_ACQUIRE,
} = process.env;

const logging = (String(DEBUG_SQL || '').toLowerCase() === 'true' || DEBUG_SQL === '1')
  ? console.log
  : false;


function shouldUseSSL() {
  const sslFlag = String(DB_SSL || '').toLowerCase().trim();
  if (sslFlag === 'false') return false;     
  if (sslFlag === 'true')  return true;     

  const mode = String(PGSSLMODE || '').toLowerCase().trim();
  if (mode === 'require') return true;
  if (mode === 'disable') return false;

  const url = String(DATABASE_URL || '');
  if (/(\?|&)ssl=true/i.test(url)) return true;
  if (/sslmode=require/i.test(url)) return true;


  return false;
}


const pool = {
  max: Number(DB_POOL_MAX || 10),
  min: Number(DB_POOL_MIN || 0),
  idle: Number(DB_POOL_IDLE || 10_000),
  acquire: Number(DB_POOL_ACQUIRE || 60_000),
};

const common = {
  dialect: 'postgres',
  logging,
  pool,

  dialectOptions: {},
};

const useSSL = shouldUseSSL();
if (useSSL) {
  common.dialectOptions.ssl = { require: true, rejectUnauthorized: false };

}


export const sequelize = DATABASE_URL
  ? new Sequelize(DATABASE_URL, common)
  : new Sequelize({
      ...common,
      host: PGHOST,
      port: Number(PGPORT),
      database: PGDATABASE,
      username: PGUSER,
      password: PGPASSWORD,
    });


export async function pingDb() {
  await sequelize.authenticate();
  if (logging) console.log('[DB] Connected OK', {
    host: PGHOST,
    db: PGDATABASE,
    ssl: useSSL,
    env: NODE_ENV,
  });
}

export default sequelize;
