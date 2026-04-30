'use client';

import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

const LINKS = [
  { href: '#telemetry', label: 'Live' },
  { href: '#history', label: 'Archivo' },
  { href: '#acoustic', label: 'Bioacústica' },
  { href: '#network', label: 'Red' },
  { href: '#manifesto', label: 'Manifiesto' }
];

type Props = { online: boolean };

export default function Nav({ online }: Props) {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
      style={styles.wrap}
    >
      <div style={styles.left}>
        <span className="aura-mono" style={{ fontSize: 13, letterSpacing: '0.18em', color: 'var(--ink-0)' }}>
          AURA
        </span>
        <span style={styles.dotSep}>·</span>
        <span className="aura-mono" style={{ fontSize: 11, letterSpacing: '0.22em', color: 'var(--ink-3)' }}>
          ARVI v0.1
        </span>
      </div>

      <div style={styles.center}>
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} style={styles.link} className="aura-mono">
            {l.label}
          </a>
        ))}
      </div>

      <div style={styles.right}>
        <span style={{ ...styles.statusDot, background: online ? '#6ee7b7' : '#94a3b8', boxShadow: online ? '0 0 12px #6ee7b7' : 'none' }} />
        <Activity size={13} color={online ? '#6ee7b7' : '#8a9b94'} />
        <span className="aura-mono" style={{ fontSize: 11, letterSpacing: '0.16em', color: online ? '#d1fae5' : 'var(--ink-3)' }}>
          {online ? 'NODE ONLINE' : 'NODE WAITING'}
        </span>
      </div>
    </motion.nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'sticky',
    top: 0,
    zIndex: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
    padding: '20px 32px',
    backdropFilter: 'blur(14px) saturate(140%)',
    background: 'rgba(5, 8, 7, 0.55)',
    borderBottom: '1px solid var(--line)',
    flexWrap: 'wrap'
  },
  left: { display: 'flex', alignItems: 'center', gap: 10 },
  dotSep: { color: 'var(--ink-3)' },
  center: {
    display: 'flex',
    gap: 22,
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  link: {
    fontSize: 11,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'var(--ink-2)',
    transition: 'color 200ms ease'
  },
  right: { display: 'flex', alignItems: 'center', gap: 8 },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    transition: 'box-shadow 300ms ease'
  }
};
