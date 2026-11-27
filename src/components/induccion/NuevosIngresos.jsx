"use client";
// Gestión de personal → Nuevos ingresos (maqueta 1, aprobada 27/12/2026). Tablero de quienes están por entrar: resumen,
// avance de cada persona (datos, documentos, firma, rostro) y su siguiente paso. RH invita a mano (DialogoInvitar) o la
// persona aparece sola al marcarla «Contratado» en Reclutamiento. Backend: GET /checador/induccion/procesos.
// Escritorio: tabla de 5 columnas; teléfono: una tarjeta por persona (sin scroll horizontal).
import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Plus, Settings2, UserPlus } from "lucide-react";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import { SelectorEmpresa, useEmpresaNomina } from "@/components/nomina/comun";
import { RUTA_PLANTILLAS, RUTA_TABLERO, API, fechaCorta, origenTexto } from "@/lib/induccion/induccion.mjs";
import { Avatar, AvisoError, ChipsAvance, get, opcionesSwr, tarjeta, botonPrimario, botonSecundario } from "./comun";
import DialogoInvitar from "./DialogoInvitar";

const TONO_SIGUIENTE = { corregir: "text-red-700", en_proceso: "text-amber-800", revisar: "text-amber-800", sin_abrir: "text-slate-600", alta: "text-green-700", dar_alta: "text-slate-900" };

function Siguiente({ p }) {
  const href = `${RUTA_TABLERO}/${p.id}`;
  if (p.siguiente?.clave === "dar_alta") return <Link href={href} className={`${botonPrimario} min-h-10 px-3 text-[13px]`}>Revisar y dar de alta</Link>;
  if (p.siguiente?.clave === "revisar") return <Link href={href} className={`${botonSecundario} min-h-10 px-3 text-[13px]`}>{p.siguiente.texto}</Link>;
  if (p.estado === "alta") return <Link href={href} className="inline-flex min-h-11 items-center text-[13px] font-bold text-[#2563EB] hover:underline">Ver checklist →</Link>;
  if (p.siguiente?.clave === "sin_abrir") return <Link href={href} className={`${botonSecundario} min-h-10 px-3 text-[13px]`}>Reenviar por WhatsApp</Link>;
  return <Link href={href} className={`inline-flex min-h-11 items-center text-[13px] font-medium hover:underline ${TONO_SIGUIENTE[p.siguiente?.clave] ?? "text-slate-700"}`}>{p.siguiente?.texto}</Link>;
}

function Avance({ p }) {
  if (p.estado === "alta") {
    return <span className="text-sm text-slate-700">Expediente completo · checklist del primer día {p.checklist.hechas}/{p.checklist.total}</span>;
  }
  return <ChipsAvance avance={p.avance} sinAbrir={!p.abierto && p.estado === "invitado"} />;
}

const nombre = (p) => [p.nombre, p.apellido_paterno].filter(Boolean).join(" ");
const puesto = (p) => [p.puesto, p.sucursal ? `Sucursal ${p.sucursal}` : null].filter(Boolean).join(" · ") || "—";

