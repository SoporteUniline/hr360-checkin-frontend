import { cargarAyuda, contenidoGuia, guiaPorSlug } from "@/lib/ayuda/contenido.mjs";

// /ayuda/<modulo>/<guia>/contenido.json: la guía ya interpretada (bloques) para pintarla en el panel lateral de «Ayuda»
// dentro del sistema sin salir de la pantalla. Estática (build).
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return cargarAyuda().guias.map((g) => ({ modulo: g.carpeta, guia: g.slug.split("/")[1] }));
}

export async function GET(_req, { params }) {
  const { modulo, guia } = await params;
  const g = guiaPorSlug(cargarAyuda(), `${modulo}/${guia}`);
  if (!g) return Response.json({ error: "No existe esa guía." }, { status: 404 });
  return Response.json(contenidoGuia(g), { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=86400" } });
}
