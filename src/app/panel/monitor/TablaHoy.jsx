"use client";

// Monitor › Tabla (vista por defecto; maquetas aprobadas Main.dc.html y MovilMonitor.dc.html): una tabla con
// encabezados Persona · Horario · Entrada · Qué pasa · Jornada · Editado y los renglones agrupados del más urgente al menos
// («Requiere atención», «Con permiso / descanso», «Saldrán tarde / hora extra», «En jornada», «Por entrar», «Ya
// salieron»), cada grupo con su encabezado y su número. «Qué pasa» es UNA frase y, a lo más, un chip que aporte.
// Grupos, frases, entrada y jornada en src/lib/asistencia/vistasMonitor.mjs (sobre monitor.mjs y hoy.mjs).
// Todo el renglón abre el reloj del día (en celular, un botón «Ver día de…» que cubre la tarjeta; en escritorio, ese
// botón con la flecha y un clic en el renglón); el nombre abre la ficha.
// Celular (< lg): la misma tabla se pinta como tarjetas (nombre arriba; qué pasa; horario y entrada abajo) bajo los
// mismos encabezados de grupo, sin desplazamiento lateral. Entre lg y xl se oculta «Jornada» para que quepa.
import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import CeldaEditado, { crearFormateadorCambios } from "@/app/panel/registro-asistencia/CeldaEditado";
import { NombreEmpleado } from "@/components/empleado/FichaEmpleado";
import { entradaTabla, horarioVista, jornadaTabla, quePasaTabla } from "@/lib/asistencia/vistasMonitor.mjs";
import { cn } from "@/lib/utils";
import { areaDe, Avatar, CHIP, nombreDe } from "./comunes";

const BARRA = { azul: "bg-brand", violeta: "bg-violet-600", gris: "bg-slate-400" };
// Color del encabezado de cada grupo (un punto a la izquierda del título).
const PUNTO = {
  atencion: "bg-red-500",
  permiso: "bg-violet-500",
  saldran_tarde: "bg-blue-500",
  jornada: "bg-green-500",
  proximos: "bg-slate-400",
  salieron: "bg-slate-300",
};
const CHIP_BASE = "inline-flex max-w-full rounded-lg px-2.5 py-1 text-[13px] font-semibold leading-snug";
const COLUMNAS = 7;
// Igual que la columna «Editado» de Asistencias: «Sí» abre qué cambió, quién y cuándo.
const editadoDe = (reg) => Boolean(Number(reg?.correccion)) || (Number(reg?.checadas_corregidas) || 0) > 0;

