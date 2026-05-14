"use client";
import { useEffect, useState } from "react";
import {
  CheckCircle,
  Keyboard,
  QrCode,
  ScanEye,
  XCircle,
  Clock4,
  AlertTriangle,
} from "lucide-react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import ErrorPage from "@/components/ErrorPage";
import { useSnackbar } from "notistack";
import axiosInstance from "@/lib/axios";
import FacialRecognitionPanel from "./FacialRecognitionPanel";
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

dayjs.extend(utc);
dayjs.extend(timezone);

export default function RelojChecador({
  idEmpresa,
  modoEmpleado = false,
  idEmpleado = null,
}) {
  const [metodo, setMetodo] = useState("facial");
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
  const [registrando, setRegistrando] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const { getCurrentLocation, loading: loadingGPS, error: gpsError } = useGPS();

  const formatearHora = (fechaString) => {
    if (!fechaString) return "-";
    return dayjs
      .tz(fechaString, DB_TIMEZONE)
      .tz(EMPRESA_TIMEZONE)
      .format("HH:mm:ss");
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
      setHoraActual(ahora.format("HH:mm:ss"));
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
    else setMostrarCamara(true);
  }, [metodo]);

  useEffect(() => {
    setCodigoEmpleado("");
  }, [metodo]);

  const registrarMovimiento = async (codigoManual) => {
    if (gpsError) {
      enqueueSnackbar(gpsError, { variant: "error" });
      return;
    }
    if (registrando) return;
    setRegistrando(true);

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
      let latitud_actual = null;
      let longitud_actual = null;
      const pos = await getCurrentLocation();
      if (pos) {
        latitud_actual = pos.lat;
        longitud_actual = pos.lng;
      } else {
        enqueueSnackbar("No se pudo obtener la ubicación.", {
          variant: "error",
        });
        setRegistrando(false);
        return;
      }

      const { data } = await axiosInstance.post(`/checador/reloj/registrar`, {
        codigo,
        id_empresa: idEmpresa,
        latitud_actual,
        longitud_actual,
      });

      if (data.requiereDecision) {
        setPendiente({ tipo: "codigo", codigo });
        setMostrarModalTurno(true);
        setRegistrando(false);
        return;
      }

      setPopupInfo({
        nombre: `${data.empleado.nombre} ${data.empleado.apellido_paterno}`,
        foto_perfil: data.empleado.foto_perfil || "/assets/user.png",
        movimiento: data.movimiento || data.message,
        success: true,
      });

      setTimeout(() => setPopupInfo(null), 3000);
      // enqueueSnackbar("Registro realizado", { variant: "success" });
      setCodigoEmpleado("");
      mutate();
    } catch (err) {
      setCodigoEmpleado("");
      enqueueSnackbar(err.response?.data?.error || "Error al registrar", {
        variant: "error",
      });
    } finally {
      setRegistrando(false);
    }
  };

  const registrarConAccion = async (accion) => {
    if (!pendiente) return;
    try {
      setRegistrando(true);
      const pos = await getCurrentLocation();
      let dataResponse;
      const payload = {
        id_empresa: idEmpresa,
        accion,
        latitud_actual: pos?.lat,
        longitud_actual: pos?.lng,
      };

      if (pendiente.tipo === "facial") {
        const { data } = await axiosInstance.post(
          "/checador/reloj/registrar-facial",
          { ...payload, descriptor_facial: pendiente.descriptor_facial },
        );
        dataResponse = data;
      } else {
        const { data } = await axiosInstance.post("/checador/reloj/registrar", {
          ...payload,
          codigo: pendiente.codigo,
        });
        dataResponse = data;
      }

      setPopupInfo({
        nombre: `${dataResponse.empleado.nombre} ${dataResponse.empleado.apellido_paterno}`,
        foto_perfil: dataResponse.empleado.foto_perfil || "/assets/user.png",
        movimiento: dataResponse.movimiento || dataResponse.message,
        success: true,
      });
      setTimeout(() => setPopupInfo(null), 3000);
      setMostrarModalTurno(false);
      setPendiente(null);
      mutate();
      setCodigoEmpleado("");
    } catch (error) {
      enqueueSnackbar(error.response?.data?.error || "Error al registrar", {
        variant: "error",
      });
    } finally {
      setRegistrando(false);
    }
  };

  const handleFacialResponse = (data) => {
    if (data.requiereDecision) {
      setPendiente({
        tipo: "facial",
        descriptor_facial: data.descriptor_facial,
      });
      setMostrarModalTurno(true);
    } else {
      setPopupInfo({
        nombre: `${data.empleado.nombre} ${data.empleado.apellido_paterno}`,
        foto_perfil: data.empleado.foto_perfil || "/assets/user.png",
        movimiento: data.movimiento || data.message,
        success: true,
      });
      setTimeout(() => setPopupInfo(null), 3000);
      mutate();
    }
  };

  const abrirCamara = () => {
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

        const response = await fetch(
          `/api/empresas/check-subscription/${idEmpresa}`,
          { cache: "no-store" },
        );

        const data = await response.json();

        setSubscriptionActive(Boolean(data.hasActivePlan));
      } catch (error) {
        console.error("Error validando suscripción:", error);
        setSubscriptionActive(false);
      } finally {
        setSubscriptionLoading(false);
      }
    };

    validarSuscripcion();
  }, [idEmpresa, modoEmpleado]);

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

  if (error)
    return <ErrorPage message="No se pudieron cargar los registros." />;

  return (
    <>
      <main className="min-h-screen bg-[#F9FAFB] p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="bg-linear-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="bg-[#2563EB] p-2.5 rounded-lg">
                <Clock4 className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-gray-900">
                  Reloj checador
                </h1>
                <p className="text-sm text-gray-600">
                  Registro de entradas y salidas con validación por código, QR y
                  reconocimiento facial.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="hidden md:block lg:col-span-4 md:col-span-5 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
                <ClockDisplay
                  horaActual={horaActual}
                  fechaActual={fechaActual}
                />
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
              <div className="block md:hidden mb-6 text-center space-y-1">
                <h1 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Adamia - Sistema de Asistencia
                </h1>
                <div className="py-2">
                  <p className="text-6xl font-black text-slate-900 tracking-tighter antialiased">
                    {horaActual.split(":")[0]}:{horaActual.split(":")[1]}
                    <span className="text-2xl text-blue-500 font-medium ml-1">
                      {horaActual.split(":")[2]}
                    </span>
                  </p>
                  <p className="text-xs font-bold text-slate-500 uppercase mt-1 tracking-wider">
                    {fechaActual}
                  </p>
                </div>
              </div>

              <div className="flex md:hidden mb-8 bg-slate-200/60 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
                {[
                  { id: "qr", icon: QrCode, label: "QR" },
                  { id: "codigo", icon: Keyboard, label: "Código" },
                  { id: "facial", icon: ScanEye, label: "Rostro" },
                ].map((tab) => (
                  <button
                    key={tab.id}
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
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 ${
                      metodo === tab.id
                        ? "bg-white text-slate-900 shadow-md scale-[1.02]"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <tab.icon
                      className={`w-5 h-5 ${
                        metodo === tab.id ? "text-blue-600" : ""
                      }`}
                    />
                    <span className="text-[10px] font-black uppercase tracking-tight">
                      {tab.label}
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative min-h-75">
                {(metodo === "facial" || !isMobile) && (
                  <div
                    className={
                      metodo === "facial"
                        ? "block animate-in fade-in duration-500"
                        : "hidden md:block"
                    }
                  >
                    <FacialRecognitionPanel
                      isOpen={mostrarCamara}
                      onOpen={() => setMostrarCamara(true)}
                      onClose={() => setMostrarCamara(false)}
                      onSuccess={handleFacialResponse}
                      idEmpresa={idEmpresa}
                      handleOpenFacialModal={() => setMostrarCamara(false)}
                    />
                  </div>
                )}

                {metodo === "qr" && (
                  <div className="block md:hidden bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-8 animate-in zoom-in-95 fade-in duration-300">
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
                  <div className="block md:hidden bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-8 animate-in zoom-in-95 fade-in duration-300">
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

        {popupInfo && (
          <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
            <div className="bg-white rounded-[3rem] shadow-2xl p-10 text-center max-w-sm w-full transform animate-bounce-in border border-slate-100">
              <div className="relative mb-6">
                <img
                  src={popupInfo.foto_perfil}
                  className="w-32 h-32 object-cover rounded-full mx-auto border-8 border-slate-50 shadow-xl"
                  alt="perfil"
                />
                <div
                  className={`absolute bottom-0 right-1/4 w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-4 border-white ${
                    popupInfo.success ? "bg-green-500" : "bg-red-500"
                  }`}
                >
                  {popupInfo.success ? (
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
              <div
                className={`py-3 px-6 rounded-2xl inline-flex items-center gap-2 ${
                  popupInfo.success
                    ? "bg-green-50 text-green-600"
                    : "bg-red-50 text-red-600"
                }`}
              >
                <CheckCircle className="w-5 h-5" />
                <span className="font-black text-sm uppercase">¡Éxito!</span>
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
