let loading;
// (19/11/2026) El reloj pide acercarse: con la cara grande basta el detector rápido (190 KB) y no se
// descarga SSD (5.4 MB) al abrir. false = volver a SSD (respaldo si en campo no reconoce bien).
export const DETECTOR_RAPIDO = true;
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
      // Un solo detector: el rápido (cara cerca del reloj) o SSD si se vuelve a él.
      DETECTOR_RAPIDO ? ["detector_rapido", api.nets.tinyFaceDetector] : ["detector", api.nets.ssdMobilenetv1],
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
      await (DETECTOR_RAPIDO ? api.detectSingleFace(canvas, opcionesRapidas(api)) : api.detectSingleFace(canvas));
      // También los modelos de puntos y de huella: así el primer rostro no paga su preparación.
      const cara = document.createElement("canvas");
      cara.width = cara.height = 150;
      await api.nets.faceLandmark68Net.detectLandmarks(cara);
      await api.nets.faceRecognitionNet.computeFaceDescriptor(cara);
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

// Opciones del detector rápido para checar (inputSize 160: en las pruebas encontró 7/7 caras y la huella
// facial coincidió ≥ 99.4 % con la de SSD, muy por encima del 95 % que pide el reloj).
// `sensible`: umbral más bajo para poca luz (se alterna cuando lleva un rato sin ver cara).
// inputSize 160 (19/11/2026, 7 caras cercanas): 7/7 detectadas y huella 99.4–99.8 % igual a la de SSD.
// Con 224 una cara quedó en 87 % (abajo del 95 % del reloj): no subirlo sin volver a medir.
export function opcionesRapidas(api = window.faceapi, sensible = false) {
  return new api.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: sensible ? 0.3 : 0.5 });
}
