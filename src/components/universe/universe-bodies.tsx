'use client';

import { type Ref, type RefObject, useEffect, useLayoutEffect, useMemo, useRef } from 'react';

import { useFrame, useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  BackSide,
  Color,
  DataTexture,
  DoubleSide,
  type Group,
  type InstancedMesh,
  LinearFilter,
  type Mesh,
  Object3D,
  RingGeometry,
  type ShaderMaterial,
  SRGBColorSpace,
  type Texture,
} from 'three';

import type { PlanetId, ScenePlanet, UniverseScale } from './universe-data';

// Adapted from Tan Phan's ExperienceOrbit planet-components and sun-shader, revision 0d488de.
const sunVertex = `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
  }
`;
const sunFragment = `
  #include <logdepthbuf_pars_fragment>
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform float uTime;
  uniform sampler2D sunTexture;
  float noise(vec3 p) {
    return sin(p.x * 10.0 + uTime) * sin(p.y * 10.0 + uTime * 0.7) * sin(p.z * 10.0 + uTime * 0.5);
  }
  void main() {
    #include <logdepthbuf_fragment>
    float n = noise(vPosition * 4.0);
    vec3 noiseColor = mix(vec3(1.0, 0.9, 0.2), vec3(1.0, 0.4, 0.0), n * 0.5 + 0.5);
    vec3 color = texture2D(sunTexture, vUv).rgb + noiseColor * 0.65;
    float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
    color += vec3(1.0, 0.6, 0.2) * fresnel * 1.4;
    gl_FragColor = vec4(color * 1.2, 1.0);
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
    if (!reduced && material.current) material.current.uniforms.uTime.value += Math.min(delta, 0.1);
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
        opacity={0.4}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </sprite>
  );
}

const atmosphereVertex = `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = -viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
    #include <logdepthbuf_vertex>
  }
`;
const atmosphereFragment = `
  #include <logdepthbuf_pars_fragment>
  uniform vec3 color;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    #include <logdepthbuf_fragment>
    float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 3.0);
    gl_FragColor = vec4(color, rim * 0.35);
    #include <colorspace_fragment>
  }
`;

function Atmosphere({ size, color }: { size: number; color: string }) {
  const uniforms = useMemo(() => ({ color: { value: new Color(color) } }), [color]);
  return (
    <mesh scale={1.045}>
      <sphereGeometry args={[size, 32, 24]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={atmosphereVertex}
        fragmentShader={atmosphereFragment}
        blending={AdditiveBlending}
        transparent
        depthWrite={false}
        toneMapped={false}
        side={BackSide}
      />
    </mesh>
  );
}

function SaturnRings({ size, scale }: { size: number; scale: UniverseScale }) {
  const { geometry, texture } = useMemo(() => {
    const inner = size * (scale === 'realistic' ? 1.239 : 1.47);
    const outer = size * (scale === 'realistic' ? 2.27 : 3.33);
    const geometry = new RingGeometry(inner, outer, 128);
    const positions = geometry.attributes.position;
    for (let index = 0; index < positions.count; index++) {
      const radius = Math.hypot(positions.getX(index), positions.getY(index));
      geometry.attributes.uv.setXY(index, (radius - inner) / (outer - inner), 0.5);
    }
    const data = new Uint8Array(256 * 4);
    for (let index = 0; index < 256; index++) {
      const radius = index / 255;
      const band = 0.68 + Math.sin(index * 1.7) * 0.1 + Math.sin(index * 0.27) * 0.12;
      const gap =
        scale === 'realistic' ? radius > 0.69 && radius < 0.765 : radius > 0.52 && radius < 0.57;
      data.set([223 * band, 211 * band, 180 * band, gap ? 12 : 190 * band], index * 4);
    }
    const texture = new DataTexture(data, 256, 1);
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.needsUpdate = true;
    return { geometry, texture };
  }, [size, scale]);
  useEffect(
    () => () => {
      geometry.dispose();
      texture.dispose();
    },
    [geometry, texture],
  );
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial
        map={texture}
        roughness={1}
        transparent
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
  );
}

export function PlanetBody({
  planet,
  texture,
  clouds,
  reduced,
  hours,
  scale,
  postprocessed,
  onSelect,
  ref,
}: {
  planet: ScenePlanet;
  texture?: Texture;
  clouds?: Texture;
  reduced: boolean;
  hours: RefObject<number>;
  scale: UniverseScale;
  postprocessed: boolean;
  onSelect: (id: PlanetId) => void;
  ref: Ref<Group>;
}) {
  const body = useRef<Mesh>(null);
  const cloudLayer = useRef<Mesh>(null);
  const visual = useRef<Group>(null);
  const hovered = useRef(false);
  const { gl, invalidate } = useThree();
  useFrame((_, delta) => {
    const elapsed = Math.min(delta, 0.1);
    // Obliquity already reverses Venus/Uranus/Pluto's axis: do not reverse it twice.
    const spin = (hours.current * Math.PI * 2) / Math.abs(planet.rotationHours);
    if (body.current) body.current.rotation.y = spin % (Math.PI * 2);
    if (cloudLayer.current) cloudLayer.current.rotation.y = (spin * 1.08) % (Math.PI * 2);
    if (visual.current) {
      const target = scale === 'artistic' && !reduced && hovered.current ? 1.05 : 1;
      const weight = reduced ? 1 : 1 - Math.exp(-elapsed * 12);
      visual.current.scale.setScalar(
        visual.current.scale.x + (target - visual.current.scale.x) * weight,
      );
    }
  });
  return (
    <group
      ref={ref}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(planet.id);
      }}
      onPointerOver={(event) => {
        if (event.nativeEvent.pointerType !== 'mouse' || event.nativeEvent.buttons) return;
        event.stopPropagation();
        hovered.current = true;
        gl.domElement.style.cursor = 'pointer';
        invalidate();
      }}
      onPointerOut={() => {
        hovered.current = false;
        gl.domElement.style.cursor = '';
        invalidate();
      }}
    >
      <group ref={visual} rotation={[0, 0, (planet.tilt * Math.PI) / 180]}>
        <mesh ref={body}>
          <sphereGeometry args={[planet.size, planet.id === 'sun' ? 64 : 32, 32]} />
          {planet.id === 'sun' ? (
            texture ? (
              <SunMaterial texture={texture} reduced={reduced} postprocessed={postprocessed} />
            ) : (
              <meshBasicMaterial color={planet.color} />
            )
          ) : (
            <meshStandardMaterial
              key={texture ? 'textured' : 'fallback'}
              map={texture}
              color={texture ? 'white' : planet.color}
              roughness={0.8}
              metalness={0}
              emissive={planet.color}
              emissiveIntensity={0.02}
            />
          )}
        </mesh>
        {planet.id === 'earth' && clouds && (
          <mesh ref={cloudLayer} scale={1.01}>
            <sphereGeometry args={[planet.size, 32, 32]} />
            <meshStandardMaterial map={clouds} transparent opacity={0.5} depthWrite={false} />
          </mesh>
        )}
        {planet.id === 'saturn' && <SaturnRings size={planet.size} scale={scale} />}
        {planet.id === 'sun' && !postprocessed && <SunGlow size={planet.size} />}
        {planet.id !== 'sun' && planet.id !== 'mercury' && planet.id !== 'pluto' && (
          <Atmosphere size={planet.size} color={planet.color} />
        )}
      </group>
    </group>
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
