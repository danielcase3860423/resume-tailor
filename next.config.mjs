/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // output: 'export',
  compiler: {
    // emotion: false,
    styledComponents: true
  },
  experimental: {
    // instrumentationHook: true,
    esmExternals: 'loose', // <-- add this
    serverComponentsExternalPackages: ['mongoose'] // <-- and this
  },

  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          // { key: 'Access-Control-Allow-Origin', value: 'https://topdevsllc.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, create-by, x-pathname, authorization'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
