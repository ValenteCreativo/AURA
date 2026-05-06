'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

type Props = {
  temperature: number | null;
  humidity: number | null;
  micLevel: number;
  micBands: { low: number; mid: number; high: number };
  sensorOnline: boolean;
};

// Un solo mensaje a la vez — el agente pensando en voz baja
const THOUGHTS = [
  'leyendo biofonia',
  'comparando con baseline',
  'detectando patrones',
  'Turdus migratorius · probable',
  'NDSI estable',
  'antrofonia dentro de rango',
  'temperatura · umbral normal',
  'ciclo completado · registrando',
  'escuchando',
  'sin anomalías',
  'correlación climática activa',
  'agente en espera',
];

// Línea de actividad — canvas minimalista
function ActivityLine({ micLevel, color }: { micLevel: number; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t0 = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width  = Math.max(1, Math.floor(r.width  * dpr));
      canvas.height = Math.max(1, Math.floor(r.height * dpr));
    };
    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(canvas);

    const draw = () => {
      t0.current += 0.025;
      const t = t0.current;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Una sola línea — respiración suave
      ctx.beginPath();
      const amp = (h / 2) * (0.25 + micLevel * 0.65);
      for (let x = 0; x < w; x++) {
        const fx = x / w;
        const y = h / 2
          + Math.sin(fx * Math.PI * 5 + t) * amp
          + Math.sin(fx * Math.PI * 11 + t * 1.4) * amp * 0.3;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      // Gradiente de izquierda a derecha — aparece y se desvanece
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0,   'transparent');
      grad.addColorStop(0.1, color);
      grad.addColorStop(0.9, color);
      grad.addColorStop(1,   'transparent');

      ctx.strokeStyle = grad;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 1.2 * dpr;
      ctx.stroke();
      ctx.globalAlpha = 1;

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      obs.disconnect();
    };
  }, [color, micLevel]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}

export default function AIBrainBar({ temperature, humidity, micLevel, micBands, sensorOnline }: Props) {
  const [thoughtIdx, setThoughtIdx] = useState(0);
  const [opacity, setOpacity]       = useState(1);

  // Ciclo lento — un pensamiento cada 4 segundos
  useEffect(() => {
    const iv = setInterval(() => {
      setOpacity(0);
      setTimeout(() => {
        setThoughtIdx((i) => (i + 1) % THOUGHTS.length);
        setOpacity(1);
      }, 400);
    }, 4000);
    return () => clearInterval(iv);
  }, []);

  const thought = THOUGHTS[thoughtIdx];

  // Color según estado — un solo acento
  const accentColor = sensorOnline ? '#6ee7b7' : 'rgba(110,231,183,0.45)';

  return (
    <div style={styles.bar}>
      {/* Pulso — un punto que respira */}
      <span style={styles.dot}>
        <span style={{
          ...styles.dotCore,
          background: accentColor,
          boxShadow: `0 0 8px ${accentColor}`,
          animation: 'aura-breathe 2.4s ease-in-out infinite',
        }} />
      </span>

      {/* Línea de actividad — delgada, sale del punto */}
      <div style={styles.lineHost}>
        <ActivityLine micLevel={micLevel} color={accentColor} />
      </div>

      {/* Pensamiento — aparece y desaparece */}
      <span
        className="aura-mono"
        style={{
          ...styles.thought,
          opacity,
          transition: 'opacity 0.4s ease',
        }}
      >
        {thought}
      </span>

      {/* Separador vertical tenue */}
      <span style={styles.sep} />

      {/* Un solo dato — el más relevante en este momento */}
      <span className="aura-mono" style={styles.datum}>
        {temperature !== null
          ? `${temperature.toFixed(1)}°`
          : micLevel > 0.05
          ? `${(micLevel * 100).toFixed(0)} spl`
          : '· · ·'}
      </span>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  bar: {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    height: 28,
    // No background propio — flota sobre el topbar
    pointerEvents: 'none',
    paddingLeft: 0,
    overflow: 'hidden',
  },

  dot: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 28,
    flexShrink: 0,
  },
  dotCore: {
    width: 5,
    height: 5,
    borderRadius: 999,
  },

  lineHost: {
    width: 180,
    height: 28,
    flexShrink: 0,
  },

  thought: {
    fontSize: 10,
    letterSpacing: '0.22em',
    color: 'rgba(168,230,192,0.65)',
    textTransform: 'lowercase',
    whiteSpace: 'nowrap',
    paddingLeft: 12,
    paddingRight: 16,
  },

  sep: {
    width: 1,
    height: 14,
    background: 'rgba(110,231,183,0.15)',
    flexShrink: 0,
  },

  datum: {
    fontSize: 11,
    letterSpacing: '0.18em',
    color: 'rgba(110,231,183,0.45)',
    paddingLeft: 14,
    fontVariantNumeric: 'tabular-nums',
  },
};
