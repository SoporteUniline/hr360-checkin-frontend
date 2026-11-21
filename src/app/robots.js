import { SITIO } from "@/lib/blog/articulos";

// Solo producción se indexa; dev y cualquier otro dominio piden a los buscadores no entrar.
export default function robots() {
  if (SITIO !== "https://adamia.com.mx") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/panel", "/empleado", "/dashboard", "/api", "/internal", "/firmar"] }],
    sitemap: `${SITIO}/sitemap.xml`,
  };
}
