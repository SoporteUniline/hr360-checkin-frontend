// Cambios sin guardar (23/11/2026, pedido del dueño: «en cuanto entre ya pueda editar» + «Guardar» + aviso al salir).
// Lógica pura, sin React ni navegador: la usan la ficha del empleado (FormularioEmpleado) y la guardia de salida común
// (components/cambios/CambiosPendientes.jsx). Probado en scripts/test-cambios-pendientes.mjs.
//
// - «Vacío» es lo mismo venga como venga: null, undefined, "", "sin-seleccion" (valor de los Select sin elegir) o [].
// - Un número y su texto son iguales (8 y "8"; 12000 y "12000.00"): la base de datos regresa números y los campos texto.
// - Una fecha a medianoche UTC ("2024-01-15T00:00:00.000Z") es igual a su día ("2024-01-15").
// - Objetos y listas se comparan por contenido; en objetos, una clave vacía es igual a una clave ausente.

const VACIOS = new Set(["", "sin-seleccion"]);
const FECHA_MEDIANOCHE = /^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.0+)?Z?$/;
const NUMERO = /^-?\d+(?:\.\d+)?$/;

export function esVacio(valor) {
  if (valor === null || valor === undefined) return true;
  if (typeof valor === "string") return VACIOS.has(valor);
  if (Array.isArray(valor)) return valor.length === 0;
  if (typeof valor === "object" && !(valor instanceof Date)) return Object.values(valor).every(esVacio);
  return false;
}

function comoTexto(valor) {
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? "" : valor.toISOString();
  const texto = String(valor);
  return FECHA_MEDIANOCHE.exec(texto)?.[1] ?? texto;
}

// ¿Dos valores de formulario dicen lo mismo?
export function valoresIguales(a, b) {
  const vacioA = esVacio(a);
  const vacioB = esVacio(b);
  if (vacioA || vacioB) return vacioA && vacioB;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => valoresIguales(v, b[i]));
  }
  const objA = typeof a === "object" && !(a instanceof Date);
  const objB = typeof b === "object" && !(b instanceof Date);
  if (objA || objB) {
    if (!objA || !objB) return false;
    const claves = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...claves].every((k) => valoresIguales(a[k], b[k]));
  }
  if (typeof a === "boolean" || typeof b === "boolean") return a === b;
  // Número contra texto numérico: se compara el valor (8 = "8.00"). Dos textos se comparan tal cual
  // (un NIP "0123" no es "123").
  if (typeof a === "number" || typeof b === "number") {
    const textoA = String(a).trim();
    const textoB = String(b).trim();
    if (NUMERO.test(textoA) && NUMERO.test(textoB)) return Number(textoA) === Number(textoB);
    return textoA === textoB;
  }
  return comoTexto(a) === comoTexto(b);
}

// Campos de primer nivel que cambiaron respecto a la base. `ignorar`: campos que no cuentan (derivados de otros o que
// se revisan aparte, como el rostro).
export function camposCambiados(base = {}, actual = {}, ignorar = []) {
  const fuera = new Set(ignorar);
  const claves = new Set([...Object.keys(base ?? {}), ...Object.keys(actual ?? {})]);
  return [...claves].filter((k) => !fuera.has(k) && !valoresIguales(base?.[k], actual?.[k])).sort();
}

// ¿Hay algo que se perdería al salir? Valores del formulario + lo que se guarda con la ficha y no vive en el formulario
// (foto nueva, rostro capturado con la cámara, contactos de emergencia en borrador de un empleado nuevo).
export function hayCambiosPendientes({ base, actual, ignorar = [], extras = [] } = {}) {
  return extras.some(Boolean) || camposCambiados(base, actual, ignorar).length > 0;
}

// Copia profunda de valores de formulario (texto, números, listas, objetos simples) para guardar la base.
export function copiarValores(valor) {
  if (Array.isArray(valor)) return valor.map(copiarValores);
  if (valor instanceof Date) return new Date(valor.getTime());
  if (valor && typeof valor === "object") return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, copiarValores(v)]));
  return valor;
}

// Clic en un enlace: ¿la guardia debe detenerlo para preguntar? Solo enlaces que navegan dentro de la app en esta misma
// pestaña. No se detienen: Ctrl/⌘/Shift/Alt + clic, rueda, target distinto de _self, descargas, otro origen,
// mailto:/tel:/blob:, ni un ancla (#) de la misma página.
export function debeDetenerEnlace({ href, origen, actual, target = "", descarga = false, boton = 0, teclas = {} } = {}) {
  if (!href || boton !== 0 || descarga) return false;
  if (teclas.meta || teclas.ctrl || teclas.shift || teclas.alt) return false;
  if (target && target !== "_self") return false;
  let destino;
  let aqui;
  try {
    aqui = new URL(actual);
    destino = new URL(href, aqui);
  } catch {
    return false;
  }
  if (!/^https?:$/.test(destino.protocol) || destino.origin !== origen) return false;
  const sinAncla = (u) => `${u.origin}${u.pathname}${u.search}`;
  if (destino.hash && sinAncla(destino) === sinAncla(aqui)) return false;
  return true;
}

// Ruta interna a la que se navega con el router (sin el origen).
export function rutaInterna(href, actual) {
  const u = new URL(href, actual);
  return `${u.pathname}${u.search}${u.hash}`;
}

// Resultado de «Guardar y salir»: solo se sale si el guardado terminó bien.
export function decidirTrasGuardar(guardado) {
  return guardado === true ? "salir" : "quedarse";
}
