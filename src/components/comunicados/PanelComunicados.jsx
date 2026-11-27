"use client";
// Comunicados › Administrar (maqueta «Main», aprobada 27/11/2026): resumen, filtros y la lista de lo publicado con su
// lectura. Desde el 27/11/2026 la primera pestaña de Comunicados es el muro (MuroPanel.jsx) y esta tabla es «Administrar».
// Los posts de empleados que esperan aprobación salen en «Por aprobar» con Aprobar / Rechazar.
// Backend: GET /checador/comunicados, POST /:id/aprobar, POST /:id/rechazar.
// Escritorio: tabla de 6 columnas; teléfono: una tarjeta por comunicado (sin scroll horizontal).
import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Megaphone, Pin, Plus, Search } from "lucide-react";
import axios from "@/lib/axios";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import { SelectorEmpresa } from "@/components/nomina/comun";
import { Ventana } from "@/components/avisos/Ventana";
import {
  API, FILTROS_PANEL, LIMITES, RUTA_NUEVO, errorDe, etiquetaEstado, fechaRelativa, filtrarLocal,
  rutaSeguimiento, tarjetasResumen, textoCanales, textoLectura, textoPara, textoTipo, urlListado,
} from "@/lib/comunicados/comunicados.mjs";
import PestanasComunicados from "./PestanasComunicados";
import { AvisoError, Insignia, Mensaje, botonPrimario, botonSecundario, entrada, get, opcionesSwr, tarjeta, useZona, useEmpresa, usePuedeEditar } from "./comun";

const POR_PAGINA = 20;

function DialogoRechazar({ item, alCerrar, alRechazar }) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const rechazar = async () => {
    if (!motivo.trim()) { setError("Escribe por qué no se publica (se le avisa a quien la escribió)."); return; }
    setEnviando(true);
    try { await alRechazar(motivo.trim()); alCerrar(); } catch (e) { setError(errorDe(e)); } finally { setEnviando(false); }
  };
  return (
    <Ventana abierta={Boolean(item)} onOpenChange={(o) => !o && alCerrar()} titulo="Rechazar publicación" descripcion={item?.titulo} className="sm:max-w-md">
      <div className="grid gap-3 px-4 pb-5 pt-3 sm:px-6">
        <label htmlFor="motivo-rechazo" className="text-sm font-semibold text-slate-800">Motivo</label>
        <textarea id="motivo-rechazo" rows={3} maxLength={LIMITES.motivo} value={motivo} onChange={(e) => { setMotivo(e.target.value); setError(null); }} aria-invalid={Boolean(error)} aria-describedby={error ? "motivo-rechazo-error" : undefined} className={`${entrada} py-2`} />
        {error ? <span id="motivo-rechazo-error" className="text-[13px] text-red-700">{error}</span> : null}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={botonSecundario} onClick={alCerrar}>Cancelar</button>
          <button type="button" className={`${botonPrimario} bg-red-600 hover:bg-red-700`} disabled={enviando} onClick={rechazar}>{enviando ? "Rechazando…" : "Rechazar"}</button>
        </div>
      </div>
    </Ventana>
  );
}

function Fila({ it, tz, porAprobar, alAprobar, alRechazar }) {
  const opciones = { tz };
  const etiqueta = etiquetaEstado(it);
  return (
    <li data-comunicado={it.id} className="grid gap-2 border-t border-slate-200 px-4 py-4 first:border-t-0 lg:grid-cols-[2.6fr_1fr_1.4fr_1.3fr_1.5fr_0.8fr] lg:items-center lg:gap-3 lg:px-[18px]">
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          {it.fijado ? <Pin className="size-4 shrink-0 text-[#2563EB]" aria-label="Fijado en el muro" /> : null}
          <Link href={rutaSeguimiento(it.id)} className="flex min-h-11 min-w-0 items-center break-words text-sm font-bold text-slate-900 hover:underline lg:min-h-0">{it.titulo}</Link>
          <Insignia etiqueta={etiqueta} />
        </span>
        {it.autor?.nombre && porAprobar ? <span className="block text-[13px] text-slate-600">Escrita por {it.autor.nombre}</span> : null}
      </span>
      <span className="text-sm text-slate-700"><span className="text-slate-500 lg:hidden">Tipo: </span>{textoTipo(it.tipo)}</span>
      <span className="text-sm text-slate-700"><span className="text-slate-500 lg:hidden">Para: </span>{textoPara(it)}</span>
      <span className="text-sm text-slate-700"><span className="text-slate-500 lg:hidden">Canales: </span>{textoCanales(it.canales)}</span>
      <span className="text-sm font-semibold text-slate-800" data-lectura><span className="font-normal text-slate-500 lg:hidden">Lectura: </span>{textoLectura(it, opciones)}</span>
      <span className="text-sm text-slate-600"><span className="text-slate-500 lg:hidden">Fecha: </span>{fechaRelativa(it.publicado_en || it.publicar_en, opciones) || "—"}</span>
      {porAprobar ? (
        <span className="flex flex-wrap gap-2 lg:col-span-6 lg:justify-end">
          <button type="button" className={botonSecundario} onClick={() => alRechazar(it)}>Rechazar</button>
          <button type="button" className={botonPrimario} onClick={() => alAprobar(it)}>Aprobar y publicar</button>
        </span>
      ) : null}
    </li>
  );
}

