import { jwtVerify } from "jose";

export const dynamic = "force-dynamic";

const LIMITE = 64 * 1024;

function tokenDe(request) {
  const cookie = request.cookies?.get?.("token")?.value;
  if (cookie) return cookie;
  const auth = request.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

// Recibe un reporte del modo diagnóstico del reloj checador y lo deja en el log
// del servidor como una línea JSON con prefijo [diag-reloj] para buscarlo con grep.
// No persiste nada más ni devuelve datos.
export async function POST(request) {
  if (Number(request.headers.get("content-length") || 0) > LIMITE) {
    return new Response(null, { status: 413 });
  }
  const token = tokenDe(request);
  if (!token || !process.env.JWT_SECRET) return new Response(null, { status: 401 });

  let usuario;
  try {
    ({ payload: usuario } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET)));
  } catch {
    return new Response(null, { status: 401 });
  }

  const texto = await request.text();
  if (texto.length > LIMITE) return new Response(null, { status: 413 });

  let reporte;
  try {
    reporte = JSON.parse(texto);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!reporte || typeof reporte !== "object" || !Array.isArray(reporte.fases) || !Array.isArray(reporte.marcas)) {
    return new Response(null, { status: 400 });
  }

  console.log(`[diag-reloj] ${JSON.stringify({
    recibido: new Date().toISOString(),
    id_usuario: usuario.id_usuario ?? usuario.id ?? usuario.sub ?? null,
    tipo_usuario: usuario.tipo_usuario ?? null,
    id_empresa: usuario.id_empresa ?? null,
    reporte,
  })}`);

  return new Response(null, { status: 204 });
}
