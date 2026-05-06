'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';

export default function WaitlistSection() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), location: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error desconocido');
      setSubmitted(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al registrar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={styles.section} id="waitlist">
      {/* Divider line */}
      <div style={styles.divider} />

      {/* Manifesto block */}
      <div style={styles.manifesto}>
        <p style={styles.manifestoEyebrow} className="aura-mono">
          bernie krause · 50 años de grabaciones · más de la mitad han desaparecido
        </p>
        <h2 style={styles.manifestoH1}>
          Construimos ciudades sin escuchar<br />
          <em>a sus otros habitantes.</em>
        </h2>
        <div style={styles.manifestoBody}>
          <p style={styles.manifestoP}>
            Antes de que un bosque urbano muera, cambia su soundscape.
            La biofonia — los pájaros, los insectos, los anfibios — desaparece primero.
            Quedan las máquinas, el tráfico, el aire acondicionado.
          </p>
          <p style={styles.manifestoP}>
            AURA escucha esa transición.
            La registra. La hace verificable. La convierte en evidencia.
          </p>
        </div>

        <blockquote style={styles.quote}>
          "Los pájaros tienen mucho por enseñarnos.
          AURA es el instrumento para escucharlos
          — y para que su voz tenga peso en el mundo."
        </blockquote>
      </div>

      {/* Three pillars */}
      <div style={styles.pillars}>
        <Pillar
          label="ESCUCHA"
          body="Procesa el sonido localmente en el sensor. Nunca sale audio crudo a la red. Solo patrones, índices, especies."
          color="var(--biophony)"
        />
        <Pillar
          label="REGISTRA"
          body="Los datos van a la blockchain en tiempo real. El historial es inmutable. Nadie puede borrar lo que sucedió."
          color="var(--data-text)"
        />
        <Pillar
          label="VALORA"
          body="Recibes token AURA por cada hora de monitoreo activo. El ecosistema tiene valor económico verificable."
          color="var(--barragán)"
        />
      </div>

      <p style={styles.privacyNote} className="aura-mono">
        AURA no escucha a las personas. AURA escucha a los que nadie escucha.
      </p>

      {/* Intelligence Curse section */}
      <IntelligenceCurseSection />

      {/* Waitlist form */}
      <div style={styles.formBlock}>
        <div style={styles.formHeader}>
          <h3 style={styles.formTitle}>Sé un nodo.</h3>
          <p style={styles.formSubtitle}>
            El primer sensor AURA está en desarrollo.
            Si tienes un balcón o azotea con acceso a luz y WiFi,
            puedes ser parte de la primera red de escucha urbana.
          </p>
        </div>

        {submitted ? (
          <div style={styles.successBlock}>
            <span style={styles.successDot} />
            <div>
              <p style={styles.successTitle} className="aura-mono">nodo registrado</p>
              <p style={styles.successBody}>
                Eres parte de la red. Te contactaremos cuando el primer lote de sensores esté listo.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <input
              type="text"
              required
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
            />
            <input
              type="email"
              required
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
            />
            <button type="submit" disabled={loading} style={styles.submitBtn}>
              <span className="aura-mono" style={styles.submitLabel}>
                {loading ? 'registrando…' : 'QUIERO UN SENSOR →'}
              </span>
            </button>
            <p style={styles.formNote} className="aura-mono">
              Solo necesitas un balcón o azotea · luz · WiFi
            </p>
          </form>
        )}
      </div>

      {/* Audience callouts */}
      <div style={styles.audiences}>
        <AudienceCard
          label="Vecinos y residentes"
          body="Si tienes un balcón o azotea con WiFi, puedes convertirte en un punto de escucha de tu colonia."
          color="var(--biophony)"
        />
        <AudienceCard
          label="Investigadores e instituciones"
          body="Los datos de la red son abiertos para investigación científica y política pública."
          color="var(--data-text)"
        />
        <AudienceCard
          label="Empresas y fundaciones"
          body="El archivo de AURA es evidencia verificable del estado sonoro de los ecosistemas urbanos."
          color="var(--barragán)"
        />
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerLeft}>
          <span style={styles.footerWordmark} className="aura-serif">AURA</span>
          <span style={styles.footerSub} className="aura-mono">
            Autonomous Urban Regeneration Via Audio
          </span>
          <span style={styles.footerMeta} className="aura-mono">
            2026 · Frutero Club · CDMX · México
          </span>
        </div>
        <div style={styles.footerRight}>
          <span style={styles.footerCoord} className="aura-mono">19.4326° N  99.1332° W</span>
          <span style={styles.footerCoord} className="aura-mono">Nodo-01 · activo</span>
        </div>
        <div style={styles.footerCredit} className="aura-mono">
          Construido sobre los hombros de Bernie Krause,
          Luis Barragán, Ryoji Ikeda y los pájaros de la ciudad.
        </div>
      </footer>
    </section>
  );
}

