// Llevar el foco al campo con error SIN quitárselo a la persona (28/11/2026, INC-012: el acta perdía lo que se
// escribía). Lo usan los formularios por pasos (acta y contrato) al «Continuar» o «Guardar» con datos faltantes.
// Sin React: recibe el documento y cómo esperar, para poder probarlo en node (scripts/test-foco-campo.mjs).
//
// Antes cada formulario hacía `setTimeout(() => getElementById(id).focus(), 60)`: un foco A CIEGAS que llegaba más
// tarde. Si en ese rato la persona ya estaba en otro campo y escribiendo, el foco brincaba a «Fecha del incidente» a la
// mitad y lo que seguía tecleando caía en otro control (un <input type="date"> lo descarta): el acta se guardaba con
// «Testigos» o «Lugar» vacíos sin que nadie lo notara.
//
// Regla: el foco se mueve SOLO si sigue donde estaba al empezar la acción (el botón que se oprimió), o en ningún lado
// (body: el botón desapareció al cambiar de paso, o el celular no enfoca botones al tocarlos). Si la persona ya se fue
// a otro control, se respeta y no se mueve.

/** Espera a que React pinte el paso (dos cuadros) antes de buscar el campo. */
const despuesDePintar = (fn) => {
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => requestAnimationFrame(fn));
  else setTimeout(fn, 0);
};

/**
 * Llamar AL INICIO de la acción (antes de cualquier await), cuando el foco todavía está en el botón oprimido.
 * Regresa `enfocar(id)`: lleva el foco a ese campo después de pintar, salvo que la persona ya se haya movido.
 *   const enfocar = prepararFocoCampo();
 *   if (!(await revisarPaso())) enfocar("acta-fecha");
 * Opciones (para pruebas): documento, esperar(fn).
 */
export function prepararFocoCampo({ documento = globalThis.document, esperar = despuesDePintar } = {}) {
  const origen = documento?.activeElement ?? null;
  return (id) => {
    if (!documento || !id) return;
    esperar(() => {
      const actual = documento.activeElement;
      const libre = !actual || actual === origen || actual === documento.body;
      if (!libre) return; // la persona ya está en otro control: no se le quita el foco
      documento.getElementById(id)?.focus();
    });
  };
}
