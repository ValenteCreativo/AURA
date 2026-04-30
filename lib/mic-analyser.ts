'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type MicStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported';

export type MicBands = {
  low: number;
  mid: number;
  high: number;
};

export type MicAnalyser = {
  status: MicStatus;
  level: number;
  bands: MicBands;
  analyser: AnalyserNode | null;
  request: () => Promise<void>;
  stop: () => void;
  errorLabel: string | null;
};

const ZERO_BANDS: MicBands = { low: 0, mid: 0, high: 0 };

export function useMicAnalyser(fftSize = 1024): MicAnalyser {
  const [status, setStatus] = useState<MicStatus>('idle');
  const [level, setLevel] = useState(0);
  const [bands, setBands] = useState<MicBands>(ZERO_BANDS);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [errorLabel, setErrorLabel] = useState<string | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (ctxRef.current && ctxRef.current.state !== 'closed') {
      ctxRef.current.close().catch(() => undefined);
    }
    ctxRef.current = null;
    setAnalyser(null);
    setLevel(0);
    setBands(ZERO_BANDS);
    setStatus('idle');
    setErrorLabel(null);
  }, []);

  const request = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!navigator.mediaDevices?.getUserMedia || typeof window.AudioContext === 'undefined') {
      setStatus('unsupported');
      setErrorLabel('audio api unavailable');
      return;
    }
    if (status === 'requesting' || status === 'granted') return;

    setStatus('requesting');
    setErrorLabel(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true
        }
      });
      const ctx = new window.AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const node = ctx.createAnalyser();
      node.fftSize = fftSize;
      node.smoothingTimeConstant = 0.72;
      source.connect(node);

      streamRef.current = stream;
      ctxRef.current = ctx;
      setAnalyser(node);
      setStatus('granted');
    } catch (err) {
      setStatus('denied');
      setErrorLabel(err instanceof Error ? err.message.toLowerCase() : 'permission denied');
    }
  }, [status, fftSize]);

  useEffect(() => {
    if (!analyser) return;
    const bins = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
    const tick = () => {
      analyser.getByteFrequencyData(bins);
      const N = bins.length;
      const lowEnd = Math.max(1, Math.floor(N * 0.12));
      const midEnd = Math.max(lowEnd + 1, Math.floor(N * 0.45));
      let total = 0;
      let low = 0;
      let mid = 0;
      let high = 0;
      for (let i = 0; i < N; i++) {
        const v = bins[i] / 255;
        total += v;
        if (i < lowEnd) low += v;
        else if (i < midEnd) mid += v;
        else high += v;
      }
      setLevel(total / N);
      setBands({
        low: low / lowEnd,
        mid: mid / (midEnd - lowEnd),
        high: high / Math.max(1, N - midEnd)
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [analyser]);

  useEffect(() => () => stop(), [stop]);

  return { status, level, bands, analyser, request, stop, errorLabel };
}
