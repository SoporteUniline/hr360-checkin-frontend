"use client";

// Motivo (por qué, del catálogo de motivos con «Otro…» para escribirlo) y goce del día (lo trae el tipo; RH lo cambia solo
// si el tipo «se cambia al aplicar», si no se ve con 🔒). El empleado solo elige el motivo: conGoce = false.
// Lo usan PermisoDialog (RH) y components/Permission/PermissionDialog (empleado). Reglas en lib/asistencia/tiposGoce.mjs.
import { Label } from "@/components/ui/label";
import { GOCES, OTRO, listaMotivos, normalizarTipo, puedeCambiar } from "@/lib/asistencia/tiposGoce.mjs";

const CAMPO = "h-9 w-full min-w-0 rounded-md border border-input bg-white px-3 text-[13.5px] text-slate-900 "
  + "focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:bg-slate-50 disabled:text-slate-500 max-sm:h-11 max-sm:text-base";

export default function CamposMotivoGoce({ tipo, motivos, motivo, onMotivo, goce, onGoce, conGoce = true, disabled = false }) {
  const cat = listaMotivos(motivos);
  const n = normalizarTipo(tipo);
  const pc = puedeCambiar(tipo);
  // Un motivo guardado antes de que cargara el catálogo llega como «Otro…» con texto: si es del catálogo, se ve como tal.
  const enCatalogo = motivo.opcion === OTRO && cat.some((m) => m.nombre === String(motivo.texto ?? "").trim());
  const valor = enCatalogo ? String(motivo.texto).trim() : motivo.opcion;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2" data-motivo-goce>
      <div className="space-y-2">
        <Label htmlFor="motivo-permiso" className="text-sm font-medium text-gray-700">Motivo (por qué)</Label>
        <select id="motivo-permiso" aria-label="Motivo del permiso" disabled={disabled} value={valor}
          onChange={(e) => onMotivo({ opcion: e.target.value, texto: e.target.value === OTRO ? "" : motivo.texto })} className={CAMPO}>
          <option value="">Elige el motivo…</option>
          {cat.map((m) => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
          <option value={OTRO}>Otro…</option>
        </select>
        {valor === OTRO ? (
          <input aria-label="Escribe el motivo" placeholder="Escribe el motivo" disabled={disabled} value={motivo.texto} maxLength={120}
            onChange={(e) => onMotivo({ ...motivo, texto: e.target.value })} className={CAMPO} />
        ) : null}
      </div>
      {conGoce && n ? (
        <div className="space-y-2">
          <Label htmlFor="goce-permiso" className="text-sm font-medium text-gray-700">Goce del día</Label>
          <select id="goce-permiso" aria-label="Goce del día" disabled={disabled || !pc.goce} value={pc.goce ? goce : n.goce}
            onChange={(e) => onGoce(e.target.value)} className={CAMPO}>
            {GOCES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
          <p className="text-xs text-slate-500">{pc.goce ? "Viene del tipo de registro; puedes cambiarlo en este caso." : "🔒 Lo fija el tipo de registro."}</p>
        </div>
      ) : null}
    </div>
  );
}
