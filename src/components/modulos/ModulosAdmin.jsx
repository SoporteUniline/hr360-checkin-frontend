"use client";
// Admin de ADAMIA: el DERECHO.
//   ModulosEmpresaAdmin: en el detalle de una empresa, sus módulos y los extras / quitados (con nota), con su bitácora.
//   ModulosPlanesAdmin: qué módulos opcionales incluye cada plan. Plan sin configurar = incluye todo.
import { useState } from "react";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { LayoutGrid } from "lucide-react";
import axios from "@/lib/axios";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import { ORIGEN, seccionesModulos } from "@/lib/modulos/menu.mjs";
import { OPCIONALES, modulo } from "@/lib/modulos/catalogo.mjs";

const get = (url) => axios.get(url).then((r) => r.data);
const errorDe = (e, porDefecto) => e?.response?.data?.error || porDefecto;
const botonChico = "inline-flex min-h-11 items-center justify-center rounded-lg border px-3 text-[13px] font-semibold disabled:opacity-50";
const fecha = (v) => (v ? new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" }).format(new Date(String(v).replace(" ", "T"))) : "");
const TEXTO_CAMBIO = { encendido: "encendido", apagado: "apagado", plan: "según plan", incluir: "extra incluido", quitar: "quitado", incluido: "incluido", no_incluido: "no incluido", sin_configurar: "sin configurar" };

function Estado({ m }) {
  const color = m.activo ? "bg-emerald-50 text-emerald-700" : m.derecho ? "bg-slate-100 text-slate-700" : "bg-amber-50 text-amber-800";
  return <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${color}`}>{m.activo ? "Activo" : m.derecho ? "Apagado por la empresa" : "Sin derecho"}</span>;
}

export function ModulosEmpresaAdmin({ idEmpresa }) {
  const { enqueueSnackbar } = useSnackbar();
  const llave = idEmpresa ? `/checador/modulos/admin/empresas/${idEmpresa}/modulos` : null;
  const { data, error, isLoading, mutate } = useSWR(llave, get, { revalidateOnFocus: false, shouldRetryOnError: false });
  const [editando, setEditando] = useState(null); // { clave, derecho }
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);

  const guardar = async (clave, derecho, textoNota) => {
    setGuardando(true);
    try {
      const r = await axios.put(`/checador/modulos/admin/empresas/${idEmpresa}/modulos/${clave}`, { derecho, nota: textoNota });
      await mutate(r.data, { revalidate: false });
      setEditando(null);
      setNota("");
      enqueueSnackbar("Listo, quedó guardado.", { variant: "success" });
    } catch (e) {
      enqueueSnackbar(errorDe(e, "No se pudo guardar."), { variant: "error" });
    } finally {
      setGuardando(false);
    }
  };

  if (error) return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{errorDe(error, "No se pudieron cargar los módulos.")}</p>;
  if (isLoading || !data) return <p role="status" className="text-sm text-slate-500">Cargando módulos…</p>;
  const { base } = seccionesModulos(data.modulos);
  const opcionales = data.modulos.filter((m) => !m.base);
  return (
    <div className="space-y-4" data-admin-modulos={idEmpresa}>
      <p className="text-sm text-slate-600">
        Plan actual: <strong>{data.plan?.id ? `#${data.plan.id}` : "sin plan"}</strong>
        {data.plan?.configurado ? "" : " (sin configurar: incluye todos los módulos)"}. Base siempre incluida: {base.map((m) => m.nombre).join(", ")}.
      </p>
      <ul className="grid gap-2">
        {opcionales.map((m) => (
          <li key={m.clave} data-modulo={m.clave} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-[15px] font-bold text-slate-900">{m.nombre}</h3>
                <p className="mt-0.5 text-[12.5px] text-slate-500">{m.origen === "plan" ? (m.derecho ? "Incluido en su plan" : "No incluido en su plan") : m.origen === "extra" ? "Extra de esta empresa" : ORIGEN[m.origen]}{m.nota ? ` · ${m.nota}` : ""}{m.derecho_en ? ` · ${fecha(m.derecho_en)}` : ""}</p>
                <div className="mt-1.5"><Estado m={m} /></div>
              </div>
              <div className="flex flex-wrap gap-2">
                {m.origen !== "extra" ? <button type="button" className={`${botonChico} border-blue-200 text-blue-700 hover:bg-blue-50`} disabled={guardando} onClick={() => { setEditando({ clave: m.clave, derecho: "incluir" }); setNota(""); }}>Incluir como extra</button> : null}
                {m.origen !== "quitado" ? <button type="button" className={`${botonChico} border-red-200 text-red-700 hover:bg-red-50`} disabled={guardando} onClick={() => { setEditando({ clave: m.clave, derecho: "quitar" }); setNota(""); }}>Quitar</button> : null}
                {m.origen === "extra" || m.origen === "quitado" ? <button type="button" className={`${botonChico} border-slate-300 text-slate-700 hover:bg-slate-50`} disabled={guardando} onClick={() => guardar(m.clave, "plan", null)}>Según su plan</button> : null}
              </div>
            </div>
            {editando?.clave === m.clave ? (
              <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); guardar(m.clave, editando.derecho, nota); }}>
                <label className="block text-[13px] font-semibold text-slate-700" htmlFor={`nota-${m.clave}`}>
                  {editando.derecho === "incluir" ? "Nota: por qué se incluye (p. ej., contrató el módulo, folio)" : "Nota: por qué se quita"}
                </label>
                <textarea id={`nota-${m.clave}`} required maxLength={300} rows={2} value={nota} onChange={(e) => setNota(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2 text-sm" />
                <div className="flex gap-2">
                  <button type="submit" disabled={guardando || !nota.trim()} className={`${botonChico} border-transparent bg-[#2563EB] text-white`}>{guardando ? "Guardando…" : "Guardar"}</button>
                  <button type="button" onClick={() => setEditando(null)} className={`${botonChico} border-slate-300 text-slate-700`}>Cancelar</button>
                </div>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
      {data.cambios?.length ? (
        <section aria-labelledby="bitacora-modulos" className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 id="bitacora-modulos" className="text-sm font-bold text-slate-800">Historial de cambios</h3>
          <ul className="mt-2 divide-y divide-slate-100 text-[13px]">
            {data.cambios.map((c) => (
              <li key={c.id} className="py-2 text-slate-600">
                <strong className="text-slate-800">{modulo(c.modulo)?.nombre ?? c.modulo}</strong>: {TEXTO_CAMBIO[c.antes] ?? c.antes} → {TEXTO_CAMBIO[c.despues] ?? c.despues}
                {c.nota ? ` · «${c.nota}»` : ""} · {c.nombre_usuario || c.tipo_usuario || "—"} · {fecha(c.creado_en)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

const rango = (p) => (p.usuarios_max ? `${p.usuarios_min ?? 0} a ${p.usuarios_max} usuarios` : `${p.usuarios_min ?? 0} usuarios o más`);

function PlanTarjeta({ plan, alGuardar }) {
  const [incluidos, setIncluidos] = useState(() => new Set(plan.modulos.filter((m) => m.incluido).map((m) => m.clave)));
  const [guardando, setGuardando] = useState(false);
  const cambiado = OPCIONALES.some((c) => incluidos.has(c) !== plan.modulos.find((m) => m.clave === c)?.incluido) || !plan.configurado;
  const alternar = (c) => setIncluidos((s) => { const n = new Set(s); if (n.has(c)) n.delete(c); else n.add(c); return n; });
  return (
    <li data-plan={plan.id} className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="text-[15px] font-bold text-slate-900">Plan #{plan.id} · {rango(plan)}</h2>
        <span className="text-[12.5px] font-medium text-slate-500">{plan.configurado ? "Configurado" : "Sin configurar: incluye todo"}</span>
      </div>
      <fieldset className="mt-3">
        <legend className="sr-only">Módulos del plan {plan.id}</legend>
        <div className="grid gap-1 sm:grid-cols-2">
          {OPCIONALES.map((c) => (
            <label key={c} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm text-slate-800 hover:bg-slate-50">
              <input type="checkbox" className="size-5 accent-[#2563EB]" checked={incluidos.has(c)} onChange={() => alternar(c)} />
              <span className="min-w-0 break-words">{modulo(c).nombre}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <button
        type="button" disabled={guardando || !cambiado}
        className={`${botonChico} mt-3 border-transparent bg-[#2563EB] text-white`}
        onClick={async () => { setGuardando(true); await alGuardar(plan.id, [...incluidos]); setGuardando(false); }}
      >
        {guardando ? "Guardando…" : "Guardar plan"}
      </button>
    </li>
  );
}

export function ModulosPlanesAdmin() {
  const { enqueueSnackbar } = useSnackbar();
  const { data, error, isLoading, mutate } = useSWR("/checador/modulos/admin/planes", get, { revalidateOnFocus: false, shouldRetryOnError: false });
  const guardar = async (id, incluidos) => {
    try {
      await axios.put(`/checador/modulos/admin/planes/${id}/modulos`, { incluidos });
      await mutate();
      enqueueSnackbar(`Plan #${id} guardado. Aplica a todas sus empresas.`, { variant: "success" });
    } catch (e) {
      enqueueSnackbar(errorDe(e, "No se pudo guardar el plan."), { variant: "error" });
    }
  };
  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-3 sm:p-6">
      <EncabezadoPagina icono={LayoutGrid} titulo="Módulos por plan" subtitulo="Qué incluye cada plan. Asistencias y Empleados siempre van incluidos. Los extras de una empresa se dan en su detalle." />
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{errorDe(error, "No se pudieron cargar los planes.")}</p> : null}
      {isLoading ? <p role="status" className="text-sm text-slate-500">Cargando planes…</p> : null}
      {data?.planes?.length === 0 ? <p className="text-sm text-slate-500">No hay planes registrados.</p> : null}
      <ul className="grid gap-3">
        {(data?.planes ?? []).map((p) => <PlanTarjeta key={`${p.id}-${p.configurado}-${p.modulos.map((m) => +m.incluido).join("")}`} plan={p} alGuardar={guardar} />)}
      </ul>
    </div>
  );
}
