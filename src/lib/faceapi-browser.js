let loading;
// (INC-007) «Entro al reloj, vuelvo a admin y se traba todo»: preparar el reconocimiento (script de 600 KB, modelos y
// calentamiento de la GPU) bloquea el hilo principal por segundos y seguía corriendo en el panel al salir del reloj.
// Las pantallas que usan la cámara lo RETIENEN mientras están abiertas (retenerFaceApi); si alguien lo retuvo y ya
// nadie lo retiene, la preparación se detiene antes del siguiente paso pesado y sigue al volver a retenerlo.
// Sin ninguna retención (pruebas, otros usos) se prepara de corrido, como siempre.
let retenciones = 0;
let alguienRetuvo = false;
let alReanudar = [];
export function retenerFaceApi() {
  retenciones += 1;
  alguienRetuvo = true;
  const esperando = alReanudar;
  alReanudar = [];
  esperando.forEach((seguir) => seguir());
  let suelto = false;
  return () => {
    if (suelto) return;
    suelto = true;
    retenciones -= 1;
  };
}
// Promesa que espera a que alguien vuelva a retenerlo, o undefined si se puede seguir ya (sin cambiar el orden de siempre).
const turno = () => (alguienRetuvo && retenciones === 0 ? new Promise((seguir) => alReanudar.push(seguir)) : undefined);
const despuesDeTurno = (paso) => { const espera = turno(); return espera ? espera.then(paso) : paso(); };
// El reloj pide acercarse: con la cara grande basta el detector rápido (190 KB) y no se descarga SSD (5.4 MB).
// Marca opcional del modo diagnóstico (no hace nada si está apagado).
const diag = (nombre, datos) => globalThis.__adamiaDiag?.marca(nombre, datos);

const SCRIPT_FACE_API = "/vendor/face-api/face-api-0.22.2.min.js";
const MODELOS = "/models";
// Los tres modelos que carga el reloj (detector rápido, puntos y huella), por el nombre de su manifiesto.
const MANIFIESTOS = ["tiny_face_detector_model", "face_landmark_68_model", "face_recognition_model"];

// (INC-011) Precarga del panel del empleado: SOLO baja los archivos a la caché del navegador, sin ejecutar el script ni
// crear tensores ni calentar la GPU (eso bloqueaba el hilo principal 3.5 + 1.1 + 2.2 s al abrir la app, o al terminar de
// bajar el modelo de 6.4 MB con red celular, y los toques no respondían). El reloj los toma de la caché al abrirse
// (loadBrowserFaceApi). Uno por uno y con prioridad baja para no competir con las pantallas en una red lenta.
let descargando;
export function descargarFaceApi() {
  if (loading || window.faceapi) return Promise.resolve();
  if (descargando) return descargando;
  const bajar = async (url) => {
    const respuesta = await fetch(url, { priority: "low" });
    if (!respuesta.ok) throw new Error(`No se pudo descargar ${url}`);
    return respuesta;
  };
  descargando = (async () => {
    // blob(): el contenido queda en la caché y no se copia a la memoria de JavaScript.
    await (await bajar(SCRIPT_FACE_API)).blob();
    for (const modelo of MANIFIESTOS) {
      const grupos = await (await bajar(`${MODELOS}/${modelo}-weights_manifest.json`)).json();
      for (const archivo of grupos.flatMap((grupo) => grupo.paths || [])) await (await bajar(`${MODELOS}/${archivo}`)).blob();
    }
  })().catch((error) => {
    descargando = undefined;
    throw error;
  });
  return descargando;
}

// Share initialization across mounts; an existing script is not proof that
// its model weights have finished loading.
export function loadBrowserFaceApi() {
  if (loading) return loading;
  loading = (async () => {
    diag("faceapi_inicio");
    const espera = turno();
    if (espera) await espera;
    if (!window.faceapi) {
      diag("faceapi_script_inicio");
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = SCRIPT_FACE_API;
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
      // Un solo detector: el rápido (la cara está cerca del reloj).
      ["detector_rapido", api.nets.tinyFaceDetector],
      ["puntos_cara", api.nets.faceLandmark68Net],
      ["reconocimiento", api.nets.faceRecognitionNet],
    ].map(([modelo, net]) => net.params
      ? diag("faceapi_modelo_en_memoria", { modelo })
      : despuesDeTurno(() => net.loadFromUri(MODELOS)).then(() => diag("faceapi_modelo_fin", { modelo }))));
    diag("faceapi_modelos_fin");
    // Compile detector shaders before the first camera frame.
    diag("faceapi_warmup_inicio");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 160;
      await despuesDeTurno(() => api.detectSingleFace(canvas, opcionesRapidas(api)));
      // También los modelos de puntos y de huella: así el primer rostro no paga su preparación.
      const cara = document.createElement("canvas");
      cara.width = cara.height = 150;
      await despuesDeTurno(() => api.nets.faceLandmark68Net.detectLandmarks(cara));
      await despuesDeTurno(() => api.nets.faceRecognitionNet.computeFaceDescriptor(cara));
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

// Opciones del detector rápido para checar. inputSize 160: 7/7 detectadas y
// huella 99.4–99.8 % igual a la de SSD, muy por encima del 95 % que pide el reloj. Con 224 una cara quedó
// en 87 %: no subirlo sin volver a medir. `sensible`: umbral más bajo para poca luz.
export function opcionesRapidas(api = window.faceapi, sensible = false) {
  return new api.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: sensible ? 0.3 : 0.5 });
}
