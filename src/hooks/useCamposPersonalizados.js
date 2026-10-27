import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";
const EMPTY_FIELDS = [];
export default function useCamposPersonalizados(empresa, empresas = []) {
  const ids = empresa && empresa !== "all" ? [Number(empresa)] : empresas.map(e => Number(e.id_empresa));
  const key = ids.length ? ["campos-personalizados", ...ids.sort((a, b) => a - b)] : null;
  const result = useSWR(key, async ([, ...companies]) => (await Promise.all(companies.map(id => fetcherWithToken(`/checador/campos-personalizados?empresa=${id}`)))).flat());
  return {
    ...result,
    campos: result.data || EMPTY_FIELDS
  };
}
