'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SensorApiResponse } from '@/lib/sensor-store';

type Tone = 'emerald' | 'amber' | 'rose' | 'slate';

type Presentation = {
  title: string;
  badge: string;
  text: string;
  tone: Tone;
};

const DISCONNECTED: SensorApiResponse = {
  nodeId: 'AURA-001',
  temperature: null,
  humidity: null,
  state: 'disconnected',
  timestamp: null,
  online: false,
  hasData: false,
  lastSeenMs: null
};

const pageStyles = {
  shell: {
    minHeight: '100vh',
    position: 'relative' as const,
    overflow: 'hidden'
  },
  grid: {
    position: 'fixed' as const,
    inset: 0,
    pointerEvents: 'none' as const,
    backgroundImage:
      'linear-gradient(rgba(127,255,195,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(127,255,195,0.06) 1px, transparent 1px)',
    backgroundSize: '32px 32px',
    maskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)'
  },
  main: {
    position: 'relative' as const,
    maxWidth: 1280,
    margin: '0 auto',
    padding: '40px 24px 72px'
  },
  hero: {
    display: 'grid',
    gap: 40,
    alignItems: 'center' as const,
    gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, 0.8fr)'
  },
  panelGrid: {
    display: 'grid',
    gap: 24,
    marginTop: 32,
    gridTemplateColumns: 'minmax(0, 0.95fr) minmax(0, 1.05fr)'
  },
  card: {
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 28,
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(18px)',
    padding: 24
  },
  primaryCard: {
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 28,
    background: 'rgba(16, 34, 27, 0.72)',
    boxShadow: '0 0 80px rgba(110, 231, 183, 0.15)',
    backdropFilter: 'blur(18px)',
    padding: 24
  },
  meterCard: {
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    background: 'rgba(0,0,0,0.12)',
    padding: 20
  },
  orbWrap: {
    display: 'flex',
    justifyContent: 'center'
  },
  orb: (state: SensorApiResponse['state']) => ({
    width: '100%',
    maxWidth: 420,
    aspectRatio: '1 / 1',
    borderRadius: '999px',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow:
      state === 'alert'
        ? '0 0 80px rgba(244, 63, 94, 0.18), inset 0 0 40px rgba(255,255,255,0.08)'
        : state === 'attention'
          ? '0 0 80px rgba(245, 158, 11, 0.16), inset 0 0 40px rgba(255,255,255,0.08)'
          : state === 'balanced'
            ? '0 0 80px rgba(110, 231, 183, 0.18), inset 0 0 40px rgba(255,255,255,0.08)'
            : '0 0 70px rgba(148, 163, 184, 0.12), inset 0 0 40px rgba(255,255,255,0.05)',
    background:
      state === 'alert'
        ? 'radial-gradient(circle at 30% 30%, rgba(254, 205, 211, 0.95), rgba(244, 63, 94, 0.42) 28%, rgba(127, 29, 29, 0.2) 48%, rgba(2, 8, 6, 0.05) 70%)'
        : state === 'attention'
          ? 'radial-gradient(circle at 30% 30%, rgba(253, 230, 138, 0.95), rgba(245, 158, 11, 0.4) 28%, rgba(120, 53, 15, 0.18) 48%, rgba(2, 8, 6, 0.05) 70%)'
          : state === 'balanced'
            ? 'radial-gradient(circle at 30% 30%, rgba(167, 243, 208, 0.95), rgba(34, 197, 94, 0.45) 28%, rgba(3, 120, 87, 0.18) 48%, rgba(2, 8, 6, 0.05) 70%)'
            : 'radial-gradient(circle at 30% 30%, rgba(226, 232, 240, 0.82), rgba(100, 116, 139, 0.38) 28%, rgba(51, 65, 85, 0.2) 48%, rgba(2, 8, 6, 0.05) 70%)',
    animation: 'breathe 6s ease-in-out infinite'
  }),
  chips: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 12,
    marginTop: 20
  },
  chip: {
    padding: '10px 16px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.05)',
    color: '#cbd5e1',
    fontSize: 14
  },
  chipStrong: {
    padding: '10px 16px',
    borderRadius: 999,
    border: '1px solid rgba(52, 211, 153, 0.2)',
    background: 'rgba(110, 231, 183, 0.12)',
    color: '#d1fae5',
    fontSize: 14
  }
};

