import { useMemo, useRef } from 'react';

import { useFrame, useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  BackSide,
  Color,
  type Group,
  type ShaderMaterial,
  type Texture,
  Vector3,
} from 'three';

// ExperienceOrbit's galaxy layers; point shaders adapt Drei's MIT Stars/Sparkles.
// Source revisions and license are recorded in public/textures/universe/CREDITS.md.
const vertex = `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  uniform float time;
  uniform float pixelRatio;
  attribute float size;
  attribute float phase;
  attribute float frequency;
  varying vec3 vColor;
  varying float vOpacity;
  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    #include <logdepthbuf_vertex>
    gl_PointSize = max(1.0, size * pixelRatio);
    vColor = color;
    float pulse = 0.5 + 0.5 * sin(time * frequency + phase);
    float shimmer = 0.75 + 0.25 * sin(time * frequency * 2.37 + phase * 0.71);
    vOpacity = (0.12 + 0.88 * pulse) * shimmer;
  }
`;
const fragment = `
  #include <logdepthbuf_pars_fragment>
  varying vec3 vColor;
  varying float vOpacity;
  void main() {
    #include <logdepthbuf_fragment>
    float radius = length(gl_PointCoord - 0.5);
    float glow = exp(-radius * radius * 24.0) * (1.0 - smoothstep(0.35, 0.5, radius));
    gl_FragColor = vec4(vColor, glow * vOpacity);
    #include <colorspace_fragment>
  }
`;

export function UniverseBackground({
  galaxy,
  small,
  reduced,
}: {
  galaxy?: Texture;
  small: boolean;
  reduced: boolean;
}) {
  const { viewport } = useThree();
  const backdrop = useRef<Group>(null);
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ time: { value: 0 }, pixelRatio: { value: 1 } }), []);
  const attributes = useMemo(() => {
    const count = small ? 1200 : 3000;
    const position = new Float32Array(count * 3);
    const color = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const phase = new Float32Array(count);
    const frequency = new Float32Array(count);
    const point = new Vector3();
    const tint = new Color();
    for (let index = 0; index < count; index++) {
      // Uniform random directions avoid visible spiral/lattice patterns.
      const longitude = Math.random() * Math.PI * 2;
      const height = Math.random() * 2 - 1;
      const spread = Math.sqrt(1 - height * height);
      point.set(spread * Math.cos(longitude), height, spread * Math.sin(longitude));
      point.multiplyScalar(1800);
      const temperature = Math.random();
      tint.set(temperature < 0.2 ? '#ffe4c4' : temperature > 0.8 ? '#cadbff' : '#f5f3ee');
      tint.multiplyScalar(0.45 + Math.random() * 0.55);
      // Many faint pinpoints and a few bright stars, each with its own twinkle.
      size[index] = 0.8 + Math.random() ** 6 * 4;
      position.set(point.toArray(), index * 3);
      color.set(tint.toArray(), index * 3);
      phase[index] = Math.random() * Math.PI * 2;
      frequency[index] = 0.8 + Math.random() * 2.4;
    }
    return { position, color, size, phase, frequency };
  }, [small]);
  useFrame(({ camera }, delta) => {
    // The sky is distant scenery, including when visiting true-scale outer planets.
    backdrop.current?.position.copy(camera.position);
    if (material.current) {
      if (!reduced) material.current.uniforms.time.value += Math.min(delta, 0.1);
      material.current.uniforms.pixelRatio.value = viewport.dpr;
    }
  });
  return (
    <group ref={backdrop}>
      {galaxy && (
        <mesh rotation={[Math.PI / 3, 0, Math.PI / 4]}>
          <sphereGeometry args={[1200, 32, 16]} />
          <meshBasicMaterial
            map={galaxy}
            color="#a29dba"
            side={BackSide}
            transparent
            opacity={0.2}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[attributes.position, 3]} />
          <bufferAttribute attach="attributes-color" args={[attributes.color, 3]} />
          <bufferAttribute attach="attributes-size" args={[attributes.size, 1]} />
          <bufferAttribute attach="attributes-phase" args={[attributes.phase, 1]} />
          <bufferAttribute attach="attributes-frequency" args={[attributes.frequency, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={material}
          uniforms={uniforms}
          vertexShader={vertex}
          fragmentShader={fragment}
          transparent
          depthWrite={false}
          toneMapped={false}
          vertexColors
          blending={AdditiveBlending}
        />
      </points>
    </group>
  );
}
