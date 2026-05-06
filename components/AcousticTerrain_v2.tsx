'use client';

import { useMemo, useRef, Suspense } from 'react';
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

const GRID = 72;
const SIZE = 18;
const TREE_COUNT = 80;
const BUILDING_COUNT = 35;

// ── Paleta natural ────────────────────────────────────────────────────────────
const C_GRASS_DARK  = new THREE.Color('#1a3d28');
const C_GRASS       = new THREE.Color('#2d5a3f');
const C_GRASS_LIGHT = new THREE.Color('#4a8c5e');
const C_WATER       = new THREE.Color('#0d1f2a');
const C_ROCK        = new THREE.Color('#2a3540');
const C_URBAN_DARK  = new THREE.Color('#0f1418');
const C_URBAN       = new THREE.Color('#1a2228');
const C_HEAT_DARK   = new THREE.Color('#2a1810');
const C_HEAT        = new THREE.Color('#8a4a28');
const C_HEAT_HOT    = new THREE.Color('#d86a38');

// ── Terrain ───────────────────────────────────────────────────────────────────
function Terrain({ micAnalyser, temperature, humidity, micBands }: TerrainProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const binsRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
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
    const tNorm = Math.max(0, Math.min(1, (temp - 18) / 16));
    const hNorm = Math.max(0, Math.min(1, (hum - 30) / 50));

    const N = GRID * GRID;
    for (let i = 0; i < N; i++) {
      const ix = i % GRID;
      const iz = Math.floor(i / GRID);
      const fx = ix / (GRID - 1);
      const fz = iz / (GRID - 1);

      // Quadrants
      const isBio   = fx < 0.5 && fz < 0.5;
      const isGeo   = fx >= 0.5 && fz < 0.5;
      const isUrban = fx < 0.5 && fz >= 0.5;
      const isHeat  = fx >= 0.5 && fz >= 0.5;

      const lx = isBio || isUrban ? fx * 2 : (fx - 0.5) * 2;
      const lz = isBio || isGeo   ? fz * 2 : (fz - 0.5) * 2;

      // Organic base terrain
      const wave =
        Math.sin(fx * 7.5 + t * 0.4) * 0.12 +
        Math.sin(fz * 6.2 + t * 0.35) * 0.10 +
        Math.sin((fx + fz) * 4.8 + t * 0.25) * 0.08;

      let qH = 0;
      if (bins) {
        const NB = bins.length;
        if (isBio) {
          const s = Math.floor(NB * 0.3), e = Math.floor(NB * 0.9);
          const k = (ix % Math.max(1, e - s)) / Math.max(1, e - s - 1);
          qH = (bins[Math.min(e - 1, s + Math.floor(k * (e - s - 1)))] / 255) * 1.4;
        } else if (isGeo) {
          const e = Math.floor(NB * 0.25);
          const k = (iz % Math.max(1, e)) / Math.max(1, e - 1);
          qH = (bins[Math.min(e - 1, Math.floor(k * (e - 1)))] / 255) * 0.9;
        } else if (isUrban) {
          const s = Math.floor(NB * 0.05), e = Math.floor(NB * 0.5);
          const k = (ix % Math.max(1, e - s)) / Math.max(1, e - s - 1);
          qH = (bins[Math.min(e - 1, s + Math.floor(k * (e - s - 1)))] / 255) * 0.7;
        } else {
          const cx = 0.5, cz = 0.5;
          const d = Math.sqrt((lx - cx) ** 2 + (lz - cz) ** 2);
          qH = tNorm * Math.exp(-d * 2.2) * 1.2;
        }
      } else {
        if (isBio) {
          qH = 0.35 + Math.sin(t * 0.9 + lx * 7 + lz * 6) * 0.25 + micBands.high * 0.4;
        } else if (isGeo) {
          qH = 0.18 + Math.sin(t * 0.5 + lx * 4 + lz * 3) * 0.15 + micBands.low * 0.25;
        } else if (isUrban) {
          qH = 0.05 + Math.sin(t * 1.1 + lx * 5 + lz * 7) * 0.08 + micBands.mid * 0.15;
        } else {
          const cx = 0.5, cz = 0.5;
          const d = Math.sqrt((lx - cx) ** 2 + (lz - cz) ** 2);
          qH = tNorm * Math.exp(-d * 2.2) * 1.0;
        }
      }

      const hMod = 0.7 + hNorm * 0.6;
      const height = (wave + qH * hMod) * 0.9;
      pos.setY(i, height);

      // Color
      let r = 0, g = 0, b = 0;
      const h01 = Math.max(0, Math.min(1, (height + 0.08) * 0.75));

      if (isBio) {
        if (h01 < 0.15) {
          r = C_WATER.r; g = C_WATER.g; b = C_WATER.b;
        } else if (h01 < 0.5) {
          const f = (h01 - 0.15) / 0.35;
          r = C_GRASS_DARK.r + (C_GRASS.r - C_GRASS_DARK.r) * f;
          g = C_GRASS_DARK.g + (C_GRASS.g - C_GRASS_DARK.g) * f;
          b = C_GRASS_DARK.b + (C_GRASS.b - C_GRASS_DARK.b) * f;
        } else {
          const f = Math.min(1, (h01 - 0.5) / 0.5);
          r = C_GRASS.r + (C_GRASS_LIGHT.r - C_GRASS.r) * f;
          g = C_GRASS.g + (C_GRASS_LIGHT.g - C_GRASS.g) * f;
          b = C_GRASS.b + (C_GRASS_LIGHT.b - C_GRASS.b) * f;
        }
      } else if (isGeo) {
        const f = Math.min(1, h01 * 1.5);
        r = C_WATER.r + (C_ROCK.r - C_WATER.r) * f;
        g = C_WATER.g + (C_ROCK.g - C_WATER.g) * f;
        b = C_WATER.b + (C_ROCK.b - C_WATER.b) * f;
      } else if (isUrban) {
        const f = Math.min(1, h01 * 1.2);
        r = C_URBAN_DARK.r + (C_URBAN.r - C_URBAN_DARK.r) * f;
        g = C_URBAN_DARK.g + (C_URBAN.g - C_URBAN_DARK.g) * f;
        b = C_URBAN_DARK.b + (C_URBAN.b - C_URBAN_DARK.b) * f;
      } else {
        if (h01 < 0.2) {
          r = C_HEAT_DARK.r; g = C_HEAT_DARK.g; b = C_HEAT_DARK.b;
        } else if (h01 < 0.6) {
          const f = (h01 - 0.2) / 0.4;
          r = C_HEAT_DARK.r + (C_HEAT.r - C_HEAT_DARK.r) * f;
          g = C_HEAT_DARK.g + (C_HEAT.g - C_HEAT_DARK.g) * f;
          b = C_HEAT_DARK.b + (C_HEAT.b - C_HEAT_DARK.b) * f;
        } else {
          const f = Math.min(1, (h01 - 0.6) / 0.4);
          r = C_HEAT.r + (C_HEAT_HOT.r - C_HEAT.r) * f;
          g = C_HEAT.g + (C_HEAT_HOT.g - C_HEAT.g) * f;
          b = C_HEAT.b + (C_HEAT_HOT.b - C_HEAT.b) * f;
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
        roughness={0.85}
        metalness={0.02}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ── Trees ─────────────────────────────────────────────────────────────────────
type TreeDef = { x: number; z: number; h: number; r: number };

function Trees({ micBands, micLevel }: { micBands: TerrainProps['micBands']; micLevel: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const t0 = useRef(0);

  const trees = useMemo<TreeDef[]>(() => {
    const rng = (s: number) => {
      let x = Math.sin(s * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    };
    const arr: TreeDef[] = [];
    for (let i = 0; i < TREE_COUNT; i++) {
      const side = i < TREE_COUNT * 0.75 ? -1 : 1;
      arr.push({
        x: (rng(i * 3.1) * 0.88 - 0.04) * (SIZE / 2) * side,
        z: -(rng(i * 7.3) * 0.88 + 0.04) * (SIZE / 2),
        h: 0.4 + rng(i * 5.7) * 0.7,
        r: 0.08 + rng(i * 2.9) * 0.12,
      });
    }
    return arr;
  }, []);

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    t0.current += dt;
    const sway = micBands.high * 0.12 + micLevel * 0.06;
    groupRef.current.children.forEach((child, i) => {
      const tree = trees[i];
      if (!tree) return;
      const canopy = child.children[1] as THREE.Mesh | undefined;
      if (canopy) {
        canopy.rotation.x = Math.sin(t0.current * 1.1 + i * 0.5) * sway;
        canopy.rotation.z = Math.cos(t0.current * 0.9 + i * 0.7) * sway * 0.7;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {trees.map((tree, i) => (
        <group key={i} position={[tree.x, 0, tree.z]}>
          <mesh position={[0, tree.h * 0.4, 0]} castShadow>
            <cylinderGeometry args={[tree.r * 0.3, tree.r * 0.4, tree.h * 0.8, 6]} />
            <meshStandardMaterial color="#1a0f08" roughness={0.95} />
          </mesh>
          <mesh position={[0, tree.h * 0.9, 0]} castShadow>
            <coneGeometry args={[tree.r * 1.8, tree.h * 0.9, 8]} />
            <meshStandardMaterial color="#2a4a35" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── Buildings ─────────────────────────────────────────────────────────────────
type BuildingDef = { x: number; z: number; w: number; d: number; h: number };

function Buildings({ micBands }: { micBands: TerrainProps['micBands'] }) {
  const buildings = useMemo<BuildingDef[]>(() => {
    const rng = (s: number) => {
      let x = Math.sin(s * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    };
    const arr: BuildingDef[] = [];
    for (let i = 0; i < BUILDING_COUNT; i++) {
      arr.push({
        x: -(rng(i * 2.3) * 0.82 + 0.08) * (SIZE / 2),
        z: (rng(i * 5.7) * 0.82 + 0.08) * (SIZE / 2),
        w: 0.18 + rng(i * 3.1) * 0.28,
        d: 0.18 + rng(i * 4.3) * 0.28,
        h: 0.35 + rng(i * 6.7) * 1.1,
      });
    }
    return arr;
  }, []);

  return (
    <group>
      {buildings.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]} castShadow>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial color="#1a2228" roughness={0.8} metalness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

// ── Camera ────────────────────────────────────────────────────────────────────
function Camera() {
  const { camera } = useThree();
  const t0 = useRef(0);

  useFrame((_, dt) => {
    t0.current += dt * 0.04;
    const t = t0.current;
    const r = 14;
    const tx = Math.sin(t) * r * 0.2;
    const tz = Math.cos(t) * r * 0.2 + 8;
    const ty = 9 + Math.sin(t * 0.3) * 0.5;
    camera.position.x += (tx - camera.position.x) * 0.015;
    camera.position.y += (ty - camera.position.y) * 0.015;
    camera.position.z += (tz - camera.position.z) * 0.015;
    camera.lookAt(0, 0.4, 0);
  });
  return null;
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function AcousticTerrain(props: TerrainProps) {
  const { micBands, micLevel } = props;
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 9, 10], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      shadows
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.65} color="#c8e6d8" />
        <directionalLight position={[6, 10, 5]} intensity={1.2} color="#f0f8f4" castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-5, 4, -4]} intensity={0.5} color="#7aa8b8" />
        <pointLight position={[-4, 3, -4]} intensity={1.4} color="#5adc90" distance={12} />
        <pointLight position={[4, 2, 4]} intensity={1.0} color="#d86a38" distance={10} />
        <fog attach="fog" args={['#0a1215', 14, 28]} />

        <Terrain {...props} />
        <gridHelper args={[SIZE, 36, '#2a5a40', '#1a3a28']} position={[0, 0.01, 0]} />
        <Trees micBands={micBands} micLevel={micLevel} />
        <Buildings micBands={micBands} />
        <Camera />
      </Suspense>
    </Canvas>
  );
}
