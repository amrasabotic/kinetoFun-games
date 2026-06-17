/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  reactStrictMode: false,
  output: 'export',
  trailingSlash: true,
  ...(isProd && {
    basePath: '/games/mouth-open-catch/out',
    assetPrefix: '/games/mouth-open-catch/out',
  }),
};

module.exports = nextConfig;