function presentationFor(state: SensorApiResponse['state']): Presentation {
  switch (state) {
    case 'balanced':
      return {
        title: 'Equilibrio',
        badge: 'Condición estable',
        text: 'La lectura indica condiciones ambientales estables. El entorno respira en equilibrio.',
        tone: 'emerald'
      };
    case 'attention':
      return {
        title: 'Atención',
        badge: 'Seguimiento recomendado',
        text: 'La señal sugiere un ambiente seco o con calor moderado. Conviene seguir monitoreando el nodo.',
        tone: 'amber'
      };
    case 'alert':
      return {
        title: 'Alerta',
        badge: 'Estrés térmico',
        text: 'La combinación de calor y sequedad indica una señal crítica para el entorno monitoreado.',
        tone: 'rose'
      };
    default:
      return {
        title: 'Desconectado',
        badge: 'Sin lecturas reales',
        text: 'AURA está listo para escuchar, pero todavía no ha recibido datos reales del ESP32.',
        tone: 'slate'
      };
  }
}

function badgeStyle(tone: Tone) {
  const tones: Record<Tone, React.CSSProperties> = {
    emerald: { border: '1px solid rgba(52, 211, 153, 0.2)', background: 'rgba(16, 185, 129, 0.12)', color: '#d1fae5' },
    amber: { border: '1px solid rgba(251, 191, 36, 0.2)', background: 'rgba(245, 158, 11, 0.12)', color: '#fef3c7' },
    rose: { border: '1px solid rgba(251, 113, 133, 0.2)', background: 'rgba(244, 63, 94, 0.12)', color: '#ffe4e6' },
    slate: { border: '1px solid rgba(148, 163, 184, 0.2)', background: 'rgba(148, 163, 184, 0.12)', color: '#e2e8f0' }
  };
  return {
    ...tones[tone],
    padding: '8px 14px',
    borderRadius: 999,
    fontSize: 14,
    display: 'inline-flex'
  } satisfies React.CSSProperties;
}

function formatValue(value: number | null, unit: string, digits: number) {
  return value === null ? `-- ${unit}` : `${value.toFixed(digits)} ${unit}`;
}

