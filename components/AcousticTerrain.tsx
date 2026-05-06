'use client';

import { useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Suspense } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TerrainProps = {
  micAnalyser: AnalyserNode | null;
  temperature: number | null;
  humidity: number | null;
  micLevel: number;
  micBands: { low: number; mid: number; high: number };
  sensorOnline: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const GRID = 52;           // terrain resolution
const TERRAIN_SIZE = 14;
const PARTICLE_COUNT = 6000;

// Paleta fundacional
const C_BIOPHONY   = new THREE.Color('#4a9e72');
const C_BIOPHONY_HI = new THREE.Color('#a8e6c0');
const C_ANTHRO     = new THREE.Color('#1a3a44');
const C_ANTHRO_HI  = new THREE.Color('#4a7a8a');
const C_BARRAGÁN   = new THREE.Color('#c45c2a');
const C_BASE       = new THREE.Color('#010b07');

// ─── Terrain Mesh ─────────────────────────────────────────────────────────────

function TerrainMesh({ micAnalyser, temperature, humidity, micLevel, micBands }: TerrainProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const binsRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const timeRef = useRef(0);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, GRID - 1, GRID - 1);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  const colorArray = useMemo(() => {
    return new Float32Array(GRID * GRID * 3);
  }, []);

  useEffect(() => {
    geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
  }, [geometry, colorArray]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    timeRef.current += delta;
    const t = timeRef.current;

    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const col = geometry.attributes.color as THREE.BufferAttribute;

    // Get FFT data if mic is active
    let bins: Uint8Array<ArrayBuffer> | null = null;
    if (micAnalyser) {
      if (!binsRef.current || binsRef.current.length !== micAnalyser.frequencyBinCount) {
        binsRef.current = new Uint8Array(new ArrayBuffer(micAnalyser.frequencyBinCount));
      }
      micAnalyser.getByteFrequencyData(binsRef.current);
      bins = binsRef.current;
    }

    const temp = temperature ?? 22;
    const hum = humidity ?? 60;
    // Normalize: temp 18-34°C → 0-1, humidity 30-80% → 0-1
    const tempNorm = Math.max(0, Math.min(1, (temp - 18) / 16));
    const humNorm  = Math.max(0, Math.min(1, (hum - 30) / 50));

    const N = GRID * GRID;
    for (let i = 0; i < N; i++) {
      const ix = i % GRID;
      const iz = Math.floor(i / GRID);
      const fx = ix / (GRID - 1); // 0..1 left→right
      const fz = iz / (GRID - 1); // 0..1 front→back

      // Quadrant mapping (matches channel deck):
      // NW (fx<0.5, fz<0.5) = biophony
      // NE (fx>=0.5, fz<0.5) = geophony
      // SW (fx<0.5, fz>=0.5) = anthrophony
      // SE (fx>=0.5, fz>=0.5) = sensor
      const isBio   = fx < 0.5 && fz < 0.5;
      const isGeo   = fx >= 0.5 && fz < 0.5;
      const isAnthr = fx < 0.5 && fz >= 0.5;
      const isSens  = fx >= 0.5 && fz >= 0.5;

      // Distance from quadrant center for smooth blending
      const qcx = isBio || isAnthr ? 0.25 : 0.75;
      const qcz = isBio || isGeo   ? 0.25 : 0.75;
      const qdist = Math.sqrt((fx - qcx) ** 2 + (fz - qcz) ** 2);

      // Base terrain wave
      const baseWave =
        Math.sin(fx * 6.2 + t * 0.4) * 0.12 +
        Math.sin(fz * 5.1 + t * 0.3) * 0.10 +
        Math.sin((fx + fz) * 4.3 + t * 0.25) * 0.08;

      // Per-quadrant height driven by audio/sensor
      let quadHeight = 0;
      if (bins) {
        const N_bins = bins.length;
        if (isBio) {
          // Biophony: high freq (2kHz-11kHz) → upper 30-90% of bins
          const start = Math.floor(N_bins * 0.3);
          const end   = Math.floor(N_bins * 0.9);
          const slice = end - start;
          const k = (ix % Math.max(1, slice)) / Math.max(1, slice - 1);
          const idx = Math.min(end - 1, start + Math.floor(k * (slice - 1)));
          quadHeight = (bins[idx] / 255) * 1.4;
        } else if (isGeo) {
          // Geophony: low freq (20Hz-2kHz) → bottom 0-30%
          const end = Math.floor(N_bins * 0.3);
          const k = (iz % Math.max(1, end)) / Math.max(1, end - 1);
          const idx = Math.min(end - 1, Math.floor(k * (end - 1)));
          quadHeight = (bins[idx] / 255) * 0.9;
        } else if (isAnthr) {
          // Anthrophony: mid freq (60Hz-4kHz) → 5-60% of bins
          const start = Math.floor(N_bins * 0.05);
          const end   = Math.floor(N_bins * 0.6);
          const slice = end - start;
          const k = (ix % Math.max(1, slice)) / Math.max(1, slice - 1);
          const idx = Math.min(end - 1, start + Math.floor(k * (slice - 1)));
          quadHeight = (bins[idx] / 255) * 1.1;
        } else {
          // Sensor quadrant: driven by temperature
          quadHeight = tempNorm * 0.8 + Math.sin(t * 0.8 + qdist * 3) * 0.15;
        }
      } else {
        // No mic: organic idle animation per quadrant
        if (isBio) {
          quadHeight = 0.35 + Math.sin(t * 0.9 + fx * 8 + fz * 6) * 0.28 + micBands.high * 0.4;
        } else if (isGeo) {
          quadHeight = 0.2 + Math.sin(t * 0.5 + fx * 4 + fz * 3) * 0.18 + micBands.low * 0.3;
        } else if (isAnthr) {
          quadHeight = 0.25 + Math.sin(t * 1.1 + fx * 5 + fz * 7) * 0.22 + micBands.mid * 0.35;
        } else {
          quadHeight = tempNorm * 0.6 + Math.sin(t * 0.7 + qdist * 4) * 0.12;
        }
      }

      // Humidity modulates overall terrain density/height
      const humMod = 0.7 + humNorm * 0.6;
      const height = (baseWave + quadHeight * humMod) * 0.9;

      // Write Y position (index 1 in XYZ)
      pos.setY(i, height);

      // Color: blend between base, biophony, anthro, barragán based on height + quadrant
      let r = 0, g = 0, b = 0;
      if (isBio || isGeo) {
        // Green bioluminescent
        const blend = Math.min(1, height * 0.8 + 0.1);
        r = C_BASE.r + (C_BIOPHONY.r - C_BASE.r) * blend + (C_BIOPHONY_HI.r - C_BIOPHONY.r) * Math.max(0, blend - 0.6) * 2;
        g = C_BASE.g + (C_BIOPHONY.g - C_BASE.g) * blend + (C_BIOPHONY_HI.g - C_BIOPHONY.g) * Math.max(0, blend - 0.6) * 2;
        b = C_BASE.b + (C_BIOPHONY.b - C_BASE.b) * blend + (C_BIOPHONY_HI.b - C_BIOPHONY.b) * Math.max(0, blend - 0.6) * 2;
      } else if (isAnthr) {
        // Steel blue — urban, rigid
        const blend = Math.min(1, height * 0.7 + 0.15);
        r = C_BASE.r + (C_ANTHRO.r - C_BASE.r) * blend + (C_ANTHRO_HI.r - C_ANTHRO.r) * Math.max(0, blend - 0.5) * 2;
        g = C_BASE.g + (C_ANTHRO.g - C_BASE.g) * blend + (C_ANTHRO_HI.g - C_ANTHRO.g) * Math.max(0, blend - 0.5) * 2;
        b = C_BASE.b + (C_ANTHRO.b - C_BASE.b) * blend + (C_ANTHRO_HI.b - C_ANTHRO.b) * Math.max(0, blend - 0.5) * 2;
      } else {
        // Sensor: Barragán orange when temp rises
        const blend = Math.min(1, tempNorm * 1.2);
        r = C_BASE.r + (C_BARRAGÁN.r - C_BASE.r) * blend;
        g = C_BASE.g + (C_BARRAGÁN.g - C_BASE.g) * blend;
        b = C_BASE.b + (C_BARRAGÁN.b - C_BASE.b) * blend;
      }

      col.setXYZ(i, r, g, b);
    }

    pos.needsUpdate = true;
    col.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return (
    <mesh ref={meshRef} geometry={geometry} receiveShadow>
      <meshStandardMaterial
        vertexColors
        roughness={0.85}
        metalness={0.05}
        side={THREE.DoubleSide}
        transparent
        opacity={0.92}
      />
    </mesh>
  );
}

// ─── Wireframe overlay ────────────────────────────────────────────────────────

function TerrainWireframe({ micAnalyser, temperature, humidity, micLevel, micBands, sensorOnline }: TerrainProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const binsRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const timeRef = useRef(0);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, GRID - 1, GRID - 1);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    timeRef.current += delta;
    const t = timeRef.current;

    const pos = geometry.attributes.position as THREE.BufferAttribute;

    let bins: Uint8Array<ArrayBuffer> | null = null;
    if (micAnalyser) {
      if (!binsRef.current || binsRef.current.length !== micAnalyser.frequencyBinCount) {
        binsRef.current = new Uint8Array(new ArrayBuffer(micAnalyser.frequencyBinCount));
      }
      micAnalyser.getByteFrequencyData(binsRef.current);
      bins = binsRef.current;
    }

    const temp = temperature ?? 22;
    const hum = humidity ?? 60;
    const tempNorm = Math.max(0, Math.min(1, (temp - 18) / 16));
    const humNorm  = Math.max(0, Math.min(1, (hum - 30) / 50));

    const N = GRID * GRID;
    for (let i = 0; i < N; i++) {
      const ix = i % GRID;
      const iz = Math.floor(i / GRID);
      const fx = ix / (GRID - 1);
      const fz = iz / (GRID - 1);

      const isBio   = fx < 0.5 && fz < 0.5;
      const isGeo   = fx >= 0.5 && fz < 0.5;
      const isAnthr = fx < 0.5 && fz >= 0.5;
      const qcx = isBio || isAnthr ? 0.25 : 0.75;
      const qcz = isBio || isGeo   ? 0.25 : 0.75;
      const qdist = Math.sqrt((fx - qcx) ** 2 + (fz - qcz) ** 2);

      const baseWave =
        Math.sin(fx * 6.2 + t * 0.4) * 0.12 +
        Math.sin(fz * 5.1 + t * 0.3) * 0.10 +
        Math.sin((fx + fz) * 4.3 + t * 0.25) * 0.08;

      let quadHeight = 0;
      if (bins) {
        const N_bins = bins.length;
        if (isBio) {
          const start = Math.floor(N_bins * 0.3);
          const end   = Math.floor(N_bins * 0.9);
          const slice = end - start;
          const k = (ix % Math.max(1, slice)) / Math.max(1, slice - 1);
          const idx = Math.min(end - 1, start + Math.floor(k * (slice - 1)));
          quadHeight = (bins[idx] / 255) * 1.4;
        } else if (isGeo) {
          const end = Math.floor(N_bins * 0.3);
          const k = (iz % Math.max(1, end)) / Math.max(1, end - 1);
          const idx = Math.min(end - 1, Math.floor(k * (end - 1)));
          quadHeight = (bins[idx] / 255) * 0.9;
        } else if (isAnthr) {
          const start = Math.floor(N_bins * 0.05);
          const end   = Math.floor(N_bins * 0.6);
          const slice = end - start;
          const k = (ix % Math.max(1, slice)) / Math.max(1, slice - 1);
          const idx = Math.min(end - 1, start + Math.floor(k * (slice - 1)));
          quadHeight = (bins[idx] / 255) * 1.1;
        } else {
          quadHeight = tempNorm * 0.8 + Math.sin(t * 0.8 + qdist * 3) * 0.15;
        }
      } else {
        if (isBio) {
          quadHeight = 0.35 + Math.sin(t * 0.9 + fx * 8 + fz * 6) * 0.28 + micBands.high * 0.4;
        } else if (isGeo) {
          quadHeight = 0.2 + Math.sin(t * 0.5 + fx * 4 + fz * 3) * 0.18 + micBands.low * 0.3;
        } else if (isAnthr) {
          quadHeight = 0.25 + Math.sin(t * 1.1 + fx * 5 + fz * 7) * 0.22 + micBands.mid * 0.35;
        } else {
          quadHeight = tempNorm * 0.6 + Math.sin(t * 0.7 + qdist * 4) * 0.12;
        }
      }

      const humMod = 0.7 + humNorm * 0.6;
      const height = (baseWave + quadHeight * humMod) * 0.9;
      pos.setY(i, height);
    }

    pos.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshBasicMaterial
        color="#00dc9a"
        wireframe
        transparent
        opacity={0.06}
      />
    </mesh>
  );
}

