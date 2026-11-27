"use client";
// Seguimiento de lectura (maqueta «Seguimiento», aprobada 27/11/2026): quién confirmó, quién lo abrió sin confirmar, quién
// no lo ha abierto y quién no tiene canal (avisar en persona); recordar a los que faltan (1 vez por hora), constancia PDF,
// entregas por canal y «así lo ven». También fijar en el muro (máx. 3), archivar, editar (borrador/programado) y
// aprobar/rechazar posts de empleados. Backend: GET /:id, GET /:id/destinatarios, POST /:id/recordar,
// POST /:id/destinatarios/:idEmpleado/avisado-persona, GET /:id/constancia.pdf, POST /:id/fijar, POST /:id/archivar.
import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Archive, BellRing, ChevronLeft, Download, Pencil, Pin, PinOff } from "lucide-react";
import axios from "@/lib/axios";
import { Ventana } from "@/components/avisos/Ventana";
import { descargar } from "@/components/nomina/comun";
import {
  API, FILTROS_DESTINATARIOS, RUTA_PANEL, errorDe, etiquetaEstado, faltan, fechaRelativa, fotosDe, pdfDe, principal, rutaEditar, tarjetasSeguimiento,
  textoDestinatario, textoEntregas, textoTipo, totalesPestanas,
} from "@/lib/comunicados/comunicados.mjs";
import { AvisoError, Insignia, Mensaje, TextoPlano, botonPrimario, botonSecundario, conEmpresa, get, opcionesSwr, tarjeta, useEmpresa, usePuedeEditar, useZona } from "./comun";

const POR_PAGINA = 50;

