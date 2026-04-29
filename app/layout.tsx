import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AURA — Autonomous Urban Regeneration Via Audio',
  description: 'Nodo experimental de inteligencia ambiental que traduce señales del entorno en estados vivos.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
