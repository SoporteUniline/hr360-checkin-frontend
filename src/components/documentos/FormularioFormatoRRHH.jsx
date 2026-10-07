"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CAMPOS_COMUNES_RRHH, campoVisible, resumenViaticos } from "@/lib/documentos/formatosRRHH";

function Control({ campo, value, onChange, id }) {
  const props = { id, value: value ?? "", onChange: (e) => onChange(e.target.value), required: campo.required };
  return <div className="min-w-0 space-y-1.5">
    <Label htmlFor={id} className="text-xs leading-5 text-slate-700">{campo.label}{!campo.required ? " (opcional)" : ""}</Label>
    {campo.type === "select" ? <select {...props} className="h-10 w-full min-w-0 rounded-md border bg-white px-2 text-sm"><option value="">Selecciona una opción</option>{campo.options.map((o) => <option key={o} value={o}>{o}</option>)}</select>
      : campo.type === "textarea" ? <Textarea {...props} rows={3} maxLength={3000} placeholder={campo.placeholder} className="resize-y text-sm" />
        : <Input {...props} type={campo.type} min={campo.min} max={campo.max} step={campo.integer ? 1 : "any"} maxLength={500} placeholder={campo.placeholder} className="min-w-0 text-sm" />}
  </div>;
}

function CampoFormato({ campo, datos, onChange }) {
  if (!campoVisible(campo, datos)) return null;
  if (campo.type !== "rows") return <Control campo={campo} value={datos[campo.key]} onChange={(value) => onChange(campo.key, value)} id={`formato-${campo.key}`} />;
  const registros = datos[campo.key] || [];
  return <fieldset className="min-w-0 space-y-3">
    <legend className="text-sm font-medium text-slate-800">{campo.label}</legend>
    {registros.map((row, i) => <div key={i} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-500">Registro {i + 1}</span><Button type="button" variant="ghost" size="sm" disabled={registros.length === 1} aria-label={`Quitar ${campo.label}, registro ${i + 1}`} onClick={() => onChange(campo.key, registros.filter((_, index) => index !== i))}>Quitar</Button></div>
      <div className="grid gap-3 sm:grid-cols-2">{campo.columns.map((col) => <Control key={col.key} campo={col} value={row[col.key]} id={`formato-${campo.key}-${i}-${col.key}`} onChange={(value) => onChange(campo.key, registros.map((item, index) => index === i ? { ...item, [col.key]: value } : item))} />)}</div>
    </div>)}
    <Button type="button" variant="outline" size="sm" disabled={registros.length >= campo.maxRows} onClick={() => onChange(campo.key, [...registros, Object.fromEntries(campo.columns.map((c) => [c.key, ""]))])}>Agregar registro</Button>
    <p className="text-xs text-slate-500">{registros.length} de {campo.maxRows} registros</p>
  </fieldset>;
}

export default function FormularioFormatoRRHH({ formato, datos, onChange, disabled }) {
  const viaticos = formato.codigo === "viaticos" ? resumenViaticos(datos) : null;
  return <fieldset disabled={disabled} className="min-w-0 space-y-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
    <div><h2 className="text-base font-semibold text-slate-900">Datos del documento</h2><p className="mt-1 text-xs leading-5 text-slate-500">Completa los datos y revisa la vista previa. Los campos opcionales están indicados. Esta información corresponde solo a este documento.</p></div>
    <div className="grid gap-4 sm:grid-cols-2">{CAMPOS_COMUNES_RRHH.map((campo) => <CampoFormato key={campo.key} campo={campo} datos={datos} onChange={onChange} />)}</div>
    <div className="space-y-5 border-t pt-5">{formato.campos.map((campo) => <CampoFormato key={campo.key} campo={campo} datos={datos} onChange={onChange} />)}</div>
    {viaticos && <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900"><p>Gastos presentados: {viaticos.comprobado.toFixed(2)} {datos.moneda}</p><p className="mt-1 font-medium">{viaticos.saldo >= 0 ? "Saldo por devolver" : "Reembolso por revisar"}: {Math.abs(viaticos.saldo).toFixed(2)} {datos.moneda}</p><p className="mt-1 text-xs">Sujeto a revisión de los comprobantes.</p></div>}
  </fieldset>;
}
