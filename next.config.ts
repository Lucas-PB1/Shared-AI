import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Pacotes em packages/cursor usam imports ESM com sufixo .js apontando para .ts
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
};

export default nextConfig;
