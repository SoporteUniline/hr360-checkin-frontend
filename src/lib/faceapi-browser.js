let loading;

// Share initialization across mounts; an existing script is not proof that
// its model weights have finished loading.
export function loadBrowserFaceApi() {
  if (loading) return loading;
  loading = (async () => {
    if (!window.faceapi) {
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
    }
    const api = window.faceapi;
    await Promise.all([
      api.nets.ssdMobilenetv1,
      api.nets.faceLandmark68Net,
      api.nets.faceRecognitionNet,
    ].map((net) => net.params ? undefined : net.loadFromUri("/models")));
    // Compile detector shaders before the first camera frame.
    try {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 160;
      await api.detectSingleFace(canvas);
    } catch {
      // Warmup is optional.
    }
    return api;
  })().catch((error) => {
    loading = undefined;
    throw error;
  });
  return loading;
}
