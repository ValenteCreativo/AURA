'use client';

type Props = {
  value: number;
  max: number;
  min?: number;
  label: string;
  unit: string;
  color: string;
  size?: number;
};

export default function RadialMeter({
  value,
  max,
  min = 0,
  label,
  unit,
  color,
  size = 180
}: Props) {
  const safeValue = Number.isFinite(value) ? value : min;
  const t = Math.max(0, Math.min(1, (safeValue - min) / (max - min)));
  const r = size / 2 - 14;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const arcSpan = 0.78;
  const arcLen = circ * arcSpan;

  const ticks = 36;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={`grad-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={6}
          fill="none"
          strokeDasharray={`${arcLen} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(${135} ${cx} ${cy})`}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={`url(#grad-${label})`}
          strokeWidth={6}
          fill="none"
          strokeDasharray={`${arcLen * t} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(${135} ${cx} ${cy})`}
          style={{ filter: `drop-shadow(0 0 12px ${color}77)`, transition: 'stroke-dasharray 0.6s ease' }}
        />
        {Array.from({ length: ticks }).map((_, i) => {
          const a = 135 + (i / (ticks - 1)) * arcSpan * 360;
          const rad = (a * Math.PI) / 180;
          const inner = r - 12;
          const outer = r - 4;
          const x1 = cx + Math.cos(rad) * inner;
          const y1 = cy + Math.sin(rad) * inner;
          const x2 = cx + Math.cos(rad) * outer;
          const y2 = cy + Math.sin(rad) * outer;
          const active = i / (ticks - 1) <= t;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={active ? color : 'rgba(255,255,255,0.1)'}
              strokeWidth={1.4}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          textAlign: 'center'
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 10,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'rgba(220,235,225,0.55)'
          }}
        >
          {label}
        </span>
        <strong style={{ fontSize: 32, fontWeight: 600, color: '#f1fff5', letterSpacing: '-0.02em' }}>
          {Number.isFinite(value) ? value.toFixed(unit === '°C' ? 1 : 0) : '--'}
        </strong>
        <span style={{ fontSize: 12, color: color, fontFamily: 'var(--font-mono), monospace' }}>{unit}</span>
      </div>
    </div>
  );
}
