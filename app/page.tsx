'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import AuroraBackground from '@/components/AuroraBackground';
import ChannelDeck from '@/components/ChannelDeck';
import ContextPanel from '@/components/ContextPanel';
import MicCapsule from '@/components/MicCapsule';
import Marquee from '@/components/Marquee';
import Spectrogram from '@/components/Spectrogram';
import FrequencyBars from '@/components/FrequencyBars';
import Waveform from '@/components/Waveform';
import RadialMeter from '@/components/RadialMeter';
import { useMicAnalyser } from '@/lib/mic-analyser';
import { generate24h } from '@/lib/history-mock';
import type { SensorApiResponse } from '@/lib/sensor-store';
import type { VoxelChannel } from '@/components/VoxelObservatory';

const VoxelObservatory = dynamic(() => import('@/components/VoxelObservatory'), {
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
  const [activeChannel, setActiveChannel] = useState<VoxelChannel | null>(null);

  const mic = useMicAnalyser(1024);
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
    const base = 0.55 + Math.abs(t - 22) / 18 + Math.abs(60 - h) / 80;
    return Math.min(1.6, base + mic.level * 0.6);
  }, [sensor.temperature, sensor.humidity, mic.level]);

  const ndsi = acousticNow.ndsi;
  const micActive = mic.status === 'granted';

  const channelLevels = useMemo(() => {
    const t = sensor.temperature ?? 22;
    const h = sensor.humidity ?? 60;
    const sensorLoad = Math.min(1, Math.abs(t - 22) / 18 + Math.abs(60 - h) / 80);
    if (micActive) {
      return {
        biophony: clamp(mic.bands.high * 1.15),
        anthrophony: clamp(mic.bands.mid * 1.1),
        geophony: clamp(mic.bands.low * 1.2),
        sensor: clamp(0.35 + sensorLoad * 0.6)
      };
    }
    return {
      biophony: clamp(acousticNow.biophony / 100),
      anthrophony: clamp(acousticNow.anthrophony / 100),
      geophony: clamp(acousticNow.geophony / 100),
      sensor: clamp(0.35 + sensorLoad * 0.55)
    };
  }, [mic.bands, micActive, acousticNow, sensor.temperature, sensor.humidity]);

  const tickerItems = [
    'AURA · 2.2 · urban ecosystem health observatory',
    `node ${sensor.nodeId}`,
    `t ${formatNumber(sensor.temperature)} °c`,
    `rh ${formatNumber(sensor.humidity, 0)} %`,
    `state ${STATE_LABEL[sensor.state]}`,
    `ndsi ${ndsi.toFixed(2)}`,
    `bio ${(channelLevels.biophony * 100).toFixed(0)}%`,
    `ant ${(channelLevels.anthrophony * 100).toFixed(0)}%`,
    `geo ${(channelLevels.geophony * 100).toFixed(0)}%`,
    micActive ? 'mic · live room input' : 'mic · ready to activate',
    'urban ecosystem mapping · bernie krause',
    'agents + ai + depin + data-as-a-service'
  ];

  const heroEyebrow = micActive ? 'live · room audio feeding the observatory' : 'urban ecosystem health · live node + optional room audio';

  return (
    <div style={styles.shell}>
      <AuroraBackground />

      <style>{`
        body { overflow: hidden; }
        @media (max-width: 1480px) {
          .aura-cockpit-grid {
            grid-template-columns: minmax(196px, 220px) minmax(0, 1fr) minmax(248px, 286px) !important;
          }
          .aura-stage-viz {
            width: min(292px, calc(100% - 28px)) !important;
          }
        }
        @media (max-width: 1320px) {
          .aura-stage-viz {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            width: min(268px, calc(100% - 24px)) !important;
          }
        }
        @media (max-width: 1240px) {
          body { overflow: auto; }
          .aura-cockpit-grid {
            grid-template-columns: 1fr !important;
            grid-template-rows: auto auto auto !important;
            height: auto !important;
          }
          .aura-stage {
            min-height: 62vh !important;
          }
          .aura-shell {
            height: auto !important;
            min-height: 100vh !important;
          }
        }
      `}</style>

      <main className="aura-shell" style={styles.main}>
        <header style={styles.topbar}>
          <div style={styles.topbarLeft}>
            <span style={styles.logo}>
              <span style={styles.logoMark}>◐</span>
              <span style={styles.logoText}>AURA</span>
              <span className="aura-mono" style={styles.logoVer}>2.2</span>
            </span>
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
            {micActive && <span className="aura-tag">mic · listening</span>}
          </div>
          <div style={styles.topbarRight}>
            <span className="aura-mono" style={styles.coord}>19.4326° N</span>
            <span className="aura-mono" style={styles.coord}>99.1332° W</span>
            <span className="aura-mono" style={styles.clock}>{formatClock(now)}</span>
          </div>
        </header>

        <div className="aura-cockpit-grid" style={styles.grid}>
          <aside style={styles.railLeft}>
            <section style={styles.heroBlock}>
              <span className="aura-mono" style={styles.heroEyebrow}>{heroEyebrow}</span>
              <h1 style={styles.heroTitle}>
                listening<br />
                to a city<br />
                <span className="aura-serif" style={styles.heroAccent}>that breathes</span>
              </h1>
              <p style={styles.heroLede}>
                AURA maps the health of urban ecosystems through sound, climate and autonomous interpretation. This node listens for biophony, anthropophony and geophony, then layers live telemetry and future AI agents to detect environmental stress faster.
              </p>
              <div style={styles.heroActions}>
                <button
                  type="button"
                  onClick={() => (micActive ? mic.stop() : mic.request())}
                  style={{
                    ...styles.heroButton,
                    borderColor: micActive ? '#fb7185' : '#6ee7b7',
                    color: micActive ? '#fecaca' : '#b8ffd8',
                    background: micActive ? 'rgba(251,113,133,0.1)' : 'rgba(110,231,183,0.1)'
                  }}
                >
                  {micActive ? 'release live mic' : 'activate live mic'}
                </button>
                <span className="aura-mono" style={styles.heroActionHint}>
                  {micActive ? 'your room is driving the spectra now' : 'click once to let the browser feed live audio into the spectra'}
                </span>
              </div>
            </section>

            <ChannelDeck
              active={activeChannel}
              onSelect={setActiveChannel}
              channelLevels={channelLevels}
            />

            <div style={styles.miniReadouts}>
              <Readout label="t" value={formatNumber(sensor.temperature)} unit="°C" color="#6ee7b7" />
              <Readout label="rh" value={formatNumber(sensor.humidity, 0)} unit="%" color="#7dd3fc" />
              <Readout label="ndsi" value={ndsi.toFixed(2)} unit="" color="#c4b5fd" />
            </div>
          </aside>

          <section className="aura-stage" style={styles.stage}>
            <div style={styles.stageFrame} className="aura-frame">
              <span className="aura-corner tl" />
              <span className="aura-corner tr" />
              <span className="aura-corner bl" />
              <span className="aura-corner br" />

              <div style={styles.stageOverlayTop}>
                <span className="aura-mono" style={styles.miniLabel}>
                  voxel observatory · {activeChannel ? activeChannel.toUpperCase() : 'ALL CHANNELS'}
                </span>
                <span className="aura-mono" style={styles.miniLabel}>
                  amp x {intensity.toFixed(2)}
                </span>
              </div>

              <div style={styles.canvasHost}>
                <VoxelObservatory
                  active={activeChannel}
                  onSelect={(c) => setActiveChannel((curr) => (curr === c ? null : c))}
                  channelLevels={channelLevels}
                  micAnalyser={mic.analyser}
                  pulse={mic.level}
                />
                <div className="aura-stage-viz" style={styles.stageVizOverlay}>
                  <div style={{ ...styles.stageVizCard, borderColor: activeChannel === 'sensor' ? '#c4b5fd66' : 'rgba(255,255,255,0.08)' }}>
                    <div style={styles.stageVizHead}><span className="aura-mono" style={{ ...styles.stageVizLabel, color: '#c4b5fd' }}>sensor</span></div>
                    <div style={styles.stageVizBodyCompact}>
                      <RadialMeter label="t" value={sensor.temperature ?? 0} min={-5} max={45} unit="°C" color="#6ee7b7" size={92} />
                      <RadialMeter label="rh" value={sensor.humidity ?? 0} min={0} max={100} unit="%" color="#7dd3fc" size={92} />
                    </div>
                  </div>
                  <div style={{ ...styles.stageVizCard, borderColor: activeChannel === 'biophony' ? '#6ee7b766' : 'rgba(255,255,255,0.08)' }}>
                    <div style={styles.stageVizHead}><span className="aura-mono" style={{ ...styles.stageVizLabel, color: '#6ee7b7' }}>bio</span></div>
                    <Spectrogram height={92} intensity={intensity} speed={1 + intensity * 0.5} analyser={mic.analyser} />
                  </div>
                  <div style={{ ...styles.stageVizCard, borderColor: activeChannel === 'anthrophony' ? '#fb923c66' : 'rgba(255,255,255,0.08)' }}>
                    <div style={styles.stageVizHead}><span className="aura-mono" style={{ ...styles.stageVizLabel, color: '#fb923c' }}>anthro</span></div>
                    <FrequencyBars height={78} intensity={intensity} analyser={mic.analyser} bars={24} />
                  </div>
                  <div style={{ ...styles.stageVizCard, borderColor: activeChannel === 'geophony' ? '#7dd3fc66' : 'rgba(255,255,255,0.08)' }}>
                    <div style={styles.stageVizHead}><span className="aura-mono" style={{ ...styles.stageVizLabel, color: '#7dd3fc' }}>geo</span></div>
                    <Waveform height={72} intensity={Math.min(1.1, 0.6 + intensity * 0.45)} color="#7dd3fc" analyser={mic.analyser} />
                  </div>
                </div>
              </div>

              <div style={styles.stageOverlayBottom}>
                <Quadrant label="biophony" hint="NE" color="#6ee7b7" active={activeChannel === 'biophony'} onClick={() => setActiveChannel((c) => c === 'biophony' ? null : 'biophony')} />
                <Quadrant label="sensor" hint="NW" color="#c4b5fd" active={activeChannel === 'sensor'} onClick={() => setActiveChannel((c) => c === 'sensor' ? null : 'sensor')} />
                <Quadrant label="geophony" hint="SE" color="#7dd3fc" active={activeChannel === 'geophony'} onClick={() => setActiveChannel((c) => c === 'geophony' ? null : 'geophony')} />
                <Quadrant label="anthrophony" hint="SW" color="#fb923c" active={activeChannel === 'anthrophony'} onClick={() => setActiveChannel((c) => c === 'anthrophony' ? null : 'anthrophony')} />
              </div>
            </div>
          </section>

          <aside style={styles.railRight}>
            <div className="aura-frame" style={styles.contextFrame}>
              <ContextPanel
                active={activeChannel}
                sensor={sensor}
                history={history}
                intensity={intensity}
                ndsi={ndsi}
                micAnalyser={mic.analyser}
                micActive={micActive}
              />
            </div>
            <MicCapsule mic={mic} compact />
          </aside>
        </div>

        <footer style={styles.dock}>
          <div style={styles.dockMarquee}>
            <Marquee items={tickerItems} speed={52} />
          </div>
        </footer>
      </main>
    </div>
  );
}

