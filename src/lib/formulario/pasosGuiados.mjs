// Reglas puras de los PASOS GUIADOS de un formulario grande (28/11/2026, mockup aprobado; docs/sistema-diseno.md).
// Las usa src/components/formulario/PasosGuiados.jsx y tienen pruebas en scripts/test-pasos-guiados.mjs.
// Sin React ni navegador: entran datos, salen datos.

/** Estados posibles de un paso, en el orden en que se revisan. */
export const ESTADOS_PASO = ["actual", "error", "listo", "pendiente"];

/** Texto chico que va debajo del nombre del paso en la lista de escritorio. */
export const TEXTO_ESTADO = {
  actual: "Estás aquí",
  error: "Falta corregir",
  listo: "Listo",
  pendiente: "Pendiente",
};

/**
 * Estado de un paso:
 *   - "actual"    el que se está llenando (gana a todo, aunque tenga errores: los errores se ven en sus campos);
 *   - "error"     tiene datos por corregir;
 *   - "listo"     ya se pasó por él (visitado) o el formulario ya estaba completo (editar);
 *   - "pendiente" todavía no se llega a él.
 */
export function estadoDePaso({ clave, actual, visitados = [], errores = 0, todosListos = false }) {
  if (clave === actual) return "actual";
  if (errores > 0) return "error";
  if (todosListos || visitados.includes(clave)) return "listo";
  return "pendiente";
}

/**
 * Agrega a cada paso su número (desde 1), su estado y cuántos errores tiene.
 * pasos: [{ clave, texto }]; errores: { [clave]: número de errores }.
 */
export function pasosConEstado(pasos, { actual, visitados = [], errores = {}, todosListos = false } = {}) {
  return pasos.map((paso, i) => {
    const n = Number(errores[paso.clave] ?? 0);
    return { ...paso, numero: i + 1, errores: n, estado: estadoDePaso({ clave: paso.clave, actual, visitados, errores: n, todosListos }) };
  });
}

/**
 * Avance para la barra de celular: «Paso 2 de 5» y 40 %. El porcentaje cuenta el paso actual como avanzado (paso 1 de 5
 * = 20 %, el último = 100 %), igual que el mockup. Si la clave no existe se toma el primer paso.
 */
export function avancePasos(pasos, actual) {
  const total = pasos.length;
  if (!total) return { numero: 0, total: 0, porcentaje: 0, texto: "", titulo: "" };
  const i = Math.max(0, pasos.findIndex((p) => p.clave === actual));
  const numero = i + 1;
  return { numero, total, porcentaje: Math.round((numero / total) * 100), texto: `Paso ${numero} de ${total}`, titulo: pasos[i].texto };
}

/** Clave del paso anterior y del siguiente (null en los extremos). */
export function vecinosDePaso(pasos, actual) {
  const i = pasos.findIndex((p) => p.clave === actual);
  if (i < 0) return { anterior: null, siguiente: pasos[0]?.clave ?? null };
  return { anterior: pasos[i - 1]?.clave ?? null, siguiente: pasos[i + 1]?.clave ?? null };
}
