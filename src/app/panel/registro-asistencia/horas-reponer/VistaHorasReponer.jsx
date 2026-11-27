"use client";

// Asistencias → «Horas por reponer» (25/11/2026, maqueta aprobada Main.dc.html; solo el contenido de la pestaña).
// Resumen arriba, filtros, una fila por persona que debe (tarjetas en celular) y la fila desplegada con su cuenta.
// Datos: GET /checador/cuenta-horas/por-reponer. Acciones con los endpoints que ya existen:
//   Registrar reposición → PUT /checador/horas-extra/empleado/:id (forma «Reposición de tiempo por tiempo»)
//   Rebajar / Condonar    → POST /checador/cuenta-horas/:id/cierres · Deshacer → POST /checador/cuenta-horas/cierres/:id/deshacer
//   Cancelar un permiso   → PATCH /checador/solicitudes-permiso/:id/estado { estado: "Cancelado" }
import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import Cookies from "js-cookie";
import { useSnackbar } from "notistack";
import { ChevronDown, MoreHorizontal, Search } from "lucide-react";
import axios from "@/lib/axios";
import { fetcherWithToken } from "@/lib/fetcher";
import { permisosApi } from "@/lib/permisosApi";
import { refrescarAsistencias } from "@/lib/asistencia/refrescoAsistencias";
import { useAuth } from "@/context/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatearMinutos } from "@/lib/asistencia/jornada.mjs";
import {
  areasDe, COLUMNAS_EXCEL, cuerpoCierre, cuerpoReposicion, filasExcel, filtrarFilas, tarjetasResumen, textoDesde, textoPorQue, textoUltimo,
} from "@/lib/asistencia/horasPorReponer.mjs";
import DetalleCuentaReponer from "./DetalleCuentaReponer";
import { ConfirmarCancelarPermiso, DialogoCierre, DialogoReposicion } from "./DialogosReponer";

// ExcelJS (~900 KB) se descarga y evalúa solo al exportar, no al entrar a Asistencias (27/11/2026, rendimiento en celular).
const cargarExportador = () => import("@/utils/exportExcelJS").then((m) => m.exportToExcel);

const auth = () => ({ headers: { Authorization: `Bearer ${Cookies.get("token")}` } });
export const urlPorReponer = (idEmpresa) => `/checador/cuenta-horas/por-reponer?empresa=${idEmpresa && idEmpresa !== "all" ? idEmpresa : "all"}`;

// Lo comparten la pestaña (número de personas) y la vista: misma clave de SWR, una sola petición.
export function usePorReponer(idEmpresa, activo = true) {
  return useSWR(activo && idEmpresa ? urlPorReponer(idEmpresa) : null, fetcherWithToken,
    { revalidateOnFocus: false, shouldRetryOnError: false, keepPreviousData: true });
}

const TONO = {
  normal: { caja: "border-slate-200 bg-white", titulo: "text-slate-500", valor: "text-slate-900", detalle: "text-slate-500" },
  rojo: { caja: "border-rose-200 bg-rose-50", titulo: "text-rose-700", valor: "text-rose-700", detalle: "text-rose-800" },
  verde: { caja: "border-slate-200 bg-white", titulo: "text-slate-500", valor: "text-emerald-700", detalle: "text-slate-500" },
};
function Resumen({ totales }) {
  return (
    <section aria-label="Resumen de horas por reponer" className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-resumen-reponer>
      {tarjetasResumen(totales).map((t) => {
        const c = TONO[t.tono];
        return (
          <div key={t.clave} data-tarjeta={t.clave} data-tono={t.tono} className={`min-w-0 rounded-2xl border p-4 ${c.caja}`}>
            <p className={`text-[11.5px] font-bold uppercase tracking-wide ${c.titulo}`}>{t.titulo}</p>
            <p className={`mt-1.5 break-words text-[22px] font-extrabold leading-tight sm:text-[26px] ${c.valor}`}>{t.valor}</p>
            <p className={`mt-0.5 text-[13px] ${c.detalle}`}>{t.detalle}</p>
          </div>
        );
      })}
    </section>
  );
}

