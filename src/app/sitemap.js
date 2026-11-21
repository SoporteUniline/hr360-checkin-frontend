import { ARTICULOS, SITIO } from "@/lib/blog/articulos";

// Mapa del sitio para buscadores: páginas públicas y artículos del blog.
export default function sitemap() {
  const publicas = ["", "/blog", "/contacto", "/cotiza", "/contratar-plan", "/funcionalidades", "/quienes-somos", "/calculadora-aguinaldos", "/aviso-privacidad", "/terminos-condiciones", "/aviso-empleados", "/funcionalidades/reloj-checador", "/funcionalidades/colaboradores", "/funcionalidades/contratos", "/funcionalidades/notificaciones-reglas", "/funcionalidades/dashboard-empleados"];
  return [
    ...publicas.map((p) => ({ url: `${SITIO}${p}`, changeFrequency: p === "/blog" ? "weekly" : "monthly", priority: p === "" ? 1 : p === "/blog" ? 0.9 : 0.6 })),
    ...ARTICULOS.map((a) => ({ url: `${SITIO}/blog/${a.slug}`, lastModified: a.fecha, changeFrequency: "monthly", priority: 0.8 })),
  ];
}
