'use client';

import type { CSSProperties } from 'react';
import Spectrogram from './Spectrogram';
import FrequencyBars from './FrequencyBars';
import Waveform from './Waveform';
import RadialMeter from './RadialMeter';
import {
  VOXEL_CHANNEL_COLOR,
  VOXEL_CHANNEL_LABEL,
  VOXEL_QUADRANT_HINT,
  type VoxelChannel
} from './VoxelObservatory';
import type { SensorApiResponse } from '@/lib/sensor-store';
import type { EnvSample } from '@/lib/history-mock';

type Props = {
  active: VoxelChannel | null;
  sensor: SensorApiResponse;
  history: EnvSample[];
  intensity: number;
  ndsi: number;
  micAnalyser: AnalyserNode | null;
  micActive: boolean;
};

const NARRATIVES: Record<VoxelChannel, { eyebrow: string; title: string; body: string }> = {
  biophony: {
    eyebrow: 'biophony · life signal',
    title: 'the chorus',
    body:
      'Birds, insects and vegetation in the upper bands. Dawn and dusk peaks tell you whether the ecosystem still sings.'
  },
  anthrophony: {
    eyebrow: 'anthrophony · human signal',
    title: 'the city pulse',
    body:
      'Traffic, voices and machines push the low-mid range. When this dominates, NDSI falls and the node enters attention.'
  },
  geophony: {
    eyebrow: 'geophony · elemental signal',
    title: 'wind, rain, water',
    body:
      'Wind, rain and water. Sparse but heavy; when it spikes, every other layer has to react.'
  },
  sensor: {
    eyebrow: 'sensor · live thermohygro',
    title: 'temperature & humidity',
    body:
      'A DHT11 on ESP32 reports the body of the node every five seconds. This is the live telemetry layer.'
  }
};

export default function ContextPanel({
  active,
  sensor,
  history,
  intensity,
  ndsi,
  micAnalyser,
  micActive
}: Props) {
  if (!active) {
    return <DefaultPanel intensity={intensity} micAnalyser={micAnalyser} micActive={micActive} sensor={sensor} ndsi={ndsi} />;
  }

  const color = VOXEL_CHANNEL_COLOR[active];
  const narrative = NARRATIVES[active];
  const acoustic = history[history.length - 1];

  return (
    <div style={styles.shell}>
      <header style={styles.header}>
        <span className="aura-mono" style={{ ...styles.eyebrow, color }}>
          {narrative.eyebrow}
        </span>
        <h2 style={styles.title}>{narrative.title}</h2>
        <span className="aura-mono" style={styles.location}>
          {VOXEL_QUADRANT_HINT[active]}
        </span>
      </header>

      <p style={styles.body}>{narrative.body}</p>

      <div style={styles.viz}>
        {active === 'biophony' && (
          <Spectrogram height={156} intensity={intensity} speed={1 + intensity * 0.6} analyser={micAnalyser} />
        )}
        {active === 'anthrophony' && (
          <FrequencyBars height={156} intensity={intensity} analyser={micAnalyser} bars={40} />
        )}
        {active === 'geophony' && (
          <Waveform height={156} intensity={Math.min(1.2, 0.7 + intensity * 0.6)} color={color} analyser={micAnalyser} />
        )}
        {active === 'sensor' && (
          <div style={styles.sensorGrid}>
            <RadialMeter
              label="temp"
              value={sensor.temperature ?? 0}
              min={-5}
              max={45}
              unit="°C"
              color="#6ee7b7"
              size={112}
            />
            <RadialMeter
              label="hum"
              value={sensor.humidity ?? 0}
              min={0}
              max={100}
              unit="%"
              color="#7dd3fc"
              size={112}
            />
          </div>
        )}
      </div>

      <div style={styles.footer}>
        {active === 'sensor' ? (
          <>
            <Stat label="state" value={sensor.state.toUpperCase()} color={color} />
            <Stat label="last seen" value={sensor.timestamp ? formatRelative(sensor.timestamp) : '—'} color={color} />
            <Stat label="node" value={sensor.nodeId} color={color} />
          </>
        ) : (
          <>
            <Stat label="ndsi" value={ndsi.toFixed(2)} color={color} />
            <Stat label={active} value={`${Math.round(acoustic[active])}%`} color={color} />
            <Stat label="source" value={micActive ? 'live mic' : 'node + baseline model'} color={color} />
          </>
        )}
      </div>
    </div>
  );
}

