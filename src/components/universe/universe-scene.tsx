'use client';

import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { DoubleSide, type Mesh, Vector3 } from 'three';

import { PLANETS, type PlanetId } from './universe-data';

type SceneProps = {
  selected: PlanetId;
  onSelect: (id: PlanetId) => void;
  zoom: RefObject<number>;
  reduced: boolean;
  onReady: (invalidate: () => void) => void;
};

function SolarSystem({ selected, onSelect, zoom, reduced, onReady }: SceneProps) {
  const bodies = useRef<(Mesh | null)[]>([]);
  const view = useRef({ time: 0, ready: false, lookAt: new Vector3(), destination: new Vector3() });
  const { camera, gl, invalidate, size } = useThree();
  const stars = useMemo(() => {
    const points = new Float32Array(900 * 3);
    for (let index = 0; index < 900; index++) {
      const longitude = index * 2.399963229728653;
      const height = 1 - (2 * (index + 0.5)) / 900;
      const radius = 350;
      const spread = Math.sqrt(1 - height * height);
      points.set(
        [
          radius * spread * Math.cos(longitude),
          radius * height,
          radius * spread * Math.sin(longitude),
        ],
        index * 3,
      );
    }
    return points;
  }, []);

  useFrame((_, delta) => {
    const state = view.current;
    const elapsed = Math.min(delta, 0.1);
    if (!reduced) state.time += elapsed;
    for (const [index, planet] of PLANETS.entries()) {
      const mesh = bodies.current[index];
      if (!mesh) continue;
      const angle = (planet.phase + state.time * planet.speed) % (Math.PI * 2);
      mesh.position.set(Math.cos(angle) * planet.orbit, 0, Math.sin(angle) * planet.orbit);
      if (!reduced) mesh.rotation.y = (mesh.rotation.y + elapsed * 0.15) % (Math.PI * 2);
    }
    const index = PLANETS.findIndex(({ id }) => id === selected);
    const body = bodies.current[index];
    if (!body) return;
    const radius = selected === 'sun' ? 64 : Math.max(3.5, PLANETS[index].size * 4);
    const distance =
      (radius / (Math.tan((25 * Math.PI) / 180) * Math.min(size.width / size.height, 1))) *
      zoom.current;
    state.destination.set(distance * 0.55, distance * 0.55, distance * 0.7).add(body.position);
    const weight = reduced ? 1 : 1 - Math.exp(-elapsed * 5);
    camera.position.lerp(state.destination, weight);
    state.lookAt.lerp(body.position, weight);
    camera.lookAt(state.lookAt);
    const focused =
      camera.position.distanceTo(state.destination) < radius * 0.1 &&
      state.lookAt.distanceTo(body.position) < radius * 0.1;
    if (focused && gl.domElement.dataset.focusedPlanet !== selected)
      gl.domElement.dataset.focusedPlanet = selected;
    else if (!focused && gl.domElement.dataset.focusedPlanet)
      delete gl.domElement.dataset.focusedPlanet;
    if (!state.ready) {
      state.ready = true;
      onReady(invalidate);
    }
  });

  return (
    <>
      <color attach="background" args={['#050711']} />
      <ambientLight intensity={0.65} />
      <pointLight position={[0, 0, 0]} intensity={160} decay={1} />
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[stars, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#ccd6f6" size={0.75} sizeAttenuation />
      </points>
      {PLANETS.map((planet, index) => (
        <group key={planet.id}>
          {planet.orbit > 0 && (
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[planet.orbit - 0.025, planet.orbit + 0.025, 128]} />
              <meshBasicMaterial color="#64719a" transparent opacity={0.3} side={DoubleSide} />
            </mesh>
          )}
          <mesh
            ref={(mesh) => {
              bodies.current[index] = mesh;
            }}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(planet.id);
            }}
          >
            <sphereGeometry args={[planet.size, 32, 24]} />
            {planet.id === 'sun' ? (
              <meshBasicMaterial color={planet.color} />
            ) : (
              <meshStandardMaterial color={planet.color} roughness={0.85} />
            )}
          </mesh>
        </group>
      ))}
    </>
  );
}

export default function UniverseScene(props: SceneProps) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const change = () => setVisible(!document.hidden);
    change();
    document.addEventListener('visibilitychange', change);
    return () => document.removeEventListener('visibilitychange', change);
  }, []);
  return (
    <Canvas
      aria-hidden="true"
      dpr={[1, 1.5]}
      camera={{ position: [80, 80, 110], fov: 50, near: 0.1, far: 1000 }}
      frameloop={props.reduced || !visible ? 'demand' : 'always'}
    >
      <SolarSystem {...props} />
    </Canvas>
  );
}
