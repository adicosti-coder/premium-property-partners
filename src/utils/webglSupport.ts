// Singleton WebGL support check – avoids creating multiple contexts
let _webglSupported: boolean | null = null;

export function isWebGLSupported(): boolean {
  if (_webglSupported !== null) return _webglSupported;

  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    _webglSupported = !!gl;

    // Explicitly lose the temporary context so it doesn't count against
    // the browser's active-context limit.
    if (gl) {
      const loseCtx = (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context');
      loseCtx?.loseContext();
    }
    // Detach the canvas from DOM (it was never attached, but clear refs)
    canvas.width = 0;
    canvas.height = 0;
  } catch {
    _webglSupported = false;
  }

  return _webglSupported;
}

// Global active-map counter – prevents more than one Mapbox GL context.
let _activeMapCount = 0;

export function acquireMapSlot(): boolean {
  if (_activeMapCount >= 3) return false;
  _activeMapCount++;
  return true;
}

export function releaseMapSlot(): void {
  _activeMapCount = Math.max(0, _activeMapCount - 1);
}