function clamp(v: number) {
  return Math.max(0, Math.min(1, v));
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

function Quadrant({
  label,
  hint,
  color,
  active,
  onClick
}: {
  label: string;
  hint: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...styles.quadrantBtn,
        borderColor: active ? color : 'rgba(255,255,255,0.1)',
        color: active ? color : 'rgba(220,235,225,0.6)',
        background: active
          ? `linear-gradient(120deg, ${color}22, transparent)`
          : 'rgba(255,255,255,0.02)',
        boxShadow: active ? `inset 0 0 0 1px ${color}55` : 'none'
      }}
    >
      <span style={{ ...styles.quadrantHint, color }}>{hint}</span>
      <span style={styles.quadrantLabel}>{label}</span>
    </button>
  );
}

const styles: Record<string, CSSProperties> = {
  shell: {
    position: 'relative',
    width: '100%',
    height: '100vh',
    overflow: 'hidden'
  },
  main: {
    position: 'relative',
    zIndex: 1,
    width: 'min(1460px, calc(100% - 20px))',
    margin: '0 auto',
    padding: '10px 0 10px',
    display: 'grid',
    gridTemplateRows: 'auto 1fr auto',
    gap: 10,
    height: '100vh'
  },
  topbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    padding: '4px 0 8px',
    borderBottom: '1px solid rgba(255,255,255,0.06)'
  },
  topbarLeft: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  topbarRight: { display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' },
  logo: {
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: 8,
    paddingRight: 14,
    borderRight: '1px solid rgba(255,255,255,0.08)'
  },
  logoMark: {
    fontSize: 18,
    color: '#6ee7b7',
    textShadow: '0 0 14px rgba(110,231,183,0.55)'
  },
  logoText: {
    fontSize: 16,
    letterSpacing: '0.32em',
    color: '#f4fff8'
  },
  logoVer: {
    fontSize: 10,
    color: 'rgba(220,235,225,0.55)',
    letterSpacing: '0.2em'
  },
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(208px, 220px) minmax(0, 1fr) minmax(260px, 304px)',
    gap: 10,
    height: '100%',
    minHeight: 0
  },
  railLeft: {
    display: 'grid',
    gridTemplateRows: 'auto auto auto',
    gap: 8,
    minHeight: 0,
    overflowY: 'auto',
    paddingRight: 2
  },
  railRight: {
    display: 'grid',
    gridTemplateRows: 'minmax(0, 1fr) auto',
    gap: 8,
    minHeight: 0
  },
  heroBlock: {
    display: 'grid',
    gap: 6
  },
  heroEyebrow: {
    fontSize: 10,
    letterSpacing: '0.32em',
    textTransform: 'uppercase',
    color: '#6ee7b7'
  },
  heroTitle: {
    margin: 0,
    fontSize: 'clamp(1.72rem, 2.7vw, 2.7rem)',
    lineHeight: 0.94,
    letterSpacing: '-0.045em',
    fontWeight: 600,
    color: '#f4fff8'
  },
  heroAccent: {
    fontStyle: 'italic',
    color: '#b8ffd8'
  },
  heroLede: {
    margin: 0,
    fontSize: 11,
    lineHeight: 1.42,
    color: 'rgba(220,235,225,0.72)',
    maxWidth: '28ch'
  },
  heroActions: {
    display: 'grid',
    gap: 6,
    alignItems: 'start'
  },
  heroButton: {
    appearance: 'none',
    border: '1px solid',
    borderRadius: 8,
    padding: '9px 10px',
    fontFamily: 'var(--font-mono), monospace',
    fontSize: 10,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    justifySelf: 'start',
    cursor: 'pointer'
  },
  heroActionHint: {
    fontSize: 9,
    letterSpacing: '0.11em',
    color: 'rgba(220,235,225,0.54)',
    lineHeight: 1.4,
    maxWidth: '28ch'
  },
  miniReadouts: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 5
  },
  readout: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    padding: '7px 8px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.07)',
    background: 'rgba(255,255,255,0.025)',
    minWidth: 0
  },
  readoutLabel: {
    fontFamily: 'var(--font-mono), monospace',
    fontSize: 9,
    letterSpacing: '0.28em',
    textTransform: 'uppercase'
  },
  readoutValue: {
    fontSize: 16,
    fontWeight: 600,
    color: '#f1fff5',
    letterSpacing: '-0.03em'
  },
  readoutUnit: {
    fontFamily: 'var(--font-mono), monospace',
    fontSize: 10,
    color: 'rgba(220,235,225,0.5)'
  },
  stage: {
    display: 'grid',
    minHeight: 0
  },
  stageFrame: {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'grid',
    gridTemplateRows: 'auto 1fr auto',
    padding: 12,
    minHeight: 0
  },
  stageOverlayTop: {
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
    minHeight: 0,
    overflow: 'hidden'
  },
  stageOverlayBottom: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 6,
    paddingTop: 8,
    borderTop: '1px solid rgba(255,255,255,0.06)'
  },
  quadrantBtn: {
    appearance: 'none',
    cursor: 'pointer',
    padding: '7px 8px',
    borderRadius: 10,
    border: '1px solid',
    display: 'grid',
    gap: 2,
    textAlign: 'left',
    transition: 'all 0.18s ease'
  },
  quadrantHint: {
    fontFamily: 'var(--font-mono), monospace',
    fontSize: 9,
    letterSpacing: '0.28em',
    textTransform: 'uppercase'
  },
  quadrantLabel: {
    fontSize: 12,
    letterSpacing: '0.04em'
  },
  contextFrame: {
    minHeight: 0,
    overflow: 'auto',
    display: 'grid'
  },
  stageVizOverlay: {
    position: 'absolute',
    right: 12,
    bottom: 64,
    width: 'min(304px, calc(100% - 24px))',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 8,
    alignItems: 'end',
    pointerEvents: 'none'
  },
  stageVizCard: {
    pointerEvents: 'none',
    alignSelf: 'end',
    minHeight: 92,
    padding: '7px 7px 6px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(4,8,7,0.42)',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.18)'
  },
  stageVizHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  stageVizLabel: {
    fontSize: 9,
    letterSpacing: '0.24em',
    textTransform: 'uppercase'
  },
  stageVizBodyCompact: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 2,
    placeItems: 'center'
  },
  dock: {
    display: 'grid'
  },
  dockMarquee: {
    width: '100%'
  }
};
