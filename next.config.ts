import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Konva resolves to browser build and prevent 'canvas' from being required on server
  webpack: (config, { isServer }) => {
    config.resolve = config.resolve || {};
    // Do NOT alias 'konva' (react-konva imports its subpaths). Only disable 'canvas' resolution.
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
    };

    // Prevent attempting to polyfill/resolve 'canvas'
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      canvas: false,
    };

    return config;
  },
};

export default nextConfig;
