export function POST() {
  return Response.json({ error: 'El reloj requiere conexión a internet para registrar checadas.' }, { status: 410 });
}
