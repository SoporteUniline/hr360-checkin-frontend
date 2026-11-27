"use client";
// Muro del panel (27/11/2026, pedido del dueño): el mismo muro tipo Facebook que ven los empleados en Mi espacio, como
// la primera pantalla del panel (/panel/muro, «Muro» arriba del menú) y la primera pestaña de Comunicados.
// Columna centrada (~680 px en escritorio, ancho completo en teléfono): portada arriba (con «Cambiar portada» para quien
// edita), caja «¿Qué quieres comunicar?» que abre Redactar, fijadas primero y cada publicación con la MISMA tarjeta del
// muro del empleado (Publicacion: fotos con visor, YouTube, PDF, «Me gusta», comentarios y respuestas, aquí mismo).
// RH ve además el avance de lectura («30 de 42 confirmaron») con «Ver seguimiento» y el menú ⋯ con Fijar / Desfijar y
// Archivar. Con «comunicados: ver» solo se consulta (sin publicar, «Me gusta», comentar, fijar ni archivar).
// Backend: GET /muro, POST /muro/:id/me-gusta, GET|POST /muro/:id/comentarios, POST /:id/fijar, POST /:id/archivar.
import { useMemo, useState } from "react";
import Link from "next/link";
import { Archive, ImagePlus, MoreHorizontal, Pin, PinOff } from "lucide-react";
import axios from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { SelectorEmpresa } from "@/components/nomina/comun";
import { Ventana } from "@/components/avisos/Ventana";
import AvisoEncuestas from "@/components/clima/AvisoEncuestas";
import { RUTA_PANEL as RUTA_MIS_ENCUESTAS } from "@/lib/clima/pendientes.mjs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { API, LIMITES, RUTA_NUEVO, avanceSeguimiento, errorDe, fuenteMuro, rutaSeguimiento } from "@/lib/comunicados/comunicados.mjs";
import { ListaMuro, Portada } from "./Muro";
import TarjetaMuro, { useHilos } from "./TarjetaMuro";
import EditorPortada from "./EditorPortada";
import PestanasComunicados from "./PestanasComunicados";
import useFeedMuro from "./useFeedMuro";
import { AvisoError, Avatar, Mensaje, botonPrimario, botonSecundario, useEmpresa, usePuedeEditar, useZona } from "./comun";

/** «¿Qué quieres comunicar?» como la caja de Facebook: abre Redactar. */
function CajaComunicar({ nombre }) {
  return (
    <section aria-label="Publicar en el muro" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4" data-caja-comunicar>
      <Avatar nombre={nombre} grande />
      <Link href={RUTA_NUEVO} data-accion="comunicar"
        className="flex min-h-11 min-w-0 flex-1 items-center rounded-full bg-slate-100 px-4 text-[15px] text-slate-600 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
        <span className="truncate">¿Qué quieres comunicar{nombre ? `, ${String(nombre).split(/\s+/)[0]}` : ""}?</span>
      </Link>
    </section>
  );
}

/** Avance de lectura del post (RH) y la liga al seguimiento completo. */
function Seguimiento({ it }) {
  const a = avanceSeguimiento(it);
  if (!a) return null;
  return (
    <div className="grid gap-1.5 rounded-xl bg-slate-50 px-3 py-2" data-seguimiento={it.id}>
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <span className="text-[13px] font-semibold text-slate-800">{a.texto}</span>
        <Link href={rutaSeguimiento(it.id)} className="inline-flex min-h-11 items-center text-[13px] font-semibold text-[#2563EB] hover:underline" data-ver-seguimiento>Ver seguimiento</Link>
      </div>
      {a.confirmacion ? (
        <div role="progressbar" aria-label="Confirmaron de leído" aria-valuemin={0} aria-valuemax={100} aria-valuenow={a.porcentaje} className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-green-600" style={{ width: `${a.porcentaje}%` }} />
        </div>
      ) : null}
    </div>
  );
}

