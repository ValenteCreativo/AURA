'use client';

import { motion } from 'framer-motion';
import type { SensorState } from '@/lib/sensor-store';

type Props = {
  state: SensorState;
  size?: number;
  intensity?: number;
};

const COLORS: Record<SensorState, { core: string; ring: string; glow: string; halo: string }> = {
  balanced: {
    core: 'rgba(167, 243, 208, 0.95)',
    ring: 'rgba(110, 231, 183, 0.7)',
    glow: 'rgba(34, 197, 94, 0.45)',
    halo: 'rgba(110, 231, 183, 0.18)'
  },
  attention: {
    core: 'rgba(253, 230, 138, 0.95)',
    ring: 'rgba(245, 158, 11, 0.7)',
    glow: 'rgba(245, 158, 11, 0.45)',
    halo: 'rgba(245, 158, 11, 0.18)'
  },
  alert: {
    core: 'rgba(254, 205, 211, 0.95)',
    ring: 'rgba(244, 63, 94, 0.7)',
    glow: 'rgba(244, 63, 94, 0.5)',
    halo: 'rgba(244, 63, 94, 0.2)'
  },
  disconnected: {
    core: 'rgba(226, 232, 240, 0.7)',
    ring: 'rgba(148, 163, 184, 0.4)',
    glow: 'rgba(100, 116, 139, 0.3)',
    halo: 'rgba(148, 163, 184, 0.12)'
  }
};

export default function BreathingOrb({ state, size = 360, intensity = 1 }: Props) {
  const palette = COLORS[state];
  const ringCount = 3;

  return (
    <div style={{ position: 'relative', width: size, height: size, maxWidth: '100%' }}>
      {/* outer halo */}
      <motion.div
        style={{
          position: 'absolute',
          inset: -size * 0.25,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${palette.halo}, transparent 65%)`,
          filter: 'blur(20px)'
        }}
        animate={{ opacity: [0.6, 0.95, 0.6], scale: [1, 1.06, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* concentric rings */}
      {Array.from({ length: ringCount }).map((_, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `1px solid ${palette.ring}`,
            opacity: 0
          }}
          animate={{
            scale: [0.82, 1.45],
            opacity: [0.55, 0]
          }}
          transition={{
            duration: 4.5,
            delay: i * 1.4,
            repeat: Infinity,
            ease: 'easeOut'
          }}
        />
      ))}

      {/* core */}
      <motion.div
        style={{
          position: 'absolute',
          inset: '12%',
          borderRadius: '50%',
          background: `radial-gradient(circle at 32% 30%, ${palette.core}, ${palette.glow} 38%, rgba(2,8,6,0.05) 70%)`,
          boxShadow: `0 0 ${80 * intensity}px ${palette.glow}, inset 0 0 60px rgba(255,255,255,0.08)`,
          backdropFilter: 'blur(2px)'
        }}
        animate={{ scale: [0.96, 1.04, 0.96] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* faint scan ring */}
      <motion.div
        style={{
          position: 'absolute',
          inset: '4%',
          borderRadius: '50%',
          border: `1px dashed ${palette.ring}`,
          opacity: 0.35
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      />

      {/* tick marks */}
      <svg
        viewBox="0 0 100 100"
        style={{ position: 'absolute', inset: 0, opacity: 0.25 }}
        aria-hidden
      >
        {Array.from({ length: 60 }).map((_, i) => {
          const a = (i / 60) * Math.PI * 2;
          const r1 = 49;
          const r2 = i % 5 === 0 ? 46 : 47.5;
          const x1 = 50 + Math.cos(a) * r1;
          const y1 = 50 + Math.sin(a) * r1;
          const x2 = 50 + Math.cos(a) * r2;
          const y2 = 50 + Math.sin(a) * r2;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={palette.ring}
              strokeWidth={i % 5 === 0 ? 0.5 : 0.2}
            />
          );
        })}
      </svg>
    </div>
  );
}
