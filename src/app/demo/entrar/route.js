import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { demoBasePath, nombreCookieSesion, rutaDeInstancia } from "@/lib/demo-base-path.mjs";

const headers = { "Cache-Control": "private, no-store" };

function demoNoDisponible() {
  return new NextResponse("La demo de Adamia no está disponible en este momento.", {
    status: 503,
    headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
  });
}

async function entrarEnInstancia(request) {
  const { ADAMIA_DEMO_ORIGIN, ADAMIA_DEMO_PASSWORD, NEXT_PUBLIC_RUTA_BACKEND, JWT_SECRET } = process.env;
  if (!ADAMIA_DEMO_ORIGIN || !ADAMIA_DEMO_PASSWORD || !NEXT_PUBLIC_RUTA_BACKEND || !JWT_SECRET) {
    return demoNoDisponible();
  }

  try {
    const origen = new URL(ADAMIA_DEMO_ORIGIN);
    const host = request.headers.get("host") || new URL(request.url).host;
    if (host !== origen.host) return demoNoDisponible();

    const backend = (process.env.ADAMIA_DEMO_INTERNAL_API || NEXT_PUBLIC_RUTA_BACKEND).replace(/\/$/, "");
    const sesion = await fetch(`${backend}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        correo: "rh@adamia-demo.example",
        contrasenia: ADAMIA_DEMO_PASSWORD,
      }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (!sesion.ok) return demoNoDisponible();

    const { token } = await sesion.json();
    const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET), {
      algorithms: ["HS256"],
      requiredClaims: ["exp", "iat"],
      maxTokenAge: "30m",
    });
    if (payload.tipo_usuario !== "Recruiter" || payload.correo !== "rh@adamia-demo.example" ||
        !payload.id_empresa || payload.exp - payload.iat > 1800) {
      return demoNoDisponible();
    }

    const response = NextResponse.redirect(new URL(rutaDeInstancia("/panel"), origen), { headers });
    response.cookies.set(nombreCookieSesion, token, {
      path: demoBasePath || "/",
      sameSite: "lax",
      secure: origen.protocol === "https:",
      expires: new Date(payload.exp * 1000),
    });
    return response;
  } catch {
    return demoNoDisponible();
  }
}

export async function GET(request) {
  if (process.env.ADAMIA_DEMO_INSTANCE !== "true") return new NextResponse(null, { status: 404 });
  return entrarEnInstancia(request);
}