// ─── Floating Particles ───────────────────────────────────────────────────────

function Particles({ micLevel, humidity }: { micLevel: number; humidity: number | null }) {
  const pointsRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);

  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * TERRAIN_SIZE;
      positions[i * 3 + 1] = Math.random() * 2.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * TERRAIN_SIZE;
      velocities[i * 3]     = (Math.random() - 0.5) * 0.002;
      velocities[i * 3 + 1] = 0.001 + Math.random() * 0.003;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
    }
    return { positions, velocities };
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    timeRef.current += delta;

    const pos = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const humNorm = Math.max(0, Math.min(1, ((humidity ?? 60) - 30) / 50));
    // Humidity controls particle speed and density
    const speedMult = 0.5 + humNorm * 1.5 + micLevel * 2;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      x += velocities[i * 3]     * speedMult;
      y += velocities[i * 3 + 1] * speedMult;
      z += velocities[i * 3 + 2] * speedMult;

      // Wrap particles
      if (y > 3.5) { y = 0; x = (Math.random() - 0.5) * TERRAIN_SIZE; z = (Math.random() - 0.5) * TERRAIN_SIZE; }
      if (x >  TERRAIN_SIZE / 2) x = -TERRAIN_SIZE / 2;
      if (x < -TERRAIN_SIZE / 2) x =  TERRAIN_SIZE / 2;
      if (z >  TERRAIN_SIZE / 2) z = -TERRAIN_SIZE / 2;
      if (z < -TERRAIN_SIZE / 2) z =  TERRAIN_SIZE / 2;

      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;

    // Scale particle size with mic level
    const mat = pointsRef.current.material as THREE.PointsMaterial;
    mat.size = 0.018 + micLevel * 0.04 + humNorm * 0.015;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#4a9e72"
        size={0.022}
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// ─── Barragán Wall ────────────────────────────────────────────────────────────
// The orange vertical plane that appears when temperature rises

