import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '../..');
loadEnvConfig(rootDir);
loadEnvConfig(dirname(fileURLToPath(import.meta.url)));

const nextConfig: NextConfig = {};

export default nextConfig;
