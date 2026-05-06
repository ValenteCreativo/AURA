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
const FREQ_COLS   = 80;   // X axis: frequency bands (low → high)
const TIME_ROWS   = 48;   // Z axis: time history (front = now, back = past)
const PLANE_W     = 20;   // world units wide
const PLANE_D     = 12;   // world units deep
const TREE_COUNT  = 50;
const BLDG_COUNT  = 30;
const PARTICLE_COUNT = 12000;

// ── Frequency zone boundaries (by column index) ───────────────────────────────
// Bass:     col 0  – 19  (left 25%)
// Low-mid:  col 20 – 39  (25–50%)
// High-mid: col 40 – 59  (50–75%)
// Treble:   col 60 – 79  (right 25%)
const BASS_END    = Math.floor(FREQ_COLS * 0.25);   // 20
const LOMID_END   = Math.floor(FREQ_COLS * 0.50);   // 40
const HIMID_END   = Math.floor(FREQ_COLS * 0.75);   // 60

// ── Palette — frequency zones tell the ecological story ──────────────────────
// Bass (left 25%): urban rumble — dark steel blue, city at night
const C_BASS_DARK  = new THREE.Color('#0d1a2a');
const C_BASS_HOT   = new THREE.Color('#2a5a8a');
// Low-mid (25-50%): geophony — water, wind, earth — deep teal
const C_LOMID_DARK = new THREE.Color('#0a2a2a');
const C_LOMID_LIGHT= new THREE.Color('#1a8a7a');
// High-mid (50-75%): biophony — forest life — rich green
const C_HIMID_DARK = new THREE.Color('#0d2e1a');
const C_HIMID_LIGHT= new THREE.Color('#3aaa6a');
// Treble (right 25%): birds, insects — bioluminescent cyan-green
const C_TREB_DARK  = new THREE.Color('#1a4a3a');
const C_TREB_LIGHT = new THREE.Color('#5ae8a8');