export default function HomePage() {
  const [sensor, setSensor] = useState<SensorApiResponse>(DISCONNECTED);
  const presentation = useMemo(() => presentationFor(sensor.state), [sensor.state]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const response = await fetch('/api/sensor', { cache: 'no-store' });
        if (!response.ok) throw new Error('No se pudo leer /api/sensor');
        const json = (await response.json()) as SensorApiResponse;
        if (mounted) setSensor(json);
      } catch {
        if (mounted) setSensor(DISCONNECTED);
      }
    }

    load();
    const interval = setInterval(load, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div style={pageStyles.shell}>
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(0.96); }
          50% { transform: scale(1.03); }
        }
        @media (max-width: 960px) {
          .aura-hero, .aura-panels {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      <div style={pageStyles.grid} />
      <main style={pageStyles.main}>
        <section className="aura-hero" style={pageStyles.hero}>
          <div>
            <p style={{ fontSize: 14, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(110, 231, 183, 0.7)' }}>
              Bosques & Tech 2026 · Nodo experimental
            </p>
            <h1 style={{ fontSize: 'clamp(3.5rem, 8vw, 6rem)', lineHeight: 1, margin: '18px 0 16px', fontWeight: 600 }}>AURA</h1>
            <p style={{ fontSize: 'clamp(1.25rem, 2vw, 2rem)', color: '#cbd5e1', margin: '0 0 18px' }}>
              Inteligencia ambiental autónoma a través del sonido.
            </p>
            <p style={{ maxWidth: 720, color: '#94a3b8', lineHeight: 1.8, fontSize: 18 }}>
              Un primer nodo experimental que traduce señales del entorno en estados vivos: equilibrio, atención y alerta. El bosque respira. El sistema escucha.
            </p>
            <div style={pageStyles.chips}>
              <span style={sensor.online ? pageStyles.chipStrong : pageStyles.chip}>{sensor.online ? 'ESP32 activo' : 'Nodo esperando señal'}</span>
              <span style={pageStyles.chip}>Temperatura + humedad</span>
              <span style={pageStyles.chip}>Next.js + App Router</span>
            </div>
          </div>
          <div style={pageStyles.orbWrap}>
            <div style={pageStyles.orb(sensor.state)} />
          </div>
        </section>

        <section className="aura-panels" style={pageStyles.panelGrid}>
          <article style={pageStyles.primaryCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(110, 231, 183, 0.6)', margin: 0 }}>Live Node</p>
                <h2 style={{ margin: '10px 0 0', fontSize: 32, fontWeight: 500 }}>Señal ambiental recibida</h2>
              </div>
              <div style={badgeStyle(sensor.online ? 'emerald' : 'slate')}>
                {sensor.online ? 'Nodo online' : 'Nodo desconectado'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
              <div style={pageStyles.meterCard}>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>Temperatura actual</p>
                <p style={{ margin: '10px 0 0', fontSize: 44, fontWeight: 600 }}>{formatValue(sensor.temperature, '°C', 1)}</p>
              </div>
              <div style={pageStyles.meterCard}>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>Humedad actual</p>
                <p style={{ margin: '10px 0 0', fontSize: 44, fontWeight: 600 }}>{formatValue(sensor.humidity, '%', 0)}</p>
              </div>
            </div>

            <div style={{ ...pageStyles.meterCard, marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>Estado ambiental</p>
                  <p style={{ margin: '10px 0 0', fontSize: 36, fontWeight: 600 }}>{presentation.title}</p>
                </div>
                <div style={badgeStyle(presentation.tone)}>{presentation.badge}</div>
              </div>
              <p style={{ marginTop: 18, color: '#cbd5e1', lineHeight: 1.8 }}>{presentation.text}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, fontSize: 12, color: '#64748b', marginTop: 16 }}>
                <span>Última lectura: {sensor.timestamp ? new Date(sensor.timestamp).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : 'sin datos'}</span>
                <span>Node ID: {sensor.nodeId}</span>
              </div>
            </div>
          </article>

          <div style={{ display: 'grid', gap: 24 }}>
            <article style={pageStyles.card}>
              <p style={{ fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(110, 231, 183, 0.6)', margin: 0 }}>Interpretación</p>
              <h2 style={{ margin: '10px 0 16px', fontSize: 30, fontWeight: 500 }}>Cómo lee AURA el entorno</h2>
              <div style={{ display: 'grid', gap: 16 }}>
                {[
                  ['Balanced', 'Temperatura y humedad en un rango estable para el nodo.'],
                  ['Attention', 'Sequedad, calor moderado o condiciones que requieren seguimiento.'],
                  ['Alert', 'Estrés térmico o una combinación ambiental crítica.']
                ].map(([title, text]) => (
                  <div key={title} style={pageStyles.meterCard}>
                    <p style={{ margin: 0, color: '#cbd5e1', fontWeight: 600 }}>{title}</p>
                    <p style={{ margin: '8px 0 0', color: '#94a3b8', lineHeight: 1.6 }}>{text}</p>
                  </div>
                ))}
              </div>
            </article>

            <article style={pageStyles.card}>
              <p style={{ fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(110, 231, 183, 0.6)', margin: 0 }}>API Contract</p>
              <h2 style={{ margin: '10px 0 16px', fontSize: 30, fontWeight: 500 }}>Endpoint del nodo</h2>
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={pageStyles.meterCard}>
                  <p style={{ margin: 0, fontWeight: 600 }}>GET /api/sensor</p>
                  <p style={{ margin: '8px 0 0', color: '#94a3b8' }}>Devuelve la última lectura conocida y si el nodo sigue online.</p>
                </div>
                <div style={pageStyles.meterCard}>
                  <p style={{ margin: 0, fontWeight: 600 }}>POST /api/sensor</p>
                  <pre style={{ margin: '12px 0 0', overflowX: 'auto', whiteSpace: 'pre-wrap', color: '#94a3b8' }}>{`{
  "nodeId": "AURA-001",
  "temperature": 28.5,
  "humidity": 31,
  "state": "attention",
  "timestamp": 1714410000000
}`}</pre>
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
