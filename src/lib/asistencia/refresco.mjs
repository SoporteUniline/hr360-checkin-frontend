// «Cambió una asistencia»: un solo punto para que Asistencias y el Monitor se vean al día sin recargar
// (docs/asistencias/refresco.md, docs/incidentes/INC-008-asistencias-sin-refresco.md).
// Lógica pura, sin React ni navegador: la usan lib/asistencia/refrescoAsistencias.js (el refrescador de la página),
// lib/axios.js (guardados) y hooks/useRefrescoChecadas.js (SSE, foco y sondeo). Probado en scripts/test-refresco-asistencias.mjs.

// Claves SWR que dependen de las asistencias. Se revalidan TODAS juntas (mutate global con filtro) en vez de solo la
// tabla: así la tarjeta de horas extra, los filtros por columna, la matriz, la cuenta de horas, «Horas por reponer»,
// «Horas de ley», el historial «Qué cambió» y las checadas del panel ya no se quedan con lo de antes.
export const PREFIJOS_ASISTENCIA = [
  "/checador/asistencias", //       tabla, periodo completo (#periodo), día abierto desde Nómina, historial /:id/cambios
  "/checador/reloj/asistencia", //  checadas del día en el panel de edición (useRelojChecador)
  "/checador/reloj/asistencia-por-empleado",
  "/checador/cuenta-horas", //      CuentaHorasContext, «Horas por reponer» y el detalle de la cuenta
  "/checador/horas-extra", //       horas extra del día (useHorasExtraDia) y diálogos de reposición
  "/checador/reportes/horas-ley", // pestaña «Horas de ley» (VistaHoras)
  "/checador/mi-equipo/hoy", //     monitor del jefe en la app del empleado
];

