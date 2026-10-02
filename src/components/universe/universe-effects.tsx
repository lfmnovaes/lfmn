'use client';

import { useEffect, useRef } from 'react';

import { useFrame, useThree } from '@react-three/fiber';
import { Vector2 } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';

// Reference bloom/vignette settings, using the passes already bundled with Three.js.
export function UniverseEffects() {
  const { gl, scene, camera, size, invalidate } = useThree();
  const composer = useRef<EffectComposer | null>(null);
  useEffect(() => {
    const pipeline = new EffectComposer(gl);
    pipeline.setPixelRatio(1);
    pipeline.addPass(new RenderPass(scene, camera));
    pipeline.addPass(new UnrealBloomPass(new Vector2(), 0.8, 0.5, 1.1));
    const vignette = new ShaderPass(VignetteShader);
    vignette.uniforms.offset.value = 0.15;
    vignette.uniforms.darkness.value = 0.3;
    pipeline.addPass(vignette);
    pipeline.addPass(new OutputPass());
    composer.current = pipeline;
    invalidate();
    return () => {
      composer.current = null;
      for (const pass of pipeline.passes) pass.dispose();
      pipeline.dispose();
    };
  }, [gl, scene, camera, invalidate]);
  useEffect(() => {
    composer.current?.setSize(size.width, size.height);
    invalidate();
  }, [size.width, size.height, invalidate]);
  useFrame((_, delta) => {
    if (composer.current) composer.current.render(delta);
    else gl.render(scene, camera);
  }, 1);
  return null;
}
