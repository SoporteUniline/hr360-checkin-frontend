// «Avisos y felicitaciones» (campana del panel): lógica sin React para poder probarla con node --test.
// El servidor decide qué avisos ve cada sesión (RH/dueño: su empresa; jefe: su equipo) y arma los textos de WhatsApp
// del catálogo fijo; aquí solo se agrupan, se filtran y se describen. Ver docs/avisos-felicitaciones.md.

export const API = "/checador/avisos";
export const RUTA_PLANTILLAS = "/panel/plantillas-felicitacion";
export const RUTA_REGLAS = "/panel/reglas-aviso";
export const RUTA_CONTRATOS = "/panel/contratos";
// Sin sondeo agresivo: se refresca al abrir la campana y, como mucho, cada 10 minutos.
export const REFRESCO_MS = 10 * 60 * 1000;

export const FILTROS = Object.freeze([
  { clave: "todos", etiqueta: "Todos" },
  { clave: "cumpleanos", etiqueta: "Cumpleaños" },
  { clave: "aniversario", etiqueta: "Aniversarios" },
  { clave: "contrato", etiqueta: "Contratos" },
]);

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const diaSemana = (fecha) => new Date(`${fecha}T12:00:00Z`).getUTCDay();
const diaMes = (fecha) => Number(String(fecha).slice(8, 10));
const plural = (n, uno, varios) => (Number(n) === 1 ? uno : varios);

export const esFelicitable = (a) => a?.tipo === "cumpleanos" || a?.tipo === "aniversario";

export function filtrar(avisos = [], filtro = "todos") {
  return filtro === "todos" ? avisos : avisos.filter((a) => a.tipo === filtro);
}

export function conteos(avisos = []) {
  const c = { todos: avisos.length, cumpleanos: 0, aniversario: 0, contrato: 0 };
  for (const a of avisos) if (a.tipo in c) c[a.tipo] += 1;
  return c;
}

// Filtros que se muestran: «Todos» siempre; los demás solo si hay algo (como en la maqueta de celular).
export const filtrosVisibles = (avisos = []) => {
  const c = conteos(avisos);
  return FILTROS.filter((f) => f.clave === "todos" || c[f.clave] > 0).map((f) => ({ ...f, n: c[f.clave] }));
};

// Encabezado de cada grupo: «Hoy · miércoles 25», «Mañana · jueves 26», «Esta semana».
export function tituloGrupo(grupo, fecha) {
  if (grupo === "hoy") return `Hoy · ${DIAS[diaSemana(fecha)]} ${diaMes(fecha)}`;
  if (grupo === "manana") return `Mañana · ${DIAS[diaSemana(fecha)]} ${diaMes(fecha)}`;
  return "Esta semana";
}

// Grupos en orden hoy → mañana → esta semana, sin grupos vacíos. Respeta el orden que mandó el servidor.
export function agrupar(avisos = []) {
  const orden = ["hoy", "manana", "semana"];
  return orden
    .map((g) => {
      const items = avisos.filter((a) => a.grupo === g);
      return items.length ? { grupo: g, titulo: tituloGrupo(g, items[0].fecha), items } : null;
    })
    .filter(Boolean);
}

// Qué pasa, en una línea. En «esta semana» se antepone el día (Sáb 28 · …).
export function descripcion(a) {
  const area = a.area ? ` · ${a.area}` : "";
  const dia = a.grupo === "semana" ? `${DIAS_CORTOS[diaSemana(a.fecha)]} ${diaMes(a.fecha)} · ` : "";
  if (a.tipo === "cumpleanos") return a.grupo === "semana" ? `${dia}cumple ${a.edad} años` : `Cumple ${a.edad} años${area}`;
  if (a.tipo === "aniversario") {
    const anios = `${a.anios} ${plural(a.anios, "año", "años")} en la empresa`;
    return a.grupo === "semana" ? `${dia}${anios}` : `${anios}${area}`;
  }
  if (a.tipo === "contrato") return a.dias === 0 ? "Su contrato vence hoy · decide si renuevas" : `${dia}Vence su contrato · decide si renuevas`;
  return "";
}

export const enDias = (dias) => (dias === 0 ? "hoy" : dias === 1 ? "mañana" : `en ${dias} días`);

// Subtítulo del diálogo Felicitar: «Cumple 29 años hoy · Ventas».
export function subtituloFelicitar(a) {
  const cuando = enDias(a.dias);
  const area = a.area ? ` · ${a.area}` : "";
  if (a.tipo === "cumpleanos") return `Cumple ${a.edad} años ${cuando}${area}`;
  return `${a.anios} ${plural(a.anios, "año", "años")} en la empresa ${cuando}${area}`;
}

export const yaFelicitado = (a) => Boolean(a?.felicitado?.whatsapp || a?.felicitado?.correo);

export function textoFelicitado(a) {
  const f = a?.felicitado;
  if (!f) return "";
  if (f.whatsapp && f.correo) return "Felicitado por WhatsApp y correo";
  if (f.whatsapp) return f.whatsapp_automatico ? "Felicitado por WhatsApp (automático)" : "Felicitado por WhatsApp";
  if (f.correo) return f.correo_automatico ? "Felicitado por correo (automático)" : "Felicitado por correo";
  return "";
}

