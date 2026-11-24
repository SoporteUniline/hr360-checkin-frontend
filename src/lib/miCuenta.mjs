// Mi cuenta del panel (24/11/2026, rediseño pedido por el dueño: «hazlo igual de bonito como todo lo que tenemos»).
// Lógica pura, sin React ni navegador: la usan src/app/panel/cuenta/* y la prueba scripts/test-mi-cuenta.mjs.
//
// - Las recomendaciones de contraseña son guía visible; NO bloquean el guardado. La validación que manda sigue siendo
//   la de siempre (ambos campos y que coincidan), igual que el servidor (PUT /users/update-password/:id).

// Nombre del rol para mostrar en la tarjeta de identidad.
const ROLES = {
  Admin: "Administrador general",
  Recruiter: "Administrador del panel",
  User: "Administrador del panel",
  Empleado: "Empleado",
};
export function etiquetaRol(tipo) {
  if (!tipo) return "";
  return ROLES[tipo] ?? String(tipo);
}

// Recomendaciones de seguridad, evaluadas en vivo mientras se escribe.
export function recomendacionesContrasena(valor) {
  const s = String(valor ?? "");
  return [
    { id: "largo", texto: "Al menos 8 caracteres", cumple: s.length >= 8 },
    { id: "letras-numeros", texto: "Letras y números", cumple: /[A-Za-zÁÉÍÓÚÑÜáéíóúñü]/.test(s) && /\d/.test(s) },
    { id: "simbolo", texto: "Un símbolo (por ejemplo ! # $ %)", cumple: /[^A-Za-zÁÉÍÓÚÑÜáéíóúñü\d\s]/.test(s) },
  ];
}

// Misma validación que tenía la pantalla (y la única que aplica el servidor): ambos campos y que coincidan.
// Regresa el mensaje de error o null si se puede enviar.
export function errorCambioContrasena({ password, confirmPassword } = {}) {
  if (!password || !confirmPassword) return "Por favor completa ambos campos.";
  if (password !== confirmPassword) return "Las contraseñas no coinciden.";
  return null;
}

// Estado de la confirmación para el aviso junto al segundo campo: "vacio" | "coincide" | "no-coincide".
export function estadoConfirmacion(password, confirmPassword) {
  if (!confirmPassword) return "vacio";
  return password === confirmPassword ? "coincide" : "no-coincide";
}

// Nombre de la empresa activa del usuario para la tarjeta de identidad.
export function nombreEmpresaActiva(dataUser, idEmpresa) {
  const id = idEmpresa ?? dataUser?.id_empresa;
  const empresa = (dataUser?.empresas_detalle ?? []).find((e) => String(e.id_empresa) === String(id));
  return empresa?.nombre ?? empresa?.nombre_empresa ?? dataUser?.nombre_empresa ?? "";
}
