"use client";

import { ListPlus } from "lucide-react";
import { camposVisibles, camposEnPestana, parseCampos, opcionesCampo } from "@/lib/camposPersonalizados.mjs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import HeaderMultiFilter from "@/components/tabla/HeaderMultiFilter";

export function CamposEmpleado({ form, campos, soloLectura, pestana = "laborales" }) {
  const values = parseCampos(form.watch("campos_personalizados"));
  const visible = camposEnPestana(campos, pestana);
  if (!visible.length) return null;

  function change(id, value) {
    form.setValue("campos_personalizados", { ...values, [id]: value }, { shouldDirty: true });
  }

  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/70 px-5 py-4">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-600"><ListPlus className="h-4 w-4" /></span>
        <div><h3 className="font-semibold text-gray-900">Información adicional</h3><p className="text-xs text-gray-500">Campos definidos por tu empresa.</p></div>
      </div>
      <div className="grid gap-5 p-5 sm:grid-cols-2">
        {visible.map(c => {
          const value = String(values[c.id] ?? "");
          const tipo = c.tipo || "seleccion";
          const opciones = value && !c.opciones.includes(value) ? [value, ...c.opciones] : c.opciones;
          const inputId = `campo-empleado-${c.id}`;
          return (
            <div key={c.id} className="space-y-2">
              <label htmlFor={inputId} className="text-sm font-medium text-gray-700">{c.nombre}</label>
              {soloLectura ? (
                <div className="min-h-10 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700">{value || "Sin asignar"}</div>
              ) : tipo === "seleccion" ? (
                <Select value={value ? `option:${value}` : "__sin_asignar__"} onValueChange={v => change(c.id, v === "__sin_asignar__" ? "" : v.slice(7))}>
                  <SelectTrigger id={inputId} className="h-10 rounded-lg border-gray-200 bg-white shadow-none"><SelectValue placeholder="Selecciona una opción" /></SelectTrigger>
                  <SelectContent><SelectItem value="__sin_asignar__">Sin asignar</SelectItem>
                    {opciones.map(o => <SelectItem key={o} value={`option:${o}`}>{o}{!c.opciones.includes(o) ? " · Opción anterior" : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input id={inputId} type={tipo === "numero" ? "number" : "text"} step={tipo === "numero" ? "any" : undefined}
                  maxLength={100} value={value} placeholder={tipo === "numero" ? "Ingresa un número" : "Ingresa un valor"}
                  className="h-10 rounded-lg border-gray-200 shadow-none" onChange={e => change(c.id, e.target.value)} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function FiltrosCamposEmpleado({ campos, empleados = [], value, onChange }) {
  return camposVisibles(campos, "filtros").map(c => (
    <div key={c.id} className="rounded-lg border border-gray-200 bg-white p-3">
      <HeaderMultiFilter placeholder={c.nombre} options={opcionesCampo(c, empleados)} selected={value[c.id] || []}
        onChange={selected => { const next = { ...value }; if (selected.length) next[c.id] = selected; else delete next[c.id]; onChange(next); }} />
    </div>
  ));
}

