"use client";
import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
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
  const { isLoggedIn, isAuthChecked } = useAuth();
  const token = Cookies.get("token");
  const router = useRouter();
  const [horaActual, setHoraActual] = useState("");
  const [codigoEmpleado, setCodigoEmpleado] = useState("");
  const { enqueueSnackbar } = useSnackbar();
  const [popupInfo, setPopupInfo] = useState(null);

  const {
    data: movimientos,
    mutate,
    error,
    isLoading,
  } = useSWR(
    `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/reloj/ultimos`,
    fetcherWithToken
  );

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
    };

    actualizarHora();
    const intervalo = setInterval(actualizarHora, 1000);
    return () => clearInterval(intervalo);
  }, []);

  const manejarCambioCodigo = (e) => {
    setCodigoEmpleado(e.target.value.toUpperCase());
  };

  const registrarMovimiento = async () => {
    const codigo = codigoEmpleado.trim();
    if (!codigo) return;

    try {
      const hora = new Date().toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      const { data } = await axiosInstance.post(
        `/checador/reloj/registrar`,
        { codigo, hora },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Ya no necesitas hacer otra llamada para obtener al empleado,
      // porque el backend te lo manda junto con el movimiento
      const { movimiento, empleado } = data;

      setPopupInfo({
        nombre: `${empleado.nombre} ${empleado.apellido_paterno}`,
        foto_perfil: empleado.foto_perfil || "/assets/user.png",
        movimiento, // Aquí usas directamente el movimiento que registró el backend
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
    }
  };

  if (error)
    return <ErrorPage message="No se pudieron cargar los registros." />;

  return (
    <>
      <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <h1 className="text-3xl font-bold mb-6">Reloj Checador</h1>

        {!isLoggedIn ? (
          <div className="flex flex-col justify-center items-center bg-gray-100 p-6 w-full max-w-md">
            <Icon
              icon="mdi:clock-outline"
              className="text-[120px] text-slate-700"
            />
            <h2 className="text-5xl font-bold text-slate-800 mt-4">
              {horaActual}
            </h2>
            <p className="mt-2 text-lg text-slate-500">Hora actual</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl items-stretch">
            {/* Sección izquierda: Reloj + input */}
            <div className="flex flex-col justify-center items-center bg-white p-6 rounded-xl shadow-md w-full h-full">
              <Icon
                icon="mdi:clock-outline"
                className="text-[120px] text-slate-700"
              />
              <h2 className="text-5xl font-bold text-slate-800 mt-4">
                {horaActual}
              </h2>
              <p className="mt-2 text-lg text-slate-500">Hora actual</p>

              <div className="w-full mt-8">
                <Input
                  placeholder="Ingresa tu código"
                  value={codigoEmpleado}
                  onChange={manejarCambioCodigo}
                  className="w-full text-center"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") registrarMovimiento();
                  }}
                />
                <Button onClick={registrarMovimiento} className="mt-3 w-full">
                  Registrar
                </Button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md w-full h-full">
              <h3 className="text-xl font-semibold mb-4">Últimos registros</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell>Código</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Movimiento</TableCell>
                    <TableCell>Hora</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
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
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : movimientos?.length > 0 ? (
                    movimientos.map((mov, i) => (
                      <TableRow key={i}>
                        <TableCell>{mov.nip}</TableCell>
                        <TableCell>{mov.nombre}</TableCell>
                        <TableCell>
                          <span
                            className={twMerge(
                              "px-3 py-1 rounded-full text-white text-sm font-semibold",
                              mov.movimiento.toLowerCase() === "entrada"
                                ? "bg-green-600"
                                : "bg-red-600"
                            )}
                          >
                            {mov.movimiento}
                          </span>
                        </TableCell>

                        <TableCell>{mov.hora}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-gray-500"
                      >
                        No hay registros aún
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </main>

      {popupInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center relative max-w-sm w-full animate-fade-in-up">
            <img
              src={popupInfo.foto_perfil}
              alt="Foto del empleado"
              className="w-32 h-32 object-cover rounded-full mx-auto mb-4"
            />
            <h3 className="text-xl font-bold">{popupInfo.nombre}</h3>
            <p className="text-gray-600 mb-4">{popupInfo.movimiento}</p>
            <Icon
              icon={popupInfo.success ? "mdi:check-circle" : "mdi:close-circle"}
              className={`text-[64px] mx-auto ${
                popupInfo.success ? "text-green-500" : "text-red-500"
              }`}
            />
          </div>
        </div>
      )}
    </>
  );
}
