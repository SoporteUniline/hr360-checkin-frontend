import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";

export default function useUnidadesNegocio() {
  const { data, error, isLoading } = useSWR(
    "/checador/sucursales?id_empresa=all",
    fetcherWithToken,
  );

  const unidades = Array.isArray(data?.sucursales) ? data.sucursales : [];

  const options = unidades.map((unidad, index) => ({
    value: `${unidad.id_sucursal}-${index}-`,
    label: unidad.nombre,
    id_empresa: Number(unidad.id_empresa),
    id_sucursal: Number(unidad.id_sucursal),
    empresa_nombre: unidad.empresa_nombre,
  }));

  const byId = Object.fromEntries(options.map((opt) => [opt.value, opt]));

  return {
    unidades,
    options,
    byId,
    isLoading,
    error,
  };
}