// ── Seeded pseudo-random ──────────────────────────────────────────────────────
function rng(s: number): number {
  const x = Math.sin(s * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ── Color for a given column index ───────────────────────────────────────────
function colColor(col: number, t01: number): [number, number, number] {
  const f = Math.max(0, Math.min(1, t01));
  let ca: THREE.Color, cb: THREE.Color;
  if (col < BASS_END) {
    ca = C_BASS_DARK; cb = C_BASS_HOT;
  } else if (col < LOMID_END) {
    ca = C_LOMID_DARK; cb = C_LOMID_LIGHT;
  } else if (col < HIMID_END) {
    ca = C_HIMID_DARK; cb = C_HIMID_LIGHT;
  } else {
    ca = C_TREB_DARK; cb = C_TREB_LIGHT;
  }
  return [
    ca.r + (cb.r - ca.r) * f,
    ca.g + (cb.g - ca.g) * f,
    ca.b + (cb.b - ca.b) * f,
  ];
}

// ── Max height per zone ───────────────────────────────────────────────────────
function zoneMaxHeight(col: number): number {
  if (col < BASS_END)   return 2.0;
  if (col < LOMID_END)  return 1.6;
  if (col < HIMID_END)  return 1.4;
  return 1.2;
}

// ── Terrain ───────────────────────────────────────────────────────────────────
function Terrain({ micAnalyser, micBands }: TerrainProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Circular history buffer: FREQ_COLS samples per frame, TIME_ROWS frames
  const historyRef = useRef<Float32Array>(
    new Float32Array(FREQ_COLS * TIME_ROWS) // all zeros initially
  );
  const headRef = useRef(0); // index of the most-recent row in the circular buffer

  // FFT read buffer
  const binsRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const t0 = useRef(0);

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(PLANE_W, PLANE_D, FREQ_COLS - 1, TIME_ROWS - 1);
    g.rotateX(-Math.PI / 2);
    // Pre-allocate vertex colors
    const colors = new Float32Array(FREQ_COLS * TIME_ROWS * 3);
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);

  useFrame((_, dt) => {
    if (!meshRef.current) return;
    t0.current += dt;
    const t = t0.current;

    // ── 1. Capture new FFT frame ──────────────────────────────────────────────
    const history = historyRef.current;
    const head    = headRef.current;

    if (micAnalyser) {
      const fbc = micAnalyser.frequencyBinCount;
      if (!binsRef.current || binsRef.current.length !== fbc) {
        binsRef.current = new Uint8Array(new ArrayBuffer(fbc));
      }
      micAnalyser.getByteFrequencyData(binsRef.current);
      const bins = binsRef.current;

      // Sample FREQ_COLS bins from the analyser (log-spaced feel via linear mapping)
      for (let col = 0; col < FREQ_COLS; col++) {
        // Map col → bin index, weighted toward lower frequencies
        const ratio = col / (FREQ_COLS - 1);
        const binIdx = Math.min(fbc - 1, Math.floor(ratio * ratio * fbc * 0.85));
        history[head * FREQ_COLS + col] = bins[binIdx] / 255;
      }
    } else {
      // Idle organic animation — breathing sine landscape
      for (let col = 0; col < FREQ_COLS; col++) {
        const fx = col / (FREQ_COLS - 1);
        const base = micBands.low * 0.3 + micBands.mid * 0.2 + micBands.high * 0.15;
        history[head * FREQ_COLS + col] =
          0.08 +
          Math.sin(fx * 9.4 + t * 0.55) * 0.06 +
          Math.sin(fx * 4.1 + t * 0.38) * 0.05 +
          Math.sin(fx * 2.3 + t * 0.22) * 0.04 +
          base;
      }
    }

    // Advance head (circular)
    headRef.current = (head + 1) % TIME_ROWS;

    // ── 2. Build vertex positions & colors ────────────────────────────────────
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const col = geometry.attributes.color   as THREE.BufferAttribute;

    const N = FREQ_COLS * TIME_ROWS;
    for (let i = 0; i < N; i++) {
      const colIdx = i % FREQ_COLS;                    // X: frequency
      const rowIdx = Math.floor(i / FREQ_COLS);        // Z: time (0 = front/now)

      // Map rowIdx to circular buffer: row 0 = most recent (head-1), row 47 = oldest
      const bufRow = (headRef.current - 1 - rowIdx + TIME_ROWS) % TIME_ROWS;
      const amp    = history[bufRow * FREQ_COLS + colIdx];

      const maxH = zoneMaxHeight(colIdx);
      // Organic noise per vertex
      const noise = (rng(i * 3.7 + 0.1) - 0.5) * 0.04;
      const height = amp * maxH + noise;

      pos.setY(i, height);

      // Color: brightness driven by amplitude
      const [r, g, b] = colColor(colIdx, 0.25 + amp * 0.75);
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
        roughness={0.7}
        metalness={0.05}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ── Trees (biophony zone: col 40–59, high-mid) ────────────────────────────────
type TreeDef = {
  x: number;   // world X
  z: number;   // world Z
  h: number;   // height
  r: number;   // radius
  isCone: boolean;
};

function Trees({ micBands }: { micBands: TerrainProps['micBands'] }) {
  const groupRef = useRef<THREE.Group>(null);
  const t0 = useRef(0);

  const trees = useMemo<TreeDef[]>(() => {
    const arr: TreeDef[] = [];
    // Biophony zone: X from 50% to 75% of PLANE_W → world x in [0, PLANE_W*0.25]
    // Centered at 0, so world x range: [-PLANE_W/2 + PLANE_W*0.5, -PLANE_W/2 + PLANE_W*0.75]
    //   = [0, PLANE_W*0.25] = [0, 5]
    const xMin = 0;
    const xMax = PLANE_W * 0.25;  // 5
    const zHalf = PLANE_D / 2;    // 6

    for (let i = 0; i < TREE_COUNT; i++) {
      arr.push({
        x: xMin + rng(i * 3.1) * (xMax - xMin),
        z: -zHalf + rng(i * 7.3) * PLANE_D,
        h: 0.45 + rng(i * 5.7) * 0.75,
        r: 0.09 + rng(i * 2.9) * 0.13,
        isCone: rng(i * 11.3) > 0.45,
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
                emissiveIntensity={0.35}
                roughness={0.88}
              />
            </mesh>
          ) : (
            <mesh position={[0, tree.h * 0.92, 0]} castShadow>
              <sphereGeometry args={[tree.r * 1.6, 8, 6]} />
              <meshStandardMaterial
                color="#3a6e4a"
                emissive="#1a4a2a"
                emissiveIntensity={0.35}
                roughness={0.85}
              />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

// ── Buildings (bass zone: col 0–19, left 25%) ─────────────────────────────────
type BuildingDef = { x: number; z: number; w: number; d: number; h: number };

function Buildings({ micBands }: { micBands: TerrainProps['micBands'] }) {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const t0 = useRef(0);

  const buildings = useMemo<BuildingDef[]>(() => {
    const arr: BuildingDef[] = [];
    // Bass zone: X from 0% to 25% of PLANE_W → world x in [-PLANE_W/2, -PLANE_W/4]
    //   = [-10, -5]
    const xMin = -PLANE_W / 2;   // -10
    const xMax = -PLANE_W / 4;   // -5
    const zHalf = PLANE_D / 2;   // 6

    for (let i = 0; i < BLDG_COUNT; i++) {
      arr.push({
        x: xMin + rng(i * 2.3) * (xMax - xMin),
        z: -zHalf + rng(i * 5.7) * PLANE_D,
        w: 0.2 + rng(i * 3.1) * 0.3,
        d: 0.2 + rng(i * 4.3) * 0.3,
        h: 0.3 + rng(i * 6.7) * 1.2,
      });
    }
    return arr;
  }, []);

  useFrame((_, dt) => {
    t0.current += dt;
    const pulse = 0.4 + micBands.low * 0.6;
    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = pulse * (0.4 + Math.sin(t0.current * 1.2 + i * 0.4) * 0.1);
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
            emissiveIntensity={0.5}
            roughness={0.75}
            metalness={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

// ── Particles ─────────────────────────────────────────────────────────────────
function Particles({ micLevel }: { micLevel: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const t0 = useRef(0);

  // Store base Y positions for float animation
  const basePositions = useRef<Float32Array | null>(null);

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors    = new Float32Array(PARTICLE_COUNT * 3);

    const xHalf = PLANE_W / 2;
    const zHalf = PLANE_D / 2;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Distribute across full terrain
      const px = -xHalf + rng(i * 2.1) * PLANE_W;
      const pz = -zHalf + rng(i * 3.7) * PLANE_D;
      const py = rng(i * 11.3) * 3.0;

      positions[i * 3]     = px;
      positions[i * 3 + 1] = py;
      positions[i * 3 + 2] = pz;

      // Color by X position (frequency zone)
      const fx = (px + xHalf) / PLANE_W;  // 0–1
      const colIdx = Math.floor(fx * FREQ_COLS);
      const [r, g, b] = colColor(colIdx, 0.6 + rng(i * 5.3) * 0.4);
      colors[i * 3]     = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    return { positions, colors };
  }, []);

  // Store base positions for animation reference
  useMemo(() => {
    basePositions.current = positions.slice();
  }, [positions]);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
    g.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    return g;
  }, [positions, colors]);

  useFrame((_, dt) => {
    if (!pointsRef.current || !basePositions.current) return;
    t0.current += dt;
    const t = t0.current;
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const speed = 0.06 + micLevel * 0.18; // faster when loud

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const baseY = basePositions.current[i * 3 + 1];
      // Float upward, wrap around
      const drift = Math.sin(t * 0.5 + i * 0.017) * 0.12;
      const y = ((baseY + drift + t * speed * (0.5 + rng(i * 7.1) * 0.5)) % 4.0);
      pos.setY(i, y < 0 ? y + 4.0 : y);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        vertexColors
        size={0.04}
        sizeAttenuation
        transparent
        opacity={0.65}
        depthWrite={false}
      />
    </points>
  );
}

// ── Camera ────────────────────────────────────────────────────────────────────
function Camera() {
  const { camera } = useThree();
  const t0 = useRef(0);

  useFrame((_, dt) => {
    t0.current += dt * 0.03; // slow cinematic
    const t = t0.current;

    // x oscillates ±2, y=7–8, z=10–11
    const tx = Math.sin(t) * 2.0;
    const ty = 7.5 + Math.sin(t * 0.4) * 0.5;
    const tz = 10.5 + Math.cos(t * 0.25) * 0.5;

    camera.position.x += (tx - camera.position.x) * 0.012;
    camera.position.y += (ty - camera.position.y) * 0.012;
    camera.position.z += (tz - camera.position.z) * 0.012;

    // Look slightly into the spectrogram history
    camera.lookAt(0, 1, -2);
  });

  return null;
}

// ── Scene ─────────────────────────────────────────────────────────────────────
function Scene(props: TerrainProps) {
  const { micBands, micLevel } = props;

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={1.8} color="#d0eee8" />
      <directionalLight
        position={[5, 10, 4]}
        intensity={2.2}
        color="#f0fff8"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-4, 5, -3]} intensity={0.9} color="#a0d8f0" />
      {/* Biophony glow — high-mid zone */}
      <pointLight position={[2, 4, 0]} intensity={2.0} color="#3adc80" distance={14} />
      {/* Urban glow — bass zone */}
      <pointLight position={[-7, 3, 0]} intensity={1.6} color="#4a8aff" distance={14} />
      {/* Warm fill */}
      <pointLight position={[0, 6, -4]} intensity={0.8} color="#c8f0e0" distance={18} />

      {/* Fog */}
      <fog attach="fog" args={['#040c08', 16, 32]} />

      {/* Spectrogram terrain */}
      <Terrain {...props} />

      {/* Life emerging from the soundscape */}
      <Trees micBands={micBands} />
      <Buildings micBands={micBands} />

      {/* Particles */}
      <Particles micLevel={micLevel} />

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
      camera={{ position: [0, 7.5, 10.5], fov: 42 }}
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.4,
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
