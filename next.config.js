/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Enable experimental features for Web Bluetooth and WebGL
  experimental: {
    // Optimize for client-side rendering
    optimizePackageImports: ['three', '@react-three/fiber', '@react-three/drei'],
  },

  // Webpack configuration for Web Bluetooth API support
  webpack: (config, { isServer }) => {
    // Don't resolve 'fs' module on the client to prevent errors
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Add Web Bluetooth API polyfill/support
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
    };

    // Handle Web Audio API and Bluetooth in the browser
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      exclude: /node_modules/,
      use: ['raw-loader'],
    });

    // Enable WebAssembly support for audio processing
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    return config;
  },

  // Headers for Web Bluetooth API
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },

  // Image optimization
  images: {
    domains: [],
    formats: ['image/avif', 'image/webp'],
  },

  // Production source maps for debugging
  productionBrowserSourceMaps: true,
};

module.exports = nextConfig;
