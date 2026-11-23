// Teléfonos de WhatsApp (R1): se guardan como dígitos con lada de país; se muestran legibles.

// «+52 55 1234 5678». Quita el «1» histórico de celulares mexicanos (521…). Otros países: «+<dígitos>».
export function formatearTelefono(valor) {
  const digitos = String(valor ?? "").replace(/\D/g, "");
  if (!digitos) return "";
  let nacional = null;
  if (digitos.length === 13 && digitos.startsWith("521")) nacional = digitos.slice(3);
  else if (digitos.length === 12 && digitos.startsWith("52")) nacional = digitos.slice(2);
  else if (digitos.length === 10 && !String(valor).trim().startsWith("+")) nacional = digitos;
  if (nacional) {
    const lada = /^(55|56|33|81)/.test(nacional) ? 2 : 3;
    const resto = nacional.slice(lada);
    const corte = resto.length - 4;
    return `+52 ${nacional.slice(0, lada)} ${resto.slice(0, corte)} ${resto.slice(corte)}`;
  }
  return `+${digitos}`;
}

// Nombre que se muestra en la lista: el del contacto o, si no hay, su teléfono.
export function nombreContacto(contacto) {
  const nombre = String(contacto?.nombre ?? "").trim();
  return nombre || formatearTelefono(contacto?.telefono) || "Contacto sin nombre";
}

// Iniciales para el avatar (máximo 2). Sin nombre: «#».
export function iniciales(contacto) {
  const nombre = String(contacto?.nombre ?? "").trim();
  if (!nombre) return "#";
  const partes = nombre.split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toLocaleUpperCase("es-MX");
}
