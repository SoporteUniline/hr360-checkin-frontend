"use client";

// El par «Qué pasó» (tipo) + «Motivo» (por qué): dos selects juntos, del mismo alto, con «Otro…» para escribir el motivo.
// Lo usan la fila de Asistencias (variante «fila»: se ven como texto, sin cuadro), el reloj del día, la vista móvil y
// Permisos (variante «campo»). Reglas y opciones en lib/asistencia/quePasoMotivo.mjs; este componente solo dibuja.
import { GOCES } from "@/lib/asistencia/tiposGoce.mjs";
import { goceTxt } from "@/lib/asistencia/quePasoMotivo.mjs";

const FLECHA = (
  <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" fill="none">
    <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

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

function Select({ etiqueta, aria, valor, onCambio, opciones, vacio, variante, movil, disabled, error, autoFocus }) {
  const sel = (
    <span className={`relative inline-flex min-w-0 ${variante === "fila" ? "max-w-full" : "w-full"}`}>
      <select aria-label={aria} value={valor} disabled={disabled} autoFocus={autoFocus} onChange={(e) => onCambio(e.target.value)}
        className={claseCampo({ variante, movil, error })}>
        {vacio != null ? <option value="">{vacio}</option> : null}
        {opciones.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {FLECHA}
    </span>
  );
  if (!etiqueta) return sel;
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[12px] font-medium text-slate-500">{etiqueta}</span>
      {sel}
    </label>
  );
}

// tipo / motivo: valores del select ("" = vacío). motivoVisible: false en Asistencia y días de ley.
// tipoVacio / motivoVacio: texto de la opción vacía (null = sin opción vacía).
export default function QuePasoMotivo({
  variante = "campo", movil = false, etiquetas = false, nombre = "", disabled = false,
  tipoOpciones, tipoVacio = null, tipo, onTipo,
  motivoVisible = false, motivoOpciones = [], motivoVacio = "Sin motivo", motivo, onMotivo, esOtro = false, texto = "", onTexto,
  errorMotivo = false, autoFocusMotivo = false,
}) {
  const de = nombre ? ` de ${nombre}` : "";
  const fila = variante === "fila";
  return (
    <span className="flex min-w-0 flex-col gap-1.5" data-que-paso-motivo>
      <span className={fila ? "flex min-w-0 flex-wrap items-center gap-1" : `grid min-w-0 gap-3 ${movil ? "" : "sm:grid-cols-2"}`}>
        <Select etiqueta={etiquetas ? "Qué pasó" : null} aria={`Qué pasó${de}`} valor={tipo} onCambio={onTipo} opciones={tipoOpciones}
          vacio={tipoVacio} variante={variante} movil={movil} disabled={disabled} />
        {motivoVisible ? (
          <Select etiqueta={etiquetas ? "Motivo" : null} aria={`Motivo${de}`} valor={motivo} onCambio={onMotivo} opciones={motivoOpciones}
            vacio={motivoVacio} variante={variante} movil={movil} disabled={disabled} error={errorMotivo} autoFocus={autoFocusMotivo} />
        ) : null}
      </span>
      {motivoVisible && esOtro ? (
        <input aria-label="Escribe el motivo" placeholder="Escribe el motivo" value={texto} maxLength={120} disabled={disabled}
          onChange={(e) => onTexto?.(e.target.value)} className={claseCampo({ variante: "campo", movil }).replace("pr-8", "pr-2.5")} />
      ) : null}
    </span>
  );
}

// Goce del día que trae el motivo (o el tipo de ley): select si se cambia al aplicar; si no, texto con 🔒.
export function GoceMotivo({ goce, cambia, onCambio, movil = false, disabled = false, className = "" }) {
  if (!goce) return null;
  if (!cambia) {
    return <span data-goce-fijo className={`inline-flex items-center whitespace-nowrap text-[13px] text-slate-600 ${className}`}>🔒 {goceTxt(goce)}</span>;
  }
  return (
    <span className={`relative inline-flex min-w-0 ${className}`}>
      <select aria-label="Goce del día" value={goce} disabled={disabled} onChange={(e) => onCambio?.(e.target.value)}
        className={claseCampo({ variante: "campo", movil })}>
        {GOCES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
      {FLECHA}
    </span>
  );
}