function Desde({ fila }) {
  const d = textoDesde(fila);
  return (
    <span className="inline-flex flex-col items-start">
      <span>{d.fecha}</span>
      <span data-hace={d.rojo ? "rojo" : "normal"}
        className={d.rojo ? "mt-0.5 whitespace-nowrap rounded-full bg-rose-100 px-2 text-xs font-bold text-rose-700" : "mt-0.5 whitespace-nowrap text-xs text-slate-500"}>{d.hace}</span>
    </span>
  );
}

function MasAcciones({ fila, onCierre, movil = false }) {
  return (
    // modal={false}: el menú abre una ventana; con el menú modal, Radix deja el cuerpo sin clics al cerrarla.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={`Más acciones de ${fila.nombre}`}
          className={`inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 ${movil ? "h-11 w-11" : "h-10 w-10"}`}>
          <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[60] w-56">
        <DropdownMenuItem className="min-h-11" onSelect={() => onCierre(fila, "rebaja")}>Rebajar en nómina</DropdownMenuItem>
        <DropdownMenuItem className="min-h-11" onSelect={() => onCierre(fila, "condonacion")}>Condonar</DropdownMenuItem>
        <DropdownMenuItem className="min-h-11" asChild>
          <Link href={`/panel/panel-empleado?emp=${fila.id_empleado}`}>Ver en Panel empleado</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Tabla({ filas, abierto, onAbrir, acciones, detalle }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[980px] border-collapse text-[14.5px]" data-tabla-reponer>
        <thead>
          <tr className="bg-slate-50 text-left text-[12.5px] text-slate-600">
            {["PERSONA", "DEBE", "DESDE", "POR QUÉ", "LO ÚLTIMO"].map((t) => <th key={t} className="px-4 py-3 font-bold">{t}</th>)}
            <th className="px-4 py-3 text-right font-bold">ACCIONES</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const abierta = abierto === f.id_empleado;
            return [
              <tr key={f.id_empleado} data-fila-reponer={f.id_empleado} onClick={() => onAbrir(f.id_empleado)}
                className={`cursor-pointer border-t border-slate-200 ${abierta ? "bg-blue-50/40" : "hover:bg-slate-50"}`}>
                <td className="px-4 py-3.5">
                  <button type="button" aria-expanded={abierta} aria-controls={`cuenta-${f.id_empleado}`} onClick={(e) => { e.stopPropagation(); onAbrir(f.id_empleado); }}
                    className="flex items-start gap-1.5 text-left">
                    <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform ${abierta ? "rotate-180" : ""}`} aria-hidden="true" />
                    <span><strong className="text-slate-900">{f.nombre}</strong><span className="block text-[13px] text-slate-500">{f.area ?? "Sin área"}</span></span>
                  </button>
                </td>
                <td className="whitespace-nowrap px-4 py-3.5"><span className={`text-lg font-extrabold tabular-nums ${f.viejo ? "text-rose-700" : "text-slate-900"}`}>{formatearMinutos(f.debe)}</span></td>
                <td className="whitespace-nowrap px-4 py-3.5"><Desde fila={f} /></td>
                <td className="px-4 py-3.5 text-slate-700">{textoPorQue(f)}</td>
                <td className="px-4 py-3.5 text-slate-700">{textoUltimo(f)}</td>
                <td className="whitespace-nowrap px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                  <span className="inline-flex items-center gap-1.5">
                    <button type="button" onClick={() => acciones.reponer(f)}
                      className={`h-10 rounded-xl px-3 text-sm font-semibold ${abierta ? "bg-[#2563EB] text-white hover:bg-blue-700" : "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"}`}>
                      Registrar reposición
                    </button>
                    <MasAcciones fila={f} onCierre={acciones.cierre} />
                  </span>
                </td>
              </tr>,
              abierta ? (
                <tr key={`${f.id_empleado}-d`} id={`cuenta-${f.id_empleado}`}>
                  <td colSpan={6} className="bg-blue-50/40 px-4 pb-4">{detalle(f)}</td>
                </tr>
              ) : null,
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}

function Tarjetas({ filas, abierto, onAbrir, acciones, detalle }) {
  return (
    <ul className="space-y-3" data-tarjetas-reponer>
      {filas.map((f) => {
        const abierta = abierto === f.id_empleado;
        return (
          <li key={f.id_empleado} data-tarjeta-reponer={f.id_empleado} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words font-bold text-slate-900">{f.nombre}</p>
                <p className="text-[13px] text-slate-500">{f.area ?? "Sin área"}</p>
              </div>
              <p className={`shrink-0 text-xl font-extrabold tabular-nums ${f.viejo ? "text-rose-700" : "text-slate-900"}`}>{formatearMinutos(f.debe)}</p>
            </div>
            <dl className="mt-3 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-2 gap-y-1.5 text-sm">
              <dt className="text-slate-500">Desde</dt><dd className="min-w-0"><Desde fila={f} /></dd>
              <dt className="text-slate-500">Por qué</dt><dd className="min-w-0 break-words text-slate-800">{textoPorQue(f)}</dd>
              <dt className="text-slate-500">Lo último</dt><dd className="min-w-0 text-slate-800">{textoUltimo(f)}</dd>
            </dl>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => acciones.reponer(f)}
                className="min-h-11 flex-1 rounded-xl bg-[#2563EB] px-3 text-[15px] font-semibold text-white hover:bg-blue-700">Registrar reposición</button>
              <MasAcciones fila={f} onCierre={acciones.cierre} movil />
            </div>
            <button type="button" aria-expanded={abierta} onClick={() => onAbrir(f.id_empleado)}
              className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              {abierta ? "Ocultar movimientos" : "Ver movimientos"}
              <ChevronDown className={`h-4 w-4 transition-transform ${abierta ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            {abierta && <div className="mt-3">{detalle(f)}</div>}
          </li>
        );
      })}
    </ul>
  );
}

