"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cambiosRegistro, etiquetaCampo } from "@/lib/asistencia/cambios.mjs";
import { etiquetaOrigen, fechaCorta, quienCuando } from "@/lib/asistencia/historial.mjs";
import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";
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
// `grande`: texto de 13 px (el Monitor pide 13 px o más; Asistencias usa 12 px).
export default function CeldaEditado({ registro, formatear, onVerChecadas, grande = false }) {
  const [abierto, setAbierto] = useState(false);
  // Editado: la asistencia se corrigió a mano o alguna checada del reloj se corrigió ese día.
  const corregidas = Number(registro?.checadas_corregidas) || 0;
  const editado = Boolean(Number(registro?.correccion)) || corregidas > 0;
  // Historial completo (quién, cuándo, antes → después): se pide solo al abrir el detalle.
  const { data: historial, isLoading: cargandoHistorial } = useSWR(
    abierto && editado && registro?.id ? `/checador/asistencias/${registro.id}/cambios` : null,
    fetcherWithToken,
    { revalidateOnFocus: false },
  );
  const movimientos = Array.isArray(historial?.cambios) ? historial.cambios : [];
  if (!editado) {
    return <span className={`${grande ? "text-[13px]" : "text-xs"} text-slate-400`} aria-label="Sin editar">No</span>;
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
          className={`inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 ${grande ? "text-[13px]" : "text-xs"} font-semibold text-amber-700 hover:bg-amber-100`}
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
          ) : corregidas > 0 ? (
            <p className="text-xs text-slate-700">
              Se corrigi{corregidas > 1 ? "eron" : "ó"} <b>{corregidas} checada{corregidas > 1 ? "s" : ""}</b> del reloj.
              {registro?.motivos_resumen ? <> Motivo: <b>{registro.motivos_resumen}</b>.</> : null}
            </p>
          ) : (
            <p className="text-xs text-slate-600">
              Este registro se marcó como editado, pero no tiene guardados sus valores
              originales (se editó antes de que el sistema los guardara).
            </p>
          )}
          <div className="mt-3 border-t border-slate-100 pt-2">
            <p className="text-[11px] font-semibold text-slate-700">Quién y cuándo</p>
            {movimientos.length > 0 ? (
              <ul className="mt-1 space-y-1.5" aria-label="Historial de cambios">
                {movimientos.map((c, i) => (
                  <li key={`${c.creado_en}-${c.campo}-${i}`} className="text-[11px] leading-snug text-slate-600">
                    <span className="font-semibold text-slate-800">{c.nombre_usuario || "Usuario sin nombre"}</span>
                    {" · "}{fechaCorta(c.creado_en)}
                    <span className="text-slate-400"> · {etiquetaOrigen(c.origen)}</span>
                    <br />
                    {c.campo === "comida" ? "Comida" : etiquetaCampo(c.campo)}:{" "}
                    <span className="text-slate-400 line-through">
                      {c.campo === "comida" ? c.valor_antes : formatear ? formatear(c.campo, c.valor_antes) : c.valor_antes ?? "—"}
                    </span>
                    {" → "}
                    <span className="font-semibold text-slate-800">
                      {c.campo === "comida" ? c.valor_despues : formatear ? formatear(c.campo, c.valor_despues) : c.valor_despues ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : registro?.ultimo_cambio ? (
              <p className="mt-1 text-[11px] text-slate-600">{quienCuando(registro.ultimo_cambio)}</p>
            ) : (
              <p className="mt-1 text-[11px] text-slate-500">
                {cargandoHistorial
                  ? "Cargando…"
                  : historial?.disponible === false
                  ? "Se empezará a registrar cuando se active el historial en el sistema."
                  : "Este cambio es anterior al historial; no se sabe quién lo hizo."}
              </p>
            )}
          </div>
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
              Abrir el reloj de este día
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
