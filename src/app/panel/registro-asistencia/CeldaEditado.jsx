"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cambiosRegistro } from "@/lib/asistencia/cambios.mjs";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const DB_TIMEZONE = "America/Mexico_City";
const SI_NO = new Set(["asistencia", "goce_sueldo", "hrs_extra", "pago_triple", "es_domingo", "es_festivo"]);

// Convierte el valor guardado de un campo a texto legible (horas, catálogos, sí/no).
export function crearFormateadorCambios({ tiposPermiso, empleados, zona }) {
  const tipos = Array.isArray(tiposPermiso?.tiposPermiso) ? tiposPermiso.tiposPermiso : [];
  const personas = Array.isArray(empleados) ? empleados : [];
  return (campo, valor) => {
    if (valor === undefined || valor === null || valor === "" || valor === "-") return "—";
    if (campo === "entrada" || campo === "salida") {
      const d = dayjs.tz(valor, DB_TIMEZONE);
      return d.isValid() ? d.tz(zona || DB_TIMEZONE).format("DD/MM HH:mm") : String(valor);
    }
    if (campo === "id_tipo_permiso") {
      return tipos.find((t) => String(t.id) === String(valor))?.nombre ?? `Tipo ${valor}`;
    }
    if (campo === "autorizado_por" || campo === "extras_autorizadas_por") {
      const p = personas.find((e) => String(e.id_empleado) === String(valor));
      return p ? `${p.nombre} ${p.apellido_paterno ?? ""}`.trim() : `Empleado ${valor}`;
    }
    if (SI_NO.has(campo)) return Number(valor) ? "Sí" : "No";
    if (campo === "hrs_comida") return `${valor} h`;
    if (campo === "prima_dominical" || campo === "porcentaje_dia_festivo") return `${valor} %`;
    return String(valor);
  };
}

// Columna "Editado": etiqueta ámbar con el detalle de qué cambió (antes → después).
export default function CeldaEditado({ registro, formatear, onVerChecadas }) {
  const [abierto, setAbierto] = useState(false);
  const editado = Boolean(Number(registro?.correccion));
  if (!editado) {
    return <span className="text-xs text-slate-400" aria-label="Sin editar">No</span>;
  }
  const cambios = cambiosRegistro(registro, formatear);

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-no-row-click
          // La fila abre el historial con cualquier clic: este botón no debe dispararlo.
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
          aria-label="Editado: Sí, ver qué cambió"
        >
          Sí
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        className="w-80 border border-slate-200 bg-white p-0 shadow-xl"
        data-no-row-click
        // El contenido se dibuja fuera de la tabla, pero React propaga el clic a la fila.
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">Qué cambió</p>
          <p className="text-xs text-slate-500">
            {registro.nombre} {registro.apellido_paterno}
          </p>
        </div>
        <div className="max-h-72 overflow-y-auto px-4 py-3">
          {cambios.length > 0 ? (
            <ul className="space-y-2">
              {cambios.map((c) => (
                <li key={c.campo} className="text-xs">
                  <p className="font-semibold text-slate-700">{c.etiqueta}</p>
                  <p className="tabular-nums">
                    <span className="text-slate-400 line-through">{c.antes}</span>
                    <span className="mx-1.5 text-slate-400">→</span>
                    <span className="font-semibold text-slate-900">{c.despues}</span>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-600">
              Este registro se marcó como editado, pero no tiene guardados sus valores
              originales (se editó antes de que el sistema los guardara).
            </p>
          )}
          <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
            Quién y cuándo: aún no se registra. Pendiente en el sistema.
          </p>
        </div>
        {onVerChecadas && (
          <div className="border-t border-slate-100 px-4 py-2">
            <button
              type="button"
              onClick={() => {
                // Cierra este detalle para que el historial no quede tapado.
                setAbierto(false);
                onVerChecadas();
              }}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Ver checadas del reloj de este día
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
