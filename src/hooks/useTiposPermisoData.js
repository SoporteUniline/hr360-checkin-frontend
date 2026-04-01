import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";
import { useAuth } from "@/context/AuthContext";

export default function useTiposPermisoData() {
  const { dataUser } = useAuth();
  const idEmpresaSesion =
    dataUser?.id_empresa ||
    dataUser?.empresas_detalle?.[0]?.id_empresa ||
    dataUser?.empresas?.[0] ||
    null;

  const url = idEmpresaSesion
    ? `/checador/tiposPermiso?id_empresa=${idEmpresaSesion}`
    : "/checador/tiposPermiso";

  const { data, error, isLoading } = useSWR(url, fetcherWithToken);
  return { data, error, isLoading };
}
