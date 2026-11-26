import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const demoBasePath = process.env.ADAMIA_DEMO_INSTANCE === "true"
  ? process.env.ADAMIA_DEMO_BASE_PATH || ""
  : "";
if (demoBasePath && !/^\/demo\/[a-z0-9-]+$/.test(demoBasePath)) {
  throw new Error("La ruta base de la instancia demo debe tener el formato /demo/<visita>.");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  ...(demoBasePath ? {
    basePath: demoBasePath,
    env: { NEXT_PUBLIC_ADAMIA_DEMO_BASE_PATH: demoBasePath },
    webpack(config) {
      config.resolve.alias["js-cookie$"] = fileURLToPath(new URL("./src/lib/demo-cookies.js", import.meta.url));
      config.resolve.alias["js-cookie-original$"] = require.resolve("js-cookie");
      return config;
    },
  } : {}),
  ...(process.env.ADAMIA_DEMO_INSTANCE === "true" && process.env.ADAMIA_DEMO_DIST_DIR
    ? { distDir: process.env.ADAMIA_DEMO_DIST_DIR }
    : {}),
  // El proxy de dev reserva /api/* para el backend anterior. Este alias llega
  // a Next y conserva los handlers y su autenticación en src/app/api.
  async rewrites() {
    const internas = [
      {
        source: "/internal/offline-clock/sync",
        destination: "/api/offline-clock/sync",
      },
      {
        source: "/internal/control-activos/:path*",
        destination: "/api/control-activos/:path*",
      },
      {
        // En dev/prod el proxy manda casi todo /api/* al backend; /internal/* llega a Next.
        source: "/internal/diagnostico/reloj",
        destination: "/api/diagnostico/reloj",
      },
      {
        // «No pudimos cargar tu equipo»: /api/solicitudes-equipo llegaba al backend (HTML «Cannot GET»).
        source: "/internal/solicitudes-equipo/:path*",
        destination: "/api/solicitudes-equipo/:path*",
      },
    ];
    if (!demoBasePath) return internas;
    return {
      beforeFiles: [{ source: "/demo", destination: "/demo/entrar" }],
      afterFiles: internas,
      fallback: [],
    };
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "hr360-redlab.s3.us-west-1.amazonaws.com",
      },
    ],
  },

  // Activos y uniformes es un solo módulo en /panel/activos. Las rutas viejas de los dos
  // módulos redirigen a su equivalente (la consulta, p. ej. ?empresa=, se conserva sola).
  async redirects() {
    const viejo = "/panel/:modulo(control-activos|control-uniformes)";
    const a = (source, destination) => ({ source, destination, permanent: false });
    return [
      a("/panel/control-activos/activos/:resto*", "/panel/activos/inventario/:resto*?tipo=activos"),
      a("/panel/control-activos/uniformes/:resto*", "/panel/activos/inventario/:resto*?tipo=uniformes"),
      a("/panel/control-uniformes/prendas/:resto*", "/panel/activos/inventario/:resto*?tipo=uniformes"),
      a("/panel/control-activos/categorias", "/panel/activos/ajustes/categorias?tipo=activos"),
      a("/panel/control-uniformes/categorias", "/panel/activos/ajustes/categorias?tipo=uniformes"),
      a(`${viejo}/entregas/nueva`, "/panel/activos/entregar"),
      a(`${viejo}/devoluciones`, "/panel/activos/recibir"),
      a(`${viejo}/empleados/:resto*`, "/panel/activos/personas/:resto*"),
      a(`${viejo}/mantenimiento`, "/panel/activos/revision"),
      a(`${viejo}/movimientos`, "/panel/activos/historial"),
      a(`${viejo}/:ajuste(ubicaciones|paquetes)`, "/panel/activos/ajustes/:ajuste"),
      a(`${viejo}/:seccion(entregas|resguardos|solicitudes)/:resto*`, "/panel/activos/:seccion/:resto*"),
      a(viejo, "/panel/activos"),
      // Evaluaciones: «Tablero» era el mismo «Resumen»; resultados y planes viven en cada
      // campaña o en «Mis resultados». La entrada del módulo decide la pestaña según el rol.
      a("/panel/evaluaciones/:vista(tablero|resultados|seguimiento)", "/panel/evaluaciones"),
      a("/empleado/panel/evaluaciones/:vista(tablero|resultados|seguimiento)", "/empleado/panel/evaluaciones"),
      // El blog vive en /blog; la página vieja estaba apagada.
      a("/blog-y-noticias", "/blog"),
    ];
  },

  async headers() {
    return [
      {
        source: '/offline-clock-sw.js',
        headers: [{ key: 'Cache-Control', value: 'no-cache' }],
      },
      {
        source: "/vendor/face-api/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        // Modelos de face-api (unos 7 MB): antes caducaban cada día y la primera apertura del reloj de cada día los
        // volvía a bajar («Preparando reconocimiento facial…» tardaba mucho; el service worker que los guardaba se
        // retiró con el modo sin conexión). No cambian: si algún día cambian, van en otra carpeta (/models-v2).
        source: "/models/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/firmar/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
          {
            key: "Referrer-Policy",
            value: "no-referrer",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self)",
          },
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
