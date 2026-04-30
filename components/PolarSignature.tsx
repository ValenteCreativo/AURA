'use client';

import { useMemo } from 'react';
import type { EnvSample } from '@/lib/history-mock';

type Props = {
  data: EnvSample[];
  size?: number;
};

export default function PolarSignature({ data, size = 360 }: Props) {
  const { paths, hours } = useMemo(() => {
    const cx = size / 2;
    const cy = size / 2;
    const rMax = size / 2 - 28;

    function buildPath(values: number[], maxV: number, minV: number) {
      const span = Math.max(0.001, maxV - minV);
      const points = values.map((v, i) => {
        const angle = (i / values.length) * Math.PI * 2 - Math.PI / 2;
        const norm = (v - minV) / span;
        const r = rMax * (0.32 + norm * 0.65);
        return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r] as [number, number];
      });
      const d = points
        .map((p, i) => (i === 0 ? `M${p[0].toFixed(2)},${p[1].toFixed(2)}` : `L${p[0].toFixed(2)},${p[1].toFixed(2)}`))
        .join(' ');
      return `${d}Z`;
    }

    const bio = data.map((d) => d.biophony);
    const ant = data.map((d) => d.anthrophony);
    const geo = data.map((d) => d.geophony);
    const allMax = Math.max(...bio, ...ant, ...geo);
    const allMin = Math.min(...bio, ...ant, ...geo);

    const hourMarks = Array.from({ length: 12 }).map((_, i) => {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const x1 = cx + Math.cos(angle) * (rMax + 4);
      const y1 = cy + Math.sin(angle) * (rMax + 4);
      const x2 = cx + Math.cos(angle) * (rMax + 12);
      const y2 = cy + Math.sin(angle) * (rMax + 12);
      const lx = cx + Math.cos(angle) * (rMax + 22);
      const ly = cy + Math.sin(angle) * (rMax + 22);
      return { x1, y1, x2, y2, lx, ly, label: `${(i * 2).toString().padStart(2, '0')}` };
    });

    return {
      paths: {
        bio: buildPath(bio, allMax, allMin),
        ant: buildPath(ant, allMax, allMin),
        geo: buildPath(geo, allMax, allMin)
      },
      hours: hourMarks
    };
  }, [data, size]);

  const cx = size / 2;
  const cy = size / 2;
  const rMax = size / 2 - 28;

  return (
    <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <defs>
        <radialGradient id="polar-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(110,231,183,0.08)" />
          <stop offset="100%" stopColor="rgba(2,5,4,0)" />
        </radialGradient>
        <linearGradient id="polar-bio" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(110,231,183,0.55)" />
          <stop offset="100%" stopColor="rgba(110,231,183,0.05)" />
        </linearGradient>
        <linearGradient id="polar-ant" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(251,146,60,0.45)" />
          <stop offset="100%" stopColor="rgba(251,146,60,0.02)" />
        </linearGradient>
        <linearGradient id="polar-geo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(125,211,252,0.4)" />
          <stop offset="100%" stopColor="rgba(125,211,252,0.02)" />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={rMax} fill="url(#polar-bg)" />
      {[0.32, 0.5, 0.68, 0.86, 1].map((s, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={rMax * s}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray="2 4"
        />
      ))}
      {hours.map((h, i) => (
        <g key={i}>
          <line x1={h.x1} y1={h.y1} x2={h.x2} y2={h.y2} stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
          <text
            x={h.lx}
            y={h.ly}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={9}
            fill="rgba(220,235,225,0.45)"
            fontFamily="var(--font-mono), monospace"
            letterSpacing="0.1em"
          >
            {h.label}
          </text>
        </g>
      ))}
      <path d={paths.geo} fill="url(#polar-geo)" stroke="#7dd3fc" strokeWidth={1.4} strokeOpacity={0.85} />
      <path d={paths.ant} fill="url(#polar-ant)" stroke="#fb923c" strokeWidth={1.4} strokeOpacity={0.85} />
      <path d={paths.bio} fill="url(#polar-bio)" stroke="#6ee7b7" strokeWidth={1.6} strokeOpacity={0.95} />
      <circle cx={cx} cy={cy} r={3} fill="#f1fff5" />
    </svg>
  );
}
