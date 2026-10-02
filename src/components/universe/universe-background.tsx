import { useMemo } from 'react';

import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, BackSide, Color, Euler, type Texture, Vector3 } from 'three';

// ExperienceOrbit's galaxy layers; point shaders adapt Drei's MIT Stars/Sparkles.
// Source revisions and license are recorded in public/textures/universe/CREDITS.md.
const vertex = `
  uniform float time;
  uniform float pixelRatio;
  attribute float size;
  attribute float phase;
  attribute float drift;
  varying vec3 vColor;
  varying float vOpacity;
  void main() {
    vec3 p = position + drift * vec3(sin(time * 0.15 + phase), cos(time * 0.12 + phase), 0.0);
    vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = clamp(size * pixelRatio * 300.0 / -viewPosition.z, 1.0, 24.0);
    vColor = color;
    vOpacity = 0.65 + 0.35 * sin(time * 0.35 + phase);
  }
`;
const fragment = `
  varying vec3 vColor;
  varying float vOpacity;
  void main() {
    float radius = length(gl_PointCoord - 0.5);
    float glow = max(0.0, 0.05 / max(radius, 0.02) - 0.1);
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
  const uniforms = useMemo(() => ({ time: { value: 0 }, pixelRatio: { value: 1 } }), []);
  const attributes = useMemo(() => {
    const stars = small ? 1200 : 3000;
    const particles = small ? 140 : 350;
    const count = stars + particles;
    const position = new Float32Array(count * 3);
    const color = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const phase = new Float32Array(count);
    const drift = new Float32Array(count);
    const point = new Vector3();
    const tint = new Color();
    const tilt = new Euler(Math.PI / 3, 0, Math.PI / 4);
    for (let index = 0; index < count; index++) {
      const variation = (Math.sin(index * 127.1 + 5.2) + 1) / 2;
      const longitude = index * 2.399963229728653;
      if (index < stars) {
        const height = 1 - (2 * (index + 0.5)) / stars;
        const spread = Math.sqrt(1 - height * height);
        point.set(spread * Math.cos(longitude), height, spread * Math.sin(longitude));
        point.multiplyScalar(700 + variation * 400);
        tint.setHSL(variation, 0.15, 0.8);
        size[index] = 4 + variation * 6;
      } else {
        const progress = (index - stars) / particles;
        // Warm core, pink disc, cool outer arms, at the reference's compressed scale.
        const core = progress < 1 / 7;
        const disc = progress < 5 / 7;
        point.set(
          Math.sin(longitude) * (core ? 100 : disc ? 800 : 1200),
          Math.sin(index * 17.3) * (core ? 50 : 25),
          Math.cos(longitude) * (core ? 50 : disc ? 400 : 600),
        );
        point.multiplyScalar(0.2 + variation * 0.8).applyEuler(tilt);
        tint.set(core ? '#fff4d6' : disc ? '#ffe0fb' : '#ccf0dd');
        tint.multiplyScalar(core ? 0.65 : 0.4);
        size[index] = core ? 5 : disc ? 8 : 10;
        drift[index] = disc && !core ? 0.5 : 0;
      }
      position.set(point.toArray(), index * 3);
      color.set(tint.toArray(), index * 3);
      phase[index] = longitude;
    }
    return { position, color, size, phase, drift };
  }, [small]);
  useFrame((_, delta) => {
    if (!reduced) uniforms.time.value += Math.min(delta, 0.1);
    uniforms.pixelRatio.value = viewport.dpr;
  });
  return (
    <>
      {galaxy && (
        <mesh rotation={[Math.PI / 3, 0, Math.PI / 4]}>
          <sphereGeometry args={[1200, 32, 16]} />
          <meshBasicMaterial
            map={galaxy}
            color="#a29dba"
            side={BackSide}
            transparent
            opacity={0.4}
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
          <bufferAttribute attach="attributes-drift" args={[attributes.drift, 1]} />
        </bufferGeometry>
        <shaderMaterial
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
    </>
  );
}
