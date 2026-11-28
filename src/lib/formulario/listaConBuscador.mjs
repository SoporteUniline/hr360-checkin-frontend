// Reglas PURAS de la lista desplegable con buscador (28/11/2026, pedido del dueño: «todo lo que viene de un catálogo
// lleva buscador»). Las usa src/components/formulario/ListaConBuscador.jsx y se prueban en
// scripts/test-lista-buscador.mjs. Sin React, para poder probarlas con node --test.
//
// Regla del sistema de diseño (docs/sistema-diseno.md): una lista de más de 7 opciones o que viene de un catálogo va con
// buscador; si es catálogo, con «+ Crear "texto"» que abre una ventana chica.

/** Máximo de opciones de una lista fija sin buscador (modalidad, moneda…). Más que esto → con buscador. */
export const MAXIMO_SIN_BUSCADOR = 7;

/** Texto sin acentos, en minúsculas y con un solo espacio: «  José  Ñúñez » → «jose nunez». */
export const normalizar = (texto) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/**
 * Las opciones que coinciden con lo que se escribe, sin importar acentos ni mayúsculas. Cada palabra escrita debe
 * aparecer en la etiqueta o en el detalle (en cualquier orden): «ana ruiz» encuentra «Ana Torres Ruiz».
 * Primero las que EMPIEZAN con lo escrito, luego las demás; dentro de cada grupo, el orden original.
 */
export function filtrarOpciones(opciones = [], consulta = "") {
  const palabras = normalizar(consulta).split(" ").filter(Boolean);
  if (!palabras.length) return opciones;
  const inicio = normalizar(consulta);
  const coinciden = opciones.filter((o) => {
    const texto = normalizar(`${o.label} ${o.detalle ?? ""}`);
    return palabras.every((p) => texto.includes(p));
  });
  const empiezan = coinciden.filter((o) => normalizar(o.label).startsWith(inicio));
  return [...empiezan, ...coinciden.filter((o) => !empiezan.includes(o))];
}

/** ¿Ya hay una opción que se llama exactamente así (sin importar acentos ni mayúsculas)? */
export const existeOpcion = (opciones = [], texto = "") => {
  const t = normalizar(texto);
  return Boolean(t) && opciones.some((o) => normalizar(o.label) === t);
};

/** Texto de un valor guardado que ya no está en el catálogo (un contrato viejo): se ve y se conserva. */
export const etiquetaFueraDeCatalogo = (valor) => `${valor} (no está en el catálogo)`;

/**
 * Las opciones a mostrar: si el valor guardado no está en el catálogo (p. ej. un puesto escrito a mano en un contrato
 * viejo), va primero como «Vendedorx (no está en el catálogo)» para que se vea y no se borre al guardar.
 * `vacia`: texto de la opción sin valor («Sin jefe directo»), o null si no se puede dejar vacío.
 */
export function opcionesParaMostrar(opciones = [], valor = "", { vacia = null } = {}) {
  const v = String(valor ?? "");
  const lista = [...opciones];
  if (v && !opciones.some((o) => String(o.value) === v)) lista.unshift({ value: v, label: etiquetaFueraDeCatalogo(v), fueraDeCatalogo: true });
  if (vacia) lista.unshift({ value: "", label: vacia, vacia: true });
  return lista;
}

/** «+ Crear "texto"» solo si se escribió algo, se puede crear y no existe ya con ese nombre. */
export const puedeOfrecerCrear = (opciones, consulta, { sePuedeCrear = false } = {}) =>
  Boolean(sePuedeCrear) && Boolean(String(consulta ?? "").trim()) && !existeOpcion(opciones, consulta);

/** Siguiente opción activa con las flechas (da la vuelta). total = cuántas hay (incluida «Crear»). */
export function moverActiva(actual, tecla, total) {
  if (!total) return -1;
  if (tecla === "Home") return 0;
  if (tecla === "End") return total - 1;
  if (tecla === "ArrowDown") return actual < 0 ? 0 : (actual + 1) % total;
  if (tecla === "ArrowUp") return actual < 0 ? total - 1 : (actual - 1 + total) % total;
  return actual;
}
