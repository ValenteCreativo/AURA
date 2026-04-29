import { NextResponse } from 'next/server';
import { getLatestReading, normalizeReading, setLatestReading } from '@/lib/sensor-store';

export async function GET() {
  return NextResponse.json(getLatestReading());
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const reading = normalizeReading(payload);
    setLatestReading(reading);

    return NextResponse.json(
      {
        ok: true,
        message: 'Lectura recibida',
        sensor: getLatestReading()
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payload inválido';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
