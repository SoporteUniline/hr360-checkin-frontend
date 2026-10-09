/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // El proxy de dev reserva /api/* para el backend anterior. Este alias llega
  // a Next y conserva los handlers y su autenticación en src/app/api.
  async rewrites() {
    return [
      {
        source: "/internal/control-activos/:path*",
        destination: "/api/control-activos/:path*",
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

  async headers() {
    return [
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
