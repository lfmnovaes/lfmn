// Browser-side probes only; they do not add instrumentation to the application.
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
