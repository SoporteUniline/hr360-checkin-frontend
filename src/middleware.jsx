import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

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
  const token = request.cookies.get("token")?.value;
  const pathname = request.nextUrl.pathname;
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
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (pathname.startsWith("/panel/mi-suscripcion")) {
      return NextResponse.redirect(new URL("/panel", request.url));
    }
  }

  if (!token) {
    const protectedRoutes = ["/dashboard", "/panel", "/home", "/empleado"].some(
      (path) => pathname.startsWith(path),
    );
    if (protectedRoutes) {
      return NextResponse.redirect(new URL("/login", request.url));
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
      const redirectTo =
        defaultRedirects[tipoUsuario] || (isNativeApp ? "/panel" : "/");
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    const allowedPaths = accessRules[tipoUsuario] || [];
    const isAllowed = allowedPaths.some((path) => pathname.startsWith(path));

    if (!isAllowed) {
      const redirectTo =
        defaultRedirects[tipoUsuario] || (isNativeApp ? "/panel" : "/");
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    const response = NextResponse.next();
    response.headers.set("x-pathname", pathname);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    response.headers.set('x-adamia-session', Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join(''));
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (err) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("token");
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
