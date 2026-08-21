/**
 * L-00 랜딩 — 06 §6.
 *
 * 이 화면은 **프리랜서 대상**이므로 문장을 쓴다. 무언어 원칙은 클라이언트
 * 화면(/s/{token})에만 적용된다 — 그 구분이 흐려지면 둘 다 망가진다.
 *
 * 페이지 순서가 곧 설득의 순서다.
 *
 *   1. 히어로     겪게 한다. 카드 3장이면 이해된다 — 설명보다 빠르다
 *   2. 문제       겪은 직후에 이름을 붙인다. 번역해도 정보가 0이라는 것
 *   3. 기전       왜 되는지 보여준다. 두 카드가 한 축만 다르다는 사실
 *   4. 결과물     내가 받는 것 / 고객이 하는 것
 *   5. 요금       위험 제거. 받기 전까지 0원
 *   6. 안 하는 것 마켓플레이스 프리랜서의 가장 큰 공포는 계정 정지다
 *   7. 유형 · CTA
 *
 * 후기도, 사용자 수도, 카운트다운도 없다. 빠뜨린 게 아니라 **아직 사용자가
 * 없기 때문**이고(07 §8-6), 없는 걸 있다고 쓰면 초기 20인 모집에서 가장 비싼
 * 실수가 된다. 진짜 숫자가 생기면 그때 넣는다.
 */
import { headers } from 'next/headers'
import Link from 'next/link'
import { LOCALES, LOCALE_INFO, dirOf, serializedPairAt } from '@preflight/core'
import { renderCard, type IconKey } from '@preflight/render'
import { Figure, Icon } from '@preflight/ui'
import { runtime } from './_lib/runtime.ts'
import { landingFor, pickLocale } from './_lib/landing-copy.ts'
import { HeroDemo, type DemoAxis } from './_components/HeroDemo.tsx'

export const dynamic = 'force-dynamic'

/** 데모에 쓸 축 수. 세 장이면 이해된다 — 더 넘기게 하면 이탈이 는다 */
const DEMO_AXES = 3

