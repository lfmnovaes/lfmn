'use client';

import { type Ref, useEffect, useLayoutEffect, useMemo, useRef } from 'react';

import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BackSide,
  DataTexture,
  DoubleSide,
  type InstancedMesh,
  LinearFilter,
  type Mesh,
  Object3D,
  type ShaderMaterial,
  type Texture,
} from 'three';

import type { PLANETS, PlanetId } from './universe-data';

// Adapted from Tan Phan's ExperienceOrbit planet-components and sun-shader, revision 0d488de.
const sunVertex = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const sunFragment = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform float uTime;
  uniform sampler2D sunTexture;
  float noise(vec3 p) {
    return sin(p.x * 10.0 + uTime) * sin(p.y * 10.0 + uTime * 0.7) * sin(p.z * 10.0 + uTime * 0.5);
  }
  void main() {
    float n = noise(vPosition * 0.5);
    vec3 noiseColor = mix(vec3(1.0, 0.9, 0.2), vec3(1.0, 0.4, 0.0), n * 0.5 + 0.5);
    vec3 color = texture2D(sunTexture, vUv).rgb + noiseColor * 0.8;
    float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
    color += vec3(1.0, 0.6, 0.2) * fresnel * 2.0;
    gl_FragColor = vec4(color * 1.5, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function SunMaterial({
  texture,
  reduced,
  postprocessed,
}: {
  texture: Texture;
  reduced: boolean;
  postprocessed: boolean;
}) {
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, sunTexture: { value: texture } }),
    [texture],
  );
  useFrame((_, delta) => {
    if (!reduced && material.current) uniforms.uTime.value += Math.min(delta, 0.1);
  });
  return (
    <shaderMaterial
      ref={material}
      uniforms={uniforms}
      vertexShader={sunVertex}
      fragmentShader={sunFragment}
      toneMapped={!postprocessed}
    />
  );
}

function SunGlow({ size }: { size: number }) {
  const texture = useMemo(() => {
    const data = new Uint8Array(32 * 32 * 4);
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const radius = Math.hypot((x - 15.5) / 15.5, (y - 15.5) / 15.5);
        const offset = (y * 32 + x) * 4;
        data.set([255, 255, 255, Math.max(0, 1 - radius) ** 3 * 255], offset);
      }
    }
    const map = new DataTexture(data, 32, 32);
    map.minFilter = LinearFilter;
    map.magFilter = LinearFilter;
    map.needsUpdate = true;
    return map;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite scale={size * 6}>
      <spriteMaterial
        map={texture}
        color="#ffad33"
        opacity={0.6}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </sprite>
  );
}

export function PlanetBody({
  planet,
  texture,
  clouds,
  reduced,
  postprocessed,
  onSelect,
  ref,
}: {
  planet: (typeof PLANETS)[number];
  texture?: Texture;
  clouds?: Texture;
  reduced: boolean;
  postprocessed: boolean;
  onSelect: (id: PlanetId) => void;
  ref: Ref<Mesh>;
}) {
  return (
    <mesh
      ref={ref}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(planet.id);
      }}
    >
      <sphereGeometry args={[planet.size, planet.id === 'sun' ? 64 : 32, 32]} />
      {planet.id === 'sun' ? (
        texture ? (
          <SunMaterial texture={texture} reduced={reduced} postprocessed={postprocessed} />
        ) : (
          <meshBasicMaterial color={planet.color} />
        )
      ) : (
        <meshStandardMaterial
          map={texture}
          color={texture ? 'white' : planet.color}
          roughness={0.8}
          metalness={0.2}
          emissive={planet.color}
          emissiveIntensity={0.02}
        />
      )}
      {planet.id === 'sun' && !postprocessed && <SunGlow size={planet.size} />}
      {planet.id === 'earth' && clouds && (
        <mesh scale={1.01}>
          <sphereGeometry args={[planet.size, 32, 32]} />
          <meshStandardMaterial
            map={clouds}
            transparent
            opacity={0.5}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      )}
      {planet.id === 'saturn' && (
        <mesh rotation={[-Math.PI / 2.2, 0, 0]}>
          <ringGeometry args={[planet.size * 1.47, planet.size * 3.33, 128]} />
          <meshStandardMaterial
            color="#dfd195"
            transparent
            opacity={0.6}
            depthWrite={false}
            side={DoubleSide}
          />
        </mesh>
      )}
      {planet.id !== 'sun' && (
        <mesh scale={1.15}>
          <sphereGeometry args={[planet.size, 24, 16]} />
          <meshLambertMaterial
            color={planet.color}
            transparent
            opacity={0.08}
            depthWrite={false}
            side={BackSide}
          />
        </mesh>
      )}
    </mesh>
  );
}

export function AsteroidBelt({ count, reduced }: { count: number; reduced: boolean }) {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const dummy = new Object3D();
    for (let index = 0; index < count; index++) {
      const angle = index * 2.399963229728653;
      const variation = (Math.sin(index * 127.1) + 1) / 2;
      const radius = 55 + variation * 8;
      dummy.position.set(
        Math.cos(angle) * radius,
        Math.sin(index * 17.3),
        Math.sin(angle) * radius,
      );
      dummy.rotation.set(angle, index, 0);
      dummy.scale.setScalar(0.05 + variation * 0.15);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(index, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [count]);
  useFrame((_, delta) => {
    // Rotate the instanced belt as a whole; no per-rock matrix updates each frame.
    if (!reduced && mesh.current) mesh.current.rotation.y += Math.min(delta, 0.1) * 0.01;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#80766e" roughness={1} />
    </instancedMesh>
  );
}
