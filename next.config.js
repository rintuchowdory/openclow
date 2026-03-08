/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  }
}

module.exports = {
  allowedDevOrigins: ['local-origin.dev', '*.local-origin.dev'],
}
