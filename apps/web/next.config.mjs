import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(HERE, '../..')

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

  // 모노레포 루트까지 추적한다. 안 잡으면 apps/web 밖 파일이 번들에서 빠진다.
  outputFileTracingRoot: REPO_ROOT,

  /**
   * 프로파일·로케일은 **런타임에 fs 로 읽는다** — 유형 추가가 데이터만으로
   * 끝나야 하기 때문이다 (07 합격 기준 2). 정적 import 로 바꾸면 목록을 담은
   * index 파일이 생기고 유형마다 코드를 고쳐야 한다.
   *
   * 대신 번들러가 그 읽기를 볼 수 없어 서버리스 번들에서 파일이 통째로 빠진다.
   * 실제로 첫 배포에서 500 이 났고 원인이 이것이었다. 명시적으로 포함시킨다.
   */
  outputFileTracingIncludes: {
    '/**': [
      '../../packages/profiles/data/**',
      '../../packages/core/locales/**',
      '../../packages/db/migrations/**',
    ],
  },

  typescript: { ignoreBuildErrors: true },
}
