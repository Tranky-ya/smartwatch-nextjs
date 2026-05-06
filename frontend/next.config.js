/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true
  },
  async rewrites() {
    const apiProxyUrl = process.env.API_PROXY_URL;
    if (!apiProxyUrl) return [];

    return [
      {
        source: '/api/:path*',
        destination: `${apiProxyUrl}/api/:path*`
      }
    ];
  }
}

module.exports = nextConfig
