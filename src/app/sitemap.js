import { ARTICULOS, SITIO } from "@/lib/blog/articulos";
import { cargarAyuda } from "@/lib/ayuda/contenido.mjs";

// Mapa del sitio para buscadores: páginas públicas, artículos del blog y el Centro de ayuda (/ayuda, temas, guías y rutas).
export default function sitemap() {
  const ayuda = cargarAyuda();
  const publicas = ["", "/blog", "/contacto", "/cotiza", "/contratar-plan", "/funcionalidades", "/quienes-somos", "/calculadora-aguinaldos", "/bolsa-de-trabajo", "/aviso-privacidad", "/terminos-condiciones", "/aviso-empleados", "/funcionalidades/reloj-checador", "/funcionalidades/colaboradores", "/funcionalidades/contratos", "/funcionalidades/notificaciones-reglas", "/funcionalidades/dashboard-empleados", "/desarrolladores"];
  return [
    ...publicas.map((p) => ({ url: `${SITIO}${p}`, changeFrequency: p === "/blog" ? "weekly" : "monthly", priority: p === "" ? 1 : p === "/blog" ? 0.9 : 0.6 })),
    ...ARTICULOS.map((a) => ({ url: `${SITIO}/blog/${a.slug}`, lastModified: a.fecha, changeFrequency: "monthly", priority: 0.8 })),
    { url: `${SITIO}/ayuda`, changeFrequency: "weekly", priority: 0.8 },
    ...ayuda.modulos.map((m) => ({ url: `${SITIO}${m.url}`, changeFrequency: "weekly", priority: 0.6 })),
    ...ayuda.guias.map((g) => ({ url: `${SITIO}${g.url}`, lastModified: g.actualizado, changeFrequency: "monthly", priority: 0.7 })),
    ...ayuda.rutas.map((r) => ({ url: `${SITIO}${r.url}`, changeFrequency: "monthly", priority: 0.5 })),
  ];
}
