// Asistencias › Tabla con el periodo «Hoy»: las filas divididas según la situación del momento (Requieren atención,
// En comida, Trabajando, Por entrar, Ya salieron, No laboran hoy). Funciones puras. Probado en scripts/test-situacion-hoy.mjs.
//
// La clasificación es la del Monitor: el mismo estadoHoy (hoy.mjs) sobre el mismo día normalizado (diaDesdeRegistro con
// la checada pasada a la zona de la empresa) y grupoMonitor (monitor.mjs) para decidir «Requieren atención» (incluye
// «llegó tarde» mientras trabaja). La tabla no tiene grupos de «Con permiso» ni «Saldrán tarde»: esas personas quedan en
// el grupo de su estado del momento (trabajando, ya salió, no labora…).
import { herramientasHoras } from "./horasEdicion.mjs";
import { ahoraEn, diaDesdeRegistro, estadoHoy } from "./hoy.mjs";
import { grupoMonitor } from "./monitor.mjs";

// Valor de «Agrupar» en Asistencias.
export const AGRUPAR_SITUACION = "situacion";

export const GRUPOS_SITUACION = [
  { clave: "atencion", titulo: "Requieren atención" },
  { clave: "comida", titulo: "En comida" },
  { clave: "trabajando", titulo: "Trabajando" },
  { clave: "por_entrar", titulo: "Por entrar" },
  { clave: "salieron", titulo: "Ya salieron" },
  { clave: "no_laboran", titulo: "No laboran hoy" },
];

// Grupo de estadoHoy → grupo de la tabla.
const POR_GRUPO_HOY = { atencion: "atencion", comida: "comida", trabajando: "trabajando", proximos: "por_entrar", salieron: "salieron", no_laboran: "no_laboran" };

// Resultado de estadoHoy → clave de GRUPOS_SITUACION.
export function situacionDeEstado(r) {
  if (grupoMonitor(r) === "atencion") return "atencion";
  return POR_GRUPO_HOY[r.grupo] ?? "no_laboran";
}

// Registro de /checador/asistencias → resultado de estadoHoy a la hora `ahoraMs`, igual que el Monitor
// (la marca de la base, hora de CDMX, se pasa a la zona de la empresa de la fila).
export function estadoDeRegistro(registro, zona, ahoraMs, cacheAhora = new Map()) {
  const z = registro?.zona_horaria || zona;
  if (!cacheAhora.has(z)) cacheAhora.set(z, ahoraEn(z, new Date(ahoraMs)));
  const { fechaLocal, horaLocal } = herramientasHoras(registro, z);
  const dia = diaDesdeRegistro(registro, (v) => `${fechaLocal(v)} ${horaLocal(v)}`);
  return estadoHoy(dia, cacheAhora.get(z).abs);
}

// Filas de la tabla → [[«Requieren atención», filas], …] en el orden de GRUPOS_SITUACION, sin grupos vacíos y
// conservando dentro de cada grupo el orden en que venían.
export function agruparPorSituacion(registros, zona, ahoraMs) {
  const cacheAhora = new Map();
  const enGrupo = new Map(GRUPOS_SITUACION.map((g) => [g.clave, []]));
  for (const registro of registros ?? []) {
    enGrupo.get(situacionDeEstado(estadoDeRegistro(registro, zona, ahoraMs, cacheAhora))).push(registro);
  }
  return GRUPOS_SITUACION.filter((g) => enGrupo.get(g.clave).length).map((g) => [g.titulo, enGrupo.get(g.clave)]);
}

// —— «Agrupar» por defecto ——
// `eleccion`: lo que el usuario eligió en «Agrupar» (undefined = no ha elegido; null = «Sin agrupar»).

export const esPeriodoHoy = (inicio, fin, hoy) => Boolean(hoy) && inicio === hoy && fin === hoy;

// Agrupación que se aplica: con Hoy y sin elección, «Situación de hoy»; con otro periodo no se divide por situación.
export function agruparEfectivo(eleccion, esHoy) {
  if (eleccion === undefined) return esHoy ? AGRUPAR_SITUACION : null;
  if (eleccion === AGRUPAR_SITUACION && !esHoy) return null;
  return eleccion;
}

// Al entrar o salir de Hoy, «Sin agrupar» y «Situación de hoy» vuelven al valor por defecto; las demás (unidad,
// departamento…) se conservan.
export const eleccionAlCambiarPeriodo = (eleccion) => (eleccion == null || eleccion === AGRUPAR_SITUACION ? undefined : eleccion);
