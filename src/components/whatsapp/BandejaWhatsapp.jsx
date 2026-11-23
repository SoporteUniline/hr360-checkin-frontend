"use client";

// Bandeja de WhatsApp de reclutamiento (R1). Conversaciones reales del API (no usa el demo de /panel/reclutamiento).
// 🧭 Criterio: refresco por sondeo con SWR (lista cada 5 s, chat abierto cada 3 s, en pausa con la pestaña oculta)
// en lugar del SSE del reloj, que no lleva sesión.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { MessageCircle, MessagesSquare, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import { formatearTelefono } from "@/lib/whatsapp/telefono.mjs";
import { mensajeErrorApi } from "@/lib/whatsapp/reglas.mjs";
import { paramsFiltro } from "@/lib/whatsapp/entrevista.mjs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  devolverAIa, enviarMensaje, marcarAtendido, obtener, reintentarMensaje, rutaAgente, rutaConversacion, rutaConversaciones, rutaEstado, tomarControl,
} from "./api";
import ListaConversaciones from "./ListaConversaciones";
import HiloConversacion from "./HiloConversacion";
import EnlacesVacantes, { BotonEnlacesVacantes } from "./EnlacesVacantes";
import ConfigurarAgente, { BotonAgente } from "./ConfigurarAgente";
import PanelCandidato from "./PanelCandidato";
import { DIALOGO_PANTALLA_COMPLETA } from "./controles";

const POR_PAGINA = 30;

// Empresa de trabajo: la primera de la sesión o la que elija el usuario si tiene varias (mismo patrón que nómina).
function useEmpresa(dataUser) {
  const empresas = useMemo(() => {
    const lista = (dataUser?.empresas_detalle ?? []).map((e) => ({ id: Number(e.id_empresa), nombre: e.nombre || e.nombre_empresa || `Empresa ${e.id_empresa}` }));
    if (!lista.length && dataUser?.id_empresa) lista.push({ id: Number(dataUser.id_empresa), nombre: "Mi empresa" });
    return lista;
  }, [dataUser]);
  const [idEmpresa, setIdEmpresa] = useState(null);
  useEffect(() => {
    if (!empresas.length) return;
    if (!idEmpresa || !empresas.some((e) => e.id === idEmpresa)) setIdEmpresa(empresas[0].id);
  }, [empresas, idEmpresa]);
  return { empresas, idEmpresa, setIdEmpresa };
}

function SelectorEmpresa({ empresas, idEmpresa, onCambiar }) {
  if (empresas.length < 2) return null;
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-gray-500">Empresa</span>
      <select className="h-11 max-w-[14rem] rounded-lg border border-gray-300 bg-white px-2 md:h-9" value={idEmpresa ?? ""} onChange={(e) => onCambiar(Number(e.target.value))}>
        {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
      </select>
    </label>
  );
}

function ChipEstado({ estado }) {
  if (!estado || estado.modo === "apagado") return null;
  const numero = estado.numero_whatsapp ? formatearTelefono(estado.numero_whatsapp) : null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12.5px]" data-estado-wa={estado.modo}>
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${estado.puede_usar ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
        <span className={`size-2 rounded-full ${estado.puede_usar ? "bg-emerald-500" : "bg-amber-500"}`} aria-hidden="true" />
        {estado.puede_usar ? "Activo" : "En pausa"} · {estado.modo === "propio" ? "número propio" : "número compartido de ADAMIA"}
      </span>
      {numero ? <span className="text-gray-600">{numero}</span> : null}
      <span className="text-gray-600">{Number(estado.conversaciones_mes) || 0} conversaciones este mes</span>
    </div>
  );
}

