"use client";

// Cuánto debe cada empleado de su cuenta de horas (permisos por horas que se reponen), para sugerir
// «Repone» en el control de horas extra. Una sola consulta por pantalla. Se vuelve a pedir cuando cambia
// una reposición en los registros (así baja lo que debe en cuanto RH marca «Repone»).
import { createContext, useContext, useMemo } from "react";
import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";
import { FORMA_REPOSICION } from "@/lib/asistencia/horasExtra.mjs";

const Contexto = createContext({});

export function CuentaHorasProvider({ registros, children }) {
  const { ids, firma } = useMemo(() => {
    const lista = registros ?? [];
    return {
      ids: [...new Set(lista.map((r) => Number(r.id_empleado)).filter(Boolean))].sort((a, b) => a - b).join(","),
      firma: lista.filter((r) => Number(r.hrs_extra) && r.forma_pago_extras === FORMA_REPOSICION).map((r) => r.id).join(","),
    };
  }, [registros]);
  const { data } = useSWR(
    ids ? [`/checador/cuenta-horas?empleados=${ids}`, firma] : null,
    ([url]) => fetcherWithToken(url),
    { revalidateOnFocus: false, shouldRetryOnError: false, keepPreviousData: true },
  );
  return <Contexto.Provider value={data?.data ?? {}}>{children}</Contexto.Provider>;
}

// Minutos que debe (0 si no debe o no se sabe).
export const useDebeHoras = (idEmpleado) => Number(useContext(Contexto)?.[Number(idEmpleado)]) || 0;

// Todas las cuentas visibles: { id_empleado: minutos que debe } (vista En vivo).
export const useCuentasHoras = () => useContext(Contexto) ?? {};
