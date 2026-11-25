// Archivos de asociación de dominio para las passkeys dentro de la app (25/11/2026). Ver docs/passkeys-sesiones.md.
//   /.well-known/apple-app-site-association  → iOS: la app puede usar las passkeys de adamia.com.mx (webcredentials).
//   /.well-known/assetlinks.json             → Android: la app comparte inicios de sesión con el sitio.
// Se arman con APPLE_TEAM_ID y ANDROID_SHA256_FINGERPRINTS. Si faltan o no son válidos: null → la ruta responde 404
// (nunca un archivo inválido, que iOS/Android guardarían en caché como «sin asociación»).
export const APP_ID = "mx.com.adamia.app";

export function appleAppSiteAssociation(teamId) {
  const team = String(teamId || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{10}$/.test(team)) return null;
  return { webcredentials: { apps: [`${team}.${APP_ID}`] } };
}

export function huellasAndroid(texto) {
  return [...new Set(String(texto || "")
    .split(",")
    .map((h) => h.trim().toUpperCase())
    .filter((h) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(h)))];
}

export function assetLinks(fingerprints) {
  const huellas = huellasAndroid(fingerprints);
  if (!huellas.length) return null;
  return [{
    relation: ["delegate_permission/common.handle_all_urls", "delegate_permission/common.get_login_creds"],
    target: { namespace: "android_app", package_name: APP_ID, sha256_cert_fingerprints: huellas },
  }];
}

export function respuestaJson(datos) {
  if (!datos) return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  return new Response(JSON.stringify(datos), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
  });
}
