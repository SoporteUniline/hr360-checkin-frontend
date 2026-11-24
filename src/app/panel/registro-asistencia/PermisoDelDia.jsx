"use client";

// «Permiso del día» del reloj (opcional): tipo parcial (entrada después de tiempo, salida antes, salida entre jornada),
// motivo del catálogo de motivos, horas no trabajadas y goce. Horas y goce solo se cambian si el tipo lo permite
// («se cambia al aplicar»); si no, se ven con 🔒. Calcula en vivo los minutos no trabajados con las checadas y el horario
// y dice en una línea lo que pasará en nómina. Lógica en lib/asistencia/tiposGoce.mjs (el servidor recalcula al guardar).
import { cn } from "@/lib/utils";
import {
  GOCES, HORAS, OTRO, aplicarTipo, errorPermiso, listaMotivos, minutosNoTrabajados, motivoAOpcion, normalizarTipo, puedeCambiar,
  textoNoTrabajadas, textoNomina,
} from "@/lib/asistencia/tiposGoce.mjs";

const CAMPO = "h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 text-[13.5px] text-slate-900 "
  + "focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:bg-slate-50 disabled:text-slate-500 max-sm:h-11 max-sm:text-base";
const ETQ = "text-[12px] font-medium text-slate-500";

function Campo({ etiqueta, nota, children }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className={ETQ}>{etiqueta}</span>
      {children}
      {nota ? <span className="text-[12px] text-slate-400">{nota}</span> : null}
    </label>
  );
}

// origen: el permiso vino de una solicitud aprobada en Permisos (id de la solicitud o true); se avisa al editarlo aquí.
export default function PermisoDelDia({ permiso, onCambio, tipos, motivos, regs, horario, mostrarError, origen = null, error: errorDado = null }) {
  const lista = Array.isArray(tipos) ? tipos : [];
  const tipo = permiso ? lista.find((t) => String(t.id) === String(permiso.id_tipo)) : null;
  const n = normalizarTipo(tipo);
  const pc = puedeCambiar(tipo);
  const cat = listaMotivos(motivos);
  // El motivo se edita como opción del catálogo u «Otro…» con texto; se guarda ya resuelto en permiso.motivo.
  const sel = permiso?._opcion != null ? { opcion: permiso._opcion, texto: permiso._texto ?? "" } : motivoAOpcion(permiso?.motivo, cat);
  const ponerMotivo = (opcion, texto) => onCambio({ ...permiso, _opcion: opcion, _texto: texto, motivo: opcion === OTRO ? texto : opcion });
  const minutos = n ? minutosNoTrabajados(n.alcance, regs, horario) : 0;
  const error = errorDado ?? (mostrarError ? errorPermiso(permiso) : "");
  const elegirTipo = (v) => {
    if (!v) return onCambio(null);
    const t = lista.find((x) => String(x.id) === v);
    onCambio({ ...aplicarTipo(t, permiso?.motivo ?? ""), _opcion: permiso?._opcion, _texto: permiso?._texto });
  };

  return (
    <section data-permiso-dia className="flex flex-col gap-2">
      <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-slate-500">Permiso del día <span className="font-normal normal-case tracking-normal">(opcional)</span></h3>
      <div className={cn("flex flex-col gap-3 rounded-xl border px-4 py-3", permiso ? "border-violet-200 bg-violet-50/40" : "border-slate-200")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Tipo (qué pasó)">
            <select aria-label="Tipo de permiso" value={permiso?.id_tipo ?? ""} onChange={(e) => elegirTipo(e.target.value)} className={CAMPO}>
              <option value="">Sin permiso</option>
              {lista.map((t) => <option key={t.id} value={String(t.id)}>{t.nombre}</option>)}
            </select>
          </Campo>
          {permiso ? (
            <Campo etiqueta="Motivo (por qué)">
              <select aria-label="Motivo del permiso" value={sel.opcion} onChange={(e) => ponerMotivo(e.target.value, sel.texto)}
                className={cn(CAMPO, error && !permiso.motivo?.trim() && "border-rose-300 bg-rose-50")}>
                <option value="">Elige el motivo…</option>
                {cat.map((m) => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
                <option value={OTRO}>Otro…</option>
              </select>
            </Campo>
          ) : null}
          {permiso && sel.opcion === OTRO ? (
            <Campo etiqueta="Escribe el motivo">
              <input aria-label="Escribe el motivo del permiso" value={sel.texto} maxLength={120} onChange={(e) => ponerMotivo(OTRO, e.target.value)} className={CAMPO} />
            </Campo>
          ) : null}
          {permiso && n ? (
            <>
              <Campo etiqueta="Horas no trabajadas" nota={pc.horas ? null : "🔒 Lo fija el tipo"}>
                <select aria-label="Horas no trabajadas" value={pc.horas ? permiso.horas : n.horas} disabled={!pc.horas}
                  onChange={(e) => onCambio({ ...permiso, horas: e.target.value })} className={CAMPO}>
                  {HORAS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                </select>
              </Campo>
              <Campo etiqueta="Goce del día" nota={pc.goce ? null : "🔒 Lo fija el tipo"}>
                <select aria-label="Goce del día" value={pc.goce ? permiso.goce : n.goce} disabled={!pc.goce}
                  onChange={(e) => onCambio({ ...permiso, goce: e.target.value })} className={CAMPO}>
                  {GOCES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                </select>
              </Campo>
            </>
          ) : null}
        </div>
        {permiso && n ? (
          <div data-permiso-calculo className="flex flex-col gap-0.5 text-[13.5px]">
            <b className="font-semibold text-violet-800">{textoNoTrabajadas(minutos, pc.horas ? permiso.horas : n.horas)}</b>
            <span className="text-slate-600">{textoNomina({ parcial: true, goce: pc.goce ? permiso.goce : n.goce, horas: pc.horas ? permiso.horas : n.horas, minutos })}</span>
          </div>
        ) : (
          <p className="text-[12.5px] text-slate-500">Si llegó tarde, salió antes o salió y regresó con permiso, elige el tipo: el día queda justificado y las horas se tratan como diga el catálogo.</p>
        )}
        {origen ? (
          <p data-permiso-origen className="text-[12.5px] text-slate-500">
            Viene de la solicitud{origen === true ? "" : ` #${origen}`} aprobada en Permisos; si lo cambias aquí, se corrige solo este día.
          </p>
        ) : null}
        {error ? <p role="alert" className="text-[13px] font-medium text-rose-700">{error}</p> : null}
      </div>
    </section>
  );
}
