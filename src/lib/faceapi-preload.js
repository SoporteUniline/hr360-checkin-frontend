import { loadBrowserFaceApi } from "./faceapi-browser";

// Let the initial screen render before downloading and initializing the models.
export function scheduleFaceApiPreload() {
  const preload = () => {
    // Recognition can retry normally if this optional preparation fails.
    loadBrowserFaceApi().catch(() => {});
  };

  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(preload, { timeout: 1500 });
    return () => window.cancelIdleCallback(id);
  }

  const id = window.setTimeout(preload, 250);
  return () => window.clearTimeout(id);
}
