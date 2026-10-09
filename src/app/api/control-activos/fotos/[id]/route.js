import { getScope, noStore, errorResponse } from "@/lib/activos/server/session";
import { id, ensure } from "@/lib/activos/server/validation.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request, { params }) {
  try {
    const scope = await getScope(request);
    const parsed = id.safeParse((await params).id);
    ensure(parsed.success, "Artículo no válido.", 400);
    const [rows] = await scope.pool.execute(
      "SELECT contenido,mime FROM cau_articulo_fotos WHERE id_empresa=? AND id_articulo=? AND contenido IS NOT NULL",
      [scope.companyId, parsed.data]
    );
    ensure(rows.length, "Fotografía no disponible.", 404);
    return new Response(new Uint8Array(rows[0].contenido), {
      headers: {
        ...noStore,
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
