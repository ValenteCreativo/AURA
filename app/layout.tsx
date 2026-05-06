import type { Metadata } from 'next';
import { EB_Garamond, DM_Mono } from 'next/font/google';
import './globals.css';

const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap'
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400'],
  style: ['normal', 'italic'],
  variable: '--font-mono',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'AURA — Autonomous Urban Regeneration Via Audio',
  description:
    'AURA es la primera red que trata a los ecosistemas urbanos como agentes económicos con voz medible, archivo histórico inmutable y representación en el mercado global.',
  keywords: [
    'AURA',
    'bioecoacústica',
    'inteligencia ambiental',
    'DePIN',
    'sensores urbanos',
    'agentic AI',
    'Bernie Krause',
    'paisaje sonoro',
    'ecosistemas urbanos',
    'biofonia'
  ],
  authors: [{ name: 'AURA · Frutero Club · CDMX' }],
  openGraph: {
    title: 'AURA — Los ecosistemas merecen voz',
    description:
      'Red de inteligencia ambiental autónoma. Bioecoacústica, sensores distribuidos y agentes interpretativos para el sistema nervioso de la ciudad.',
    type: 'website'
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${ebGaramond.variable} ${dmMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
