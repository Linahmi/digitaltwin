import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webpack: (config: any) => {
    config.externals.push('pino-pretty', 'encoding')
    return config
  },
}

export default nextConfig
