/**
 * L-00 랜딩 — 06 §6.
 *
 * 이 화면은 **프리랜서 대상**이므로 문장을 쓴다. 무언어 원칙은 클라이언트
 * 화면(/s/{token})에만 적용된다 — 그 구분이 흐려지면 둘 다 망가진다.
 *
 * 히어로에서 카드가 그 자리에서 굴러가는 것이 핵심이다. 이 제품은 설명이
 * 어렵고 체험이 쉽다. 카드 3장 넘기면 이해된다.
 */
import Link from 'next/link'
import { runtime } from './_lib/runtime.ts'
import { HeroDemo } from './_components/HeroDemo.tsx'
import { serializedPairAt } from '@preflight/core'

export const dynamic = 'force-dynamic'

export default function Landing() {
  const rt = runtime()
  // 슬러그로 고르지 않는다. 유형이 늘 때 이 파일을 고쳐야 하면 07 합격 기준 2가
  // 깨진다 — eslint 가 실제로 이 자리를 잡아냈다.
  const demo = rt.profiles.find((p) =>
    p.blocks.some((b) => b.config.kind === 'PAIRWISE' && b.config.renderer !== 'image'),
  )!
  const taste = demo.blocks.find((b) => b.config.kind === 'PAIRWISE')!
  const config = taste.config
  if (config.kind !== 'PAIRWISE') throw new Error('unexpected')

  const pairs = config.axes.map((_, i) => serializedPairAt(config, i)!)

  return (
    <div className="lp">
      <header className="lp-hero">
        <p className="lp-eyebrow">Preflight</p>
        <h1>Agree before you start.<br />In any language.</h1>
        <p className="lp-sub">
          Your client picks. You get numbers. No English required — on either side.
        </p>
        <HeroDemo pairs={pairs} />
        <p className="lp-hint">Try it — pick whichever you prefer.</p>
      </header>

      <section className="lp-band">
        <div className="lp-compare">
          <div>
            <p className="lp-k">Translated perfectly</p>
            <p className="lp-quote">&ldquo;make it more premium&rdquo;</p>
            <p className="lp-k">Information you can act on</p>
            <p className="lp-zero">0</p>
          </div>
          <div>
            <p className="lp-k">Picked, not described</p>
            <ul className="lp-spec">
              <li><span>Spacing</span><b>padding 32px</b></li>
              <li><span>Saturation</span><b>#7E8F86 · 11%</b></li>
              <li><span>Type</span><b>serif</b></li>
            </ul>
          </div>
        </div>
      </section>

      <section className="lp-types">
        <h2>Trade types</h2>
        <ul>
          {rt.profiles.map((p) => (
            <li key={p.slug}>
              <b>{rt.dict[p.nameKey] ?? p.slug}</b>
              <span>{p.reversibility}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="lp-foot">
        <p>Free until you get paid.</p>
        <Link className="lp-cta" href="/pro">
          Open the freelancer console
        </Link>
      </footer>
    </div>
  )
}
