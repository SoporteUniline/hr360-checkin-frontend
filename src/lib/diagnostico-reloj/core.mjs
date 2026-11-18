// Registro de tiempos del reloj checador (modo diagnóstico).
// Código puro: sin DOM ni red, para poder probarlo con node:test.
// No guarda rostro (descriptor) ni coordenadas: solo tiempos y metadatos.

export const CLAVE_HISTORIAL = "adamia.diagReloj.historial.v1";
export const MAX_SESIONES = 30;
const MAX_MARCAS = 400;
const MAX_PREVIAS = 100;

// Fases que se reportan: [etiqueta, marca de inicio, marca de fin].
export const FASES = [
  ["Validar usuario", "pagina_reloj", "usuario_listo"],
  ["Validar suscripción", "suscripcion_inicio", "suscripcion_fin"],
  ["Descargar librería facial", "faceapi_script_inicio", "faceapi_script_fin"],
  ["Cargar modelos faciales", "faceapi_modelos_inicio", "faceapi_modelos_fin"],
  ["Preparar detector (calentamiento)", "faceapi_warmup_inicio", "faceapi_warmup_fin"],
  ["Abrir cámara (incluye permiso)", "camara_solicitada", "camara_lista"],
  ["Esperar modelos con cámara lista", "camara_lista", "deteccion_lista"],
  ["Primer análisis de cuadro", "deteccion_lista", "primer_analisis_fin"],
  ["Hasta detectar rostro", "deteccion_lista", "primer_rostro"],
  ["Primer envío al servidor", "envio_inicio", "envio_fin"],
  ["Obtener GPS", "gps_inicio", "gps_fin"],
  ["Rostro detectado → checada registrada", "primer_rostro", "checada_exitosa"],
];

const AGREGADAS = new Set(["Hasta detectar rostro", "Rostro detectado → checada registrada"]);

const redondear = (n) => (typeof n === "number" && Number.isFinite(n) ? Math.round(n) : null);

function primeraDespues(marcas, nombre, desde = -Infinity) {
  return marcas.find((m) => m.n === nombre && m.t >= desde) || null;
}

// marcas: [{ n, t }] con t relativo al inicio de la sesión (ms).
export function resumirFases(marcas) {
  const ordenadas = [...marcas].sort((a, b) => a.t - b.t);
  const fases = [];
  for (const [etiqueta, ini, fin] of FASES) {
    const a = primeraDespues(ordenadas, ini);
    if (!a) continue;
    const b = primeraDespues(ordenadas, fin, a.t);
    fases.push({
      fase: etiqueta,
      desde: redondear(a.t),
      ms: b ? redondear(b.t - a.t) : null,
      incompleta: !b,
    });
  }
  // Los tramos agregados contienen otras fases; no cuentan como cuello de botella.
  const medidas = fases.filter((f) => f.ms != null && !AGREGADAS.has(f.fase));
  const cuello = medidas.reduce((max, f) => (!max || f.ms > max.ms ? f : max), null);
  return { fases, cuelloDeBotella: cuello ? cuello.fase : null };
}

export function construirReporte(sesion) {
  const rel = (m) => ({ n: m.n, t: redondear(m.t - sesion.inicio), ...(m.d ? { d: m.d } : {}) });
  const marcas = sesion.marcas.map(rel);
  const previas = (sesion.previas || []).map(rel);
  const { fases, cuelloDeBotella } = resumirFases([...previas, ...marcas]);
  const fin = marcas.find((m) => m.n === "fin");
  const contadores = Object.fromEntries(
    Object.entries(sesion.contadores).map(([k, c]) => [k, {
      veces: c.n,
      promedio_ms: c.n ? redondear(c.total / c.n) : null,
      max_ms: redondear(c.max),
      primeros_ms: c.primeros,
    }]),
  );
  return {
    version: 1,
    id: sesion.id,
    fecha: sesion.inicioISO,
    motivo: sesion.motivo,
    resultado: sesion.resultado || "en curso",
    total_ms: fin ? fin.t : null,
    cuello_de_botella: cuelloDeBotella,
    fases,
    contadores,
    contexto: sesion.contexto,
    marcas,
    previas,
    enviado: false,
  };
}

