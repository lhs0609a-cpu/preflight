/**
 * 프리랜서 온보딩 — P-01 · FR-1.
 *
 * G-2 (09 §6): 마켓플레이스 자격증명(ID/PW) 입력 필드를 제품 어디에도 두지
 * 않는다. 이 서비스에 그런 메서드가 없고, 앞으로도 만들지 않는다.
 * 계정 공유는 정지 사유이며 손해는 우리가 아니라 고객이 본다.
 *
 * NFR-5.4: 카드 정보를 자체 저장하지 않는다. PG 가 발급한 빌링키만 받는다.
 */
import { invariant, LOCALES, type Locale } from '@preflight/core'
import type { Pro, ProStore } from './store.ts'

export interface SignupInput {
  readonly email: string
  readonly displayName: string
  readonly locale: string
  /** 03 §2.1 — 알림 발송 시각 계산에 쓴다. 시차가 이 제품의 핵심이라 필수 */
  readonly timezone: string
}

export interface BillingInput {
  /** PG 사 식별자 */
  readonly provider: string
  /** PG 가 발급한 빌링키. 카드 번호가 아니다 */
  readonly billingKey: string
  readonly brand?: string
  readonly last4?: string
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u

export class ProService {
  constructor(
    private readonly pros: ProStore,
    private readonly newId: () => string,
  ) {}

  async signup(input: SignupInput): Promise<Pro> {
    invariant(EMAIL.test(input.email), 'EMAIL_INVALID', input.email)
    invariant(input.displayName.trim().length > 0, 'NAME_REQUIRED')
    invariant((LOCALES as readonly string[]).includes(input.locale), 'LOCALE_UNSUPPORTED', input.locale)
    assertTimezone(input.timezone)

    const existing = await this.pros.byEmail?.(input.email)
    invariant(existing === undefined, 'EMAIL_TAKEN', input.email)

    const pro: Pro = {
      id: this.newId(),
      email: input.email,
      displayName: input.displayName.trim(),
      locale: input.locale as Locale,
      timezone: input.timezone,
      state: 'ACTIVE',
      // FR-1.4 — 가입 직후에는 링크를 발급할 수 없다. 빌링키가 먼저다.
      billingVerified: false,
    }
    await this.pros.put(pro)
    return pro
  }

  async setLocale(id: string, locale: string): Promise<Pro> {
    invariant((LOCALES as readonly string[]).includes(locale), 'LOCALE_UNSUPPORTED', locale)
    const pro = await this.#require(id)
    const next = { ...pro, locale }
    await this.pros.put(next)
    return next
  }

  /**
   * 03 §2.2 — 빌링키만 보관한다. 카드 원번호는 어떤 형태로도 받지 않는다.
   * 등록되면 그때부터 링크 발급이 열린다.
   */
  async registerBilling(id: string, input: BillingInput): Promise<Pro> {
    invariant(input.provider.trim().length > 0, 'PG_PROVIDER_REQUIRED')
    invariant(input.billingKey.trim().length > 0, 'BILLING_KEY_REQUIRED')
    invariant(!/^\d{12,19}$/u.test(input.billingKey.replace(/[\s-]/gu, '')), 'LOOKS_LIKE_CARD_NUMBER')

    const pro = await this.#require(id)
    const next = { ...pro, billingVerified: true }
    await this.pros.put(next)
    return next
  }

  async byId(id: string): Promise<Pro | undefined> {
    return this.pros.byId(id)
  }

  async #require(id: string): Promise<Pro> {
    const pro = await this.pros.byId(id)
    invariant(pro !== undefined, 'UNAUTHORIZED', id)
    return pro
  }
}

export function assertTimezone(tz: string): void {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz })
  } catch {
    invariant(false, 'TIMEZONE_INVALID', tz)
  }
}
