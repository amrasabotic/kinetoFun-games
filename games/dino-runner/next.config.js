/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  reactStrictMode: false,
  output: 'export',
  trailingSlash: true,
  ...(isProd && {
    basePath: '/games/dino-runner/out',
    assetPrefix: '/games/dino-runner/out',
  }),
};

module.exports = nextConfig;