export default function PanelComunicados() {
  const empresa = useEmpresa();
  const tz = useZona();
  const editar = usePuedeEditar();
  const [filtro, setFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [q, setQ] = useState("");
  const [pagina, setPagina] = useState(1);
  const [rechazando, setRechazando] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const url = empresa.listo ? urlListado({ filtro, q, pagina, empresa: empresa.idEmpresa }) : null;
  const { data, error, isLoading, mutate } = useSWR(url, get, { ...opcionesSwr, keepPreviousData: true });
  const resumen = data?.resumen ?? {};
  const items = filtrarLocal(data?.items ?? [], filtro);
  const total = Number(data?.total ?? items.length);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const porAprobar = filtro === "por_aprobar";
  const elegir = (f) => { setFiltro(f); setPagina(1); };
  const conEmpresa = (cuerpo = {}) => (empresa.idEmpresa ? { ...cuerpo, empresa: empresa.idEmpresa } : cuerpo);

  const aprobar = async (it) => {
    setMensaje(null);
    try { await axios.post(`${API}/${it.id}/aprobar`, conEmpresa()); setMensaje({ tipo: "ok", texto: `«${it.titulo}» quedó publicada en el muro.` }); await mutate(); }
    catch (e) { setMensaje({ tipo: "error", texto: errorDe(e) }); }
  };
  const rechazar = async (motivo) => {
    await axios.post(`${API}/${rechazando.id}/rechazar`, conEmpresa({ motivo }));
    setMensaje({ tipo: "ok", texto: `«${rechazando.titulo}» no se publicó; se le avisó a quien la escribió.` });
    await mutate();
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-1" data-pantalla="comunicados">
      <EncabezadoPagina icono={Megaphone} titulo="Comunicados" />
      <p className="-mt-3 text-[13px] text-slate-600">Publica una vez y llega por la app, correo, notificación y aviso en el panel.</p>
      <PestanasComunicados />
      <div className="flex flex-wrap items-center justify-end gap-2">
        <SelectorEmpresa {...empresa} />
        {editar ? <Link href={RUTA_NUEVO} data-accion="nuevo" className={botonPrimario}><Plus className="size-4" aria-hidden="true" />Nuevo comunicado</Link> : null}
      </div>

      <section aria-label="Resumen" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tarjetasResumen(resumen).map((t) => (
          <div key={t.clave} className={`${tarjeta} p-4`} data-kpi={t.clave}>
            <p className="text-[13px] text-slate-600">{t.texto}</p>
            <p className="mt-1.5 text-[26px] font-extrabold leading-none text-slate-900">{t.valor}</p>
          </div>
        ))}
      </section>

      {Number(resumen.pendientes_aprobacion) > 0 && !porAprobar ? (
        <section role="status" className="flex flex-col gap-3 rounded-[14px] border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center" data-aviso-aprobar>
          <p className="flex-1 text-sm text-amber-950">{Number(resumen.pendientes_aprobacion) === 1 ? "1 publicación de un empleado espera tu aprobación." : `${resumen.pendientes_aprobacion} publicaciones de empleados esperan tu aprobación.`}</p>
          <button type="button" className={botonSecundario} onClick={() => elegir("por_aprobar")}>Revisar</button>
        </section>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div role="group" aria-label="Filtrar comunicados" className="-mx-1 flex flex-wrap gap-1.5">
          {FILTROS_PANEL.map((f) => (
            <button key={f.clave} type="button" aria-pressed={filtro === f.clave} onClick={() => elegir(f.clave)}
              className={`min-h-11 rounded-full px-3.5 text-sm font-semibold ${filtro === f.clave ? "bg-[#2563EB] text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>
              {f.texto}{f.clave === "por_aprobar" && Number(resumen.pendientes_aprobacion) ? ` (${resumen.pendientes_aprobacion})` : ""}
            </button>
          ))}
        </div>
        <form role="search" className="relative lg:ml-auto lg:w-72" onSubmit={(e) => { e.preventDefault(); setQ(busqueda); setPagina(1); }}>
          <label htmlFor="buscar-comunicado" className="sr-only">Buscar comunicado</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input id="buscar-comunicado" type="search" placeholder="Buscar por título" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className={`${entrada} pl-9`} />
        </form>
      </div>

      <Mensaje mensaje={mensaje} />
      <AvisoError error={error} porDefecto="No se pudieron cargar los comunicados." reintentar={mutate} />

      <section aria-label="Comunicados" className={`${tarjeta} overflow-hidden`}>
        <div className="hidden grid-cols-[2.6fr_1fr_1.4fr_1.3fr_1.5fr_0.8fr] gap-3 bg-slate-100 px-[18px] py-3 text-[13px] font-bold tracking-wide text-slate-600 lg:grid" aria-hidden="true">
          <span>COMUNICADO</span><span>TIPO</span><span>PARA</span><span>CANALES</span><span>LECTURA</span><span>FECHA</span>
        </div>
        {isLoading && !data ? <p role="status" className="p-5 text-sm text-slate-500">Cargando comunicados…</p> : null}
        {data && !items.length ? (
          <p className="p-6 text-center text-sm text-slate-600">{porAprobar ? "No hay publicaciones por aprobar." : q ? "Nada coincide con tu búsqueda." : "Aún no hay comunicados. Publica el primero con «Nuevo comunicado»."}</p>
        ) : null}
        <ul>
          {items.map((it) => <Fila key={it.id} it={it} tz={tz} porAprobar={editar && porAprobar && it.estado === "pendiente_aprobacion"} alAprobar={aprobar} alRechazar={setRechazando} />)}
        </ul>
      </section>

      {paginas > 1 ? (
        <nav aria-label="Páginas" className="flex items-center justify-center gap-3">
          <button type="button" className={botonSecundario} disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
          <span className="text-sm text-slate-600">Página {pagina} de {paginas}</span>
          <button type="button" className={botonSecundario} disabled={pagina >= paginas} onClick={() => setPagina((p) => p + 1)}>Siguiente</button>
        </nav>
      ) : null}

      <DialogoRechazar item={rechazando} alCerrar={() => setRechazando(null)} alRechazar={rechazar} />
    </div>
  );
}
