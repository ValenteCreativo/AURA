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
    return <DefaultPanel />;
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
          <Spectrogram height={180} intensity={intensity} speed={1 + intensity * 0.6} analyser={micAnalyser} />
        )}
        {active === 'anthrophony' && (
          <FrequencyBars height={180} intensity={intensity} analyser={micAnalyser} bars={48} />
        )}
        {active === 'geophony' && (
          <Waveform height={180} intensity={Math.min(1.2, 0.7 + intensity * 0.6)} color={color} analyser={micAnalyser} />
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
              size={140}
            />
            <RadialMeter
              label="hum"
              value={sensor.humidity ?? 0}
              min={0}
              max={100}
              unit="%"
              color="#7dd3fc"
              size={140}
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
            <Stat label="source" value={micActive ? 'live mic' : 'simulation'} color={color} />
          </>
        )}
      </div>
    </div>
  );
}

function DefaultPanel() {
  return (
    <div style={styles.shell}>
      <header style={styles.header}>
        <span className="aura-mono" style={{ ...styles.eyebrow, color: '#6ee7b7' }}>
          observatory · idle layer
        </span>
        <h2 style={styles.title}>select a channel</h2>
        <span className="aura-mono" style={styles.location}>tap a quadrant or row to highlight</span>
      </header>
      <p style={styles.body}>
        One place, four signals: biophony, anthrophony, geophony and live thermohygro telemetry. Highlight any layer to surface its visualiser.
      </p>
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
    gap: 10,
    padding: 14,
    height: '100%',
    minHeight: 0
  },
  header: {
    display: 'grid',
    gap: 6
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: '0.32em',
    textTransform: 'uppercase'
  },
  title: {
    margin: 0,
    fontSize: 'clamp(1.6rem, 2vw, 2.2rem)',
    lineHeight: 1.05,
    letterSpacing: '-0.03em',
    color: '#f4fff8',
    fontWeight: 600
  },
  location: {
    fontSize: 11,
    color: 'rgba(220,235,225,0.55)',
    letterSpacing: '0.18em'
  },
  body: {
    margin: 0,
    fontSize: 12,
    lineHeight: 1.45,
    color: 'rgba(220,235,225,0.78)'
  },
  viz: {
    minHeight: 0,
    display: 'grid',
    alignContent: 'center'
  },
  sensorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 12,
    placeItems: 'center'
  },
  footer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 8,
    paddingTop: 10,
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
    fontSize: 16,
    fontWeight: 600,
    color: '#f1fff5',
    letterSpacing: '-0.02em'
  },
  legend: {
    display: 'grid',
    gap: 8,
    padding: '14px 0 0',
    borderTop: '1px solid rgba(255,255,255,0.06)'
  },
  legendRow: {
    display: 'grid',
    gridTemplateColumns: '12px auto 1fr',
    gap: 10,
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
    fontSize: 11,
    letterSpacing: '0.18em',
    textTransform: 'uppercase'
  },
  legendHint: {
    fontSize: 11,
    color: 'rgba(220,235,225,0.5)',
    fontFamily: 'var(--font-mono), monospace',
    letterSpacing: '0.12em',
    textAlign: 'right'
  }
};
