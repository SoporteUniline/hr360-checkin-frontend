import LoginClient from "./LoginClient";
import { getInitialIsNative } from "@/lib/native-app-server";
import { destinoSeguro } from "@/lib/destinoLogin.mjs";
import { avisoLogin } from "@/lib/passkeys/modelo.mjs";

export default async function LoginPage({ searchParams }) {
  const initialIsNative = await getInitialIsNative(searchParams);
  // ?next= (p. ej. la liga del correo de Clima): solo una ruta interna segura; si no, la ruta por tipo de usuario.
  const destino = destinoSeguro((await searchParams)?.next);
  // ?aviso=sesion-cerrada: el servidor cerró la sesión (texto fijo; nunca se muestra lo que venga en la URL).
  const aviso = avisoLogin((await searchParams)?.aviso);

  return <LoginClient initialIsNative={initialIsNative} destino={destino} aviso={aviso} />;
}
