import LoginClient from "./LoginClient";
import { getInitialIsNative } from "@/lib/native-app-server";
import { destinoSeguro } from "@/lib/destinoLogin.mjs";

export default async function LoginPage({ searchParams }) {
  const initialIsNative = await getInitialIsNative(searchParams);
  // ?next= (p. ej. la liga del correo de Clima): solo una ruta interna segura; si no, la ruta por tipo de usuario.
  const destino = destinoSeguro((await searchParams)?.next);

  return <LoginClient initialIsNative={initialIsNative} destino={destino} />;
}
