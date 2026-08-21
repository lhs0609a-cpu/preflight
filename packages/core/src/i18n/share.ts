/**
 * 공유 문구 — FR-3.3 · 09 §2.1.
 *
 * 프리랜서가 마켓플레이스 채팅에 **붙여넣는** 한 줄이다. 우리가 보내지 않는다.
 *
 * 이것만 다른 사전과 대상이 다르다. 콘솔 문구는 프리랜서가 읽고, 라벨은
 * 사양서에 들어가지만, 이 문장은 **고객**이 읽는다. 그래서 프리랜서의 로케일이
 * 아니라 **고객의 언어**로 뽑아야 하고, 그 언어를 아는 사람은 프리랜서뿐이라
 * 발급 화면에서 고르게 한다.
 *
 * 링크를 열면 그 뒤는 무언어라 언어가 필요 없다. 필요한 건 딱 여기까지다 —
 * "눌러도 되는 링크다, 오래 안 걸린다" 두 가지.
 *
 * ⚠ 비영어 19종은 원어민 검수 전이다 (07 §5.3).
 */
import { LOCALES, type Locale } from './labels.ts'

const TEXT: Readonly<Record<Locale, string>> = Object.freeze({
  en: 'Before we start, please pick a few options here — takes 5 minutes:',
  ko: '시작하기 전에 여기서 몇 가지만 골라주세요 — 5분이면 됩니다:',
  ja: '始める前に、ここでいくつか選んでください — 5分で終わります:',
  'zh-CN': '开工之前，请在这里选几项 — 五分钟就好：',
  hi: 'शुरू करने से पहले यहाँ कुछ विकल्प चुन लीजिए — 5 मिनट लगेंगे:',
  bn: 'শুরু করার আগে এখানে কয়েকটি বেছে নিন — ৫ মিনিট লাগবে:',
  ur: 'شروع کرنے سے پہلے یہاں چند چیزیں چن لیں — ۵ منٹ لگیں گے:',
  tl: 'Bago tayo magsimula, pumili lang po ng ilang bagay dito — 5 minuto lang:',
  vi: 'Trước khi bắt đầu, bạn chọn giúp vài mục ở đây nhé — chỉ 5 phút:',
  th: 'ก่อนเริ่มงาน รบกวนเลือกไม่กี่ข้อตรงนี้ — ใช้เวลา 5 นาที:',
  id: 'Sebelum mulai, tolong pilih beberapa opsi di sini — cuma 5 menit:',
  ar: 'قبل أن نبدأ، اختر بعض الخيارات هنا — تستغرق ٥ دقائق:',
  tr: 'Başlamadan önce buradan birkaç seçim yapar mısınız — 5 dakika sürüyor:',
  ru: 'Перед началом выберите здесь несколько вариантов — займёт 5 минут:',
  uk: 'Перед початком оберіть тут кілька варіантів — займе 5 хвилин:',
  pl: 'Zanim zaczniemy, wybierz tu kilka opcji — zajmie 5 minut:',
  de: 'Bevor wir starten, wähle hier bitte ein paar Optionen — dauert 5 Minuten:',
  fr: 'Avant de commencer, choisissez quelques options ici — 5 minutes suffisent :',
  es: 'Antes de empezar, elige aquí algunas opciones — son 5 minutos:',
  'pt-BR': 'Antes de começar, escolha algumas opções aqui — leva 5 minutos:',
})

/**
 * 붙여넣을 한 줄. 링크는 항상 문장 뒤에 온다 — 채팅 앱들이 마지막 URL 을
 * 미리보기로 잡는 경우가 많고, 문장 중간에 두면 잘려 보이기도 한다.
 */
export function shareTextFor(locale: string, url: string): string {
  const key = (LOCALES as readonly string[]).includes(locale) ? (locale as Locale) : 'en'
  return `${TEXT[key]} ${url}`
}

/** 발급 화면이 고를 수 있는 목록. 로케일이 늘면 여기도 따라 는다 */
export const SHARE_LOCALES = LOCALES
