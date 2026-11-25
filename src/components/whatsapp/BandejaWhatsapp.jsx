"use client";

// Bandeja de WhatsApp de reclutamiento (R1). Conversaciones reales del API (no usa el demo de /panel/reclutamiento).
// 🧭 Criterio: refresco por sondeo con SWR (lista cada 5 s, chat abierto cada 3 s, en pausa con la pestaña oculta)
// en lugar del SSE del reloj, que no lleva sesión.
// R3: «Entrevistas» (?vista=entrevistas), aprobar para agendar, cita en la ficha del candidato, «Enviar seguimiento» con la
// ventana cerrada y plantillas enviadas en el mes. Chat todo-en-uno: archivos y notas de voz, cita con sus acciones y
// líneas de sistema, y «Ofrecer horarios». Dentro de la empresa todos ven todas las conversaciones.
// P7 (monitoreo): «Salud del agente» (?vista=salud) y, si GET /estado trae salud.estado distinto de «ok», un aviso discreto.
// 25/11/2026 · Estilo WhatsApp Web (maqueta aprobada): pantalla completa (alto de la ventana, sin scroll de página; cada
// columna con su scroll) y el menú de ADAMIA plegado a iconos. Columna «Chats» (agente, Entrevistas, ⋮ con salud, enlaces
// y configurar agente; buscador, pastillas y pie con número y conteos), conversación con encabezado compacto y menú
// «Acciones», y ficha del candidato a la derecha, cerrada por defecto. Entrevistas y Salud se abren en el lugar de la
// conversación. En teléfono (<1024 px): lista → chat a pantalla completa con «‹» → ficha a pantalla completa.
// Mismas llamadas al API, estados y reglas que antes: solo cambió dónde se muestra cada cosa.
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Activity, AlertTriangle, ArrowLeft, Bot, CalendarDays, Link2, MessageCircle, MoreVertical, RefreshCw, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatearTelefono } from "@/lib/whatsapp/telefono.mjs";
import { mensajeErrorApi } from "@/lib/whatsapp/reglas.mjs";
import { etiquetaCalificacion, etiquetaEtapa, paramsFiltro } from "@/lib/whatsapp/entrevista.mjs";
import { avisoExtras, textoEntrevistasMes } from "@/lib/whatsapp/paquete.mjs";
import { hoyMx, textoPlantillasMes } from "@/lib/whatsapp/agenda.mjs";
import { CHAT_ADJUNTOS_ACTIVO, citasDelChat, lineaCita } from "@/lib/whatsapp/adjuntos.mjs";
import { avisoBandeja } from "@/lib/whatsapp/salud.mjs";
import { paramsEtapa } from "@/lib/reclutamiento/procesoWhatsapp.mjs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  aprobarAgenda, devolverAIa, enviarAdjunto, enviarMensaje, enviarSeguimiento, marcarAtendido, obtener, ofrecerHorarios, reintentarMensaje, rutaAgendaEmpresa, rutaAgente, rutaConversacion,
  rutaConversaciones, rutaEstado, tomarControl,
} from "./api";
import ListaConversaciones from "./ListaConversaciones";
import HiloConversacion from "./HiloConversacion";
import EnlacesVacantes from "./EnlacesVacantes";
import ConfigurarAgente from "./ConfigurarAgente";
import PanelCandidato from "./PanelCandidato";
import FichaCandidato from "./FichaCandidato";
import CitaChat from "./CitaChat";
import EnlaceWhatsappVacante from "./EnlaceWhatsappVacante";
import Entrevistas from "./Entrevistas";
import SaludAgente from "./SaludAgente";
import ProcesoChat, { BannerSugerencia } from "./ProcesoChat";
import useMenuColapsado from "./useMenuColapsado";

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
    <label className="flex min-w-0 items-center gap-2 text-[13px]">
      <span className="shrink-0 text-[#54656F]">Empresa</span>
      <select className="h-11 min-w-0 max-w-[14rem] flex-1 rounded-lg border border-[#D1D7DB] bg-white px-2 text-base text-[#111B21] lg:h-8 lg:text-[13px]" value={idEmpresa ?? ""} onChange={(e) => onCambiar(Number(e.target.value))}>
        {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
      </select>
    </label>
  );
}

