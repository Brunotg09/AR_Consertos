/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  env: {
    ARC_SYS_GATEWAY_ENDPOINT: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    ARC_SYS_CLIENT_PASSKEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
};

module.exports = nextConfig;
