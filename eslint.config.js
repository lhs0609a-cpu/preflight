import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import tseslint from 'typescript-eslint'

const root = path.dirname(fileURLToPath(import.meta.url))
const norm = (p) => p.split(path.sep).join('/')

/** 프로파일 슬러그는 데이터에서 읽는다. Day 1 에는 비어 있고, 유형이 늘수록 규칙이 강해진다. */
function profileSlugs() {
  const dir = path.join(root, 'packages/profiles/data')
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(readFileSync(path.join(dir, f), 'utf8')).slug)
      .filter(Boolean)
  } catch {
    return []
  }
}

const SLUGS = new Set(profileSlugs())
const REVERSIBILITY = new Set(['cheap', 'gated', 'outcome'])

/**
 * 로컬 규칙 2종 — 12 §7.2.
 *
 * 슬러그로 분기하는 코드가 한 줄만 생겨도 그 이후 모든 유형이 코드를 요구한다.
 * 합격 기준 2는 그렇게 조용히 깨진다.
 */
const preflight = {
  rules: {
    'no-profile-slug-branch': {
      meta: {
        type: 'problem',
        docs: { description: '거래 유형 슬러그로 분기하지 않는다 (07 합격 기준 2)' },
        schema: [],
        messages: {
          slug:
            '프로파일 슬러그 "{{slug}}" 로 분기하고 있다. ' +
            '유형별 동작은 프로파일 데이터로 표현하라 — 분기가 한 줄 생기면 그 이후 모든 유형이 코드를 요구한다.',
        },
      },
      create(context) {
        const file = norm(context.filename ?? '')
        const guarded = file.includes('/apps/') || file.includes('/packages/core/')
        if (!guarded || SLUGS.size === 0) return {}

        // 문자열이 등장하는 것 자체는 문제가 아니다.
        // 렌더러 id 처럼 슬러그와 이름이 겹치는 값이 정당하게 존재한다 (08 §1).
        // 잡아야 하는 것은 **분기**다.
        const report = (node, slug) => context.report({ node, messageId: 'slug', data: { slug } })
        const check = (node) => {
          if (node && node.type === 'Literal' && typeof node.value === 'string' && SLUGS.has(node.value)) {
            report(node, node.value)
          }
        }
        return {
          BinaryExpression(node) {
            if (!['===', '!==', '==', '!='].includes(node.operator)) return
            check(node.left)
            check(node.right)
          },
          SwitchCase(node) {
            check(node.test)
          },
        }
      },
    },

    'no-reversibility-branch': {
      meta: {
        type: 'problem',
        docs: {
          description: 'reversibility 분기는 policy 표 한 곳에만 둔다 (07 합격 기준 4)',
        },
        schema: [],
        messages: {
          branch:
            'reversibility "{{value}}" 로 분기하고 있다. packages/core/src/policy 의 표에 넣어라.',
        },
      },
      create(context) {
        const file = norm(context.filename ?? '')
        if (file.includes('/packages/core/src/policy/')) return {}
        if (file.includes('/packages/core/src/profile/')) return {}
        if (file.endsWith('.test.ts')) return {}
        return {
          BinaryExpression(node) {
            if (!['===', '!==', '==', '!='].includes(node.operator)) return
            for (const side of [node.left, node.right]) {
              if (side.type === 'Literal' && REVERSIBILITY.has(side.value)) {
                context.report({ node, messageId: 'branch', data: { value: side.value } })
              }
            }
          },
        }
      },
    },
  },
}

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', 'packages/profiles/*.json'] },
  ...tseslint.configs.recommended,
  {
    plugins: { preflight },
    rules: {
      'preflight/no-profile-slug-branch': 'error',
      'preflight/no-reversibility-branch': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
)
