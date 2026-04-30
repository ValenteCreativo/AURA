'use client';

import { useEffect, useRef } from 'react';

type Props = {
  height?: number;
  color?: string;
  intensity?: number;
};

export default function Waveform({ height = 120, color = '#6ee7b7', intensity = 1 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
    let t = 0;

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    }

    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(canvas);

    function drawLine(amp: number, phase: number, alpha: number, lineColor: string) {
      if (!canvas || !ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.beginPath();
      const step = Math.max(1, Math.floor(w / 280));
      for (let x = 0; x < w; x += step) {
        const fx = x / w;
        const env = Math.exp(-Math.pow((fx - 0.5) / 0.42, 2));
        const y =
          h / 2 +
          Math.sin(fx * 26 + t * 1.2 + phase) * amp * env +
          Math.sin(fx * 8 + t * 0.6 + phase * 1.3) * amp * 0.4 * env +
          Math.sin(fx * 60 + t * 2.3 + phase * 0.7) * amp * 0.18 * env;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = lineColor;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1.4 * dpr;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function draw() {
      if (!canvas || !ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = 'rgba(3, 7, 6, 0.18)';
      ctx.fillRect(0, 0, w, h);

      const a = (h / 2) * 0.78 * intensity;
      drawLine(a * 0.55, 0, 0.18, color);
      drawLine(a * 0.7, 1.1, 0.32, color);
      drawLine(a * 0.85, 2.4, 0.55, color);
      drawLine(a, 0.4, 0.95, color);

      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      t += 0.05;
      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
    };
  }, [color, intensity]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height,
        display: 'block',
        borderRadius: 14,
        background: 'linear-gradient(180deg, rgba(7,15,12,0.6), rgba(2,5,4,0.7))'
      }}
    />
  );
}
