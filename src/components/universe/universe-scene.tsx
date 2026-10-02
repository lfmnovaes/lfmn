'use client';

import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { type Group, NeutralToneMapping, Vector3 } from 'three';

import { UniverseBackground } from './universe-background';
import { AsteroidBelt, PlanetBody } from './universe-bodies';
import { PLANETS, type PlanetId } from './universe-data';
import { UniverseEffects } from './universe-effects';
import { type AssetStatus, useUniverseTextures } from './use-universe-textures';

type SceneProps = {
  selected: PlanetId;
  onSelect: (id: PlanetId) => void;
  zoom: RefObject<number>;
  rotation: RefObject<{ x: number; y: number }>;
  callout: RefObject<HTMLSpanElement | null>;
  locked: boolean;
  reduced: boolean;
  onReady: (invalidate: () => void) => void;
  onAssets: (status: AssetStatus) => void;
  onUnavailable: () => void;
};

function OrbitPath({ orbit, color }: { orbit: number; color: string }) {
  const points = useMemo(() => {
    const positions = new Float32Array(192 * 3);
    for (let index = 0; index < 192; index++) {
      const angle = (index / 192) * Math.PI * 2;
      positions.set([Math.cos(angle) * orbit, 0, Math.sin(angle) * orbit], index * 3);
    }
    return positions;
  }, [orbit]);
  return (
    <lineLoop>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={0.16} depthWrite={false} />
    </lineLoop>
  );
}

function SolarSystem({
  selected,
  onSelect,
  zoom,
  rotation,
  callout,
  locked,
  reduced,
  onReady,
  onAssets,
  onUnavailable,
}: SceneProps) {
  const bodies = useRef<(Group | null)[]>([]);
  const view = useRef({
    time: 0,
    ready: false,
    lookAt: new Vector3(),
    destination: new Vector3(),
    label: new Vector3(),
    bodyPosition: new Vector3(),
    movement: new Vector3(),
    planet: -1,
  });
  const { camera, gl, invalidate, size } = useThree();
  const textures = useUniverseTextures(onAssets);
  const desktop = size.width >= 900;
  const software = useMemo(() => {
    const context = gl.getContext();
    const debug = context.getExtension('WEBGL_debug_renderer_info');
    return debug
      ? /SwiftShader|llvmpipe|software/i.test(context.getParameter(debug.UNMASKED_RENDERER_WEBGL))
      : false;
  }, [gl]);
  const postprocessed = desktop && !software;
  useEffect(() => {
    gl.domElement.dataset.effects = postprocessed ? 'bloom' : 'glow';
  }, [gl, postprocessed]);
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener('webglcontextlost', onUnavailable);
    return () => canvas.removeEventListener('webglcontextlost', onUnavailable);
  }, [gl, onUnavailable]);

  useFrame((_, delta) => {
    if (locked) return;
    const state = view.current;
    const elapsed = Math.min(delta, 0.1);
    if (!reduced) state.time += elapsed;
    for (const [index, planet] of PLANETS.entries()) {
      const mesh = bodies.current[index];
      if (!mesh) continue;
      const angle = (planet.phase + state.time * planet.speed) % (Math.PI * 2);
      mesh.position.set(Math.cos(angle) * planet.orbit, 0, Math.sin(angle) * planet.orbit);
    }
    const index = PLANETS.findIndex(({ id }) => id === selected);
    const body = bodies.current[index];
    if (!body) return;
    // Carry the focused body's orbital movement; smooth only the camera's approach.
    if (state.planet === index) {
      state.movement.copy(body.position).sub(state.bodyPosition);
      camera.position.add(state.movement);
      state.lookAt.add(state.movement);
    }
    state.bodyPosition.copy(body.position);
    state.planet = index;
    const radius = Math.max(3.5, PLANETS[index].size * 4);
    const distance =
      (radius / (Math.tan((25 * Math.PI) / 180) * Math.min(size.width / size.height, 1))) *
      zoom.current;
    // Spherical camera offsets adapted from ExperienceOrbit's CameraRig.
    const phi = Math.max(0.15, Math.min(Math.PI - 0.15, Math.acos(0.55) + rotation.current.y));
    const theta = rotation.current.x;
    state.destination
      .set(
        distance * Math.sin(phi) * Math.sin(theta),
        distance * Math.cos(phi),
        distance * Math.sin(phi) * Math.cos(theta),
      )
      .add(body.position);
    const weight = reduced ? 1 : 1 - Math.exp(-elapsed * 5);
    camera.position.lerp(state.destination, weight);
    state.lookAt.lerp(body.position, weight);
    camera.lookAt(state.lookAt);
    if (callout.current) {
      camera.updateMatrixWorld();
      state.label.copy(body.position);
      state.label.y += PLANETS[index].size * 1.4;
      state.label.project(camera);
      callout.current.hidden = Math.abs(state.label.z) > 1;
      callout.current.style.transform = `translate(${((state.label.x + 1) * size.width) / 2}px, ${((1 - state.label.y) * size.height) / 2}px) translate(-50%, -100%)`;
    }
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
      <ambientLight intensity={0.55} />
      <pointLight position={[0, 0, 0]} intensity={80} color="white" decay={1.2} />
      <UniverseBackground galaxy={textures.galaxy} small={!desktop} reduced={reduced || locked} />
      {PLANETS.map((planet, index) => (
        <group key={planet.id}>
          {planet.orbit > 0 && <OrbitPath orbit={planet.orbit} color={planet.color} />}
          <PlanetBody
            planet={planet}
            texture={textures[planet.id]}
            clouds={textures.clouds}
            reduced={reduced || locked}
            postprocessed={postprocessed}
            onSelect={onSelect}
            ref={(mesh) => {
              bodies.current[index] = mesh;
            }}
          />
        </group>
      ))}
      <AsteroidBelt count={desktop ? 600 : 240} reduced={reduced || locked} />
      {postprocessed && <UniverseEffects />}
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
      gl={{ alpha: false, toneMapping: NeutralToneMapping }}
      camera={{ position: [80, 80, 110], fov: 50, near: 0.1, far: 3000 }}
      frameloop={props.reduced || props.locked || !visible ? 'demand' : 'always'}
    >
      <SolarSystem {...props} />
    </Canvas>
  );
}
