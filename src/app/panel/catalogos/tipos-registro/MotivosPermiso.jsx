"use client";

// «Motivos (por qué)» del catálogo: Permiso personal, Visita al médico… Cada motivo trae su pago: Goce del día, Horas no
// trabajadas (se reponen / se descuentan / se pagan) y si RH lo puede cambiar al aplicar. Los globales vienen del
// sistema (el nombre no cambia 🔒) y su configuración es la de tu empresa (etiqueta «Personalizado» si la cambiaste);
// los de tu empresa se editan directo. Agregar y ocultar; nada se borra.
// GET /checador/motivos-permiso?todos=1 · POST { nombre, goce, horas, cambia_al_aplicar } · PUT /:id { goce?, horas?,
// cambia_al_aplicar?, oculto? (globales) / activo? (propios) } (+ id_empresa con varias empresas).
import { useState } from "react";
import useSWR, { mutate as mutarGlobal } from "swr";
import { useSnackbar } from "notistack";
import { ChevronRight, EyeOff, Lock, Plus } from "lucide-react";
import axios from "@/lib/axios";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import { GOCES, HORAS } from "@/lib/asistencia/tiposGoce.mjs";
import { normalizarMotivo } from "@/lib/asistencia/quePasoMotivo.mjs";
import SelectConIconos from "@/components/ui/SelectConIconos";
import { ICONO_CAMBIA, ICONO_GOCE, ICONO_HORAS, iconoMotivo, textoLimpio } from "@/components/asistencia/iconosAsistencia";

export const CLAVE_MOTIVOS = "/checador/motivos-permiso";
const CAMPO = "h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 text-[13.5px] text-slate-900 "
  + "focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:bg-slate-50 max-sm:h-11 max-sm:text-base";
const COLUMNAS = "sm:grid-cols-[minmax(0,1fr)_150px_290px_190px_40px]";
const NUEVO = { nombre: "", goce: "sin", horas: "reponen", cambia: true };
const OP_GOCE = GOCES.map(([v, t]) => ({ valor: v, texto: t, ...ICONO_GOCE[v] }));
const OP_HORAS = HORAS.map(([v, t]) => ({ valor: v, texto: t, ...ICONO_HORAS[v] }));
const OP_CAMBIA = [{ valor: "1", texto: "Sí, RH lo cambia", ...ICONO_CAMBIA.si }, { valor: "0", texto: "No", ...ICONO_CAMBIA.no }];

function Campo({ etiqueta, children }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[12px] font-medium text-slate-500 sm:sr-only" aria-hidden>{etiqueta}</span>
      {children}
    </div>
  );
}

