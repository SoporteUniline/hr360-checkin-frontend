"use client";

// Campos del permiso por horas: tipo, horas y si se repone o se rebaja. Es de un solo día; horas en HH:mm.
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TIPOS_HORAS, TRATAMIENTOS } from "@/lib/asistencia/permisoHoras.mjs";
import { HORAS } from "@/lib/asistencia/tiposGoce.mjs";
import SelectConIconos from "@/components/ui/SelectConIconos";
import { ICONO_HORAS, ICONO_TIPO_HORAS } from "@/components/asistencia/iconosAsistencia";

const opcion = (activa) =>
  `flex-1 rounded-lg border px-3 py-2 text-left text-sm transition ${
    activa ? "border-blue-600 bg-blue-50 font-semibold text-blue-900" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
  }`;
// grande (28/11/2026, página de Permiso; docs/sistema-diseno.md): letra de 16/17 px, opciones de 48 px, texto secundario
// #4B5563 y la opción elegida con el color de «seleccionado» del sistema (no un fondo decorativo).
const opcionGrande = (activa) =>
  `min-h-12 flex-1 rounded-boton border px-4 py-2.5 text-left text-cuerpo transition-colors ${
    activa ? "border-2 border-brand bg-seleccion font-semibold text-seleccion-texto" : "border-borde-campo bg-white text-texto-boton hover:border-brand"
  }`;
const ESTILO = {
  normal: { caja: "space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4", etiqueta: "text-sm font-medium text-gray-700", ayuda: "text-xs text-slate-500", ayudaOpcion: "block text-xs font-normal text-slate-500", opcion },
  grande: { caja: "space-y-5", etiqueta: "text-etiqueta font-semibold text-texto", ayuda: "m-0 text-ayuda text-texto-secundario", ayudaOpcion: "block text-ayuda font-normal text-texto-secundario", opcion: opcionGrande },
};

// Validación del formulario (mensajes para el usuario). Devuelve [] si todo está bien.
// conTipo: el tipo del catálogo ya dice qué parte del día abarca y qué pasa con las horas (tipos de registro con goce).
export function erroresPermisoHoras(form, { conTipo = false } = {}) {
  const errs = [];
  if (!form.fecha_inicio) errs.push("Indica el día del permiso.");
  if (!form.tipo_horas) errs.push("Elige el tipo de permiso por horas.");
  if (!conTipo && !form.tratamiento) errs.push("Elige si el tiempo se repone o se rebaja.");
  if (form.tipo_horas && form.tipo_horas !== "llega_tarde" && !form.hora_inicio) errs.push("Indica desde qué hora.");
  if (form.tipo_horas && form.tipo_horas !== "sale_antes" && !form.hora_fin) errs.push("Indica hasta qué hora.");
  if (form.tipo_horas === "sale_regresa" && form.hora_inicio && form.hora_fin && form.hora_fin <= form.hora_inicio) {
    errs.push("La hora de regreso debe ser después de la de salida.");
  }
  return errs;
}

// Lo que se manda al backend.
export function datosPermisoHoras(form) {
  return {
    modalidad: "horas",
    tipo_horas: form.tipo_horas,
    tratamiento: form.tratamiento,
    hora_inicio: form.tipo_horas === "llega_tarde" ? null : form.hora_inicio,
    hora_fin: form.tipo_horas === "sale_antes" ? null : form.hora_fin,
    fecha_inicio: form.fecha_inicio,
    fecha_fin: form.fecha_inicio,
  };
}

// tipoFijo: la parte del día la fija el tipo del catálogo (no se elige aquí).
// horas: { valor, bloqueado, onChange } → «Horas no trabajadas» (se reponen / se descuentan / se pagan) en lugar de
// «se repone / se rebaja»; null = no se muestra (el empleado no lo decide).
// grande: con las medidas del sistema de diseño (página de Permiso, dentro de data-formulario-grande). Solo cambia el dibujo.
export default function CamposPermisoHoras({ form, setForm, tipoFijo = false, horas, sinTratamiento = false, grande = false }) {
  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e?.target ? e.target.value : e }));
  const e = grande ? ESTILO.grande : ESTILO.normal;
  const chico = grande ? "" : undefined;
  return (
    <div className={e.caja} data-permiso-horas>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={grande ? "permiso-dia" : undefined} className={e.etiqueta}>Día</Label>
          <Input id={grande ? "permiso-dia" : undefined} type="date" value={form.fecha_inicio} onChange={set("fecha_inicio")} className="bg-white" />
        </div>
        {tipoFijo ? null : <div className="space-y-2">
          <Label className={e.etiqueta}>Tipo</Label>
          <SelectConIconos aria="Tipo de permiso por horas" valor={form.tipo_horas} onCambio={set("tipo_horas")} placeholder="Seleccionar…" grande={grande}
            opciones={TIPOS_HORAS.map((t) => ({ valor: t.valor, texto: t.texto, ...ICONO_TIPO_HORAS[t.valor] }))} />
        </div>}
      </div>

      {form.tipo_horas && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {form.tipo_horas !== "llega_tarde" && (
            <div className="space-y-2">
              <Label className={e.etiqueta}>{form.tipo_horas === "sale_antes" ? "Sale desde las" : "Sale a las"}</Label>
              <Input type="time" aria-label="Desde qué hora" value={form.hora_inicio} onChange={set("hora_inicio")} className="bg-white" />
            </div>
          )}
          {form.tipo_horas !== "sale_antes" && (
            <div className="space-y-2">
              <Label className={e.etiqueta}>{form.tipo_horas === "llega_tarde" ? "Puede llegar hasta las" : "Regresa a las"}</Label>
              <Input type="time" aria-label="Hasta qué hora" value={form.hora_fin} onChange={set("hora_fin")} className="bg-white" />
            </div>
          )}
        </div>
      )}

      {horas ? (
        <div className="space-y-2">
          <Label htmlFor="horas-no-trabajadas" className={e.etiqueta}>Horas no trabajadas</Label>
          <SelectConIconos id="horas-no-trabajadas" aria="Horas no trabajadas" valor={horas.valor} disabled={horas.bloqueado} grande={grande}
            onCambio={(v) => horas.onChange(v)} opciones={HORAS.map(([v, t]) => ({ valor: v, texto: t, ...ICONO_HORAS[v] }))} />
          {horas.bloqueado ? <p data-chico={chico} className={e.ayuda}>🔒 Lo fija el tipo de registro.</p> : null}
        </div>
      ) : sinTratamiento ? null : (
      <div className="space-y-2">
          <Label className={e.etiqueta}>¿Cómo se cubre el tiempo?</Label>
          <div className="flex flex-col gap-2 sm:flex-row" role="radiogroup" aria-label="Cómo se cubre el tiempo">
            {TRATAMIENTOS.map((t) => (
              <button key={t.valor} type="button" role="radio" aria-checked={form.tratamiento === t.valor}
                onClick={() => set("tratamiento")(t.valor)} className={e.opcion(form.tratamiento === t.valor)}>
                <span className="block">{t.texto}</span>
                <span data-chico={chico} className={e.ayudaOpcion}>{t.ayuda}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <p data-chico={chico} className={e.ayuda}>
        Se cuenta lo que realmente faltó según sus checadas, sin pasar del permiso. Lo que pase del permiso cuenta como retardo normal.
      </p>
    </div>
  );
}
