// Prospectos del pop-up y de /contacto: correo opcional y casilla de noticias aparte (docs/prospectos.md del backend).
// Puras: se prueban con scripts/test-prospectos.mjs. El guardado está en ./guardar.js; el texto legal, aquí.

// Consentimiento de noticias. Si el texto cambia de fondo, cambia la versión (se guarda con cada constancia).
export const NOTICIAS = {
  id: "noticias",
  version: "2026-11-27",
  texto: "Quiero recibir noticias sobre reformas laborales, novedades de ADAMIA y consejos de RH",
};

// Mismo formato que valida el servidor (aceptacionesLegales.CORREO).
const CORREO = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
export const limpiarCorreo = (v) => String(v ?? "").trim().toLowerCase();
export const correoValido = (v) => CORREO.test(limpiarCorreo(v));

export const MENSAJES_CORREO = {
  falta: "Para recibir noticias escribe tu correo.",
  formato: "Revisa tu correo (ejemplo: nombre@empresa.com) o déjalo vacío.",
};

// ¿El correo deja enviar? Vacío está bien, salvo que quiera noticias. → { valido, error: null | "falta" | "formato" }
export function estadoCorreo({ correo, noticias }) {
  const limpio = limpiarCorreo(correo);
  if (!limpio) return noticias ? { valido: false, error: "falta" } : { valido: true, error: null };
  return correoValido(limpio) ? { valido: true, error: null } : { valido: false, error: "formato" };
}

// Teléfono escrito a mano (/contacto: «+52…», con espacios o guiones) → +<lada><número>, o null si no se puede saber.
// 10 dígitos sin lada = México (el sitio es mexicano); con + se respeta la lada que escribió.
export function celularDeTextoLibre(texto) {
  const crudo = String(texto ?? "").trim();
  const digitos = crudo.replace(/\D/g, "");
  if (crudo.startsWith("+") || crudo.startsWith("00")) {
    const sinCeros = crudo.startsWith("00") ? digitos.slice(2) : digitos;
    return /^[1-9]\d{7,14}$/.test(sinCeros) ? `+${sinCeros}` : null;
  }
  if (digitos.length === 10) return `+52${digitos}`;
  if (digitos.length === 12 && digitos.startsWith("52")) return `+${digitos}`;
  return null;
}

// Cuerpo de POST /checador/prospectos/publico. `origen`: { tipo: "popup", id, titulo } | { tipo: "contacto" }.
export function cuerpoProspecto({ nombre, celular, correo, origen, noticias, avisoVersion }) {
  const limpio = limpiarCorreo(correo);
  const quiere = noticias === true && correoValido(limpio);
  return {
    nombre: String(nombre ?? "").trim(),
    celular: celular || null,
    correo: correoValido(limpio) ? limpio : null,
    origen,
    aviso_version: avisoVersion,
    acepta_noticias: quiere,
    ...(quiere ? { noticias_version: NOTICIAS.version } : {}),
  };
}

// ── Panel /dashboard/prospectos ──────────────────────────────────────────────────────────────────────────────────
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
// "2026-11-27 10:15:00" (hora de la Ciudad de México, como la entrega el servidor) → "27 nov 2026, 10:15".
export function fechaCorta(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(String(v ?? ""));
  if (!m) return "—";
  return `${Number(m[3])} ${MESES[Number(m[2]) - 1]} ${m[1]}, ${m[4]}:${m[5]}`;
}

export const textoOrigen = (p) =>
  p?.origen_tipo === "contacto" ? "Página de contacto" : `Pop-up: ${p?.origen_titulo || `#${p?.origen_id ?? "?"}`}`;
export const valorOrigen = (o) => (o.origen_tipo === "contacto" ? "contacto" : `popup:${o.origen_id}`);

// "+525512345678" → "+52 55 1234 5678" (México); otras ladas se dejan como vienen.
export function celularLegible(v) {
  const t = String(v ?? "");
  const m = /^\+52(\d{2})(\d{4})(\d{4})$/.exec(t);
  return m ? `+52 ${m[1]} ${m[2]} ${m[3]}` : t || "—";
}

// Filtros de la pantalla → query del API (lo vacío no se manda). `csv`: descarga (por omisión solo con noticias).
export function consultaProspectos({ buscar = "", noticias = "", origen = "", pagina = 1, todos = false } = {}, { csv = false } = {}) {
  const q = new URLSearchParams();
  if (buscar.trim()) q.set("buscar", buscar.trim().slice(0, 100));
  if (noticias === "1" || noticias === "0") q.set("noticias", noticias);
  if (origen) q.set("origen", origen);
  if (csv) {
    if (todos) q.set("todos", "1");
  } else if (pagina > 1) q.set("pagina", String(pagina));
  const texto = q.toString();
  return texto ? `?${texto}` : "";
}

// ── Página /baja?token= ──────────────────────────────────────────────────────────────────────────────────────────
export const tokenBajaValido = (t) => /^[A-Za-z0-9_-]{43}$/.test(String(t ?? ""));

// Respuesta de POST /checador/prospectos/publico/baja → lo que ve la persona.
export function resultadoBaja(estado, cuerpo = {}) {
  if (estado === 200 && cuerpo?.ok) {
    return cuerpo.ya_estaba
      ? { tipo: "ya", titulo: "Ya estabas dado de baja", texto: "No te enviaremos noticias ni promociones. No tienes que hacer nada más." }
      : { tipo: "listo", titulo: "Listo, ya no te enviaremos noticias", texto: "Te dimos de baja de las noticias y promociones de ADAMIA. Si cambias de opinión, puedes volver a marcar la casilla en nuestra página." };
  }
  if (estado === 400 || estado === 404) {
    return { tipo: "invalido", titulo: "No encontramos este enlace", texto: "Revisa que hayas abierto el enlace completo de tu correo. Si sigues recibiendo correos, escríbenos y te damos de baja." };
  }
  return { tipo: "error", titulo: "No pudimos darte de baja en este momento", texto: "Intenta de nuevo en unos minutos." };
}
