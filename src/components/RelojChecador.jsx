"use client";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
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

dayjs.extend(utc);
dayjs.extend(timezone);

export default function RelojChecador({
  idEmpresa,
  modoEmpleado = false,
  idEmpleado = null,
}) {
  const { dataUser } = useAuth();

  const DB_TIMEZONE = "America/Mexico_City";
  const USER_TIMEZONE = dataUser?.zona_horaria || "America/Mexico_City";

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
    fetcher
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

  const registrarMovimiento = async () => {
    if (gpsError) {
      enqueueSnackbar(gpsError, { variant: "error" });
      return;
    }

    if (registrando) return;
    setRegistrando(true);
    const codigo = codigoEmpleado.trim();
    if (!codigo) return;

    try {
      if (!idEmpresa) {
        enqueueSnackbar("Empresa no definida para este usuario", {
          variant: "error",
        });
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

      const { movimiento, empleado } = data;

      setPopupInfo({
        nombre: `${empleado.nombre} ${empleado.apellido_paterno}`,
        foto_perfil: empleado.foto_perfil || "/assets/user.png",
        movimiento,
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

  const handleFacialRecognitionSuccess = (data) => {
    const { message, empleado } = data;

    setPopupInfo({
      nombre: `${empleado.nombre} ${empleado.apellido_paterno}`,
      foto_perfil: empleado.foto_perfil || "/assets/user.png",
      movimiento: message,
      success: true,
    });

    setTimeout(() => setPopupInfo(null), 3000);
    enqueueSnackbar("Registro facial realizado", { variant: "success" });
    mutate();
  };

  const abrirCamara = () => setMostrarCamara(true);
  const cerrarCamara = () => setMostrarCamara(false);

  if (error)
    return <ErrorPage message="No se pudieron cargar los registros." />;

  return (
    <>
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 p-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="hidden md:block lg:col-span-4 md:col-span-5 space-y-6">
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-slate-200/50 p-6 text-center">
              <ClockDisplay horaActual={horaActual} fechaActual={fechaActual} />
              <EmployeeInput
                codigo={codigoEmpleado}
                setCodigo={setCodigoEmpleado}
                handleRegistrar={registrarMovimiento}
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
              <h1 className="text-md font-bold text-slate-800">
                HR360 - Control de Asistencia
              </h1>
              <p className="text-lg text-slate-600 font-bold">{horaActual}</p>
              <p className="text-xs text-slate-500">{fechaActual}</p>
            </div>

            <FacialRecognitionPanel
              isOpen={mostrarCamara}
              onOpen={abrirCamara}
              onClose={cerrarCamara}
              onSuccess={handleFacialRecognitionSuccess}
              idEmpresa={idEmpresa}
              handleOpenFacialModal={() => setMostrarCamara((prev) => !prev)}
            />
            <div className="block md:hidden bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-4">
              <EmployeeInput
                codigo={codigoEmpleado}
                setCodigo={setCodigoEmpleado}
                handleRegistrar={registrarMovimiento}
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
      </main>

      {popupInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center max-w-sm w-full mx-4 transform animate-bounce-in">
            <div className="relative mb-6">
              <img
                src={popupInfo.foto_perfil}
                alt="Foto del empleado"
                className="w-24 h-24 object-cover rounded-full mx-auto border-4 border-slate-200 shadow-lg"
              />
              <div
                className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
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

            <h3 className="text-2xl font-bold text-slate-800 mb-2">
              {popupInfo.nombre}
            </h3>
            <p className="text-slate-600 mb-4 text-lg">
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
    </>
  );
}