export default function BandejaWhatsapp() {
  const { dataUser, isAuthChecked } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const abierta = params.get("c");
  const abrioDesdeLista = useRef(false);
  const { empresas, idEmpresa, setIdEmpresa } = useEmpresa(dataUser);
  const rol = dataUser?.tipo_usuario === "User" ? "Recruiter" : dataUser?.tipo_usuario;
  const permitido = rol === "Recruiter";

  // Reloj para los tiempos relativos («hace 5 min»).
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const { data: estado, error: errorEstado, isLoading: cargandoEstado, mutate: recargarEstado } = useSWR(
    permitido ? rutaEstado(idEmpresa) : null, obtener, { refreshInterval: 60000, refreshWhenHidden: false },
  );
  const activo = estado && estado.modo !== "apagado";

  // Búsqueda con espera corta para no pedir en cada tecla.
  const [busqueda, setBusqueda] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(busqueda.trim()), 300);
    return () => clearTimeout(t);
  }, [busqueda]);
  // Paginación real: el sondeo solo refresca la página 1; «Ver más» pide pagina=2,3… y se agrega sin duplicados
  // (una conversación con actividad nueva sube a la página 1 y ahí se toma la versión fresca).
  // R2: el chip de filtro viaja como parámetro; al cambiar, la clave cambia y la paginación vuelve a la página 1.
  const [filtro, setFiltro] = useState("todos");
  const filtroParams = useMemo(() => paramsFiltro(filtro), [filtro]);
  const claveLista = activo ? rutaConversaciones(idEmpresa, { q, pagina: 1, limite: POR_PAGINA, filtro: filtroParams }) : null;
  const { data: lista, error: errorLista, isLoading: cargandoLista, mutate: recargarLista } = useSWR(
    claveLista, obtener, { refreshInterval: 5000, refreshWhenHidden: false, keepPreviousData: true },
  );
  const [extras, setExtras] = useState([]);
  const [paginasCargadas, setPaginasCargadas] = useState(1);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [errorMas, setErrorMas] = useState("");
  const claveVigente = useRef(claveLista);
  useEffect(() => {
    claveVigente.current = claveLista;
    setExtras([]);
    setPaginasCargadas(1);
    setErrorMas("");
  }, [claveLista]);
  const conversaciones = useMemo(() => {
    const primera = lista?.conversaciones ?? [];
    const ids = new Set(primera.map((c) => String(c.id)));
    const resto = [];
    for (const c of extras) {
      if (ids.has(String(c.id))) continue;
      ids.add(String(c.id));
      resto.push(c);
    }
    return [...primera, ...resto];
  }, [lista, extras]);
  const totalLista = Number(lista?.total) || 0;
  const hayMas = paginasCargadas * POR_PAGINA < totalLista;
  const verMas = async () => {
    const clave = claveLista;
    const pagina = paginasCargadas + 1;
    setCargandoMas(true);
    setErrorMas("");
    try {
      const r = await obtener(rutaConversaciones(idEmpresa, { q, pagina, limite: POR_PAGINA, filtro: filtroParams }));
      if (claveVigente.current !== clave) return; // cambió la búsqueda o la empresa mientras llegaba
      setExtras((x) => [...x, ...(r?.conversaciones ?? [])]);
      setPaginasCargadas(pagina);
    } catch (e) {
      setErrorMas(mensajeErrorApi(e, "No se pudieron cargar más conversaciones."));
    } finally {
      setCargandoMas(false);
    }
  };
  const [vacantesAbierto, setVacantesAbierto] = useState(false);
  const [agenteAbierto, setAgenteAbierto] = useState(false);
  const [evaluacionAbierta, setEvaluacionAbierta] = useState(false);
  // Configuración del agente: da su nombre a las burbujas y el punto de encendido del botón (misma clave que el diálogo).
  const { data: agente } = useSWR(activo ? rutaAgente(idEmpresa) : null, obtener, { revalidateOnFocus: false, shouldRetryOnError: false });
  const nombreAsistente = agente?.nombre_asistente || "";

  const claveHilo = activo && abierta ? rutaConversacion(abierta) : null;
  const { data: hilo, error: errorHilo, isLoading: cargandoHilo, mutate: recargarHilo } = useSWR(
    claveHilo, obtener, { refreshInterval: 3000, refreshWhenHidden: false },
  );

  // Abrir el chat lo marca como leído en el servidor (GET); se refleja en la lista sin esperar el siguiente sondeo.
  const marcadaLeida = useRef(null);
  useEffect(() => {
    if (!hilo || !abierta || marcadaLeida.current === abierta) return;
    marcadaLeida.current = abierta;
    setExtras((x) => x.map((c) => (String(c.id) === String(abierta) ? { ...c, no_leidos: 0 } : c)));
    recargarLista((actual) => actual && {
      ...actual,
      conversaciones: (actual.conversaciones ?? []).map((c) => (String(c.id) === String(abierta) ? { ...c, no_leidos: 0 } : c)),
    }, { revalidate: false });
  }, [hilo, abierta, recargarLista]);

  const irA = useCallback((id) => {
    const destino = id ? `${pathname}?c=${encodeURIComponent(id)}` : pathname;
    if (id) {
      abrioDesdeLista.current = true;
      router.push(destino, { scroll: false });
    } else if (abrioDesdeLista.current) {
      abrioDesdeLista.current = false;
      router.back();
    } else {
      router.replace(destino, { scroll: false });
    }
  }, [pathname, router]);

  const cambiarEmpresa = (id) => {
    setIdEmpresa(id);
    if (abierta) router.replace(pathname, { scroll: false });
  };

  // Mensajes en vuelo (se pintan con «Enviando…» hasta que responde el servidor).
  const [pendientes, setPendientes] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [cambiandoControl, setCambiandoControl] = useState(false);
  const [reintentandoId, setReintentandoId] = useState(null);
  const [anuncio, setAnuncio] = useState("");
  const [marcando, setMarcando] = useState(false);
  useEffect(() => {
    setPendientes([]);
    setAviso("");
    setEvaluacionAbierta(false);
    if (!abierta) marcadaLeida.current = null;
  }, [abierta]);

  const conversacion = hilo?.conversacion ?? conversaciones.find((c) => String(c.id) === String(abierta)) ?? null;
  const mensajes = useMemo(() => {
    const propios = hilo?.mensajes ?? [];
    const ids = new Set(propios.map((m) => String(m.id)));
    return [...propios, ...pendientes.filter((p) => !ids.has(String(p.id)))];
  }, [hilo, pendientes]);

  const aplicarConversacion = async (respuesta) => {
    if (respuesta?.conversacion) await recargarHilo((actual) => actual && { ...actual, conversacion: { ...actual.conversacion, ...respuesta.conversacion } }, { revalidate: true });
    else await recargarHilo();
    recargarLista();
  };

  const cambiarControl = async (accion) => {
    setCambiandoControl(true);
    setAviso("");
    try {
      const r = accion === "tomar" ? await tomarControl(abierta) : await devolverAIa(abierta);
      await aplicarConversacion(r);
      setAnuncio(accion === "tomar" ? "Tomaste el control. La IA deja de responder en este chat." : "La IA vuelve a atender este chat.");
    } catch (e) {
      setAviso(mensajeErrorApi(e));
      recargarHilo();
    } finally {
      setCambiandoControl(false);
    }
  };

  const enviar = async (texto) => {
    const temporal = { id: `tmp-${Date.now()}`, temporal: true, direccion: "saliente", actor: "reclutador", tipo: "texto", texto, estado: "enviando", usuario: { nombre: dataUser?.nombre || "Tú" }, creado_en: null };
    setPendientes((p) => [...p, temporal]);
    setEnviando(true);
    setAviso("");
    try {
      const { mensaje } = await enviarMensaje(abierta, texto);
      await recargarHilo((actual) => actual && { ...actual, mensajes: [...(actual.mensajes ?? []).filter((m) => String(m.id) !== String(mensaje?.id)), mensaje].filter(Boolean) }, { revalidate: false });
      setPendientes((p) => p.filter((x) => x.id !== temporal.id));
      recargarLista();
      return true;
    } catch (e) {
      setPendientes((p) => p.filter((x) => x.id !== temporal.id));
      setAviso(mensajeErrorApi(e, "No se pudo enviar el mensaje. Intenta de nuevo."));
      // 403 (sin control) o 409 (ventana cerrada): el estado cambió; se trae de nuevo para mostrar el motivo.
      if ([403, 409].includes(e?.response?.status)) recargarHilo();
      return false;
    } finally {
      setEnviando(false);
    }
  };

  const reintentar = async (m) => {
    setReintentandoId(m.id);
    setAviso("");
    try {
      const { mensaje } = await reintentarMensaje(abierta, m.id);
      await recargarHilo((actual) => actual && { ...actual, mensajes: (actual.mensajes ?? []).map((x) => (String(x.id) === String(m.id) ? { ...x, ...mensaje } : x)) }, { revalidate: false });
    } catch (e) {
      setAviso(mensajeErrorApi(e, "No se pudo reintentar el envío."));
      if ([403, 404, 409].includes(e?.response?.status)) recargarHilo();
    } finally {
      setReintentandoId(null);
    }
  };

  const entrevista = hilo?.entrevista ?? null;
  const preguntasSinRespuesta = hilo?.preguntas_sin_respuesta ?? [];
  const atender = async () => {
    setMarcando(true);
    setAviso("");
    try {
      await marcarAtendido(abierta);
      await recargarHilo((actual) => actual && { ...actual, entrevista: actual.entrevista && { ...actual.entrevista, requiere_atencion: false } }, { revalidate: true });
      recargarLista();
      setAnuncio("Conversación marcada como atendida.");
    } catch (e) {
      setAviso(mensajeErrorApi(e, "No se pudo marcar como atendida."));
    } finally {
      setMarcando(false);
    }
  };
  const panel = (
    <PanelCandidato entrevista={entrevista} preguntasSinRespuesta={preguntasSinRespuesta} cargando={cargandoHilo && !hilo}
      onAtendido={atender} marcando={marcando} nombreAsistente={nombreAsistente} ahora={ahora} />
  );

  const encabezado = (
    <EncabezadoPagina
      icono={MessagesSquare}
      titulo="Conversaciones de WhatsApp"
      subtitulo="Chats con candidatos. La IA responde y tú tomas el control cuando lo necesites."
      acciones={
        <div className="hidden items-center gap-3 md:flex">
          {activo ? <BotonAgente onClick={() => setAgenteAbierto(true)} encendido={agente ? agente.activo === true : undefined} /> : null}
          {activo ? <BotonEnlacesVacantes onClick={() => setVacantesAbierto(true)} /> : null}
          <SelectorEmpresa empresas={empresas} idEmpresa={idEmpresa} onCambiar={cambiarEmpresa} />
        </div>
      }
    />
  );
  // En teléfono el selector y el botón van en su propia fila para no apretar el título.
  const filaMovil = empresas.length > 1 || activo ? (
    <div className="flex flex-wrap items-center gap-2 md:hidden">
      <SelectorEmpresa empresas={empresas} idEmpresa={idEmpresa} onCambiar={cambiarEmpresa} />
      {activo ? <BotonAgente onClick={() => setAgenteAbierto(true)} encendido={agente ? agente.activo === true : undefined} /> : null}
      {activo ? <BotonEnlacesVacantes onClick={() => setVacantesAbierto(true)} /> : null}
    </div>
  ) : null;

  if (isAuthChecked && dataUser && !permitido) {
    return (
      <div className="grid gap-4">
        {encabezado}
        <p role="alert" className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-700">Esta sección es para el equipo de reclutamiento de la empresa.</p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {encabezado}
      {filaMovil}
      <EnlacesVacantes abierto={vacantesAbierto} onCambiar={setVacantesAbierto} idEmpresa={idEmpresa} />
      <ConfigurarAgente abierto={agenteAbierto} onCambiar={setAgenteAbierto} idEmpresa={idEmpresa} />
      <Dialog open={evaluacionAbierta && !!abierta} onOpenChange={setEvaluacionAbierta}>
        <DialogContent className={`${DIALOGO_PANTALLA_COMPLETA} sm:max-w-md`}>
          <DialogHeader className="border-b border-gray-200 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] pr-14 text-left">
            <DialogTitle>Evaluación del candidato</DialogTitle>
            <DialogDescription>Lo que {nombreAsistente || "el agente"} obtuvo en la entrevista por WhatsApp.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">{panel}</div>
        </DialogContent>
      </Dialog>
      {errorEstado ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span className="flex-1">{mensajeErrorApi(errorEstado, "No se pudo consultar el estado de WhatsApp.")}</span>
          <button type="button" onClick={() => recargarEstado()} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 font-medium md:min-h-9">
            <RefreshCw className="size-4" /> Reintentar
          </button>
        </div>
      ) : cargandoEstado || !estado ? (
        <p className="text-sm text-gray-500">Consultando WhatsApp…</p>
      ) : estado.modo === "apagado" ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center" data-estado-wa="apagado">
          <span className="grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><MessageCircle className="size-7" /></span>
          <h2 className="mt-4 text-lg font-bold text-gray-900">WhatsApp aún no está activo para tu empresa</h2>
          <p className="mt-1 max-w-md text-sm text-gray-600">Pídele a ADAMIA que lo active. Cuando esté listo, aquí verás y contestarás los chats con tus candidatos.</p>
          <p className="mt-3 text-[12.5px] text-gray-500">{Number(estado.conversaciones_mes) || 0} conversaciones este mes</p>
        </div>
      ) : (
        <>
          <ChipEstado estado={estado} />
          {!estado.puede_usar ? (
            <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Por ahora tu empresa no puede enviar mensajes por WhatsApp. Pídele a ADAMIA que lo revise.
            </p>
          ) : null}
          <div className="flex min-h-0 min-w-0 overflow-hidden md:h-[calc(100dvh-14rem)] md:min-h-[460px] md:rounded-2xl md:border md:border-gray-200 md:bg-white">
            <div className={`flex min-w-0 flex-col md:w-[340px] md:shrink-0 md:border-r md:border-gray-200 lg:w-[380px] ${abierta ? "xl:w-[320px] 2xl:w-[380px]" : ""} max-md:w-auto max-md:flex-1 max-md:rounded-2xl max-md:border max-md:border-gray-200 max-md:bg-white ${abierta ? "max-md:hidden" : ""}`}>
              <ListaConversaciones
                conversaciones={conversaciones}
                hayMas={hayMas}
                errorMas={errorMas}
                onVacantes={() => setVacantesAbierto(true)}
                cargando={cargandoLista}
                error={errorLista ? mensajeErrorApi(errorLista, "No se pudieron cargar las conversaciones.") : ""}
                busqueda={busqueda}
                setBusqueda={setBusqueda}
                q={q}
                seleccionada={abierta}
                onAbrir={irA}
                onMas={verMas}
                cargandoMas={cargandoMas}
                usuario={dataUser}
                ahora={ahora}
                filtro={filtro}
                onFiltro={setFiltro}
              />
            </div>
            {abierta ? (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col max-md:fixed max-md:inset-0 max-md:z-40 max-md:bg-white">
                <HiloConversacion
                  key={abierta}
                  conversacion={conversacion}
                  mensajes={mensajes}
                  cargando={cargandoHilo}
                  error={errorHilo ? mensajeErrorApi(errorHilo, "No se pudo abrir la conversación.") : ""}
                  usuario={dataUser}
                  onVolver={() => irA(null)}
                  onTomar={() => cambiarControl("tomar")}
                  onDevolver={() => cambiarControl("devolver")}
                  cambiandoControl={cambiandoControl}
                  onEnviar={enviar}
                  enviando={enviando}
                  onReintentar={reintentar}
                  reintentandoId={reintentandoId}
                  aviso={aviso}
                  anuncio={anuncio}
                  ahora={ahora}
                  nombreAsistente={nombreAsistente}
                  onVerEvaluacion={() => setEvaluacionAbierta(true)}
                  requiereAtencion={entrevista?.requiere_atencion === true}
                />
              </div>
            ) : null}
            {abierta ? (
              <aside aria-label="Candidato" className="hidden w-[300px] shrink-0 2xl:w-[340px] flex-col border-l border-gray-200 bg-white xl:flex">
                <h2 className="border-b border-gray-200 px-4 py-3 text-[15px] font-bold text-gray-900">Candidato</h2>
                <div className="min-h-0 flex-1 overflow-y-auto">{panel}</div>
              </aside>
            ) : (
              <div className="hidden flex-1 flex-col items-center justify-center gap-2 bg-[#f5f3ef] p-8 text-center md:flex">
                <MessageCircle className="size-10 text-emerald-600" />
                <p className="font-semibold text-gray-800">Elige una conversación</p>
                <p className="max-w-xs text-sm text-gray-500">Aquí verás los mensajes con el candidato y podrás contestarle.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
