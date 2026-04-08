// iframe-patch.js
// Runs in MAIN world at document_start inside every frame.
// Neutralises JavaScript-based iframe-busting checks so sites that
// detect `window !== window.top` and refuse to render will load normally
// inside the EducoLink Smart Workspace iframe.

(function () {
  if (window === window.top) return; // only patch sub-frames

  const noop = () => window;

  try { Object.defineProperty(window, 'top',         { get: noop, configurable: true }); } catch (_) {}
  try { Object.defineProperty(window, 'parent',      { get: noop, configurable: true }); } catch (_) {}
  try { Object.defineProperty(window, 'frameElement',{ get: () => null, configurable: true }); } catch (_) {}
})();
