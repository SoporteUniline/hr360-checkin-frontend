import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { destinoSeguro, urlLogin } from "@/lib/destinoLogin.mjs";
import { RUTA_NEUTRA, rutaMisEncuestas } from "@/lib/clima/pendientes.mjs";
import { demoBasePath, nombreCookieSesion, rutaDeInstancia } from "@/lib/demo-base-path.mjs";
import { LIGA_CORREO, destinoLiga } from "@/lib/comunicados/comunicados.mjs";

//Prueba CI/CD

const accessRules = {
  Admin: ["/dashboard"],
  Recruiter: ["/panel"],
  User: ["/panel", "/home"],
  Empleado: ["/empleado"],
};

const defaultRedirects = {
  Admin: "/dashboard",
  Recruiter: "/panel",
  User: "/panel",
  Empleado: "/empleado",
};

// These public routes were previously outside the middleware matcher.
// Keep their browser behavior when extending native-only restrictions.
const nativeOnlyPublicRoutes = [
  "/signup", "/funcionalidades", "/quienes-somos", "/contacto",
  "/blog-y-noticias", "/bolsa-de-trabajo", "/calculadora-aguinaldos",
  "/capacitacion", "/politicas", "/terminos-condiciones", "/aviso-privacidad",
];

export async function middleware(request) {
  const token = request.cookies.get(nombreCookieSesion)?.value;
  const pathname = request.nextUrl.pathname;
  const redirigir = (ruta) => NextResponse.redirect(new URL(rutaDeInstancia(ruta), request.url));
  const userAgent = request.headers.get("user-agent") || "";
  const isNativeApp = userAgent.includes("AdamiaAppNative");
  if (!isNativeApp && nativeOnlyPublicRoutes.some(path => pathname === path || pathname.startsWith(path + "/"))) {
    return NextResponse.next();
  }

  // Reglas de restricción para la app nativa (estricto: solo login directo y módulos internos)
  if (isNativeApp) {
    const blockedForNative = [
      "/",
      "/contratar-plan",
      "/cotiza",
      "/alta-empresas",
      "/register",
      ...nativeOnlyPublicRoutes,
    ];

    const isBlocked =
      pathname === "/" ||
      blockedForNative.some(
        (blocked) => pathname === blocked || pathname.startsWith(blocked + "/"),
      );

    if (isBlocked) {
      return redirigir("/login");
    }

    if (pathname.startsWith("/panel/mi-suscripcion")) {
      return redirigir("/panel");
    }
  }

  // Sin sesión, a una ruta protegida (o a «Mis encuestas», la liga del correo): al login recordando a dónde iba.
  const rutaActual = `${pathname}${request.nextUrl.search}`;
  if (!token) {
    const protectedRoutes = ["/dashboard", "/panel", "/home", "/empleado", RUTA_NEUTRA, LIGA_CORREO].some(
      (path) => pathname.startsWith(path),
    );
    if (protectedRoutes) {
      return redirigir(urlLogin(rutaActual));
    }
    return NextResponse.next();
  }
  //Home
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const tipoUsuario = (payload.tipo_usuario || "").trim();
    // console.log("🧠 Tipo de usuario detectado:", tipoUsuario);

    if (pathname === "/login" || pathname === "/register") {
      // Con sesión abierta, el login respeta ?next= (solo ruta interna segura); las reglas de acceso se aplican al llegar.
      const siguiente = pathname === "/login" ? destinoSeguro(request.nextUrl.searchParams.get("next")) : null;
      const redirectTo =
        siguiente || defaultRedirects[tipoUsuario] || (isNativeApp ? "/panel" : "/");
      return redirigir(redirectTo);
    }

    // «Mis encuestas» (liga del correo de Clima): la app del empleado o el panel de RH y dueño.
    if (pathname === RUTA_NEUTRA || pathname === `${RUTA_NEUTRA}/`) {
      const destino = rutaMisEncuestas(tipoUsuario) || defaultRedirects[tipoUsuario] || "/";
      return redirigir(destino);
    }

    // (27/11/2026) Liga de correos y push del Centro de comunicados: /mi-espacio/comunicados/<id>.
    if (pathname.startsWith(LIGA_CORREO)) {
      return redirigir(destinoLiga(pathname, tipoUsuario) || defaultRedirects[tipoUsuario] || "/");
    }

    const allowedPaths = accessRules[tipoUsuario] || [];
    const isAllowed = allowedPaths.some((path) => pathname.startsWith(path));

    if (!isAllowed) {
      const redirectTo =
        defaultRedirects[tipoUsuario] || (isNativeApp ? "/panel" : "/");
      return redirigir(redirectTo);
    }

    const response = NextResponse.next();
    response.headers.set("x-pathname", pathname);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    response.headers.set('x-adamia-session', Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join(''));
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (err) {
    const response = redirigir(urlLogin(rutaActual));
    response.cookies.set(nombreCookieSesion, "", { path: demoBasePath || "/", maxAge: 0 });
    return response;
  }
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/panel/:path*",
    "/home/:path*",
    "/empleado/:path*",
    "/login",
    "/mis-encuestas",
    "/mi-espacio/:path*",
    "/register/:path*",
    "/contratar-plan/:path*",
    "/cotiza/:path*",
    "/alta-empresas/:path*",
    "/signup/:path*",
    "/funcionalidades/:path*",
    "/quienes-somos/:path*",
    "/contacto/:path*",
    "/blog-y-noticias/:path*",
    "/bolsa-de-trabajo/:path*",
    "/calculadora-aguinaldos/:path*",
    "/capacitacion/:path*",
    "/politicas/:path*",
    "/terminos-condiciones/:path*",
    "/aviso-privacidad/:path*",
  ],
};