export default function VistaHorasReponer({ idEmpresa, movil = false }) {
  const { enqueueSnackbar } = useSnackbar();
  const { dataUser } = useAuth();
  const { data, error, isLoading } = usePorReponer(idEmpresa);
  const datos = data?.data;
  const [busca, setBusca] = useState("");
  const [area, setArea] = useState("");
  const [soloViejos, setSoloViejos] = useState(false);
  const [abierto, setAbierto] = useState(null);
  const [dialogo, setDialogo] = useState(null); // { tipo: reponer|rebaja|condonacion|cancelar, fila, movimiento? }
  const [guardando, setGuardando] = useState(false);

  const todas = useMemo(() => datos?.filas ?? [], [datos]);
  const areas = useMemo(() => areasDe(todas), [todas]);
  const filas = useMemo(() => filtrarFilas(todas, { busca, area, soloViejos }), [todas, busca, area, soloViejos]);

  // El guardado ya recargó todo lo de asistencias (cuenta, por reponer, tabla): aquí solo se espera esa recarga.
  const refrescar = () => refrescarAsistencias();
  const enviar = async (fn, ok, idEmpleado) => {
    setGuardando(true);
    try {
      const r = await fn();
      await refrescar(idEmpleado);
      setDialogo(null);
      enqueueSnackbar(ok, { variant: "success" });
      for (const aviso of r?.data?.avisos ?? []) enqueueSnackbar(aviso.mensaje ?? String(aviso), { variant: "warning" });
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.error || "No se pudo guardar.", { variant: "error" });
    } finally {
      setGuardando(false);
    }
  };
  const acciones = {
    reponer: (fila) => setDialogo({ tipo: "reponer", fila }),
    cierre: (fila, tipo) => setDialogo({ tipo, fila }),
  };
  const detalle = (fila) => (
    <DetalleCuentaReponer fila={fila} ocupado={guardando}
      onCancelar={(m) => setDialogo({ tipo: "cancelar", fila, movimiento: m })}
      onDeshacer={(m) => enviar(() => axios.post(`/checador/cuenta-horas/cierres/${m.cierre.id}/deshacer`, {}, auth()), "Cierre deshecho.", fila.id_empleado)}
      onReponer={() => acciones.reponer(fila)} onRebajar={() => acciones.cierre(fila, "rebaja")} onCondonar={() => acciones.cierre(fila, "condonacion")} />
  );
  const exportar = async () => {
    if (!filas.length) { enqueueSnackbar("No hay personas con estos filtros.", { variant: "info" }); return; }
    await (await cargarExportador())(filasExcel(filas), COLUMNAS_EXCEL, `Horas por reponer ${datos?.hoy ?? ""}`.trim(), { sheetName: "Por reponer", headerColor: "2563EB" });
  };

  const control = `min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-[15px] text-slate-900 ${movil ? "w-full" : ""}`;
  const d = dialogo;
  return (
    <div className="space-y-4" data-vista-reponer>
      <Resumen totales={datos?.totales} />

      <div className={movil ? "grid grid-cols-2 gap-2" : "flex flex-wrap items-center gap-2.5"}>
        <label className={`flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 ${movil ? "col-span-2" : "min-w-[260px] flex-1"}`}>
          <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <input type="search" aria-label="Buscar persona" placeholder="Buscar persona…" value={busca} onChange={(e) => setBusca(e.target.value)}
            className="h-11 min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none sm:text-[15px]" />
        </label>
        <select aria-label="Área" value={area} onChange={(e) => setArea(e.target.value)} className={`${control} ${movil ? "col-span-2" : ""}`}>
          <option value="">Todas las áreas</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <button type="button" aria-pressed={soloViejos} onClick={() => setSoloViejos((v) => !v)}
          className={`${control} font-medium ${soloViejos ? "border-rose-300 bg-rose-50 text-rose-700" : ""}`}>Solo más de 30 días</button>
        <button type="button" onClick={exportar} className={`${control} font-medium`}>Exportar Excel</button>
      </div>

      {error ? (
        <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">No se pudo leer quién debe horas. Intenta de nuevo.</p>
      ) : !datos && isLoading ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Cargando…</p>
      ) : !filas.length ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600" data-vacio-reponer>
          {todas.length ? "Nadie coincide con estos filtros." : "Nadie debe horas. Cuando un permiso por horas se repone, aparece aquí."}
        </p>
      ) : movil ? (
        <Tarjetas filas={filas} abierto={abierto} onAbrir={(id) => setAbierto((a) => (a === id ? null : id))} acciones={acciones} detalle={detalle} />
      ) : (
        <Tabla filas={filas} abierto={abierto} onAbrir={(id) => setAbierto((a) => (a === id ? null : id))} acciones={acciones} detalle={detalle} />
      )}
      {!movil && filas.length > 0 && (
        <p className="text-[13px] text-slate-500">Toca una fila para ver sus movimientos. «⋯» = Rebajar en nómina · Condonar · Ver en Panel empleado.</p>
      )}

      {d?.tipo === "reponer" && (
        <DialogoReposicion fila={d.fila} hoy={datos?.hoy} autorizadores={datos?.autorizadores?.[d.fila.id_empresa] ?? []}
          idAutorizaInicial={dataUser?.id_empleado} guardando={guardando} onCerrar={() => setDialogo(null)}
          onGuardar={(v) => enviar(() => axios.put(`/checador/horas-extra/empleado/${d.fila.id_empleado}`, cuerpoReposicion(v), auth()),
            "Reposición registrada.", d.fila.id_empleado)} />
      )}
      {(d?.tipo === "rebaja" || d?.tipo === "condonacion") && (
        <DialogoCierre fila={d.fila} tipo={d.tipo} guardando={guardando} onCerrar={() => setDialogo(null)}
          onGuardar={(v) => enviar(() => axios.post(`/checador/cuenta-horas/${d.fila.id_empleado}/cierres`, cuerpoCierre(v), auth()),
            d.tipo === "rebaja" ? "Se rebajará en nómina." : "Condonado.", d.fila.id_empleado)} />
      )}
      {d?.tipo === "cancelar" && (
        <ConfirmarCancelarPermiso movimiento={d.movimiento} nombre={d.fila.nombre} guardando={guardando} onCerrar={() => setDialogo(null)}
          onConfirmar={() => enviar(() => permisosApi.actualizarEstado(d.movimiento.cargo.id_solicitud, "Cancelado"), "Permiso cancelado.", d.fila.id_empleado)} />
      )}
    </div>
  );
}
