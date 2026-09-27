import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  agentRules: false,
  // Environment variables are injected by Vercel at runtime. Excluding local
  // dotenv files keeps output tracing from requiring ignored secret files in
  // a prebuilt deployment artifact.
  outputFileTracingExcludes: {
    '/*': ['.env*'],
  },
};

export default nextConfig;
