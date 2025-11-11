import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";

export default function useTiposPermisoData() {
  const { data, error, isLoading } = useSWR(
    "/checador/tiposPermiso",
    fetcherWithToken
  );
  return { data, error, isLoading };
}