function Confirmar({ abierta, titulo, texto, accion, alCerrar, alConfirmar, peligro = false }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const ok = async () => { setEnviando(true); setError(null); try { await alConfirmar(); alCerrar(); } catch (e) { setError(errorDe(e)); } finally { setEnviando(false); } };
  return (
    <Ventana abierta={abierta} onOpenChange={(o) => !o && alCerrar()} titulo={titulo} className="sm:max-w-md">
      <div className="grid gap-3 px-4 pb-5 pt-3 sm:px-6">
        <p className="text-sm text-slate-700">{texto}</p>
        {error ? <p role="alert" className="text-[13px] text-red-700">{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={botonSecundario} onClick={alCerrar}>Cancelar</button>
          <button type="button" className={`${botonPrimario} ${peligro ? "bg-red-600 hover:bg-red-700" : ""}`} disabled={enviando} onClick={ok}>{enviando ? "Un momento…" : accion}</button>
        </div>
      </div>
    </Ventana>
  );
}

function Destinatarios({ id, empresa, nivel, tz, lista, filtro, setFiltro, pagina, setPagina, alCambiar, puedeRecordar }) {
  const [mensaje, setMensaje] = useState(null);
  const { data, error, isLoading, mutate } = lista;
  const items = data?.items ?? [];
  const total = totalesPestanas(data?.conteos ?? {}, nivel);
  const filtros = nivel === "confirmacion" ? FILTROS_DESTINATARIOS : FILTROS_DESTINATARIOS.map((f) => ({ ...f, texto: { faltan: "Sin ver", confirmaron: "Ya lo vieron", todos: "Todos" }[f.clave] }));
  const enFiltro = data?.total ?? total[filtro] ?? items.length;
  const avisado = async (d) => {
    setMensaje(null);
    try {
      await axios.post(`${API}/${encodeURIComponent(id)}/destinatarios/${encodeURIComponent(d.id_empleado)}/avisado-persona`, empresa ? { empresa } : {});
      setMensaje({ tipo: "ok", texto: `Quedó registrado que ${d.nombre} fue avisado en persona.` });
      await Promise.all([mutate(), alCambiar()]);
    } catch (e) { setMensaje({ tipo: "error", texto: errorDe(e) }); }
  };
  return (
    <section aria-label="Destinatarios" className={`${tarjeta} overflow-hidden`} data-destinatarios>
      <div role="tablist" aria-label="Filtrar personas" className="flex flex-wrap gap-1.5 border-b border-slate-200 p-3">
        {filtros.map((f) => (
          <button key={f.clave} type="button" role="tab" aria-selected={filtro === f.clave} onClick={() => { setFiltro(f.clave); setPagina(1); }}
            className={`min-h-11 rounded-full px-3.5 text-sm font-semibold ${filtro === f.clave ? "bg-[#2563EB] text-white" : "border border-slate-300 bg-white text-slate-700"}`}>
            {f.texto} ({total[f.clave] ?? 0})
          </button>
        ))}
      </div>
      <Mensaje mensaje={mensaje} className="m-3" />
      <AvisoError error={error} porDefecto="No se pudo cargar la lista." reintentar={mutate} />
      <div className="hidden grid-cols-[1.6fr_1fr_1.6fr_1fr] gap-3 bg-slate-100 px-4 py-2.5 text-[13px] font-bold tracking-wide text-slate-600 md:grid" aria-hidden="true">
        <span>EMPLEADO</span><span>PUESTO</span><span>ESTADO</span><span>RECORDATORIOS</span>
      </div>
      {isLoading && !data ? <p role="status" className="p-4 text-sm text-slate-500">Cargando…</p> : null}
      {data && !items.length ? <p className="p-5 text-center text-sm text-slate-600">{filtro === "faltan" ? "¡Nadie falta!" : "Sin personas en esta lista."}</p> : null}
      <ul>
        {items.map((d) => {
          const est = textoDestinatario(d, { tz });
          const sinCanal = d.estado === "sin_canal" && !d.avisado_persona_en;
          return (
            <li key={d.id_empleado} data-destinatario={d.id_empleado} className="grid gap-1 border-t border-slate-100 px-4 py-3 first:border-t-0 md:grid-cols-[1.6fr_1fr_1.6fr_1fr] md:items-center md:gap-3">
              <span className="text-sm font-bold text-slate-900">{d.nombre}</span>
              <span className="text-sm text-slate-600">{d.puesto || "—"}</span>
              <span className={`text-sm font-semibold ${est.tono}`}>{est.texto}</span>
              <span className="text-sm text-slate-600">
                {sinCanal && puedeRecordar
                  ? <button type="button" className={`${botonSecundario} min-h-11 px-3 text-[13px]`} onClick={() => avisado(d)}>Marcar avisado en persona</button>
                  : d.estado === "confirmado" ? "—" : `${Number(d.recordatorios) || 0} ${Number(d.recordatorios) === 1 ? "recordatorio" : "recordatorios"}`}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-4 py-3 text-[13px] text-slate-600">
        <span className="flex-1">Mostrando {items.length} de {enFiltro} · Si RH o el jefe lo marca «avisado en persona» queda registrado con su nombre y hora.</span>
        {pagina > 1 ? <button type="button" className={botonSecundario} onClick={() => setPagina((p) => p - 1)}>Anterior</button> : null}
        {pagina * (Number(data?.por_pagina) || POR_PAGINA) < enFiltro ? <button type="button" className={botonSecundario} onClick={() => setPagina((p) => p + 1)}>Siguiente</button> : null}
      </div>
    </section>
  );
}

export default function Seguimiento({ id }) {
  const empresa = useEmpresa();
  const tz = useZona();
  const editar = usePuedeEditar();
  const url = empresa.listo ? conEmpresa(`${API}/${encodeURIComponent(id)}`, empresa.idEmpresa) : null;
  const { data, error, isLoading, mutate } = useSWR(url, get, opcionesSwr);
  const c = principal(data);
  const [mensaje, setMensaje] = useState(null);
  const [pregunta, setPregunta] = useState(null); // "archivar" | "rechazar"
  const [ocupado, setOcupado] = useState(null);
  const conf = c?.nivel === "confirmacion";
  const publicado = c?.estado === "publicado";
  const conLista = c && ["publicado", "archivado"].includes(c.estado);
  const [filtro, setFiltro] = useState(null);
  const filtroActual = filtro ?? (conf ? "faltan" : "todos");
  const [pagina, setPagina] = useState(1);
  const lista = useSWR(conLista ? conEmpresa(`${API}/${encodeURIComponent(id)}/destinatarios?filtro=${filtroActual}&pagina=${pagina}`, empresa.idEmpresa) : null, get, { ...opcionesSwr, keepPreviousData: true });
  const conteos = lista.data?.conteos ?? {};
  const nfaltan = faltan(conteos, c?.nivel);
  const cuerpoEmpresa = (x = {}) => (empresa.idEmpresa ? { ...x, empresa: empresa.idEmpresa } : x);

  const accion = async (clave, fn, ok) => {
    setOcupado(clave); setMensaje(null);
    try { await fn(); if (ok) setMensaje({ tipo: "ok", texto: ok }); await Promise.all([mutate(), lista.mutate()]); }
    catch (e) { setMensaje({ tipo: "error", texto: errorDe(e) }); }
    finally { setOcupado(null); }
  };
  const recordar = () => accion("recordar", () => axios.post(`${API}/${encodeURIComponent(id)}/recordar`, cuerpoEmpresa()), `Listo: le recordamos a ${nfaltan === 1 ? "la persona que falta" : `las ${nfaltan} personas que faltan`}.`);
  const fijar = () => accion("fijar", () => axios.post(`${API}/${encodeURIComponent(id)}/fijar`, cuerpoEmpresa({ fijado: !c.fijado })), c.fijado ? "Ya no está fijado en el muro." : "Fijado arriba del muro.");
  const aprobar = () => accion("aprobar", () => axios.post(`${API}/${encodeURIComponent(id)}/aprobar`, cuerpoEmpresa()), "Publicado en el muro.");
  const constancia = () => accion("constancia", () => descargar(axios, conEmpresa(`${API}/${encodeURIComponent(id)}/constancia.pdf`, empresa.idEmpresa), `constancia-comunicado-${id}.pdf`));

  if (isLoading && !data) return <p role="status" className="p-6 text-sm text-slate-500">Cargando comunicado…</p>;
  if (error || !c) return <div className="mx-auto max-w-3xl space-y-3 p-1"><Link href={RUTA_PANEL} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-slate-600"><ChevronLeft className="size-4" aria-hidden="true" />Comunicados</Link><AvisoError error={error ?? { message: "x" }} porDefecto="Ese comunicado no existe o no lo puedes ver." reintentar={mutate} /></div>;

  const opciones = { tz };
  const conAdjuntos = { ...c, adjuntos: c.adjuntos ?? data?.adjuntos ?? [] };
  const fotos = fotosDe(conAdjuntos);
  const pdf = pdfDe(conAdjuntos);
  const linea = [conf ? "Requiere confirmación" : "Normal", c.audiencia_texto, c.publicado_en ? `publicado ${fechaRelativa(c.publicado_en, opciones).toLowerCase()}` : null, c.autor?.nombre ? `por ${c.autor.nombre}${c.autor.rol ? ` (${c.autor.rol})` : ""}` : null].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-1" data-pantalla="seguimiento">
      <Link href={RUTA_PANEL} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="size-4" aria-hidden="true" />Comunicados</Link>
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 break-words text-2xl font-extrabold tracking-tight text-slate-900">{c.titulo}<Insignia etiqueta={etiquetaEstado(c)} /></h1>
          <p className="mt-1 text-sm text-slate-600">{linea}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {editar && ["borrador", "programado"].includes(c.estado) ? <Link href={rutaEditar(id)} data-accion="editar" className={botonSecundario}><Pencil className="size-4" aria-hidden="true" />Editar</Link> : null}
          {editar && c.estado === "pendiente_aprobacion" ? (
            <>
              <button type="button" className={botonSecundario} onClick={() => setPregunta("rechazar")}>Rechazar</button>
              <button type="button" className={botonPrimario} disabled={ocupado === "aprobar"} onClick={aprobar}>Aprobar y publicar</button>
            </>
          ) : null}
          {editar && publicado ? <button type="button" className={botonSecundario} disabled={ocupado === "fijar"} onClick={fijar} aria-pressed={Boolean(c.fijado)}>{c.fijado ? <PinOff className="size-4" aria-hidden="true" /> : <Pin className="size-4" aria-hidden="true" />}{c.fijado ? "Desfijar del muro" : "Fijar en el muro"}</button> : null}
          {conf && publicado ? <button type="button" className={botonSecundario} disabled={ocupado === "constancia"} onClick={constancia} data-permiso="libre"><Download className="size-4" aria-hidden="true" />{ocupado === "constancia" ? "Preparando…" : "Descargar constancia (PDF)"}</button> : null}
          {editar && conf && publicado && nfaltan > 0 ? <button type="button" className={botonPrimario} disabled={ocupado === "recordar"} onClick={recordar}><BellRing className="size-4" aria-hidden="true" />{ocupado === "recordar" ? "Enviando…" : `Recordar a ${nfaltan === 1 ? "la persona que falta" : `los ${nfaltan} que faltan`}`}</button> : null}
          {editar && publicado ? <button type="button" className={botonSecundario} onClick={() => setPregunta("archivar")}><Archive className="size-4" aria-hidden="true" />Archivar</button> : null}
        </div>
      </header>
      <Mensaje mensaje={mensaje} />

      {conLista ? <section aria-label="Resumen de lectura" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tarjetasSeguimiento(conteos, c.nivel).map((t) => (
          <div key={t.clave} className={`${tarjeta} p-4`} data-kpi={t.clave}>
            <p className="text-[13px] text-slate-600">{t.texto}</p>
            <p className={`mt-1.5 text-[28px] font-extrabold leading-none ${t.tono}`}>{t.valor}</p>
          </div>
        ))}
      </section> : null}

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        {!conLista
          ? <p className={`${tarjeta} p-5 text-sm text-slate-600`}>{c.estado === "programado" ? "La lista de destinatarios se congela cuando se publique." : c.estado === "pendiente_aprobacion" ? "Publicación de un empleado: al aprobarla sale en el muro de toda la empresa." : "Aún no se publica."}</p>
          : <Destinatarios id={id} empresa={empresa.idEmpresa} nivel={c.nivel} tz={tz} lista={lista} filtro={filtroActual} setFiltro={setFiltro} pagina={pagina} setPagina={setPagina} alCambiar={mutate} puedeRecordar={editar && publicado} />}
        <aside className="grid content-start gap-4">
          <section aria-labelledby="asi-lo-ven" className={`${tarjeta} grid gap-2 p-4`} data-asi-lo-ven>
            <h2 id="asi-lo-ven" className="text-[13px] font-bold uppercase tracking-wide text-slate-500">Así lo ven</h2>
            <p className="text-[13px] font-semibold text-[#2563EB]">{textoTipo(c.tipo)}{conf ? " · requiere confirmación" : ""}</p>
            <p className="break-words text-base font-extrabold text-slate-900">{c.titulo}</p>
            <TextoPlano className="text-sm leading-relaxed text-slate-700">{c.cuerpo}</TextoPlano>
            {fotos.length ? <p className="text-[13px] text-slate-600">{fotos.length === 1 ? "1 foto" : `${fotos.length} fotos`}</p> : null}
            {pdf ? <a href={pdf.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm font-semibold text-[#2563EB] hover:underline">Adjunto: {pdf.nombre || "documento.pdf"}</a> : null}
            {c.youtube_id ? <p className="text-[13px] text-slate-600">Video de YouTube incrustado</p> : null}
          </section>
          {(c.entregas ?? data?.entregas) ? (
            <section aria-labelledby="entregas" className={`${tarjeta} grid gap-2 p-4`} data-entregas>
              <h2 id="entregas" className="text-[13px] font-bold uppercase tracking-wide text-slate-500">Entregas por canal</h2>
              <ul className="grid gap-1.5">
                {textoEntregas(c.entregas ?? data.entregas).map((e) => <li key={e.canal} className="flex justify-between gap-3 text-sm"><span className="font-semibold text-slate-800">{e.canal}</span><span className="text-right text-slate-600">{e.detalle}</span></li>)}
              </ul>
            </section>
          ) : null}
          {conf ? <p className="rounded-xl bg-blue-50 p-3 text-[13px] text-blue-900">La confirmación guarda fecha, hora, IP y dispositivo: sirve como evidencia ante una auditoría.</p> : null}
        </aside>
      </div>

      <Confirmar abierta={pregunta === "archivar"} titulo="Archivar comunicado" accion="Archivar" alCerrar={() => setPregunta(null)}
        texto="Deja de verse en el muro y ya no se recuerda. El historial y las confirmaciones se conservan."
        alConfirmar={async () => { await axios.post(`${API}/${encodeURIComponent(id)}/archivar`, cuerpoEmpresa()); setMensaje({ tipo: "ok", texto: "Comunicado archivado." }); await mutate(); }} />
      <RechazarPost abierta={pregunta === "rechazar"} alCerrar={() => setPregunta(null)}
        alRechazar={async (motivo) => { await axios.post(`${API}/${encodeURIComponent(id)}/rechazar`, cuerpoEmpresa({ motivo })); setMensaje({ tipo: "ok", texto: "No se publicó; se le avisó a quien la escribió." }); await mutate(); }} />
    </div>
  );
}

function RechazarPost({ abierta, alCerrar, alRechazar }) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState(null);
  return (
    <Confirmar abierta={abierta} titulo="Rechazar publicación" accion="Rechazar" peligro alCerrar={() => { setError(null); alCerrar(); }}
      texto={(
        <span className="grid gap-2">
          <label htmlFor="seg-motivo" className="font-semibold">Motivo (se le avisa a quien la escribió)</label>
          <textarea id="seg-motivo" rows={3} maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-base sm:text-sm" />
          {error ? <span className="text-[13px] text-red-700">{error}</span> : null}
        </span>
      )}
      alConfirmar={async () => { if (!motivo.trim()) { setError("Escribe el motivo."); throw Object.assign(new Error("motivo"), { response: { data: { mensaje: "Escribe el motivo." } } }); } await alRechazar(motivo.trim()); }} />
  );
}
