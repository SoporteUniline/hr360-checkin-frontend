import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";

export default function useTiposPermisoData(idEmpresa) {
  const url =
    idEmpresa && idEmpresa !== "all"
      ? `/checador/tiposPermiso?id_empresa=${idEmpresa}`
      : "/checador/tiposPermiso";

  const { data, error, isLoading } = useSWR(url, fetcherWithToken);
  return { data, error, isLoading };
}
