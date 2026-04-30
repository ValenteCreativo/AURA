'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

type Props = {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  align?: 'left' | 'center';
  number?: string;
};

export default function SectionHeading({ eyebrow, title, description, align = 'left', number }: Props) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      style={{
        textAlign: align === 'center' ? 'center' : 'left',
        maxWidth: align === 'center' ? 760 : 880,
        margin: align === 'center' ? '0 auto 48px' : '0 0 48px'
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 14,
          alignItems: 'center',
          justifyContent: align === 'center' ? 'center' : 'flex-start',
          marginBottom: 20
        }}
      >
        {number && (
          <span
            className="aura-mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.2em',
              color: 'var(--ink-3)',
              padding: '4px 10px',
              border: '1px solid var(--line)',
              borderRadius: 999
            }}
          >
            {number}
          </span>
        )}
        <span className="aura-eyebrow">{eyebrow}</span>
      </div>
      <h2
        className="aura-serif"
        style={{
          fontSize: 'clamp(2.4rem, 4.6vw, 4.2rem)',
          lineHeight: 1.04,
          margin: 0,
          fontWeight: 400,
          letterSpacing: '-0.025em'
        }}
      >
        {title}
      </h2>
      {description && (
        <p
          style={{
            margin: '20px 0 0',
            color: 'var(--ink-2)',
            lineHeight: 1.7,
            fontSize: 17,
            maxWidth: 640,
            marginLeft: align === 'center' ? 'auto' : 0,
            marginRight: align === 'center' ? 'auto' : 0
          }}
        >
          {description}
        </p>
      )}
    </motion.header>
  );
}
