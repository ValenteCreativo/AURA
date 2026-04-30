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
  title: 'AURA — Inteligencia ambiental autónoma a través del sonido',
  description:
    'AURA es un nodo experimental de bioecoacústica y sensado urbano. Traduce señales del entorno en estados vivos: equilibrio, atención, alerta y regeneración.',
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
