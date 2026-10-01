import {
  scope,
  findRequest,
  vacationDetails,
  resolveRequest,
  checkOrigin,
  noStore,
  errorResponse,
  TeamError,
} from "@/lib/solicitudes-equipo/server";
export const dynamic = "force-dynamic";
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const current = await scope();
    const row = await findRequest(current, id);
    return Response.json(
      { request: row, ...(await vacationDetails(current, row)) },
      { headers: noStore },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request, { params }) {
  try {
    checkOrigin(request);
    const raw = await request.text();
    if (raw.length > 2000)
      throw new TeamError("Solicitud demasiado grande.", 400);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new TeamError("Solicitud no válida.", 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new TeamError("Solicitud no válida.", 400);
    }
    const { id } = await params;
    const current = await scope();
    const row = await findRequest(current, id);
    await resolveRequest(current, row, body.estado);
    return Response.json({ success: true }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
