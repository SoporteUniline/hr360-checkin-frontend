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
} from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import ErrorPage from "@/components/ErrorPage";
import { useSnackbar } from "notistack";
import FacialRecognitionPanel from "./FacialRecognitionPanel";
import { loadBrowserFaceApi } from "@/lib/faceapi-browser";
import { diagnosticoActivo, fijarDiagnostico } from "@/lib/diagnostico-reloj";
import ClockDisplay from "./Clock/ClockDisplay";
import EmployeeInput from "./Clock/EmployeeInput";
import StatsCards from "./Clock/StatsCards";
import RecordsTable from "./Clock/RecordsTable";
import { useGPS } from "@/hooks/Capacitor/useGPS";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useAuth } from "@/context/AuthContext";
import QRScanner from "./QRScanner";
import { Button } from "./ui/button";
import { initializeClock, registerClockMovement, localFaceStatus } from '@/lib/offline-clock';
import ClockNavigation from './Clock/ClockNavigation';
import { hora12 } from "@/lib/hora12.mjs";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function RelojChecador({
  idEmpresa,
  modoEmpleado = false,
  idEmpleado = null,
  companySlug = null,
  nombreEmpresa = "",
}) {
  const [ubicacionGPS, setUbicacionGPS] = useState(null);
  const [metodo, setMetodo] = useState("facial");
  // Celular (maqueta aprobada 19/11/2026): la cámara ocupa el alto que queda entre la franja de
  // arriba y la barra de abajo. Se mide porque arriba puede haber navegación (reloj del empleado).
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
  const [localFacesReady, setLocalFacesReady] = useState(false);
  useEffect(() => {
    const update = event => setOffline(event.type === 'online' ? false : event.detail?.offline ?? (!navigator.onLine || window.__adamiaOffline === true));
    update({});
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    window.addEventListener('adamia-network', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); window.removeEventListener('adamia-network', update); };
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
  // Candado de 5 min (19/11/2026): «Acabas de registrar tu salida a las 4:49 p.m. ¿Registrar otra vez?».
  const [pregunta, setPregunta] = useState(null);
  const [repitiendo, setRepitiendo] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const { getCurrentLocation, loading: loadingGPS } = useGPS();
  // All methods identify the person checking in within this company. The
  // signed-in employee only controls which history is visible on this page.
  const submitMovement = payload => registerClockMovement(payload, { company: idEmpresa, employee: null, slug: companySlug });
  useEffect(() => {
    let active = true;
    const context = { company: idEmpresa, slug: companySlug };
    const refresh = () => { void localFaceStatus(context).then(dataset => { if (active) setLocalFacesReady(!!dataset?.employees?.length); }).catch(() => { if (active) setLocalFacesReady(false); }); };
    void initializeClock(context).catch(() => {}).finally(refresh);
    refresh();
    window.addEventListener('adamia-face-ready', refresh);
    return () => { active = false; window.removeEventListener('adamia-face-ready', refresh); };
  }, [idEmpresa, idEmpleado, modoEmpleado, companySlug, dataUser?.tipo_usuario]);

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
    if (offline && !localFacesReady) {
      setMostrarCamara(false);
      if (metodo === 'facial') setMetodo('codigo');
    }
    else if (metodo !== "facial") setMostrarCamara(false);
  }, [metodo, offline, localFacesReady]);

  useEffect(() => {
    setCodigoEmpleado("");
  }, [metodo]);

  // Tarjeta del resultado. Un solo temporizador: con el reloj fijo, el aviso de la persona siguiente ya no
  // se cierra antes de tiempo por el temporizador de la anterior. Con motivo de «pendiente», más tiempo.
  const temporizadorPopup = useRef(null);
  const mostrarResultado = (data) => {
    clearTimeout(temporizadorPopup.current);
    setPopupInfo({
      nombre: `${data.empleado?.nombre ?? ""} ${data.empleado?.apellido_paterno ?? ""}`.trim(),
      foto_perfil: data.empleado?.foto_perfil || "/assets/user.png",
      movimiento: data.movimiento || data.message,
      pending: Boolean(data.pending),
      motivo: data.motivo || "",
      errorServidor: Boolean(data.errorServidor),
      localValidated: Boolean(data.local_validated),
      success: !data.pending,
    });
    temporizadorPopup.current = setTimeout(() => setPopupInfo(null), data.pending && data.motivo ? 8000 : 2500);
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
      if (!navigator.onLine) {
        const pos = await getCurrentLocation();
        setUbicacionGPS(pos);
        if (pos) Object.assign(payload, {latitud_actual: pos.lat, longitud_actual: pos.lng,
          precision_metros: pos.accuracy, ubicacion_timestamp: pos.timestamp, captured_at: new Date().toISOString()});
      }
      let response;
      try {
        response = await submitMovement(payload);
      } catch (err) {
        if (err.response?.data?.error !== "Faltan coordenadas de ubicación") throw err;
        const pos = await getCurrentLocation();
        setUbicacionGPS(pos);
        if (!pos) {
          enqueueSnackbar("Permite el acceso a ubicación y activa el GPS para checar.", {variant: "error"});
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
        setPendiente({ tipo: "codigo", codigo, offline_event: data.offline_event });
        setMostrarModalTurno(true);
        setRegistrando(false);
        return;
      }

      mostrarResultado(data);
      setCodigoEmpleado("");
    } catch (err) {
      setCodigoEmpleado("");
      enqueueSnackbar(err.response?.data?.error || err.message || "Error al registrar", {
        variant: "error",
      });
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
        offline_event: pendiente.offline_event,
        ...(pendiente.repetir ? { repetir: true } : {}),
      };

      const body = pendiente.tipo === "facial" ? {...payload, descriptor_facial: pendiente.descriptor_facial} : {...payload, codigo: pendiente.codigo};
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
      enqueueSnackbar(error.response?.data?.error || error.message || "Error al registrar", {
        variant: "error",
      });
    } finally {
      setRegistrando(false);
    }
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
        offline_event: data.offline_event,
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
        setPendiente({ tipo: codigo ? "codigo" : "facial", codigo, descriptor_facial, offline_event: data.offline_event, repetir: true });
        setMostrarModalTurno(true);
      } else {
        mostrarResultado(data);
      }
    } catch (err) {
      setPregunta(null);
      enqueueSnackbar(err.response?.data?.error || err.message || "No se pudo registrar", { variant: "error" });
    } finally {
      setRepitiendo(false);
    }
  };

  const abrirCamara = () => {
    if (offline && !localFacesReady) return;
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

      try {
        setSubscriptionLoading(true);
        globalThis.__adamiaDiag?.marca("suscripcion_inicio");

        const response = await fetch(
          `/api/empresas/check-subscription/${idEmpresa}`,
          { cache: "no-store" },
        );

        const data = await response.json();

        setSubscriptionActive(Boolean(data.hasActivePlan));
        globalThis.__adamiaDiag?.marca("suscripcion_fin", { activa: Boolean(data.hasActivePlan) });
      } catch (error) {
        console.error("Error validando suscripción:", error);
        globalThis.__adamiaDiag?.marca("suscripcion_fin", { error: true });
        try {
          const profile = await initializeClock({ company: idEmpresa, slug: companySlug });
          setSubscriptionActive(Date.now() - Date.parse(profile.prepared_at) < 7 * 86400000);
        } catch { setSubscriptionActive(false); }
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

  // 12 horas con a.m./p.m. (19/11/2026): «4:49 p.m.».
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

  return (
    <>
      <main className="bg-slate-50 md:min-h-screen md:p-4">
        <div className="mx-auto max-w-7xl md:space-y-6">
          <div className="hidden md:block"><ClockNavigation companyId={idEmpresa} companySlug={companySlug} /></div>
          <div className="hidden md:block rounded-xl border border-blue-100 bg-linear-to-r from-indigo-50 to-blue-50 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-600 p-2.5">
                <Clock4 className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-slate-900">
                  Reloj checador
                </h1>
                <p className="text-sm text-slate-600">
                  Registro de entradas y salidas con validación por código, QR y
                  reconocimiento facial.
                </p>
                <p role="status" className="mt-2 inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{offline ? localFacesReady ? 'Sin conexión · Reconocimiento local listo · Pendiente de subir' : 'Sin conexión · Código / QR · Rostro sin preparar' : localFacesReady ? 'Reconocimiento offline preparado en este dispositivo' : 'Los rostros de la empresa se descargan automáticamente con internet, sin iniciar sesión.'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 md:gap-6">
            <div className="hidden md:block lg:col-span-4 md:col-span-5 space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <ClockDisplay
                  horaActual={horaActual}
                  fechaActual={fechaActual}
                />
                {ubicacionGPS && <p className="text-sm text-slate-600" role="status">Última lectura: precisión ±{Math.ceil(ubicacionGPS.accuracy)} m. Usa ubicación precisa para checar.</p>}
                <EmployeeInput
                  codigo={codigoEmpleado}
                  setCodigo={setCodigoEmpleado}
                  handleRegistrar={registrarMovimiento}
                  handleOpenQR={handleOpenQR}
                  registrando={registrando || loadingGPS}
                  enqueueSnackbar={enqueueSnackbar}
                />
              </div>
              <StatsCards
                empleadosActivos={empleadosActivos}
                totalRegistros={totalRegistros}
              />
            </div>

            <div className="lg:col-span-8 md:col-span-7 md:space-y-6">
              {/* Franja con la marca ADAMIA (19/11/2026): logo y colores de marca, sin nombre de la empresa. */}
              <div className="md:hidden flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2">
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
                {offline && <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">{localFacesReady ? "Sin conexión · rostro listo" : "Sin conexión"}</span>}
                <span onClick={tocarHora} className="shrink-0 select-none bg-linear-to-r from-brand to-brand-accent bg-clip-text text-lg font-bold tabular-nums text-transparent">{horaCorta}</span>
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
                    disabled={offline && !localFacesReady && tab.id === 'facial'}
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
                {(!offline || localFacesReady) && (metodo === "facial" || !isMobile) && (
                  <div
                    className={
                      metodo === "facial"
                        ? "block h-full md:h-auto animate-in fade-in duration-500"
                        : "hidden md:block"
                    }
                  >
                    <FacialRecognitionPanel
                      isOpen={mostrarCamara}
                      onOpen={() => setMostrarCamara(true)}
                      onClose={() => setMostrarCamara(false)}
                      onSuccess={handleFacialResponse}
                      idEmpresa={idEmpresa}
                      submitMovement={submitMovement}
                      handleOpenFacialModal={() => setMostrarCamara(false)}
                      continuo={camaraFija}
                      pantallaCompleta={isMobile}
                      pausado={Boolean(pregunta)}
                    />
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
        {mostrarQR && (
          <QRScanner
            onScan={handleQRScan}
            onClose={() => {
              setMostrarQR(false);
            }}
          />
        )}

        {pregunta && (
          <div className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-100 md:inset-0 md:flex md:items-center md:justify-center md:bg-slate-900/40 md:p-4">
            <div role="alertdialog" aria-labelledby="pregunta-repetida" className="mx-auto w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-200">
              <p className="text-base font-bold text-slate-900">{pregunta.empleado?.nombre} {pregunta.empleado?.apellido_paterno}</p>
              <p id="pregunta-repetida" className="mt-1 text-sm text-slate-700">{String(pregunta.pregunta).replace(/\.?$/, ".")} ¿Registrar otra vez?</p>
              <p className="mt-1 text-xs text-slate-500">Solo si de verdad sales o regresas; si fue un doble toque, no hace falta.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setPregunta(null)} disabled={repitiendo}
                  className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">No, está bien</button>
                <button type="button" onClick={registrarDeTodosModos} disabled={repitiendo}
                  className="min-h-11 rounded-xl bg-brand px-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">{repitiendo ? "Registrando…" : "Sí, registrar"}</button>
              </div>
            </div>
          </div>
        )}

        {popupInfo && (() => {
          const tono = popupInfo.pending ? (popupInfo.errorServidor ? "amber" : "blue") : popupInfo.success ? "green" : "red";
          const colores = { amber: "text-amber-700 bg-amber-50", blue: "text-blue-700 bg-blue-50", green: "text-green-700 bg-green-50", red: "text-red-700 bg-red-50" }[tono];
          const estado = popupInfo.pending ? (popupInfo.errorServidor ? "Error del servidor · avisa a RH" : "Pendiente de subir") : popupInfo.success ? (popupInfo.movimiento || "Registrada") : "No se registró · avisa a RH";
          const iniciales = String(popupInfo.nombre || "").trim().split(/\s+/).slice(0, 2).map((p) => p[0] || "").join("").toUpperCase();
          // Celular: tarjeta sobre la cámara, sin tapar la pantalla (maqueta aprobada).
          return (
            <div role="status" aria-live="polite" className="md:hidden fixed inset-x-3 z-100 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] flex items-center gap-3 rounded-2xl bg-white p-3 shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-200">
              {popupInfo.foto_perfil && !popupInfo.foto_perfil.endsWith("/assets/user.png")
                ? <img src={popupInfo.foto_perfil} alt="" className="size-12 shrink-0 rounded-full object-cover" />
                : <span className="grid size-12 shrink-0 place-items-center rounded-full bg-linear-to-br from-brand to-brand-accent font-bold text-white">{iniciales || "?"}</span>}
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-slate-900">{popupInfo.nombre}</p>
                <p className={`mt-0.5 inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold ${colores}`}>
                  {popupInfo.pending ? <Clock4 className="size-3.5 shrink-0" /> : popupInfo.success ? <CheckCircle className="size-3.5 shrink-0" /> : <XCircle className="size-3.5 shrink-0" />}
                  <span className="truncate">{estado}</span>
                </p>
                {popupInfo.pending && popupInfo.motivo && <p className="mt-1 text-xs text-amber-700">{popupInfo.motivo}</p>}
              </div>
              <span className="shrink-0 text-lg font-bold tabular-nums text-slate-900">{horaCorta}</span>
            </div>
          );
        })()}

        {popupInfo && (
          <div className="fixed inset-0 z-100 hidden md:flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
            <div className="bg-white rounded-[3rem] shadow-2xl p-10 text-center max-w-sm w-full transform animate-bounce-in border border-slate-100">
              <div className="relative mb-6">
                <img
                  src={popupInfo.foto_perfil}
                  className="w-32 h-32 object-cover rounded-full mx-auto border-8 border-slate-50 shadow-xl"
                  alt="perfil"
                />
                <div
                  className={`absolute bottom-0 right-1/4 w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-4 border-white ${
                    popupInfo.pending ? (popupInfo.errorServidor ? "bg-amber-500" : "bg-blue-500") : popupInfo.success ? "bg-green-500" : "bg-red-500"
                  }`}
                >
                  {popupInfo.pending ? (
                    <Clock4 className="w-5 h-5 text-white" />
                  ) : popupInfo.success ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <XCircle className="w-5 h-5 text-white" />
                  )}
                </div>
              </div>
              <h3 className="text-3xl font-black text-slate-800 mb-2 tracking-tighter">
                {popupInfo.nombre}
              </h3>
              <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mb-6">
                {popupInfo.movimiento}
              </p>
              {popupInfo.pending && popupInfo.motivo && (
                <p className="-mt-3 mb-5 text-sm font-medium text-amber-700">{popupInfo.motivo}</p>
              )}
              <div
                className={`py-3 px-6 rounded-2xl inline-flex items-center gap-2 ${
                  popupInfo.pending
                    ? popupInfo.errorServidor ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-800"
                    : popupInfo.success
                    ? "bg-green-50 text-green-600"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {popupInfo.pending ? <Clock4 className="w-5 h-5" /> : popupInfo.success ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <span className="font-black text-sm uppercase">{popupInfo.pending ? (popupInfo.errorServidor ? 'Error del servidor · avisa a RH' : 'Pendiente de subir') : popupInfo.success ? '¡Éxito!' : 'No se registró · avisa a RH'}</span>
              </div>
            </div>
          </div>
        )}

        {mostrarModalTurno && (
          <div className="fixed inset-0 z-110 flex items-end md:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl p-8 w-full max-w-sm animate-in slide-in-from-bottom-10 duration-300">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 md:hidden" />
              <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">
                Turno abierto
              </h2>
              <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
                Detectamos que ya tienes un turno en proceso. ¿Cuál es el
                siguiente paso?
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => registrarConAccion("salida_temporal")}
                  disabled={registrando}
                  className="w-full py-7 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold border-none transition-all disabled:opacity-50"
                >
                  {registrando ? "Procesando..." : "Salida temporal"}
                </Button>

                <Button
                  onClick={() => registrarConAccion("cerrar_turno")}
                  disabled={registrando}
                  className="w-full py-7 rounded-2xl bg-red-500 text-white hover:bg-red-600 font-bold shadow-lg shadow-red-200 transition-all border-none disabled:bg-red-300"
                >
                  {registrando ? "Cerrando..." : "Cerrar turno"}
                </Button>

                <Button
                  onClick={() => {
                    setMostrarModalTurno(false);
                    setPendiente(null);
                  }}
                  disabled={registrando}
                  variant="ghost"
                  className="w-full py-4 text-slate-400 font-bold hover:text-slate-600 disabled:opacity-30"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        @keyframes bounce-in {
          0% {
            transform: scale(0.8) translateY(20px);
            opacity: 0;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
      `}</style>

      {registrando && !mostrarQR && (
        <div className="fixed inset-0 z-200 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center">
              <p className="font-black text-slate-800 text-lg uppercase tracking-tighter">
                Procesando Registro
              </p>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                Obteniendo ubicación y validando...
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