function MenuPost({ it, fijadas, alFijar, alArchivar }) {
  const lleno = !it.fijado && fijadas >= LIMITES.fijados;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger aria-label={`Opciones de la publicación${it.titulo ? ` «${it.titulo}»` : ""}`} data-menu-post={it.id}
        className="-mr-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-full text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
        <MoreHorizontal className="size-5" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52 bg-white">
        <DropdownMenuItem className="min-h-11 text-[15px]" disabled={lleno} onSelect={() => alFijar(it, !it.fijado)}>
          {it.fijado ? <PinOff aria-hidden="true" /> : <Pin aria-hidden="true" />}
          {it.fijado ? "Desfijar" : lleno ? `Fijar (ya hay ${LIMITES.fijados})` : "Fijar arriba del muro"}
        </DropdownMenuItem>
        <DropdownMenuItem className="min-h-11 text-[15px]" variant="destructive" onSelect={() => alArchivar(it)}>
          <Archive aria-hidden="true" />Archivar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ConfirmarArchivar({ it, alCerrar, alArchivar }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const ok = async () => { setEnviando(true); setError(null); try { await alArchivar(it); alCerrar(); } catch (e) { setError(errorDe(e)); } finally { setEnviando(false); } };
  return (
    <Ventana abierta={Boolean(it)} onOpenChange={(o) => !o && alCerrar()} titulo="Archivar publicación" descripcion={it?.titulo || undefined} className="sm:max-w-md">
      <div className="grid gap-3 px-4 pb-5 pt-3 sm:px-6">
        <p className="text-sm text-slate-700">Deja de verse en el muro. El seguimiento y la constancia se conservan en «Administrar».</p>
        {error ? <p role="alert" className="text-[13px] text-red-700">{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={botonSecundario} onClick={alCerrar}>Cancelar</button>
          <button type="button" className={`${botonPrimario} bg-red-600 hover:bg-red-700`} disabled={enviando} onClick={ok}>{enviando ? "Archivando…" : "Archivar"}</button>
        </div>
      </div>
    </Ventana>
  );
}

export default function MuroPanel() {
  const empresa = useEmpresa();
  const tz = useZona();
  const editar = usePuedeEditar();
  const { dataUser } = useAuth();
  const yo = dataUser?.nombre || dataUser?.correo || "Recursos Humanos";
  const fuente = useMemo(() => (empresa.listo ? fuenteMuro("panel", empresa.idEmpresa) : null), [empresa.listo, empresa.idEmpresa]);
  const feed = useFeedMuro(fuente);
  const { megusta, primera, mutate } = feed;
  const participa = editar && primera?.puede_participar !== false;
  const hilos = useHilos();
  const [cambiarPortada, setCambiarPortada] = useState(false);
  const [archivando, setArchivando] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const conEmpresa = (cuerpo = {}) => (empresa.idEmpresa ? { ...cuerpo, empresa: empresa.idEmpresa } : cuerpo);
  const fijadas = feed.fijados.length;

  const fijar = async (it, fijado) => {
    setMensaje(null);
    try {
      await axios.post(`${API}/${encodeURIComponent(it.id)}/fijar`, conEmpresa({ fijado }));
      setMensaje({ tipo: "ok", texto: fijado ? "Publicación fijada arriba del muro." : "Publicación desfijada." });
      await mutate();
    } catch (e) { setMensaje({ tipo: "error", texto: errorDe(e) }); }
  };
  const archivar = async (it) => {
    await axios.post(`${API}/${encodeURIComponent(it.id)}/archivar`, conEmpresa());
    setMensaje({ tipo: "ok", texto: "Publicación archivada: ya no se ve en el muro." });
    await mutate();
  };
  const tarjeta = (it) => (
    <li key={it.id}>
      <TarjetaMuro it={it} tz={tz} fuente={fuente} hilos={hilos} megusta={megusta} participa={participa} yo={yo}
        menu={editar ? <MenuPost it={it} fijadas={fijadas} alFijar={fijar} alArchivar={setArchivando} /> : null}
        extra={<Seguimiento it={it} />} />
    </li>
  );

  const botonPortada = editar ? (
    <button type="button" onClick={() => setCambiarPortada(true)} data-cambiar-portada
      className="absolute bottom-3 right-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/95 px-3 text-sm font-bold text-slate-900 shadow-md hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
      <ImagePlus className="size-4" aria-hidden="true" />{primera?.portada?.url ? "Cambiar portada" : "Agregar portada"}
    </button>
  ) : null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-1" data-pantalla="muro-panel">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Muro</h1>
        <SelectorEmpresa {...empresa} />
      </div>
      <PestanasComunicados />
      <div className="mx-auto grid w-full max-w-[680px] gap-4" data-columna-muro>
        {/* Como era la primera pantalla (antes el Monitor): RH o dueño que también son empleados ven sus encuestas por contestar. */}
        <AvisoEncuestas base={RUTA_MIS_ENCUESTAS} />
        {primera ? <Portada portada={primera.portada} acciones={botonPortada} /> : null}
        {editar ? <CajaComunicar nombre={yo} /> : null}
        <Mensaje mensaje={mensaje} />
        <AvisoError error={feed.error} porDefecto="No pudimos cargar el muro." reintentar={mutate} />
        {megusta.error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{megusta.error}</p> : null}
        <ListaMuro feed={feed} tarjeta={tarjeta} vacio={editar ? "Aún no hay publicaciones. Escribe la primera en «¿Qué quieres comunicar?»." : "Aún no hay publicaciones."} />
      </div>
      <Ventana abierta={cambiarPortada} onOpenChange={setCambiarPortada} titulo="Portada del muro" descripcion="La foto fija arriba del muro de todos. JPG, PNG o WebP hasta 8 MB." className="sm:max-w-lg">
        <div className="overflow-y-auto px-4 pb-5 pt-3 sm:px-6">
          <EditorPortada marco={false} portada={primera?.portada ?? null} empresa={empresa.idEmpresa} alGuardar={() => mutate()} />
        </div>
      </Ventana>
      <ConfirmarArchivar it={archivando} alCerrar={() => setArchivando(null)} alArchivar={archivar} />
    </div>
  );
}
