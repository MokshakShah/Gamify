/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Optimize package imports for faster builds
    optimizePackageImports: ['lucide-react', '@clerk/nextjs'],
  },
  // Enable compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },
};

module.exports = nextConfig;