'use client';

import { useEffect, useRef } from 'react';

type Props = {
  height?: number;
  bars?: number;
  intensity?: number;
  analyser?: AnalyserNode | null;
  idleMode?: 'synthetic' | 'flat';
};

export default function FrequencyBars({
  height = 180,
  bars = 56,
  intensity = 1,
  analyser = null,
  idleMode = 'synthetic'
}: Props) {
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

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
    let t = 0;
    const peaks = new Array(bars).fill(0);
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

    function draw() {
      if (!canvas || !ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const gap = 2 * dpr;
      const barW = (w - gap * (bars - 1)) / bars;

      const live = analyserRef.current;
      if (live) {
        if (!bins || bins.length !== live.frequencyBinCount) {
          bins = new Uint8Array(new ArrayBuffer(live.frequencyBinCount));
        }
        live.getByteFrequencyData(bins);
      }

      for (let i = 0; i < bars; i++) {
        const f = i / (bars - 1);
        let v: number;
        if (live && bins) {
          const N = bins.length;
          const idx = Math.min(N - 1, Math.floor(Math.pow(f, 1.6) * N));
          v = (bins[idx] / 255) * (0.85 + intensity * 0.4);
        } else if (idleMode === 'synthetic') {
          const lf = Math.exp(-Math.pow((f - 0.16) / 0.1, 2));
          const mf = Math.exp(-Math.pow((f - 0.45) / 0.13, 2));
          const hf = Math.exp(-Math.pow((f - 0.78) / 0.09, 2));

          const wob = Math.sin(t * 1.2 + i * 0.32) * 0.5 + 0.5;
          const wob2 = Math.sin(t * 0.6 + i * 0.13 + 1.7) * 0.5 + 0.5;
          v = lf * (0.4 + wob * 0.6) + mf * (0.35 + wob2 * 0.65) + hf * (0.55 + wob * 0.45);
          v += Math.random() * 0.1;
          v *= 0.45 + intensity * 0.6;
        } else {
          const contour = 0.03 + Math.exp(-Math.pow((f - 0.34) / 0.28, 2)) * 0.025;
          v = contour;
        }
        v = Math.max(idleMode === 'flat' && !live ? 0.015 : 0.04, Math.min(1, v));

        peaks[i] = Math.max(peaks[i] * 0.92, v);

        const barH = v * h * 0.95;
        const x = i * (barW + gap);
        const y = h - barH;

        const grad = ctx.createLinearGradient(0, y, 0, h);
        if (f < 0.33) {
          grad.addColorStop(0, '#7dd3fc');
          grad.addColorStop(1, 'rgba(125,211,252,0.05)');
        } else if (f < 0.66) {
          grad.addColorStop(0, '#fb923c');
          grad.addColorStop(1, 'rgba(251,146,60,0.05)');
        } else {
          grad.addColorStop(0, '#6ee7b7');
          grad.addColorStop(1, 'rgba(110,231,183,0.05)');
        }
        ctx.fillStyle = grad;
        const r = Math.min(barW * 0.45, 6 * dpr);
        roundedRect(ctx, x, y, barW, barH, r);
        ctx.fill();

        const py = h - peaks[i] * h * 0.95;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(x, py, barW, 1.4 * dpr);
      }

      t += 0.06;
      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
    };
  }, [bars, intensity]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height,
        display: 'block',
        borderRadius: 14
      }}
    />
  );
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}
