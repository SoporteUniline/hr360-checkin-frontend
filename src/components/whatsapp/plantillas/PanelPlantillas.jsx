"use client";

// Plantillas de WhatsApp (26/11/2026) · panel del administrador de ADAMIA. Lista las plantillas de Meta en Zernio con su
// estado, deja crearlas/editarlas/borrarlas y compara con el catálogo del sistema. Backend: /api/checador/whatsapp-plantillas
// (solo Admin de ADAMIA; la llave de Zernio nunca llega al navegador). Ver docs/plantillas-whatsapp.md del backend.
import { useMemo, useState } from "react";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { History, MessageSquareText, Plus, RefreshCw, Search } from "lucide-react";
import axios from "@/lib/axios";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import {
  CATEGORIAS, FORMULARIO_VACIO, chipEstado, conteoEstados, errorDe, filtrar, formularioDesde, resumenEnvio, textoCategoria,
} from "@/lib/whatsapp/plantillasMeta.mjs";
import FormularioPlantilla from "./FormularioPlantilla";
import DetallePlantilla from "./DetallePlantilla";
import CatalogoSistema from "./CatalogoSistema";
import { boton, botonSec, caja, campo, chip } from "./estilos";

const API = "/checador/whatsapp-plantillas";
const get = (url) => axios.get(url).then((r) => r.data);
const SWR = { shouldRetryOnError: false, revalidateOnFocus: false };
const ACCION = { crear: "Creó", editar: "Editó", borrar: "Borró", enviar_faltantes: "Envió (catálogo)" };
const fechaHora = (v) => (v ? String(v).slice(0, 16).replace("T", " ") : "");

function Tarjeta({ p, alVer }) {
  const e = chipEstado(p.estado);
  return (
    <li data-plantilla={p.nombre} className="min-w-0">
      <button type="button" onClick={() => alVer(p)} aria-label={`Ver ${p.nombre} (${p.idioma})`}
        className="grid h-full w-full min-w-0 content-start gap-2 rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-brand focus-visible:border-brand focus-visible:outline-none">
        <span className="flex min-w-0 flex-wrap items-start justify-between gap-2">
          <span className="min-w-0 break-all text-sm font-bold text-slate-900">{p.nombre}</span>
          <span className={`${chip} ${e.tono}`}>{e.texto}</span>
        </span>
        <span className="text-[13px] text-slate-600">{textoCategoria(p.categoria)} · {p.idioma} · {p.variables} variable(s)</span>
        <span className="line-clamp-2 break-words text-[13px] text-slate-700">{p.cuerpo || "—"}</span>
        {p.estado === "rechazada" && p.motivo_rechazo ? <span className="text-[13px] text-red-700">Motivo: {p.motivo_rechazo}</span> : null}
      </button>
    </li>
  );
}

