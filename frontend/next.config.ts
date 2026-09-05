import type { NextConfig } from "next";

const apiUrl = (
  process.env.API_INTERNAL_URL || "http://localhost:8000"
).replace(/\/$/, "");

const config: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default config;
