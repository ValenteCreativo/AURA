'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import type { CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import Marquee from '@/components/Marquee';
import WaitlistSection from '@/components/WaitlistSection';
import { useMicAnalyser } from '@/lib/mic-analyser';
import { generate24h } from '@/lib/history-mock';
import type { SensorApiResponse } from '@/lib/sensor-store';
import type { TerrainProps } from '@/components/AcousticTerrain_v3';

const AcousticTerrain = dynamic(() => import('@/components/AcousticTerrain_v3'), {
  ssr: false,
  loading: () => null,
});

// ─── Constants ────────────────────────────────────────────────────────────────

const DISCONNECTED: SensorApiResponse = {
  nodeId: 'AURA-001',
  temperature: null,
  humidity: null,
  state: 'disconnected',
  timestamp: null,
  online: false,
  hasData: false,
  lastSeenMs: null,
};

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function formatClock(ts: number) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function fmt(v: number | null, d = 1) {
  return v === null ? '--' : v.toFixed(d);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [sensor, setSensor] = useState<SensorApiResponse>(DISCONNECTED);
  const [now, setNow] = useState(() => Date.now());
  const [micRequested, setMicRequested] = useState(false);

  const mic = useMicAnalyser(2048);
  const history = useMemo(() => generate24h(42), []);
  const acousticNow = history[history.length - 1];

  // Fetch sensor data
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch('/api/sensor', { cache: 'no-store' });
        if (!res.ok) throw new Error();
        const json = (await res.json()) as SensorApiResponse;
        if (mounted) setSensor(json);
      } catch {
        if (mounted) setSensor(DISCONNECTED);
      }
    }
    load();
    const iv = setInterval(load, 5000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { mounted = false; clearInterval(iv); clearInterval(tick); };
  }, []);

  const micActive = mic.status === 'granted';
  const sensorOnline = sensor.online;

  // Derived acoustic values
  const ndsi = acousticNow.ndsi;
  const biophonyPct = micActive
    ? Math.round(mic.bands.high * 100)
    : Math.round(acousticNow.biophony);
  const anthroPct = micActive
    ? Math.round(mic.bands.mid * 100)
    : Math.round(acousticNow.anthrophony);

  // Terrain props
  const terrainProps: TerrainProps = {
    micAnalyser: mic.analyser,
    temperature: sensor.temperature,
    humidity: sensor.humidity,
    micLevel: mic.level,
    micBands: mic.bands,
    sensorOnline,
  };

  // Marquee data
  const tickerItems = [
    'AURA · autonomous urban regeneration via audio',
    `nodo ${sensor.nodeId}`,
    `temp ${fmt(sensor.temperature)} °c`,
    `humedad ${fmt(sensor.humidity, 0)} %`,
    `ndsi ${ndsi.toFixed(2)}`,
    `biofonia ${biophonyPct}%`,
    `antrofonia ${anthroPct}%`,
    micActive ? 'micrófono · activo' : 'micrófono · listo',
    'bernie krause · soundscape ecology',
    'edge computing · privacidad por diseño',
    'depin · token aura · gobernanza distribuida',
    'el bosque respira · aura escucha',
  ];

  // State label
  const stateLabel = {
    balanced: 'EQUILIBRIO',
    attention: 'ATENCIÓN',
    alert: 'ALERTA',
    disconnected: 'STANDBY',
  }[sensor.state];

  const stateColor = {
    balanced: 'var(--biophony)',
    attention: 'var(--barragán)',
    alert: '#fb7185',
    disconnected: 'var(--data-dim)',
  }[sensor.state];

  return (
    <div style={styles.root}>
      {/* ── HERO: full viewport ─────────────────────────────────────────── */}
      <section style={styles.hero}>

        {/* Grid background */}
        <div className="aura-grid-bg" style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

        {/* Terrain canvas */}
        <div style={styles.terrainHost}>
          <AcousticTerrain {...terrainProps} />
          {/* Quadrant labels */}
          <QuadrantLabels />
        </div>

        {/* Top bar */}
        <header style={styles.topbar}>
          <div style={styles.topbarLeft}>
            <div style={styles.wordmarkBox}>
              <span style={styles.wordmark} className="aura-serif">AURA</span>
            </div>
            <div style={styles.taglineBox}>
              <span className="aura-mono" style={styles.tagline}>
                AUTONOMOUS URBAN REGENERATION VIA AUDIO
              </span>
            </div>
          </div>
          <div style={styles.topbarRight}>
            <span className="aura-mono" style={styles.coord}>19.4326° N  99.1332° W</span>
            <span className="aura-mono" style={styles.clock}>{formatClock(now)}</span>
          </div>
        </header>

        {/* Live data strip — bottom left */}
        <div style={styles.dataStrip}>
          <DataPill label="ACI" value={fmt(biophonyPct * 0.8 + 20, 0)} unit="" color="var(--biophony)" />
          <DataPill label="SPL" value={fmt(40 + mic.level * 40, 0)} unit="dB" color="var(--data-text)" />
          <DataPill label="TEMP" value={fmt(sensor.temperature)} unit="°C" color="var(--data-esp32)" />
          <DataPill label="HUM" value={fmt(sensor.humidity, 0)} unit="%" color="var(--sky)" />
          <DataPill label="NDSI" value={ndsi.toFixed(2)} unit="" color="var(--violet)" />
        </div>

        {/* Status + mic — bottom right */}
        <div style={styles.controlStrip}>
          <div style={styles.statusRow}>
            <span
              style={{
                ...styles.statusDot,
                background: stateColor,
                boxShadow: `0 0 10px ${stateColor}`,
              }}
            />
            <span className="aura-mono" style={{ ...styles.statusLabel, color: stateColor }}>
              {stateLabel}
            </span>
            <span className="aura-mono" style={styles.nodeId}>{sensor.nodeId}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setMicRequested(true);
              micActive ? mic.stop() : mic.request();
            }}
            style={{
              ...styles.micBtn,
              borderColor: micActive ? '#fb7185' : 'var(--biophony-lo)',
              color: micActive ? '#fecaca' : 'var(--biophony)',
              background: micActive
                ? 'rgba(251,113,133,0.08)'
                : 'rgba(74,158,114,0.08)',
            }}
          >
            <span
              style={{
                ...styles.micDot,
                background: micActive ? '#fb7185' : 'var(--biophony-lo)',
                animation: micActive ? 'aura-breathe 1.2s infinite' : 'none',
              }}
            />
            <span className="aura-mono" style={styles.micLabel}>
              {micActive ? 'ESCUCHANDO' : 'ACTIVAR MICRÓFONO'}
            </span>
          </button>

          {!micActive && !micRequested && (
            <p className="aura-mono" style={styles.micHint}>
              {sensorOnline
                ? 'nodo esp32 activo · activa el mic para enriquecer la señal'
                : 'esp32 offline · activa el mic para mantener el observatorio vivo'}
            </p>
          )}
        </div>

        {/* Listening indicator — center top */}
        <div style={styles.listeningBadge}>
          <span
            style={{
              ...styles.listeningDot,
              animation: (micActive || sensorOnline) ? 'aura-breathe 2s infinite' : 'none',
              opacity: (micActive || sensorOnline) ? 1 : 0.3,
            }}
          />
          <span className="aura-mono" style={styles.listeningLabel}>
            {micActive ? 'ESCUCHANDO' : sensorOnline ? 'NODO ACTIVO' : 'EN ESPERA'}
          </span>
        </div>

        {/* Scroll hint */}
        <div style={styles.scrollHint}>
          <span className="aura-mono" style={styles.scrollLabel}>EXPLORAR</span>
          <div style={styles.scrollLine} />
        </div>

        {/* Bottom vignette */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 160,
          background: 'linear-gradient(to bottom, transparent, var(--bg-deep))',
          zIndex: 5,
          pointerEvents: 'none',
        }} />
      </section>

      {/* ── MARQUEE ─────────────────────────────────────────────────────── */}
      <Marquee items={tickerItems} speed={55} />

      {/* ── SCROLLABLE CONTENT ──────────────────────────────────────────── */}
      <WaitlistSection />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DataPill({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <div style={styles.dataPill}>
      <span className="aura-mono" style={{ ...styles.dataPillLabel, color }}>
        {label}
      </span>
      <span style={styles.dataPillValue}>
        {value}
        {unit && (
          <span className="aura-mono" style={styles.dataPillUnit}>
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}

function QuadrantLabels() {
  const labels = [
    { label: 'BIOFONIA', sub: 'aves · insectos · vida', color: '#6ee7b7', top: '28%', left: '25%' },
    { label: 'GEOFONIA', sub: 'viento · agua · tierra', color: '#7dd3fc', top: '28%', right: '25%' },
    { label: 'ANTROFONIA', sub: 'ciudad · tráfico · humanos', color: '#fb923c', bottom: '28%', left: '25%' },
    { label: 'SENSOR', sub: 'temperatura · humedad', color: '#c45c2a', bottom: '28%', right: '25%' },
  ] as const;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}>
      {labels.map((l) => (
        <div
          key={l.label}
          style={{
            position: 'absolute',
            top: 'top' in l ? l.top : undefined,
            bottom: 'bottom' in l ? l.bottom : undefined,
            left: 'left' in l ? l.left : undefined,
            right: 'right' in l ? l.right : undefined,
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            background: 'rgba(0,0,0,0.85)',
            padding: '10px 16px',
            backdropFilter: 'blur(20px)',
            border: `2px solid ${l.color}`,
            boxShadow: `0 6px 24px rgba(0,0,0,0.7), inset 0 0 30px ${l.color}22`,
            minWidth: 140,
          }}
        >
          <div
            className="aura-mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.32em',
              color: l.color,
              fontWeight: 400,
              textTransform: 'uppercase',
              marginBottom: 4,
              textShadow: `0 0 16px ${l.color}`,
            }}
          >
            {l.label}
          </div>
          <div
            className="aura-mono"
            style={{
              fontSize: 9,
              letterSpacing: '0.14em',
              color: 'rgba(255,255,255,0.75)',
              textTransform: 'lowercase',
              lineHeight: 1.4,
            }}
          >
            {l.sub}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  root: {
    background: 'var(--bg-deep)',
    minHeight: '100vh',
    overflowX: 'hidden',
  },

  // Hero
  hero: {
    position: 'relative',
    width: '100%',
    height: '100vh',
    minHeight: 600,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  terrainHost: {
    position: 'absolute',
    inset: 0,
    zIndex: 1,
  },

  // Top bar
  topbar: {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '24px 32px 0',
    pointerEvents: 'none',
    background: 'linear-gradient(to bottom, rgba(0,5,8,0.75) 0%, transparent 100%)',
  },
  topbarLeft: {
    display: 'grid',
    gap: 8,
  },
  topbarRight: {
    display: 'grid',
    gap: 4,
    textAlign: 'right',
  },
  wordmarkBox: {
    display: 'inline-block',
    background: 'rgba(0,8,5,0.85)',
    padding: '12px 20px 10px',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(110,231,183,0.2)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
  },
  wordmark: {
    fontSize: 'clamp(2.8rem, 5.5vw, 5rem)',
    color: '#a8e6c0',
    letterSpacing: '0.18em',
    lineHeight: 1,
    textShadow: '0 0 60px rgba(110,231,183,0.7)',
    fontWeight: 400,
  },
  taglineBox: {
    display: 'inline-block',
    background: 'rgba(0,8,5,0.75)',
    padding: '6px 12px',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(110,231,183,0.12)',
  },
  tagline: {
    fontSize: 10,
    letterSpacing: '0.32em',
    color: 'rgba(168,230,192,0.85)',
    textTransform: 'uppercase',
    fontWeight: 300,
  },
  coord: {
    fontSize: 11,
    letterSpacing: '0.18em',
    color: 'rgba(168,230,192,0.6)',
    fontWeight: 300,
    textShadow: '0 1px 3px rgba(0,0,0,0.9)',
  },
  clock: {
    fontSize: 13,
    letterSpacing: '0.22em',
    color: 'rgba(168,230,192,0.8)',
    fontWeight: 300,
    textShadow: '0 1px 3px rgba(0,0,0,0.9)',
  },

  // Listening badge
  listeningBadge: {
    position: 'absolute',
    top: 28,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    pointerEvents: 'none',
    background: 'rgba(0,8,5,0.65)',
    padding: '6px 14px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(110,231,183,0.15)',
  },
  listeningDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    background: 'var(--biophony)',
    boxShadow: '0 0 10px var(--biophony)',
  },
  listeningLabel: {
    fontSize: 9,
    letterSpacing: '0.36em',
    color: 'rgba(168,230,192,0.8)',
    textTransform: 'uppercase',
    fontWeight: 300,
  },

  // Data strip (bottom left)
  dataStrip: {
    position: 'absolute',
    bottom: 80,
    left: 32,
    zIndex: 10,
    display: 'flex',
    gap: 3,
    flexWrap: 'wrap',
    maxWidth: '55vw',
  },
  dataPill: {
    display: 'grid',
    gap: 3,
    padding: '10px 14px',
    background: 'rgba(0, 8, 5, 0.82)',
    border: '1px solid rgba(110,231,183,0.25)',
    backdropFilter: 'blur(16px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
  },
  dataPillLabel: {
    fontSize: 9,
    letterSpacing: '0.32em',
    textTransform: 'uppercase',
    fontWeight: 300,
  },
  dataPillValue: {
    fontSize: 22,
    fontWeight: 400,
    color: '#f0fff8',
    letterSpacing: '-0.02em',
    fontFamily: 'var(--font-serif), serif',
    lineHeight: 1,
    textShadow: '0 0 20px rgba(110,231,183,0.3)',
  },
  dataPillUnit: {
    fontSize: 11,
    letterSpacing: '0.12em',
    color: 'rgba(168,230,192,0.6)',
    marginLeft: 3,
    fontWeight: 300,
  },

  // Control strip (bottom right)
  controlStrip: {
    position: 'absolute',
    bottom: 80,
    right: 32,
    zIndex: 10,
    display: 'grid',
    gap: 10,
    alignItems: 'end',
    justifyItems: 'end',
    maxWidth: 300,
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(0,8,5,0.7)',
    padding: '6px 12px',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(110,231,183,0.12)',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    animation: 'aura-flicker 2s infinite',
  },
  statusLabel: {
    fontSize: 10,
    letterSpacing: '0.28em',
    textTransform: 'uppercase',
    fontWeight: 300,
  },
  nodeId: {
    fontSize: 10,
    letterSpacing: '0.18em',
    color: 'rgba(168,230,192,0.5)',
    fontWeight: 300,
  },
  micBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 18px',
    border: '1px solid',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
  },
  micDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    flexShrink: 0,
  },
  micLabel: {
    fontSize: 11,
    letterSpacing: '0.28em',
    textTransform: 'uppercase',
    fontWeight: 300,
  },
  micHint: {
    fontSize: 9,
    letterSpacing: '0.14em',
    color: 'rgba(168,230,192,0.5)',
    textTransform: 'uppercase',
    lineHeight: 1.5,
    textAlign: 'right',
    maxWidth: 260,
    margin: 0,
    fontWeight: 300,
    textShadow: '0 1px 4px rgba(0,0,0,0.8)',
  },

  // Scroll hint
  scrollHint: {
    position: 'absolute',
    bottom: 28,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    pointerEvents: 'none',
  },
  scrollLabel: {
    fontSize: 8,
    letterSpacing: '0.36em',
    color: 'var(--data-ghost)',
    textTransform: 'uppercase',
    fontWeight: 300,
  },
  scrollLine: {
    width: 1,
    height: 24,
    background: 'linear-gradient(to bottom, var(--data-ghost), transparent)',
  },
};