function BarragánWall({ temperature }: { temperature: number | null }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  const tempNorm = Math.max(0, Math.min(1, ((temperature ?? 22) - 22) / 12));

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    timeRef.current += delta;
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    // Opacity rises with temperature
    mat.opacity = tempNorm * 0.35 + Math.sin(timeRef.current * 0.5) * 0.03;
  });

  return (
    <mesh ref={meshRef} position={[0, 1.2, -TERRAIN_SIZE / 2 + 0.5]} rotation={[0, 0, 0]}>
      <planeGeometry args={[TERRAIN_SIZE, 3.5]} />
      <meshBasicMaterial
        color="#c45c2a"
        transparent
        opacity={tempNorm * 0.35}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Camera ───────────────────────────────────────────────────────────────────

function Camera() {
  const { camera } = useThree();
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta * 0.06;
    const t = timeRef.current;
    // Slow cinematic orbit — cenital with slight tilt
    const radius = 11;
    const angle = t;
    const x = Math.sin(angle) * radius * 0.3;
    const z = Math.cos(angle) * radius * 0.3 + 6;
    const y = 7.5 + Math.sin(t * 0.4) * 0.4;

    camera.position.x += (x - camera.position.x) * 0.02;
    camera.position.y += (y - camera.position.y) * 0.02;
    camera.position.z += (z - camera.position.z) * 0.02;
    camera.lookAt(0, 0.3, 0);
  });

  return null;
}

