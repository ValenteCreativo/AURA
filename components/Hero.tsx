'use client';

import { motion } from 'framer-motion';
import { ArrowDownRight, Radio } from 'lucide-react';
import BreathingOrb from './BreathingOrb';
import type { SensorApiResponse } from '@/lib/sensor-store';

type Props = { sensor: SensorApiResponse };

export default function Hero({ sensor }: Props) {
  return (
    <section style={styles.wrap}>
      <div style={styles.cornerLabelTL}>
        <span className="aura-mono" style={{ fontSize: 10, letterSpacing: '0.3em', color: 'var(--ink-3)' }}>
          LAT 19.36° N · LON 99.18° W
        </span>
      </div>
      <div style={styles.cornerLabelTR}>
        <span className="aura-mono" style={{ fontSize: 10, letterSpacing: '0.3em', color: 'var(--ink-3)' }}>
          NODO AURA-001 · CDMX
        </span>
      </div>

      <div style={styles.grid}>
        <div style={styles.copy}>
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="aura-eyebrow"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}
          >
            <Radio size={12} /> Bosques &amp; Tech 2026 — Bioparque San Antonio
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="aura-serif"
            style={styles.title}
          >
            El bosque <em style={{ fontStyle: 'italic', color: 'var(--moss)' }}>respira</em>.
            <br />
            El sistema <em style={{ fontStyle: 'italic' }}>escucha</em>.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.5 }}
            style={styles.subtitle}
          >
            <strong style={{ color: 'var(--ink-0)', fontWeight: 500 }}>AURA</strong> es un
            instrumento ambiental autónomo: un primer nodo que traduce el pulso del entorno —
            temperatura, humedad y, pronto, su firma acústica— en estados vivos. Una interfaz
            sensible para el sistema nervioso del bosque urbano.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7 }}
            style={styles.actions}
          >
            <a href="#telemetry" style={styles.primaryBtn}>
              Escuchar el nodo en vivo
              <ArrowDownRight size={16} />
            </a>
            <a href="#manifesto" style={styles.secondaryBtn}>
              Manifiesto sensible
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 1 }}
            style={styles.metaRow}
          >
            <Meta label="LINAJE" value="REMBU → SEN → AONA → ARVI → AURA" />
            <Meta label="STACK" value="ESP32 · Next.js · Edge runtime" />
            <Meta label="VERSIÓN" value="v0.1 — campo / poética" />
          </motion.div>
        </div>

        <div style={styles.orbWrap}>
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: 'relative' }}
          >
            <BreathingOrb state={sensor.state} size={420} />
            <div style={styles.orbCaption}>
              <span className="aura-mono" style={{ fontSize: 10, letterSpacing: '0.3em', color: 'var(--ink-3)' }}>
                ESTADO ACTUAL
              </span>
              <span
                className="aura-serif"
                style={{ fontSize: 26, letterSpacing: '-0.01em', textTransform: 'capitalize' }}
              >
                {sensor.state === 'disconnected' ? 'esperando señal' : translateState(sensor.state)}
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      <div style={styles.bottomScroll}>
        <span className="aura-mono" style={{ fontSize: 10, letterSpacing: '0.3em', color: 'var(--ink-3)' }}>
          DESLIZAR / ESCUCHAR
        </span>
        <motion.span
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          style={styles.scrollLine}
        />
      </div>
    </section>
  );
}

function translateState(state: 'balanced' | 'attention' | 'alert') {
  return state === 'balanced' ? 'equilibrio' : state === 'attention' ? 'atención' : 'alerta';
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <p className="aura-mono" style={{ margin: 0, fontSize: 10, letterSpacing: '0.28em', color: 'var(--ink-3)' }}>
        {label}
      </p>
      <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--ink-1)' }}>{value}</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'relative',
    minHeight: 'calc(100vh - 70px)',
    display: 'flex',
    alignItems: 'center',
    padding: '40px 32px 80px'
  },
  cornerLabelTL: { position: 'absolute', top: 24, left: 32 },
  cornerLabelTR: { position: 'absolute', top: 24, right: 32 },
  grid: {
    width: '100%',
    maxWidth: 1320,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 0.85fr)',
    gap: 64,
    alignItems: 'center'
  },
  copy: { minWidth: 0 },
  title: {
    fontSize: 'clamp(3.4rem, 9vw, 7.4rem)',
    lineHeight: 0.96,
    margin: '24px 0 28px',
    fontWeight: 400,
    letterSpacing: '-0.035em'
  },
  subtitle: {
    fontSize: 'clamp(1.05rem, 1.4vw, 1.25rem)',
    color: 'var(--ink-1)',
    lineHeight: 1.65,
    maxWidth: 620,
    margin: '0 0 36px'
  },
  actions: { display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 56 },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 22px',
    borderRadius: 999,
    background: 'linear-gradient(135deg, rgba(110,231,183,0.95), rgba(56,189,248,0.85))',
    color: '#04130d',
    fontWeight: 500,
    fontSize: 14,
    letterSpacing: '0.02em',
    boxShadow: '0 12px 40px rgba(110, 231, 183, 0.25)',
    transition: 'transform 200ms ease'
  },
  secondaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '14px 22px',
    borderRadius: 999,
    border: '1px solid var(--line-strong)',
    color: 'var(--ink-1)',
    fontSize: 14,
    background: 'rgba(255,255,255,0.02)'
  },
  metaRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 24,
    paddingTop: 28,
    borderTop: '1px solid var(--line)'
  },
  orbWrap: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  orbCaption: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    background: 'rgba(5,12,9,0.72)',
    padding: '10px 22px',
    borderRadius: 999,
    border: '1px solid var(--line)',
    backdropFilter: 'blur(8px)'
  },
  bottomScroll: {
    position: 'absolute',
    bottom: 28,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12
  },
  scrollLine: {
    width: 1,
    height: 36,
    background: 'linear-gradient(180deg, var(--moss), transparent)'
  }
};
