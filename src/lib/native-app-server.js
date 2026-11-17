import { headers } from "next/headers";
import { hasNativeSearchParam, isNativeUserAgent } from "./native-app";

/**
 * Resuelve en Server Components si la petición proviene de la app nativa.
 */
export async function getInitialIsNative(searchParams) {
  const headersList = await headers();
  const resolvedSearchParams = await searchParams;
  const userAgent = headersList.get("user-agent") || "";
  return (
    isNativeUserAgent(userAgent) || hasNativeSearchParam(resolvedSearchParams)
  );
}

