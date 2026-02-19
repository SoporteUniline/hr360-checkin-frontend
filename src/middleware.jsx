import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

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

export async function middleware(request) {
  const token = request.cookies.get("token")?.value;
  const pathname = request.nextUrl.pathname;

  if (!token) {
    const protectedRoutes = ["/dashboard", "/panel", "/home", "/empleado"].some(
      (path) => pathname.startsWith(path)
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
      const redirectTo = defaultRedirects[tipoUsuario] || "/";
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    const allowedPaths = accessRules[tipoUsuario] || [];
    const isAllowed = allowedPaths.some((path) => pathname.startsWith(path));

    if (!isAllowed) {
      const redirectTo = defaultRedirects[tipoUsuario] || "/";
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    return NextResponse.next();
  } catch (err) {
    // Borrar cookie expirado y dejar que el frontend maneje la redirección
    const response = NextResponse.next();
    response.cookies.delete("token");
    return response;
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/panel/:path*",
    "/home/:path*",
    "/empleado/:path*",
    "/login",
    "/register",
  ],
};
