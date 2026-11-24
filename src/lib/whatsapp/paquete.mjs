// Paquete de entrevistas del agente y enlaces de la vacante.
// - Paquete (opción A): la empresa ve cuántas entrevistas lleva en el mes contra las incluidas; las extra se cobran
//   aparte y el agente nunca se detiene. El backend cuenta; aquí solo se arman los textos.
// - Bolsa de trabajo opcional: la página de la vacante (/vacante/<slug>, con su formulario) se comparte aunque la empresa
//   no publique en la bolsa y aunque WhatsApp esté apagado.

const entero = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
};
const miles = (n) => n.toLocaleString("es-MX");

// «32 de 200 entrevistas este mes» con paquete; «N entrevistas este mes» sin paquete.
export function textoEntrevistasMes(estado) {
  const mes = entero(estado?.entrevistas_mes);
  const incluidas = estado?.entrevistas_incluidas;
  if (incluidas === null || incluidas === undefined || incluidas === "") {
    return `${miles(mes)} ${mes === 1 ? "entrevista" : "entrevistas"} este mes`;
  }
  return `${miles(mes)} de ${miles(entero(incluidas))} entrevistas este mes`;
}

// Aviso ámbar cuando ya hay entrevistas extra; null si no hay.
export function avisoExtras(estado) {
  const extra = entero(estado?.entrevistas_extra);
  if (!extra) return null;
  return extra === 1
    ? "Llevas 1 entrevista extra este mes. Se cobra aparte."
    : `Llevas ${miles(extra)} entrevistas extra este mes. Cada una se cobra aparte.`;
}

// Columna del administrador: «entrevistas este mes / incluidas».
export function textoEntrevistasAdmin(empresa) {
  const mes = miles(entero(empresa?.entrevistas_mes));
  const incluidas = empresa?.entrevistas_incluidas;
  return incluidas === null || incluidas === undefined ? `${mes} / sin paquete` : `${mes} / ${miles(entero(incluidas))}`;
}

// Enlace de la página pública de la vacante. origen: NEXT_PUBLIC_RUTA_DOMAIN o el del navegador. null si falta algo.
export function enlacePaginaVacante(slug, origen) {
  const s = String(slug ?? "").trim();
  const o = String(origen ?? "").trim().replace(/\/+$/, "");
  if (!s || !/^https?:\/\//i.test(o)) return null;
  return `${o}/vacante/${encodeURIComponent(s)}`;
}

// Origen para los enlaces públicos: el dominio configurado o, si falta, el de la página abierta.
export function origenPublico(dominio = process.env.NEXT_PUBLIC_RUTA_DOMAIN) {
  const d = String(dominio ?? "").trim();
  if (/^https?:\/\//i.test(d)) return d.replace(/\/+$/, "");
  return typeof window !== "undefined" ? window.location.origin : "";
}

// Campo «Entrevistas incluidas al mes» del administrador (espejo del API: entero de 0 a 100,000 o vacío).
export const MAX_INCLUIDAS = 100000;
export function leerIncluidas(valor) {
  const t = String(valor ?? "").trim().replace(/[,\s]/g, "");
  if (t === "") return { valor: null };
  if (!/^\d+$/.test(t) || Number(t) > MAX_INCLUIDAS) return { error: "Escribe un número entero de 0 a 100,000, o déjalo vacío si no tiene paquete." };
  return { valor: Number(t) };
}
