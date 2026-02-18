import { checkEmpresaSubscription, getEmpresaSlug } from "@/lib/db-queries";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return Response.json({ error: "ID requerido" }, { status: 400 });

  try {
    const [hasActivePlan, slug] = await Promise.all([
      checkEmpresaSubscription(id),
      getEmpresaSlug(id),
    ]);

    return Response.json({ hasActivePlan, slug });
  } catch (error) {
    return Response.json({ error: "Error en DB" }, { status: 500 });
  }
}