function DefaultPanel({
  intensity,
  micAnalyser,
  micActive,
  sensor,
  ndsi
}: {
  intensity: number;
  micAnalyser: AnalyserNode | null;
  micActive: boolean;
  sensor: SensorApiResponse;
  ndsi: number;
}) {
  return (
    <div style={styles.shell}>
      <header style={styles.header}>
        <span className="aura-mono" style={{ ...styles.eyebrow, color: '#6ee7b7' }}>
          urban ecosystem health · overview
        </span>
        <h2 style={styles.title}>from city noise to ecosystem intelligence</h2>
        <span className="aura-mono" style={styles.location}>bioacoustics · climate telemetry · autonomous agents</span>
      </header>
      <p style={styles.body}>
        AURA is meant to map the health of urban ecosystems by comparing life signals against human noise and weather pressure, then feeding that data to AI agents that can detect threats and trigger faster responses.
      </p>
      <div style={styles.overviewGrid}>
        <div style={styles.overviewCard}>
          <span className="aura-mono" style={{ ...styles.eyebrow, color: '#6ee7b7' }}>live spectrum</span>
          <Spectrogram height={92} intensity={intensity} speed={1 + intensity * 0.55} analyser={micAnalyser} />
        </div>
        <div style={styles.overviewCard}>
          <span className="aura-mono" style={{ ...styles.eyebrow, color: '#fb923c' }}>urban pressure</span>
          <FrequencyBars height={78} intensity={intensity} analyser={micAnalyser} bars={22} />
        </div>
        <div style={styles.overviewCard}>
          <span className="aura-mono" style={{ ...styles.eyebrow, color: '#7dd3fc' }}>ambient flow</span>
          <Waveform height={62} intensity={Math.min(1.1, 0.65 + intensity * 0.45)} color="#7dd3fc" analyser={micAnalyser} />
        </div>
      </div>
      <div style={styles.footer}>
        <Stat label="mic" value={micActive ? 'live room input' : 'ready to activate'} color="#6ee7b7" />
        <Stat label="ndsi" value={ndsi.toFixed(2)} color="#c4b5fd" />
        <Stat label="node" value={`${sensor.nodeId} · ${sensor.online ? 'online' : 'waiting'}`} color="#7dd3fc" />
      </div>
      <div style={styles.legend}>
        {(['biophony', 'anthrophony', 'geophony', 'sensor'] as VoxelChannel[]).map((c) => (
          <div key={c} style={styles.legendRow}>
            <span style={{ ...styles.legendDot, background: VOXEL_CHANNEL_COLOR[c] }} />
            <span style={{ ...styles.legendText, color: VOXEL_CHANNEL_COLOR[c] }}>
              {VOXEL_CHANNEL_LABEL[c]}
            </span>
            <span style={styles.legendHint}>{VOXEL_QUADRANT_HINT[c]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={styles.stat}>
      <span className="aura-mono" style={{ ...styles.statLabel, color }}>{label}</span>
      <strong style={styles.statValue}>{value}</strong>
    </div>
  );
}

function formatRelative(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 0) return 'in the future';
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

const styles: Record<string, CSSProperties> = {
  shell: {
    display: 'grid',
    gridTemplateRows: 'auto auto 1fr auto',
    gap: 8,
    padding: 12,
    height: '100%',
    minHeight: 0
  },
  header: {
    display: 'grid',
    gap: 4
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: '0.32em',
    textTransform: 'uppercase'
  },
  title: {
    margin: 0,
    fontSize: 'clamp(1.3rem, 1.7vw, 1.8rem)',
    lineHeight: 1.04,
    letterSpacing: '-0.03em',
    color: '#f4fff8',
    fontWeight: 600
  },
  location: {
    fontSize: 10,
    color: 'rgba(220,235,225,0.55)',
    letterSpacing: '0.16em'
  },
  body: {
    margin: 0,
    fontSize: 11,
    lineHeight: 1.4,
    color: 'rgba(220,235,225,0.76)'
  },
  viz: {
    minHeight: 0,
    display: 'grid',
    alignContent: 'center'
  },
  overviewGrid: {
    display: 'grid',
    gap: 8
  },
  overviewCard: {
    display: 'grid',
    gap: 6,
    padding: '8px 8px 7px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.07)',
    background: 'rgba(255,255,255,0.025)'
  },
  sensorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 8,
    placeItems: 'center'
  },
  footer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 6,
    paddingTop: 8,
    borderTop: '1px solid rgba(255,255,255,0.06)'
  },
  stat: {
    display: 'grid',
    gap: 2
  },
  statLabel: {
    fontSize: 9,
    letterSpacing: '0.28em',
    textTransform: 'uppercase'
  },
  statValue: {
    fontSize: 14,
    fontWeight: 600,
    color: '#f1fff5',
    letterSpacing: '-0.02em'
  },
  legend: {
    display: 'grid',
    gap: 6,
    padding: '10px 0 0',
    borderTop: '1px solid rgba(255,255,255,0.06)'
  },
  legendRow: {
    display: 'grid',
    gridTemplateColumns: '10px auto 1fr',
    gap: 8,
    alignItems: 'center'
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    boxShadow: '0 0 8px currentColor'
  },
  legendText: {
    fontFamily: 'var(--font-mono), monospace',
    fontSize: 10,
    letterSpacing: '0.16em',
    textTransform: 'uppercase'
  },
  legendHint: {
    fontSize: 10,
    color: 'rgba(220,235,225,0.5)',
    fontFamily: 'var(--font-mono), monospace',
    letterSpacing: '0.1em',
    textAlign: 'right'
  }
};