// ─── Quadrant Labels (2D overlay, not Three.js) ───────────────────────────────

export function QuadrantOverlay() {
  const labels = [
    { label: 'BIOFONIA', sub: '2–11 kHz · vida', color: '#6ee7b7', pos: 'top-[38%] left-[18%]' },
    { label: 'GEOFONIA', sub: '20 Hz–2 kHz · tierra', color: '#7dd3fc', pos: 'top-[38%] right-[18%]' },
    { label: 'ANTROFONIA', sub: '60 Hz–4 kHz · ciudad', color: '#4a7a8a', pos: 'bottom-[38%] left-[18%]' },
    { label: 'SENSOR', sub: 'temp · humedad · nodo', color: '#c45c2a', pos: 'bottom-[38%] right-[18%]' },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {labels.map((l) => (
        <div
          key={l.label}
          style={{
            position: 'absolute',
            ...(l.pos.includes('top') ? { top: '38%' } : { bottom: '38%' }),
            ...(l.pos.includes('left') ? { left: '18%' } : { right: '18%' }),
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{
            fontFamily: 'var(--font-mono), monospace',
            fontWeight: 300,
            fontSize: 9,
            letterSpacing: '0.32em',
            color: l.color,
            opacity: 0.55,
            textTransform: 'uppercase',
            marginBottom: 2,
          }}>
            {l.label}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono), monospace',
            fontWeight: 300,
            fontSize: 8,
            letterSpacing: '0.18em',
            color: l.color,
            opacity: 0.3,
            textTransform: 'uppercase',
          }}>
            {l.sub}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function AcousticTerrain(props: TerrainProps) {
  return (
    <Canvas
      dpr={[1, 1.8]}
      camera={{ position: [0, 8, 8], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.3} color="#001a0d" />
        <directionalLight position={[4, 8, 4]} intensity={0.8} color="#a8e6c0" />
        <directionalLight position={[-6, 4, -4]} intensity={0.4} color="#4a7a8a" />
        <pointLight position={[0, 5, 0]} intensity={0.6} color="#00dc9a" distance={18} />
        <fog attach="fog" args={['#000508', 10, 22]} />

        <TerrainMesh {...props} />
        <TerrainWireframe {...props} />
        <Particles micLevel={props.micLevel} humidity={props.humidity} />
        <BarragánWall temperature={props.temperature} />
        <Camera />
      </Suspense>
    </Canvas>
  );
}
