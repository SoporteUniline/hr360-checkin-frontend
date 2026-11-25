"use client";
import { useEffect, useRef, useState } from "react";
import {
  CheckCircle,
  Keyboard,
  QrCode,
  ScanEye,
  XCircle,
  Clock4,
  AlertTriangle,
  Camera,
  Menu,
  Pin,
  PinOff,
  ScanFace,
  LogOut,
  Utensils,
  DoorOpen,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { validadaHoy, guardarValidada, olvidarValidada } from "@/lib/reloj/suscripcionDia.mjs";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import axiosInstance from "@/lib/axios";
import ErrorPage from "@/components/ErrorPage";
import { useSnackbar } from "notistack";
import FacialRecognitionPanel from "./FacialRecognitionPanel";
import { loadBrowserFaceApi } from "@/lib/faceapi-browser";
import { diagnosticoActivo, fijarDiagnostico } from "@/lib/diagnostico-reloj";
import ClockDisplay from "./Clock/ClockDisplay";
import EmployeeInput from "./Clock/EmployeeInput";
import StatsCards from "./Clock/StatsCards";
import RecordsTable from "./Clock/RecordsTable";
import PantallaKiosco from "./Clock/PantallaKiosco";
import UltimosRegistros from "./Clock/UltimosRegistros";
import { estadoConexion } from "./Clock/IndicadorConexion";
import { useGPS } from "@/hooks/Capacitor/useGPS";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useAuth } from "@/context/AuthContext";
import QRScanner from "./QRScanner";
import { Button } from "./ui/button";
import { registrarEnLinea } from '@/lib/reloj/registrarEnLinea.mjs';
import TecladoCodigoCara from './Clock/TecladoCodigoCara';
import ClockNavigation from './Clock/ClockNavigation';
import { hora12 } from "@/lib/hora12.mjs";
import { conVoyAComer, segundosRestantes, DURACION_VOY_A_COMER_S } from "@/lib/reloj/voyAComer.mjs";
import { BotonVoyAComer, AvisoVoyAComer } from "./Clock/VoyAComer";
import ResultadoChecada from "./Clock/ResultadoChecada";
import AvisoKiosco from "./Clock/AvisoKiosco";
import { crearSonidoReloj, leerSonidoActivo, guardarSonidoActivo } from "@/lib/reloj/sonidoReloj.mjs";

dayjs.extend(utc);
dayjs.extend(timezone);

// (INC-RELOJ-COMIDA-001) Si una checada guardada no trae las opciones del servidor, se ofrecen las que el
// servidor acepta para cualquier tipo de cierre (con cierre automático, temporal/cerrar turno cuentan como salida).
const OPCIONES_SIN_DATOS = ["salida_comida", "salida_temporal", "cerrar_turno"];

