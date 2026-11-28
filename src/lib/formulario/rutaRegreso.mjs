// Regresar a donde estaba la persona al terminar un formulario en página (28/11/2026, permiso y acta en página; ver
// docs/sistema-diseno.md). Quien abre el formulario puede mandar ?volver=<ruta>; al guardar o cancelar se regresa ahí.
// Solo se aceptan rutas internas del panel («/panel/…»): un enlace con ?volver=https://otro-sitio no saca a nadie del
// sistema (redirección abierta). Si no hay volver o no es válido, se usa la ruta de siempre (la lista del módulo).

/** La ruta a la que se regresa: `volver` si es una ruta interna del panel; si no, `defecto`. */
export function rutaDeRegreso(volver, defecto) {
  if (typeof volver !== "string") return defecto;
  const ruta = volver.trim();
  if (!/^\/panel(?:[/?#]|$)/.test(ruta)) return defecto;
  // Sin «//» (otro dominio para el navegador), sin diagonal invertida ni espacios o caracteres de control.
  if (ruta.includes("//") || /[\\\s\u0000-\u001f]/.test(ruta)) return defecto;
  return ruta;
}

/** `ruta?clave=valor&…` sin los parámetros vacíos (null, undefined o ""). */
export function conParametros(ruta, parametros = {}) {
  const q = new URLSearchParams();
  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor === null || valor === undefined || valor === "") continue;
    q.set(clave, String(valor));
  }
  const texto = q.toString();
  return texto ? `${ruta}?${texto}` : ruta;
}
