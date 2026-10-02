'use client';

import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { type Group, type LineLoop, NeutralToneMapping, Timer, Vector3 } from 'three';

import { UniverseBackground } from './universe-background';
import { AsteroidBelt, PlanetBody } from './universe-bodies';
import { PLANETS, type PlanetId, type ScenePlanet, type UniverseScale } from './universe-data';
import { UniverseEffects } from './universe-effects';
import { getOrbitPosition, REALISTIC_KM_PER_UNIT, updateOrbitPath } from './universe-orbits';
import { type AssetStatus, useUniverseTextures } from './use-universe-textures';

type SceneProps = {
  selected: PlanetId;
  onSelect: (id: PlanetId) => void;
  zoom: RefObject<number>;
  rotation: RefObject<{ x: number; y: number }>;
  callout: RefObject<HTMLSpanElement | null>;
  locked: boolean;
  paused: boolean;
  reduced: boolean;
  scale: UniverseScale;
  speed: number;
  onReady: (invalidate: () => void) => void;
  onAssets: (status: AssetStatus) => void;
  onUnavailable: () => void;
};

function OrbitPath({
  planet,
  focused,
  hours,
}: {
  planet: ScenePlanet;
  focused: boolean;
  hours: RefObject<number>;
}) {
  const line = useRef<LineLoop>(null);
  const wasFocused = useRef(false);
  const { points, origin, point } = useMemo(() => {
    const points = new Float32Array(192 * 3);
    const origin = new Vector3();
    const point = new Vector3();
    updateOrbitPath(planet, null, points, origin, point);
    return { points, origin, point };
  }, [planet]);
  useFrame(() => {
    if (!line.current || (!focused && !wasFocused.current)) return;
    wasFocused.current = focused;
    const angle = planet.phase + (hours.current * Math.PI * 2) / (planet.orbitalDays * 24);
    updateOrbitPath(planet, focused ? angle : null, points, origin, point);
    line.current.position.copy(origin);
    line.current.geometry.attributes.position.needsUpdate = true;
  }, -0.5);
  return (
    <lineLoop ref={line} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color={planet.color} transparent opacity={0.16} depthWrite={false} />
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
  paused,
  reduced,
  scale,
  speed,
  hidden,
  onReady,
  onAssets,
  onUnavailable,
}: SceneProps & { hidden: boolean }) {
  const bodies = useRef<(Group | null)[]>([]);
  const hours = useRef(0);
  const timer = useMemo(() => new Timer(), []);
  const planets = useMemo(
    () =>
      PLANETS.map<ScenePlanet>((planet) =>
        scale === 'realistic'
          ? {
              ...planet,
              size: planet.radiusKm / REALISTIC_KM_PER_UNIT,
              orbit: planet.semiMajorKm / REALISTIC_KM_PER_UNIT,
            }
          : {
              ...planet,
              // Keep the compressed layout's existing phases and circular paths.
              phase: -planet.phase,
              eccentricity: 0,
              inclination: 0,
              ascendingNode: 0,
              perihelion: 0,
            },
      ),
    [scale],
  );
  const view = useRef({
    ready: false,
    lookAt: new Vector3(),
    destination: new Vector3(),
    label: new Vector3(),
    bodyPosition: new Vector3(),
    movement: new Vector3(),
    fromPosition: new Vector3(),
    fromLookAt: new Vector3(),
    travel: 0,
    scale: '' as string,
    planet: -1,
  });
  const { camera, gl, invalidate, size } = useThree();
  const textures = useUniverseTextures(onAssets);
  useEffect(() => {
    timer.connect(document);
    return () => timer.dispose();
  }, [timer]);
  useEffect(() => {
    if (!paused && !reduced && !locked) timer.reset();
  }, [timer, paused, reduced, locked]);
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

  useFrame(() => {
    timer.update();
    if (locked || hidden) return;
    const state = view.current;
    const elapsed = timer.getDelta();
    if (!reduced && !paused) hours.current += elapsed * speed;
    for (const [index, planet] of planets.entries()) {
      const mesh = bodies.current[index];
      if (!mesh) continue;
      const angle =
        planet.phase +
        (planet.orbitalDays ? (hours.current * Math.PI * 2) / (planet.orbitalDays * 24) : 0);
      getOrbitPosition(planet, angle, mesh.position);
    }
    const index = planets.findIndex(({ id }) => id === selected);
    const body = bodies.current[index];
    if (!body) return;
    // Carry the focused body's orbital movement; smooth only the camera's approach.
    if (state.planet === index && state.scale === scale) {
      state.movement.copy(body.position).sub(state.bodyPosition);
      camera.position.add(state.movement);
      state.lookAt.add(state.movement);
      state.fromPosition.add(state.movement);
      state.fromLookAt.add(state.movement);
    } else {
      state.fromPosition.copy(camera.position);
      state.fromLookAt.copy(state.lookAt);
      state.travel = 0;
    }
    state.bodyPosition.copy(body.position);
    state.planet = index;
    state.scale = scale;
    const planet = planets[index];
    const radius = scale === 'realistic' ? planet.size * 4 : Math.max(3.5, planet.size * 4);
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
    // Demand rendering can leave a long gap while paused; never consume it as camera travel.
    state.travel = reduced ? 1 : Math.min(1, state.travel + Math.min(elapsed, 0.1) / 1.8);
    if (state.travel < 1) {
      const progress = state.travel * state.travel * (3 - 2 * state.travel);
      let weight = progress;
      const fromDistance = state.fromPosition.distanceTo(body.position);
      const toDistance = state.destination.distanceTo(body.position);
      // True-scale distances span millions of body radii: approach logarithmically.
      if (scale === 'realistic' && fromDistance > toDistance * 2) {
        const distance = Math.exp(
          Math.log(fromDistance) * (1 - progress) + Math.log(toDistance) * progress,
        );
        weight = (fromDistance - distance) / (fromDistance - toDistance);
      }
      camera.position.copy(state.fromPosition).lerp(state.destination, weight);
      state.lookAt.copy(state.fromLookAt).lerp(body.position, weight);
      invalidate();
    } else {
      const weight = reduced ? 1 : 1 - Math.exp(-Math.min(elapsed, 0.1) * 12);
      camera.position.lerp(state.destination, weight);
      state.lookAt.lerp(body.position, weight);
      if (
        camera.position.distanceTo(state.destination) > radius * 0.001 ||
        state.lookAt.distanceTo(body.position) > radius * 0.001
      )
        invalidate();
    }
    const near = Math.max(planet.size * 0.005, 0.0000001);
    if (camera.near !== near) {
      camera.near = near;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(state.lookAt);
    if (callout.current) {
      camera.updateMatrixWorld();
      state.label.copy(body.position);
      state.label.y += planet.size * 1.4;
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
  }, -1);

  return (
    <>
      <color attach="background" args={['#050711']} />
      <ambientLight intensity={0.55} />
      <pointLight position={[0, 0, 0]} intensity={80} color="white" decay={1.2} />
      <UniverseBackground
        galaxy={textures.galaxy}
        small={!desktop}
        reduced={reduced || paused || locked}
      />
      {planets.map((planet, index) => (
        <group key={planet.id}>
          {planet.orbit > 0 && (
            <OrbitPath planet={planet} focused={planet.id === selected} hours={hours} />
          )}
          <PlanetBody
            planet={planet}
            texture={textures[planet.id]}
            clouds={textures.clouds}
            reduced={reduced || paused || locked}
            hours={hours}
            scale={scale}
            postprocessed={postprocessed}
            onSelect={onSelect}
            ref={(mesh) => {
              bodies.current[index] = mesh;
            }}
          />
        </group>
      ))}
      {scale === 'artistic' && (
        <AsteroidBelt count={desktop ? 600 : 240} reduced={reduced || paused || locked} />
      )}
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
      gl={{ alpha: false, toneMapping: NeutralToneMapping, logarithmicDepthBuffer: true }}
      camera={{ position: [80, 80, 110], fov: 50, near: 0.1, far: 30000 }}
      frameloop={props.reduced || props.paused || props.locked || !visible ? 'demand' : 'always'}
    >
      <SolarSystem {...props} paused={props.paused || !visible} hidden={!visible} />
    </Canvas>
  );
}
