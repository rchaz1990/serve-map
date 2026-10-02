import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    return [
      // Jack/product docs sometimes link /manager or /managers/login;
      // real manager auth lives under /restaurant/*
      {
        source: "/manager",
        destination: "/restaurant/login",
        permanent: false,
      },
      {
        source: "/manager/:path*",
        destination: "/restaurant/login",
        permanent: false,
      },
      {
        source: "/managers/login",
        destination: "/restaurant/login",
        permanent: false,
      },
      {
        source: "/managers/:path*",
        destination: "/restaurant/login",
        permanent: false,
      },
      // Typo / plural of the restaurant waitlist signup
      {
        source: "/waitlists",
        destination: "/waitlist",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
