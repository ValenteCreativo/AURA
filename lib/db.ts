import { Pool } from 'pg';

// Singleton pool — reutilizado entre invocaciones serverless en Vercel
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return pool;
}

// Crea la tabla si no existe — se llama una vez al arrancar
export async function ensureWaitlistTable(): Promise<void> {
  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS waitlist (
      id          SERIAL PRIMARY KEY,
      email       TEXT NOT NULL UNIQUE,
      location    TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      source      TEXT DEFAULT 'web'
    );
  `);
}
