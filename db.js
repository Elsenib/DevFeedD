const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();
const { URL } = require('url');
const useSsl =
  !!(process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')) ||
  process.env.NODE_ENV === 'production';

let ssl = false;
if (useSsl) {
  ssl = { rejectUnauthorized: false };
  try {
    const parsed = new URL(process.env.DATABASE_URL);
    ssl.servername = parsed.hostname;
  } catch {}
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
  allowExitOnIdle: true,
});

pool.on('error', (error) => {
  console.error('Unexpected Postgres pool error:', error);
});

module.exports = pool;
