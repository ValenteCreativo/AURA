'use client';

import { useMemo, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ── Types ─────────────────────────────────────────────────────────────────────
export type TerrainProps = {
  micAnalyser: AnalyserNode | null;
  temperature: number | null;
  humidity: number | null;
  micLevel: number;
  micBands: { low: number; mid: number; high: number };
  sensorOnline: boolean;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const GRID = 72;
const SIZE = 18;
const TREE_COUNT = 90;
const BUILDING_COUNT = 40;
const PARTICLE_COUNT = 10000;

// ── Bright saturated palette ──────────────────────────────────────────────────
// Bio (forest greens)
const C_BIO_DARK   = new THREE.Color('#2d6e45');
const C_BIO_MID    = new THREE.Color('#4a9e6a');
const C_BIO_LIGHT  = new THREE.Color('#72d48e');
// Geo (deep blue-teal)
const C_GEO_DARK   = new THREE.Color('#1a3a5c');
const C_GEO_MID    = new THREE.Color('#2a6a8a');
const C_GEO_LIGHT  = new THREE.Color('#4ab8d8');
// Urban (dark slate)
const C_URB_DARK   = new THREE.Color('#1a2030');
const C_URB_MID    = new THREE.Color('#2a3545');
const C_URB_LIGHT  = new THREE.Color('#3a5060');
// Heat/sensor (warm orange-red)
const C_HEAT_DARK  = new THREE.Color('#3a1a08');
const C_HEAT_MID   = new THREE.Color('#c45c2a');
const C_HEAT_HOT   = new THREE.Color('#ff8040');

// ── Seeded pseudo-random ──────────────────────────────────────────────────────
function rng(s: number): number {
  const x = Math.sin(s * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ── Terrain ───────────────────────────────────────────────────────────────────
function Terrain({ micAnalyser, temperature, humidity, micBands }: TerrainProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const binsRef = useRef<Uint8Array | null>(null);
  const t0 = useRef(0);

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(SIZE, SIZE, GRID - 1, GRID - 1);
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

    // Refresh frequency bins
    if (micAnalyser) {
      if (!binsRef.current || binsRef.current.length !== micAnalyser.frequencyBinCount) {
        binsRef.current = new Uint8Array(micAnalyser.frequencyBinCount);
      }
      micAnalyser.getByteFrequencyData(binsRef.current);
    }
    const bins = binsRef.current;

    const temp  = temperature ?? 22;
    const hum   = humidity   ?? 60;
    const tNorm = Math.max(0, Math.min(1, (temp - 18) / 16));
    const hNorm = Math.max(0, Math.min(1, (hum  - 30) / 50));

    const N = GRID * GRID;
    for (let i = 0; i < N; i++) {
      const ix = i % GRID;
      const iz = Math.floor(i / GRID);
      const fx = ix / (GRID - 1);
      const fz = iz / (GRID - 1);

      // Quadrant flags
      const isBio   = fx <  0.5 && fz <  0.5;
      const isGeo   = fx >= 0.5 && fz <  0.5;
      const isUrban = fx <  0.5 && fz >= 0.5;
      const isHeat  = fx >= 0.5 && fz >= 0.5;

      // Local coords within each quadrant [0,1]
      const lx = isBio || isUrban ? fx * 2 : (fx - 0.5) * 2;
      const lz = isBio || isGeo   ? fz * 2 : (fz - 0.5) * 2;

      // Organic wave base
      const wave =
        Math.sin(fx * 7.5 + t * 0.4) * 0.12 +
        Math.sin(fz * 6.2 + t * 0.35) * 0.10 +
        Math.sin((fx + fz) * 4.8 + t * 0.25) * 0.08;

      let qH = 0;

      if (bins) {
        const NB = bins.length;
        if (isBio) {
          // High-freq driven organic hills 0.3–1.2
          const s = Math.floor(NB * 0.55);
          const e = NB;
          const span = e - s;
          const k = (ix % Math.max(1, span)) / Math.max(1, span - 1);
          const idx = Math.min(e - 1, s + Math.floor(k * (span - 1)));
          qH = 0.3 + (bins[idx] / 255) * 0.9;
        } else if (isGeo) {
          // Low-freq driven gentle rolling 0.1–0.6
          const e = Math.floor(NB * 0.25);
          const k = (iz % Math.max(1, e)) / Math.max(1, e - 1);
          const idx = Math.min(e - 1, Math.floor(k * (e - 1)));
          qH = 0.1 + (bins[idx] / 255) * 0.5;
        } else if (isUrban) {
          // Mid-freq driven flat 0.0–0.2
          const s = Math.floor(NB * 0.25);
          const e = Math.floor(NB * 0.65);
          const span = e - s;
          const k = (ix % Math.max(1, span)) / Math.max(1, span - 1);
          const idx = Math.min(e - 1, s + Math.floor(k * (span - 1)));
          qH = (bins[idx] / 255) * 0.2;
        } else {
          // Heat dome: center rises with temperature
          const cx = 0.5, cz = 0.5;
          const d = Math.sqrt((lx - cx) ** 2 + (lz - cz) ** 2);
          qH = tNorm * Math.exp(-d * 2.2) * 1.4;
        }
      } else {
        // Fallback: micBands driven
        if (isBio) {
          qH = 0.3 + Math.sin(t * 0.9 + lx * 7 + lz * 6) * 0.25 + micBands.high * 0.65;
        } else if (isGeo) {
          qH = 0.1 + Math.sin(t * 0.5 + lx * 4 + lz * 3) * 0.15 + micBands.low * 0.4;
        } else if (isUrban) {
          qH = Math.sin(t * 1.1 + lx * 5 + lz * 7) * 0.05 + micBands.mid * 0.15;
        } else {
          const cx = 0.5, cz = 0.5;
          const d = Math.sqrt((lx - cx) ** 2 + (lz - cz) ** 2);
          qH = tNorm * Math.exp(-d * 2.2) * 1.2;
        }
      }

      const hMod = 0.7 + hNorm * 0.6;
      const height = (wave + qH * hMod) * 0.9;
      pos.setY(i, height);

      // Color mapping: h01 maps height to gradient per quadrant
      const h01 = Math.max(0, Math.min(1, (height + 0.1) * 0.7));

      let r = 0, g = 0, b = 0;

      if (isBio) {
        if (h01 < 0.35) {
          const f = h01 / 0.35;
          r = C_BIO_DARK.r + (C_BIO_MID.r - C_BIO_DARK.r) * f;
          g = C_BIO_DARK.g + (C_BIO_MID.g - C_BIO_DARK.g) * f;
          b = C_BIO_DARK.b + (C_BIO_MID.b - C_BIO_DARK.b) * f;
        } else {
          const f = Math.min(1, (h01 - 0.35) / 0.65);
          r = C_BIO_MID.r + (C_BIO_LIGHT.r - C_BIO_MID.r) * f;
          g = C_BIO_MID.g + (C_BIO_LIGHT.g - C_BIO_MID.g) * f;
          b = C_BIO_MID.b + (C_BIO_LIGHT.b - C_BIO_MID.b) * f;
        }
      } else if (isGeo) {
        if (h01 < 0.4) {
          const f = h01 / 0.4;
          r = C_GEO_DARK.r + (C_GEO_MID.r - C_GEO_DARK.r) * f;
          g = C_GEO_DARK.g + (C_GEO_MID.g - C_GEO_DARK.g) * f;
          b = C_GEO_DARK.b + (C_GEO_MID.b - C_GEO_DARK.b) * f;
        } else {
          const f = Math.min(1, (h01 - 0.4) / 0.6);
          r = C_GEO_MID.r + (C_GEO_LIGHT.r - C_GEO_MID.r) * f;
          g = C_GEO_MID.g + (C_GEO_LIGHT.g - C_GEO_MID.g) * f;
          b = C_GEO_MID.b + (C_GEO_LIGHT.b - C_GEO_MID.b) * f;
        }
      } else if (isUrban) {
        if (h01 < 0.4) {
          const f = h01 / 0.4;
          r = C_URB_DARK.r + (C_URB_MID.r - C_URB_DARK.r) * f;
          g = C_URB_DARK.g + (C_URB_MID.g - C_URB_DARK.g) * f;
          b = C_URB_DARK.b + (C_URB_MID.b - C_URB_DARK.b) * f;
        } else {
          const f = Math.min(1, (h01 - 0.4) / 0.6);
          r = C_URB_MID.r + (C_URB_LIGHT.r - C_URB_MID.r) * f;
          g = C_URB_MID.g + (C_URB_LIGHT.g - C_URB_MID.g) * f;
          b = C_URB_MID.b + (C_URB_LIGHT.b - C_URB_MID.b) * f;
        }
      } else {
        // Heat
        if (h01 < 0.3) {
          const f = h01 / 0.3;
          r = C_HEAT_DARK.r + (C_HEAT_MID.r - C_HEAT_DARK.r) * f;
          g = C_HEAT_DARK.g + (C_HEAT_MID.g - C_HEAT_DARK.g) * f;
          b = C_HEAT_DARK.b + (C_HEAT_MID.b - C_HEAT_DARK.b) * f;
        } else {
          const f = Math.min(1, (h01 - 0.3) / 0.7);
          r = C_HEAT_MID.r + (C_HEAT_HOT.r - C_HEAT_MID.r) * f;
          g = C_HEAT_MID.g + (C_HEAT_HOT.g - C_HEAT_MID.g) * f;
          b = C_HEAT_MID.b + (C_HEAT_HOT.b - C_HEAT_MID.b) * f;
        }
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
        roughness={0.75}
        metalness={0.04}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ── Water plane ───────────────────────────────────────────────────────────────
function WaterPlane() {
  return (
    <mesh position={[-SIZE / 4, -0.05, -SIZE / 4]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[SIZE / 2 * 0.6, SIZE / 2 * 0.6]} />
      <meshStandardMaterial
        color="#0a2a3a"
        metalness={0.8}
        roughness={0.1}
        transparent
        opacity={0.7}
      />
    </mesh>
  );
}

// ── Trees ─────────────────────────────────────────────────────────────────────
type TreeDef = {
  x: number;
  z: number;
  h: number;
  r: number;
  isCone: boolean; // true = pine, false = deciduous sphere
};

function Trees({ micBands }: { micBands: TerrainProps['micBands'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const t0 = useRef(0);

  const trees = useMemo<TreeDef[]>(() => {
    const arr: TreeDef[] = [];
    for (let i = 0; i < TREE_COUNT; i++) {
      // Bio quadrant: fx < 0.5, fz < 0.5 → x in [-SIZE/2, 0], z in [-SIZE/2, 0]
      const rawX = rng(i * 3.1) * 0.9 + 0.05; // [0.05, 0.95]
      const rawZ = rng(i * 7.3) * 0.9 + 0.05;
      arr.push({
        x: -(rawX * SIZE * 0.5),
        z: -(rawZ * SIZE * 0.5),
        h: 0.45 + rng(i * 5.7) * 0.75,
        r: 0.09 + rng(i * 2.9) * 0.13,
        isCone: rng(i * 11.3) > 0.45, // ~55% pines, 45% deciduous
      });
    }
    return arr;
  }, []);

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    t0.current += dt;
    const sway = micBands.high * 0.14;
    groupRef.current.children.forEach((child, i) => {
      if (!trees[i]) return;
      // canopy is second child (index 1)
      const canopy = child.children[1] as THREE.Mesh | undefined;
      if (canopy) {
        canopy.rotation.x = Math.sin(t0.current * 1.1 + i * 0.53) * sway;
        canopy.rotation.z = Math.cos(t0.current * 0.85 + i * 0.71) * sway * 0.65;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {trees.map((tree, i) => (
        <group key={i} position={[tree.x, 0, tree.z]}>
          {/* Trunk */}
          <mesh position={[0, tree.h * 0.35, 0]} castShadow>
            <cylinderGeometry args={[tree.r * 0.28, tree.r * 0.38, tree.h * 0.7, 6]} />
            <meshStandardMaterial color="#2a1a0e" roughness={0.95} />
          </mesh>
          {/* Canopy */}
          {tree.isCone ? (
            <mesh position={[0, tree.h * 0.88, 0]} castShadow>
              <coneGeometry args={[tree.r * 1.9, tree.h * 0.95, 8]} />
              <meshStandardMaterial
                color="#3a6e4a"
                emissive="#1a4a2a"
                emissiveIntensity={0.3}
                roughness={0.88}
              />
            </mesh>
          ) : (
            <mesh position={[0, tree.h * 0.92, 0]} castShadow>
              <sphereGeometry args={[tree.r * 1.6, 8, 6]} />
              <meshStandardMaterial
                color="#4a8e5a"
                emissive="#1a4a2a"
                emissiveIntensity={0.3}
                roughness={0.85}
              />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

// ── Buildings ─────────────────────────────────────────────────────────────────
type BuildingDef = { x: number; z: number; w: number; d: number; h: number };

function Buildings({ micBands }: { micBands: TerrainProps['micBands'] }) {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const t0 = useRef(0);

  const buildings = useMemo<BuildingDef[]>(() => {
    const arr: BuildingDef[] = [];
    for (let i = 0; i < BUILDING_COUNT; i++) {
      // Urban quadrant: fx < 0.5, fz >= 0.5 → x in [-SIZE/2, 0], z in [0, SIZE/2]
      arr.push({
        x: -(rng(i * 2.3) * 0.85 + 0.07) * (SIZE / 2),
        z:  (rng(i * 5.7) * 0.85 + 0.07) * (SIZE / 2),
        w: 0.2 + rng(i * 3.1) * 0.3,
        d: 0.2 + rng(i * 4.3) * 0.3,
        h: 0.4 + rng(i * 6.7) * 1.2,
      });
    }
    return arr;
  }, []);

  useFrame((_, dt) => {
    t0.current += dt;
    const pulse = 0.4 + micBands.mid * 0.6;
    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      // Subtle emissive pulse driven by micBands.mid
      mat.emissiveIntensity = pulse * (0.3 + Math.sin(t0.current * 1.2 + i * 0.4) * 0.1);
    });
  });

  return (
    <group>
      {buildings.map((b, i) => (
        <mesh
          key={i}
          ref={(el) => { meshRefs.current[i] = el; }}
          position={[b.x, b.h / 2, b.z]}
          castShadow
        >
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial
            color="#1e2a38"
            emissive="#2a4a6a"
            emissiveIntensity={0.4}
            roughness={0.75}
            metalness={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

// ── Particles ─────────────────────────────────────────────────────────────────
function Particles() {
  const pointsRef = useRef<THREE.Points>(null);
  const t0 = useRef(0);

  const { positions, colors, quadrant } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors    = new Float32Array(PARTICLE_COUNT * 3);
    const quadrant  = new Uint8Array(PARTICLE_COUNT); // 0=bio,1=geo,2=urban,3=heat

    // Color constants
    const cBio   = new THREE.Color('#6ee7b7');
    const cGeo   = new THREE.Color('#7dd3fc');
    const cHeat  = new THREE.Color('#fb923c');

    const half = SIZE / 2;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const q = Math.floor(rng(i * 13.7) * 4); // 0-3
      quadrant[i] = q;

      let px = 0, pz = 0;
      if (q === 0) {
        // Bio: x in [-half, 0], z in [-half, 0]
        px = -(rng(i * 2.1) * half);
        pz = -(rng(i * 3.7) * half);
        colors[i * 3]     = cBio.r;
        colors[i * 3 + 1] = cBio.g;
        colors[i * 3 + 2] = cBio.b;
      } else if (q === 1) {
        // Geo: x in [0, half], z in [-half, 0]
        px =  rng(i * 4.3) * half;
        pz = -(rng(i * 5.9) * half);
        colors[i * 3]     = cGeo.r;
        colors[i * 3 + 1] = cGeo.g;
        colors[i * 3 + 2] = cGeo.b;
      } else if (q === 2) {
        // Urban: x in [-half, 0], z in [0, half]
        px = -(rng(i * 6.1) * half);
        pz =  rng(i * 7.3) * half;
        colors[i * 3]     = cGeo.r;
        colors[i * 3 + 1] = cGeo.g;
        colors[i * 3 + 2] = cGeo.b;
      } else {
        // Heat: x in [0, half], z in [0, half]
        px =  rng(i * 8.7) * half;
        pz =  rng(i * 9.1) * half;
        colors[i * 3]     = cHeat.r;
        colors[i * 3 + 1] = cHeat.g;
        colors[i * 3 + 2] = cHeat.b;
      }

      positions[i * 3]     = px;
      positions[i * 3 + 1] = rng(i * 11.3) * 3.5;
      positions[i * 3 + 2] = pz;
    }

    return { positions, colors, quadrant };
  }, []);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
    g.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    return g;
  }, [positions, colors]);

  useFrame((_, dt) => {
    if (!pointsRef.current) return;
    t0.current += dt;
    const t = t0.current;
    const pos = geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const q = quadrant[i];
      const baseY = positions[i * 3 + 1];
      // Gentle float animation
      const drift = Math.sin(t * 0.6 + i * 0.017) * 0.18;
      const y = (baseY + drift + t * (q === 3 ? 0.12 : 0.06)) % 4.0;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        vertexColors
        size={0.045}
        sizeAttenuation
        transparent
        opacity={0.72}
        depthWrite={false}
      />
    </points>
  );
}

// ── Quadrant dividers (glowing lines) ─────────────────────────────────────────
function QuadrantDividers() {
  const half = SIZE / 2;
  const y = 0.08;
  const color = new THREE.Color(0x6ee7b7);

  // Two crossing lines: one along X axis, one along Z axis
  const hPoints = [
    new THREE.Vector3(-half, y, 0),
    new THREE.Vector3( half, y, 0),
  ];
  const vPoints = [
    new THREE.Vector3(0, y, -half),
    new THREE.Vector3(0, y,  half),
  ];

  const hGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints(hPoints), []);
  const vGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints(vPoints), []);

  return (
    <group>
      <line geometry={hGeo}>
        <lineBasicMaterial color={color} transparent opacity={0.4} linewidth={1} />
      </line>
      <line geometry={vGeo}>
        <lineBasicMaterial color={color} transparent opacity={0.4} linewidth={1} />
      </line>
    </group>
  );
}

// ── Camera ────────────────────────────────────────────────────────────────────
function Camera() {
  const { camera } = useThree();
  const t0 = useRef(0);

  useFrame((_, dt) => {
    t0.current += dt * 0.035; // slow cinematic orbit
    const t = t0.current;
    const r = 13;
    const tx = Math.sin(t) * r * 0.22;
    const tz = Math.cos(t) * r * 0.22 + 8.5;
    const ty = 8.5 + Math.sin(t * 0.28) * 0.6;
    camera.position.x += (tx - camera.position.x) * 0.012;
    camera.position.y += (ty - camera.position.y) * 0.012;
    camera.position.z += (tz - camera.position.z) * 0.012;
    camera.lookAt(0, 0.5, 0);
  });

  return null;
}

// ── Scene (inner, inside Canvas) ─────────────────────────────────────────────
function Scene(props: TerrainProps) {
  const { micBands } = props;

  return (
    <>
      {/* Lighting — bright enough to show saturated vertex colors */}
      <ambientLight intensity={1.4} color="#d8f0e8" />
      <directionalLight
        position={[6, 12, 5]}
        intensity={1.8}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-5, 5, -4]} intensity={0.7} color="#a0d8f0" />
      <pointLight position={[-4, 4, -4]} intensity={1.6} color="#5adc90" distance={14} />
      <pointLight position={[ 4, 3,  4]} intensity={1.2} color="#ff8040" distance={12} />

      {/* Fog */}
      <fog attach="fog" args={['#050e0a', 15, 30]} />

      {/* Terrain */}
      <Terrain {...props} />

      {/* Grid */}
      <gridHelper args={[SIZE, 36, '#3a6a50', '#1a3a28']} position={[0, 0.01, 0]} />

      {/* Quadrant dividers */}
      <QuadrantDividers />

      {/* Water */}
      <WaterPlane />

      {/* Trees in bio quadrant */}
      <Trees micBands={micBands} />

      {/* Buildings in urban quadrant */}
      <Buildings micBands={micBands} />

      {/* Particles */}
      <Particles />

      {/* Camera */}
      <Camera />
    </>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function AcousticTerrain(props: TerrainProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 9, 10], fov: 42 }}
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2,
      }}
      shadows
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    >
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  );
}
