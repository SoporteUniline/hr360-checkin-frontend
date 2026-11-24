// Intentos fallidos de checar con el rostro, como los ve RH en la ficha (pestaña Reconocimiento).
// El registro lo hace el reloj (kiosco o app) con su motivo y su %; aquí solo se traduce a texto claro, sin términos técnicos.
import { porcentaje } from "./lecturas.mjs";
import { fechaCorta } from "./estadoRostro.mjs";

export const DONDE = Object.freeze({ kiosco: "Reloj de la empresa", app: "App del empleado" });
export const POSE_TEXTO = Object.freeze({ frente: "Frente", arriba: "Arriba", abajo: "Abajo", izquierda: "Izquierda", derecha: "Derecha" });

const pct = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : porcentaje(Number(v)));

// «No se parecía lo suficiente (91 %)», «Se parecía a dos personas», «El código no coincide con la cara (88 %)»…
export function textoMotivo(intento) {
  const p = pct(intento?.mejor);
  const conPct = (t) => (p == null ? t : `${t} (${p} %)`);
  switch (intento?.motivo) {
    case "sin_coincidencia":
      return conPct("No se parecía lo suficiente");
    case "ambiguo":
      return "Se parecía a dos personas";
    case "codigo_no_coincide":
      return conPct("El código no coincide con la cara");
    case "codigo_invalido":
      return "Escribió un código que no existe";
    case "sin_referencias":
      return "No tenía rostro registrado";
    default:
      return "No se pudo reconocer";
  }
}

// Fila lista para la tabla de la ficha.
export function filaIntento(intento, ahora = new Date()) {
  return {
    id: intento?.id ?? `${intento?.creado_en}-${intento?.motivo}`,
    cuando: fechaCorta(intento?.creado_en, ahora) || "—",
    donde: DONDE[intento?.modo] ?? "—",
    metodo: intento?.metodo === "codigo_cara" ? "Código y cara" : "Solo cara",
    motivo: textoMotivo(intento),
    porcentaje: pct(intento?.mejor),
  };
}

// Poses registradas: acepta [{ pose }] o ['frente', …]. Sin referencias nuevas, el rostro anterior cuenta como 1 (frente).
export function resumenReferencias(referencias, tieneRostro) {
  const poses = (Array.isArray(referencias) ? referencias : [])
    .map((r) => (typeof r === "string" ? r : r?.pose))
    .filter((p) => POSE_TEXTO[p]);
  const unicas = Object.keys(POSE_TEXTO).filter((p) => poses.includes(p));
  if (unicas.length)
    return {
      total: unicas.length,
      poses: unicas,
      texto: `${unicas.length} ${unicas.length === 1 ? "foto" : "fotos"}: ${unicas.map((p) => POSE_TEXTO[p]).join(", ")}`,
      anterior: false,
    };
  if (tieneRostro) return { total: 1, poses: ["frente"], texto: "1 foto (registro anterior, de frente)", anterior: true };
  return { total: 0, poses: [], texto: "Sin fotos registradas", anterior: false };
}

// 409 ROSTRO_PARECIDO al registrar: mensaje genérico (no dice a quién se parece).
export const MENSAJE_ROSTRO_PARECIDO = "Tu rostro se parece mucho al de otra persona registrada. Vuelve a tomar las fotos con buena luz.";
export function esRostroParecido(e) {
  const d = e?.response?.data;
  return e?.response?.status === 409 && (d?.code === "ROSTRO_PARECIDO" || d?.codigo === "ROSTRO_PARECIDO");
}
export const mensajeRegistro = (e, porDefecto) =>
  esRostroParecido(e)
    ? e.response.data.error || e.response.data.mensaje || MENSAJE_ROSTRO_PARECIDO
    : e?.response?.data?.error || porDefecto;