// ── Intelligence Curse Section ────────────────────────────────────────────────
function IntelligenceCurseSection() {
  return (
    <div style={icStyles.wrapper}>

      {/* Horizontal rule with label */}
      <div style={icStyles.ruleRow}>
        <div style={icStyles.ruleLine} />
        <span className="aura-mono" style={icStyles.ruleLabel}>tesis</span>
        <div style={icStyles.ruleLine} />
      </div>

      {/* Opening statement — large, centered */}
      <div style={icStyles.opening}>
        <p className="aura-mono" style={icStyles.openingEyebrow}>
          Drago &amp; Laine · The Intelligence Curse · 2025
        </p>
        <h2 style={icStyles.openingH}>
          Cuando la IA no necesite a las personas,<br />
          <em>tampoco necesitará a los pájaros.</em>
        </h2>
        <p style={icStyles.openingBody}>
          La Intelligence Curse describe cómo la llegada del AGI destruirá el incentivo
          de los actores poderosos para invertir en las personas.
          AURA extiende esa lógica: si los actores poderosos ya no necesitan a los humanos,
          mucho menos necesitarán a los ecosistemas.
          A menos que exista una infraestructura que haga que la salud de esos ecosistemas
          tenga valor económico verificable y no ignorable.
        </p>
      </div>

      {/* The argument — two columns */}
      <div style={icStyles.argGrid}>
        <div style={icStyles.argCol}>
          <span className="aura-mono" style={{ ...icStyles.argLabel, color: '#fb7185' }}>
            el problema
          </span>
          <p style={icStyles.argText}>
            Hoy, un humedal urbano no tiene representación económica.
            Puede ser rellenado, pavimentado o contaminado
            sin que el mercado lo penalice.
            Su destrucción no aparece en ningún balance.
            Su silencio no tiene precio.
          </p>
          <p style={icStyles.argText}>
            Antes de que un ecosistema muera, cambia su soundscape.
            La biofonia desaparece primero — los pájaros, los insectos, los anfibios.
            Ese silencio es la señal más temprana de colapso ecológico.
            Y nadie la está escuchando.
          </p>
        </div>

        <div style={icStyles.argCol}>
          <span className="aura-mono" style={{ ...icStyles.argLabel, color: '#6ee7b7' }}>
            la respuesta
          </span>
          <p style={icStyles.argText}>
            Con AURA, ese humedal tiene un registro histórico de su salud acústica
            desde el día 1 del nodo. Un índice de degradación o regeneración
            a lo largo del tiempo. Una representación en la red que puede ser
            citada, comprada, donada o presentada como evidencia.
          </p>
          <p style={icStyles.argText}>
            El soundscape se convierte en activo verificable.
            El ecosistema, en agente económico con voz medible.
            La destrucción, en algo que el mercado ya no puede ignorar.
          </p>
        </div>
      </div>

      {/* The central claim — full width, large */}
      <div style={icStyles.claim}>
        <div style={icStyles.claimLine} />
        <p style={icStyles.claimText}>
          "Los ecosistemas son agentes con voz propia.
          Lo que falta no es la voz —
          es la infraestructura para escucharla,
          registrarla y valorarla."
        </p>
        <div style={icStyles.claimLine} />
      </div>

      {/* Three economic mechanisms */}
      <div style={icStyles.mechGrid}>
        <Mechanism
          number="01"
          title="Archivo inmutable"
          body="El historial acústico de un ecosistema registrado en blockchain no puede ser alterado. Es evidencia legal, científica y política. Nadie puede decir que el bosque siempre estuvo así."
          color="#4ab8d8"
        />
        <Mechanism
          number="02"
          title="Valor por rareza"
          body="Una especie rara detectada en el nodo genera más valor en la red. La biodiversidad tiene precio. Proteger el ecosistema se vuelve económicamente racional."
          color="#6ee7b7"
        />
        <Mechanism
          number="03"
          title="Justicia sonora"
          body="Las colonias con menos verde urbano tienen soundscapes más degradados. AURA hace esa desigualdad visible, medible y comparable. El dato es el argumento."
          color="#c45c2a"
        />
      </div>

    </div>
  );
}

