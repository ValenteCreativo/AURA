'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import AuroraBackground from '@/components/AuroraBackground';
import Spectrogram from '@/components/Spectrogram';
import Waveform from '@/components/Waveform';
import FrequencyBars from '@/components/FrequencyBars';
import RadialMeter from '@/components/RadialMeter';
import PolarSignature from '@/components/PolarSignature';
import NodeConstellation from '@/components/NodeConstellation';
import Marquee from '@/components/Marquee';
import { ACOUSTIC_LAYERS, generate24h } from '@/lib/history-mock';
import type { SensorApiResponse } from '@/lib/sensor-store';

const SensorOrb3D = dynamic(() => import('@/components/SensorOrb3D'), {
  ssr: false,
  loading: () => null
});

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

const STATE_COLOR: Record<SensorApiResponse['state'], string> = {
  balanced: '#6ee7b7',
  attention: '#fbbf24',
  alert: '#fb7185',
  disconnected: '#7dd3fc'
};

const STATE_LABEL: Record<SensorApiResponse['state'], string> = {
  balanced: 'BALANCED',
  attention: 'ATTENTION',
  alert: 'ALERT',
  disconnected: 'STANDBY'
};

function formatNumber(value: number | null, digits = 1) {
  return value === null ? '--' : value.toFixed(digits);
}

