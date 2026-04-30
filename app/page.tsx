'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  AudioWaveform,
  BrainCircuit,
  CloudSun,
  Cpu,
  Leaf,
  MapPinned,
  Radio,
  ShieldAlert,
  ThermometerSun,
  Waves,
  Wind
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import AuroraBackground from '@/components/AuroraBackground';
import {
  ACOUSTIC_LAYERS,
  AGENT_INSIGHTS,
  EVOLUTION,
  SENSOR_LAYERS,
  generate24h,
  type AgentInsight
} from '@/lib/history-mock';
import type { SensorApiResponse } from '@/lib/sensor-store';

type Tone = 'emerald' | 'amber' | 'rose' | 'slate';

type Presentation = {
  title: string;
  badge: string;
  text: string;
  tone: Tone;
  score: number;
};

const DISCONNECTED: SensorApiResponse = {
  nodeId: 'AURA-001',
  temperature: null,
  humidity: null,
  state: 'disconnected',
  timestamp: null,
  online: false,
  hasData: false,
  lastSeenMs: null
};

function presentationFor(state: SensorApiResponse['state']): Presentation {
  switch (state) {
    case 'balanced':
      return {
        title: 'Equilibrio ecológico',
        badge: 'Condición estable',
        text: 'La lectura actual sugiere un entorno con baja fricción climática. El nodo interpreta una señal compatible con estabilidad ambiental.',
        tone: 'emerald',
        score: 82
      };
    case 'attention':
      return {
        title: 'Atención preventiva',
        badge: 'Seguimiento recomendado',
        text: 'La combinación térmica e hídrica comienza a empujar el sistema fuera de su zona cómoda. Conviene observar la siguiente ventana acústica.',
        tone: 'amber',
        score: 61
      };
    case 'alert':
      return {
        title: 'Estrés del ecosistema',
        badge: 'Alerta activa',
        text: 'El nodo detecta una señal crítica de calor y sequedad. En la visión completa de AURA, este estado se cruzaría con firmas sonoras y alertas agénticas.',
        tone: 'rose',
        score: 32
      };
    default:
      return {
        title: 'Esperando señal real',
        badge: 'Nodo sin transmisión',
        text: 'El sistema está listo para escuchar. En cuanto el sensor envíe lecturas, el pulso ambiental se activará aquí en tiempo real.',
        tone: 'slate',
        score: 0
      };
  }
}

function toneColor(tone: Tone) {
  return {
    emerald: '#6ee7b7',
    amber: '#f59e0b',
    rose: '#fb7185',
    slate: '#94a3b8'
  }[tone];
}

function formatValue(value: number | null, unit: string, digits: number) {
  return value === null ? `-- ${unit}` : `${value.toFixed(digits)} ${unit}`;
}

function formatTime(timestamp: number | null) {
  return timestamp
    ? new Date(timestamp).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
    : 'sin datos';
}

