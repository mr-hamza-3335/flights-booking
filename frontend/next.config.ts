import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "logos.skyscnr.com" },
      { protocol: "https", hostname: "**.airline.com" },
    ],
  },
  async redirects() {
    return [
      { source: "/login",    destination: "/auth/login",   permanent: true },
      { source: "/register", destination: "/auth/signup",  permanent: true },
      { source: "/signup",   destination: "/auth/signup",  permanent: true },
      { source: "/admin/dashboard", destination: "/admin", permanent: false },
    ];
  },
  // Ensure API URL is available at build time
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api",
  },
};

export default nextConfig;
