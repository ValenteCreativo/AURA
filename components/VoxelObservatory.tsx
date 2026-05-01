'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export type VoxelChannel = 'biophony' | 'anthrophony' | 'geophony' | 'sensor';

export const VOXEL_CHANNEL_COLOR: Record<VoxelChannel, string> = {
  biophony: '#6ee7b7',
  anthrophony: '#fb923c',
  geophony: '#7dd3fc',
  sensor: '#c4b5fd'
};

export const VOXEL_CHANNEL_LABEL: Record<VoxelChannel, string> = {
  biophony: 'biophony',
  anthrophony: 'anthrophony',
  geophony: 'geophony',
  sensor: 'thermohygro'
};

type VoxelDef = {
  x: number;
  z: number;
  channel: VoxelChannel;
  freqIndex: number;
  baseScale: number;
};

type ChannelLevels = Record<VoxelChannel, number>;

type Props = {
  active: VoxelChannel | null;
  onSelect: (channel: VoxelChannel) => void;
  channelLevels: ChannelLevels;
  micAnalyser: AnalyserNode | null;
  pulse: number;
};

const GRID = 8;
const CELL_SPACING = 0.5;
const VOXEL_BOX_GEOMETRY = new THREE.BoxGeometry(0.34, 1, 0.34);
const VOXEL_EDGES_GEOMETRY = new THREE.EdgesGeometry(VOXEL_BOX_GEOMETRY);

function buildLayout(): VoxelDef[] {
  const voxels: VoxelDef[] = [];
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      let channel: VoxelChannel;
      if (i < GRID / 2 && j < GRID / 2) channel = 'biophony';
      else if (i < GRID / 2 && j >= GRID / 2) channel = 'sensor';
      else if (i >= GRID / 2 && j < GRID / 2) channel = 'geophony';
      else channel = 'anthrophony';

      const cx = i - (GRID - 1) / 2;
      const cz = j - (GRID - 1) / 2;
      const radial = Math.sqrt(cx * cx + cz * cz);
      const baseScale = 0.55 + Math.exp(-radial / 3) * 0.7;

      voxels.push({
        x: cx,
        z: cz,
        channel,
        freqIndex: (i * 7 + j * 3) % 24,
        baseScale
      });
    }
  }
  return voxels;
}

function bandRange(channel: VoxelChannel, N: number): [number, number] {
  switch (channel) {
    case 'geophony':
      return [0, Math.max(2, Math.floor(N * 0.1))];
    case 'anthrophony':
      return [Math.floor(N * 0.06), Math.floor(N * 0.32)];
    case 'biophony':
      return [Math.floor(N * 0.32), Math.floor(N * 0.88)];
    default:
      return [0, N];
  }
}

