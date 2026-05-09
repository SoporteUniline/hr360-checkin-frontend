import { checkSubscriptionDirect } from "@/lib/db-queries";
import { cookies } from "next/headers";

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

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return Response.json(
        { hasActivePlan: false, error: "Sin token" },
        { status: 401 },
      );
    }

    const base64Payload = token.split(".")[1];
    const payload = Buffer.from(base64Payload, "base64").toString();
    const decoded = JSON.parse(payload);

    const userId = decoded.id_usuario || decoded.id || decoded.sub;

    if (!userId) {
      return Response.json(
        { hasActivePlan: false, error: "Usuario inválido" },
        { status: 401 },
      );
    }

    const hasActivePlan = await checkSubscriptionDirect(userId, idEmpresa);

    return Response.json({ hasActivePlan });
  } catch (error) {
    console.error("Error en API Route:", error);
    return Response.json(
      { hasActivePlan: false, error: "Error interno" },
      { status: 500 },
    );
  }
}