export default function NuevosIngresos() {
  const empresa = useEmpresaNomina();
  const q = empresa.idEmpresa ? `?empresa=${empresa.idEmpresa}` : null;
  const tablero = useSWR(q ? `${API}/procesos${q}` : null, get, opcionesSwr);
  const plantillas = useSWR(q ? `${API}/plantillas${q}` : null, get, opcionesSwr);
  const [invitar, setInvitar] = useState(false);
  const d = tablero.data;
  const hoy = d?.hoy;
  const sinPlantilla = plantillas.data && !plantillas.data.plantillas?.length;

  const tarjetas = [
    { clave: "preingreso", texto: "En preingreso", valor: d?.resumen?.preingreso },
    { clave: "por_revisar", texto: "Por revisar documentos", valor: d?.resumen?.por_revisar, tono: "text-amber-700" },
    { clave: "entran_semana", texto: "Entran esta semana", valor: d?.resumen?.entran_semana },
    { clave: "tareas_atrasadas", texto: "Tareas del primer día atrasadas", valor: d?.resumen?.tareas_atrasadas, tono: "text-red-700" },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-1" data-pantalla="nuevos-ingresos">
      {/* Subtítulo propio (13 px): el del encabezado estándar es de 12.5 px. */}
      <EncabezadoPagina icono={UserPlus} titulo="Nuevos ingresos" />
      <p className="-mt-3 text-[13px] text-slate-600">Cada persona contratada llena sus datos, sube documentos y firma desde su celular. Tú solo revisas.</p>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <SelectorEmpresa {...empresa} />
        <button type="button" onClick={() => setInvitar(true)} disabled={!empresa.idEmpresa || sinPlantilla} className={botonPrimario}>
          <Plus className="size-4" aria-hidden="true" />Invitar a un nuevo ingreso
        </button>
      </div>

      {sinPlantilla ? (
        <section role="status" className="flex flex-col gap-3 rounded-[14px] border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm text-amber-950">Para invitar, primero define tu plantilla de inducción: qué documentos pides, qué se firma y quién hace cada tarea. ADAMIA trae una sugerida para empezar.</p>
          <Link href={RUTA_PLANTILLAS} className={botonSecundario}><Settings2 className="size-4" aria-hidden="true" />Configurar plantilla</Link>
        </section>
      ) : null}
      <AvisoError error={tablero.error} porDefecto="No se pudieron cargar los nuevos ingresos." />

      <section aria-label="Resumen" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tarjetas.map((t) => (
          <div key={t.clave} className={`${tarjeta} p-4`} data-kpi={t.clave}>
            <p className="text-[13px] text-slate-600">{t.texto}</p>
            <p className={`mt-1.5 text-[28px] font-extrabold leading-none ${t.valor ? t.tono ?? "text-slate-900" : "text-slate-900"}`}>{t.valor ?? "—"}</p>
          </div>
        ))}
      </section>

      <section aria-label="Personas" className={`${tarjeta} overflow-hidden`}>
        <div className="hidden grid-cols-[2.2fr_1.4fr_1fr_2.6fr_1.3fr] gap-3 bg-slate-100 px-[18px] py-3 text-[13px] font-bold tracking-wide text-slate-600 lg:grid" aria-hidden="true">
          <span>PERSONA</span><span>PUESTO</span><span>INGRESA</span><span>AVANCE</span><span>SIGUIENTE PASO</span>
        </div>
        {tablero.isLoading || (!d && !tablero.error) ? <p role="status" className="p-5 text-sm text-slate-500">Cargando nuevos ingresos…</p> : null}
        {d && !d.procesos.length ? (
          <p className="p-6 text-center text-sm text-slate-600">Aún no hay nuevos ingresos. Invita a alguien o márcalo como «Contratado» en Reclutamiento.</p>
        ) : null}
        <ul>
          {(d?.procesos ?? []).map((p) => (
            <li key={p.id} data-proceso={p.id}
              className={`grid gap-3 border-t border-slate-200 px-4 py-4 first:border-t-0 lg:grid-cols-[2.2fr_1.4fr_1fr_2.6fr_1.3fr] lg:items-center lg:px-[18px] lg:first:border-t ${p.siguiente?.clave === "dar_alta" ? "bg-amber-50/60" : ""}`}>
              <span className="flex min-w-0 items-center gap-2.5">
                <Avatar persona={p} id={p.id} />
                <span className="min-w-0">
                  <Link href={`${RUTA_TABLERO}/${p.id}`} className="flex min-h-11 items-center truncate text-sm font-bold text-slate-900 hover:underline lg:block lg:min-h-0">{nombre(p)}</Link>
                  <span className="block text-[13px] text-slate-500">{origenTexto(p, hoy)}</span>
                </span>
              </span>
              <span className="text-sm text-slate-700"><span className="text-slate-500 lg:hidden">Puesto: </span>{puesto(p)}</span>
              <span className="text-sm text-slate-700"><span className="text-slate-500 lg:hidden">Ingresa: </span>{fechaCorta(p.fecha_ingreso, hoy)}</span>
              <Avance p={p} />
              <span><Siguiente p={p} /></span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-[13px] text-slate-500">
        Al marcar a un candidato como «Contratado» en Reclutamiento, aparece aquí solo y le llega la invitación por WhatsApp. RH revisa los documentos y con un clic queda dado de alta como empleado.
      </p>

      <DialogoInvitar abierto={invitar} alCerrar={() => setInvitar(false)} idEmpresa={empresa.idEmpresa}
        nombreEmpresa={empresa.empresas.find((e) => e.id === empresa.idEmpresa)?.nombre} alInvitar={() => tablero.mutate()} />
    </div>
  );
}
