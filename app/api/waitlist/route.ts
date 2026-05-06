import { NextResponse } from 'next/server';
import { getPool, ensureWaitlistTable } from '@/lib/db';

// ── POST /api/waitlist — registrar un nuevo nodo ──────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email    = typeof body.email    === 'string' ? body.email.trim().toLowerCase()    : '';
    const location = typeof body.location === 'string' ? body.location.trim() : '';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { ok: false, error: 'Email inválido' },
        { status: 400 }
      );
    }

    await ensureWaitlistTable();
    const db = getPool();

    const result = await db.query(
      `INSERT INTO waitlist (email, location)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET location = EXCLUDED.location
       RETURNING id, email, location, created_at`,
      [email, location || null]
    );

    return NextResponse.json(
      { ok: true, entry: result.rows[0] },
      { status: 201 }
    );
  } catch (err) {
    console.error('[waitlist POST]', err);
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// ── GET /api/waitlist — listar registros (protegido con token) ────────────────
export async function GET(request: Request) {
  const token = request.headers.get('x-admin-token');
  if (token !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
    await ensureWaitlistTable();
    const db = getPool();
    const result = await db.query(
      `SELECT id, email, location, created_at, source
       FROM waitlist
       ORDER BY created_at DESC`
    );
    return NextResponse.json({ ok: true, count: result.rowCount, entries: result.rows });
  } catch (err) {
    console.error('[waitlist GET]', err);
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