function Mechanism({ number, title, body, color }: {
  number: string; title: string; body: string; color: string;
}) {
  return (
    <div style={icStyles.mech}>
      <span className="aura-mono" style={{ ...icStyles.mechNumber, color }}>{number}</span>
      <h4 style={icStyles.mechTitle}>{title}</h4>
      <p style={icStyles.mechBody}>{body}</p>
    </div>
  );
}

const icStyles: Record<string, CSSProperties> = {
  wrapper: {
    display: 'grid',
    gap: 72,
    padding: '40px 0',
  },
  ruleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
  },
  ruleLine: {
    flex: 1,
    height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(110,231,183,0.2), transparent)',
  },
  ruleLabel: {
    fontSize: 9,
    letterSpacing: '0.4em',
    color: 'rgba(110,231,183,0.35)',
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  opening: {
    maxWidth: 800,
    margin: '0 auto',
    textAlign: 'center',
    display: 'grid',
    gap: 28,
  },
  openingEyebrow: {
    fontSize: 10,
    letterSpacing: '0.28em',
    color: 'rgba(110,231,183,0.35)',
    textTransform: 'uppercase',
  },
  openingH: {
    margin: 0,
    fontFamily: 'var(--font-serif), serif',
    fontSize: 'clamp(1.8rem, 3.5vw, 3.2rem)',
    fontWeight: 400,
    lineHeight: 1.15,
    letterSpacing: '-0.02em',
    color: '#e8f5ee',
  },
  openingBody: {
    margin: 0,
    fontFamily: 'var(--font-serif), serif',
    fontSize: 'clamp(1rem, 1.3vw, 1.15rem)',
    lineHeight: 1.7,
    color: 'rgba(168,230,192,0.65)',
    maxWidth: 680,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  argGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 0,
    border: '1px solid rgba(110,231,183,0.1)',
  },
  argCol: {
    padding: '40px 36px',
    display: 'grid',
    gap: 20,
    alignContent: 'start',
    borderRight: '1px solid rgba(110,231,183,0.08)',
  },
  argLabel: {
    fontSize: 10,
    letterSpacing: '0.36em',
    textTransform: 'uppercase',
    fontWeight: 300,
  },
  argText: {
    margin: 0,
    fontFamily: 'var(--font-serif), serif',
    fontSize: 'clamp(0.95rem, 1.2vw, 1.05rem)',
    lineHeight: 1.7,
    color: 'rgba(168,230,192,0.7)',
  },
  claim: {
    display: 'grid',
    gap: 32,
    maxWidth: 720,
    margin: '0 auto',
    textAlign: 'center',
  },
  claimLine: {
    height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(110,231,183,0.25), transparent)',
  },
  claimText: {
    margin: 0,
    fontFamily: 'var(--font-serif), serif',
    fontStyle: 'italic',
    fontSize: 'clamp(1.2rem, 2vw, 1.7rem)',
    lineHeight: 1.55,
    color: 'rgba(168,230,192,0.9)',
    letterSpacing: '-0.01em',
  },
  mechGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 0,
    borderTop: '1px solid rgba(110,231,183,0.1)',
  },
  mech: {
    padding: '32px 28px',
    display: 'grid',
    gap: 12,
    alignContent: 'start',
    borderRight: '1px solid rgba(110,231,183,0.08)',
    borderBottom: '1px solid rgba(110,231,183,0.06)',
  },
  mechNumber: {
    fontSize: 10,
    letterSpacing: '0.36em',
    fontWeight: 300,
  },
  mechTitle: {
    margin: 0,
    fontFamily: 'var(--font-serif), serif',
    fontSize: '1.2rem',
    fontWeight: 400,
    color: '#e8f5ee',
    letterSpacing: '-0.01em',
  },
  mechBody: {
    margin: 0,
    fontFamily: 'var(--font-serif), serif',
    fontSize: '0.95rem',
    lineHeight: 1.65,
    color: 'rgba(168,230,192,0.6)',
  },
};

