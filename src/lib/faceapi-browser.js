let loading;
// Marca opcional del modo diagnóstico (no hace nada si está apagado).
const diag = (nombre, datos) => globalThis.__adamiaDiag?.marca(nombre, datos);

// Share initialization across mounts; an existing script is not proof that
// its model weights have finished loading.
export function loadBrowserFaceApi() {
  if (loading) return loading;
  loading = (async () => {
    diag("faceapi_inicio");
    if (!window.faceapi) {
      diag("faceapi_script_inicio");
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "/vendor/face-api/face-api-0.22.2.min.js";
        script.onload = resolve;
        script.onerror = () => {
          script.remove();
          reject(new Error("No se pudo cargar face-api"));
        };
        document.head.appendChild(script);
      });
      diag("faceapi_script_fin");
    }
    const api = window.faceapi;
    diag("faceapi_modelos_inicio");
    await Promise.all([
      ["detector", api.nets.ssdMobilenetv1],
      ["puntos_cara", api.nets.faceLandmark68Net],
      ["reconocimiento", api.nets.faceRecognitionNet],
    ].map(([modelo, net]) => net.params
      ? diag("faceapi_modelo_en_memoria", { modelo })
      : net.loadFromUri("/models").then(() => diag("faceapi_modelo_fin", { modelo }))));
    diag("faceapi_modelos_fin");
    // Compile detector shaders before the first camera frame.
    diag("faceapi_warmup_inicio");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 160;
      await api.detectSingleFace(canvas);
    } catch {
      // Warmup is optional.
    }
    diag("faceapi_warmup_fin");
    diag("faceapi_listo", { motor: api.tf?.getBackend?.() ?? null });
    return api;
  })().catch((error) => {
    loading = undefined;
    throw error;
  });
  return loading;
}
