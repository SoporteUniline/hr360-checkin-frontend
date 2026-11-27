import { cargarAyuda, indicePublico } from "@/lib/ayuda/contenido.mjs";

// /ayuda/indice.json: índice de todas las guías (título, resumen, audiencia, pantallas, palabras, secciones y texto).
// Se genera en el build. Lo usan el buscador, «Ayuda» dentro del sistema, el botón «?» y Adamia AI (backend).
export const dynamic = "force-static";

export function GET() {
  return Response.json(indicePublico(cargarAyuda()), { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=86400" } });
}