function Pillar({ label, body, color }: { label: string; body: string; color: string }) {
  return (
    <div style={styles.pillar}>
      <span className="aura-mono" style={{ ...styles.pillarLabel, color }}>{label}</span>
      <p style={styles.pillarBody}>{body}</p>
    </div>
  );
}

function AudienceCard({ label, body, color }: { label: string; body: string; color: string }) {
  return (
    <div style={styles.audienceCard}>
      <span className="aura-mono" style={{ ...styles.audienceLabel, color }}>{label}</span>
      <p style={styles.audienceBody}>{body}</p>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  section: {
    background: 'var(--bg-deep)',
    padding: '0 clamp(24px, 6vw, 120px)',
    display: 'grid',
    gap: 80,
  },
  divider: {
    height: 1,
    background: 'linear-gradient(90deg, transparent, var(--line-strong), transparent)',
    marginTop: 0,
  },
  manifesto: {
    maxWidth: 760,
    margin: '0 auto',
    textAlign: 'center',
    display: 'grid',
    gap: 24,
  },
  manifestoEyebrow: {
    fontSize: 10,
    letterSpacing: '0.28em',
    color: 'var(--data-dim)',
    textTransform: 'uppercase',
  },
  manifestoH1: {
    margin: 0,
    fontFamily: 'var(--font-serif), serif',
    fontSize: 'clamp(2rem, 4vw, 3.6rem)',
    fontWeight: 400,
    lineHeight: 1.12,
    letterSpacing: '-0.02em',
    color: '#e8f5ee',
  },
  manifestoBody: {
    display: 'grid',
    gap: 16,
  },
  manifestoP: {
    margin: 0,
    fontFamily: 'var(--font-serif), serif',
    fontSize: 'clamp(1rem, 1.4vw, 1.2rem)',
    lineHeight: 1.65,
    color: 'rgba(168, 230, 192, 0.75)',
  },
  quote: {
    margin: '8px 0 0',
    padding: '24px 32px',
    borderLeft: '2px solid var(--biophony-lo)',
    fontFamily: 'var(--font-serif), serif',
    fontStyle: 'italic',
    fontSize: 'clamp(1.1rem, 1.6vw, 1.4rem)',
    lineHeight: 1.55,
    color: 'rgba(168, 230, 192, 0.9)',
    textAlign: 'left',
    background: 'rgba(74, 158, 114, 0.04)',
  },
  pillars: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 1,
    border: '1px solid var(--line)',
  },
  pillar: {
    padding: '32px 28px',
    borderRight: '1px solid var(--line)',
    display: 'grid',
    gap: 12,
    background: 'rgba(0, 10, 6, 0.4)',
  },
  pillarLabel: {
    fontSize: 11,
    letterSpacing: '0.36em',
    textTransform: 'uppercase',
    fontWeight: 300,
  },
  pillarBody: {
    margin: 0,
    fontFamily: 'var(--font-serif), serif',
    fontSize: '1rem',
    lineHeight: 1.6,
    color: 'rgba(168, 230, 192, 0.65)',
  },
  privacyNote: {
    textAlign: 'center',
    fontSize: 11,
    letterSpacing: '0.22em',
    color: 'var(--data-dim)',
    textTransform: 'uppercase',
    margin: '-40px 0',
  },
  formBlock: {
    maxWidth: 560,
    margin: '0 auto',
    display: 'grid',
    gap: 32,
    width: '100%',
  },
  formHeader: {
    display: 'grid',
    gap: 12,
    textAlign: 'center',
  },
  formTitle: {
    margin: 0,
    fontFamily: 'var(--font-serif), serif',
    fontSize: 'clamp(1.8rem, 3vw, 2.8rem)',
    fontWeight: 400,
    color: '#e8f5ee',
    letterSpacing: '-0.02em',
  },
  formSubtitle: {
    margin: 0,
    fontFamily: 'var(--font-serif), serif',
    fontSize: '1rem',
    lineHeight: 1.6,
    color: 'rgba(168, 230, 192, 0.65)',
  },
  form: {
    display: 'grid',
    gap: 12,
  },
  input: {
    background: 'rgba(0, 220, 160, 0.04)',
    border: '1px solid var(--line-strong)',
    borderRadius: 0,
    padding: '14px 16px',
    fontFamily: 'var(--font-mono), monospace',
    fontWeight: 300,
    fontSize: 13,
    letterSpacing: '0.06em',
    color: 'var(--data-text)',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.2s',
  },
  submitBtn: {
    background: 'rgba(0, 220, 160, 0.08)',
    border: '1px solid var(--biophony-lo)',
    padding: '16px 24px',
    cursor: 'pointer',
    transition: 'background 0.2s, border-color 0.2s',
    marginTop: 4,
  },
  submitLabel: {
    fontSize: 12,
    letterSpacing: '0.32em',
    color: 'var(--biophony)',
    textTransform: 'uppercase',
  },
  formNote: {
    textAlign: 'center',
    fontSize: 10,
    letterSpacing: '0.22em',
    color: 'var(--data-ghost)',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  successBlock: {
    display: 'flex',
    gap: 16,
    alignItems: 'flex-start',
    padding: '24px',
    border: '1px solid var(--biophony-lo)',
    background: 'rgba(74, 158, 114, 0.06)',
  },
  successDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: 'var(--biophony)',
    boxShadow: '0 0 12px var(--biophony)',
    marginTop: 6,
    flexShrink: 0,
    animation: 'aura-breathe 2s infinite',
  },
  successTitle: {
    fontSize: 11,
    letterSpacing: '0.28em',
    color: 'var(--biophony)',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  successBody: {
    margin: 0,
    fontFamily: 'var(--font-serif), serif',
    fontSize: '1rem',
    lineHeight: 1.55,
    color: 'rgba(168, 230, 192, 0.75)',
  },
  audiences: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 24,
    paddingBottom: 40,
  },
  audienceCard: {
    display: 'grid',
    gap: 10,
    padding: '20px 0',
    borderTop: '1px solid var(--line)',
  },
  audienceLabel: {
    fontFamily: 'var(--font-serif), serif',
    fontStyle: 'italic',
    fontSize: '1.1rem',
    fontWeight: 400,
  },
  audienceBody: {
    margin: 0,
    fontFamily: 'var(--font-serif), serif',
    fontSize: '0.95rem',
    lineHeight: 1.6,
    color: 'rgba(168, 230, 192, 0.6)',
  },
  footer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gridTemplateRows: 'auto auto',
    gap: 16,
    padding: '32px 0 48px',
    borderTop: '1px solid var(--line)',
  },
  footerLeft: {
    display: 'grid',
    gap: 6,
    alignContent: 'start',
  },
  footerWordmark: {
    fontSize: '2rem',
    color: 'var(--biophony)',
    letterSpacing: '0.12em',
    opacity: 0.7,
  },
  footerSub: {
    fontSize: 10,
    letterSpacing: '0.22em',
    color: 'var(--data-dim)',
    textTransform: 'uppercase',
  },
  footerMeta: {
    fontSize: 10,
    letterSpacing: '0.18em',
    color: 'var(--data-ghost)',
    textTransform: 'uppercase',
  },
  footerRight: {
    display: 'grid',
    gap: 6,
    alignContent: 'start',
    justifyItems: 'end',
  },
  footerCoord: {
    fontSize: 11,
    letterSpacing: '0.18em',
    color: 'var(--data-dim)',
  },
  footerCredit: {
    gridColumn: '1 / -1',
    fontSize: 10,
    letterSpacing: '0.14em',
    color: 'var(--data-ghost)',
    lineHeight: 1.6,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
};