function IconoMotivo({ nombre, otro }) {
  const { icono: I, tono } = iconoMotivo(nombre, { otro });
  return <span aria-hidden className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${tono}`}><I className="h-3.5 w-3.5" /></span>;
}

export default function MotivosPermiso({ empresa = "", variasEmpresas = false }) {
  const { enqueueSnackbar } = useSnackbar();
  const conEmpresa = variasEmpresas && empresa ? `&empresa=${empresa}` : "";
  const clave = `${CLAVE_MOTIVOS}?todos=1${conEmpresa}`;
  const { data, error, isLoading, mutate } = useSWR(clave, fetcherWithToken, swr_config);
  const [nuevo, setNuevo] = useState(NUEVO);
  const [guardando, setGuardando] = useState(false);
  const todos = (Array.isArray(data?.motivos) ? data.motivos : []).map((m) => ({ ...normalizarMotivo(m), crudo: m }));
  const visibles = todos.filter((m) => !m.oculto);
  const ocultos = todos.filter((m) => m.oculto);
  const existe = (n) => todos.some((m) => m.nombre.toLowerCase() === n.trim().toLowerCase());
  const empresaCuerpo = variasEmpresas && empresa ? { id_empresa: Number(empresa) } : {};

  const pedir = async (fn, ok) => {
    setGuardando(true);
    try {
      await fn();
      enqueueSnackbar(ok, { variant: "success" });
      // También los selects de Asistencias, el reloj y Permisos.
      await Promise.all([mutate(), mutarGlobal((k) => typeof k === "string" && k.startsWith(CLAVE_MOTIVOS))]);
      return true;
    } catch (e) {
      // Sin la migración «Qué pasó y Motivo» (503 SIN_MIGRACION) el pago de los motivos aún no se puede configurar.
      enqueueSnackbar(e?.response?.data?.codigo === "SIN_MIGRACION"
        ? "Aún no se puede configurar: falta aplicar la actualización de la base de datos."
        : e?.response?.data?.error || "No se pudo guardar el motivo.", { variant: e?.response?.data?.codigo === "SIN_MIGRACION" ? "warning" : "error" });
      return false;
    } finally { setGuardando(false); }
  };
  const editar = (m, cambios, ok) => pedir(() => axios.put(`${CLAVE_MOTIVOS}/${m.id}`, { ...cambios, ...empresaCuerpo }), ok);
  const agregar = async () => {
    const nombre = nuevo.nombre.trim();
    if (!nombre || existe(nombre)) return;
    const cuerpo = { nombre, goce: nuevo.goce, horas: nuevo.horas, cambia_al_aplicar: nuevo.cambia ? 1 : 0, ...empresaCuerpo };
    if (await pedir(() => axios.post(CLAVE_MOTIVOS, cuerpo), `Motivo «${nombre}» agregado.`)) setNuevo(NUEVO);
  };
  const ocultar = (m, oculto) => editar(m, m.global ? { oculto } : { activo: !oculto },
    oculto ? `Motivo «${m.nombre}» oculto: ya no se ofrece.` : `Motivo «${m.nombre}» visible otra vez.`);

  return (
    <section data-motivos className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <h2 className="text-[15px] font-semibold text-slate-900">Motivos (por qué)</h2>
      <p className="mt-0.5 text-[13px] text-slate-500">
        «Qué pasó» dice el tipo; el motivo dice por qué y cuánto se paga. Una inasistencia con motivo queda justificada con el goce
        del motivo; una entrada tarde o salida temprano con motivo deja el día con goce y las horas como diga el motivo.
      </p>
      {error ? <p role="alert" className="mt-3 text-[13px] text-rose-700">No se pudieron cargar los motivos.</p> : null}
      {isLoading ? <p role="status" className="mt-3 text-[13px] text-slate-500">Cargando motivos…</p> : null}

      <div className="mt-3 flex flex-col">
        <div className={`hidden gap-3 border-b border-slate-200 pb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500 sm:grid ${COLUMNAS}`}>
          <span>Motivo</span><span>Goce</span><span>Horas no trabajadas</span><span>Se cambia al aplicar</span><span className="sr-only">Ocultar</span>
        </div>
        {visibles.map((m) => (
          <div key={m.id} data-motivo={m.nombre}
            className={`grid grid-cols-1 items-center gap-2.5 border-b border-slate-100 py-2.5 last:border-b-0 ${COLUMNAS}`}>
            <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-[13.5px] font-medium text-slate-900">
              <IconoMotivo nombre={m.nombre} otro={m.otro} />
              <span className="break-words">{textoLimpio(m.nombre)}</span>
              {m.global ? <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-label="Del sistema: el nombre no cambia" /> : null}
              {m.personalizado ? <span data-personalizado className="rounded-full bg-blue-50 px-2 py-0.5 text-[12px] font-medium text-blue-700">Personalizado</span> : null}
            </span>
            <Campo etiqueta="Goce">
              <SelectConIconos aria={`Goce de ${m.nombre}`} valor={m.goce ?? "sin"} disabled={guardando} opciones={OP_GOCE}
                onCambio={(v) => editar(m, { goce: v }, `«${m.nombre}»: ${v === "con" ? "con" : "sin"} goce.`)} />
            </Campo>
            <Campo etiqueta="Horas no trabajadas">
              <SelectConIconos aria={`Horas no trabajadas de ${m.nombre}`} valor={m.horas ?? "reponen"} disabled={guardando} opciones={OP_HORAS}
                onCambio={(v) => editar(m, { horas: v }, `«${m.nombre}»: horas actualizadas.`)} />
            </Campo>
            <Campo etiqueta="Se cambia al aplicar">
              <SelectConIconos aria={`Se cambia al aplicar ${m.nombre}`} valor={m.cambia ? "1" : "0"} disabled={guardando} opciones={OP_CAMBIA}
                onCambio={(v) => editar(m, { cambia_al_aplicar: Number(v) }, `«${m.nombre}»: actualizado.`)} />
            </Campo>
            <span className="flex justify-end">
              <button type="button" disabled={guardando} onClick={() => ocultar(m, true)} aria-label={`Ocultar ${m.nombre}`} title="Ocultar"
                className="inline-flex h-9 w-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 max-sm:h-11 max-sm:w-full max-sm:text-[14px]">
                <EyeOff className="h-4 w-4" aria-hidden /><span className="sm:hidden">Ocultar</span>
              </button>
            </span>
          </div>
        ))}
      </div>

      <div data-motivo-nuevo className={`mt-3 grid grid-cols-1 items-end gap-3 rounded-lg bg-slate-50 p-3 ${COLUMNAS}`}>
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-[12px] font-medium text-slate-500">Nuevo motivo de tu empresa</span>
          <input aria-label="Nuevo motivo" placeholder="Ej. Boda, Mudanza…" value={nuevo.nombre} maxLength={120}
            onChange={(e) => setNuevo((n) => ({ ...n, nombre: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") agregar(); }} className={CAMPO} />
        </label>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[12px] font-medium text-slate-500" aria-hidden>Goce</span>
          <SelectConIconos aria="Goce del nuevo motivo" valor={nuevo.goce} onCambio={(v) => setNuevo((n) => ({ ...n, goce: v }))} opciones={OP_GOCE} />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[12px] font-medium text-slate-500" aria-hidden>Horas no trabajadas</span>
          <SelectConIconos aria="Horas del nuevo motivo" valor={nuevo.horas} onCambio={(v) => setNuevo((n) => ({ ...n, horas: v }))} opciones={OP_HORAS} />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[12px] font-medium text-slate-500" aria-hidden>Se cambia al aplicar</span>
          <SelectConIconos aria="Se cambia al aplicar el nuevo motivo" valor={nuevo.cambia ? "1" : "0"} onCambio={(v) => setNuevo((n) => ({ ...n, cambia: v === "1" }))} opciones={OP_CAMBIA} />
        </div>
        <button type="button" onClick={agregar} disabled={guardando || !nuevo.nombre.trim() || existe(nuevo.nombre)} aria-label="Agregar"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-blue-600 bg-blue-600 px-2 text-[13.5px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50 max-sm:h-11">
          <Plus className="h-4 w-4" aria-hidden /><span className="sm:sr-only">Agregar</span>
        </button>
      </div>
      {nuevo.nombre.trim() && existe(nuevo.nombre) ? <p className="mt-1 text-[12px] text-amber-700">Ese motivo ya existe.</p> : null}

      {ocultos.length ? (
        <details data-motivos-ocultos className="group mt-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] font-semibold text-slate-600 [&::-webkit-details-marker]:hidden">
            <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-90" aria-hidden />Ocultos · {ocultos.length}
          </summary>
          <ul className="mt-2 flex flex-wrap gap-2">
            {ocultos.map((m) => (
              <li key={m.id} className="inline-flex h-9 items-center gap-2 rounded-full bg-slate-100 pl-3 pr-1 text-[13px] text-slate-600">
                {m.nombre}
                <button type="button" disabled={guardando} onClick={() => ocultar(m, false)}
                  className="h-7 rounded-full bg-white px-2.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50">Mostrar</button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <p className="mt-3 text-[12px] text-slate-500">«Entrada antes de tiempo» y «salida después» no son permisos: los calcula el reloj. Llegar antes no genera extra; salir después sí, solo si alguien la autoriza.</p>
    </section>
  );
}
