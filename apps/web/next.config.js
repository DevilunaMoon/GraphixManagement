/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["database"],
  serverExternalPackages: ["@prisma/client", "bcryptjs", "pg"],
};

export default nextConfig;