export default async function Landing({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const rt = await runtime()
  const { lang } = await searchParams
  const locale = pickLocale((await headers()).get('accept-language'), lang)
  const t = landingFor(locale)

  // 슬러그로 고르지 않는다. 유형이 늘 때 이 파일을 고쳐야 하면 07 합격 기준 2가
  // 깨진다 — eslint 가 실제로 이 자리를 잡아냈다.
  const demo = rt.profiles.find((p) =>
    p.blocks.some((b) => b.config.kind === 'PAIRWISE' && b.config.renderer !== 'image'),
  )!
  const taste = demo.blocks.find((b) => b.config.kind === 'PAIRWISE')!
  const config = taste.config
  if (config.kind !== 'PAIRWISE') throw new Error('unexpected')

  const used = config.axes.slice(0, DEMO_AXES)
  const pairs = used.map((_, i) => serializedPairAt(config, i)!)
  const axes: DemoAxis[] = used.map((axis) => ({
    axisKey: axis.nameKey,
    name: rt.dict[axis.nameKey] ?? axis.nameKey,
    a: axis.a.measure,
    b: axis.b.measure,
  }))

  return (
    <div className="lp" lang={locale} dir={dirOf(locale)}>
      <nav className="lp-nav">
        <span className="lp-mark">Preflight</span>
        {/*
          20개를 알약처럼 늘어놓으면 상단바가 무너지고, 코드(ur · bn)로 적으면
          아무도 자기 언어를 못 찾는다. details 로 접되 **자국어 이름**으로 적는다.
          자바스크립트 없이 동작한다 — 느린 기기에서 첫 화면부터 눌려야 한다.
        */}
        <details className="lp-langs">
          <summary aria-label={t.langLabel}>
            <Icon name="globe" size={15} />
            {LOCALE_INFO[locale].nativeName}
          </summary>
          <ul>
            {LOCALES.map((l) => (
              <li key={l}>
                <a
                  href={`/?lang=${l}`}
                  lang={l}
                  dir={LOCALE_INFO[l].dir}
                  aria-current={l === locale ? 'true' : undefined}
                >
                  {LOCALE_INFO[l].nativeName}
                </a>
              </li>
            ))}
          </ul>
        </details>
        {/* 로그인이 없는 제품이라 상단은 "콘솔" 이 아니라 시작 경로여야 한다 */}
        <Link className="lp-nav-cta" href="/pro/signup">
          {t.cta}
        </Link>
      </nav>

      {/* ── 1. 히어로 — 주인공은 문장이 아니라 데모다 ─────────────── */}
      <header className="lp-hero">
        <h1>
          <span>{t.h1a}</span>
          <span className="lp-h1-accent">{t.h1b}</span>
        </h1>
        <p className="lp-sub">{t.sub}</p>
        <HeroDemo
          pairs={pairs}
          axes={axes}
          hint={t.demoHint}
          doneTitle={t.demoDone}
          doneSub={t.demoDoneSub}
          again={t.demoAgain}
          cta={t.cta}
          ctaNote={t.ctaNote}
        />
      </header>

      {/* ── 2. 문제 — 겪은 직후에 이름을 붙인다 ───────────────────── */}
      <section className="lp-sec lp-problem">
        <p className="lp-kicker">{t.probKicker}</p>
        <blockquote className="lp-quote">“{t.probQuote}”</blockquote>
        <div className="lp-zero-row">
          <p className="lp-zero-label">{t.probLabel}</p>
          <p className="lp-zero" aria-label="zero">
            0
          </p>
        </div>
        <p className="lp-kicker lp-kicker-sub">{t.probAfter}</p>
        <ol className="lp-chain">
          <li>{t.probStep1}</li>
          <li>{t.probStep2}</li>
          <li>{t.probStep3}</li>
        </ol>
      </section>

      {/* ── 3. 기전 — 왜 되는지 그림으로 ──────────────────────────── */}
      <section className="lp-sec lp-mech">
        <p className="lp-kicker">{t.mechKicker}</p>
        <h2>{t.mechTitle}</h2>
        <p className="lp-body">{t.mechBody}</p>

        <ul className="lp-axes">
          {used.map((axis, i) => {
            const pair = pairs[i]!
            return (
              <li key={axis.nameKey}>
                <span className="lp-axis-name">{rt.dict[axis.nameKey] ?? axis.nameKey}</span>
                <div className="lp-axis-pair">
                  {pair.pair.map((card) => (
                    <Figure
                      key={card.side}
                      node={renderCard(pair.renderer, card.values, { w: 104, h: 78 })}
                      w={104}
                      h={78}
                    />
                  ))}
                </div>
                {/* measure 는 번역하지 않는다 (02 §3) */}
                <span className="lp-axis-m">
                  {axis.a.measure} <i>/</i> {axis.b.measure}
                </span>
              </li>
            )
          })}
        </ul>
        <p className="lp-caption">{t.mechCaption}</p>
      </section>

      {/* ── 4. 결과물 ─────────────────────────────────────────────── */}
      <section className="lp-sec">
        <p className="lp-kicker">{t.outKicker}</p>
        <div className="lp-two">
          <div className="lp-col lp-col-lead">
            <h3>{t.outYou}</h3>
            <ul className="lp-checks">
              {[t.outYou1, t.outYou2, t.outYou3, t.outYou4].map((line) => (
                <li key={line}>
                  <Icon name="check" size={15} />
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="lp-col">
            <h3>{t.outClient}</h3>
            <ol className="lp-steps-n">
              {[t.outClient1, t.outClient2, t.outClient3].map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* 데모를 건너뛰고 읽어 내려온 사람에게도 여기서 한 번 길을 준다 */}
      <div className="lp-mid">
        <a className="lp-cta" href="/pro/signup">
          {t.cta}
          <Icon name="arrow-right" size={18} />
        </a>
        <p className="lp-cta-note">{t.ctaNote}</p>
      </div>

      {/* ── 5. 요금 — 위험 제거 ───────────────────────────────────── */}
      <section className="lp-sec lp-money">
        <p className="lp-kicker">{t.moneyKicker}</p>
        <h2>{t.moneyTitle}</h2>
        <p className="lp-body">{t.moneyBody}</p>
      </section>

      {/* ── 6. 안 하는 것 — 계정 정지가 이 시장의 가장 큰 공포다 ──── */}
      <section className="lp-sec lp-trust">
        <p className="lp-kicker">{t.trustKicker}</p>
        <h2>{t.trustTitle}</h2>
        <ul className="lp-nos">
          {[
            [t.trust1, t.trust1b],
            [t.trust2, t.trust2b],
            [t.trust3, t.trust3b],
          ].map(([head, body]) => (
            <li key={head}>
              <Icon name="shield" size={18} />
              <b>{head}</b>
              <span>{body}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── 7. 유형 · 최종 CTA ────────────────────────────────────── */}
      <section className="lp-sec">
        <p className="lp-kicker">{t.typesKicker}</p>
        <h2>{t.typesTitle}</h2>
        <ul className="lp-types">
          {rt.profiles.map((p) => (
            <li key={p.slug}>
              <Icon name={(p.blocks[0]?.icon ?? 'grid') as IconKey} size={18} />
              <b>{rt.dict[p.nameKey] ?? p.slug}</b>
              <span data-rev={p.reversibility}>{p.reversibility}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="lp-final">
        <h2>{t.finalTitle}</h2>
        <a className="lp-cta lp-cta-lg" href="/pro/signup">
          {t.finalCta}
          <Icon name="arrow-right" size={20} />
        </a>
        <p className="lp-cta-note">{t.ctaNote}</p>
      </footer>
    </div>
  )
}