function getInsightTone(level: AgentInsight['level']) {
  switch (level) {
    case 'restoration':
      return { color: '#6ee7b7', bg: 'rgba(110,231,183,0.12)', label: 'restauración' };
    case 'attention':
      return { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', label: 'atención' };
    case 'alert':
      return { color: '#fb7185', bg: 'rgba(251,113,133,0.12)', label: 'alerta' };
    default:
      return { color: '#7dd3fc', bg: 'rgba(125,211,252,0.12)', label: 'info' };
  }
}

function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: Tone }) {
  const color = toneColor(tone);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        borderRadius: 999,
        border: `1px solid ${tone === 'slate' ? 'rgba(255,255,255,0.12)' : `${color}33`}`,
        background: tone === 'slate' ? 'rgba(255,255,255,0.05)' : `${color}1a`,
        color: tone === 'slate' ? '#dbe4de' : color,
        fontSize: 12,
        letterSpacing: '0.08em',
        textTransform: 'uppercase'
      }}
    >
      {children}
    </span>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  accent
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
  accent: string;
}) {
  return (
    <div style={{ ...styles.panel, padding: 22, minHeight: 170 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <p style={styles.kicker}>{label}</p>
          <p style={{ margin: '14px 0 6px', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 600 }}>{value}</p>
          <p style={styles.muted}>{hint}</p>
        </div>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            display: 'grid',
            placeItems: 'center',
            background: `${accent}1f`,
            color: accent,
            border: `1px solid ${accent}33`
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [sensor, setSensor] = useState<SensorApiResponse>(DISCONNECTED);
  const presentation = useMemo(() => presentationFor(sensor.state), [sensor.state]);
  const history = useMemo(() => generate24h(42), []);
  const acousticNow = history[history.length - 1];
  const climateDelta = useMemo(() => {
    const first = history[0];
    const last = history[history.length - 1];
    return {
      temp: last.temperature - first.temperature,
      humidity: last.humidity - first.humidity,
      ndsi: last.ndsi - first.ndsi
    };
  }, [history]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const response = await fetch('/api/sensor', { cache: 'no-store' });
        if (!response.ok) throw new Error('No se pudo leer /api/sensor');
        const json = (await response.json()) as SensorApiResponse;
        if (mounted) setSensor(json);
      } catch {
        if (mounted) setSensor(DISCONNECTED);
      }
    }

    load();
    const interval = setInterval(load, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div style={styles.shell}>
      <AuroraBackground />
      <style>{`
        @media (max-width: 1180px) {
          .aura-hero,
          .aura-two-col,
          .aura-three-col,
          .aura-stats,
          .aura-values,
          .aura-story {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 760px) {
          .aura-mini-grid,
          .aura-delta-grid {
            grid-template-columns: 1fr !important;
          }
          .aura-layer-row {
            flex-direction: column;
            align-items: flex-start !important;
          }
        }
      `}</style>
      <main style={styles.main}>
        <section className="aura-hero" style={styles.hero}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <Badge tone="emerald">AURA v2 · urban bioacoustic intelligence</Badge>
            <h1 style={styles.heroTitle}>
              El bosque urbano <span className="aura-serif" style={{ fontStyle: 'italic', color: '#b8ffd8' }}>respira</span>.
              <br />
              AURA aprende a escucharlo.
            </h1>
            <p style={styles.heroCopy}>
              Estamos construyendo una interfaz para leer la salud de ecosistemas urbanos como si fueran una partitura viva:
              sensores distribuidos, bioacústica, señales climáticas y agentes de IA interpretando el pulso de la ciudad en tiempo real.
            </p>
            <div style={styles.heroActions}>
              <Badge tone={sensor.online ? 'emerald' : 'slate'}>{sensor.online ? 'ESP32 online' : 'Nodo esperando señal'}</Badge>
              <Badge tone={presentation.tone}>{presentation.badge}</Badge>
              <Badge tone="slate">DePIN + Data-as-a-Service</Badge>
            </div>
            <div className="aura-story" style={styles.storyStrip}>
              {[
                'Temperatura y humedad en vivo',
                'Capas biofónicas e históricas',
                'Agentes para interpretación ambiental'
              ].map((item) => (
                <div key={item} style={styles.storyChip}>
                  <span style={styles.storyDot} />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={styles.heroVisualCard}
            className="aura-grain"
          >
            <div style={styles.heroVisualHeader}>
              <div>
                <p style={styles.kicker}>live ecosystem pulse</p>
                <h2 style={{ margin: '10px 0 0', fontSize: 28, fontWeight: 600 }}>{presentation.title}</h2>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={styles.kicker}>node id</p>
                <p className="aura-mono" style={{ margin: '10px 0 0', color: '#dfffea' }}>{sensor.nodeId}</p>
              </div>
            </div>

            <div style={styles.orbStage}>
              <div style={{ ...styles.orbRing, borderColor: `${toneColor(presentation.tone)}33` }} />
              <div style={{ ...styles.orbRing, width: '72%', height: '72%', animationDelay: '1.2s', borderColor: `${toneColor(presentation.tone)}22` }} />
              <motion.div
                animate={{ scale: [0.98, 1.05, 0.98] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  ...styles.orbCore,
                  background: `radial-gradient(circle at 35% 30%, #ffffff, ${toneColor(presentation.tone)} 20%, rgba(9,16,13,0.12) 65%)`,
                  boxShadow: `0 0 120px ${toneColor(presentation.tone)}55, inset 0 0 60px rgba(255,255,255,0.25)`
                }}
              />
              <div style={styles.orbCaption}>
                <span className="aura-mono">eco score</span>
                <strong>{presentation.score}</strong>
              </div>
            </div>

            <div className="aura-mini-grid" style={styles.miniGrid}>
              <div style={styles.miniMetric}>
                <ThermometerSun size={18} />
                <div>
                  <span style={styles.metricLabel}>temperatura</span>
                  <strong>{formatValue(sensor.temperature, '°C', 1)}</strong>
                </div>
              </div>
              <div style={styles.miniMetric}>
                <CloudSun size={18} />
                <div>
                  <span style={styles.metricLabel}>humedad</span>
                  <strong>{formatValue(sensor.humidity, '%', 0)}</strong>
                </div>
              </div>
              <div style={styles.miniMetric}>
                <AudioWaveform size={18} />
                <div>
                  <span style={styles.metricLabel}>ndsi simulado</span>
                  <strong>{acousticNow.ndsi.toFixed(2)}</strong>
                </div>
              </div>
              <div style={styles.miniMetric}>
                <Radio size={18} />
                <div>
                  <span style={styles.metricLabel}>última lectura</span>
                  <strong>{formatTime(sensor.timestamp)}</strong>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="aura-stats" style={styles.statsGrid}>
          <StatCard
            icon={<Leaf size={22} />}
            label="Biofonía proyectada"
            value={`${Math.round(acousticNow.biophony)}%`}
            hint="Índice estimado de actividad biológica a partir del histórico de demostración."
            accent="#6ee7b7"
          />
          <StatCard
            icon={<Waves size={22} />}
            label="Antropofonía"
            value={`${Math.round(acousticNow.anthrophony)}%`}
            hint="Huella sonora humana para contrastar salud ecosistémica y presión urbana."
            accent="#fb923c"
          />
          <StatCard
            icon={<BrainCircuit size={22} />}
            label="Inferencia agéntica"
            value={presentation.badge}
            hint="Capa futura para recomendaciones en tiempo real a gobiernos, ONGs y ciudadanos."
            accent="#c4b5fd"
          />
        </section>

        <section className="aura-two-col" style={styles.twoColSection}>
          <article style={{ ...styles.panel, minHeight: 520 }}>
            <div style={styles.sectionHead}>
              <div>
                <p style={styles.kicker}>telemetría climática + lectura viva</p>
                <h2 style={styles.sectionTitle}>Pulso del nodo en contexto histórico</h2>
              </div>
              <div style={{ maxWidth: 280, textAlign: 'right' }}>
                <p style={styles.muted}>Hoy el histórico es simulado para narrativa visual; la lectura live sigue viniendo del ESP32 real.</p>
              </div>
            </div>

            <div style={styles.chartLegend}>
              <span><span style={{ ...styles.legendSwatch, background: '#6ee7b7' }} />temperatura</span>
              <span><span style={{ ...styles.legendSwatch, background: '#7dd3fc' }} />humedad</span>
            </div>
            <div style={{ width: '100%', height: 290 }}>
              <ResponsiveContainer>
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6ee7b7" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#6ee7b7" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="humFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7dd3fc" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#7dd3fc" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="label" stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} width={34} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#e5fff0' }} />
                  <Area type="monotone" dataKey="temperature" stroke="#6ee7b7" strokeWidth={2} fill="url(#tempFill)" />
                  <Area type="monotone" dataKey="humidity" stroke="#7dd3fc" strokeWidth={2} fill="url(#humFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="aura-delta-grid" style={styles.deltaGrid}>
              <div style={styles.deltaCard}>
                <span style={styles.metricLabel}>Δ temperatura 24h</span>
                <strong>{climateDelta.temp > 0 ? '+' : ''}{climateDelta.temp.toFixed(1)} °C</strong>
              </div>
              <div style={styles.deltaCard}>
                <span style={styles.metricLabel}>Δ humedad 24h</span>
                <strong>{climateDelta.humidity > 0 ? '+' : ''}{climateDelta.humidity.toFixed(0)} %</strong>
              </div>
              <div style={styles.deltaCard}>
                <span style={styles.metricLabel}>Δ índice NDSI</span>
                <strong>{climateDelta.ndsi > 0 ? '+' : ''}{climateDelta.ndsi.toFixed(2)}</strong>
              </div>
            </div>
          </article>

          <article style={{ ...styles.panel, minHeight: 520 }}>
            <div style={styles.sectionHead}>
              <div>
                <p style={styles.kicker}>bernie krause · bioacústica vs antropoacústica</p>
                <h2 style={styles.sectionTitle}>La ciudad como paisaje sonoro medible</h2>
              </div>
            </div>

            <div style={styles.chartLegend}>
              {ACOUSTIC_LAYERS.map((layer) => (
                <span key={layer.id}><span style={{ ...styles.legendSwatch, background: layer.color }} />{layer.name}</span>
              ))}
            </div>
            <div style={{ width: '100%', height: 290 }}>
              <ResponsiveContainer>
                <LineChart data={history}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="label" stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} width={34} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#e5fff0' }} />
                  <Line type="monotone" dataKey="biophony" stroke="#6ee7b7" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="geophony" stroke="#7dd3fc" strokeWidth={2.2} dot={false} />
                  <Line type="monotone" dataKey="anthrophony" stroke="#fb923c" strokeWidth={2.2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              {ACOUSTIC_LAYERS.map((layer) => (
                <div key={layer.id} className="aura-layer-row" style={styles.layerRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ ...styles.legendSwatch, width: 12, height: 12, borderRadius: 999, background: layer.color }} />
                    <div>
                      <strong style={{ display: 'block' }}>{layer.name}</strong>
                      <span style={styles.muted}>{layer.description}</span>
                    </div>
                  </div>
                  <span className="aura-mono" style={{ color: '#dfe7e2', fontSize: 12 }}>{layer.range}</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="aura-three-col" style={styles.threeColSection}>
          <article style={{ ...styles.panel, minHeight: 450 }}>
            <p style={styles.kicker}>agentic intelligence</p>
            <h2 style={styles.sectionTitle}>Qué harían los agentes sobre esta data</h2>
            <div style={{ display: 'grid', gap: 14, marginTop: 22 }}>
              {AGENT_INSIGHTS.map((insight) => {
                const tone = getInsightTone(insight.level);
                return (
                  <div key={insight.id} style={{ ...styles.insightCard, background: tone.bg, borderColor: `${tone.color}22` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                      <strong className="aura-mono" style={{ color: tone.color, fontSize: 12 }}>{insight.agent}</strong>
                      <Badge tone="slate">{insight.time}</Badge>
                    </div>
                    <p style={{ margin: '12px 0 0', color: '#edf7ef', lineHeight: 1.65 }}>{insight.message}</p>
                  </div>
                );
              })}
            </div>
          </article>

          <article style={{ ...styles.panel, minHeight: 450 }}>
            <p style={styles.kicker}>sensor stack roadmap</p>
            <h2 style={styles.sectionTitle}>De termohigrómetro a oído urbano distribuido</h2>
            <div style={{ display: 'grid', gap: 12, marginTop: 22 }}>
              {SENSOR_LAYERS.map((layer) => (
                <div key={layer.id} style={styles.sensorCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                    <strong>{layer.name}</strong>
                    <Badge tone={layer.status === 'active' ? 'emerald' : layer.status === 'soon' ? 'amber' : 'slate'}>
                      {layer.status === 'active' ? 'activo' : layer.status === 'soon' ? 'siguiente' : 'futuro'}
                    </Badge>
                  </div>
                  <p style={{ margin: '10px 0 0', color: '#b7c5bd', lineHeight: 1.65 }}>{layer.description}</p>
                </div>
              ))}
            </div>
          </article>

          <article style={{ ...styles.panel, minHeight: 450 }}>
            <p style={styles.kicker}>thesis → product</p>
            <h2 style={styles.sectionTitle}>Arquitectura narrativa de la visión</h2>
            <div style={{ display: 'grid', gap: 14, marginTop: 22 }}>
              {EVOLUTION.map((step, index) => (
                <div key={step.code} style={styles.timelineRow}>
                  <div style={styles.timelineBullet}>{index + 1}</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <strong>{step.name}</strong>
                      <span className="aura-mono" style={{ color: '#8fb39c', fontSize: 12 }}>{step.code}</span>
                    </div>
                    <p style={{ margin: '8px 0 0', color: '#b7c5bd', lineHeight: 1.6 }}>{step.premise}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section style={{ ...styles.panel, padding: '28px clamp(22px, 4vw, 34px)' }}>
          <div style={styles.sectionHead}>
            <div>
              <p style={styles.kicker}>why this matters</p>
              <h2 style={styles.sectionTitle}>Una interfaz que ya apunta a la visión 3.0</h2>
            </div>
            <a href="https://aura-tau-five.vercel.app/" target="_blank" rel="noreferrer" style={styles.linkPill}>
              Ver deployment actual <ArrowUpRight size={16} />
            </a>
          </div>
          <div className="aura-values" style={styles.valueGrid}>
            <div style={styles.valueCard}>
              <MapPinned size={20} />
              <strong>Mapeo urbano verificable</strong>
              <p>Corredores acústicos y climáticos legibles por colonia, parque, calle o cuenca urbana.</p>
            </div>
            <div style={styles.valueCard}>
              <ShieldAlert size={20} />
              <strong>Respuesta más rápida</strong>
              <p>Los agentes pueden detectar anomalías antes de que la degradación se vuelva visible o mediática.</p>
            </div>
            <div style={styles.valueCard}>
              <Cpu size={20} />
              <strong>Infraestructura DePIN</strong>
              <p>Usuarios hospedan nodos, reciben incentivos y hacen crecer una red de inteligencia ambiental distribuida.</p>
            </div>
            <div style={styles.valueCard}>
              <Wind size={20} />
              <strong>Data-as-a-Service</strong>
              <p>Gobiernos, ONGs y empresas acceden a capas de observabilidad ambiental accionables y trazables.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

const tooltipStyle: CSSProperties = {
  background: 'rgba(5, 10, 8, 0.92)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 16,
  color: '#f4fff8'
};

const styles: Record<string, CSSProperties> = {
  shell: {
    position: 'relative',
    minHeight: '100vh'
  },
  main: {
    position: 'relative',
    zIndex: 1,
    width: 'min(1440px, calc(100% - 32px))',
    margin: '0 auto',
    padding: '28px 0 72px'
  },
  hero: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.08fr) minmax(380px, 0.92fr)',
    gap: 24,
    alignItems: 'stretch',
    marginBottom: 24
  },
  heroTitle: {
    margin: '22px 0 18px',
    fontSize: 'clamp(3.25rem, 7.5vw, 6.5rem)',
    lineHeight: 0.97,
    fontWeight: 600,
    maxWidth: 860,
    letterSpacing: '-0.05em'
  },
  heroCopy: {
    margin: 0,
    maxWidth: 780,
    color: '#bfd0c4',
    lineHeight: 1.8,
    fontSize: 'clamp(1.02rem, 1.6vw, 1.18rem)'
  },
  heroActions: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 24
  },
  storyStrip: {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    marginTop: 28
  },
  storyChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '16px 18px',
    borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#eaf7ee',
    fontSize: 14,
    backdropFilter: 'blur(14px)'
  },
  storyDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: '#6ee7b7',
    boxShadow: '0 0 18px rgba(110,231,183,0.8)'
  },
  heroVisualCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 32,
    border: '1px solid rgba(255,255,255,0.09)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025))',
    backdropFilter: 'blur(22px)',
    padding: '24px clamp(20px, 3vw, 28px)',
    minHeight: 620,
    display: 'grid',
    alignContent: 'space-between'
  },
  heroVisualHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  orbStage: {
    position: 'relative',
    minHeight: 310,
    display: 'grid',
    placeItems: 'center'
  },
  orbRing: {
    position: 'absolute',
    width: '92%',
    height: '92%',
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.12)',
    animation: 'aura-pulse 4.8s ease-out infinite'
  },
  orbCore: {
    width: '58%',
    aspectRatio: '1 / 1',
    borderRadius: '50%',
    animation: 'aura-breathe 6s ease-in-out infinite'
  },
  orbCaption: {
    position: 'absolute',
    bottom: 18,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    borderRadius: 999,
    background: 'rgba(3,7,5,0.72)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#dfffea',
    backdropFilter: 'blur(10px)'
  },
  miniGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 14
  },
  miniMetric: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px 18px',
    borderRadius: 20,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    color: '#f1fff5'
  },
  metricLabel: {
    display: 'block',
    marginBottom: 6,
    color: '#87a394',
    fontSize: 12,
    letterSpacing: '0.08em',
    textTransform: 'uppercase'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 18,
    marginBottom: 18
  },
  panel: {
    borderRadius: 28,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.025))',
    backdropFilter: 'blur(18px)',
    padding: '26px clamp(20px, 3vw, 30px)',
    boxShadow: '0 18px 70px rgba(0,0,0,0.18)'
  },
  twoColSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 18,
    marginBottom: 18
  },
  threeColSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 18,
    marginBottom: 18
  },
  sectionHead: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 18,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    marginBottom: 18
  },
  sectionTitle: {
    margin: '10px 0 0',
    fontSize: 'clamp(1.7rem, 3vw, 2.6rem)',
    lineHeight: 1.06,
    fontWeight: 600,
    letterSpacing: '-0.04em'
  },
  kicker: {
    margin: 0,
    fontSize: 11,
    letterSpacing: '0.32em',
    textTransform: 'uppercase',
    color: '#6ee7b7',
    opacity: 0.86
  },
  muted: {
    margin: 0,
    color: '#8fa196',
    lineHeight: 1.7,
    fontSize: 14
  },
  chartLegend: {
    display: 'flex',
    gap: 18,
    flexWrap: 'wrap',
    color: '#dfeae3',
    fontSize: 13,
    marginBottom: 10
  },
  legendSwatch: {
    display: 'inline-block',
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: 8
  },
  deltaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 12,
    marginTop: 16
  },
  deltaCard: {
    padding: '16px 18px',
    borderRadius: 18,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    color: '#f2fff5',
    display: 'grid',
    gap: 8
  },
  layerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'center',
    padding: '14px 16px',
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.03)'
  },
  insightCard: {
    padding: '16px 18px',
    borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.08)'
  },
  sensorCard: {
    padding: '16px 18px',
    borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.03)'
  },
  timelineRow: {
    display: 'grid',
    gridTemplateColumns: '42px minmax(0, 1fr)',
    gap: 14,
    alignItems: 'flex-start'
  },
  timelineBullet: {
    width: 42,
    height: 42,
    borderRadius: 999,
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(110,231,183,0.12)',
    border: '1px solid rgba(110,231,183,0.16)',
    color: '#b8ffd8',
    fontWeight: 700
  },
  valueGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 14
  },
  valueCard: {
    padding: '18px 18px 20px',
    borderRadius: 20,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    display: 'grid',
    gap: 12,
    color: '#edf7ef'
  },
  linkPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: '#f1fff5'
  }
};
