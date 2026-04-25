import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webpack: (config: any) => {
    // better-sqlite3 is a native Node addon — exclude from webpack bundle
    config.externals.push('pino-pretty', 'encoding', 'better-sqlite3')
    return config
  },
}

export default nextConfig