// Pie de la columna de chats: número y modo, conversaciones, entrevistas y plantillas del mes.
function PieEstado({ estado }) {
  if (!estado || estado.modo === "apagado") return null;
  const numero = estado.numero_whatsapp ? formatearTelefono(estado.numero_whatsapp) : null;
  const plantillas = textoPlantillasMes(estado);
  return (
    <p className="text-[12.5px] leading-snug text-[#54656F]" data-estado-wa={estado.modo}>
      <span className={`mr-1 inline-block size-2 rounded-full align-middle ${estado.puede_usar ? "bg-emerald-600" : "bg-amber-500"}`} aria-hidden="true" />
      <span className={`font-semibold ${estado.puede_usar ? "text-emerald-800" : "text-amber-900"}`}>{estado.puede_usar ? "Activo" : "En pausa"} · {estado.modo === "propio" ? "número propio" : "número compartido de ADAMIA"}</span>
      {numero ? <> · <span className="whitespace-nowrap">{numero}</span></> : null}
      {" · "}{Number(estado.conversaciones_mes) || 0} conversaciones este mes
      {" · "}<span data-entrevistas-mes>{textoEntrevistasMes(estado)}</span>
      {plantillas ? <>{" · "}<span data-plantillas-mes>{plantillas}</span></> : null}
    </p>
  );
}

// Paquete de entrevistas: con extras, aviso ámbar de que se cobran aparte. El agente sigue contestando.
function AvisoExtras({ estado }) {
  const texto = avisoExtras(estado);
  if (!texto) return null;
  return <p role="status" data-aviso-extras className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] font-medium text-amber-900">{texto}</p>;
}

