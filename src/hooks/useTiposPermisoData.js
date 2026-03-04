import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";

export default function useTiposPermisoData() {
  const url = "/checador/tiposPermiso";

  const { data, error, isLoading } = useSWR(url, fetcherWithToken);
  return { data, error, isLoading };
}