function formatClock(timestamp: number | null) {
  if (!timestamp) return '--:--:--';
  const d = new Date(timestamp);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export default function HomePage() {
  const [sensor, setSensor] = useState<SensorApiResponse>(DISCONNECTED);
  const [now, setNow] = useState<number>(() => Date.now());

  const history = useMemo(() => generate24h(42), []);
  const acousticNow = history[history.length - 1];

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const response = await fetch('/api/sensor', { cache: 'no-store' });
        if (!response.ok) throw new Error();
        const json = (await response.json()) as SensorApiResponse;
        if (mounted) setSensor(json);
      } catch {
        if (mounted) setSensor(DISCONNECTED);
      }
    }
    load();
    const interval = setInterval(load, 5000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
      clearInterval(tick);
    };
  }, []);

  const stateColor = STATE_COLOR[sensor.state];
  const intensity = useMemo(() => {
    const t = sensor.temperature ?? 22;
    const h = sensor.humidity ?? 60;
    return Math.min(1.4, 0.55 + Math.abs(t - 22) / 18 + Math.abs(60 - h) / 80);
  }, [sensor.temperature, sensor.humidity]);

  const ndsi = acousticNow.ndsi;

  const tickerItems = [
    `node aura-001`,
    `t ${formatNumber(sensor.temperature)} °c`,
    `rh ${formatNumber(sensor.humidity, 0)} %`,
    `state ${STATE_LABEL[sensor.state]}`,
    `ndsi ${ndsi.toFixed(2)}`,
    `biophony ${acousticNow.biophony.toFixed(0)}%`,
    `anthropophony ${acousticNow.anthrophony.toFixed(0)}%`,
    `geophony ${acousticNow.geophony.toFixed(0)}%`,
    `mesh 6 nodes · 1 live`,
    `agentic layer · stand-by`,
    `bernie krause · soundscape ecology`,
    `depin · data-as-a-service`
  ];

  return (
    <div style={styles.shell}>
      <AuroraBackground />

      <style>{`
        @media (max-width: 1180px) {
          .aura-grid-hero,
          .aura-grid-three,
          .aura-grid-two {
            grid-template-columns: 1fr !important;
          }
          .aura-grid-meters {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 720px) {
          .aura-grid-meters {
            grid-template-columns: 1fr 1fr !important;
            gap: 10px !important;
          }
          .aura-readout-row { flex-wrap: wrap !important; }
        }
      `}</style>

      <main style={styles.main}>
        <header style={styles.topbar}>
          <div style={styles.topbarLeft}>
            <span className="aura-tag">AURA / 2.1</span>
            <span className="aura-tag mute">{sensor.nodeId}</span>
            <span
              className={`aura-tag ${sensor.state === 'alert' ? 'alert' : sensor.state === 'attention' ? 'warn' : sensor.state === 'balanced' ? '' : 'mute'}`}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: stateColor,
                  boxShadow: `0 0 10px ${stateColor}`,
                  animation: 'aura-flicker 1.6s infinite'
                }}
              />
              {STATE_LABEL[sensor.state]}
            </span>
          </div>
          <div style={styles.topbarRight}>
            <span className="aura-mono" style={styles.coord}>19.4326° N</span>
            <span className="aura-mono" style={styles.coord}>99.1332° W</span>
            <span className="aura-mono" style={styles.clock}>{formatClock(now)}</span>
          </div>
        </header>

        <section className="aura-grid-hero" style={styles.hero}>
          <div style={styles.heroLeft}>
            <span className="aura-tag">live · bioacoustic intelligence</span>
            <h1 style={styles.heroTitle}>
              the city <span className="aura-serif" style={{ fontStyle: 'italic', color: '#b8ffd8' }}>breathes</span>.
              <br />
              we listen.
            </h1>
            <div className="aura-readout-row" style={styles.heroReadouts}>
              <Readout label="t" value={formatNumber(sensor.temperature)} unit="°C" color="#6ee7b7" />
              <Readout label="rh" value={formatNumber(sensor.humidity, 0)} unit="%" color="#7dd3fc" />
              <Readout label="ndsi" value={ndsi.toFixed(2)} unit="" color="#c4b5fd" />
              <Readout label="seen" value={sensor.timestamp ? formatClock(sensor.timestamp).slice(0, 5) : '--:--'} unit="" color="#fbbf24" />
            </div>
          </div>

          <div className="aura-frame" style={styles.heroStage}>
            <span className="aura-corner tl" />
            <span className="aura-corner tr" />
            <span className="aura-corner bl" />
            <span className="aura-corner br" />
            <div style={styles.heroStageTop}>
              <span className="aura-mono" style={styles.miniLabel}>ECOSYSTEM ORB · {STATE_LABEL[sensor.state]}</span>
              <span className="aura-mono" style={styles.miniLabel}>x {(intensity).toFixed(2)} amp</span>
            </div>
            <div style={styles.canvasHost}>
              <SensorOrb3D
                temperature={sensor.temperature}
                humidity={sensor.humidity}
                state={sensor.state}
              />
            </div>
            <div style={styles.heroStageBottom}>
              <RingTick label="bio" value={acousticNow.biophony / 100} color="#6ee7b7" />
              <RingTick label="ant" value={acousticNow.anthrophony / 100} color="#fb923c" />
              <RingTick label="geo" value={acousticNow.geophony / 100} color="#7dd3fc" />
            </div>
          </div>
        </section>

        <Marquee items={tickerItems} speed={48} />

        <section style={styles.spectroWrap} className="aura-frame">
          <div style={styles.sectionRow}>
            <div>
              <span className="aura-mono" style={styles.eyebrow}>spectrogram · live emulation</span>
              <h2 style={styles.subTitle}>0.06 – 11 kHz</h2>
            </div>
            <div style={styles.sectionLegend}>
              {ACOUSTIC_LAYERS.map((layer) => (
                <span key={layer.id} style={styles.legendChip}>
                  <span style={{ ...styles.legendSwatch, background: layer.color }} />
                  <span>{layer.name.toLowerCase()}</span>
                  <span className="aura-mono" style={styles.legendRange}>{layer.range}</span>
                </span>
              ))}
            </div>
          </div>
          <Spectrogram height={260} intensity={intensity} speed={1 + intensity * 0.6} />
        </section>

        <section className="aura-grid-two" style={styles.twoCol}>
          <div className="aura-frame" style={styles.panel}>
            <div style={styles.sectionRow}>
              <div>
                <span className="aura-mono" style={styles.eyebrow}>waveform · 5 s window</span>
                <h2 style={styles.subTitle}>signal envelope</h2>
              </div>
              <span className="aura-tag mute">x{(0.6 + intensity * 0.8).toFixed(2)}</span>
            </div>
            <Waveform color={stateColor} intensity={Math.min(1.2, 0.7 + intensity * 0.6)} height={150} />
            <div className="aura-grid-meters" style={styles.meterGrid}>
              <div style={styles.meterCell}>
                <RadialMeter
                  label="temp"
                  value={sensor.temperature ?? 0}
                  min={-5}
                  max={45}
                  unit="°C"
                  color="#6ee7b7"
                  size={150}
                />
              </div>
              <div style={styles.meterCell}>
                <RadialMeter
                  label="hum"
                  value={sensor.humidity ?? 0}
                  min={0}
                  max={100}
                  unit="%"
                  color="#7dd3fc"
                  size={150}
                />
              </div>
              <div style={styles.meterCell}>
                <RadialMeter
                  label="ndsi"
                  value={(ndsi + 1) * 50}
                  min={0}
                  max={100}
                  unit=""
                  color="#c4b5fd"
                  size={150}
                />
              </div>
              <div style={styles.meterCell}>
                <RadialMeter
                  label="bio"
                  value={acousticNow.biophony}
                  min={0}
                  max={100}
                  unit="%"
                  color="#fbbf24"
                  size={150}
                />
              </div>
            </div>
          </div>

          <div className="aura-frame" style={styles.panel}>
            <div style={styles.sectionRow}>
              <div>
                <span className="aura-mono" style={styles.eyebrow}>frequency bands · 60 hz – 11 khz</span>
                <h2 style={styles.subTitle}>biophony / anthropophony / geophony</h2>
              </div>
            </div>
            <FrequencyBars height={220} intensity={intensity} />
            <div style={{ marginTop: 18 }}>
              <PolarSignature data={history} size={360} />
            </div>
            <div style={styles.legendStack}>
              {ACOUSTIC_LAYERS.map((layer) => (
                <div key={layer.id} style={styles.legendStackRow}>
                  <span style={{ ...styles.legendDot, background: layer.color }} />
                  <span style={{ color: layer.color, fontFamily: 'var(--font-mono), monospace', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                    {layer.name}
                  </span>
                  <span className="aura-mono" style={{ color: 'rgba(220,235,225,0.5)', fontSize: 11 }}>
                    {layer.range}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="aura-grid-two" style={styles.twoCol}>
          <div className="aura-frame" style={styles.panel}>
            <div style={styles.sectionRow}>
              <div>
                <span className="aura-mono" style={styles.eyebrow}>mesh · constellation</span>
                <h2 style={styles.subTitle}>distributed listening</h2>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span className="aura-tag">live · 1</span>
                <span className="aura-tag warn">soon · 1</span>
                <span className="aura-tag mute">idea · 4</span>
              </div>
            </div>
            <NodeConstellation height={360} liveState={sensor.state} />
          </div>

          <div className="aura-frame" style={styles.panel}>
            <div style={styles.sectionRow}>
              <div>
                <span className="aura-mono" style={styles.eyebrow}>signal · 24h trace</span>
                <h2 style={styles.subTitle}>thermohygro & acoustic flow</h2>
              </div>
              <span className="aura-tag mute">{history.length} samples</span>
            </div>
            <SignalLanes data={history} />
          </div>
        </section>

        <footer style={styles.footer}>
          <div style={styles.footerCol}>
            <span className="aura-mono" style={styles.eyebrow}>aura · 2.1</span>
            <p style={styles.footerCopy}>
              autonomous urban regeneration via audio. <br />
              depin + data-as-a-service.
            </p>
          </div>
          <div style={styles.footerCol}>
            <span className="aura-mono" style={styles.eyebrow}>stack</span>
            <p style={styles.footerCopy}>
              esp32 / dht11 → next.js / r3f → agentic layer.
            </p>
          </div>
          <div style={styles.footerCol}>
            <span className="aura-mono" style={styles.eyebrow}>thesis</span>
            <p style={styles.footerCopy}>rembu · sen · aona · arvi · aura.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}

function Readout({
  label,
  value,
  unit,
  color
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <div style={styles.readout}>
      <span style={{ ...styles.readoutLabel, color }}>{label}</span>
      <strong style={styles.readoutValue}>{value}</strong>
      {unit && <span style={styles.readoutUnit}>{unit}</span>}
    </div>
  );
}

function RingTick({
  label,
  value,
  color
}: {
  label: string;
  value: number;
  color: string;
}) {
  const v = Math.max(0, Math.min(1, value));
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div style={styles.ringTick}>
      <svg width={56} height={56} viewBox="0 0 56 56">
        <circle cx={28} cy={28} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
        <circle
          cx={28}
          cy={28}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeDasharray={`${c * v} ${c}`}
          strokeLinecap="round"
          transform="rotate(-90 28 28)"
          style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
        />
      </svg>
      <div style={styles.ringTickLabel}>
        <span style={{ color, fontSize: 10, fontFamily: 'var(--font-mono), monospace', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
          {label}
        </span>
        <strong style={{ color: '#f1fff5', fontSize: 14 }}>{Math.round(v * 100)}</strong>
      </div>
    </div>
  );
}

function SignalLanes({ data }: { data: ReturnType<typeof generate24h> }) {
  const lanes = [
    { key: 'temperature' as const, label: 'temp', color: '#6ee7b7', unit: '°C' },
    { key: 'humidity' as const, label: 'rh', color: '#7dd3fc', unit: '%' },
    { key: 'biophony' as const, label: 'bio', color: '#fbbf24', unit: '' },
    { key: 'anthrophony' as const, label: 'ant', color: '#fb923c', unit: '' },
    { key: 'geophony' as const, label: 'geo', color: '#a78bfa', unit: '' }
  ];

  const w = 100;
  const laneH = 28;

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {lanes.map((lane) => {
        const values = data.map((d) => d[lane.key]);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const span = Math.max(0.001, max - min);
        const baseY = laneH * 0.92;
        const peakY = laneH * 0.1;
        const path = values
          .map((v, i) => {
            const x = (i / (values.length - 1)) * w;
            const norm = (v - min) / span;
            const y = baseY + (peakY - baseY) * norm;
            return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
          })
          .join(' ');
        const fill = `${path} L${w},${baseY} L0,${baseY} Z`;
        const last = data[data.length - 1][lane.key];

        return (
          <div key={lane.key} style={styles.signalLaneRow}>
            <div style={styles.signalLaneLabelInline}>
              <span style={{ color: lane.color, fontFamily: 'var(--font-mono), monospace', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                {lane.label}
              </span>
              <span style={{ color: 'rgba(220,235,225,0.5)', fontFamily: 'var(--font-mono), monospace', fontSize: 10 }}>
                {last.toFixed(1)}
                {lane.unit}
              </span>
            </div>
            <svg
              viewBox={`0 0 ${w} ${laneH}`}
              preserveAspectRatio="none"
              style={{ width: '100%', height: 64, display: 'block', flex: 1 }}
            >
              <line x1={0} y1={baseY} x2={w} y2={baseY} stroke="rgba(255,255,255,0.06)" strokeWidth={0.15} />
              <path d={fill} fill={lane.color} fillOpacity={0.16} />
              <path d={path} fill="none" stroke={lane.color} strokeWidth={0.7} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  shell: {
    position: 'relative',
    minHeight: '100vh'
  },
  main: {
    position: 'relative',
    zIndex: 1,
    width: 'min(1480px, calc(100% - 32px))',
    margin: '0 auto',
    padding: '24px 0 64px',
    display: 'grid',
    gap: 22
  },
  topbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    padding: '10px 0',
    borderBottom: '1px solid rgba(255,255,255,0.06)'
  },
  topbarLeft: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  topbarRight: { display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' },
  coord: {
    color: 'rgba(220,235,225,0.55)',
    fontSize: 11,
    letterSpacing: '0.16em'
  },
  clock: {
    color: '#b8ffd8',
    fontSize: 13,
    letterSpacing: '0.22em'
  },
  hero: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 0.85fr) minmax(0, 1.15fr)',
    gap: 22,
    alignItems: 'stretch'
  },
  heroLeft: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 28,
    padding: '12px 0'
  },
  heroTitle: {
    margin: 0,
    fontSize: 'clamp(3.6rem, 9vw, 8rem)',
    lineHeight: 0.94,
    letterSpacing: '-0.06em',
    fontWeight: 600,
    color: '#f4fff8'
  },
  heroReadouts: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap'
  },
  readout: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '14px 18px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.07)',
    background: 'rgba(255,255,255,0.025)',
    minWidth: 110
  },
  readoutLabel: {
    fontFamily: 'var(--font-mono), monospace',
    fontSize: 10,
    letterSpacing: '0.28em',
    textTransform: 'uppercase'
  },
  readoutValue: {
    fontSize: 28,
    fontWeight: 600,
    color: '#f1fff5',
    letterSpacing: '-0.03em'
  },
  readoutUnit: {
    fontFamily: 'var(--font-mono), monospace',
    fontSize: 11,
    color: 'rgba(220,235,225,0.5)'
  },
  heroStage: {
    position: 'relative',
    minHeight: 540,
    padding: 22,
    display: 'grid',
    gridTemplateRows: 'auto minmax(0,1fr) auto',
    gap: 14
  },
  heroStageTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    color: 'rgba(220,235,225,0.55)',
    fontSize: 11,
    letterSpacing: '0.22em'
  },
  miniLabel: { letterSpacing: '0.22em' },
  canvasHost: {
    position: 'relative',
    width: '100%',
    height: '100%',
    minHeight: 380
  },
  heroStageBottom: {
    display: 'flex',
    justifyContent: 'space-around',
    gap: 14,
    padding: '6px 12px',
    borderTop: '1px solid rgba(255,255,255,0.06)'
  },
  ringTick: {
    position: 'relative',
    width: 56,
    height: 56,
    display: 'grid',
    placeItems: 'center'
  },
  ringTickLabel: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  spectroWrap: {
    padding: 22,
    display: 'grid',
    gap: 16
  },
  sectionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    flexWrap: 'wrap'
  },
  sectionLegend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 14
  },
  legendChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    color: 'rgba(220,235,225,0.7)',
    fontFamily: 'var(--font-mono), monospace',
    letterSpacing: '0.14em'
  },
  legendSwatch: {
    display: 'inline-block',
    width: 10,
    height: 10,
    borderRadius: 999
  },
  legendRange: {
    color: 'rgba(220,235,225,0.4)',
    fontSize: 11
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: '0.32em',
    textTransform: 'uppercase',
    color: '#6ee7b7',
    opacity: 0.85
  },
  subTitle: {
    margin: '8px 0 0',
    fontSize: 'clamp(1.4rem, 2.4vw, 2rem)',
    lineHeight: 1.1,
    fontWeight: 600,
    letterSpacing: '-0.03em',
    color: '#f4fff8'
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 22
  },
  panel: {
    padding: 22,
    display: 'grid',
    gap: 18
  },
  meterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 14,
    marginTop: 6
  },
  meterCell: {
    display: 'grid',
    placeItems: 'center',
    padding: 10,
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.05)',
    background: 'rgba(255,255,255,0.02)'
  },
  legendStack: {
    display: 'grid',
    gap: 8,
    padding: '14px 16px',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.05)',
    background: 'rgba(255,255,255,0.025)'
  },
  legendStackRow: {
    display: 'flex',
    gap: 14,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    boxShadow: '0 0 10px currentColor'
  },
  signalLaneRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '8px 12px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.05)',
    background: 'rgba(255,255,255,0.02)'
  },
  signalLaneLabelInline: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 70
  },
  footer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 22,
    padding: '32px 0 8px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    color: 'rgba(220,235,225,0.6)'
  },
  footerCol: {
    display: 'grid',
    gap: 8
  },
  footerCopy: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.6,
    color: 'rgba(220,235,225,0.7)'
  }
};
