'use client';

import { useEffect, useRef } from 'react';

type Props = {
  height?: number;
  speed?: number;
  intensity?: number;
  analyser?: AnalyserNode | null;
};

export default function Spectrogram({ height = 220, speed = 1, intensity = 1, analyser = null }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(analyser);

  useEffect(() => {
    analyserRef.current = analyser;
  }, [analyser]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let t = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let bins: Uint8Array<ArrayBuffer> | null = null;

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    }

    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(canvas);

    const palette = [
      [3, 7, 6, 0],
      [12, 28, 22, 0.4],
      [16, 60, 44, 0.7],
      [56, 189, 168, 0.85],
      [110, 231, 183, 1],
      [253, 224, 71, 1],
      [251, 113, 133, 1]
    ];

    function colorAt(v: number) {
      const x = Math.max(0, Math.min(1, v)) * (palette.length - 1);
      const i = Math.floor(x);
      const f = x - i;
      const a = palette[i];
      const b = palette[Math.min(palette.length - 1, i + 1)];
      const r = Math.round(a[0] + (b[0] - a[0]) * f);
      const g = Math.round(a[1] + (b[1] - a[1]) * f);
      const bl = Math.round(a[2] + (b[2] - a[2]) * f);
      const al = a[3] + (b[3] - a[3]) * f;
      return `rgba(${r},${g},${bl},${al})`;
    }

    function draw() {
      if (!canvas || !ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      const stripeWidth = Math.max(1, Math.floor(2 * dpr));

      const img = ctx.getImageData(stripeWidth, 0, w - stripeWidth, h);
      ctx.putImageData(img, 0, 0);
      ctx.clearRect(w - stripeWidth, 0, stripeWidth, h);

      const bands = Math.max(64, Math.floor(h / dpr / 2));
      const bandH = h / bands;

      const live = analyserRef.current;
      if (live) {
        if (!bins || bins.length !== live.frequencyBinCount) {
          bins = new Uint8Array(new ArrayBuffer(live.frequencyBinCount));
        }
        live.getByteFrequencyData(bins);
      }

      for (let i = 0; i < bands; i++) {
        const f = i / bands;
        let v: number;
        if (live && bins) {
          const N = bins.length;
          const idx = Math.min(N - 1, Math.floor(Math.pow(f, 1.4) * N));
          v = (bins[idx] / 255) * (0.85 + intensity * 0.4);
        } else {
          const lowMid = Math.exp(-Math.pow((f - 0.18) / 0.07, 2));
          const mid = Math.exp(-Math.pow((f - 0.42) / 0.09, 2));
          const high = Math.exp(-Math.pow((f - 0.78) / 0.06, 2));

          const wob1 = Math.sin(t * 0.9 + i * 0.18) * 0.5 + 0.5;
          const wob2 = Math.sin(t * 1.7 + i * 0.07 + 1.3) * 0.5 + 0.5;
          const wob3 = Math.sin(t * 0.4 + i * 0.31 + 2.1) * 0.5 + 0.5;

          const noise = Math.random() * 0.18;

          v =
            lowMid * (0.45 + wob1 * 0.5) +
            mid * (0.35 + wob2 * 0.55) +
            high * (0.55 + wob3 * 0.55) +
            (1 - f) * 0.06 +
            noise;

          v *= 0.55 + intensity * 0.55;
        }
        v = Math.max(0, Math.min(1, v));

        ctx.fillStyle = colorAt(v);
        const y = h - (i + 1) * bandH;
        ctx.fillRect(w - stripeWidth, y, stripeWidth, bandH + 1);
      }

      t += 0.04 * speed;
      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
    };
  }, [speed, intensity]);

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          borderRadius: 16,
          background: 'linear-gradient(180deg, #03100c, #02060a)'
        }}
      />
      <div style={overlay}>
        <span>11k</span>
        <span>4k</span>
        <span>1k</span>
        <span>250</span>
        <span>60</span>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: 'absolute',
  inset: '8px 10px 8px auto',
  width: 38,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  alignItems: 'flex-end',
  pointerEvents: 'none',
  fontFamily: 'var(--font-mono), ui-monospace, monospace',
  fontSize: 10,
  letterSpacing: '0.12em',
  color: 'rgba(220, 248, 230, 0.55)',
  textShadow: '0 0 8px rgba(0,0,0,0.8)'
};
