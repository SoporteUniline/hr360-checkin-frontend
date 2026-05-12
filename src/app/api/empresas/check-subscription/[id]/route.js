import { checkEmpresaSubscription } from "@/lib/db-queries";

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const idEmpresa = resolvedParams.id;

    if (!idEmpresa || idEmpresa === "null" || idEmpresa === "undefined") {
      return Response.json(
        { hasActivePlan: false, error: "ID inválido" },
        { status: 400 },
      );
    }

    const hasActivePlan = await checkEmpresaSubscription(idEmpresa);

    return Response.json({ hasActivePlan });
  } catch (error) {
    console.error("Error en API Route:", error);

    return Response.json(
      { hasActivePlan: false, error: "Error interno" },
      { status: 500 },
    );
  }
}