export default function RelojChecador({
  idEmpresa,
  modoEmpleado = false,
  idEmpleado = null,
  companySlug = null,
  nombreEmpresa = "",
}) {
  const [ubicacionGPS, setUbicacionGPS] = useState(null);
  const [metodo, setMetodo] = useState("facial");
  // Celular: la cámara ocupa el alto que queda entre la franja de arriba y la barra de abajo. Se mide porque
  // arriba puede haber navegación (reloj del empleado).
  const areaRef = useRef(null);
  const [altoArea, setAltoArea] = useState(null);
  const [ajustesCamara, setAjustesCamara] = useState(false);
  const [menuMovil, setMenuMovil] = useState(false);
  // Cámara siempre encendida: útil en un reloj fijo (fila de personas). En el celular de cada
  // empleado conviene apagarla al checar. Se recuerda por dispositivo.
  const claveCamara = `adamia-reloj-camara-fija:${modoEmpleado ? "empleado" : "empresa"}`;
  const [camaraFija, setCamaraFija] = useState(!modoEmpleado);
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(claveCamara);
      if (guardado !== null) setCamaraFija(guardado === "1");
    } catch { /* sin almacenamiento: queda el valor por defecto */ }
  }, [claveCamara]);
  const cambiarCamaraFija = () => setCamaraFija((actual) => {
    try { localStorage.setItem(claveCamara, actual ? "0" : "1"); } catch { /* solo esta sesión */ }
    return !actual;
  });
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  const [isMobile, setIsMobile] = useState(false);
  const [mostrarModalTurno, setMostrarModalTurno] = useState(false);
  const [pendiente, setPendiente] = useState(null);

  const { dataUser } = useAuth();
  const DB_TIMEZONE = "America/Mexico_City";
  const [mostrarQR, setMostrarQR] = useState(false);
  const [horaActual, setHoraActual] = useState("");
  const [fechaActual, setFechaActual] = useState("");
  const [codigoEmpleado, setCodigoEmpleado] = useState("");
  const [mostrarCamara, setMostrarCamara] = useState(true);
  const { enqueueSnackbar } = useSnackbar();
  const [popupInfo, setPopupInfo] = useState(null);
  // Candado de 5 min: «Acabas de registrar tu salida a las 4:49 p.m. ¿Registrar otra vez?».
  const [pregunta, setPregunta] = useState(null);
  const [repitiendo, setRepitiendo] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const { getCurrentLocation, loading: loadingGPS } = useGPS();
  // Todo se registra en línea: el servidor identifica a la persona. En el kiosco la cara se busca en la empresa
  // (o 1 a 1 si viene con código). En la app, `modo: "app"` hace que el servidor tome a la persona de la sesión y la
  // compare solo con sus fotos. Los códigos (y el QR) siguen identificando a cualquiera de la empresa.
  // (26/11/2026) «Voy a comer»: prendido antes de checar, la siguiente checada va con accion = salida_comida y se apaga
  // al usarse (el servidor contestó) o a los 30 s. La referencia la lee el panel de rostro, que guarda esta función.
  const [voyAComer, setVoyAComer] = useState(null); // null | { hasta } (ms)
  const voyAComerRef = useRef(false);
  const [segundosComer, setSegundosComer] = useState(0);
  useEffect(() => {
    voyAComerRef.current = Boolean(voyAComer);
    if (!voyAComer) return undefined;
    const tic = () => {
      const s = segundosRestantes(voyAComer.hasta);
      setSegundosComer(s);
      if (!s) setVoyAComer(null);
    };
    tic();
    const t = setInterval(tic, 250);
    return () => clearInterval(t);
  }, [voyAComer]);
  const cambiarVoyAComer = () => setVoyAComer((v) => (v ? null : { hasta: Date.now() + DURACION_VOY_A_COMER_S * 1000 }));
  const submitMovement = async (payload) => {
    const enviar = conVoyAComer(payload, voyAComerRef.current);
    const base = modoEmpleado && enviar.descriptor_facial ? { ...enviar, modo: "app" } : enviar;
    const respuesta = await registrarEnLinea(axiosInstance, base);
    if (enviar !== payload) { voyAComerRef.current = false; setVoyAComer(null); }
    return respuesta;
  };
  // Reloj de la empresa (/<slug>): kiosco a pantalla completa, sin desplazar. El del empleado conserva su diseño.
  const kiosco = !modoEmpleado;
  // Kiosco: qué panel se ve a la izquierda (Rostro, Código o QR). La cámara sigue reconociendo con cualquiera.
  const [metodoKiosco, setMetodoKiosco] = useState("rostro");
  // Kiosco: los avisos (código inválido, cara que no coincide…) van en grande arriba; en la app, como siempre.
  const [avisoKiosco, setAvisoKiosco] = useState(null);
  const temporizadorAviso = useRef(null);
  useEffect(() => () => clearTimeout(temporizadorAviso.current), []);
  // Kiosco: sonido corto al checar y tono grave en los errores que se ven en pantalla (máx. uno cada 3 s). Se desbloquea
  // con el primer toque (los navegadores no dejan sonar antes); la bocina lo silencia y se recuerda en el aparato.
  const sonidoRef = useRef(null);
  const [sonidoActivo, setSonidoActivo] = useState(true);
  useEffect(() => {
    if (!kiosco) return undefined;
    let almacen = null;
    try { almacen = window.localStorage; } catch { /* sin almacenamiento */ }
    const activo = leerSonidoActivo(almacen);
    const sonido = crearSonidoReloj({
      activo,
      crearContexto: () => {
        // Antes del primer toque el navegador no deja sonar: no se crea el contexto (evita avisos en la consola).
        if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return null;
        const Contexto = window.AudioContext || window.webkitAudioContext;
        return Contexto ? new Contexto() : null;
      },
    });
    sonidoRef.current = sonido;
    setSonidoActivo(activo);
    const desbloquear = () => sonido.desbloquear();
    window.addEventListener("pointerdown", desbloquear, true);
    window.addEventListener("keydown", desbloquear, true);
    return () => {
      window.removeEventListener("pointerdown", desbloquear, true);
      window.removeEventListener("keydown", desbloquear, true);
      sonido.cerrar();
      sonidoRef.current = null;
    };
  }, [kiosco]);
  const cambiarSonido = () => {
    const nuevo = !sonidoActivo;
    sonidoRef.current?.fijarActivo(nuevo);
    try { guardarSonidoActivo(window.localStorage, nuevo); } catch { /* solo esta sesión */ }
    setSonidoActivo(nuevo);
  };
  const avisar = (texto, tono = "error", duracion = 5000) => {
    if (!kiosco) { enqueueSnackbar(texto, { variant: tono }); return; }
    if (tono === "error") sonidoRef.current?.error();
    clearTimeout(temporizadorAviso.current);
    setAvisoKiosco({ texto, tono });
    temporizadorAviso.current = setTimeout(() => setAvisoKiosco(null), duracion);
  };

  // Prepare recognition while subscription and clock data are being checked.
  // Camera and GPS permissions are requested only by the visible facial panel.
  useEffect(() => {
    loadBrowserFaceApi().catch(() => {});
  }, []);

  // Modo diagnóstico: mide desde que se abre el reloj hasta que se checa.
  useEffect(() => {
    const d = globalThis.__adamiaDiag;
    d?.iniciar?.("reloj", { modo: modoEmpleado ? "empleado" : "kiosco", id_empresa: idEmpresa ?? null, id_empleado: idEmpleado ?? null });
    d?.marca("reloj_montado");
    return () => d?.terminar?.("salió del reloj sin checar");
  }, [modoEmpleado, idEmpresa, idEmpleado]);

  // Cinco toques sobre la hora (celular) prenden o apagan el diagnóstico.
  const toquesHoraRef = useRef([]);
  const tocarHora = () => {
    const ahora = Date.now();
    toquesHoraRef.current = [...toquesHoraRef.current.filter((t) => ahora - t < 2500), ahora];
    if (toquesHoraRef.current.length < 5) return;
    toquesHoraRef.current = [];
    const activar = !diagnosticoActivo();
    fijarDiagnostico(activar);
    enqueueSnackbar(activar ? "Diagnóstico activado" : "Diagnóstico desactivado", { variant: "info" });
    setTimeout(() => window.location.reload(), 600);
  };

  const formatearHora = (fechaString) => {
    if (!fechaString) return "-";
    return hora12(dayjs.tz(fechaString, DB_TIMEZONE).tz(EMPRESA_TIMEZONE), { segundos: true });
  };

  const endpoint = modoEmpleado
    ? `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/reloj/registros-del-dia-empleado?id_empleado=${idEmpleado}`
    : `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/reloj/registros-del-dia?id_empresa=${idEmpresa}`;

  const {
    data: registrosData,
    mutate,
    error,
    isLoading,
  } = useSWR(
    (modoEmpleado && idEmpleado) || (!modoEmpleado && idEmpresa)
      ? endpoint
      : null,
    fetcher,
    { refreshInterval: 30000 }, // fallback cada 30 s; SSE lo actualiza al instante
  );

  const movimientos = registrosData?.registrosHoy || [];
  const empleadosActivos = registrosData?.activosHoy || 0;
  const totalRegistros = registrosData?.totalRegistrosHoy || 0;
  const EMPRESA_TIMEZONE = registrosData?.zona_horaria || "America/Mexico_City";

  // ── SSE: actualización en tiempo real cuando llega una checada ──────────────
  useEffect(() => {
    const sseParam =
      modoEmpleado && idEmpleado
        ? `id_empleado=${idEmpleado}`
        : idEmpresa
        ? `id_empresa=${idEmpresa}`
        : null;
    if (!sseParam) return;

    const es = new EventSource(
      `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/reloj/eventos-checada?${sseParam}`,
    );
    es.addEventListener("checada", () => mutate());
    es.onerror = () => {}; // silencioso; el refreshInterval cubre el fallback

    return () => es.close();
  }, [idEmpresa, idEmpleado, modoEmpleado]);
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const actualizarHora = () => {
      const ahora = dayjs().tz(EMPRESA_TIMEZONE);
      setHoraActual(hora12(ahora, { segundos: true }));
      const fechaFormateada = ahora.format("dddd, D [de] MMMM [de] YYYY");
      const [dia, ...resto] = fechaFormateada.split(", ");
      const diaCapitalizado = dia.charAt(0).toUpperCase() + dia.slice(1);
      setFechaActual([diaCapitalizado, ...resto].join(", "));
    };

    actualizarHora();
    const intervalo = setInterval(actualizarHora, 1000);
    return () => clearInterval(intervalo);
  }, [EMPRESA_TIMEZONE]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (metodo !== "facial") setMostrarCamara(false);
  }, [metodo]);

  useEffect(() => {
    setCodigoEmpleado("");
  }, [metodo]);

  // Un solo temporizador para la tarjeta del resultado: con varios, el de la persona anterior cerraba el aviso
  // de la siguiente antes de tiempo. Con motivo de «pendiente», más tiempo.
  const temporizadorPopup = useRef(null);
  const router = useRouter();
  useEffect(() => () => clearTimeout(temporizadorPopup.current), []);
  // Kiosco: la confirmación se queda 3.5 s (se lee a un paso de distancia); con motivo de «pendiente», 8 s.
  const duracionResultado = (data) => (data.pending && data.motivo ? 8000 : kiosco ? 3500 : 2500);
  const mostrarResultado = (data) => {
    clearTimeout(temporizadorPopup.current);
    // App del empleado: al checar regresa a su Inicio (ahí ve su jornada actualizada). Con error del
    // servidor se queda para que lo vea y avise a RH; los errores al registrar no pasan por aquí (se quedan en el reloj).
    const volverAInicio = modoEmpleado && !data.errorServidor;
    setPopupInfo({
      volviendo: volverAInicio,
      nombre: `${data.empleado?.nombre ?? ""} ${data.empleado?.apellido_paterno ?? ""}`.trim(),
      foto_perfil: data.empleado?.foto_perfil || "/assets/user.png",
      movimiento: data.movimiento || data.message,
      pending: Boolean(data.pending),
      motivo: data.motivo || "",
      errorServidor: Boolean(data.errorServidor),
      localValidated: Boolean(data.local_validated),
      success: !data.pending,
      hora: hora12(dayjs().tz(EMPRESA_TIMEZONE)),
      duracion: duracionResultado(data),
    });
    if (data.pending && data.errorServidor) sonidoRef.current?.error();
    else if (!data.pending) sonidoRef.current?.exito(data.movimiento || data.message);
    temporizadorPopup.current = setTimeout(() => {
      setPopupInfo(null);
      if (volverAInicio) router.replace("/empleado/panel/inicio");
    }, duracionResultado(data));
    mutate();
  };

  const registrarMovimiento = async (codigoManual) => {
    if (registrando) return;
    setRegistrando(true);
    const captured_at = new Date().toISOString();

    const rawCodigo =
      typeof codigoManual === "string" || typeof codigoManual === "number"
        ? codigoManual
        : codigoEmpleado;
    const codigo = String(rawCodigo || "")
      .trim()
      .replace(/\D/g, "");

    if (!codigo) {
      setRegistrando(false);
      return;
    }

    try {
      const payload = { codigo, id_empresa: idEmpresa, captured_at };
      let response;
      try {
        response = await submitMovement(payload);
      } catch (err) {
        if (err.response?.data?.error !== "Faltan coordenadas de ubicación") throw err;
        const pos = await getCurrentLocation();
        setUbicacionGPS(pos);
        if (!pos) {
          avisar("Permite el acceso a ubicación y activa el GPS para checar.");
          return;
        }
        response = await submitMovement({
          ...payload, captured_at: new Date().toISOString(), latitud_actual: pos.lat, longitud_actual: pos.lng,
          precision_metros: pos.accuracy, ubicacion_timestamp: pos.timestamp,
        });
      }
      const { data } = response;

      if (data.repetida) {
        setPregunta(data);
        setCodigoEmpleado("");
        return;
      }

      if (data.requiereDecision) {
        setPendiente({ tipo: "codigo", codigo, opciones: data.opciones, mensaje: data.message, aviso: data.aviso ?? null });
        setMostrarModalTurno(true);
        setRegistrando(false);
        return;
      }

      mostrarResultado(data);
      setCodigoEmpleado("");
    } catch (err) {
      setCodigoEmpleado("");
      // Persona con «Código y cara» que escribió solo su código: la cámara confirma enseguida que es ella (1 a 1).
      if (kiosco && err.response?.data?.code === "METHOD_CODE_FACE" && !offline) {
        setMostrarCamara(true);
        setCodigoCara(codigo);
        avisar("Ahora mira a la cámara para confirmar que eres tú.", "info");
        return;
      }
      avisar(err.response?.data?.error || err.message || "Error al registrar");
    } finally {
      setRegistrando(false);
    }
  };

  const registrarConAccion = async (accion) => {
    if (!pendiente || registrando) return;
    try {
      setRegistrando(true);
      // Ask the server first; employees without GPS requirements need no permission.
      let dataResponse;
      const payload = {
        id_empresa: idEmpresa,
        accion,
        ...(pendiente.repetir ? { repetir: true } : {}),
      };

      const body = pendiente.tipo === "facial" ? {...payload, descriptor_facial: pendiente.descriptor_facial, ...(pendiente.codigo ? { codigo: pendiente.codigo } : {})} : {...payload, codigo: pendiente.codigo};
      try {
        dataResponse = (await submitMovement(body)).data;
      } catch (err) {
        if (err.response?.data?.error !== "Faltan coordenadas de ubicación") throw err;
        const pos = await getCurrentLocation();
        setUbicacionGPS(pos);
        if (!pos) throw new Error("Permite el acceso a ubicación y activa el GPS");
        dataResponse = (await submitMovement({...body,
          latitud_actual: pos.lat, longitud_actual: pos.lng,
          precision_metros: pos.accuracy, ubicacion_timestamp: pos.timestamp,
        })).data;
      }

      setMostrarModalTurno(false);
      // «Sí, registrar» + «Turno abierto»: si aun así rebota, se vuelve a preguntar en lugar de pintar éxito.
      if (dataResponse.repetida) setPregunta(dataResponse);
      else mostrarResultado(dataResponse);
      setPendiente(null);
      setCodigoEmpleado("");
    } catch (error) {
      avisar(error.response?.data?.error || error.message || "Error al registrar");
    } finally {
      setRegistrando(false);
    }
  };

  // «Código y cara» (kiosco): el código elige a la persona y la cámara compara solo contra ella.
  const [codigoCara, setCodigoCara] = useState(null);
  const [tecladoCara, setTecladoCara] = useState(null); // { motivo: "boton" | "requerido" }
  const tecladoCerradoRef = useRef(0);
  const cerrarTecladoCara = () => { tecladoCerradoRef.current = Date.now(); setTecladoCara(null); };
  // El código no se revisa en el aparato: va con la cara al servidor, que dice si no existe, si no tiene rostro o si no coincide.
  const continuarCodigoCara = async (codigo) => {
    setTecladoCara(null);
    setMostrarCamara(true);
    setCodigoCara(codigo);
    return { ok: true };
  };
  const finCodigoCara = (evento) => {
    setCodigoCara(null);
    tecladoCerradoRef.current = Date.now();
    if (evento?.tipo === "fallo") avisar(evento.mensaje, "error", 5000);
  };
  const pedirCodigo = () => {
    if (!kiosco || tecladoCara || codigoCara || Date.now() - tecladoCerradoRef.current < 5000) return;
    setTecladoCara({ motivo: "requerido" });
  };

  const handleFacialResponse = (data) => {
    if (data.repetida) {
      setPregunta(data);
      return;
    }
    if (data.requiereDecision) {
      setPendiente({
        tipo: "facial",
        descriptor_facial: data.descriptor_facial,
        opciones: data.opciones,
        mensaje: data.message,
        aviso: data.aviso ?? null,
      });
      setMostrarModalTurno(true);
    } else {
      mostrarResultado(data);
    }
  };

  const registrarDeTodosModos = async () => {
    if (!pregunta?.reintentar || repitiendo) return;
    setRepitiendo(true);
    try {
      const { data } = await submitMovement(pregunta.reintentar);
      setPregunta(null);
      if (data.requiereDecision) {
        // Cierre manual: después de «Sí, registrar» pregunta «salida temporal / cerrar turno»; la decisión
        // conserva repetir y el tipo (código o rostro) para no volver a chocar con el candado.
        const { codigo, descriptor_facial } = pregunta.reintentar;
        setPendiente({ tipo: descriptor_facial ? "facial" : "codigo", codigo, descriptor_facial, repetir: true, opciones: data.opciones, mensaje: data.message, aviso: data.aviso ?? null });
        setMostrarModalTurno(true);
      } else {
        mostrarResultado(data);
      }
    } catch (err) {
      setPregunta(null);
      avisar(err.response?.data?.error || err.message || "No se pudo registrar");
    } finally {
      setRepitiendo(false);
    }
  };

  const abrirCamara = () => {
    if (offline) return;
    setMostrarQR(false);
    setMostrarCamara(true);
  };
  const handleQRScan = (codigoEscaneado) => {
    setMostrarQR(false);
    registrarMovimiento(codigoEscaneado);
  };
  const handleOpenQR = () => {
    setMostrarCamara(false);
    setTimeout(() => setMostrarQR(true), 300);
  };

  useEffect(() => {
    const validarSuscripcion = async () => {
      if (!idEmpresa) return;
      // Una vez al día: si hoy ya se validó en este dispositivo, entra directo sin preguntar al servidor.
      if (validadaHoy(`empresa:${idEmpresa}`)) {
        setSubscriptionActive(true);
        setSubscriptionLoading(false);
        return;
      }

      try {
        setSubscriptionLoading(true);
        globalThis.__adamiaDiag?.marca("suscripcion_inicio");

        const response = await fetch(
          `/api/empresas/check-subscription/${idEmpresa}`,
          { cache: "no-store" },
        );

        const data = await response.json();

        setSubscriptionActive(Boolean(data.hasActivePlan));
        if (data.hasActivePlan) guardarValidada(`empresa:${idEmpresa}`);
        else olvidarValidada(`empresa:${idEmpresa}`);
        globalThis.__adamiaDiag?.marca("suscripcion_fin", { activa: Boolean(data.hasActivePlan) });
      } catch (error) {
        console.error("Error validando suscripción:", error);
        globalThis.__adamiaDiag?.marca("suscripcion_fin", { error: true });
        setSubscriptionActive(false);
      } finally {
        setSubscriptionLoading(false);
      }
    };

    validarSuscripcion();
  }, [idEmpresa, modoEmpleado, idEmpleado, companySlug]);

  useEffect(() => {
    if (subscriptionLoading || !subscriptionActive) return;
    const medir = () => {
      const area = areaRef.current;
      if (!area || window.innerWidth >= 768) { setAltoArea(null); return; }
      const arriba = area.getBoundingClientRect().top + window.scrollY;
      const barra = document.getElementById("reloj-barra-movil")?.offsetHeight ?? 72;
      setAltoArea(Math.max(320, window.innerHeight - arriba - barra));
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [subscriptionLoading, subscriptionActive, menuMovil]);

  // 12 horas con a.m./p.m.: «4:49 p.m.».
  const horaCorta = horaActual ? horaActual.replace(/:\d{2} /, " ") : "";

  if (subscriptionLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 mr-4"></div>
        <p className="text-lg font-medium text-gray-600">
          Validando suscripción...
        </p>
      </div>
    );
  }

  if (!subscriptionActive) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>

          <h1 className="mb-2 text-2xl font-bold text-red-600">
            Suscripción inactiva
          </h1>

          <p className="text-gray-500">
            Esta empresa no cuenta con una suscripción activa. No se puede usar
            el reloj checador.
          </p>
        </div>
      </div>
    );
  }

  if (error && !offline)
    return <ErrorPage message="No se pudieron cargar los registros." />;

  const conexion = estadoConexion({ offline });
  const estiloAccionCamara = "inline-flex min-h-12 max-w-full items-center gap-2 rounded-full bg-white px-5 text-base font-semibold text-slate-900 shadow-lg ring-1 ring-slate-900/10 hover:bg-slate-50 active:scale-[0.98]";
  // En «Código» o «QR» el teclado ya está a la vista: el botón solo acompaña al método «Rostro» (y al «Código y cara» en curso).
  const accionCodigoCara = !kiosco || (metodoKiosco !== "rostro" && !codigoCara) ? null : codigoCara ? (
    <button type="button" onClick={() => finCodigoCara(null)} className={estiloAccionCamara}>
      <XCircle className="size-5 shrink-0 text-slate-500" aria-hidden="true" /><span className="truncate">Cancelar · usar solo la cara</span>
    </button>
  ) : (
    <button type="button" onClick={() => setTecladoCara({ motivo: "boton" })} data-boton-codigo-cara className={estiloAccionCamara}>
      <Keyboard className="size-5 shrink-0 text-brand" aria-hidden="true" /><span className="truncate">¿No te reconoce? Usa tu código</span>
    </button>
  );
  const cambiarMetodoKiosco = (id) => {
    setMetodoKiosco(id);
    if (id === "rostro" && !mostrarCamara) abrirCamara();
  };
  const panelRostro = (
    <FacialRecognitionPanel
      isOpen={mostrarCamara}
      onOpen={() => setMostrarCamara(true)}
      onClose={() => setMostrarCamara(false)}
      onSuccess={handleFacialResponse}
      idEmpresa={idEmpresa}
      submitMovement={submitMovement}
      handleOpenFacialModal={() => setMostrarCamara(false)}
      continuo={camaraFija}
      pantallaCompleta={kiosco || isMobile}
      pausado={Boolean(pregunta) || Boolean(tecladoCara)}
      codigoCara={kiosco ? codigoCara : null}
      onCodigoCara={finCodigoCara}
      onPedirCodigo={pedirCodigo}
      accionInferior={accionCodigoCara}
      onErrorVisible={kiosco ? () => sonidoRef.current?.error() : undefined}
    />
  );

  return (
    <>
      <main className={kiosco ? "h-dvh overflow-hidden bg-slate-50" : "bg-slate-50 md:min-h-screen md:p-4"}>
        {kiosco ? (
          <PantallaKiosco
            horaActual={horaActual}
            fechaActual={fechaActual}
            nombreEmpresa={nombreEmpresa}
            onTocarHora={tocarHora}
            conexion={conexion}
            menu={dataUser ? <ClockNavigation companyId={idEmpresa} companySlug={companySlug} /> : null}
            metodo={metodoKiosco}
            onCambiarMetodo={cambiarMetodoKiosco}
            codigo={codigoEmpleado}
            setCodigo={setCodigoEmpleado}
            onRegistrar={registrarMovimiento}
            onAbrirQR={handleOpenQR}
            registrando={registrando || loadingGPS}
            avisar={avisar}
            sonido={{ activo: sonidoActivo, onCambiar: cambiarSonido }}
            avisoUbicacion={ubicacionGPS ? `Última lectura: precisión ±${Math.ceil(ubicacionGPS.accuracy)} m. Usa ubicación precisa para checar.` : null}
            camara={!offline ? (
              <>
                {panelRostro}
                {/* Avisos sobre el video: «Código y cara» y «Salida a comer» (entre los botones de la cámara, sin taparlos). */}
                <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex flex-wrap justify-center gap-2 pl-16 pr-28">
                  {codigoCara && (
                    <p className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-brand px-3 py-1.5 text-sm font-semibold text-white shadow-lg" data-chip-codigo-cara>
                      <ScanFace className="size-4 shrink-0" aria-hidden="true" />Código y cara
                    </p>
                  )}
                  <AvisoVoyAComer activo={Boolean(voyAComer)} segundos={segundosComer} enLinea corto />
                </div>
                {/* Ajuste del aparato: discreto sobre el video (antes era una franja «Cámara siempre encendida»). */}
                {mostrarCamara && (
                  <button type="button" onClick={cambiarCamaraFija} aria-pressed={camaraFija}
                    aria-label="Cámara siempre encendida" title={camaraFija ? "Cámara siempre encendida: queda lista para la siguiente persona" : "La cámara se apaga al checar"}
                    className={`absolute left-3 top-3 z-10 grid size-10 place-items-center rounded-full bg-slate-900/55 text-white backdrop-blur-sm ${camaraFija ? "" : "opacity-70"}`}>
                    {camaraFija ? <Pin className="size-5" aria-hidden="true" /> : <PinOff className="size-5" aria-hidden="true" />}
                  </button>
                )}
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-100 p-6 text-center">
                <span className="grid size-16 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm"><Camera className="size-8" aria-hidden="true" /></span>
                <p className="text-lg font-semibold text-slate-800">Rostro no disponible sin conexión</p>
                <p className="text-sm text-slate-600">Restablece la conexión para registrar una checada.</p>
              </div>
            )}
            recientes={<UltimosRegistros movimientos={movimientos} isLoading={isLoading} formatearHora={formatearHora} empleadosActivos={empleadosActivos} totalRegistros={totalRegistros} />}
            voyAComer={{ activo: Boolean(voyAComer), segundos: segundosComer, total: DURACION_VOY_A_COMER_S, onCambiar: cambiarVoyAComer, disabled: offline }}
          />
        ) : (
        <div className="mx-auto max-w-7xl md:space-y-6">
          <div className="hidden md:block"><ClockNavigation companyId={idEmpresa} companySlug={companySlug} /></div>
          <div className="grid grid-cols-1 md:grid-cols-12 md:gap-6">
            <div className="hidden md:block lg:col-span-4 md:col-span-5 space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <ClockDisplay
                  horaActual={horaActual}
                  fechaActual={fechaActual}
                  conexion={conexion}
                />
                {ubicacionGPS && <p className="text-sm text-slate-600" role="status">Última lectura: precisión ±{Math.ceil(ubicacionGPS.accuracy)} m. Usa ubicación precisa para checar.</p>}
                <EmployeeInput
                  codigo={codigoEmpleado}
                  setCodigo={setCodigoEmpleado}
                  handleRegistrar={registrarMovimiento}
                  handleOpenQR={handleOpenQR}
                  registrando={registrando || loadingGPS}
                  enqueueSnackbar={enqueueSnackbar}
                  extra={<BotonVoyAComer activo={Boolean(voyAComer)} segundos={segundosComer} onCambiar={cambiarVoyAComer} disabled={offline} />}
                />
              </div>
              <StatsCards
                empleadosActivos={empleadosActivos}
                totalRegistros={totalRegistros}
              />
            </div>

            <div className="lg:col-span-8 md:col-span-7 md:space-y-6">
              {/* Franja con la marca ADAMIA: logo y colores de marca, sin nombre de la empresa.
                  (21/11/2026) En la app del iPhone la hora y la batería del sistema quedaban encima: deja el espacio de la
                  muesca (safe area) y se queda fija arriba al desplazar. */}
              <div className="md:hidden sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
                <span className="flex min-w-0 items-center gap-2">
                  {dataUser && (
                    <button type="button" onClick={() => setMenuMovil((v) => !v)} aria-expanded={menuMovil} aria-label="Menú"
                      className="-ml-1 grid size-9 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-slate-100">
                      <Menu className="size-5" aria-hidden="true" />
                    </button>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/assets/adamia-logo-reloj.png" alt="ADAMIA" width={600} height={159} className="h-7 w-auto" />
                </span>
                {offline && <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Necesitas conexión para checar</span>}
                <span onClick={tocarHora} className="shrink-0 select-none text-brand text-lg font-bold tabular-nums ">{horaCorta}</span>
              </div>
              {menuMovil && dataUser && (
                <div className="md:hidden border-b border-slate-200 bg-white px-3 py-3 space-y-2">
                  {modoEmpleado && <Link href="/empleado/panel/inicio" className="flex min-h-11 items-center font-semibold text-brand">← Volver a mi inicio</Link>}
                  <ClockNavigation companyId={idEmpresa} companySlug={companySlug} />
                </div>
              )}

              <div id="reloj-barra-movil" className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-3 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
              {ajustesCamara && metodo === "facial" && (
                <label className="mb-2 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-lg">
                  <span>
                    <span className="block font-semibold text-slate-800">Cámara siempre encendida</span>
                    <span className="block text-xs text-slate-500">{camaraFija ? "Reloj fijo: queda lista para la siguiente persona" : "Se apaga al checar"}</span>
                  </span>
                  <input type="checkbox" role="switch" className="peer sr-only" checked={camaraFija} onChange={cambiarCamaraFija} />
                  <span aria-hidden="true" className="relative h-6 w-11 shrink-0 rounded-full bg-slate-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-brand peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-brand" />
                </label>
              )}
              <div className="flex items-center gap-2">
              <div className="flex flex-1 rounded-xl bg-slate-100 p-1">
                {[
                  { id: "facial", icon: ScanEye, label: "Rostro" },
                  { id: "codigo", icon: Keyboard, label: "Código" },
                  { id: "qr", icon: QrCode, label: "QR" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    disabled={offline && tab.id === 'facial'}
                    onClick={() => {
                      setMetodo(tab.id);
                      if (tab.id === "facial") abrirCamara();
                      if (tab.id === "qr") {
                        setMostrarCamara(false);
                        setMostrarQR(false);
                      }
                      if (tab.id === "codigo") {
                        setMostrarCamara(false);
                        setMostrarQR(false);
                      }
                    }}
                    className={`flex-1 flex min-h-11 items-center justify-center gap-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      metodo === tab.id
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <tab.icon
                      className={`w-5 h-5 ${
                        metodo === tab.id ? "text-brand" : ""
                      }`}
                    />
                    <span className="text-xs font-semibold">
                      {tab.label}
                    </span>
                  </button>
                ))}
              </div>
              <BotonVoyAComer variante="barra" activo={Boolean(voyAComer)} segundos={segundosComer} onCambiar={cambiarVoyAComer} disabled={offline} />
              {metodo === "facial" && (
                <button type="button" onClick={() => setAjustesCamara((v) => !v)} aria-expanded={ajustesCamara}
                  aria-label="Ajustes de la cámara" title="Cámara siempre encendida"
                  className={`grid size-11 shrink-0 place-items-center rounded-xl border ${ajustesCamara ? "border-brand/40 bg-brand/10 text-brand" : "border-slate-200 text-brand"}`}>
                  <Camera className="size-5" aria-hidden="true" />
                </button>
              )}
              </div>
              </div>

              {metodo === "facial" && (
                <label className="mb-3 hidden md:flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm">
                  <span>
                    <span className="block font-semibold text-slate-800">Cámara siempre encendida</span>
                    <span className="block text-xs text-slate-500">
                      {camaraFija ? "Reloj fijo: queda lista para la siguiente persona" : "Se apaga al checar"}
                    </span>
                  </span>
                  <input type="checkbox" role="switch" className="peer sr-only" checked={camaraFija} onChange={cambiarCamaraFija} />
                  <span aria-hidden="true" className="relative h-6 w-11 shrink-0 rounded-full bg-slate-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-blue-600 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400" />
                </label>
              )}

              <div ref={areaRef} style={altoArea ? { height: altoArea } : undefined}
                className="relative overflow-y-auto md:min-h-75 md:overflow-visible">
                {/* En escritorio, dentro del video (debajo del encabezado del panel de rostro). */}
                <AvisoVoyAComer activo={Boolean(voyAComer)} segundos={segundosComer} posicion="top-3 md:top-24" />
                {!offline && (metodo === "facial" || !isMobile) && (
                  <div
                    className={
                      metodo === "facial"
                        ? "block h-full md:h-auto animate-in fade-in duration-500"
                        : "hidden md:block"
                    }
                  >
                    {panelRostro}
                  </div>
                )}

                {metodo === "qr" && (
                  <div className="block md:hidden m-3 bg-white rounded-3xl shadow-sm border border-slate-100 p-6 animate-in fade-in duration-300">
                    <div className="text-center mb-8">
                      <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-blue-100">
                        <QrCode className="w-10 h-10 text-blue-600" />
                      </div>
                      <h2 className="font-black text-2xl text-slate-800">
                        Escaneo de QR
                      </h2>
                      <p className="text-slate-500 text-sm font-medium mt-1">
                        Presiona el botón para activar la cámara
                      </p>
                    </div>

                    <Button
                      onClick={handleOpenQR}
                      disabled={registrando}
                      className="w-full py-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-xl shadow-blue-100 border-none transition-all flex items-center justify-center gap-3"
                    >
                      <ScanEye className="w-6 h-6" />
                      {registrando ? "ESPERE..." : "ABRIR ESCÁNER"}
                    </Button>
                  </div>
                )}

                {metodo === "codigo" && (
                  <div className="block md:hidden m-3 bg-white rounded-3xl shadow-sm border border-slate-100 p-6 animate-in fade-in duration-300">
                    <div className="text-center mb-8">
                      <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-blue-100">
                        <Keyboard className="w-10 h-10 text-blue-600" />
                      </div>
                      <h2 className="font-black text-2xl text-slate-800">
                        Check por código
                      </h2>
                      <p className="text-slate-500 text-sm font-medium mt-1">
                        Registra tu entrada o salida
                      </p>
                    </div>
                    {ubicacionGPS && <p className="text-sm text-slate-600" role="status">Última lectura: precisión ±{Math.ceil(ubicacionGPS.accuracy)} m. Si es aproximada, usa un celular con ubicación precisa.</p>}
                    <EmployeeInput
                      codigo={codigoEmpleado}
                      setCodigo={setCodigoEmpleado}
                      handleRegistrar={registrarMovimiento}
                      registrando={registrando}
                      enqueueSnackbar={enqueueSnackbar}
                    />
                  </div>
                )}
              </div>

              <div className="hidden md:block mt-6">
                <RecordsTable
                  movimientos={movimientos}
                  isLoading={isLoading}
                  formatearHora={formatearHora}
                />
              </div>
            </div>
          </div>
        </div>
        )}
        {mostrarQR && (
          <QRScanner
            onScan={handleQRScan}
            onClose={() => {
              setMostrarQR(false);
            }}
          />
        )}

        {tecladoCara && <TecladoCodigoCara motivo={tecladoCara.motivo} onContinuar={continuarCodigoCara} onCancelar={cerrarTecladoCara} />}
        {pregunta && (
          <div className={kiosco ? "fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" : "fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-100 md:inset-0 md:flex md:items-center md:justify-center md:bg-slate-900/40 md:p-4"}>
            <div role="alertdialog" aria-labelledby="pregunta-repetida" className={`mx-auto w-full rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-200 ${kiosco ? "max-w-md p-6" : "max-w-sm p-4"}`}>
              <div className="flex items-start gap-3">
                <span className={`grid shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 ${kiosco ? "size-12" : "size-10"}`}><Clock4 className="size-6" aria-hidden="true" /></span>
                <div className="min-w-0">
                  <p className={`font-bold text-slate-900 ${kiosco ? "text-xl" : "text-base"}`}>{pregunta.empleado?.nombre} {pregunta.empleado?.apellido_paterno}</p>
                  <p id="pregunta-repetida" className={`mt-1 text-slate-700 ${kiosco ? "text-base" : "text-sm"}`}>{String(pregunta.pregunta).replace(/\.?$/, ".")} ¿Registrar otra vez?</p>
                  <p className="mt-1 text-xs text-slate-500">Solo si de verdad sales o regresas; si fue un doble toque, no hace falta.</p>
                </div>
              </div>
              <div className={`grid grid-cols-2 gap-2 ${kiosco ? "mt-5" : "mt-3"}`}>
                <Button type="button" variant="outline" onClick={() => setPregunta(null)} disabled={repitiendo}
                  className={`rounded-xl font-semibold text-slate-700 ${kiosco ? "h-12 text-base" : "h-11"}`}>No, está bien</Button>
                <Button type="button" onClick={registrarDeTodosModos} disabled={repitiendo}
                  className={`rounded-xl font-semibold ${kiosco ? "h-12 text-base" : "h-11"}`}>{repitiendo ? "Registrando…" : "Sí, registrar"}</Button>
              </div>
            </div>
          </div>
        )}

        {popupInfo && !kiosco && (() => {
          const tono = popupInfo.pending ? (popupInfo.errorServidor ? "amber" : "blue") : popupInfo.success ? "green" : "red";
          const colores = { amber: "text-amber-700 bg-amber-50", blue: "text-blue-700 bg-blue-50", green: "text-green-700 bg-green-50", red: "text-red-700 bg-red-50" }[tono];
          const estado = popupInfo.pending ? (popupInfo.errorServidor ? "Error del servidor · avisa a RH" : "Pendiente de subir") : popupInfo.success ? (popupInfo.movimiento || "Registrada") : "No se registró · avisa a RH";
          const iniciales = String(popupInfo.nombre || "").trim().split(/\s+/).slice(0, 2).map((p) => p[0] || "").join("").toUpperCase();
          // Celular: tarjeta sobre la cámara, sin tapar la pantalla (maqueta aprobada).
          return (
            <div role="status" aria-live="polite" className="md:hidden fixed inset-x-3 z-100 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] flex items-center gap-3 rounded-2xl bg-white p-3 shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-200">
              {popupInfo.foto_perfil && !popupInfo.foto_perfil.endsWith("/assets/user.png")
                ? <img src={popupInfo.foto_perfil} alt="" className="size-12 shrink-0 rounded-full object-cover" />
                : <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand font-bold text-white">{iniciales || "?"}</span>}
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-slate-900">{popupInfo.nombre}</p>
                <p className={`mt-0.5 inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold ${colores}`}>
                  {popupInfo.pending ? <Clock4 className="size-3.5 shrink-0" /> : popupInfo.success ? <CheckCircle className="size-3.5 shrink-0" /> : <XCircle className="size-3.5 shrink-0" />}
                  <span className="truncate">{estado}</span>
                </p>
                {popupInfo.pending && popupInfo.motivo && <p className="mt-1 text-xs text-amber-700">{popupInfo.motivo}</p>}
                {popupInfo.volviendo && <p className="mt-1 text-xs text-slate-500">Regresando a tu inicio…</p>}
              </div>
              <span className="shrink-0 text-lg font-bold tabular-nums text-slate-900">{horaCorta}</span>
            </div>
          );
        })()}

        {popupInfo && <ResultadoChecada info={popupInfo} duracion={popupInfo.duracion} className={kiosco ? "flex" : "hidden md:flex"} />}
        <AvisoKiosco aviso={kiosco ? avisoKiosco : null} onCerrar={() => { clearTimeout(temporizadorAviso.current); setAvisoKiosco(null); }} />

        {mostrarModalTurno && (
          <div className="fixed inset-0 z-110 flex items-end md:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
            <div role="dialog" aria-modal="true" aria-labelledby="titulo-turno" className="w-full max-w-md rounded-t-3xl md:rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" />
              {/* Opciones que manda el servidor: «Salir a comer» / «Registrar salida» o las de cierre manual. */}
              <div className="flex items-start gap-3">
                <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${pendiente?.opciones?.includes("salida_comida") ? "bg-amber-50 text-amber-600" : "bg-brand/10 text-brand"}`}>
                  {pendiente?.opciones?.includes("salida_comida") ? <Utensils className="size-6" aria-hidden="true" /> : <DoorOpen className="size-6" aria-hidden="true" />}
                </span>
                <div className="min-w-0">
                  <h2 id="titulo-turno" className="text-2xl font-bold tracking-tight text-slate-900">
                    {pendiente?.opciones?.includes("salida_comida") ? "¿Sales a comer?" : "Turno abierto"}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {pendiente?.opciones?.includes("salida_comida")
                      ? "Elige si sales a comer (tu jornada sigue abierta) o si terminas tu jornada."
                      : "Detectamos que ya tienes un turno en proceso. ¿Cuál es el siguiente paso?"}
                  </p>
                </div>
              </div>
              {/* (26/11/2026) «Voy a comer» de quien ya comió (cierre manual): el aviso del servidor y sus opciones. */}
              {pendiente?.aviso === "comida_ya_registrada" && (
                <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800" data-aviso-comida>Ya registraste tu comida hoy.</p>
              )}
              <div className="mt-6 flex flex-col gap-2.5">
                {(pendiente?.opciones?.length ? pendiente.opciones : OPCIONES_SIN_DATOS).map((opcion) => {
                  const estilo = {
                    salida_comida: "bg-amber-400 text-amber-950 hover:bg-amber-500",
                    salida: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
                    salida_temporal: "bg-slate-100 text-slate-900 hover:bg-slate-200",
                    cerrar_turno: "bg-red-600 text-white hover:bg-red-700",
                  }[opcion] || "bg-slate-100 text-slate-900";
                  const Icono = { salida_comida: Utensils, salida: LogOut, salida_temporal: DoorOpen, cerrar_turno: LogOut }[opcion];
                  const texto = { salida_comida: "Salir a comer", salida: "Registrar salida", salida_temporal: "Salida temporal", cerrar_turno: "Cerrar turno" }[opcion] || opcion;
                  return (
                    <Button key={opcion} onClick={() => registrarConAccion(opcion)} disabled={registrando}
                      className={`h-14 w-full rounded-xl text-base font-semibold shadow-none transition-colors disabled:opacity-50 ${estilo}`}>
                      {Icono && !registrando && <Icono className="size-5" aria-hidden="true" />}
                      {registrando ? "Procesando..." : texto}
                    </Button>
                  );
                })}

                <Button
                  onClick={() => {
                    setMostrarModalTurno(false);
                    setPendiente(null);
                  }}
                  disabled={registrando}
                  variant="ghost"
                  className="h-12 w-full rounded-xl text-base font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-30"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>


      {registrando && !mostrarQR && (
        <div className="fixed inset-0 z-200 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-[2px]">
          <div role="status" className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-2xl">
            <span className="size-10 shrink-0 animate-spin rounded-full border-4 border-brand border-t-transparent" aria-hidden="true" />
            <div>
              <p className="text-lg font-semibold text-slate-900">Registrando tu checada…</p>
              <p className="text-sm text-slate-500">Obteniendo ubicación y validando</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
