'use client';

import { useEffect, useRef } from 'react';

type Node = {
  id: string;
  x: number;
  y: number;
  state: 'live' | 'soon' | 'idea';
  label: string;
};

const NODES: Node[] = [
  { id: 'AURA-001', x: 0.32, y: 0.42, state: 'live', label: 'AURA-001' },
  { id: 'AURA-002', x: 0.55, y: 0.34, state: 'soon', label: 'AURA-002' },
  { id: 'AURA-003', x: 0.68, y: 0.58, state: 'idea', label: 'AURA-003' },
  { id: 'AURA-004', x: 0.42, y: 0.66, state: 'idea', label: 'AURA-004' },
  { id: 'AURA-005', x: 0.78, y: 0.42, state: 'idea', label: 'AURA-005' },
  { id: 'AURA-006', x: 0.22, y: 0.62, state: 'idea', label: 'AURA-006' }
];

const EDGES: [string, string][] = [
  ['AURA-001', 'AURA-002'],
  ['AURA-001', 'AURA-004'],
  ['AURA-002', 'AURA-003'],
  ['AURA-002', 'AURA-005'],
  ['AURA-004', 'AURA-006'],
  ['AURA-003', 'AURA-005']
];

const COLOR: Record<Node['state'], string> = {
  live: '#6ee7b7',
  soon: '#fbbf24',
  idea: 'rgba(125,211,252,0.6)'
};

type Props = {
  height?: number;
  liveState?: 'balanced' | 'attention' | 'alert' | 'disconnected';
};

export default function NodeConstellation({ height = 320, liveState = 'disconnected' }: Props) {
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

    function pos(n: Node, w: number, h: number) {
      return [n.x * w, n.y * h] as [number, number];
    }

    function draw() {
      if (!canvas || !ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const grid = 40 * dpr;
      ctx.strokeStyle = 'rgba(110,231,183,0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += grid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += grid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1 * dpr;
      for (const [a, b] of EDGES) {
        const na = NODES.find((n) => n.id === a)!;
        const nb = NODES.find((n) => n.id === b)!;
        const [ax, ay] = pos(na, w, h);
        const [bx, by] = pos(nb, w, h);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }

      for (const [a, b] of EDGES) {
        const na = NODES.find((n) => n.id === a)!;
        const nb = NODES.find((n) => n.id === b)!;
        if (na.state === 'idea' || nb.state === 'idea') continue;
        const [ax, ay] = pos(na, w, h);
        const [bx, by] = pos(nb, w, h);
        const phase = (t * 0.6 + a.length * 0.1) % 1;
        const px = ax + (bx - ax) * phase;
        const py = ay + (by - ay) * phase;
        const grad = ctx.createRadialGradient(px, py, 0, px, py, 18 * dpr);
        grad.addColorStop(0, 'rgba(110,231,183,0.9)');
        grad.addColorStop(1, 'rgba(110,231,183,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(px - 18 * dpr, py - 18 * dpr, 36 * dpr, 36 * dpr);
      }

      for (const node of NODES) {
        const [x, y] = pos(node, w, h);
        const live = node.id === 'AURA-001';
        const baseColor = live
          ? liveState === 'alert'
            ? '#fb7185'
            : liveState === 'attention'
              ? '#fbbf24'
              : liveState === 'balanced'
                ? '#6ee7b7'
                : '#7dd3fc'
          : COLOR[node.state];

        const pulse = live ? 0.5 + Math.sin(t * 2) * 0.5 : 0;
        const ringR = (live ? 18 : 14) * dpr + pulse * 14 * dpr;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, ringR * 2.4);
        grad.addColorStop(0, baseColor);
        grad.addColorStop(0.4, `${baseColor}33`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, ringR * 2.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, live ? 5 * dpr : 3.4 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.fill();

        if (live) {
          ctx.strokeStyle = `${baseColor}55`;
          ctx.lineWidth = 1 * dpr;
          ctx.beginPath();
          ctx.arc(x, y, 16 * dpr + pulse * 14 * dpr, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = 'rgba(220,235,225,0.55)';
        ctx.font = `${10 * dpr}px var(--font-mono), ui-monospace, monospace`;
        ctx.textAlign = 'left';
        ctx.fillText(node.label, x + 10 * dpr, y - 8 * dpr);
      }

      t += 0.012;
      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
    };
  }, [liveState]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height,
        display: 'block',
        borderRadius: 18,
        background: 'linear-gradient(180deg, rgba(7,15,12,0.7), rgba(2,5,4,0.85))'
      }}
    />
  );
}
