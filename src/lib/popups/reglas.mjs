// Reglas del lado del navegador para los pop-ups de venta (docs/popups-sitio.md del backend).
// Puras: se prueban con scripts/test-popups.mjs.
import { estadoCorreo, limpiarCorreo } from "../prospectos/reglas.mjs";

export const CLAVE_HISTORIAL = "adamia_popups_vistos";
const DIA_MS = 86400000;
const ANCHO_CELULAR = 768;

// Página pública → nombre de la regla. Fuera de inicio y blog no se muestran pop-ups.
export function paginaDe(ruta) {
  const r = String(ruta ?? "").replace(/\/+$/, "") || "/";
  if (r === "/") return "inicio";
  if (r === "/blog") return "blog";
  if (r.startsWith("/blog/")) return "articulos";
  return null;
}

export function dispositivoAplica(popup, ancho) {
  if (popup.dispositivos === "escritorio") return ancho >= ANCHO_CELULAR;
  if (popup.dispositivos === "celular") return ancho < ANCHO_CELULAR;
  return true;
}

// ¿Ya lo vio dentro de su frecuencia? 0 días = puede volver a salir en otra visita.
export function vistoReciente(popup, historial, ahora) {
  const visto = Number(historial?.[popup.id]);
  const dias = Number(popup.frecuencia_dias) || 0;
  if (!Number.isFinite(visto) || dias <= 0) return false;
  return ahora - visto < dias * DIA_MS;
}

// El primero (ya vienen por prioridad) que aplique al dispositivo, no visto en su frecuencia ni en esta visita.
export function elegirPopup(popups, { ancho, historial = {}, vistosEnVisita = [], ahora = Date.now() }) {
  return (popups ?? []).find(
    (p) => dispositivoAplica(p, ancho) && !vistoReciente(p, historial, ahora) && !vistosEnVisita.includes(p.id),
  ) ?? null;
}

// Segundos de espera del disparador «tiempo» (mínimo 3: nunca encima de la página al entrar).
export const esperaSegundos = (popup) => Math.max(3, Number(popup?.segundos) || 8);

// Enlace interno (se navega en la misma pestaña) o externo https (nueva pestaña).
export const esEnlaceExterno = (url) => /^https:\/\//i.test(String(url ?? ""));

export function leerHistorial(almacen) {
  try {
    const datos = JSON.parse(almacen?.getItem(CLAVE_HISTORIAL) ?? "{}");
    return datos && typeof datos === "object" && !Array.isArray(datos) ? datos : {};
  } catch {
    return {};
  }
}

export function guardarVisto(almacen, id, ahora = Date.now()) {
  try {
    const historial = leerHistorial(almacen);
    historial[id] = ahora;
    almacen?.setItem(CLAVE_HISTORIAL, JSON.stringify(historial));
  } catch {
    // Sin almacenamiento (incógnito, bloqueado): se limita a una vez por visita.
  }
}

// Si el botón lleva a Contratar y hay cupón, se manda ya escrito (?cupon=).
export function enlaceConCupon(url, cupon) {
  if (!cupon || !String(url ?? "").startsWith("/contratar-plan")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}cupon=${encodeURIComponent(cupon)}`;
}

// "2026-11-30 23:59:00" → "30 de noviembre" (la fecha ya viene en hora de la Ciudad de México).
export function validoHasta(fechaFin) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(fechaFin ?? ""));
  if (!m) return null;
  const fecha = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12));
  return fecha.toLocaleDateString("es-MX", { day: "numeric", month: "long", timeZone: "UTC" });
}

// ── Formulario «Conversemos» del pop-up ──────────────────────────────────────────────────────────────
// Lada del celular: México por defecto y otros países frecuentes. `digitos` = longitud del número nacional.
export const LADAS = [
  { iso: "MX", pais: "México", codigo: "52", bandera: "🇲🇽", digitos: [10], ejemplo: "55 1234 5678" },
  { iso: "US", pais: "Estados Unidos", codigo: "1", bandera: "🇺🇸", digitos: [10], ejemplo: "212 555 0199" },
  { iso: "CA", pais: "Canadá", codigo: "1", bandera: "🇨🇦", digitos: [10], ejemplo: "416 555 0199" },
  { iso: "GT", pais: "Guatemala", codigo: "502", bandera: "🇬🇹", digitos: [8], ejemplo: "5123 4567" },
  { iso: "CO", pais: "Colombia", codigo: "57", bandera: "🇨🇴", digitos: [10], ejemplo: "321 123 4567" },
  { iso: "PE", pais: "Perú", codigo: "51", bandera: "🇵🇪", digitos: [9], ejemplo: "912 345 678" },
  { iso: "CL", pais: "Chile", codigo: "56", bandera: "🇨🇱", digitos: [9], ejemplo: "9 1234 5678" },
  { iso: "AR", pais: "Argentina", codigo: "54", bandera: "🇦🇷", digitos: [10, 11], ejemplo: "11 2345 6789" },
  { iso: "ES", pais: "España", codigo: "34", bandera: "🇪🇸", digitos: [9], ejemplo: "612 345 678" },
];
export const LADA_PREDETERMINADA = "MX";
export const ladaDe = (iso) => LADAS.find((l) => l.iso === iso) ?? LADAS[0];
export const soloDigitos = (v) => String(v ?? "").replace(/\D/g, "");
export const celularValido = (iso, celular) => ladaDe(iso).digitos.includes(soloDigitos(celular).length);
export const celularInternacional = (iso, celular) => `+${ladaDe(iso).codigo}${soloDigitos(celular)}`;

// El botón se habilita con nombre (2+ caracteres), celular válido para su lada y el aviso de privacidad aceptado.
// El correo es opcional: solo detiene si está mal escrito o si marcó «Quiero recibir noticias» sin escribirlo.
export const datosContactoValidos = ({ nombre, iso, celular, acepta, correo = "", noticias = false }) =>
  String(nombre ?? "").trim().length >= 2 && celularValido(iso, celular) && acepta === true && estadoCorreo({ correo, noticias }).valido;

// Mismo canal que /contacto: los datos llegan al WhatsApp de ventas de ADAMIA.
export const WHATSAPP_VENTAS = "523171288029";
export function mensajeContacto({ nombre, iso, celular, correo, titulo, cupon }) {
  const lada = ladaDe(iso);
  const conCorreo = estadoCorreo({ correo }).valido && limpiarCorreo(correo);
  return [
    "Hola ADAMIA, quiero conocerla con una llamada.",
    "",
    `Nombre: ${String(nombre ?? "").trim()}`,
    `Celular: +${lada.codigo} ${soloDigitos(celular)} (${lada.pais})`,
    ...(conCorreo ? [`Correo: ${limpiarCorreo(correo)}`] : []),
    `Promoción: ${titulo}${cupon ? ` (cupón ${cupon})` : ""}`,
  ].join("\n");
}
export const enlaceWhatsApp = (texto) => `https://wa.me/${WHATSAPP_VENTAS}?text=${encodeURIComponent(texto)}`;
