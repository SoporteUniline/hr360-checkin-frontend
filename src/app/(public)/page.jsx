"use client";
import { useEffect, useState } from "react";
import {
  Clock,
  User,
  CheckCircle,
  XCircle,
  Users,
  Timer,
  Calendar,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import useSWR from "swr";
import { fetcher, fetcherWithToken } from "@/lib/fetcher";
import ErrorPage from "@/components/ErrorPage";
import { useSnackbar } from "notistack";
import { twMerge } from "tailwind-merge";
import Cookies from "js-cookie";
import axiosInstance from "@/lib/axios";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { dataUser, isLoggedIn, isAuthChecked } = useAuth();
  const token = Cookies.get("token");
  const router = useRouter();
  const [horaActual, setHoraActual] = useState("");
  const [fechaActual, setFechaActual] = useState("");
  const [codigoEmpleado, setCodigoEmpleado] = useState("");
  const { enqueueSnackbar } = useSnackbar();
  const [popupInfo, setPopupInfo] = useState(null);
  const [registrando, setRegistrando] = useState(false);

  const formatearHora = (fechaString) => {
    if (!fechaString) return "-";
    return new Date(fechaString).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const {
    data: registrosData,
    mutate,
    error,
    isLoading,
  } = useSWR(
    dataUser?.id_empresa
      ? `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/reloj/registros-del-dia?id_empresa=${dataUser.id_empresa}`
      : null,
    fetcherWithToken
  );

  const movimientos = registrosData?.registrosHoy || [];
  const movimientosParaTabla = movimientos.slice(0, 10);
  const empleadosActivos = registrosData?.activosHoy || 0;
  const totalRegistros = registrosData?.totalRegistrosHoy || 0;

  useEffect(() => {
    const actualizarHora = () => {
      const ahora = new Date();
      const hora = ahora.toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      setHoraActual(hora);

      const fechaCompleta = ahora.toLocaleDateString("es-MX", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const [dia, ...restoDeFecha] = fechaCompleta.split(", ");

      const diaCapitalizado = dia.charAt(0).toUpperCase() + dia.slice(1);

      const fechaFinal = [diaCapitalizado, ...restoDeFecha].join(", ");

      setFechaActual(fechaFinal);
    };

    actualizarHora();
    const intervalo = setInterval(actualizarHora, 1000);
    return () => clearInterval(intervalo);
  }, []);

  const manejarCambioCodigo = (e) => {
    setCodigoEmpleado(e.target.value.toUpperCase());
  };

  const registrarMovimiento = async () => {
    if (registrando) return;
    setRegistrando(true);
    const codigo = codigoEmpleado.trim();
    if (!codigo) return;

    try {
      if (!dataUser?.id_empresa) {
        enqueueSnackbar("Empresa no definida para este usuario", {
          variant: "error",
        });
        return;
      }

      const { data } = await axiosInstance.post(
        `/checador/reloj/registrar`,
        {
          codigo,
          id_empresa: dataUser.id_empresa,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const { movimiento, empleado } = data;

      setPopupInfo({
        nombre: `${empleado.nombre} ${empleado.apellido_paterno}`,
        foto_perfil: empleado.foto_perfil || "/assets/user.png",
        movimiento,
        success: true,
      });

      setTimeout(() => setPopupInfo(null), 3000);

      enqueueSnackbar("Registro realizado", {
        variant: "success",
      });
      setCodigoEmpleado("");
      mutate();
    } catch (err) {
      if (err.response) {
        const status = err.response.status;

        if (status === 400) {
          setPopupInfo({
            nombre: "Desconocido",
            foto_perfil: "/assets/user.png",
            movimiento: "Error",
            success: false,
          });

          setTimeout(() => setPopupInfo(null), 3000);

          enqueueSnackbar(err.response.data.error, { variant: "warning" });
        } else if (status === 401) {
          enqueueSnackbar("Sesión expirada, inicia sesión de nuevo", {
            variant: "error",
          });
          Cookies.remove("token");
          router.push("/login");
        } else {
          enqueueSnackbar("Error inesperado", {
            variant: "error",
          });
        }
      } else {
        console.error("Error sin respuesta del servidor:", err);
        enqueueSnackbar("Error de red", {
          variant: "error",
        });
      }
    } finally {
      setRegistrando(false);
    }
  };

  if (error)
    return <ErrorPage message="No se pudieron cargar los registros." />;

  return (
    <>
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 p-4">
        {!isLoggedIn ? (
          <div className="max-w-md mx-auto">
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-slate-200/50 p-8 text-center">
              <div className="relative mb-6">
                <div className="w-26 h-26 mx-auto bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center shadow-xl">
                  <Clock className="w-16 h-16 text-white" />
                </div>
              </div>
              <h2 className="text-6xl font-bold text-slate-800 mb-2 tracking-tight">
                {horaActual}
              </h2>
              <p className="text-lg text-slate-500 mb-8">{fechaActual}</p>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-slate-200/50 p-6 text-center">
                <div className="relative mb-6">
                  <div className="w-28 h-28 mx-auto bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center shadow-xl transform hover:scale-105 transition-transform duration-300">
                    <Clock className="w-16 h-16 text-white animate-pulse" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full animate-ping"></div>
                </div>

                <h2 className="text-5xl font-bold text-slate-800 mb-2 tracking-tight font-mono">
                  {horaActual}
                </h2>
                <p className="text-lg text-slate-500 mb-8">{fechaActual}</p>

                <div className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Ingresa tu código"
                      value={codigoEmpleado}
                      onChange={manejarCambioCodigo}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !registrando)
                          registrarMovimiento();
                      }}
                      className="w-full pl-12 pr-4 py-4 text-center text-lg font-semibold border-2 border-slate-200 rounded-2xl focus:border-slate-600 focus:ring-4 focus:ring-slate-200 transition-all duration-300 bg-slate-50/50"
                    />
                  </div>

                  <Button
                    onClick={registrarMovimiento}
                    disabled={registrando}
                    className="w-full py-4 bg-gradient-to-r from-slate-700 to-slate-800 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:transform-none"
                  >
                    {registrando ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Registrando...</span>
                      </div>
                    ) : (
                      "Registrar Entrada/Salida"
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6 text-center">
                  <div className="w-12 h-12 mx-auto bg-green-100 rounded-xl flex items-center justify-center mb-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-800">
                    {empleadosActivos}
                  </div>
                  <div className="text-sm text-slate-600">
                    Empleados Activos
                  </div>
                </div>

                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6 text-center">
                  <div className="w-12 h-12 mx-auto bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                    <Calendar className="w-6 h-6 text-slate-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-800">
                    {totalRegistros}
                  </div>
                  <div className="text-sm text-slate-600">Registros Hoy</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-slate-200/50 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200">
                  <h3 className="text-2xl font-bold text-slate-800 flex items-center space-x-3">
                    <Users className="w-6 h-6" />
                    <span>Últimos registros</span>
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableCell className="px-6 py-2 text-center text-sm font-semibold text-slate-700">
                          Código
                        </TableCell>
                        <TableCell className="px-6 py-2 text-left text-sm font-semibold text-slate-700">
                          Empleado
                        </TableCell>
                        <TableCell className="px-6 py-2 text-center text-sm font-semibold text-slate-700">
                          Entrada
                        </TableCell>
                        <TableCell className="px-6 py-2 text-center text-sm font-semibold text-slate-700">
                          Salida
                        </TableCell>
                        <TableCell className="px-6 py-2 text-center text-sm font-semibold text-slate-700">
                          Estado
                        </TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {isLoading ? (
                        [...Array(5)].map((_, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                            </TableCell>
                            <TableCell>
                              <div className="h-4 bg-gray-200 rounded animate-pulse w-40" />
                            </TableCell>
                            <TableCell>
                              <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
                            </TableCell>
                            <TableCell>
                              <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
                            </TableCell>
                            <TableCell>
                              <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : movimientosParaTabla?.length > 0 ? (
                        movimientosParaTabla.map((mov, i) => (
                          <TableRow
                            key={i}
                            className="hover:bg-slate-50/50 transition-colors duration-200"
                          >
                            <TableCell className="px-6">
                              <div className="flex items-center space-x-3">
                                <span className="text-sm font-bold text-slate-700">
                                  {mov.nip}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="px-6">
                              <div className="font-medium text-slate-800">
                                {mov.nombre}
                              </div>
                            </TableCell>
                            <TableCell className="px-6 text-center">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                {formatearHora(
                                  mov.entrada_corregida || mov.entrada
                                )}
                              </span>
                            </TableCell>
                            <TableCell className="px-6 text-center">
                              {mov.salida_corregida || mov.salida ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                                  {formatearHora(
                                    mov.salida_corregida || mov.salida
                                  )}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </TableCell>
                            <TableCell className="px-6 text-center">
                              <span
                                className={twMerge(
                                  "inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold",
                                  mov.estado === "Abierto"
                                    ? "bg-green-100 text-green-800 border border-green-200"
                                    : "bg-slate-100 text-slate-700 border border-slate-200"
                                )}
                              >
                                {mov.estado === "Abierto" ? (
                                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                                ) : (
                                  <div className="w-2 h-2 bg-slate-400 rounded-full mr-2"></div>
                                )}
                                {mov.estado}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-gray-500 py-4"
                          >
                            No hay registros para el día de hoy aún
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        )}
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
