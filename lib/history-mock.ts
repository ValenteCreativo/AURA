export type EnvSample = {
  t: number;
  label: string;
  hour: number;
  temperature: number;
  humidity: number;
  biophony: number;
  geophony: number;
  anthrophony: number;
  ndsi: number;
};

export type AcousticLayer = {
  id: 'biophony' | 'geophony' | 'anthrophony';
  name: string;
  description: string;
  color: string;
  range: string;
};

export const ACOUSTIC_LAYERS: AcousticLayer[] = [
  {
    id: 'biophony',
    name: 'Biofonía',
    description: 'Aves, insectos, vegetación. La firma sonora del organismo vivo.',
    color: '#6ee7b7',
    range: '2 kHz – 11 kHz'
  },
  {
    id: 'geophony',
    name: 'Geofonía',
    description: 'Viento, lluvia, agua. El paisaje físico que envuelve el nodo.',
    color: '#7dd3fc',
    range: '20 Hz – 2 kHz'
  },
  {
    id: 'anthrophony',
    name: 'Antropofonía',
    description: 'Tráfico, voces, máquinas. La huella humana sobre el ecosistema.',
    color: '#fb923c',
    range: '60 Hz – 4 kHz'
  }
];

const HOUR = 60 * 60 * 1000;

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export function generate24h(seed = 42): EnvSample[] {
  const rng = mulberry32(seed);
  const now = Date.now();
  const samples: EnvSample[] = [];
  const points = 48;

  for (let i = 0; i < points; i++) {
    const fraction = i / (points - 1);
    const t = now - (1 - fraction) * 24 * HOUR;
    const date = new Date(t);
    const hour = date.getHours() + date.getMinutes() / 60;

    const tempBase = 22 + Math.sin(((hour - 6) / 24) * Math.PI * 2) * 6;
    const temp = tempBase + (rng() - 0.5) * 1.6;

    const humBase = 60 - Math.sin(((hour - 7) / 24) * Math.PI * 2) * 18;
    const hum = humBase + (rng() - 0.5) * 6;

    // Biophony peaks at dawn (5–7) and dusk (18–20)
    const dawn = Math.exp(-Math.pow((hour - 6) / 1.4, 2));
    const dusk = Math.exp(-Math.pow((hour - 19) / 1.6, 2));
    const biophony = 38 + (dawn + dusk) * 26 + rng() * 4;

    // Anthrophony rises in working hours
    const traffic = Math.exp(-Math.pow((hour - 9) / 2.6, 2)) + Math.exp(-Math.pow((hour - 18) / 2.8, 2));
    const anthrophony = 42 + traffic * 22 + rng() * 5;

    // Geophony – mild background, occasional gust
    const gust = rng() > 0.92 ? 8 + rng() * 6 : 0;
    const geophony = 30 + Math.sin(hour / 3) * 4 + rng() * 3 + gust;

    const ndsi = (biophony - anthrophony) / (biophony + anthrophony);

    samples.push({
      t,
      label: `${pad(date.getHours())}:${pad(Math.floor(date.getMinutes() / 30) * 30)}`,
      hour: Math.round(hour * 10) / 10,
      temperature: Math.round(temp * 10) / 10,
      humidity: Math.max(20, Math.min(95, Math.round(hum))),
      biophony: Math.round(biophony * 10) / 10,
      geophony: Math.round(geophony * 10) / 10,
      anthrophony: Math.round(anthrophony * 10) / 10,
      ndsi: Math.round(ndsi * 100) / 100
    });
  }
  return samples;
}

export type AgentInsight = {
  id: string;
  time: string;
  level: 'info' | 'attention' | 'alert' | 'restoration';
  agent: string;
  message: string;
};

export const AGENT_INSIGHTS: AgentInsight[] = [
  {
    id: 'i-01',
    time: '06:14',
    level: 'restoration',
    agent: 'biophony.agent',
    message: 'Coro del amanecer detectado: 14 especies estimadas en 9 minutos de actividad acústica.'
  },
  {
    id: 'i-02',
    time: '09:38',
    level: 'attention',
    agent: 'anthro.agent',
    message: 'Ruido vehicular sostenido sobre 70 dB en banda 200–500 Hz. NDSI desciende a -0.18.'
  },
  {
    id: 'i-03',
    time: '13:02',
    level: 'alert',
    agent: 'climate.agent',
    message: 'Estrés térmico cruzando umbral: 33.4 °C con 28% RH. Recomendación: sombra urbana en zona AURA-001.'
  },
  {
    id: 'i-04',
    time: '17:45',
    level: 'info',
    agent: 'mesh.agent',
    message: 'Nodo AURA-002 propuesto en radio 1.2 km para triangular firma acústica del corredor.'
  },
  {
    id: 'i-05',
    time: '19:52',
    level: 'restoration',
    agent: 'biophony.agent',
    message: 'Coro vespertino estable. Biofonía recuperando densidad post-pico antrópico.'
  }
];

export type SensorLayer = {
  id: string;
  name: string;
  status: 'active' | 'soon' | 'future';
  description: string;
};

export const SENSOR_LAYERS: SensorLayer[] = [
  {
    id: 'thermohygro',
    name: 'Termohigrómetro DHT11',
    status: 'active',
    description: 'Lectura base de temperatura y humedad. Primer órgano del sistema nervioso ambiental.'
  },
  {
    id: 'mic',
    name: 'Micrófono MEMS de banda ancha',
    status: 'soon',
    description: 'Captura del paisaje sonoro completo: biofonía, geofonía y antropofonía.'
  },
  {
    id: 'particulate',
    name: 'Calidad de aire (PM2.5 / CO2)',
    status: 'soon',
    description: 'Material particulado y gases para enriquecer el modelo de salud urbana.'
  },
  {
    id: 'soil',
    name: 'Sonda de suelo + savia',
    status: 'future',
    description: 'Conductividad y bioelectricidad vegetal. El árbol como antena del ecosistema.'
  },
  {
    id: 'lidar',
    name: 'LiDAR ultraligero',
    status: 'future',
    description: 'Inventario estructural y dosel para correlacionar masa verde con firmas acústicas.'
  },
  {
    id: 'edge-ai',
    name: 'Edge AI (clasificación de aves / ruido)',
    status: 'future',
    description: 'Modelos compactos a bordo del nodo. Inferencia local, datos verificables.'
  }
];

export type EvolutionStep = {
  code: string;
  name: string;
  premise: string;
};

export const EVOLUTION: EvolutionStep[] = [
  {
    code: 'REMBU',
    name: 'Red de Evaluación y Monitoreo de Bosques Urbanos',
    premise: 'Sensores descentralizados para hacer visible la salud del arbolado urbano.'
  },
  {
    code: 'SEN',
    name: 'Sensor Economy Network',
    premise: 'Los datos de sensores como infraestructura económica compartida.'
  },
  {
    code: 'AONA',
    name: 'Autonomous Oracles for Networked Aquatic Systems',
    premise: 'Agentes autónomos que interpretan señales y sugieren acciones.'
  },
  {
    code: 'ARVI',
    name: 'Agentic Regeneration Via Intelligence',
    premise: 'Sensores + agentes + datos verificables para respuestas regenerativas.'
  },
  {
    code: 'AURA',
    name: 'Autonomous Urban Regeneration Via Audio',
    premise: 'Una primera interfaz sensible para escuchar el sistema nervioso del bosque urbano.'
  }
];
