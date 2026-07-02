/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    '192.168.1.39:3000',
    '192.168.1.39',
    'localhost:3000',
    '*.nip.io:3000',
    '*.nip.io',
  ],
  turbopack: {},
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false };
    return config;
  },
};

export default nextConfig;
