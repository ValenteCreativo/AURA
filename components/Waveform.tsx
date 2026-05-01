'use client';

import { useEffect, useRef } from 'react';

type Props = {
  height?: number;
  color?: string;
  intensity?: number;
  analyser?: AnalyserNode | null;
  idleMode?: 'synthetic' | 'flat';
};

export default function Waveform({
  height = 120,
  color = '#6ee7b7',
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
    let timeBuf: Uint8Array<ArrayBuffer> | null = null;

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    }

    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(canvas);

    function drawSyntheticLine(amp: number, phase: number, alpha: number, lineColor: string) {
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

    function drawLiveLine(buf: Uint8Array<ArrayBuffer>, alpha: number, lineColor: string, amp: number) {
      if (!canvas || !ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.beginPath();
      const step = Math.max(1, Math.floor(buf.length / w));
      const N = buf.length;
      for (let x = 0; x < w; x++) {
        const idx = Math.min(N - 1, Math.floor((x / w) * N));
        const v = (buf[idx] - 128) / 128;
        const y = h / 2 + v * (h / 2) * 0.85 * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        if (x % step !== 0) continue;
      }
      ctx.strokeStyle = lineColor;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1.6 * dpr;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function draw() {
      if (!canvas || !ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = 'rgba(3, 7, 6, 0.18)';
      ctx.fillRect(0, 0, w, h);

      const live = analyserRef.current;
      if (live) {
        if (!timeBuf || timeBuf.length !== live.fftSize) {
          timeBuf = new Uint8Array(new ArrayBuffer(live.fftSize));
        }
        live.getByteTimeDomainData(timeBuf);
        drawLiveLine(timeBuf, 0.32, color, intensity * 0.6);
        drawLiveLine(timeBuf, 0.95, color, intensity);
      } else if (idleMode === 'synthetic') {
        const a = (h / 2) * 0.78 * intensity;
        drawSyntheticLine(a * 0.55, 0, 0.18, color);
        drawSyntheticLine(a * 0.7, 1.1, 0.32, color);
        drawSyntheticLine(a * 0.85, 2.4, 0.55, color);
        drawSyntheticLine(a, 0.4, 0.95, color);
      } else {
        const a = (h / 2) * 0.08 * Math.max(0.5, intensity);
        drawSyntheticLine(a * 0.5, 0.3, 0.14, color);
        drawSyntheticLine(a * 0.75, 1.2, 0.24, color);
      }

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