// P7: aviso discreto de fallas del agente en 24 h con enlace a «Salud del agente».
function AvisoSalud({ salud, pathname }) {
  const aviso = avisoBandeja(salud);
  if (!aviso) return null;
  const rojo = aviso.tono === "rojo";
  return (
    <p role="status" data-aviso-salud={aviso.tono}
      className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg border px-3 py-1.5 text-[13px] ${rojo ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
      <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 font-medium">{aviso.texto}</span>
      <span aria-hidden="true">·</span>
      <Link href={`${pathname}?vista=salud`} scroll={false} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2 lg:min-h-0">Ver detalle</Link>
    </p>
  );
}

// «Agente encendido / apagado»: abre «Configurar agente».
function ChipAgente({ encendido, onClick }) {
  const texto = encendido === undefined ? "Agente" : encendido ? "Agente encendido" : "Agente apagado";
  return (
    <button type="button" onClick={onClick} title="Configurar agente" data-chip-agente={encendido === undefined ? "" : encendido ? "encendido" : "apagado"}
      className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[13px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 lg:min-h-9 ${
        encendido ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "border-[#D1D7DB] bg-white text-[#3B4A54] hover:bg-[#F5F6F6]"}`}>
      <span aria-hidden="true" className={`size-2 rounded-full ${encendido ? "bg-emerald-600" : "bg-gray-400"}`} />
      {texto}
    </button>
  );
}

const BOTON_ICONO = "grid size-11 shrink-0 place-items-center rounded-full text-[#54656F] outline-none transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-emerald-600 lg:size-10";
const ITEM_MENU = "min-h-11 gap-3 px-4 text-[14.5px] text-[#111B21] focus:bg-[#F0F2F5] [&_svg]:text-[#54656F]";

// Entrevistas y Salud del agente: ocupan el lugar de la conversación (en teléfono, toda la pantalla) con su barra y «Cerrar».
function VistaLateral({ titulo, pathname, children }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#F7F8FA] max-lg:fixed max-lg:inset-0 max-lg:z-40" data-vista-lateral={titulo}>
      <header className="flex min-h-[60px] shrink-0 items-center gap-1.5 border-b border-[#E2E8F0] bg-[#F0F2F5] px-1.5 pt-[env(safe-area-inset-top)] lg:px-4 lg:pt-0">
        <Link href={pathname} scroll={false} aria-label="Volver a chats" className={`${BOTON_ICONO} lg:hidden`}><ArrowLeft className="size-5" aria-hidden="true" /></Link>
        <h2 className="min-w-0 flex-1 truncate text-[16px] font-semibold text-[#111B21]">{titulo}</h2>
        <Link href={pathname} scroll={false} aria-label={`Cerrar ${titulo.toLowerCase()}`} className={`${BOTON_ICONO} max-lg:hidden`}><X className="size-5" aria-hidden="true" /></Link>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:p-5">{children}</div>
    </div>
  );
}

// El servidor manda `citas` (todas las de la conversación); se muestra la próxima activa. Acepta también `cita`.
function citaActiva(hilo) {
  if (hilo?.cita) return hilo.cita;
  const activas = (hilo?.citas ?? []).filter((c) => c?.estado === "agendada" || c?.estado === "confirmada");
  activas.sort((a, b) => String(a.inicio).localeCompare(String(b.inicio)));
  return activas[0] ?? null;
}

export default function BandejaWhatsapp() {
  const { dataUser, isAuthChecked } = useAuth();
  useMenuColapsado();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const abierta = params.get("c");
  const vistaUrl = params.get("vista");
  const vista = !abierta && (vistaUrl === "entrevistas" || vistaUrl === "salud") ? vistaUrl : "conversaciones";
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
  // «Enlaces de vacantes» también con WhatsApp apagado: página de la vacante y bolsa de trabajo no dependen de él.
  const conEnlaces = !!estado && !errorEstado;

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
  // Filtro por etapa del proceso de selección (se combina con el chip).
  const [etapa, setEtapa] = useState("");
  const filtroParams = useMemo(() => ({ ...paramsFiltro(filtro), ...paramsEtapa(etapa) }), [filtro, etapa]);
  // La lista sigue a la vista con Entrevistas o Salud abiertas (ocupan el lugar de la conversación).
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
  // Ficha del candidato: cerrada por defecto; `seccion` lleva a la tarjeta pedida (cita, proceso).
  const [ficha, setFicha] = useState({ abierta: false, seccion: "" });
  const abrirFicha = useCallback((seccion = "") => setFicha({ abierta: true, seccion: typeof seccion === "string" ? seccion : "" }), []);
  const cerrarFicha = useCallback(() => setFicha({ abierta: false, seccion: "" }), []);
  const [dialogoCita, setDialogoCita] = useState(""); // agendar | mover | cancelar (desde el encabezado, el menú o la ficha)
  const [enlaceAbierto, setEnlaceAbierto] = useState(false);
  const pendienteMenu = useRef(null);
  // Configuración del agente: da su nombre a las burbujas y el punto de encendido del botón (misma clave que el diálogo).
  const { data: agente } = useSWR(activo ? rutaAgente(idEmpresa) : null, obtener, { revalidateOnFocus: false, shouldRetryOnError: false });
  const nombreAsistente = agente?.nombre_asistente || "";
  // R3: modo de agenda de la empresa (misma clave que la pestaña «Agenda y recordatorios»), para «Aprobar para agendar».
  const { data: agendaEmpresa } = useSWR(activo ? rutaAgendaEmpresa(idEmpresa) : null, obtener, { revalidateOnFocus: false, shouldRetryOnError: false });
  const nombreEmpresa = empresas.find((e) => e.id === idEmpresa)?.nombre ?? "";

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
  const [aprobando, setAprobando] = useState(false);
  const [ofreciendo, setOfreciendo] = useState(false);
  const [lineas, setLineas] = useState([]);
  useEffect(() => {
    setPendientes([]);
    setAviso("");
    setLineas([]);
    setFicha({ abierta: false, seccion: "" });
    setDialogoCita("");
    setEnlaceAbierto(false);
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

  // Mensaje que devuelve el API (envío de archivo, horarios ofrecidos): se agrega al hilo sin esperar el sondeo.
  const agregarMensaje = (mensaje) => recargarHilo((actual) => actual && {
    ...actual, mensajes: [...(actual.mensajes ?? []).filter((m) => String(m.id) !== String(mensaje?.id)), mensaje].filter(Boolean),
  }, { revalidate: false });

  // Archivo o nota de voz. Cancelar no es error: se conserva el archivo para reintentar.
  const enviarArchivo = async (datos, opciones) => {
    setAviso("");
    try {
      const { mensaje } = await enviarAdjunto(abierta, datos, opciones);
      await agregarMensaje(mensaje);
      recargarLista();
      setAnuncio(datos.notaVoz ? "Nota de voz enviada." : "Archivo enviado.");
      return true;
    } catch (e) {
      if (e?.code === "ERR_CANCELED" || e?.name === "CanceledError") { setAnuncio("Envío cancelado."); return false; }
      setAviso(mensajeErrorApi(e, "No se pudo enviar el archivo. Intenta de nuevo."));
      if ([403, 409].includes(e?.response?.status)) recargarHilo();
      return false;
    }
  };

  const agregarLinea = (texto) => {
    if (!texto) return;
    setLineas((l) => [...l, { id: `${Date.now()}-${l.length}`, texto }]);
    setAnuncio(texto);
  };
  // Acción de la cita fija: línea de sistema con la cita que devuelve el API (o la anterior) y se refresca el hilo.
  const alCambiarCitaChat = async (accion, respuesta, anterior) => {
    agregarLinea(lineaCita(accion, respuesta?.cita ?? anterior));
    if (respuesta?.aviso) agregarLinea(String(respuesta.aviso));
    await recargarHilo();
    recargarLista();
  };
  const ofrecer = async () => {
    setOfreciendo(true);
    setAviso("");
    try {
      const r = await ofrecerHorarios(abierta);
      if (r?.mensaje) await agregarMensaje(r.mensaje);
      agregarLinea(lineaCita("ofrecer"));
      recargarHilo();
    } catch (e) {
      setAviso(mensajeErrorApi(e, "No se pudieron ofrecer los horarios."));
      if (e?.response?.status === 409) recargarHilo();
    } finally {
      setOfreciendo(false);
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
  const aprobar = async () => {
    setAprobando(true);
    setAviso("");
    try {
      await aprobarAgenda(abierta);
      await recargarHilo((actual) => actual && { ...actual, entrevista: actual.entrevista && { ...actual.entrevista, agenda_aprobada: true, requiere_atencion: false } }, { revalidate: true });
      recargarLista();
      setAnuncio("Aprobado: el agente le ofrecerá horarios al candidato.");
    } catch (e) {
      setAviso(mensajeErrorApi(e, "No se pudo aprobar para agendar."));
    } finally {
      setAprobando(false);
    }
  };
  // El error lo muestra el cuadro de seguimiento (WA_SIN_PLANTILLA / WA_VENTANA_ABIERTA); aquí solo se refresca.
  const seguimiento = async () => {
    try {
      await enviarSeguimiento(abierta);
      setAnuncio("Seguimiento enviado.");
      recargarEstado();
    } finally {
      recargarHilo();
    }
  };
  // «Ofrecer horarios»: necesita vacante, la ventana de 24 h abierta y que no tenga ya una cita activa (el API responde
  // 409 si no; también si la agenda de la empresa está apagada, eso se avisa con el texto del API).
  const citasHilo = hilo ? citasDelChat(hilo) : null;
  const yaTieneCita = Boolean(citasHilo?.activa);
  const opcionOfrecer = conversacion && CHAT_ADJUNTOS_ACTIVO ? {
    disponible: !!conversacion.vacante?.id_vacante && conversacion.ventana_abierta !== false && !yaTieneCita,
    motivo: !conversacion.vacante?.id_vacante ? "Sin vacante" : conversacion.ventana_abierta === false ? "Chat cerrado (más de 24 h)" : yaTieneCita ? "Ya tiene una cita" : "",
    cargando: ofreciendo,
    onOfrecer: ofrecer,
  } : null;
  // Proceso de selección del candidato (misma postulación que en Reclutamiento).
  const alCambiarProceso = useCallback(async (texto) => {
    await recargarHilo();
    recargarLista();
    if (texto) setAnuncio(texto);
  }, [recargarHilo, recargarLista]);
  const proceso = hilo?.proceso ?? null;
  const procesoChat = hilo ? (
    <ProcesoChat key={`${abierta}-${proceso?.id_postulacion ?? "sin"}`} proceso={proceso} puedeIniciar={hilo.puede_iniciar_proceso === true}
      conversacion={conversacion} empresa={nombreEmpresa} onCambio={alCambiarProceso} atajos enFicha />
  ) : null;
  const panel = (
    <PanelCandidato entrevista={entrevista} preguntasSinRespuesta={preguntasSinRespuesta} cargando={cargandoHilo && !hilo}
      onAtendido={atender} marcando={marcando} nombreAsistente={nombreAsistente} ahora={ahora}
      cita={citaActiva(hilo)} modoAgenda={agendaEmpresa?.quien_agenda ?? null} onAprobar={aprobar} aprobando={aprobando} />
  );
  // Cita de la ficha (misma tarjeta y acciones que antes estaban sobre el chat); su diálogo se controla desde aquí.
  const tarjetaCita = conversacion && citasHilo ? (
    <CitaChat conversacion={conversacion} activa={citasHilo.activa} ultima={citasHilo.ultima} hoy={hoyMx(ahora)} onCambio={alCambiarCitaChat} ofrecer={opcionOfrecer}
      enFicha dialogo={dialogoCita} onDialogo={setDialogoCita} />
  ) : null;
  // «Agendar»: sin cita activa abre el selector de horarios; con cita, la ficha en su tarjeta.
  const agendar = () => {
    if (citasHilo?.activa) abrirFicha("cita");
    else setDialogoCita("agendar");
  };
  const entrevistaResumen = entrevista ?? conversacion?.entrevista ?? null;
  const estadoChat = entrevistaResumen
    ? [etiquetaCalificacion(entrevistaResumen.calificacion)?.texto, entrevistaResumen.etapa ? etiquetaEtapa(entrevistaResumen.etapa).toLowerCase() : ""].filter(Boolean).join(", ")
    : "";
  const atencion = entrevista?.requiere_atencion === true ? entrevista.motivo_atencion || "Requiere atención" : null;
  const agenteEncendido = agente ? agente.activo === true : undefined;

  if (isAuthChecked && dataUser && !permitido) {
    return (
      <div className="grid gap-4 p-5">
        <h1 className="text-[21px] font-extrabold text-[#111B21]">Chats de WhatsApp</h1>
        <p role="alert" className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-700">Esta sección es para el equipo de reclutamiento de la empresa.</p>
      </div>
    );
  }

  const dialogos = (
    <>
      <EnlacesVacantes abierto={vacantesAbierto} onCambiar={setVacantesAbierto} idEmpresa={idEmpresa} whatsappActivo={!!activo} />
      <ConfigurarAgente abierto={agenteAbierto} onCambiar={setAgenteAbierto} idEmpresa={idEmpresa} nombreEmpresa={nombreEmpresa} />
      {conversacion?.vacante?.id_vacante ? (
        <EnlaceWhatsappVacante idVacante={conversacion.vacante.id_vacante} titulo={conversacion.vacante.titulo} abierto={enlaceAbierto} onCambiar={setEnlaceAbierto} />
      ) : null}
    </>
  );

  // Sin estado todavía, con error o con WhatsApp apagado: un solo panel centrado a pantalla completa.
  if (errorEstado || cargandoEstado || !estado || estado.modo === "apagado") {
    return (
      <div data-bandeja-completa="" className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white">
        {dialogos}
        <div className="flex min-h-[60px] shrink-0 flex-wrap items-center gap-3 px-4 py-2">
          <h1 className="min-w-0 flex-1 text-[21px] font-extrabold text-[#111B21]">Chats</h1>
          <SelectorEmpresa empresas={empresas} idEmpresa={idEmpresa} onCambiar={cambiarEmpresa} />
        </div>
        {errorEstado ? (
          <div role="alert" className="m-4 flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span className="flex-1">{mensajeErrorApi(errorEstado, "No se pudo consultar el estado de WhatsApp.")}</span>
            <button type="button" onClick={() => recargarEstado()} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 font-medium lg:min-h-9">
              <RefreshCw className="size-4" aria-hidden="true" /> Reintentar
            </button>
          </div>
        ) : !estado ? (
          <p className="px-4 text-sm text-[#54656F]">Consultando WhatsApp…</p>
        ) : (
          <div className="grid flex-1 place-items-center px-6 py-12 text-center" data-estado-wa="apagado">
            <div className="grid max-w-md justify-items-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><MessageCircle className="size-7" aria-hidden="true" /></span>
              <h2 className="mt-4 text-lg font-bold text-gray-900">WhatsApp aún no está activo para tu empresa</h2>
              <p className="mt-1 text-sm text-gray-600">Pídele a ADAMIA que lo active. Cuando esté listo, aquí verás y contestarás los chats con tus candidatos.</p>
              <p className="mt-2 text-sm text-gray-600">Mientras tanto, en «Enlaces de vacantes» puedes copiar la página de cada vacante y decidir si aparecen en la bolsa de trabajo de ADAMIA.</p>
              {conEnlaces ? (
                <button type="button" onClick={() => setVacantesAbierto(true)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#D1D7DB] bg-white px-4 text-sm font-semibold text-[#111B21] hover:bg-[#F5F6F6]">
                  <Link2 className="size-4 text-emerald-700" aria-hidden="true" /> Enlaces de vacantes
                </button>
              ) : null}
              <p className="mt-3 text-[12.5px] text-[#54656F]">{Number(estado.conversaciones_mes) || 0} conversaciones este mes</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  const conVista = vista !== "conversaciones";
  // Opción del menú ⋮ que abre un diálogo: se ejecuta cuando el menú terminó de cerrarse (ver HiloConversacion).
  const columnaOculta = Boolean(abierta) || conVista; // en teléfono, la lista se oculta bajo el chat o la vista
  return (
    <div data-bandeja-completa="" className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-white">
      {dialogos}
      {/* ——— Columna de chats ——— */}
      <section aria-label="Chats" className={`flex min-h-0 w-full min-w-0 flex-col border-[#E2E8F0] bg-white lg:w-[360px] lg:shrink-0 lg:border-r xl:w-[400px] ${columnaOculta ? "max-lg:hidden" : ""}`}>
        <header className="flex min-h-[60px] shrink-0 items-center gap-1.5 pl-4 pr-2 lg:pr-3">
          <h1 className="min-w-0 flex-1 truncate text-[21px] font-extrabold text-[#111B21]">Chats</h1>
          <ChipAgente encendido={agenteEncendido} onClick={() => setAgenteAbierto(true)} />
          <Link href={`${pathname}?vista=entrevistas`} scroll={false} aria-label="Entrevistas" title="Entrevistas" aria-current={vista === "entrevistas" ? "page" : undefined}
            className={`${BOTON_ICONO} ${vista === "entrevistas" ? "bg-[#D9FDD3] text-[#0B5C2E]" : ""}`}>
            <CalendarDays className="size-5" aria-hidden="true" />
          </Link>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Más opciones" title="Más opciones" className={`${BOTON_ICONO} data-[state=open]:bg-[#D1D7DB]`}>
                <MoreVertical className="size-5" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" aria-label="Más opciones"
              onCloseAutoFocus={(e) => { const fn = pendienteMenu.current; pendienteMenu.current = null; if (fn) { e.preventDefault(); fn(); } }}
              className="w-64 rounded-xl border-0 py-2 shadow-[0_12px_34px_rgba(11,20,26,0.22)]">
              <DropdownMenuItem asChild className={ITEM_MENU}>
                <Link href={`${pathname}?vista=salud`} scroll={false}><Activity aria-hidden="true" /> Salud del agente</Link>
              </DropdownMenuItem>
              {conEnlaces ? <DropdownMenuItem className={ITEM_MENU} onSelect={() => { pendienteMenu.current = () => setVacantesAbierto(true); }}><Link2 aria-hidden="true" /> Enlaces de vacantes</DropdownMenuItem> : null}
              <DropdownMenuItem className={ITEM_MENU} onSelect={() => { pendienteMenu.current = () => setAgenteAbierto(true); }}><Bot aria-hidden="true" /> Configurar agente</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        {avisoExtras(estado) || (vista !== "salud" && avisoBandeja(estado.salud)) || !estado.puede_usar ? (
          <div className="grid shrink-0 gap-1.5 px-3 pb-2">
            <AvisoExtras estado={estado} />
            {vista !== "salud" ? <AvisoSalud salud={estado.salud} pathname={pathname} /> : null}
            {!estado.puede_usar ? (
              <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
                Por ahora tu empresa no puede enviar mensajes por WhatsApp. Pídele a ADAMIA que lo revise.
              </p>
            ) : null}
          </div>
        ) : null}
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
          etapa={etapa}
          onEtapa={setEtapa}
        />
        <footer className="grid shrink-0 gap-1.5 border-t border-[#E9EDEF] px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <SelectorEmpresa empresas={empresas} idEmpresa={idEmpresa} onCambiar={cambiarEmpresa} />
          <PieEstado estado={estado} />
        </footer>
      </section>

      {/* ——— Conversación, ficha, o Entrevistas / Salud ——— */}
      {conVista ? (
        <VistaLateral titulo={vista === "entrevistas" ? "Entrevistas" : "Salud del agente"} pathname={pathname}>
          {vista === "entrevistas" ? <Entrevistas idEmpresa={idEmpresa} ahora={ahora} /> : <SaludAgente idEmpresa={idEmpresa} ahora={ahora} pathname={pathname} conTitulo={false} />}
        </VistaLateral>
      ) : abierta ? (
        <div className="relative flex min-h-0 min-w-0 flex-1">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col max-lg:fixed max-lg:inset-0 max-lg:z-40">
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
              onSeguimiento={seguimiento}
              onEnviarAdjunto={CHAT_ADJUNTOS_ACTIVO ? enviarArchivo : undefined}
              ofrecer={opcionOfrecer}
              lineas={lineas}
              estado={estadoChat}
              fichaAbierta={ficha.abierta}
              onVerFicha={hilo ? abrirFicha : null}
              onAgendar={hilo ? agendar : null}
              cita={citasHilo?.activa ?? null}
              onMoverEtapa={hilo ? () => abrirFicha("proceso") : null}
              onEnlaceVacante={() => setEnlaceAbierto(true)}
              atencion={atencion}
              onAtendido={atencion ? atender : null}
              marcando={marcando}
              sugerencia={<BannerSugerencia proceso={proceso} onCambio={alCambiarProceso} />}
            />
          </div>
          {hilo ? (
            <FichaCandidato abierta={ficha.abierta} seccion={ficha.seccion} onCerrar={cerrarFicha} conversacion={conversacion} entrevista={entrevistaResumen}
              proceso={procesoChat} cita={tarjetaCita} evaluacion={panel} />
          ) : null}
        </div>
      ) : (
        <div className="hidden min-w-0 flex-1 flex-col items-center justify-center gap-2 border-b-[6px] border-emerald-600 bg-[#F0F2F5] p-8 text-center lg:flex">
          <MessageCircle className="size-12 text-emerald-700" aria-hidden="true" />
          <p className="text-[20px] font-semibold text-[#111B21]">Elige una conversación</p>
          <p className="max-w-sm text-sm text-[#54656F]">Aquí verás los mensajes con el candidato. La IA responde y tú tomas el control cuando lo necesites.</p>
        </div>
      )}
    </div>
  );
}
