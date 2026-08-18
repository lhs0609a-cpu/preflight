/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  // 워크스페이스 패키지를 소스 그대로 가져온다. 빌드 산출물을 따로 만들지 않는다.
  transpilePackages: [
    '@preflight/catalog',
    '@preflight/core',
    '@preflight/render',
    '@preflight/session',
    '@preflight/tokens',
    '@preflight/ui',
  ],
  typescript: { ignoreBuildErrors: true },
}
