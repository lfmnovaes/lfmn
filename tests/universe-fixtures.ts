// Browser-side probes only; they do not add instrumentation to the application.
export function readUniverseScene() {
  // Development-only inspection of CanvasImpl's existing renderer state.
  const canvas = document.querySelector('canvas');
  if (!canvas) throw new Error('Missing scene');
  const key = Object.keys(canvas).find((name) => name.startsWith('__reactFiber'));
  let fiber = key && Reflect.get(canvas, key);
  while (fiber && fiber.type?.name !== 'CanvasImpl') fiber = fiber.return;
  let hook = fiber?.memoizedState;
  while (hook) {
    const state = hook.memoizedState?.current;
    if (state?.scene && state?.camera) {
      const bodies: { radius: number; position: number[]; spin: number; scale: number }[] = [];
      const orbits: { origin: number[]; center: number[] }[] = [];
      let sunTime = 0;
      const sky = {
        count: 0,
        time: 0,
        positions: [] as number[],
        phases: [] as number[],
        frequencies: [] as number[],
      };
      state.scene.traverse(
        (mesh: {
          type: string;
          position: { toArray: () => number[] };
          material?: {
            uniforms?: {
              time?: { value: number };
              uTime?: { value: number };
              pixelRatio?: unknown;
            };
          };
          geometry?: {
            type: string;
            parameters: { radius: number };
            attributes: Record<string, { array: Float32Array; count: number }>;
          };
          rotation: { y: number };
          parent: {
            children: unknown[];
            scale: { x: number };
            parent: { position: { toArray: () => number[] } };
          };
        }) => {
          if (mesh.type === 'LineLoop' && mesh.geometry) {
            const positions = mesh.geometry.attributes.position.array;
            const middle = positions.length / 2;
            orbits.push({
              origin: mesh.position.toArray(),
              center: Array.from(positions.slice(middle, middle + 3)),
            });
          }
          if (mesh.material?.uniforms?.pixelRatio && mesh.geometry) {
            Object.assign(sky, {
              count: mesh.geometry.attributes.position.count,
              time: mesh.material.uniforms.time?.value ?? 0,
              positions: Array.from(mesh.geometry.attributes.position.array.slice(0, 90)),
              phases: Array.from(mesh.geometry.attributes.phase.array.slice(0, 30)),
              frequencies: Array.from(mesh.geometry.attributes.frequency.array.slice(0, 30)),
            });
          }
          if (mesh.material?.uniforms?.uTime) sunTime = mesh.material.uniforms.uTime.value;
          if (
            mesh.geometry?.type === 'SphereGeometry' &&
            mesh.geometry.parameters.radius < 100 &&
            mesh.parent.children[0] === mesh
          )
            bodies.push({
              radius: mesh.geometry.parameters.radius,
              position: mesh.parent.parent.position.toArray(),
              spin: mesh.rotation.y,
              scale: mesh.parent.scale.x,
            });
        },
      );
      return { camera: state.camera.position.toArray() as number[], bodies, orbits, sky, sunTime };
    }
    hook = hook.next;
  }
  throw new Error('Missing native renderer state');
}

export function trackUniverseFrames() {
  let frames = 0;
  const clear = WebGL2RenderingContext.prototype.clear;
  WebGL2RenderingContext.prototype.clear = function (mask: number) {
    frames++;
    return clear.call(this, mask);
  };
  Object.defineProperty(window, 'universeFrames', { get: () => frames });
}

export function trackUniverseResources() {
  const contexts: { lost: boolean; textures: Set<WebGLTexture> }[] = [];
  const seen = new WeakMap<WebGL2RenderingContext, (typeof contexts)[number]>();
  const getContext = HTMLCanvasElement.prototype.getContext;
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value(this: HTMLCanvasElement, ...args: unknown[]) {
      const context = Reflect.apply(getContext, this, args);
      if (context instanceof WebGL2RenderingContext && !seen.has(context)) {
        const state = { lost: false, textures: new Set<WebGLTexture>() };
        contexts.push(state);
        seen.set(context, state);
        this.addEventListener('webglcontextlost', () => {
          state.lost = true;
        });
      }
      return context;
    },
  });
  const create = WebGL2RenderingContext.prototype.createTexture;
  WebGL2RenderingContext.prototype.createTexture = function () {
    const texture = create.call(this);
    if (texture) seen.get(this)?.textures.add(texture);
    return texture;
  };
  const remove = WebGL2RenderingContext.prototype.deleteTexture;
  WebGL2RenderingContext.prototype.deleteTexture = function (texture) {
    if (texture) seen.get(this)?.textures.delete(texture);
    remove.call(this, texture);
  };
  Object.defineProperty(window, 'universeResources', {
    get: () => ({
      contexts: contexts.filter((context) => !context.lost).length,
      textures: contexts
        .filter((context) => !context.lost)
        .reduce((total, context) => total + context.textures.size, 0),
    }),
  });
}