// Número del botón: 0 no se muestra; más de 9, «9+».
export const textoContador = (n) => (!n ? "" : n > 9 ? "9+" : String(n));
export const etiquetaCampana = (n) => (n ? `Avisos de los próximos 7 días: ${n}` : "Avisos de los próximos 7 días: ninguno");

// Enlace wa.me con el texto ya escrito (el teléfono ya viene normalizado del servidor: 52 + 10 dígitos). Solo dígitos.
export function enlaceWhatsApp(telefono, texto) {
  const numero = String(telefono ?? "").replace(/\D/g, "");
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(String(texto ?? ""))}`;
}

// Pie de la campana: si hoy salen solas las felicitaciones (correo y/o WhatsApp) de cumpleaños / aniversario.
const canales = (x) => [x?.correo && "correo", x?.whatsapp && "WhatsApp"].filter(Boolean).join(" y ");
export function textoAutomatico(auto) {
  const c = canales(auto?.cumpleanos);
  const a = canales(auto?.aniversario);
  const hora = `${(auto?.cumpleanos ?? auto?.aniversario)?.hora ?? "9:05"} a. m.`;
  if (c && c === a) return `Los cumpleaños y aniversarios se felicitan solos por ${c} a las ${hora}`;
  if (c && !a) return `Los cumpleaños se felicitan solos por ${c} a las ${hora}`;
  if (a && !c) return `Los aniversarios se felicitan solos por ${a} a las ${hora}`;
  if (!c && !a) return "";
  return `Se felicitan solos los cumpleaños por ${c} y los aniversarios por ${a} a las ${hora}`;
}

// ---------- Plantillas de correo ----------
export const TIPOS = Object.freeze([
  { clave: "cumpleanos", etiqueta: "Cumpleaños", color: "#DB2777" },
  { clave: "aniversario", etiqueta: "Aniversario laboral", color: "#7C3AED" },
]);
export const DISENOS = Object.freeze([
  { clave: "festivo", etiqueta: "Festivo", descripcion: "color y confeti" },
  { clave: "elegante", etiqueta: "Elegante", descripcion: "oscuro y dorado" },
  { clave: "sencillo", etiqueta: "Sencillo", descripcion: "solo texto" },
]);

// Inserta «{variable}» donde está el cursor (o reemplaza la selección). Devuelve el texto y la nueva posición.
export function insertarVariable(texto, variable, inicio, fin = inicio) {
  const t = String(texto ?? "");
  const a = Number.isInteger(inicio) ? Math.max(0, Math.min(inicio, t.length)) : t.length;
  const b = Number.isInteger(fin) ? Math.max(a, Math.min(fin, t.length)) : a;
  const marca = `{${variable}}`;
  return { texto: `${t.slice(0, a)}${marca}${t.slice(b)}`, cursor: a + marca.length };
}

const TEXTOS = ["diseno", "asunto", "mensaje"];
const CAMPOS = [...TEXTOS, "envio_correo_auto", "aviso_campana", "envio_whatsapp_auto"];
const distinto = (campos) => (a, b) => campos.some((k) => (a?.[k] ?? null) !== (b?.[k] ?? null));
export const borradorDe = (p) => Object.fromEntries(CAMPOS.map((k) => [k, p?.[k]]));
export const hayCambios = distinto(CAMPOS);
export const textosCambiados = distinto(TEXTOS);

// Qué se manda al guardar: si la empresa no ha personalizado el correo y solo movió interruptores, se guardan solo los
// interruptores ({ sistema: true }) y sigue saliendo el correo de ADAMIA.
export function cuerpoGuardar(borrador, guardada) {
  const interruptores = { envio_correo_auto: borrador.envio_correo_auto, aviso_campana: borrador.aviso_campana, envio_whatsapp_auto: Boolean(borrador.envio_whatsapp_auto) };
  const revision = guardada?.revision ?? 0;
  if (!guardada?.personalizada && !textosCambiados(borrador, guardada)) return { sistema: true, ...interruptores, revision };
  return { diseno: borrador.diseno, asunto: borrador.asunto, mensaje: borrador.mensaje, ...interruptores, revision };
}

// Variables que no existen en el texto (para avisar antes de guardar; el servidor también lo valida).
export function variablesDesconocidas(texto, variables) {
  const validas = new Set([...variables, "area", "anios", "anos"]);
  return [...new Set([...String(texto ?? "").matchAll(/\{([^{}\s]{1,20})\}/g)].map((m) => m[1]).filter((v) => !validas.has(v)))];
}

export const mensajeError = (e, porDefecto = "No se pudo completar. Intenta de nuevo.") => e?.response?.data?.error || porDefecto;
export const codigoError = (e) => e?.response?.data?.codigo || null;

// El iframe hereda el modo oscuro del equipo de quien edita (prefers-color-scheme), y el correo trae estilos para ese
// modo. Para la vista previa se fija el modo elegido: «light» apaga esas reglas y «dark» las aplica siempre.
export function htmlEnModo(html, modo) {
  if (!html) return html;
  const media = modo === "dark" ? "@media all" : "@media not all";
  return String(html)
    .replace(/@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)/gi, media)
    .replace(/(<meta\s+name=["'](?:supported-color-schemes|color-scheme)["']\s+content=["'])[^"']*(["'])/gi, `$1${modo}$2`);
}
