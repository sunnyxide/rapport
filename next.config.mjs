/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  // Bundle the runtime-read assets into the serverless functions (Vercel FS is
  // read-only at runtime): the synthesis prompt + the seed demo caches.
  outputFileTracingIncludes: {
    "/api/persona": ["./prompts/**", "./data/cache/**"],
    "/api/me": ["./prompts/**", "./data/cache/**"],
    "/api/chemistry": ["./prompts/**", "./data/cache/**"],
    "/api/reports": ["./data/cache/**"],
    "/api/ask": ["./data/cache/**"],
    "/r/[slug]": ["./data/cache/**"],
  },
};

export default nextConfig;
