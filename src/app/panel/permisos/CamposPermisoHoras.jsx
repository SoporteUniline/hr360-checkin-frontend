"use client";

// Campos del permiso por horas (R1, 20/11/2026): tipo, horas y si se repone o se rebaja.
// Un permiso por horas es de un solo día. Las horas se capturan en HH:mm (<input type="time">).
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TIPOS_HORAS, TRATAMIENTOS } from "@/lib/asistencia/permisoHoras.mjs";

const opcion = (activa) =>
  `flex-1 rounded-lg border px-3 py-2 text-left text-sm transition ${
    activa ? "border-blue-600 bg-blue-50 font-semibold text-blue-900" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
  }`;

// Validación del formulario (mensajes para el usuario). Devuelve [] si todo está bien.
export function erroresPermisoHoras(form) {
  const errs = [];
  if (!form.fecha_inicio) errs.push("Indica el día del permiso.");
  if (!form.tipo_horas) errs.push("Elige el tipo de permiso por horas.");
  if (!form.tratamiento) errs.push("Elige si el tiempo se repone o se rebaja.");
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

export default function CamposPermisoHoras({ form, setForm }) {
  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e?.target ? e.target.value : e }));
  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Día</Label>
          <Input type="date" value={form.fecha_inicio} onChange={set("fecha_inicio")} className="bg-white" />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Tipo</Label>
          <select
            aria-label="Tipo de permiso por horas"
            value={form.tipo_horas}
            onChange={set("tipo_horas")}
            className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
          >
            <option value="">Seleccionar…</option>
            {TIPOS_HORAS.map((t) => <option key={t.valor} value={t.valor}>{t.texto}</option>)}
          </select>
        </div>
      </div>

      {form.tipo_horas && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {form.tipo_horas !== "llega_tarde" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">{form.tipo_horas === "sale_antes" ? "Sale desde las" : "Sale a las"}</Label>
              <Input type="time" aria-label="Desde qué hora" value={form.hora_inicio} onChange={set("hora_inicio")} className="bg-white" />
            </div>
          )}
          {form.tipo_horas !== "sale_antes" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">{form.tipo_horas === "llega_tarde" ? "Puede llegar hasta las" : "Regresa a las"}</Label>
              <Input type="time" aria-label="Hasta qué hora" value={form.hora_fin} onChange={set("hora_fin")} className="bg-white" />
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">¿Cómo se cubre el tiempo?</Label>
        <div className="flex flex-col gap-2 sm:flex-row" role="radiogroup" aria-label="Cómo se cubre el tiempo">
          {TRATAMIENTOS.map((t) => (
            <button key={t.valor} type="button" role="radio" aria-checked={form.tratamiento === t.valor}
              onClick={() => set("tratamiento")(t.valor)} className={opcion(form.tratamiento === t.valor)}>
              <span className="block">{t.texto}</span>
              <span className="block text-xs font-normal text-slate-500">{t.ayuda}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Se cuenta lo que realmente faltó según sus checadas, sin pasar del permiso. Lo que pase del permiso cuenta como retardo normal.
      </p>
    </div>
  );
}
