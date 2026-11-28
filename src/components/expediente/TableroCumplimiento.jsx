"use client";

// Cumplimiento del expediente de la empresa (28/11/2026): porcentaje general, quién está más incompleto, filtros y
// descarga en Excel o CSV (queda en la bitácora). Cada persona abre su expediente por etapas. Es una página.
// Backend: /checador/expediente/empresa/:id/cumplimiento (hr360-checkin-backend/docs/expediente-ley.md).
import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { expedienteApi } from "@/lib/expedienteApi";
import { consultaTablero, fechaMx, leerErrorBlob, mensajeError, nombreDescarga, textoResumen, tonoPorcentaje } from "@/lib/expediente/presentacion.mjs";
import { useEmpresaNomina } from "@/components/nomina/comun";
import { Aviso, Barra, BOTON_PRINCIPAL, BOTON_SECUNDARIO, CAMPO, Cargando, Encabezado, Etiqueta, Seccion, SECUNDARIO, TEXTO } from "./Piezas";

function Dato({ titulo, valor, nota }) {
  return (
    <div className="grid gap-1 rounded-xl border border-slate-300 p-4">
      <p className={`font-bold ${SECUNDARIO}`}>{titulo}</p>
      <p className="text-[28px] font-bold leading-none tabular-nums">{valor}</p>
      {nota ? <p className={SECUNDARIO}>{nota}</p> : null}
    </div>
  );
}

