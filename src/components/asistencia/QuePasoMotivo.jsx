"use client";

// El par «Qué pasó» (tipo) + «Motivo» (por qué): dos selects juntos, del mismo alto, con «Otro…» para escribir el motivo.
// Lo usan la fila de Asistencias (variante «fila»: se ven como texto, sin cuadro), el reloj del día, la vista móvil y
// Permisos (variante «campo»). Reglas y opciones en lib/asistencia/quePasoMotivo.mjs; este componente solo dibuja.
// Los desplegables son SelectConIconos (fondo blanco, icono por opción): iconos en components/asistencia/iconosAsistencia.
import { GOCES } from "@/lib/asistencia/tiposGoce.mjs";
import { goceTxt } from "@/lib/asistencia/quePasoMotivo.mjs";
import SelectConIconos from "@/components/ui/SelectConIconos";
import { ICONO_GOCE, iconoMotivo, iconoRol, textoLimpio } from "@/components/asistencia/iconosAsistencia";

// Clases de un campo (select o input) según la variante; `movil` = 44 px y 16 px (iOS no hace zoom).
export function claseCampo({ variante = "campo", movil = false, error = false } = {}) {
  const alto = movil ? "h-11 text-base" : "h-9 text-[13.5px] max-sm:h-11 max-sm:text-base";
  if (variante === "fila") {
    return `${alto} max-w-full cursor-pointer appearance-none rounded-md border-0 bg-transparent py-0 pl-1.5 pr-7 text-slate-800 `
      + "[field-sizing:content] hover:bg-slate-100 focus:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-default";
  }
  return `${alto} w-full min-w-0 appearance-none rounded-lg border bg-white py-0 pl-2.5 pr-8 text-slate-900 focus:outline-none `
    + `focus:ring-2 focus:ring-blue-500/30 disabled:bg-slate-50 disabled:text-slate-500 ${error ? "border-rose-300 bg-rose-50" : "border-slate-200"}`;
}

const GRUPO_CLASE = { asistencia: "Día completo", inasistencia: "Día completo", dia: "Otros del catálogo", parcial: "Parte del día", ley: "Días de ley" };
// { value, label, clase, rol } de opcionesTipo / opcionesMotivo → opciones del desplegable con icono y grupo.
export const opcionesQuePaso = (opciones) => opciones.map((o) => ({
  valor: o.value, texto: textoLimpio(o.label), ...iconoRol(o.rol ?? (o.clase === "ley" ? "ley" : null)),
  grupo: o.historial ? "Anterior" : GRUPO_CLASE[o.clase] ?? null,
}));
export const opcionesDeMotivo = (opciones) => opciones.map((o) => ({ valor: o.value, texto: textoLimpio(o.label), ...iconoMotivo(o.label, { otro: o.otro }) }));

function Campo({ etiqueta, grande = false, children }) {
  if (!etiqueta) return children;
  return (
    <div className={grande ? "flex min-w-0 flex-col gap-2" : "flex min-w-0 flex-col gap-1"}>
      <span className={grande ? "text-etiqueta font-semibold text-texto" : "text-[12px] font-medium text-slate-500"} aria-hidden>{etiqueta}</span>
      {children}
    </div>
  );
}

// Icono de la opción vacía: «Asistencia» (reloj) con su palomita; «Injustificada» con la X; las demás sin icono.
function vacioTipoIcono(texto) {
  const t = textoLimpio(texto).toLowerCase();
  if (t === "asistencia") { const i = iconoRol("asistencia"); return { iconoVacio: i.icono, tonoVacio: i.tono }; }
  return {};
}
function vacioMotivoIcono(texto) {
  if (/injustificada/i.test(String(texto ?? ""))) { const i = iconoRol("inasistencia"); return { iconoVacio: i.icono, tonoVacio: i.tono }; }
  return {};
}

// tipo / motivo: valores del select ("" = vacío). motivoVisible: false en Asistencia y días de ley.
// grande: etiquetas y campos del sistema de diseño (formulario en página, dentro de data-formulario-grande).
// tipoVacio / motivoVacio: texto de la opción vacía (null = sin opción vacía).
export default function QuePasoMotivo({
  variante = "campo", movil = false, etiquetas = false, nombre = "", disabled = false,
  tipoOpciones, tipoVacio = null, tipo, onTipo,
  motivoVisible = false, motivoOpciones = [], motivoVacio = "Sin motivo", motivo, onMotivo, esOtro = false, texto = "", onTexto,
  errorMotivo = false, autoFocusMotivo = false, solo = null, // solo: null | "tipo" | "motivo" (columnas separadas)
  grande = false,
}) {
  const de = nombre ? ` de ${nombre}` : "";
  const fila = variante === "fila";
  return (
    <span className="flex min-w-0 flex-col gap-1.5" data-que-paso-motivo>
      <span className={fila ? "flex min-w-0 flex-wrap items-center gap-1" : `grid min-w-0 gap-3 ${movil ? "" : "sm:grid-cols-2"}`}>
        {solo === "motivo" ? null : <Campo etiqueta={etiquetas ? "Qué pasó" : null} grande={grande}>
          <SelectConIconos aria={`Qué pasó${de}`} valor={tipo} onCambio={onTipo} opciones={opcionesQuePaso(tipoOpciones)}
            vacio={tipoVacio} {...vacioTipoIcono(tipoVacio)} variante={variante} movil={movil} disabled={disabled} grande={grande} />
        </Campo>}
        {motivoVisible && solo !== "tipo" ? (
          <Campo etiqueta={etiquetas ? "Motivo" : null} grande={grande}>
            <SelectConIconos aria={`Motivo${de}`} valor={motivo} onCambio={onMotivo} opciones={opcionesDeMotivo(motivoOpciones)}
              vacio={motivoVacio} {...vacioMotivoIcono(motivoVacio)} variante={variante} movil={movil} disabled={disabled} error={errorMotivo} autoFocus={autoFocusMotivo} grande={grande} />
          </Campo>
        ) : null}
      </span>
      {motivoVisible && esOtro && solo !== "tipo" ? (
        <input aria-label="Escribe el motivo" placeholder="Escribe el motivo" value={texto} maxLength={120} disabled={disabled}
          onChange={(e) => onTexto?.(e.target.value)} className={claseCampo({ variante: "campo", movil }).replace("pr-8", "pr-2.5")}
          data-control={grande ? "campo" : undefined} />
      ) : null}
    </span>
  );
}

// Goce del día que trae el motivo (o el tipo de ley): select si se cambia al aplicar; si no, texto con 🔒.
export function GoceMotivo({ goce, cambia, onCambio, movil = false, disabled = false, className = "", grande = false }) {
  if (!goce) return null;
  if (!cambia) {
    return <span data-goce-fijo className={`inline-flex items-center whitespace-nowrap ${grande ? "text-cuerpo text-texto" : "text-[13px] text-slate-600"} ${className}`}>🔒 {goceTxt(goce)}</span>;
  }
  return (
    <span className={`inline-flex min-w-0 ${className}`}>
      <SelectConIconos aria="Goce del día" valor={goce} disabled={disabled} onCambio={(v) => onCambio?.(v)} movil={movil} grande={grande}
        opciones={GOCES.map(([v, t]) => ({ valor: v, texto: t, ...ICONO_GOCE[v] }))} />
    </span>
  );
}
