'use client';

import { useEffect, useMemo, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export type TerrainProps = {
  micAnalyser: AnalyserNode | null;
  temperature: number | null;
  humidity: number | null;
  micLevel: number;
  micBands: { low: number; mid: number; high: number };
  sensorOnline: boolean;
};

const GRID = 64;
const TERRAIN_SIZE = 16;
const PARTICLE_COUNT = 8000;
const TREE_COUNT = 60;
const BUILDING_COUNT = 24;
const ROCK_COUNT = 18;

// ── Paleta — colores directos, sin depender de luz ──────────────────────────
const C_BIO_LO  = new THREE.Color('#0d3d20');   // suelo oscuro
const C_BIO_MID = new THREE.Color('#1e7a42');   // bosque medio
const C_BIO_HI  = new THREE.Color('#5ce89a');   // cima bioluminiscente
const C_GEO     = new THREE.Color('#0a2240');   // agua profunda
const C_GEO_HI  = new THREE.Color('#2ab8f0');   // cresta azul cielo
const C_ANTHR   = new THREE.Color('#080e18');   // asfalto
const C_ANTHR_HI= new THREE.Color('#2a7080');   // urbano iluminado
const C_HEAT_LO = new THREE.Color('#1c0a04');   // tierra quemada
const C_HEAT_MID= new THREE.Color('#c45c2a');   // naranja Barragán
const C_HEAT_HI = new THREE.Color('#ff8040');   // calor extremo
const C_WATER   = new THREE.Color('#061c2e');   // agua en valles

// ── Terrain ──────────────────────────────────────────────────────────────────
function TerrainMesh({ micAnalyser, temperature, humidity, micLevel, micBands }: TerrainProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const binsRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const t0 = useRef(0);

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, GRID - 1, GRID - 1);
    g.rotateX(-Math.PI / 2);
    const colors = new Float32Array(GRID * GRID * 3);
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);

  useFrame((_, dt) => {
    if (!meshRef.current) return;
    t0.current += dt;
    const t = t0.current;

    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const col = geometry.attributes.color as THREE.BufferAttribute;

    let bins: Uint8Array<ArrayBuffer> | null = null;
    if (micAnalyser) {
      if (!binsRef.current || binsRef.current.length !== micAnalyser.frequencyBinCount) {
        binsRef.current = new Uint8Array(new ArrayBuffer(micAnalyser.frequencyBinCount));
      }
      micAnalyser.getByteFrequencyData(binsRef.current);
      bins = binsRef.current;
    }

    const temp   = temperature ?? 22;
    const hum    = humidity ?? 60;
    const tNorm  = Math.max(0, Math.min(1, (temp - 18) / 16));
    const hNorm  = Math.max(0, Math.min(1, (hum - 30) / 50));

    const N = GRID * GRID;
    for (let i = 0; i < N; i++) {
      const ix = i % GRID;
      const iz = Math.floor(i / GRID);
      const fx = ix / (GRID - 1);
      const fz = iz / (GRID - 1);

      // Quadrant
      const isBio   = fx < 0.5 && fz < 0.5;
      const isGeo   = fx >= 0.5 && fz < 0.5;
      const isAnthr = fx < 0.5 && fz >= 0.5;
      const isSens  = fx >= 0.5 && fz >= 0.5;

      // Local coords within quadrant (0..1)
      const lx = isBio || isAnthr ? fx * 2 : (fx - 0.5) * 2;
      const lz = isBio || isGeo   ? fz * 2 : (fz - 0.5) * 2;

      // Base organic wave — more dramatic
      const wave =
        Math.sin(fx * 9.1 + t * 0.5) * 0.16 +
        Math.sin(fz * 7.3 + t * 0.38) * 0.14 +
        Math.sin((fx + fz) * 5.7 + t * 0.28) * 0.11 +
        Math.sin(fx * 14 + fz * 11 + t * 0.7) * 0.07;

      let qH = 0;
      if (bins) {
        const NB = bins.length;
        if (isBio) {
          const s = Math.floor(NB * 0.28), e = Math.floor(NB * 0.92);
          const sl = e - s;
          const k = (ix % Math.max(1, sl)) / Math.max(1, sl - 1);
          qH = (bins[Math.min(e - 1, s + Math.floor(k * (sl - 1)))] / 255) * 1.8;
        } else if (isGeo) {
          const e = Math.floor(NB * 0.28);
          const k = (iz % Math.max(1, e)) / Math.max(1, e - 1);
          qH = (bins[Math.min(e - 1, Math.floor(k * (e - 1)))] / 255) * 1.1;
        } else if (isAnthr) {
          const s = Math.floor(NB * 0.04), e = Math.floor(NB * 0.55);
          const sl = e - s;
          const k = (ix % Math.max(1, sl)) / Math.max(1, sl - 1);
          qH = (bins[Math.min(e - 1, s + Math.floor(k * (sl - 1)))] / 255) * 1.3;
        } else {
          // Sensor: heat dome driven by temperature
          const cx = 0.5, cz = 0.5;
          const d = Math.sqrt((lx - cx) ** 2 + (lz - cz) ** 2);
          qH = tNorm * Math.exp(-d * 2.5) * 1.6 + Math.sin(t * 1.2 + d * 6) * 0.08;
        }
      } else {
        if (isBio) {
          qH = 0.4 + Math.sin(t * 1.1 + lx * 9 + lz * 7) * 0.35 + micBands.high * 0.5;
        } else if (isGeo) {
          qH = 0.22 + Math.sin(t * 0.55 + lx * 5 + lz * 4) * 0.2 + micBands.low * 0.35;
        } else if (isAnthr) {
          qH = 0.28 + Math.sin(t * 1.3 + lx * 6 + lz * 8) * 0.25 + micBands.mid * 0.4;
        } else {
          const cx = 0.5, cz = 0.5;
          const d = Math.sqrt((lx - cx) ** 2 + (lz - cz) ** 2);
          qH = tNorm * Math.exp(-d * 2.5) * 1.4 + Math.sin(t * 0.9 + d * 5) * 0.1;
        }
      }

      const hMod = 0.65 + hNorm * 0.7;
      const height = (wave + qH * hMod) * 1.25;  // More dramatic peaks
      pos.setY(i, height);

      // Color — mapped directly, no lighting dependency
      let r = 0, g = 0, b = 0;
      // Amplify height for color mapping so peaks are clearly bright
      const h01 = Math.max(0, Math.min(1, (height + 0.1) * 0.65));

      if (isBio) {
        if (h01 < 0.12) {
          r = C_WATER.r; g = C_WATER.g; b = C_WATER.b;
        } else if (h01 < 0.42) {
          const f = (h01 - 0.12) / 0.30;
          r = C_BIO_LO.r + (C_BIO_MID.r - C_BIO_LO.r) * f;
          g = C_BIO_LO.g + (C_BIO_MID.g - C_BIO_LO.g) * f;
          b = C_BIO_LO.b + (C_BIO_MID.b - C_BIO_LO.b) * f;
        } else {
          const f = Math.min(1, (h01 - 0.42) / 0.58);
          r = C_BIO_MID.r + (C_BIO_HI.r - C_BIO_MID.r) * f;
          g = C_BIO_MID.g + (C_BIO_HI.g - C_BIO_MID.g) * f;
          b = C_BIO_MID.b + (C_BIO_HI.b - C_BIO_MID.b) * f;
        }
      } else if (isGeo) {
        const f = Math.min(1, h01 * 1.6);
        r = C_GEO.r + (C_GEO_HI.r - C_GEO.r) * f;
        g = C_GEO.g + (C_GEO_HI.g - C_GEO.g) * f;
        b = C_GEO.b + (C_GEO_HI.b - C_GEO.b) * f;
      } else if (isAnthr) {
        const f = Math.min(1, h01 * 1.5);
        r = C_ANTHR.r + (C_ANTHR_HI.r - C_ANTHR.r) * f;
        g = C_ANTHR.g + (C_ANTHR_HI.g - C_ANTHR.g) * f;
        b = C_ANTHR.b + (C_ANTHR_HI.b - C_ANTHR.b) * f;
      } else {
        // Heat zone
        if (h01 < 0.18) {
          r = C_HEAT_LO.r; g = C_HEAT_LO.g; b = C_HEAT_LO.b;
        } else if (h01 < 0.55) {
          const f = (h01 - 0.18) / 0.37;
          r = C_HEAT_LO.r + (C_HEAT_MID.r - C_HEAT_LO.r) * f;
          g = C_HEAT_LO.g + (C_HEAT_MID.g - C_HEAT_LO.g) * f;
          b = C_HEAT_LO.b + (C_HEAT_MID.b - C_HEAT_LO.b) * f;
        } else {
          const f = Math.min(1, (h01 - 0.55) / 0.45);
          r = C_HEAT_MID.r + (C_HEAT_HI.r - C_HEAT_MID.r) * f;
          g = C_HEAT_MID.g + (C_HEAT_HI.g - C_HEAT_MID.g) * f;
          b = C_HEAT_MID.b + (C_HEAT_HI.b - C_HEAT_MID.b) * f;
        }
      }

      col.setXYZ(i, r, g, b);
    }

    pos.needsUpdate = true;
    col.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return (
    <mesh ref={meshRef} geometry={geometry} receiveShadow castShadow>
      <meshBasicMaterial
        vertexColors
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ── Wireframe grid overlay ────────────────────────────────────────────────────
function TerrainGrid() {
  return (
    <gridHelper
      args={[TERRAIN_SIZE, 32, '#00dc9a', '#003322']}
      position={[0, 0.01, 0]}
    />
  );
}

// ── Urban Trees (biophony quadrant) ──────────────────────────────────────────
type TreeDef = { x: number; z: number; scale: number; phase: number };

function UrbanTrees({ micBands, micLevel }: { micBands: TerrainProps['micBands']; micLevel: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const t0 = useRef(0);

  const trees = useMemo<TreeDef[]>(() => {
    const rng = (s: number) => {
      let x = Math.sin(s * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    };
    const arr: TreeDef[] = [];
    for (let i = 0; i < TREE_COUNT; i++) {
      // Place in biophony quadrant (NW: x<0, z<0) and geophony (NE: x>0, z<0)
      const side = i < TREE_COUNT * 0.7 ? -1 : 1; // mostly biophony
      arr.push({
        x: (rng(i * 3.1) * 0.9 - 0.05) * (TERRAIN_SIZE / 2) * side,
        z: -(rng(i * 7.3) * 0.9 + 0.05) * (TERRAIN_SIZE / 2),
        scale: 0.18 + rng(i * 2.7) * 0.28,
        phase: rng(i * 5.1) * Math.PI * 2,
      });
    }
    return arr;
  }, []);

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    t0.current += dt;
    const t = t0.current;
    const sway = micBands.high * 0.15 + micLevel * 0.08;

    groupRef.current.children.forEach((child, i) => {
      const tree = trees[i];
      if (!tree) return;
      // Sway canopy with biophony
      const canopy = child.children[1] as THREE.Mesh | undefined;
      if (canopy) {
        canopy.rotation.x = Math.sin(t * 1.2 + tree.phase) * sway;
        canopy.rotation.z = Math.cos(t * 0.9 + tree.phase) * sway * 0.7;
        // Glow intensity with biophony
        const mat = canopy.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.08 + micBands.high * 0.25 + micLevel * 0.12;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {trees.map((tree, i) => (
        <group key={i} position={[tree.x, 0, tree.z]}>
          {/* Trunk */}
          <mesh position={[0, tree.scale * 0.6, 0]} castShadow>
            <cylinderGeometry args={[tree.scale * 0.06, tree.scale * 0.09, tree.scale * 1.2, 6]} />
            <meshStandardMaterial color="#2a1a0a" roughness={0.95} />
          </mesh>
          {/* Canopy */}
          <mesh position={[0, tree.scale * 1.5, 0]} castShadow>
            <sphereGeometry args={[tree.scale * 0.55, 7, 6]} />
            <meshStandardMaterial
              color="#0d3a1e"
              emissive="#1a5c32"
              emissiveIntensity={0.08}
              roughness={0.9}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── Heat dome (sensor quadrant) ───────────────────────────────────────────────
function HeatDome({ temperature }: { temperature: number | null }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const t0 = useRef(0);
  const tNorm = Math.max(0, Math.min(1, ((temperature ?? 22) - 18) / 16));

  useFrame((_, dt) => {
    if (!meshRef.current) return;
    t0.current += dt;
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = tNorm * 0.22 + Math.sin(t0.current * 0.8) * 0.04;
    meshRef.current.scale.setScalar(1 + Math.sin(t0.current * 0.5) * 0.04);
  });

  return (
    <mesh
      ref={meshRef}
      position={[TERRAIN_SIZE * 0.25, 0.8, TERRAIN_SIZE * 0.25]}
    >
      <sphereGeometry args={[2.8, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshBasicMaterial
        color="#c45c2a"
        transparent
        opacity={tNorm * 0.2}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ── Floating particles (humidity-driven) ─────────────────────────────────────
function Particles({ micLevel, humidity }: { micLevel: number; humidity: number | null }) {
  const pointsRef = useRef<THREE.Points>(null);
  const t0 = useRef(0);

  const { positions, velocities } = useMemo(() => {
    const positions  = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * TERRAIN_SIZE;
      positions[i * 3 + 1] = Math.random() * 3.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * TERRAIN_SIZE;
      velocities[i * 3]     = (Math.random() - 0.5) * 0.003;
      velocities[i * 3 + 1] = 0.0015 + Math.random() * 0.004;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.003;
    }
    return { positions, velocities };
  }, []);

  useFrame((_, dt) => {
    if (!pointsRef.current) return;
    t0.current += dt;
    const hNorm = Math.max(0, Math.min(1, ((humidity ?? 60) - 30) / 50));
    const speed = 0.6 + hNorm * 1.8 + micLevel * 2.5;
    const pos = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      let x = pos.getX(i) + velocities[i * 3]     * speed;
      let y = pos.getY(i) + velocities[i * 3 + 1] * speed;
      let z = pos.getZ(i) + velocities[i * 3 + 2] * speed;
      if (y > 4)              { y = 0; x = (Math.random() - 0.5) * TERRAIN_SIZE; z = (Math.random() - 0.5) * TERRAIN_SIZE; }
      if (x >  TERRAIN_SIZE / 2) x = -TERRAIN_SIZE / 2;
      if (x < -TERRAIN_SIZE / 2) x =  TERRAIN_SIZE / 2;
      if (z >  TERRAIN_SIZE / 2) z = -TERRAIN_SIZE / 2;
      if (z < -TERRAIN_SIZE / 2) z =  TERRAIN_SIZE / 2;
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;

    const mat = pointsRef.current.material as THREE.PointsMaterial;
    mat.size = 0.022 + micLevel * 0.05 + hNorm * 0.018;
    mat.opacity = 0.45 + hNorm * 0.35;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#6ee7b7"
        size={0.025}
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// ── Barragán wall ─────────────────────────────────────────────────────────────
function BarraganWall({ temperature }: { temperature: number | null }) {
  const ref = useRef<THREE.Mesh>(null);
  const t0  = useRef(0);
  const tN  = Math.max(0, Math.min(1, ((temperature ?? 22) - 22) / 12));

  useFrame((_, dt) => {
    if (!ref.current) return;
    t0.current += dt;
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = tN * 0.45 + Math.sin(t0.current * 0.4) * 0.04;
  });

  return (
    <mesh ref={ref} position={[0, 1.5, -TERRAIN_SIZE / 2 + 0.3]}>
      <planeGeometry args={[TERRAIN_SIZE, 4]} />
      <meshBasicMaterial color="#c45c2a" transparent opacity={tN * 0.4} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

// ── Urban Buildings (anthrophony quadrant) ───────────────────────────────────
type BuildingDef = { x: number; z: number; w: number; d: number; h: number };

function UrbanBuildings({ micBands }: { micBands: TerrainProps['micBands'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const t0 = useRef(0);

  const buildings = useMemo<BuildingDef[]>(() => {
    const rng = (s: number) => {
      let x = Math.sin(s * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    };
    const arr: BuildingDef[] = [];
    for (let i = 0; i < BUILDING_COUNT; i++) {
      arr.push({
        x: -(rng(i * 2.3) * 0.85 + 0.05) * (TERRAIN_SIZE / 2),
        z: (rng(i * 5.7) * 0.85 + 0.05) * (TERRAIN_SIZE / 2),
        w: 0.15 + rng(i * 3.1) * 0.25,
        d: 0.15 + rng(i * 4.3) * 0.25,
        h: 0.3 + rng(i * 6.7) * 0.9,
      });
    }
    return arr;
  }, []);

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    t0.current += dt;
    const glow = 0.05 + micBands.mid * 0.15;
    groupRef.current.children.forEach((child) => {
      const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = glow;
    });
  });

  return (
    <group ref={groupRef}>
      {buildings.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]} castShadow>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial
            color="#0a1520"
            emissive="#1a3a44"
            emissiveIntensity={0.08}
            roughness={0.85}
            metalness={0.15}
          />
        </mesh>
      ))}
    </group>
  );
}

// ── Rocks (geophony quadrant) ─────────────────────────────────────────────────
type RockDef = { x: number; z: number; scale: number };

function Rocks() {
  const rocks = useMemo<RockDef[]>(() => {
    const rng = (s: number) => {
      let x = Math.sin(s * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    };
    const arr: RockDef[] = [];
    for (let i = 0; i < ROCK_COUNT; i++) {
      arr.push({
        x: (rng(i * 3.7) * 0.8 + 0.1) * (TERRAIN_SIZE / 2),
        z: -(rng(i * 5.3) * 0.8 + 0.1) * (TERRAIN_SIZE / 2),
        scale: 0.12 + rng(i * 2.9) * 0.22,
      });
    }
    return arr;
  }, []);

  return (
    <group>
      {rocks.map((r, i) => (
        <mesh key={i} position={[r.x, r.scale * 0.4, r.z]} castShadow>
          <dodecahedronGeometry args={[r.scale, 0]} />
          <meshStandardMaterial color="#1a2a3a" roughness={0.95} metalness={0.05} />
        </mesh>
      ))}
    </group>
  );
}

// ── Quadrant dividers ─────────────────────────────────────────────────────────
function QuadrantDividers() {
  return (
    <group>
      {/* N-S line */}
      <mesh position={[0, 0.05, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.015, 0.04, TERRAIN_SIZE]} />
        <meshBasicMaterial color="#00dc9a" transparent opacity={0.25} />
      </mesh>
      {/* E-W line */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[TERRAIN_SIZE, 0.04, 0.015]} />
        <meshBasicMaterial color="#00dc9a" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

// ── Camera ────────────────────────────────────────────────────────────────────
function Camera() {
  const { camera } = useThree();
  const t0 = useRef(0);

  useFrame((_, dt) => {
    t0.current += dt * 0.05;
    const t = t0.current;
    const r = 13;
    const tx = Math.sin(t) * r * 0.25;
    const tz = Math.cos(t) * r * 0.25 + 7;
    const ty = 8.5 + Math.sin(t * 0.35) * 0.6;
    camera.position.x += (tx - camera.position.x) * 0.018;
    camera.position.y += (ty - camera.position.y) * 0.018;
    camera.position.z += (tz - camera.position.z) * 0.018;
    camera.lookAt(0, 0.5, 0);
  });
  return null;
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function AcousticTerrain(props: TerrainProps) {
  const { temperature, humidity, micLevel, micBands } = props;
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 9, 9], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
      shadows
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    >
      <Suspense fallback={null}>
        {/* Lighting — only affects trees and 3D objects, not terrain (meshBasicMaterial) */}
        <ambientLight intensity={0.55} color="#a8e6c0" />
        <directionalLight position={[5, 8, 4]} intensity={0.9} color="#d0f0e0" castShadow shadow-mapSize={[512, 512]} />
        <directionalLight position={[-5, 4, -4]} intensity={0.4} color="#4a7a8a" />
        <pointLight position={[-4, 3, -4]} intensity={1.2} color="#3adc80" distance={12} />
        <pointLight position={[4, 2, 4]}  intensity={0.9} color="#c45c2a" distance={10} />
        <fog attach="fog" args={['#000508', 13, 26]} />

        <TerrainMesh {...props} />
        <TerrainGrid />
        <QuadrantDividers />
        <UrbanTrees micBands={micBands} micLevel={micLevel} />
        <UrbanBuildings micBands={micBands} />
        <Rocks />
        <HeatDome temperature={temperature} />
        <Particles micLevel={micLevel} humidity={humidity} />
        <BarraganWall temperature={temperature} />
        <Camera />
      </Suspense>
    </Canvas>
  );
}
