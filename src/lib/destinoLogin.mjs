// A dónde volver después de iniciar sesión (?next=). Solo rutas internas: empieza con «/», no con «//» ni «/\»,
// sin esquema, sin espacios ni caracteres de control y sin volver al propio login. Cualquier otra cosa → null
// (el login usa la ruta por tipo de usuario). Lo usan el middleware, la página de login y los shells.
const LARGO_MAXIMO = 512;
const ORIGEN_PRUEBA = "https://adamia.invalid";

export function destinoSeguro(valor) {
  const crudo = Array.isArray(valor) ? valor[0] : valor;
  if (typeof crudo !== "string") return null;
  const ruta = crudo.trim();
  if (!ruta || ruta.length > LARGO_MAXIMO) return null;
  if (!ruta.startsWith("/") || ruta.startsWith("//") || ruta.includes("\\")) return null;
  if (/[\u0000-\u001f\u007f\s]/.test(ruta)) return null;
  let url;
  try {
    url = new URL(ruta, ORIGEN_PRUEBA);
  } catch {
    return null;
  }
  if (url.origin !== ORIGEN_PRUEBA) return null;
  if (url.pathname === "/login" || url.pathname.startsWith("/login/")) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

// /login?next=<ruta actual> (la ruta actual solo si es segura).
export function urlLogin(rutaActual) {
  const destino = destinoSeguro(rutaActual);
  return destino ? `/login?next=${encodeURIComponent(destino)}` : "/login";
}
