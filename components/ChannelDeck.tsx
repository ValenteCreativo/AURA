'use client';

import type { CSSProperties } from 'react';
import { VOXEL_CHANNEL_COLOR, VOXEL_CHANNEL_LABEL, type VoxelChannel } from './VoxelObservatory';

const CHANNEL_DESCRIPTORS: Record<VoxelChannel, { hint: string; range: string }> = {
  biophony: { hint: 'live organisms · birds · insects', range: '2 – 11 kHz' },
  anthrophony: { hint: 'humans · traffic · machinery', range: '60 Hz – 4 kHz' },
  geophony: { hint: 'wind · rain · water', range: '20 Hz – 2 kHz' },
  sensor: { hint: 'temperature · humidity · live node', range: 'DHT11 / esp32' }
};

type Props = {
  active: VoxelChannel | null;
  onSelect: (channel: VoxelChannel | null) => void;
  channelLevels: Record<VoxelChannel, number>;
};

export default function ChannelDeck({ active, onSelect, channelLevels }: Props) {
  const channels: VoxelChannel[] = ['biophony', 'anthrophony', 'geophony', 'sensor'];
  return (
    <div style={styles.deck}>
      <div style={styles.deckHeader}>
        <span className="aura-mono" style={styles.eyebrow}>channels</span>
        <button
          type="button"
          onClick={() => onSelect(null)}
          style={{
            ...styles.resetBtn,
            opacity: active ? 1 : 0.35,
            pointerEvents: active ? 'auto' : 'none'
          }}
        >
          all
        </button>
      </div>
      <div style={styles.deckList}>
        {channels.map((c) => {
          const isActive = active === c;
          const color = VOXEL_CHANNEL_COLOR[c];
          const level = channelLevels[c] ?? 0;
          const meta = CHANNEL_DESCRIPTORS[c];
          return (
            <button
              key={c}
              type="button"
              onClick={() => onSelect(isActive ? null : c)}
              style={{
                ...styles.row,
                borderColor: isActive ? color : 'rgba(255,255,255,0.07)',
                background: isActive
                  ? `linear-gradient(120deg, ${color}22, rgba(255,255,255,0.02))`
                  : 'rgba(255,255,255,0.02)',
                boxShadow: isActive ? `inset 0 0 0 1px ${color}66, 0 0 24px ${color}33` : 'none'
              }}
            >
              <span style={styles.swatch} aria-hidden>
                <span
                  style={{
                    ...styles.swatchInner,
                    background: color,
                    boxShadow: isActive ? `0 0 14px ${color}` : `0 0 6px ${color}88`
                  }}
                />
              </span>
              <span style={styles.rowBody}>
                <span style={styles.rowTitle}>{VOXEL_CHANNEL_LABEL[c]}</span>
                <span style={styles.rowMeta}>{meta.hint}</span>
              </span>
              <span style={styles.rowRight}>
                <span className="aura-mono" style={{ ...styles.rowRange, color }}>
                  {meta.range}
                </span>
                <span style={styles.bar}>
                  <span
                    style={{
                      ...styles.barFill,
                      width: `${Math.round(level * 100)}%`,
                      background: color,
                      boxShadow: `0 0 8px ${color}88`
                    }}
                  />
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  deck: {
    display: 'grid',
    gap: 8
  },
  deckHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: '0.32em',
    textTransform: 'uppercase',
    color: '#6ee7b7',
    opacity: 0.85
  },
  resetBtn: {
    border: '1px solid rgba(110, 231, 183, 0.35)',
    background: 'rgba(110, 231, 183, 0.08)',
    color: '#b8ffd8',
    padding: '4px 10px',
    fontSize: 10,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    fontFamily: 'var(--font-mono), monospace',
    cursor: 'pointer',
    borderRadius: 4,
    transition: 'opacity 0.2s ease'
  },
  deckList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 8
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '10px minmax(0, 1fr)',
    gap: 10,
    alignItems: 'start',
    textAlign: 'left',
    padding: '8px 10px',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.02)',
    color: 'inherit',
    cursor: 'pointer',
    transition: 'border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease'
  },
  swatch: {
    display: 'inline-flex',
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  swatchInner: {
    display: 'block',
    width: 8,
    height: 8,
    borderRadius: 999
  },
  rowBody: {
    display: 'grid',
    gap: 2,
    minWidth: 0
  },
  rowTitle: {
    fontSize: 12,
    color: '#f1fff5',
    letterSpacing: '0.04em'
  },
  rowMeta: {
    fontSize: 10,
    color: 'rgba(220,235,225,0.55)',
    letterSpacing: '0.02em'
  },
  rowRight: {
    display: 'grid',
    gap: 4,
    justifyItems: 'start',
    gridColumn: '2 / span 1'
  },
  rowRange: {
    fontSize: 9,
    letterSpacing: '0.16em',
    textTransform: 'uppercase'
  },
  bar: {
    display: 'block',
    width: '100%',
    height: 4,
    borderRadius: 4,
    background: 'rgba(255,255,255,0.08)',
    overflow: 'hidden'
  },
  barFill: {
    display: 'block',
    height: '100%',
    transition: 'width 0.2s ease'
  }
};