function Renglon({ r, debe, onAbrirDia, formatear }) {
  const reg = r.dia.registro;
  const nombre = nombreDe(reg);
  const area = areaDe(reg);
  const q = quePasaTabla(r, { debe });
  const e = entradaTabla(r);
  const j = jornadaTabla(r);
  const avance = j?.avance != null ? Math.round(j.avance * 100) : null;
  const celda = "lg:table-cell lg:border-t lg:border-slate-100 lg:px-3 lg:py-2.5 lg:align-middle";
  return (
    <tr
      data-persona={nombre}
      data-estado={r.estado}
      // Escritorio: un clic en cualquier parte del renglón abre el día (salvo en el nombre, que abre la ficha, y en el
      // botón, que ya lo hace); el botón «Ver día de…» es el control accesible con teclado y lector de pantalla.
      onClick={(ev) => {
        if (!ev.target.closest("a, button")) onAbrirDia?.(reg);
      }}
      className={cn(
        "group relative flex min-h-11 flex-wrap items-baseline rounded-[14px] border border-slate-200 bg-white py-3 pl-[64px] pr-10 text-left",
        "lg:table-row lg:cursor-pointer lg:rounded-none lg:border-0 lg:p-0 lg:hover:bg-slate-50"
      )}
    >
      <th scope="row" className="block basis-full p-0 text-left font-normal lg:table-cell lg:border-t lg:border-slate-100 lg:py-2.5 lg:pl-5 lg:pr-3">
        <span className="flex min-w-0 items-center gap-3">
          <Avatar
            registro={reg}
            tono={q.tono}
            className="absolute left-3 top-3 size-10 text-[13px] lg:static lg:size-[34px] lg:text-[12px]"
          />
          <span className="flex min-w-0 flex-col">
            <b data-nombre className="truncate text-[15px] font-semibold leading-tight text-slate-900 lg:text-[14px]">
              <span className="relative z-10">
                <NombreEmpleado id={reg.id_empleado}>{nombre}</NombreEmpleado>
              </span>
            </b>
            {area ? <span className="truncate text-[13px] leading-snug text-slate-500">{area}</span> : null}
          </span>
        </span>
      </th>
      <td data-horario className={cn("order-3 mt-1.5 block p-0 text-[13px] tabular-nums text-slate-600 lg:mt-0 lg:whitespace-nowrap lg:text-[13.5px] lg:text-slate-700", celda)}>
        {horarioVista(r)}
      </td>
      <td
        data-entrada
        className={cn(
          "order-4 mt-1.5 p-0 text-[13px] tabular-nums text-slate-600 lg:mt-0 lg:whitespace-nowrap lg:text-[13.5px]",
          // Celular: «· Entró 9:18 a.m.» junto al horario; con salida, en su propio renglón («Checó 7:55 a.m. → 3:10 p.m.»).
          !e ? "hidden" : e.salida ? "block basis-full" : "block before:whitespace-pre before:content-['_·_'] lg:before:content-none",
          celda
        )}
      >
        {e ? (
          <>
            <span className="lg:hidden">{e.salida ? "Checó " : "Entró "}</span>
            <span className={cn("whitespace-nowrap font-semibold", e.tarde ? "text-orange-800" : "text-slate-900")}>{e.entrada}</span>
            {e.salida ? (
              <>
                <span className="whitespace-nowrap text-slate-500"> →</span>{" "}
                <span className="whitespace-nowrap font-semibold text-slate-900">{e.salida}</span>
              </>
            ) : null}
          </>
        ) : (
          <>
            <span aria-hidden="true" className="text-slate-400">
              —
            </span>
            <span className="sr-only">Sin entrada</span>
          </>
        )}
      </td>
      <td data-que-pasa className={cn("order-2 mt-1.5 block basis-full p-0 lg:mt-0", celda)}>
        <span className="flex flex-wrap items-center gap-1.5">
          <span data-frase className={cn(CHIP_BASE, CHIP[q.tono])}>
            {q.texto}
          </span>
          {q.extra ? (
            <span data-chip-extra className={cn(CHIP_BASE, "font-medium", CHIP[q.extra.tono])}>
              {q.extra.texto}
            </span>
          ) : null}
        </span>
      </td>
      <td data-jornada className={cn("hidden", celda, "lg:hidden xl:table-cell")}>
        {j ? (
          <span className="flex flex-col gap-1">
            <span className="whitespace-nowrap text-[13px] leading-tight tabular-nums text-slate-600">{j.texto}</span>
            {avance != null ? (
              <span
                role="progressbar"
                aria-label={`Jornada: ${j.texto}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={avance}
                className="block h-1.5 rounded-full bg-slate-100"
              >
                <span className={cn("block h-1.5 rounded-full", BARRA[j.tono])} style={{ width: `${avance}%` }} />
              </span>
            ) : null}
          </span>
        ) : null}
      </td>
      <td
        data-editado
        className={cn(
          // Celular: solo se muestra si se editó (junto a la frase); escritorio: siempre, como en Asistencias.
          editadoDe(reg) ? "relative z-10 order-5 mt-1.5 block basis-full p-0 lg:mt-0" : "hidden",
          "lg:table-cell lg:border-t lg:border-slate-100 lg:px-1 lg:py-2.5 lg:text-center lg:align-middle"
        )}
      >
        <span className="text-[13px] text-slate-500 lg:hidden">Editado: </span>
        <CeldaEditado registro={reg} formatear={formatear} grande />
      </td>
      <td className="contents p-0 lg:table-cell lg:border-t lg:border-slate-100 lg:pr-3 lg:align-middle">
        {/* Celular: cubre toda la tarjeta. Escritorio: botón de 44 px con la flecha; el resto del renglón abre con clic. */}
        <button
          type="button"
          onClick={() => onAbrirDia?.(reg)}
          aria-label={`Ver día de ${nombre} · ${q.texto}`}
          className={cn(
            "absolute inset-0 flex items-center justify-end rounded-[14px] pr-3 text-slate-400 group-hover:text-slate-600",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand",
            "lg:static lg:size-11 lg:justify-center lg:rounded-lg lg:pr-0 lg:hover:bg-slate-100"
          )}
        >
          <ChevronRight aria-hidden="true" className="size-5" />
        </button>
      </td>
    </tr>
  );
}

// `grupos`: [{ clave, titulo, filas }] de gruposTabla (ya filtrados); `cuentas`: «Debe N» por id_empleado.
export default function TablaHoy({ grupos, cuentas, onAbrirDia, zona }) {
  const formatear = useMemo(() => crearFormateadorCambios({ tiposPermiso: null, empleados: [], zona }), [zona]);
  return (
    <table
      aria-label="Personas de hoy"
      className="block w-full border-separate border-spacing-0 lg:table lg:table-fixed lg:overflow-hidden lg:rounded-[16px] lg:border lg:border-slate-200 lg:bg-white"
    >
      <thead className="hidden lg:table-header-group">
        <tr className="text-left text-[13px] font-semibold uppercase tracking-[0.04em] text-slate-600">
          <th scope="col" className="w-[18%] py-3 pl-5 pr-3 font-semibold">
            Persona
          </th>
          <th scope="col" className="w-[15%] px-3 py-3 font-semibold">
            Horario
          </th>
          <th scope="col" className="w-[17%] px-3 py-3 font-semibold">
            Entrada
          </th>
          <th scope="col" className="px-3 py-3 font-semibold">
            Qué pasa
          </th>
          <th scope="col" className="hidden w-[10%] px-3 py-3 font-semibold xl:table-cell">
            Jornada
          </th>
          <th scope="col" className="w-[76px] px-1 py-3 text-center font-semibold">
            Editado
          </th>
          <th scope="col" className="w-11 py-3 pr-4">
            <span className="sr-only">Abrir día</span>
          </th>
        </tr>
      </thead>
      {grupos.map((g) => (
        <tbody key={g.clave} data-grupo={g.clave} className="flex flex-col gap-2 pb-3 last:pb-0 lg:table-row-group lg:pb-0">
          <tr className="block lg:table-row">
            <th
              scope="rowgroup"
              colSpan={COLUMNAS}
              className={cn(
                "block px-1 pt-2 text-left text-[13px] font-bold uppercase tracking-[0.05em] text-slate-600",
                "lg:table-cell lg:border-t lg:border-slate-200 lg:bg-slate-50 lg:px-5 lg:py-2.5 lg:text-[13.5px] lg:normal-case lg:tracking-normal lg:text-slate-900"
              )}
            >
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className={cn("size-2 rounded-full", PUNTO[g.clave])} />
                {g.titulo}{" "}
                <span aria-hidden="true" className="text-slate-400">
                  ·
                </span>{" "}
                <span data-n className="tabular-nums">
                  {g.filas.length}
                </span>
              </span>
            </th>
          </tr>
          {g.filas.map((r) => (
            <Renglon key={r.dia.id} r={r} onAbrirDia={onAbrirDia} formatear={formatear} debe={Number(cuentas[Number(r.dia.registro.id_empleado)]) || 0} />
          ))}
        </tbody>
      ))}
    </table>
  );
}
