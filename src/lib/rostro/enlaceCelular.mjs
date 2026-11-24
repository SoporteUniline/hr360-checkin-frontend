// «Continuar desde el celular»: reglas puras del enlace QR para registrar el rostro. Las usan el diálogo de
// la ficha (RostroCelular.jsx) y la página pública del celular (/rostro/[token]). Pruebas: scripts/test-rostro-celular.mjs.
import qrcode from "qrcode-generator";

export const INTERVALO_ESTADO_MS = 2500; // el escritorio pregunta cada 2.5 s mientras el diálogo está abierto

// Dominio del enlace: NEXT_PUBLIC_RUTA_DOMAIN si está, si no el origen de la página. Sin «/» al final.
export function dominioEnlace(dominioEnv, origen) {
  const d = String(dominioEnv ?? "").trim() || String(origen ?? "").trim();
  return d.replace(/\/+$/, "");
}

export const urlEnlaceRostro = (dominio, token) => `${dominio}/rostro/${encodeURIComponent(token)}`;

// 900 → «15:00»; nunca negativo.
export function cuentaRegresiva(segundos) {
  const s = Math.max(0, Math.floor(Number(segundos) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Momento (ms) en que vence, a partir de los segundos que dio el servidor (así no depende del reloj de la computadora).
export const venceEn = (segundos, ahora = Date.now()) => ahora + Math.max(0, Number(segundos) || 0) * 1000;
export const segundosHasta = (vence, ahora = Date.now()) => Math.max(0, Math.ceil((vence - ahora) / 1000));

// Qué hace el escritorio con el estado que responde el servidor.
export function trasEstado(estado) {
  if (estado === "usado") return { seguir: false, resultado: "usado" };
  if (estado === "expirado") return { seguir: false, resultado: "expirado" };
  return { seguir: true, resultado: null };
}

export const primerNombre = (nombre) => String(nombre ?? "").trim().split(/\s+/)[0] || "la persona";
export const mensajeListo = (nombre) => `Listo, el rostro de ${primerNombre(nombre)} quedó registrado desde el celular.`;

// Errores de la página pública. fin = el enlace ya no sirve (no tiene caso reintentar).
const ERRORES = {
  ENLACE_INVALIDO: { titulo: "Este enlace no es válido", texto: "Revisa que lo hayas copiado completo o pide uno nuevo a Recursos Humanos.", fin: true },
  ENLACE_USADO: { titulo: "Este enlace ya se usó", texto: "El rostro ya se registró con este enlace. Si necesitas hacerlo otra vez, pide uno nuevo a Recursos Humanos.", fin: true },
  ENLACE_VENCIDO: { titulo: "Este enlace venció", texto: "Los enlaces duran 15 minutos. Pide uno nuevo a Recursos Humanos.", fin: true },
  INTENTOS_AGOTADOS: { titulo: "Se agotaron los intentos", texto: "Por seguridad este enlace ya no acepta más intentos. Pide uno nuevo a Recursos Humanos.", fin: true },
  SIN_MIGRACION: { titulo: "Función no disponible", texto: "Esta función aún no está activa. Avisa a Recursos Humanos.", fin: true },
};
export function errorPublico(e) {
  const codigo = e?.response?.data?.codigo;
  if (ERRORES[codigo]) return { codigo, ...ERRORES[codigo] };
  if (e?.response?.status === 404) return { codigo: "ENLACE_INVALIDO", ...ERRORES.ENLACE_INVALIDO };
  // 409: el rostro se parece mucho al de otra persona registrada. Se puede volver a intentar (mensaje genérico, sin nombres).
  if (e?.response?.status === 409 && (codigo === "ROSTRO_PARECIDO" || e?.response?.data?.code === "ROSTRO_PARECIDO")) {
    const quedan = Number(e.response.data.intentos_restantes);
    const texto = e.response.data.error || "Tu rostro se parece mucho al de otra persona registrada. Vuelve a tomar las fotos con buena luz.";
    return { codigo: "ROSTRO_PARECIDO", titulo: "Vuelve a tomar las fotos", texto: Number.isFinite(quedan) ? `${texto} Te ${quedan === 1 ? "queda 1 intento" : `quedan ${quedan} intentos`} con este enlace.` : texto, fin: quedan === 0 };
  }
  if (e?.response?.status === 429) return { codigo: "DEMASIADAS", titulo: "Demasiados intentos", texto: "Espera unos minutos e intenta de nuevo.", fin: false };
  return { codigo: codigo ?? "RED", titulo: "No pudimos continuar", texto: e?.response?.data?.error || "Revisa tu conexión a internet e intenta de nuevo.", fin: false };
}

// Matriz del QR (corrección M, versión automática). Se dibuja en el navegador: el enlace no se manda a servicios externos.
export function matrizQr(texto) {
  const qr = qrcode(0, "M");
  qr.addData(String(texto));
  qr.make();
  const n = qr.getModuleCount();
  return { n, oscuro: (fila, col) => qr.isDark(fila, col) };
}

// Trazo SVG (un solo path) de la matriz, con margen de 4 módulos (zona de silencio que pide el estándar).
export function trazoQr(texto, margen = 4) {
  const { n, oscuro } = matrizQr(texto);
  let d = "";
  for (let f = 0; f < n; f += 1) for (let c = 0; c < n; c += 1) if (oscuro(f, c)) d += `M${c + margen} ${f + margen}h1v1h-1z`;
  return { tamano: n + margen * 2, d };
}