export default function PanelPlantillas() {
  const { enqueueSnackbar } = useSnackbar();
  const [vista, setVista] = useState("zernio");
  const [cuenta, setCuenta] = useState("notificaciones");
  const [filtro, setFiltro] = useState({ categoria: "", estado: "", texto: "" });
  const [viendo, setViendo] = useState(null);
  const [formulario, setFormulario] = useState(null); // { modo, inicial, cuenta }
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const cuentas = useSWR(`${API}/cuentas`, get, SWR);
  const lista = useSWR(`${API}?cuenta=${cuenta}`, get, SWR);
  const catalogo = useSWR(vista === "catalogo" ? `${API}/catalogo` : null, get, SWR);
  const bitacora = useSWR(vista === "bitacora" ? `${API}/bitacora?limite=50` : null, get, SWR);

  const plantillas = useMemo(() => lista.data?.plantillas ?? [], [lista.data]);
  const visibles = useMemo(() => filtrar(plantillas, filtro), [plantillas, filtro]);
  const conteo = useMemo(() => conteoEstados(plantillas), [plantillas]);
  const infoCuenta = (k) => cuentas.data?.cuentas?.find((c) => c.clave === k);
  const actualizar = () => Promise.all([lista.mutate(), catalogo.mutate(), bitacora.mutate()]);

  const guardar = async (cuerpo) => {
    const { modo, cuenta: c, inicial } = formulario;
    try {
      if (modo === "editar") await axios.put(`${API}/${encodeURIComponent(inicial.nombre)}?cuenta=${c}`, cuerpo);
      else await axios.post(`${API}?cuenta=${c}`, cuerpo);
      enqueueSnackbar(modo === "editar" ? "Plantilla editada: volvió a revisión de Meta." : "Plantilla enviada a aprobación de Meta.", { variant: "success" });
      setFormulario(null);
      setViendo(null);
      if (c !== cuenta) setCuenta(c);
      await actualizar();
      return null;
    } catch (e) {
      return { error: errorDe(e), errores: e?.response?.data?.errores };
    }
  };

  const borrar = async (p, confirmar) => {
    const r = await axios.delete(`${API}/${encodeURIComponent(p.nombre)}`, { params: { cuenta, idioma: p.idioma, confirmar } });
    enqueueSnackbar(r.data?.en_catalogo ? "Plantilla borrada. Era del sistema: créala otra vez desde el catálogo cuando haga falta." : "Plantilla borrada.", { variant: "success" });
    setViendo(null);
    await actualizar();
  };

  const enviarFaltantes = async () => {
    const n = (catalogo.data?.filas ?? []).filter((f) => f.situacion === "falta").length;
    if (!window.confirm(`¿Enviar a aprobación de Meta las ${n} plantillas que faltan? Meta las revisa en hasta 24 h.`)) return;
    setEnviando(true);
    setResultado(null);
    try {
      const r = await axios.post(`${API}/catalogo/enviar-faltantes`, {});
      setResultado(r.data);
      enqueueSnackbar(resumenEnvio(r.data), { variant: r.data.errores?.length ? "warning" : "success" });
      await actualizar();
    } catch (e) {
      enqueueSnackbar(errorDe(e), { variant: "error" });
    } finally {
      setEnviando(false);
    }
  };

  const pestana = (k, texto, corto = texto) => (
    <button key={k} type="button" role="tab" aria-selected={vista === k} aria-label={texto} onClick={() => setVista(k)}
      className={`min-h-11 rounded-lg px-3 text-sm font-semibold ${vista === k ? "bg-brand text-white" : "text-slate-700 hover:bg-slate-100"}`}>
      <span className="sm:hidden">{corto}</span><span className="hidden sm:inline">{texto}</span>
    </button>
  );
  const chipFiltro = (valor, texto, n) => (
    <button key={valor || "todas"} type="button" aria-pressed={filtro.estado === valor} onClick={() => setFiltro((f) => ({ ...f, estado: valor }))}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold ${filtro.estado === valor ? "border-brand bg-brand/5 text-brand" : "border-slate-300 bg-white text-slate-700"}`}>
      {texto}{n != null ? <span className="tabular-nums text-slate-500">{n}</span> : null}
    </button>
  );
  const cuentaActual = infoCuenta(cuenta);

  return (
    <div data-panel-plantillas className="mx-auto w-full min-w-0 max-w-6xl space-y-4">
      <EncabezadoPagina icono={MessageSquareText} titulo="Plantillas de WhatsApp" />
      <p className="text-[13px] text-slate-600">Mensajes aprobados por Meta que ADAMIA manda por Zernio. Solo las aprobadas se pueden enviar; Meta revisa cada una en hasta 24 h.</p>

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Sección" className="grid w-full grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:flex sm:w-auto">
          {pestana("zernio", "En Zernio")}{pestana("catalogo", "Catálogo del sistema", "Catálogo")}{pestana("bitacora", "Bitácora")}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={botonSec} onClick={actualizar}><RefreshCw className="size-4" /> Actualizar</button>
          <button type="button" className={boton} onClick={() => setFormulario({ modo: "crear", cuenta, inicial: { ...FORMULARIO_VACIO, botones: [] } })}><Plus className="size-4" /> Nueva plantilla</button>
        </div>
      </div>

      {vista === "zernio" ? (
        <section aria-label="Plantillas en Zernio" className={`${caja} grid min-w-0 gap-3`}>
          <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_minmax(0,1fr)]">
            <label className="grid min-w-0 gap-1">
              <span className="text-[13px] font-semibold text-slate-700">Número</span>
              <select className={campo} value={cuenta} onChange={(e) => setCuenta(e.target.value)}>
                {(cuentas.data?.cuentas ?? [{ clave: "notificaciones", etiqueta: "Número de notificaciones de ADAMIA" }]).map((c) => <option key={c.clave} value={c.clave}>{c.etiqueta}{c.configurada === false ? " (sin configurar)" : ""}</option>)}
              </select>
            </label>
            <label className="grid min-w-0 gap-1">
              <span className="text-[13px] font-semibold text-slate-700">Categoría</span>
              <select className={campo} value={filtro.categoria} onChange={(e) => setFiltro((f) => ({ ...f, categoria: e.target.value }))}>
                <option value="">Todas</option>
                {CATEGORIAS.map((c) => <option key={c.valor} value={c.valor}>{c.texto}</option>)}
              </select>
            </label>
            <label className="grid min-w-0 gap-1">
              <span className="text-[13px] font-semibold text-slate-700">Buscar</span>
              <span className="relative block min-w-0">
                <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-slate-400" aria-hidden="true" />
                <input type="search" className={`${campo} pl-9`} value={filtro.texto} onChange={(e) => setFiltro((f) => ({ ...f, texto: e.target.value }))} placeholder="Nombre o texto" />
              </span>
            </label>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Filtrar por estado">
            {chipFiltro("", "Todas", plantillas.length)}
            {["aprobada", "pendiente", "rechazada", "pausada", "desactivada"].filter((k) => conteo[k] || k === "aprobada" || k === "pendiente" || k === "rechazada").map((k) => chipFiltro(k, chipEstado(k).texto, conteo[k] ?? 0))}
          </div>
          {cuentaActual?.configurada === false ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-800">{cuentaActual.etiqueta}: {cuentaActual.motivo}</p> : null}
          {lista.isLoading ? <p role="status" className="text-sm text-slate-500">Leyendo plantillas de Zernio…</p> : null}
          {lista.error && cuentaActual?.configurada !== false ? <p role="alert" data-error-lista className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorDe(lista.error, "No se pudieron leer las plantillas de Zernio.")}</p> : null}
          {lista.data && !visibles.length ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <p className="font-semibold text-slate-800">{plantillas.length ? "Ninguna plantilla con ese filtro." : "Aún no hay plantillas en este número."}</p>
              <p className="text-[13px] text-slate-600">{plantillas.length ? "Cambia el filtro." : "Crea una o revisa el «Catálogo del sistema» para mandar las que ADAMIA necesita."}</p>
            </div>
          ) : null}
          {visibles.length ? <ul className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3">{visibles.map((p) => <Tarjeta key={`${p.nombre}:${p.idioma}`} p={p} alVer={setViendo} />)}</ul> : null}
        </section>
      ) : null}

      {vista === "catalogo" ? (
        <CatalogoSistema data={catalogo.data} cargando={catalogo.isLoading} error={catalogo.error ? errorDe(catalogo.error) : ""} enviando={enviando} resultado={resultado}
          alEnviarFaltantes={enviarFaltantes} alCrear={(f) => setFormulario({ modo: "crear", cuenta: f.cuenta, inicial: formularioDesde(f.catalogo) })} />
      ) : null}

      {vista === "bitacora" ? (
        <section aria-labelledby="titulo-bitacora" className={`${caja} grid min-w-0 gap-3`}>
          <h2 id="titulo-bitacora" className="flex items-center gap-2 text-[15px] font-bold text-slate-900"><History className="size-4 text-brand" /> Quién creó, editó o envió</h2>
          {bitacora.data && !bitacora.data.disponible ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-800">La bitácora está apagada: falta correr la migración 20261223_whatsapp_plantillas_admin.sql. El panel funciona igual.</p> : null}
          {bitacora.error ? <p role="alert" className="text-sm text-red-700">{errorDe(bitacora.error)}</p> : null}
          {bitacora.data?.registros?.length ? (
            <ul className="grid min-w-0 gap-2">
              {bitacora.data.registros.map((r) => (
                <li key={r.id} className="min-w-0 rounded-xl border border-slate-200 p-3 text-[13px]">
                  <p className="break-all font-semibold text-slate-900">{ACCION[r.accion] ?? r.accion} {r.nombre} <span className="font-normal text-slate-500">({r.idioma ?? "—"} · {r.cuenta})</span></p>
                  <p className="text-slate-600">{fechaHora(r.creado_en)} · {r.usuario_nombre || r.usuario_correo || "—"} · <span className={r.resultado === "ok" ? "text-emerald-700" : "text-red-700"}>{r.resultado === "ok" ? "correcto" : "error"}</span></p>
                  {r.detalle ? <p className="break-words text-slate-600">{r.detalle}</p> : null}
                </li>
              ))}
            </ul>
          ) : bitacora.data?.disponible ? <p className="text-[13px] text-slate-500">Sin movimientos todavía.</p> : null}
        </section>
      ) : null}

      <DetallePlantilla plantilla={viendo} cuenta={cuenta} alCerrar={() => setViendo(null)} alBorrar={borrar}
        alEditar={(p) => { setViendo(null); setFormulario({ modo: "editar", cuenta, inicial: formularioDesde(p) }); }}
        alNuevaVersion={(p) => { setViendo(null); setFormulario({ modo: "crear", cuenta, inicial: formularioDesde(p, { version: true }) }); }} />
      <FormularioPlantilla abierto={Boolean(formulario)} modo={formulario?.modo} inicial={formulario?.inicial} cuentaTexto={infoCuenta(formulario?.cuenta)?.etiqueta ?? "el número de notificaciones"}
        alCerrar={() => setFormulario(null)} guardar={guardar} />
    </div>
  );
}