export default function TableroCumplimiento() {
  const { enqueueSnackbar } = useSnackbar();
  const { empresas, idEmpresa, setIdEmpresa } = useEmpresaNomina();
  const [filtros, setFiltros] = useState({ estado: "activos", departamento: "", sucursal: "", q: "", incompletos: false });
  const [descargando, setDescargando] = useState(null);
  const consulta = consultaTablero(filtros);
  const { data, error } = useSWR(idEmpresa ? `/checador/expediente/empresa/${idEmpresa}/cumplimiento${consulta}` : null, () => expedienteApi.cumplimiento(idEmpresa, consulta), { keepPreviousData: true });
  const cambiar = (k) => (e) => setFiltros({ ...filtros, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const descargar = async (formato) => {
    setDescargando(formato);
    try {
      const r = await expedienteApi.exportarCumplimiento(idEmpresa, consulta, formato);
      const enlace = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = enlace;
      a.download = nombreDescarga(r.headers?.["content-disposition"], `Cumplimiento-expediente.${formato}`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(enlace), 60000);
      enqueueSnackbar(formato === "xlsx" ? "Excel descargado." : "CSV descargado.", { variant: "success" });
    } catch (err) {
      await leerErrorBlob(err);
      enqueueSnackbar(mensajeError(err, "No se pudo descargar."), { variant: "error" });
    } finally {
      setDescargando(null);
    }
  };

  const r = data?.resumen;
  return (
    <div data-pagina="expediente-tablero" className={`mx-auto grid max-w-6xl gap-5 p-1 pb-10 text-[#111827] ${TEXTO}`}>
      <Encabezado titulo="Expediente y cumplimiento" subtitulo="Qué documentos exige la ley a cada persona, cuáles tiene y cuáles faltan."
        acciones={empresas.length > 1 ? (
          <label className="grid gap-1.5 font-bold">Empresa
            <select className={CAMPO} value={idEmpresa ?? ""} onChange={(e) => setIdEmpresa(Number(e.target.value))}>
              {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </label>
        ) : null} />

      {error ? <Aviso tono="rojo" titulo="No se pudo cargar el cumplimiento">{mensajeError(error, "Intenta de nuevo.")}</Aviso> : null}
      {!data && !error ? <Cargando /> : null}
      {data ? (
        <>
          {(data.avisos ?? []).map((a) => <Aviso key={a.categoria} tono="rojo" titulo={`Categoría «${a.categoria}»`}>{a.aviso}</Aviso>)}
          <Seccion id="resumen" titulo="Resumen" acciones={<Etiqueta tono={tonoPorcentaje(r.porcentaje)} data-porcentaje-general>{r.porcentaje} % general</Etiqueta>}>
            <Barra porcentaje={r.porcentaje} tono={tonoPorcentaje(r.porcentaje)} />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Dato titulo="Personas" valor={r.personas} />
              <Dato titulo="Completas" valor={r.completos} />
              <Dato titulo="Con faltantes" valor={r.con_faltantes} />
              <Dato titulo="Vencidos" valor={r.vencidos} nota={r.por_vencer ? `${r.por_vencer} por vencer` : null} />
            </div>
            {data.migracion ? (
              <div className="flex flex-wrap gap-3">
                <button type="button" className={BOTON_PRINCIPAL} disabled={Boolean(descargando)} onClick={() => descargar("xlsx")}>{descargando === "xlsx" ? "Preparando…" : "Descargar Excel"}</button>
                <button type="button" className={BOTON_SECUNDARIO} disabled={Boolean(descargando)} onClick={() => descargar("csv")}>{descargando === "csv" ? "Preparando…" : "Descargar CSV"}</button>
              </div>
            ) : <p className={SECUNDARIO}>La descarga estará lista cuando soporte de ADAMIA termine de preparar la base de datos.</p>}
          </Seccion>

          <Seccion id="personas" titulo="Personas" acciones={<p className={SECUNDARIO}>De la más incompleta a la más completa</p>}>
            <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" onSubmit={(e) => e.preventDefault()} aria-label="Filtros">
              <label className="grid gap-1.5 font-bold">Quiénes
                <select className={CAMPO} value={filtros.estado} onChange={cambiar("estado")}>
                  <option value="activos">Activos</option><option value="bajas">Bajas</option><option value="todos">Todos</option>
                </select>
              </label>
              <label className="grid gap-1.5 font-bold">Departamento
                <select className={CAMPO} value={filtros.departamento} onChange={cambiar("departamento")}>
                  <option value="">Todos</option>{data.filtros.departamentos.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 font-bold">Sucursal
                <select className={CAMPO} value={filtros.sucursal} onChange={cambiar("sucursal")}>
                  <option value="">Todas</option>{data.filtros.sucursales.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 font-bold">Buscar
                <input className={CAMPO} type="search" value={filtros.q} onChange={cambiar("q")} placeholder="Nombre o número" />
              </label>
              <label className="flex min-h-12 items-center gap-3 self-end font-bold">
                <input type="checkbox" className="size-6 accent-[#2563EB]" checked={filtros.incompletos} onChange={cambiar("incompletos")} /> Solo incompletos
              </label>
            </form>
            {data.personas.length === 0 ? <p className={SECUNDARIO}>Nadie con estos filtros.</p> : (
              <ul className="grid" data-lista-personas>
                {data.personas.map((p) => (
                  <li key={p.id_empleado} data-persona={p.id_empleado} className="grid gap-2 border-b border-slate-200 py-4 last:border-b-0 lg:grid-cols-[1fr_220px] lg:items-center lg:gap-6">
                    <div className="grid min-w-0 gap-1">
                      <Link href={`/panel/expediente/${p.id_empleado}?empresa=${idEmpresa}`} className="flex min-h-12 w-fit items-center break-words text-[19px] font-bold text-[#1D4ED8] underline-offset-4 hover:underline sm:text-lg">
                        {p.nombre}
                      </Link>
                      <p className={SECUNDARIO}>{[p.puesto, p.departamento, p.sucursal, p.activo ? null : `Baja ${fechaMx(p.fecha_baja) || "sin fecha"}`].filter(Boolean).join(" · ")}</p>
                      <p>{textoResumen(p)}</p>
                      {p.faltan_nombres.length ? <p className="text-[#7F1D1D]">Falta: {p.faltan_nombres.join(", ")}</p> : null}
                      {p.vencidos_nombres.length ? <p className="text-[#7F1D1D]">Vencido: {p.vencidos_nombres.join(", ")}</p> : null}
                    </div>
                    <div className="grid gap-2">
                      <Etiqueta tono={tonoPorcentaje(p.porcentaje)}>{p.porcentaje} %</Etiqueta>
                      <Barra porcentaje={p.porcentaje} tono={tonoPorcentaje(p.porcentaje)} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Seccion>
          <p className={SECUNDARIO}>
            Cuenta solo lo que exige la ley y aplica a cada persona (por ejemplo, el finiquito solo si está de baja). Los plazos marcados «por confirmar» se
            revisan con tu abogado. ADAMIA nunca pide pruebas de embarazo ni de VIH (art. 133 LFT).
          </p>
        </>
      ) : null}
    </div>
  );
}
