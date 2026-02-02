"use client";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock4, AlertTriangle } from "lucide-react";
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
  const [mostrarModalTurno, setMostrarModalTurno] = useState(false);
  const [pendiente, setPendiente] = useState(null);

  const { dataUser } = useAuth();
  const DB_TIMEZONE = "America/Mexico_City";
  const USER_TIMEZONE = dataUser?.zona_horaria || "America/Mexico_City";
  const [mostrarQR, setMostrarQR] = useState(false);
  const [horaActual, setHoraActual] = useState("");
  const [fechaActual, setFechaActual] = useState("");
  const [codigoEmpleado, setCodigoEmpleado] = useState("");
  const [mostrarCamara, setMostrarCamara] = useState(true);
  const { enqueueSnackbar } = useSnackbar();
  const [popupInfo, setPopupInfo] = useState(null);
  const [registrando, setRegistrando] = useState(false);
  const { getCurrentLocation, loading: loadingGPS, error: gpsError } = useGPS();

  const formatearHora = (fechaString) => {
    if (!fechaString) return "-";
    return dayjs
      .tz(fechaString, DB_TIMEZONE)
      .tz(USER_TIMEZONE)
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
  );

  const movimientos = registrosData?.registrosHoy || [];
  const movimientosParaTabla = movimientos.slice(0, 10);
  const empleadosActivos = registrosData?.activosHoy || 0;
  const totalRegistros = registrosData?.totalRegistrosHoy || 0;

  useEffect(() => {
    const actualizarHora = () => {
      const ahora = dayjs().tz(USER_TIMEZONE);

      setHoraActual(ahora.format("HH:mm:ss"));

      const fechaFormateada = ahora.format("dddd, D [de] MMMM [de] YYYY");

      const [dia, ...resto] = fechaFormateada.split(", ");
      const diaCapitalizado = dia.charAt(0).toUpperCase() + dia.slice(1);

      setFechaActual([diaCapitalizado, ...resto].join(", "));
    };

    actualizarHora();
    const intervalo = setInterval(actualizarHora, 1000);

    return () => clearInterval(intervalo);
  }, [USER_TIMEZONE]);

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
      if (!idEmpresa) {
        enqueueSnackbar("Empresa no definida...", { variant: "error" });
        setRegistrando(false);
        return;
      }

      let latitud_actual = null;
      let longitud_actual = null;

      const pos = await getCurrentLocation();
      if (pos) {
        latitud_actual = pos.lat;
        longitud_actual = pos.lng;
      } else {
        enqueueSnackbar("No se pudo obtener la ubicación. Activa el GPS.", {
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

      const { message, empleado, movimiento } = data;

      setPopupInfo({
        nombre: `${empleado.nombre} ${empleado.apellido_paterno}`,
        foto_perfil: empleado.foto_perfil || "/assets/user.png",
        movimiento: movimiento || message,
        success: true,
      });

      setTimeout(() => setPopupInfo(null), 3000);
      enqueueSnackbar("Registro realizado", { variant: "success" });
      setCodigoEmpleado("");
      mutate();
    } catch (err) {
      setCodigoEmpleado("");
      if (err.response?.data?.error) {
        enqueueSnackbar(err.response.data.error, { variant: "error" });
      } else {
        enqueueSnackbar("Error desconocido al registrar", { variant: "error" });
      }
    } finally {
      setRegistrando(false);
    }
  };

  const registrarConAccion = async (accion) => {
    if (!pendiente) return;

    try {
      setRegistrando(true);

      const pos = await getCurrentLocation();
      if (!pos) {
        enqueueSnackbar("No se pudo obtener la ubicación.", {
          variant: "error",
        });
        return;
      }

      let dataResponse;

      if (pendiente.tipo === "facial") {
        const { data } = await axiosInstance.post(
          "/checador/reloj/registrar-facial",
          {
            descriptor_facial: pendiente.descriptor_facial,
            id_empresa: idEmpresa,
            accion,
            latitud_actual: pos.lat,
            longitud_actual: pos.lng,
          },
        );
        dataResponse = data;
      }

      if (pendiente.tipo === "codigo") {
        const { data } = await axiosInstance.post("/checador/reloj/registrar", {
          codigo: pendiente.codigo,
          id_empresa: idEmpresa,
          accion,
          latitud_actual: pos.lat,
          longitud_actual: pos.lng,
        });
        dataResponse = data;
      }

      const { message, empleado, movimiento } = dataResponse;

      setPopupInfo({
        nombre: `${empleado.nombre} ${empleado.apellido_paterno}`,
        foto_perfil: empleado.foto_perfil || "/assets/user.png",
        movimiento: movimiento || message,
        success: true,
      });

      setTimeout(() => setPopupInfo(null), 3000);

      enqueueSnackbar("Registro realizado", { variant: "success" });

      setMostrarModalTurno(false);
      setPendiente(null);
      mutate();
      setCodigoEmpleado("");
    } catch (error) {
      setCodigoEmpleado("");
      enqueueSnackbar(error.response?.data?.error || "Error al registrar", {
        variant: "error",
      });
    } finally {
      setRegistrando(false);
    }
  };

  const handleFacialRecognitionSuccess = (data) => {
    const { message, empleado, movimiento } = data;

    setPopupInfo({
      nombre: `${empleado.nombre} ${empleado.apellido_paterno}`,
      foto_perfil: empleado.foto_perfil || "/assets/user.png",
      movimiento: movimiento || message,
      success: true,
    });

    setTimeout(() => setPopupInfo(null), 3000);
    enqueueSnackbar("Registro facial realizado", { variant: "success" });
    mutate();
  };

  const handleFacialResponse = (data) => {
    if (data.requiereDecision) {
      setPendiente({
        tipo: "facial",
        descriptor_facial: data.descriptor_facial,
      });

      setMostrarModalTurno(true);
      return;
    }

    handleFacialRecognitionSuccess(data);
  };

  const abrirCamara = () => setMostrarCamara(true);
  const cerrarCamara = () => setMostrarCamara(false);

  const handleQRScan = (codigoEscaneado) => {
    setMostrarQR(false);
    registrarMovimiento(codigoEscaneado);
  };

  if (error)
    return <ErrorPage message="No se pudieron cargar los registros." />;

  return (
    <>
      <main className="min-h-screen bg-[#F9FAFB] p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header ADAMIA */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="bg-[#2563EB] p-2.5 rounded-lg">
                <Clock4 className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-gray-900">Reloj checador</h1>
                <p className="text-sm text-gray-600">
                  Registro de entradas y salidas con validación por código, QR y reconocimiento facial.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="hidden md:block lg:col-span-4 md:col-span-5 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
              <ClockDisplay horaActual={horaActual} fechaActual={fechaActual} />
              <EmployeeInput
                codigo={codigoEmpleado}
                setCodigo={setCodigoEmpleado}
                handleRegistrar={registrarMovimiento}
                handleOpenQR={() => setMostrarQR(true)}
                handleOpenFacialModal={() => setMostrarCamara((prev) => !prev)}
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
            <div className="block md:hidden mb-2 text-center">
              <h2 className="text-sm font-semibold text-gray-700">Reloj checador</h2>
              <p className="text-xl text-gray-900 font-bold">{horaActual}</p>
              <p className="text-sm text-gray-600">{fechaActual}</p>
            </div>

            <FacialRecognitionPanel
              isOpen={mostrarCamara}
              onOpen={abrirCamara}
              onClose={cerrarCamara}
              onSuccess={handleFacialResponse}
              idEmpresa={idEmpresa}
              handleOpenFacialModal={() => setMostrarCamara((prev) => !prev)}
            />
            <div className="block md:hidden bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <EmployeeInput
                codigo={codigoEmpleado}
                setCodigo={setCodigoEmpleado}
                handleRegistrar={registrarMovimiento}
                handleOpenQR={() => setMostrarQR(true)}
                handleOpenFacialModal={() => setMostrarCamara((prev) => !prev)}
                registrando={registrando}
                enqueueSnackbar={enqueueSnackbar}
              />
            </div>

            <div className="hidden md:block">
              <RecordsTable
                movimientos={movimientos}
                isLoading={isLoading}
                formatearHora={formatearHora}
              />
            </div>
          </div>
        </div>
        {mostrarQR && (
          <QRScanner
            onScan={handleQRScan}
            onClose={() => setMostrarQR(false)}
          />
        )}
        {/* Cierre del contenedor `max-w-7xl` */}
      </div>
      </main>

      {popupInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm w-full mx-4 transform animate-bounce-in">
            <div className="relative mb-6">
              <img
                src={popupInfo.foto_perfil}
                alt="Foto del empleado"
                className="w-24 h-24 object-cover rounded-full mx-auto border-4 border-slate-200 shadow-lg"
              />
              <div
                className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${popupInfo.success ? "bg-green-500" : "bg-red-500"}`}
              >
                {popupInfo.success ? (
                  <CheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <XCircle className="w-5 h-5 text-white" />
                )}
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {popupInfo.nombre}
            </h3>
            <p className="text-gray-600 mb-4 text-base">
              {popupInfo.movimiento}
            </p>

            <div
              className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                popupInfo.success ? "bg-green-100" : "bg-red-100"
              }`}
            >
              {popupInfo.success ? (
                <CheckCircle className="w-8 h-8 text-green-500" />
              ) : (
                <XCircle className="w-8 h-8 text-red-500" />
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes bounce-in {
          0% {
            transform: scale(0.3) translateY(-50px);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
      `}</style>

      {mostrarModalTurno && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            {/* Overlay interno mientras registra */}

            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6" />
                <div>
                  <h2 className="text-white text-lg font-semibold">Turno abierto</h2>
                  <p className="text-white/90 text-sm">
                    Ya existe un turno abierto. ¿Qué deseas hacer?
                  </p>
                </div>
              </div>
            </div>

            {registrando ? (
              <div className="p-6 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-[#2563EB] mb-3"></div>
                <p className="text-gray-700 font-medium">Registrando...</p>
              </div>
            ) : (
              <div className="p-6 space-y-3">
                <Button
                  onClick={() => registrarConAccion("salida_temporal")}
                  className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-sm"
                  disabled={registrando}
                >
                  Salida temporal
                </Button>

                <Button
                  onClick={() => registrarConAccion("cerrar_turno")}
                  className="w-full bg-red-600 hover:bg-red-700 text-white shadow-sm"
                  disabled={registrando}
                >
                  Cerrar turno
                </Button>

                <Button
                  onClick={() => {
                    setMostrarModalTurno(false);
                    setPendiente(null);
                  }}
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-100"
                  disabled={registrando}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* {registrando && (
        <div className="fixed inset-0 h-screen w-screen bg-white flex flex-col items-center justify-center z-50">
          <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-blue-600 mb-3"></div>
          <p className="text-slate-700 font-medium">Registrando...</p>
        </div>
      )} */}
    </>
  );
}
