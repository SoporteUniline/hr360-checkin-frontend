import { checkEmpresaSubscription, getEmpresaSlug } from "@/lib/db-queries";

export async function GET(request) {
  try {
    const id = request.nextUrl.searchParams.get("id");

    if (!id || id === "null" || id === "undefined") {
      return Response.json(
        { hasActivePlan: false, error: "ID inválido" },
        { status: 400 },
      );
    }

    const hasActivePlan = await checkEmpresaSubscription(id);
    const slug = await getEmpresaSlug(id);

    return Response.json({
      hasActivePlan,
      slug,
    });
  } catch (error) {
    console.error("Error en API Route:", error);

    return Response.json(
      { hasActivePlan: false, error: "Error interno" },
      { status: 500 },
    );
  }
}
