// Estado del rostro registrado en la ficha: «Registrado desde el celular el 23 nov, 5:15 p.m.», con el
// último cambio del historial rostro_actualizaciones (GET /checador/mi-espacio/rostro/empleado/:id, el mismo que usa
// AvisoRostroApp). Sin historial (rostros anteriores a la migración) solo dice «Rostro registrado».
const ORIGEN = { celular: "desde el celular", empleado: "desde la app", rh: "desde la ficha" };

export function fechaCorta(valor, ahora = new Date()) {
  const d = new Date(`${String(valor).replace(" ", "T")}${/[zZ]|[+-]\d\d:?\d\d$/.test(String(valor)) ? "" : "Z"}`);
  if (Number.isNaN(d.getTime())) return "";
  const zona = "America/Mexico_City";
  const anio = (x) => x.toLocaleString("es-MX", { timeZone: zona, year: "numeric" });
  const dia = d.toLocaleString("es-MX", { timeZone: zona, day: "numeric", month: "short", ...(anio(d) !== anio(ahora) ? { year: "numeric" } : {}) }).replace(".", "");
  const hora = d.toLocaleString("es-MX", { timeZone: zona, hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s+/g, " ").replace(/a\.?\s?m\.?/i, "a.m.").replace(/p\.?\s?m\.?/i, "p.m.");
  return `${dia}, ${hora}`;
}

export function estadoRostro(cambios, tieneRostro, ahora = new Date()) {
  const [ultimo] = Array.isArray(cambios) ? cambios : [];
  if (!ultimo && !tieneRostro) return { registrado: false, titulo: "Sin rostro", detalle: "" };
  if (!ultimo) return { registrado: true, titulo: "Rostro registrado", detalle: "" };
  const origen = ORIGEN[ultimo.origen] ?? "";
  const cuando = fechaCorta(ultimo.creado_en, ahora);
  const titulo = ultimo.origen === "celular" ? "Registrado desde el celular" : "Rostro registrado";
  return { registrado: true, titulo, origen: ultimo.origen, detalle: `Registrado ${origen}${cuando ? ` el ${cuando}` : ""}`.replace("Registrado  el", "Registrado el") };
}
