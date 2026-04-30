import type { Metadata } from 'next';
import { Inter, Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap'
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap'
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'AURA 2.2 — Voxel observatory for urban bioacoustics',
  description:
    'AURA is a single-node observatory that turns one corner of the city into a four-channel signal: biophony, anthrophony, geophony and live thermohygro telemetry — visible as a Heerich-inspired voxel composition.',
  keywords: [
    'AURA',
    'bioecoacústica',
    'inteligencia ambiental',
    'DePIN',
    'sensores urbanos',
    'agentic AI',
    'Bernie Krause'
  ],
  authors: [{ name: 'AURA / ARVI' }],
  openGraph: {
    title: 'AURA — El bosque respira, el sistema escucha',
    description:
      'Red de inteligencia ambiental autónoma. Bioecoacústica, sensores distribuidos y agentes interpretativos para el sistema nervioso de la ciudad.',
    type: 'website'
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
