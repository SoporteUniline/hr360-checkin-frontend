"use client";
// Módulos activos de la sesión. Arranca con lo que mandó /users/verify/token (llega
// junto con el usuario: el menú no parpadea) y se refresca con /checador/modulos/activos cuando RH cambia algo.
// Mientras no hay datos (servidor viejo o Admin) no se filtra nada. La verdad está en el servidor (403 MODULO_INACTIVO).
import useSWR, { mutate } from "swr";
import axios from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { clavesActivas, reclutamientoHabilitado } from "@/lib/modulos/menu.mjs";

export const CLAVE_ACTIVOS = "/checador/modulos/activos";
export const RECLUTAMIENTO_GLOBAL = reclutamientoHabilitado(process.env.NEXT_PUBLIC_RECRUITMENT_ENABLED);
const opciones = { revalidateOnFocus: false, revalidateIfStale: false, dedupingInterval: 30000, shouldRetryOnError: false, keepPreviousData: true };

export function useModulosActivos() {
  const { dataUser, modulosSesion, isAuthChecked } = useAuth();
  const consulta = dataUser && dataUser.tipo_usuario !== "Admin";
  const llave = consulta ? [CLAVE_ACTIVOS, dataUser.id_usuario, dataUser.id_empleado ?? null] : null;
  // Con lo de la sesión no se vuelve a pedir al montar; solo cuando alguien llama refrescarModulos().
  const { data } = useSWR(llave, () => axios.get(CLAVE_ACTIVOS).then((r) => r.data), {
    ...opciones, fallbackData: modulosSesion ?? undefined, revalidateOnMount: !modulosSesion,
  });
  const respuesta = data ?? modulosSesion;
  return {
    activos: clavesActivas(respuesta),
    listo: Boolean(isAuthChecked),
    opciones: { reclutamiento: RECLUTAMIENTO_GLOBAL },
  };
}

// Después de prender o apagar: el menú y la app toman el cambio sin recargar.
export const refrescarModulos = () => mutate((llave) => Array.isArray(llave) && llave[0] === CLAVE_ACTIVOS);
