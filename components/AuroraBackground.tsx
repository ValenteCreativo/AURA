'use client';

import { motion } from 'framer-motion';

export default function AuroraBackground() {
  return (
    <div aria-hidden style={styles.wrap}>
      <div style={styles.gridLayer} />
      <motion.div
        style={{ ...styles.blob, ...styles.blobA }}
        animate={{ x: [0, 40, -30, 0], y: [0, -30, 30, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        style={{ ...styles.blob, ...styles.blobB }}
        animate={{ x: [0, -50, 30, 0], y: [0, 40, -20, 0] }}
        transition={{ duration: 34, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        style={{ ...styles.blob, ...styles.blobC }}
        animate={{ x: [0, 30, -40, 0], y: [0, 25, 35, 0] }}
        transition={{ duration: 40, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div style={styles.scanlines} />
      <div style={styles.vignette} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 0,
    overflow: 'hidden',
    background:
      'radial-gradient(140% 90% at 50% 0%, rgba(7, 25, 19, 0.7) 0%, rgba(4, 8, 7, 1) 70%), linear-gradient(180deg, #040807 0%, #050b09 50%, #03060a 100%)'
  },
  gridLayer: {
    position: 'absolute',
    inset: 0,
    backgroundImage:
      'linear-gradient(rgba(110, 231, 183, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(110, 231, 183, 0.05) 1px, transparent 1px)',
    backgroundSize: '64px 64px',
    maskImage:
      'radial-gradient(circle at 50% 30%, rgba(0,0,0,1) 30%, rgba(0,0,0,0.4) 60%, transparent 80%)',
    WebkitMaskImage:
      'radial-gradient(circle at 50% 30%, rgba(0,0,0,1) 30%, rgba(0,0,0,0.4) 60%, transparent 80%)',
    opacity: 0.55
  },
  blob: {
    position: 'absolute',
    width: 720,
    height: 720,
    borderRadius: '50%',
    filter: 'blur(110px)',
    opacity: 0.55
  },
  blobA: {
    top: '-15%',
    left: '-10%',
    background: 'radial-gradient(circle, rgba(34, 197, 94, 0.55), transparent 70%)'
  },
  blobB: {
    top: '20%',
    right: '-15%',
    background: 'radial-gradient(circle, rgba(56, 189, 248, 0.4), transparent 70%)'
  },
  blobC: {
    bottom: '-20%',
    left: '20%',
    background: 'radial-gradient(circle, rgba(196, 181, 253, 0.35), transparent 70%)'
  },
  scanlines: {
    position: 'absolute',
    inset: 0,
    backgroundImage:
      'repeating-linear-gradient(0deg, rgba(244, 247, 241, 0.02) 0px, rgba(244, 247, 241, 0.02) 1px, transparent 1px, transparent 3px)',
    mixBlendMode: 'overlay',
    opacity: 0.6
  },
  vignette: {
    position: 'absolute',
    inset: 0,
    background:
      'radial-gradient(120% 120% at 50% 50%, transparent 50%, rgba(2, 5, 4, 0.85) 100%)'
  }
};
