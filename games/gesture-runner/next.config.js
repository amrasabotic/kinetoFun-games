/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: 'export',
  trailingSlash: true,
  // Serve the exported 'out/' folder from the root static server at this path.
  // Matches: http://localhost:8080/games/gesture-runner/out/
  basePath: '/games/gesture-runner/out',
  assetPrefix: '/games/gesture-runner/out',
};

module.exports = nextConfig;
