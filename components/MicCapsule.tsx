'use client';

import type { CSSProperties } from 'react';
import type { MicAnalyser } from '@/lib/mic-analyser';

type Props = {
  mic: MicAnalyser;
  compact?: boolean;
};

const STATUS_COPY: Record<MicAnalyser['status'], { tag: string; tone: 'on' | 'warn' | 'mute' | 'alert' }> = {
  idle: { tag: 'mic · standby', tone: 'mute' },
  requesting: { tag: 'mic · requesting…', tone: 'warn' },
  granted: { tag: 'mic · listening', tone: 'on' },
  denied: { tag: 'mic · denied (using mock)', tone: 'alert' },
  unsupported: { tag: 'mic · unsupported', tone: 'alert' }
};

export default function MicCapsule({ mic, compact = false }: Props) {
  const { status, level, bands, request, stop, errorLabel } = mic;
  const meta = STATUS_COPY[status];
  const isOn = status === 'granted';
  const ringColor =
    meta.tone === 'on' ? '#6ee7b7'
      : meta.tone === 'warn' ? '#fbbf24'
      : meta.tone === 'alert' ? '#fb7185'
      : 'rgba(220,235,225,0.4)';

  const cta = isOn ? 'release mic' : status === 'requesting' ? 'awaiting permission' : 'enable microphone';

  return (
    <div style={{ ...styles.shell, padding: compact ? '10px 14px' : '14px 16px' }}>
      <div style={styles.row}>
        <span style={styles.indicator} aria-hidden>
          <span
            style={{
              ...styles.indicatorRing,
              borderColor: ringColor,
              boxShadow: `0 0 14px ${ringColor}55`
            }}
          />
          <span
            style={{
              ...styles.indicatorDot,
              background: ringColor,
              transform: `scale(${0.5 + (isOn ? Math.min(1.4, 0.6 + level * 4) : 0.5)})`,
              transition: 'transform 0.12s ease'
            }}
          />
        </span>
        <div style={styles.body}>
          <span className="aura-mono" style={{ ...styles.tag, color: ringColor }}>{meta.tag}</span>
          {!compact && (
            <span style={styles.helper}>
              {isOn
                ? 'voxels & spectra now respond to your room'
                : status === 'denied'
                  ? errorLabel ?? 'visualisers continue with simulated bioacoustics'
                  : status === 'unsupported'
                    ? 'this browser blocks getUserMedia'
                    : 'browser will ask permission to capture audio locally · nothing leaves the device'}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => (isOn ? stop() : request())}
          disabled={status === 'requesting' || status === 'unsupported'}
          style={{
            ...styles.cta,
            borderColor: isOn ? '#fb7185' : '#6ee7b7',
            color: isOn ? '#fecaca' : '#b8ffd8',
            background: isOn ? 'rgba(251,113,133,0.08)' : 'rgba(110,231,183,0.08)',
            opacity: status === 'requesting' || status === 'unsupported' ? 0.55 : 1,
            cursor: status === 'requesting' || status === 'unsupported' ? 'not-allowed' : 'pointer'
          }}
        >
          {cta}
        </button>
      </div>

      {isOn && (
        <div style={styles.bands}>
          <BandMeter label="low" value={bands.low} color="#7dd3fc" />
          <BandMeter label="mid" value={bands.mid} color="#fb923c" />
          <BandMeter label="high" value={bands.high} color="#6ee7b7" />
        </div>
      )}
    </div>
  );
}

function BandMeter({ label, value, color }: { label: string; value: number; color: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div style={styles.bandCol}>
      <span style={styles.bandTrack}>
        <span
          style={{
            ...styles.bandFill,
            width: `${Math.round(v * 100)}%`,
            background: color,
            boxShadow: `0 0 8px ${color}77`
          }}
        />
      </span>
      <span className="aura-mono" style={{ ...styles.bandLabel, color }}>{label}</span>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  shell: {
    display: 'grid',
    gap: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    background:
      'linear-gradient(120deg, rgba(110,231,183,0.06), rgba(125,211,252,0.04))'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '36px minmax(0, 1fr) auto',
    gap: 12,
    alignItems: 'center'
  },
  indicator: {
    position: 'relative',
    width: 36,
    height: 36,
    display: 'inline-grid',
    placeItems: 'center'
  },
  indicatorRing: {
    position: 'absolute',
    inset: 0,
    borderRadius: 999,
    border: '1px solid'
  },
  indicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 999
  },
  body: {
    display: 'grid',
    gap: 4,
    minWidth: 0
  },
  tag: {
    fontSize: 11,
    letterSpacing: '0.22em',
    textTransform: 'uppercase'
  },
  helper: {
    fontSize: 11,
    color: 'rgba(220,235,225,0.6)',
    lineHeight: 1.45
  },
  cta: {
    appearance: 'none',
    border: '1px solid',
    borderRadius: 4,
    padding: '8px 14px',
    fontFamily: 'var(--font-mono), monospace',
    fontSize: 11,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    transition: 'opacity 0.2s ease'
  },
  bands: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 10,
    paddingTop: 4
  },
  bandCol: {
    display: 'grid',
    gap: 4,
    justifyItems: 'start'
  },
  bandTrack: {
    display: 'block',
    width: '100%',
    height: 4,
    borderRadius: 4,
    background: 'rgba(255,255,255,0.08)',
    overflow: 'hidden'
  },
  bandFill: {
    display: 'block',
    height: '100%',
    transition: 'width 0.12s ease'
  },
  bandLabel: {
    fontSize: 9,
    letterSpacing: '0.32em',
    textTransform: 'uppercase'
  }
};
