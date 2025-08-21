import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const accessRules = {
  Admin: ["/dashboard"],
  Recruiter: ["/panel"],
  User: ["/home"],
};

const defaultRedirects = {
  Admin: "/dashboard",
  Recruiter: "/panel",
  User: "/home",
};

export async function middleware(request) {
  const token = request.cookies.get("token")?.value;
  const pathname = request.nextUrl.pathname;

  if (!token) {
    const protectedRoutes = ["/dashboard", "/panel", "/home"].some((path) =>
      pathname.startsWith(path)
    );
    if (protectedRoutes) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const tipoUsuario = payload.tipo_usuario;

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
    "/login",
    "/register",
  ],
};
