'use client';

import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars } from '@react-three/drei';
import * as THREE from 'three';

type Props = {
  temperature: number | null;
  humidity: number | null;
  state: 'balanced' | 'attention' | 'alert' | 'disconnected';
};

const STATE_COLOR: Record<Props['state'], string> = {
  balanced: '#6ee7b7',
  attention: '#fbbf24',
  alert: '#fb7185',
  disconnected: '#7dd3fc'
};

function DistortedSphere({
  color,
  intensity,
  speed
}: {
  color: string;
  intensity: number;
  speed: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.IcosahedronGeometry>(null);

  const basePositions = useMemo(() => {
    const geom = new THREE.IcosahedronGeometry(1.4, 6);
    return geom.attributes.position.array.slice() as Float32Array;
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.x = time * 0.12 * speed;
      meshRef.current.rotation.y = time * 0.18 * speed;
    }
    if (geometryRef.current) {
      const pos = geometryRef.current.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        const x = basePositions[i];
        const y = basePositions[i + 1];
        const z = basePositions[i + 2];
        const n =
          Math.sin(x * 2.4 + time * 1.1 * speed) * 0.18 +
          Math.cos(y * 2.1 + time * 0.9 * speed) * 0.18 +
          Math.sin(z * 2.7 + time * 1.3 * speed) * 0.18;
        const scale = 1 + n * intensity;
        arr[i] = x * scale;
        arr[i + 1] = y * scale;
        arr[i + 2] = z * scale;
      }
      pos.needsUpdate = true;
      geometryRef.current.computeVertexNormals();
    }
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry ref={geometryRef} args={[1.4, 6]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.6}
        roughness={0.25}
        metalness={0.15}
        wireframe={false}
        transparent
        opacity={0.92}
      />
    </mesh>
  );
}

function WireShell({ color }: { color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.getElapsedTime();
      ref.current.rotation.x = -t * 0.08;
      ref.current.rotation.y = t * 0.05;
      const s = 1 + Math.sin(t * 0.6) * 0.02;
      ref.current.scale.set(s, s, s);
    }
  });
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[1.85, 2]} />
      <meshBasicMaterial color={color} wireframe transparent opacity={0.18} />
    </mesh>
  );
}

function ParticleField({ color, count = 380 }: { color: string; count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 2.4 + Math.random() * 2.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.getElapsedTime();
      ref.current.rotation.y = t * 0.04;
      ref.current.rotation.x = Math.sin(t * 0.2) * 0.1;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.025}
        transparent
        opacity={0.65}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

export default function SensorOrb3D({ temperature, humidity, state }: Props) {
  const color = STATE_COLOR[state];
  const t = temperature ?? 22;
  const h = humidity ?? 60;
  const intensity = Math.min(1.4, 0.55 + (Math.abs(t - 22) / 18) + (Math.abs(60 - h) / 80));
  const speed = 0.6 + Math.min(1.4, Math.abs(t - 22) / 14);

  return (
    <Canvas
      dpr={[1, 1.8]}
      camera={{ position: [0, 0, 5.4], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.45} />
        <pointLight position={[4, 4, 4]} intensity={1.2} color={color} />
        <pointLight position={[-4, -2, -3]} intensity={0.6} color="#7dd3fc" />
        <Stars radius={50} depth={30} count={1200} factor={3} fade speed={0.6} />
        <Float speed={1.1} rotationIntensity={0.4} floatIntensity={0.7}>
          <DistortedSphere color={color} intensity={intensity} speed={speed} />
        </Float>
        <WireShell color={color} />
        <ParticleField color={color} />
      </Suspense>
    </Canvas>
  );
}