function leerHistorial(storage) {
  try {
    const raw = storage?.getItem(CLAVE_HISTORIAL);
    const lista = raw ? JSON.parse(raw) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function escribirHistorial(storage, lista) {
  try {
    storage?.setItem(CLAVE_HISTORIAL, JSON.stringify(lista.slice(0, MAX_SESIONES)));
    return true;
  } catch {
    return false;
  }
}

export function createRecorder({ now, fecha = () => new Date().toISOString(), storage, onFinish } = {}) {
  let previas = [];
  let sesion = null;

  const activa = () => Boolean(sesion && !sesion.finalizada);

  function marca(nombre, datos) {
    const m = { n: nombre, t: now(), ...(datos ? { d: datos } : {}) };
    if (activa()) {
      if (sesion.marcas.length < MAX_MARCAS) sesion.marcas.push(m);
    } else {
      previas.push(m);
      if (previas.length > MAX_PREVIAS) previas.shift();
    }
  }

  function cuenta(nombre, ms) {
    if (!activa()) return;
    const c = (sesion.contadores[nombre] ||= { n: 0, total: 0, max: 0, primeros: [] });
    c.n += 1;
    c.total += ms;
    c.max = Math.max(c.max, ms);
    if (c.primeros.length < 5) c.primeros.push(redondear(ms));
  }

  function iniciar(motivo, contexto = {}) {
    if (activa()) return sesion.id;
    const inicio = now();
    sesion = {
      id: `${Math.floor(inicio).toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      inicio,
      inicioISO: fecha(),
      motivo,
      contexto: { ...contexto, ms_desde_carga_app: redondear(inicio) },
      marcas: [],
      contadores: {},
      previas,
      finalizada: false,
    };
    previas = [];
    return sesion.id;
  }

  function agregarContexto(datos) {
    if (activa()) Object.assign(sesion.contexto, datos);
  }

  function terminar(resultado, datos) {
    if (!activa()) return null;
    marca("fin", datos);
    sesion.finalizada = true;
    sesion.resultado = resultado;
    const reporte = construirReporte(sesion);
    escribirHistorial(storage, [reporte, ...leerHistorial(storage)]);
    onFinish?.(reporte);
    return reporte;
  }

  function actual() {
    return activa() ? construirReporte(sesion) : null;
  }

  function marcarEnviado(id) {
    const lista = leerHistorial(storage);
    const r = lista.find((x) => x.id === id);
    if (!r) return false;
    r.enviado = true;
    return escribirHistorial(storage, lista);
  }

  return {
    marca,
    cuenta,
    iniciar,
    agregarContexto,
    terminar,
    actual,
    activa,
    historial: () => leerHistorial(storage),
    pendientesDeEnvio: () => leerHistorial(storage).filter((r) => !r.enviado),
    marcarEnviado,
    borrar: () => escribirHistorial(storage, []),
  };
}

const seg = (ms) => (ms == null ? "—" : `${(ms / 1000).toFixed(1)} s`);

export function reporteTexto(r) {
  if (!r) return "Sin mediciones.";
  const lineas = [
    `Diagnóstico reloj checador · ${r.fecha}`,
    `Resultado: ${r.resultado} · Total: ${seg(r.total_ms)}`,
    `Cuello de botella: ${r.cuello_de_botella || "—"}`,
    "",
    "Fases (inicio relativo → duración):",
    ...r.fases.map((f) => `- ${f.fase}: en ${seg(f.desde)} → ${f.incompleta ? "no terminó" : seg(f.ms)}`),
  ];
  const a = r.contadores?.analisis;
  if (a) lineas.push("", `Análisis de cuadros: ${a.veces} · promedio ${a.promedio_ms} ms · máx ${a.max_ms} ms · primeros ${a.primeros_ms.join(", ")} ms`);
  const sin = r.contadores?.analisis_sin_rostro;
  if (sin) lineas.push(`Cuadros sin rostro: ${sin.veces}`);
  const e = r.contadores?.envio;
  if (e) lineas.push(`Envíos al servidor: ${e.veces} · promedio ${e.promedio_ms} ms`);
  const c = r.contexto || {};
  lineas.push("", "Equipo:",
    `- App nativa: ${c.app_nativa ? "sí" : "no"} · Núcleos: ${c.nucleos ?? "—"} · Memoria: ${c.memoria_gb ?? "—"} GB`,
    `- Red: ${c.red?.tipo ?? "—"} · ${c.red?.mbps ?? "—"} Mbps · ${c.red?.rtt_ms ?? "—"} ms`,
    `- GPU: ${c.gpu ?? "—"} · Motor: ${c.motor_ia ?? "—"}`,
    `- Cámara: ${c.camara ?? "—"}`);
  if (Array.isArray(c.recursos) && c.recursos.length) {
    lineas.push("", "Archivos de reconocimiento:");
    for (const x of c.recursos) {
      lineas.push(`- ${x.archivo}: ${seg(x.ms)} · ${x.desde_cache ? "desde caché" : `${Math.round((x.bytes || 0) / 1024)} KB descargados`}`);
    }
  }
  return lineas.join("\n");
}
