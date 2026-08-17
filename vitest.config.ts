import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@preflight/core': r('./packages/core/src/index.ts'),
      '@preflight/render': r('./packages/render/src/index.ts'),
      '@preflight/tokens': r('./packages/tokens/src/index.ts'),
      '@preflight/testkit': r('./packages/testkit/src/index.ts'),
    },
  },
  test: {
    include: ['packages/**/*.test.ts', 'tools/**/*.test.ts'],
    environment: 'node',
  },
})