// Fuente del editor abierto: el reloj del día toma su borrador de la PRIMERA carga y compara contra ella; si se
// recargara con la ventana abierta marcaría «cambios» que la persona no hizo. Se vuelve a pedir al abrirla.
const EXCLUIDAS = [/^\/checador\/asistencias\/\d+\/reloj(?:[?#]|$)/];

// Guardados que cambian asistencias (cualquier pantalla del mismo navegador: Asistencias, Monitor, Incidencias,
// Permisos, Vacaciones, Turnos extra, registro masivo, horas por reponer).
const ESCRITURAS = [
  "/checador/asistencias",
  "/checador/reloj/actualizar",
  "/checador/bulk-incident",
  "/checador/horas-extra",
  "/checador/cuenta-horas",
  "/checador/solicitudes-permiso",
  "/checador/turnos-extra",
];
const METODOS_ESCRITURA = new Set(["post", "put", "patch", "delete"]);

// Ruta sin origen ni prefijo /api: "https://api.x/api/checador/asistencias?…" → "/checador/asistencias?…".
export function rutaDe(url) {
  let texto = String(url ?? "");
  texto = texto.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, "");
  if (!texto.startsWith("/")) texto = `/${texto}`;
  return texto.replace(/^\/api(?=\/)/, "");
}

// ¿`ruta` empieza con `prefijo` y sigue un separador? ("/checador/asistencias-x" no es "/checador/asistencias").
const empiezaCon = (ruta, prefijo) => ruta.startsWith(prefijo) && /^(?:$|[/?#])/.test(ruta.slice(prefijo.length));

// Texto de una clave SWR: la cadena o el primer elemento de un arreglo ([url, firma]).
export function textoClave(clave) {
  if (typeof clave === "string") return clave;
  if (Array.isArray(clave) && typeof clave[0] === "string") return clave[0];
  return "";
}

// Filtro para mutate(filtro) de SWR: ¿esta clave depende de las asistencias?
export function esClaveAsistencia(clave) {
  const texto = textoClave(clave);
  if (!texto) return false;
  const ruta = rutaDe(texto);
  if (EXCLUIDAS.some((re) => re.test(ruta))) return false;
  return PREFIJOS_ASISTENCIA.some((p) => empiezaCon(ruta, p));
}

// ¿Esta petición que salió bien cambió asistencias?
export function esEscrituraAsistencia(metodo, url) {
  if (!METODOS_ESCRITURA.has(String(metodo ?? "").toLowerCase())) return false;
  const ruta = rutaDe(url);
  return ESCRITURAS.some((p) => empiezaCon(ruta, p));
}

// Empresas del canal SSE. «all» (Todas las empresas) → las del usuario («7,8»); el backend no emite a «empresa:all».
export function empresasDelCanal(idEmpresa, empresasUsuario = []) {
  if (idEmpresa == null || idEmpresa === "") return null;
  if (String(idEmpresa) !== "all") {
    const n = Number(idEmpresa);
    return Number.isInteger(n) && n > 0 ? String(n) : null;
  }
  const ids = [...new Set((Array.isArray(empresasUsuario) ? empresasUsuario : [])
    .map((e) => Number(e && typeof e === "object" ? e.id_empresa : e))
    .filter((n) => Number.isInteger(n) && n > 0))].sort((a, b) => a - b);
  return ids.length ? ids.join(",") : null;
}

// Intervalos (ms).
export const TIEMPOS = {
  demora: 1000, //      junta ráfagas de eventos (hora pico de entrada, masivos) en una sola recarga
  sondeo: 60000, //     respaldo si el SSE no da señales (proxy que lo corta): cada minuto, solo con la pestaña a la vista
  canalVivo: 75000, //  sin ping del SSE en este tiempo → se considera caído (el backend manda ping cada 30 s)
  foco: 60000, //       al volver a la pestaña se recarga si pasó al menos esto desde la última vez (o si hubo avisos)
  eco: 3000, //         tras un guardado propio no se muestra el aviso «Asistencias actualizadas» (es el eco del SSE)
};

// Qué hacer con un motivo de recarga.
//   «guardado» (la persona guardó en esta pestaña): siempre ahora.
//   SSE, cola sin conexión, foco y sondeo: si hay una edición con cambios sin guardar o la pestaña no está a la vista,
//   queda PENDIENTE y se hace al cerrar la edición / volver a la pestaña. Nunca se pisa lo que alguien está escribiendo.
export function decidir({ motivo, visible = true, editando = false }) {
  if (motivo === "guardado") return "ahora";
  if (editando || !visible) return "pendiente";
  return "ahora";
}

// ¿Toca el sondeo de respaldo? Solo a la vista, sin edición abierta, con el canal callado y sin una recarga reciente.
export function tocaSondeo({ ahora, visible, editando, ultimoPing, ultimoRefresco, tiempos = TIEMPOS }) {
  if (!visible || editando) return false;
  const canalVivo = ultimoPing != null && ahora - ultimoPing < tiempos.canalVivo;
  if (canalVivo) return false;
  return ultimoRefresco == null || ahora - ultimoRefresco >= tiempos.sondeo;
}

// ¿Recargar al volver a la pestaña? Si hubo avisos mientras no se veía, si el canal está callado o si pasó un rato.
export function tocaAlVolver({ ahora, pendiente, ultimoPing, ultimoRefresco, tiempos = TIEMPOS }) {
  if (pendiente) return true;
  if (ultimoPing == null || ahora - ultimoPing >= tiempos.canalVivo) return true;
  return ultimoRefresco == null || ahora - ultimoRefresco >= tiempos.foco;
}

// Refrescador: junta las recargas para no repetir peticiones.
//   mutar(filtro)  → revalida las claves SWR que pasan el filtro (mutate global de SWR).
//   estado()       → { visible, editando } en este momento.
//   programar / cancelar: setTimeout/clearTimeout (se inyectan en las pruebas).
// - refrescar("guardado") arranca ya; si hay una recarga en curso que empezó DESPUÉS de la última escritura, se une a
//   ella (ya trae lo último); si empezó antes, se encadena UNA vuelta más al terminar.
// - avisar(motivo) (SSE, cola, foco, sondeo) espera `demora` para juntar ráfagas; un guardado lo absorbe.
// - Con edición abierta o pestaña oculta queda pendiente: reanudar() lo hace al cerrarse la edición / volver.
export function crearRefrescador({
  mutar,
  filtro = esClaveAsistencia,
  estado = () => ({ visible: true, editando: false }),
  reloj = () => Date.now(),
  programar = (fn, ms) => setTimeout(fn, ms),
  cancelar = (t) => clearTimeout(t),
  tiempos = TIEMPOS,
} = {}) {
  let escrituras = 0;
  let enCurso = null; // { version, promesa }
  let encadenada = null;
  let temporizador = null;
  let pendiente = false;
  let ultimoRefresco = null;
  let ultimoGuardado = null;
  let vueltas = 0;

  const ejecutar = () => {
    const version = escrituras;
    vueltas += 1;
    const promesa = Promise.resolve()
      .then(() => mutar(filtro))
      .catch(() => {})
      .then(() => { ultimoRefresco = reloj(); })
      .finally(() => { if (enCurso?.promesa === promesa) enCurso = null; });
    enCurso = { version, promesa };
    return promesa;
  };

  const ahora = () => {
    if (temporizador != null) { cancelar(temporizador); temporizador = null; }
    pendiente = false;
    if (enCurso && enCurso.version === escrituras) return enCurso.promesa;
    if (enCurso) {
      if (!encadenada) encadenada = enCurso.promesa.then(() => { encadenada = null; return ejecutar(); });
      return encadenada;
    }
    return ejecutar();
  };

  function refrescar(motivo = "guardado") {
    const { visible = true, editando = false } = estado() ?? {};
    if (decidir({ motivo, visible, editando }) === "pendiente") { pendiente = true; return Promise.resolve(false); }
    if (motivo === "guardado") ultimoGuardado = reloj();
    return ahora();
  }

  // Eventos de fuera (SSE, cola, foco, sondeo): se juntan `demora` ms. Devuelve "programado" | "pendiente" | "en-curso".
  function avisar(motivo = "asistencia") {
    const { visible = true, editando = false } = estado() ?? {};
    if (decidir({ motivo, visible, editando }) === "pendiente") { pendiente = true; return "pendiente"; }
    if (enCurso && enCurso.version === escrituras && reloj() - (ultimoGuardado ?? -Infinity) < tiempos.eco) return "en-curso";
    if (temporizador == null) {
      temporizador = programar(() => {
        temporizador = null;
        const { visible: v = true, editando: e = false } = estado() ?? {};
        if (decidir({ motivo, visible: v, editando: e }) === "pendiente") { pendiente = true; return; }
        ahora();
      }, tiempos.demora);
    }
    return "programado";
  }

  // Se cerró la edición o volvió la pestaña: lo que quedó pendiente se hace ahora.
  function reanudar() {
    if (!pendiente) return false;
    const { visible = true, editando = false } = estado() ?? {};
    if (!visible || editando) return false;
    avisar("pendiente");
    return true;
  }

  // Una escritura terminó bien (antes de refrescar): las recargas que ya iban no traen ese cambio.
  function marcarEscritura() {
    escrituras += 1;
    ultimoGuardado = reloj();
  }

  // ¿Es eco de un guardado propio? (para no mostrar «Asistencias actualizadas» justo después de guardar).
  const esEco = () => ultimoGuardado != null && reloj() - ultimoGuardado < tiempos.eco;

  return {
    refrescar,
    avisar,
    reanudar,
    marcarEscritura,
    esEco,
    hayPendiente: () => pendiente,
    ultimoRefresco: () => ultimoRefresco,
    vueltas: () => vueltas,
  };
}
