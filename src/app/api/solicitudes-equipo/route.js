import {
  scope,
  teamRequests,
  holidays,
  noStore,
  errorResponse,
} from "@/lib/solicitudes-equipo/server";
import { employeeName } from "@/lib/solicitudes-equipo/model.mjs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const current = await scope();
    const [requests, calendar] = await Promise.all([
      teamRequests(current),
      holidays(current),
    ]);
    return Response.json(
      {
        requests,
        team: current.team.map((person) => ({
          id: person.id_empleado,
          name: employeeName(person),
        })),
        ...calendar,
        timezone: current.user.zona_horaria || "America/Mexico_City",
      },
      { headers: noStore },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
