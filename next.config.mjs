/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // El proxy de dev reserva /api/* para el backend anterior. Este alias llega
  // a Next y conserva los handlers y su autenticación en src/app/api.
  async rewrites() {
    return [
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
        source: "/models/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
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
