/** @type {import('next').NextConfig} */
const nextConfig = {
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
};

export default nextConfig;