function VoxelGrid({
  active,
  onSelect,
  channelLevels,
  micAnalyser,
  pulse
}: Props) {
  const layout = useMemo(buildLayout, []);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const edgeRefs = useRef<(THREE.LineSegments | null)[]>([]);
  const binsRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    let bins: Uint8Array<ArrayBuffer> | null = null;
    if (micAnalyser) {
      if (!binsRef.current || binsRef.current.length !== micAnalyser.frequencyBinCount) {
        binsRef.current = new Uint8Array(new ArrayBuffer(micAnalyser.frequencyBinCount));
      }
      micAnalyser.getByteFrequencyData(binsRef.current);
      bins = binsRef.current;
    }

    layout.forEach((vox, i) => {
      const mesh = meshRefs.current[i];
      const edges = edgeRefs.current[i];
      if (!mesh) return;

      const channelLevel = channelLevels[vox.channel] ?? 0.4;
      let live: number;
      if (bins) {
        const [start, end] = bandRange(vox.channel, bins.length);
        const slice = Math.max(1, end - start);
        const k = (vox.freqIndex % slice) / Math.max(1, slice - 1);
        const idx = Math.min(end - 1, start + Math.floor(k * (slice - 1)));
        live = bins[idx] / 255;
      } else {
        live =
          0.42 +
          Math.sin(t * 1.1 + vox.x * 0.45 + vox.z * 0.62) * 0.22 +
          Math.cos(t * 0.7 + vox.freqIndex * 0.31) * 0.16;
      }

      const isActive = active === vox.channel;
      const dim = active && !isActive ? 0.32 : 1;
      const liftMultiplier = isActive ? 1.55 : active ? 0.7 : 1;
      const target =
        (vox.baseScale * 0.72 + channelLevel * 0.9 + live * 1.08 + pulse * 0.2) * liftMultiplier;
      const damped = mesh.scale.y + (target - mesh.scale.y) * 0.14;
      const next = Math.min(2.8, Math.max(0.12, damped));
      mesh.scale.y = next;
      mesh.position.y = next / 2;

      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = dim;
      mat.emissiveIntensity = isActive ? 0.78 : 0.18 + live * 0.18;

      if (edges) {
        edges.scale.y = next;
        edges.position.y = next / 2;
        const lineMat = edges.material as THREE.LineBasicMaterial;
        lineMat.opacity = (isActive ? 0.75 : hovered === i ? 0.55 : 0.22) * dim;
      }
    });
  });

  return (
    <group position={[0, -0.08, 0]}>
      {layout.map((vox, i) => (
        <group key={i} position={[vox.x * CELL_SPACING, 0, vox.z * CELL_SPACING]}>
          <mesh
            ref={(el) => {
              meshRefs.current[i] = el;
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHovered(i);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              setHovered((curr) => (curr === i ? null : curr));
              document.body.style.cursor = 'default';
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(vox.channel);
            }}
          >
            <boxGeometry args={[0.34, 1, 0.34]} />
            <meshStandardMaterial
              color={VOXEL_CHANNEL_COLOR[vox.channel]}
              emissive={VOXEL_CHANNEL_COLOR[vox.channel]}
              emissiveIntensity={0.22}
              roughness={0.62}
              metalness={0.04}
              transparent
              opacity={0.95}
            />
          </mesh>
          <lineSegments
            ref={(el) => {
              edgeRefs.current[i] = el;
            }}
            geometry={VOXEL_EDGES_GEOMETRY}
          >
            <lineBasicMaterial color="#f4fff8" transparent opacity={0.22} />
          </lineSegments>
        </group>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]} receiveShadow>
        <planeGeometry args={[14, 14, 14, 14]} />
        <meshStandardMaterial
          color="#0b1612"
          roughness={0.95}
          metalness={0.0}
          transparent
          opacity={0.55}
          wireframe={false}
        />
      </mesh>
      <gridHelper args={[14, 28, '#0d2520', '#0d2520']} position={[0, 0.001, 0]} />
    </group>
  );
}

function CameraOrbit({ active }: { active: VoxelChannel | null }) {
  const { camera, size } = useThree();
  const targetRef = useRef(new THREE.Vector3(0, 0.5, 0));

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const aspect = size.width / Math.max(1, size.height);
    const baseRadius = aspect < 1 ? 8.1 : aspect < 1.3 ? 7.3 : 6.6;
    const angleBase = active === 'biophony' ? Math.PI * 1.25
      : active === 'anthrophony' ? Math.PI * 0.25
      : active === 'geophony' ? Math.PI * 0.75
      : active === 'sensor' ? Math.PI * 1.75
      : 0;
    const angle = angleBase + t * 0.05;
    const elevation = active ? (aspect < 1.2 ? 4.2 : 3.55) : (aspect < 1.2 ? 4.8 : 4.2) + Math.sin(t * 0.18) * 0.18;
    const x = Math.sin(angle) * baseRadius;
    const z = Math.cos(angle) * baseRadius;
    camera.position.x += (x - camera.position.x) * 0.04;
    camera.position.y += (elevation - camera.position.y) * 0.04;
    camera.position.z += (z - camera.position.z) * 0.04;
    camera.lookAt(targetRef.current);
  });
  return null;
}

export default function VoxelObservatory(props: Props) {
  return (
    <Canvas
      dpr={[1, 1.8]}
      camera={{ position: [0, 4.8, 7.6], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.42} />
        <directionalLight position={[5, 7, 4]} intensity={1.05} color="#f4fff8" />
        <directionalLight position={[-4, 3, -3]} intensity={0.5} color="#7dd3fc" />
        <pointLight position={[0, 6, 0]} intensity={0.6} color="#c4b5fd" distance={14} />
        <fog attach="fog" args={['#040807', 7, 16]} />
        <VoxelGrid {...props} />
        <CameraOrbit active={props.active} />
      </Suspense>
    </Canvas>
  );
}

export const VOXEL_QUADRANT_HINT: Record<VoxelChannel, string> = {
  biophony: 'NE quadrant · 2 – 11 kHz',
  anthrophony: 'SW quadrant · 60 Hz – 4 kHz',
  geophony: 'SE quadrant · 20 Hz – 2 kHz',
  sensor: 'NW quadrant · DHT11 thermohygro'
};
