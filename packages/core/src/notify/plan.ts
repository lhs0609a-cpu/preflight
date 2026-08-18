/**
 * 알림 시각 계산 — FR-12.3 · 05 §12.
 *
 * 시차가 이 제품의 핵심 가치다 (00 §1.2 — 왕복 1회 비용이 국경 간에서는 하루).
 * 클라이언트가 자기 낮에 카드를 넘기면 프리랜서는 자고 있다. 그 이벤트를
 * 새벽 3시에 푸시하면 도구가 아니라 방해가 된다.
 *
 * 취침 시간대 이벤트는 **버리지 않고 묶어** 기상 시각에 보낸다.
 * 시계를 주입받지 않는다 — ISO 시각을 받는다. 순수하게 유지하기 위해서다.
 */
import { invariant } from '../invariant.ts'

export const NOTIFY_KINDS = [
  'link.opened',
  'block.settled',
  'spec.settled',
  'request.submitted',
  'contract.matched',
  'invoice.notified',
] as const
export type NotifyKind = (typeof NOTIFY_KINDS)[number]

export interface QuietHours {
  /** 프리랜서 타임존 기준 'HH:MM' */
  readonly from: string
  readonly to: string
  readonly mode: 'digest' | 'silent'
}

export type Plan =
  | { readonly deliver: 'now' }
  /** 조용한 시간대 — 기상 시각에 묶어서 */
  | { readonly deliver: 'digest'; readonly atUtcIso: string }
  | { readonly deliver: 'drop' }

function parseHhmm(s: string): number {
  const m = /^(\d{2}):(\d{2})$/u.exec(s)
  invariant(m !== null, 'QUIET_HOURS_FORMAT', s)
  const h = Number(m![1])
  const min = Number(m![2])
  invariant(h < 24 && min < 60, 'QUIET_HOURS_RANGE', s)
  return h * 60 + min
}

/** 주어진 UTC 시각의 해당 타임존 로컬 분(minute of day)과 날짜 문자열. */
export function localParts(atUtcIso: string, timeZone: string): { minutes: number; date: string } {
  const d = new Date(atUtcIso)
  invariant(!Number.isNaN(d.getTime()), 'BAD_TIMESTAMP', atUtcIso)
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]))
  const hour = Number(parts['hour'] === '24' ? '00' : parts['hour'])
  return {
    minutes: hour * 60 + Number(parts['minute']),
    date: `${parts['year']}-${parts['month']}-${parts['day']}`,
  }
}

function inQuiet(minutes: number, from: number, to: number): boolean {
  // 23:00 ~ 07:00 처럼 자정을 넘는 구간이 정상이다
  return from <= to ? minutes >= from && minutes < to : minutes >= from || minutes < to
}

/** 로컬 날짜/분 → UTC ISO. 타임존 오프셋을 역산한다. */
function localToUtcIso(date: string, minutes: number, timeZone: string): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0')
  const m = String(minutes % 60).padStart(2, '0')
  const naive = new Date(`${date}T${h}:${m}:00Z`)
  // naive 를 해당 타임존으로 읽었을 때의 값과 비교해 오프셋을 얻는다
  const probe = localParts(naive.toISOString(), timeZone)
  const probeMinutes = probe.minutes + (probe.date > date ? 1440 : probe.date < date ? -1440 : 0)
  const offset = probeMinutes - minutes
  return new Date(naive.getTime() - offset * 60_000).toISOString()
}

export interface PlanInput {
  readonly atUtcIso: string
  readonly timezone: string
  readonly quietHours?: QuietHours | undefined
  /** 이 종류는 조용한 시간에도 즉시 보낼 것인가 */
  readonly urgent?: boolean | undefined
}

export function deliveryPlan(input: PlanInput): Plan {
  const quiet = input.quietHours
  if (quiet === undefined || input.urgent === true) return { deliver: 'now' }

  const from = parseHhmm(quiet.from)
  const to = parseHhmm(quiet.to)
  const { minutes, date } = localParts(input.atUtcIso, input.timezone)

  if (!inQuiet(minutes, from, to)) return { deliver: 'now' }
  if (quiet.mode === 'silent') return { deliver: 'drop' }

  // 기상 시각(to). 자정을 넘겼으면 다음 날 아침이다.
  const wakesNextDay = from > to ? minutes >= from : false
  const day = wakesNextDay ? nextDay(date) : date
  return { deliver: 'digest', atUtcIso: localToUtcIso(day, to, input.timezone) }
}

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

export interface Notification {
  readonly kind: NotifyKind
  readonly sessionNo: string
  readonly atUtcIso: string
  /** i18n 키. 알림 문안도 프리랜서 로케일로 렌더된다 */
  readonly summaryKey: string
  readonly detail?: Readonly<Record<string, string | number>> | undefined
}

/** 05 §12 — 취침 시간대 이벤트는 요약으로 묶는다. 버리지 않는다. */
export function groupDigest(
  items: readonly { notification: Notification; plan: Plan }[],
): Map<string, Notification[]> {
  const byTime = new Map<string, Notification[]>()
  for (const { notification, plan } of items) {
    if (plan.deliver !== 'digest') continue
    const list = byTime.get(plan.atUtcIso) ?? []
    list.push(notification)
    byTime.set(plan.atUtcIso, list)
  }
  return byTime
}
