/**
 * 랜딩 문구 — L-00 · 06 §6.
 *
 * 랜딩을 8개 로케일로 두는 이유는 균형이 아니다. **영어를 못 읽는 사람을 위한
 * 제품의 랜딩이 영어 전용이면 그 자체로 모순**이고, 우리가 모으려는 프리랜서가
 * 정확히 그 사람들이다 (07 §5.3 · 5개국 15인).
 *
 * ── 카피 원칙 ────────────────────────────────────────────────────────
 *
 * 1. **먼저 겪게 한다.** 이 제품은 설명이 어렵고 체험이 쉽다. 카드 3장 넘기면
 *    이해된다. 그래서 히어로의 주인공은 문장이 아니라 데모다. 카피는 체험
 *    **뒤에** 온다 — 그때는 설득이 아니라 방금 겪은 것의 이름 붙이기가 된다.
 *
 * 2. **손실은 진짜만 쓴다.** "시안 3번 엎어짐" 은 이 시장의 실제 비용이다.
 *    숫자를 지어내지 않는다.
 *
 * 3. **가짜 사회적 증거를 만들지 않는다.** 후기·사용자 수·카운트다운이 여기
 *    없는 것은 빠뜨린 게 아니다. 아직 사용자가 없고(07 §8-6), 없는 것을
 *    있다고 쓰면 초기 20인 모집에서 가장 비싼 실수가 된다. 진짜 숫자가 생기면
 *    그때 넣는다.
 *
 * 4. **안 하는 것을 말한다.** 마켓플레이스 프리랜서의 가장 큰 공포는 계정
 *    정지다. "자동 전송을 만들지 않는다" 는 우리 원칙이자 그들의 안심이다.
 *    이건 마케팅 문구가 아니라 사실이라 강하다.
 */
import { LOCALES, type Locale } from '@preflight/core'

export interface Landing {
  navHow: string
  navPricing: string
  navSignin: string

  h1a: string
  h1b: string
  sub: string
  demoHint: string
  demoDone: string
  demoDoneSub: string
  demoAgain: string
  cta: string
  ctaNote: string

  probKicker: string
  probQuote: string
  probLabel: string
  probAfter: string
  probStep1: string
  probStep2: string
  probStep3: string

  mechKicker: string
  mechTitle: string
  mechBody: string
  mechCaption: string

  outKicker: string
  outYou: string
  outYou1: string
  outYou2: string
  outYou3: string
  outYou4: string
  outClient: string
  outClient1: string
  outClient2: string
  outClient3: string

  moneyKicker: string
  moneyTitle: string
  moneyBody: string

  trustKicker: string
  trustTitle: string
  trust1: string
  trust1b: string
  trust2: string
  trust2b: string
  trust3: string
  trust3b: string

  typesKicker: string
  typesTitle: string

  finalTitle: string
  finalCta: string
  langLabel: string
}

const en: Landing = {
  navHow: 'How it works',
  navPricing: 'Pricing',
  navSignin: 'Console',

  h1a: 'Stop explaining.',
  h1b: 'Let them pick.',
  sub: 'Your client taps a few cards. You get numbers you can build from. Try it right here — nothing to sign up for.',
  demoHint: 'Tap a card',
  demoDone: 'That was it.',
  demoDoneSub: 'Your client does this in five minutes. No account, no app, no English.',
  demoAgain: 'Again',
  cta: 'Start free',
  ctaNote: 'No card number · Nothing to pay until you close a deal',

  probKicker: 'The problem',
  probQuote: 'make it more premium',
  probLabel: 'Information you can act on, after a perfect translation',
  probAfter: 'So what actually happens',
  probStep1: 'Three rejected drafts',
  probStep2: 'Rework you are not paid for',
  probStep3: 'A dispute, then a low rating',

  mechKicker: 'Why it works',
  mechTitle: 'The two cards differ in exactly one thing.',
  mechBody:
    'So your client never has to work out what is different. They just pick the one they like. That single tap is locked in as a number — and numbers do not need translating.',
  mechCaption: 'One axis at a time. Spacing, then colour, then type.',

  outKicker: 'What comes out',
  outYou: 'What you get',
  outYou1: 'A spec sheet with no language in it',
  outYou2: 'Amount, timeline, revisions — agreed',
  outYou3: 'Offer text ready to paste',
  outYou4: 'A hash that proves what was agreed',
  outClient: 'What your client does',
  outClient1: 'Opens a link',
  outClient2: 'Taps cards for five minutes',
  outClient3: 'Done — no signup, no app',

  moneyKicker: 'Pricing',
  moneyTitle: 'Free until you get paid.',
  moneyBody:
    'Signing up costs nothing. A fee applies only after a deal closes. We never store card numbers — only the token your payment provider issues.',

  trustKicker: 'What we refuse to build',
  trustTitle: 'Three things we will never do.',
  trust1: 'Never ask for your marketplace login',
  trust1b: 'There is no field for it. Account sharing gets you banned, and you carry that loss, not us.',
  trust2: 'Never send anything for you',
  trust2b: 'Copy button only. Automated messages get accounts suspended, so we do not offer it — even when asked.',
  trust3: 'Never make your client sign up',
  trust3b: 'One link. No account, no download, works on a slow phone.',

  typesKicker: 'Trade types',
  typesTitle: 'Four today. Adding one takes no code.',

  finalTitle: 'Close your next job without writing a word of English.',
  finalCta: 'Start free — takes 2 minutes',
  langLabel: 'Language',
}

const ko: Landing = {
  navHow: '작동 방식',
  navPricing: '요금',
  navSignin: '콘솔',

  h1a: '설명하지 마세요.',
  h1b: '고르게 하세요.',
  sub: '고객은 카드 몇 장만 누릅니다. 당신은 바로 작업할 수 있는 숫자를 받습니다. 지금 여기서 해보세요 — 가입 없습니다.',
  demoHint: '카드를 눌러보세요',
  demoDone: '방금 한 일이 그겁니다.',
  demoDoneSub: '고객은 이걸 5분이면 끝냅니다. 계정도, 앱도, 영어도 필요 없습니다.',
  demoAgain: '다시',
  cta: '무료로 시작',
  ctaNote: '카드 번호 없이 · 계약이 성사될 때까지 0원',

  probKicker: '문제',
  probQuote: '조금 더 고급스럽게 해주세요',
  probLabel: '완벽하게 번역했을 때 얻는, 실행 가능한 정보',
  probAfter: '그래서 실제로 벌어지는 일',
  probStep1: '시안 세 번 반려',
  probStep2: '돈 못 받는 재작업',
  probStep3: '분쟁, 그리고 낮은 평점',

  mechKicker: '작동 원리',
  mechTitle: '두 카드는 딱 한 가지만 다릅니다.',
  mechBody:
    '그래서 고객은 무엇이 다른지 알아낼 필요가 없습니다. 끌리는 쪽을 누르기만 하면 됩니다. 그 한 번의 선택이 곧바로 수치로 고정되고, 수치는 번역이 필요 없습니다.',
  mechCaption: '한 번에 한 축씩. 여백, 그다음 색, 그다음 서체.',

  outKicker: '결과물',
  outYou: '당신이 받는 것',
  outYou1: '언어가 들어가지 않은 사양서',
  outYou2: '합의된 금액 · 기간 · 수정 횟수',
  outYou3: '붙여넣기만 하면 되는 오퍼 문구',
  outYou4: '무엇을 합의했는지 증명하는 해시',
  outClient: '고객이 하는 것',
  outClient1: '링크를 연다',
  outClient2: '5분 동안 카드를 누른다',
  outClient3: '끝 — 가입도 앱도 없음',

  moneyKicker: '요금',
  moneyTitle: '돈을 받기 전까지는 무료입니다.',
  moneyBody:
    '가입에는 아무 비용이 들지 않습니다. 수수료는 계약이 성사된 뒤에만 붙습니다. 카드 번호는 저장하지 않습니다 — PG 사가 발급한 토큰만 보관합니다.',

  trustKicker: '만들지 않는 것',
  trustTitle: '절대 하지 않을 세 가지.',
  trust1: '마켓플레이스 로그인을 묻지 않습니다',
  trust1b: '입력란 자체가 없습니다. 계정 공유는 정지 사유이고, 그 손해는 우리가 아니라 당신이 봅니다.',
  trust2: '대신 보내주지 않습니다',
  trust2b: '복사 버튼만 있습니다. 자동 발송은 계정 정지를 부르기 때문에, 요청이 와도 만들지 않습니다.',
  trust3: '고객에게 가입을 요구하지 않습니다',
  trust3b: '링크 하나면 됩니다. 계정도 설치도 없고, 느린 휴대폰에서도 열립니다.',

  typesKicker: '거래 유형',
  typesTitle: '지금 넷. 하나 더 늘리는 데 코드가 필요 없습니다.',

  finalTitle: '다음 계약은 영어 한 줄 없이 확정하세요.',
  finalCta: '무료로 시작 — 2분',
  langLabel: '언어',
}

const es: Landing = {
  ...en,
  navHow: 'Cómo funciona',
  navPricing: 'Precios',
  navSignin: 'Consola',
  h1a: 'Deja de explicar.',
  h1b: 'Que elijan ellos.',
  sub: 'Tu cliente toca unas cartas. Tú recibes números con los que puedes trabajar. Pruébalo aquí mismo — sin registrarte.',
  demoHint: 'Toca una carta',
  demoDone: 'Eso era todo.',
  demoDoneSub: 'Tu cliente lo hace en cinco minutos. Sin cuenta, sin app, sin inglés.',
  demoAgain: 'Otra vez',
  cta: 'Empezar gratis',
  ctaNote: 'Sin número de tarjeta · No pagas nada hasta cerrar un trabajo',
  probKicker: 'El problema',
  probQuote: 'hazlo más premium',
  probLabel: 'Información accionable, tras una traducción perfecta',
  probAfter: 'Lo que pasa de verdad',
  probStep1: 'Tres propuestas rechazadas',
  probStep2: 'Trabajo rehecho sin cobrar',
  probStep3: 'Una disputa y una mala reseña',
  mechKicker: 'Por qué funciona',
  mechTitle: 'Las dos cartas se diferencian en una sola cosa.',
  mechBody:
    'Así tu cliente no tiene que averiguar qué cambia. Solo elige la que le gusta. Ese toque queda fijado como un número, y los números no se traducen.',
  mechCaption: 'Un eje cada vez. Espaciado, luego color, luego tipografía.',
  outKicker: 'Lo que sale',
  outYou: 'Lo que recibes',
  outYou1: 'Una ficha técnica sin idioma',
  outYou2: 'Importe, plazo y revisiones acordados',
  outYou3: 'Texto de oferta listo para pegar',
  outYou4: 'Un hash que prueba lo acordado',
  outClient: 'Lo que hace tu cliente',
  outClient1: 'Abre un enlace',
  outClient2: 'Toca cartas durante cinco minutos',
  outClient3: 'Listo — sin registro ni app',
  moneyKicker: 'Precios',
  moneyTitle: 'Gratis hasta que cobres.',
  moneyBody:
    'Registrarse no cuesta nada. La comisión solo se aplica cuando se cierra un trato. Nunca guardamos números de tarjeta, solo el token de tu pasarela de pago.',
  trustKicker: 'Lo que no construiremos',
  trustTitle: 'Tres cosas que nunca haremos.',
  trust1: 'Nunca pedimos tu acceso al marketplace',
  trust1b: 'No existe ese campo. Compartir cuentas provoca bloqueos, y esa pérdida la asumes tú, no nosotros.',
  trust2: 'Nunca enviamos nada por ti',
  trust2b: 'Solo botón de copiar. Los envíos automáticos bloquean cuentas, así que no lo ofrecemos ni aunque lo pidan.',
  trust3: 'Nunca obligamos a tu cliente a registrarse',
  trust3b: 'Un enlace. Sin cuenta, sin descargas, funciona en un móvil lento.',
  typesKicker: 'Tipos de trabajo',
  typesTitle: 'Cuatro hoy. Añadir uno no requiere código.',
  finalTitle: 'Cierra tu próximo trabajo sin escribir una palabra en inglés.',
  finalCta: 'Empezar gratis — 2 minutos',
  langLabel: 'Idioma',
}

const ptBR: Landing = {
  ...en,
  navHow: 'Como funciona',
  navPricing: 'Preços',
  navSignin: 'Console',
  h1a: 'Pare de explicar.',
  h1b: 'Deixe escolherem.',
  sub: 'Seu cliente toca em algumas cartas. Você recebe números com que dá para trabalhar. Teste aqui mesmo — sem cadastro.',
  demoHint: 'Toque numa carta',
  demoDone: 'Era isso.',
  demoDoneSub: 'Seu cliente faz isso em cinco minutos. Sem conta, sem app, sem inglês.',
  demoAgain: 'De novo',
  cta: 'Começar grátis',
  ctaNote: 'Sem número de cartão · Nada a pagar até fechar um trabalho',
  probKicker: 'O problema',
  probQuote: 'deixa mais premium',
  probLabel: 'Informação acionável, depois de uma tradução perfeita',
  probAfter: 'O que acontece de verdade',
  probStep1: 'Três propostas recusadas',
  probStep2: 'Retrabalho sem receber',
  probStep3: 'Uma disputa e uma nota baixa',
  mechKicker: 'Por que funciona',
  mechTitle: 'As duas cartas mudam em uma coisa só.',
  mechBody:
    'Assim seu cliente não precisa descobrir o que mudou. Ele só escolhe a que gosta. Esse toque vira número na hora, e número não precisa de tradução.',
  mechCaption: 'Um eixo por vez. Espaçamento, depois cor, depois tipografia.',
  outKicker: 'O que sai',
  outYou: 'O que você recebe',
  outYou1: 'Uma ficha técnica sem idioma',
  outYou2: 'Valor, prazo e revisões acordados',
  outYou3: 'Texto de proposta pronto para colar',
  outYou4: 'Um hash que prova o que foi combinado',
  outClient: 'O que seu cliente faz',
  outClient1: 'Abre um link',
  outClient2: 'Toca cartas por cinco minutos',
  outClient3: 'Pronto — sem cadastro, sem app',
  moneyKicker: 'Preços',
  moneyTitle: 'Grátis até você receber.',
  moneyBody:
    'Cadastrar não custa nada. A taxa só entra quando um trabalho fecha. Nunca guardamos número de cartão, só o token do seu provedor de pagamento.',
  trustKicker: 'O que não vamos construir',
  trustTitle: 'Três coisas que nunca faremos.',
  trust1: 'Nunca pedimos seu login do marketplace',
  trust1b: 'Não existe esse campo. Compartilhar conta derruba você, e o prejuízo é seu, não nosso.',
  trust2: 'Nunca enviamos nada por você',
  trust2b: 'Só botão de copiar. Envio automático suspende contas, então não oferecemos — nem se pedirem.',
  trust3: 'Nunca obrigamos seu cliente a se cadastrar',
  trust3b: 'Um link. Sem conta, sem download, funciona em celular lento.',
  typesKicker: 'Tipos de trabalho',
  typesTitle: 'Quatro hoje. Adicionar mais um não exige código.',
  finalTitle: 'Feche seu próximo trabalho sem escrever uma palavra em inglês.',
  finalCta: 'Começar grátis — 2 minutos',
  langLabel: 'Idioma',
}

const vi: Landing = {
  ...en,
  navHow: 'Cách hoạt động',
  navPricing: 'Chi phí',
  navSignin: 'Bảng điều khiển',
  h1a: 'Đừng giải thích.',
  h1b: 'Hãy để họ chọn.',
  sub: 'Khách chỉ chạm vài tấm thẻ. Bạn nhận được những con số làm được ngay. Thử ngay tại đây — không cần đăng ký.',
  demoHint: 'Chạm vào một tấm thẻ',
  demoDone: 'Chỉ vậy thôi.',
  demoDoneSub: 'Khách của bạn làm việc này trong năm phút. Không tài khoản, không ứng dụng, không tiếng Anh.',
  demoAgain: 'Làm lại',
  cta: 'Bắt đầu miễn phí',
  ctaNote: 'Không cần số thẻ · Chưa chốt việc thì chưa trả gì',
  probKicker: 'Vấn đề',
  probQuote: 'làm cho sang hơn chút',
  probLabel: 'Thông tin dùng được, sau khi dịch hoàn hảo',
  probAfter: 'Điều thực sự xảy ra',
  probStep1: 'Ba bản bị từ chối',
  probStep2: 'Làm lại mà không được trả tiền',
  probStep3: 'Tranh cãi, rồi đánh giá thấp',
  mechKicker: 'Vì sao hiệu quả',
  mechTitle: 'Hai tấm thẻ chỉ khác nhau đúng một điểm.',
  mechBody:
    'Nhờ vậy khách không phải nghĩ xem khác chỗ nào. Họ chỉ chọn tấm mình thích. Cú chạm đó lập tức thành con số, mà số thì không cần dịch.',
  mechCaption: 'Mỗi lần một trục. Khoảng cách, rồi màu, rồi kiểu chữ.',
  outKicker: 'Kết quả',
  outYou: 'Bạn nhận được',
  outYou1: 'Bản đặc tả không có ngôn ngữ',
  outYou2: 'Số tiền, thời hạn, số lần sửa — đã thống nhất',
  outYou3: 'Nội dung chào giá dán là xong',
  outYou4: 'Mã hash chứng minh điều đã thống nhất',
  outClient: 'Khách của bạn làm gì',
  outClient1: 'Mở một liên kết',
  outClient2: 'Chạm thẻ trong năm phút',
  outClient3: 'Xong — không đăng ký, không ứng dụng',
  moneyKicker: 'Chi phí',
  moneyTitle: 'Miễn phí cho tới khi bạn được trả tiền.',
  moneyBody:
    'Đăng ký không mất gì. Phí chỉ tính khi chốt được việc. Chúng tôi không bao giờ lưu số thẻ — chỉ lưu mã do cổng thanh toán cấp.',
  trustKicker: 'Những thứ chúng tôi từ chối làm',
  trustTitle: 'Ba điều chúng tôi sẽ không bao giờ làm.',
  trust1: 'Không hỏi tài khoản sàn của bạn',
  trust1b: 'Không hề có ô nhập. Dùng chung tài khoản sẽ bị khóa, và thiệt hại đó là của bạn, không phải của chúng tôi.',
  trust2: 'Không gửi thay bạn',
  trust2b: 'Chỉ có nút sao chép. Gửi tự động khiến tài khoản bị khóa, nên chúng tôi không làm — dù có ai yêu cầu.',
  trust3: 'Không bắt khách của bạn đăng ký',
  trust3b: 'Một liên kết là đủ. Không tài khoản, không tải về, chạy được trên máy yếu.',
  typesKicker: 'Loại công việc',
  typesTitle: 'Hiện có bốn. Thêm một loại không cần viết mã.',
  finalTitle: 'Chốt việc tiếp theo mà không cần viết một chữ tiếng Anh.',
  finalCta: 'Bắt đầu miễn phí — 2 phút',
  langLabel: 'Ngôn ngữ',
}

const hi: Landing = {
  ...en,
  navHow: 'यह कैसे काम करता है',
  navPricing: 'शुल्क',
  navSignin: 'कंसोल',
  h1a: 'समझाना बंद कीजिए।',
  h1b: 'उन्हें चुनने दीजिए।',
  sub: 'आपका क्लाइंट कुछ कार्ड चुनता है। आपको ऐसे आँकड़े मिलते हैं जिन पर काम हो सके। यहीं आज़माइए — कोई साइन-अप नहीं।',
  demoHint: 'कोई कार्ड दबाइए',
  demoDone: 'बस इतना ही था।',
  demoDoneSub: 'आपका क्लाइंट यह पाँच मिनट में कर लेता है। न खाता, न ऐप, न अंग्रेज़ी।',
  demoAgain: 'फिर से',
  cta: 'मुफ़्त शुरू करें',
  ctaNote: 'कार्ड नंबर नहीं · सौदा तय होने तक कुछ नहीं देना',
  probKicker: 'समस्या',
  probQuote: 'इसे थोड़ा और प्रीमियम बनाइए',
  probLabel: 'सटीक अनुवाद के बाद भी काम की जानकारी',
  probAfter: 'असल में जो होता है',
  probStep1: 'तीन बार डिज़ाइन नामंज़ूर',
  probStep2: 'बिना पैसे के दोबारा काम',
  probStep3: 'विवाद, फिर कम रेटिंग',
  mechKicker: 'यह क्यों काम करता है',
  mechTitle: 'दोनों कार्ड में सिर्फ़ एक ही चीज़ अलग होती है।',
  mechBody:
    'इसलिए क्लाइंट को यह सोचना ही नहीं पड़ता कि फ़र्क क्या है। वह बस पसंद वाला दबा देता है। वही एक टैप तुरंत संख्या बन जाता है — और संख्या का अनुवाद नहीं करना पड़ता।',
  mechCaption: 'एक बार में एक पहलू। पहले जगह, फिर रंग, फिर टाइपफ़ेस।',
  outKicker: 'क्या निकलता है',
  outYou: 'आपको क्या मिलता है',
  outYou1: 'बिना भाषा वाला विवरण-पत्र',
  outYou2: 'तय राशि, समय और बदलावों की संख्या',
  outYou3: 'चिपकाने के लिए तैयार ऑफ़र टेक्स्ट',
  outYou4: 'तय बात को साबित करने वाला हैश',
  outClient: 'आपका क्लाइंट क्या करता है',
  outClient1: 'एक लिंक खोलता है',
  outClient2: 'पाँच मिनट कार्ड दबाता है',
  outClient3: 'हो गया — न साइन-अप, न ऐप',
  moneyKicker: 'शुल्क',
  moneyTitle: 'पैसे मिलने तक मुफ़्त।',
  moneyBody:
    'खाता बनाने का कोई शुल्क नहीं। शुल्क तभी लगता है जब सौदा तय हो जाए। हम कार्ड नंबर कभी नहीं रखते — केवल आपके भुगतान प्रदाता का टोकन।',
  trustKicker: 'जो हम बनाएँगे ही नहीं',
  trustTitle: 'तीन चीज़ें जो हम कभी नहीं करेंगे।',
  trust1: 'आपका मार्केटप्लेस लॉगिन कभी नहीं माँगेंगे',
  trust1b: 'उसका खाना ही नहीं है। खाता साझा करने पर रोक लगती है, और वह नुकसान आपका होता है, हमारा नहीं।',
  trust2: 'आपकी ओर से कुछ नहीं भेजेंगे',
  trust2b: 'सिर्फ़ कॉपी बटन। अपने आप भेजने से खाते बंद होते हैं, इसलिए हम यह नहीं देते — माँगने पर भी नहीं।',
  trust3: 'आपके क्लाइंट से साइन-अप नहीं कराएँगे',
  trust3b: 'बस एक लिंक। न खाता, न डाउनलोड, धीमे फ़ोन पर भी चलता है।',
  typesKicker: 'काम के प्रकार',
  typesTitle: 'अभी चार। एक और जोड़ने में कोड नहीं लगता।',
  finalTitle: 'अगला काम अंग्रेज़ी का एक शब्द लिखे बिना तय कीजिए।',
  finalCta: 'मुफ़्त शुरू करें — 2 मिनट',
  langLabel: 'भाषा',
}

const tl: Landing = {
  ...en,
  navHow: 'Paano ito gumagana',
  navPricing: 'Presyo',
  navSignin: 'Console',
  h1a: 'Huwag nang magpaliwanag.',
  h1b: 'Hayaan silang pumili.',
  sub: 'Pipindot lang ng ilang card ang kliyente mo. Numero ang matatanggap mo — kayang simulan agad. Subukan mo dito, walang sign-up.',
  demoHint: 'Pindutin ang isang card',
  demoDone: 'Iyon lang pala.',
  demoDoneSub: 'Limang minuto lang ito sa kliyente mo. Walang account, walang app, walang Ingles.',
  demoAgain: 'Ulitin',
  cta: 'Magsimula nang libre',
  ctaNote: 'Walang card number · Walang bayad hangga’t walang natapos na deal',
  probKicker: 'Ang problema',
  probQuote: 'gawin mong mas premium',
  probLabel: 'Impormasyong magagamit, kahit perpekto ang salin',
  probAfter: 'Ang totoong nangyayari',
  probStep1: 'Tatlong beses tinanggihan ang draft',
  probStep2: 'Inulit ang trabaho, walang bayad',
  probStep3: 'Away, tapos mababang rating',
  mechKicker: 'Bakit ito gumagana',
  mechTitle: 'Iisa lang ang pinagkaiba ng dalawang card.',
  mechBody:
    'Kaya hindi na kailangang isipin ng kliyente kung ano ang kaibahan. Pipiliin lang niya ang gusto niya. Ang isang pindot na iyon ay agad nagiging numero — at ang numero ay hindi na kailangang isalin.',
  mechCaption: 'Isang bagay lang sabay. Espasyo, tapos kulay, tapos titik.',
  outKicker: 'Ang lalabas',
  outYou: 'Ang matatanggap mo',
  outYou1: 'Spec sheet na walang wika',
  outYou2: 'Napagkasunduang halaga, takdang oras, at revision',
  outYou3: 'Teksto ng alok, handang idikit',
  outYou4: 'Hash na patunay ng napagkasunduan',
  outClient: 'Ang gagawin ng kliyente mo',
  outClient1: 'Bubuksan ang link',
  outClient2: 'Pipindot ng card nang limang minuto',
  outClient3: 'Tapos — walang sign-up, walang app',
  moneyKicker: 'Presyo',
  moneyTitle: 'Libre hangga’t hindi ka pa nababayaran.',
  moneyBody:
    'Walang bayad ang pag-sign up. May bayad lang kapag natapos ang deal. Hindi namin iniimbak ang numero ng card — ang token lang mula sa provider mo.',
  trustKicker: 'Ang ayaw naming gawin',
  trustTitle: 'Tatlong bagay na hinding-hindi namin gagawin.',
  trust1: 'Hindi namin hihingin ang login mo sa marketplace',
  trust1b: 'Wala ngang lalagyan nito. Ang pagpapahiram ng account ay nagpapasara nito, at ikaw ang malulugi, hindi kami.',
  trust2: 'Hindi kami magpapadala para sa iyo',
  trust2b: 'Copy button lang. Nagpapasara ng account ang awtomatikong pagpapadala, kaya hindi namin ito inaalok — kahit hilingin pa.',
  trust3: 'Hindi namin papipirmahin ang kliyente mo',
  trust3b: 'Isang link lang. Walang account, walang download, gumagana sa mabagal na telepono.',
  typesKicker: 'Uri ng trabaho',
  typesTitle: 'Apat sa ngayon. Walang code kapag nagdagdag pa.',
  finalTitle: 'Tapusin ang susunod mong trabaho nang walang isang salitang Ingles.',
  finalCta: 'Magsimula nang libre — 2 minuto',
  langLabel: 'Wika',
}

const uk: Landing = {
  ...en,
  navHow: 'Як це працює',
  navPricing: 'Ціни',
  navSignin: 'Консоль',
  h1a: 'Не пояснюйте.',
  h1b: 'Дайте обрати.',
  sub: 'Клієнт торкається кількох карток. Ви отримуєте числа, з якими можна працювати. Спробуйте просто тут — без реєстрації.',
  demoHint: 'Торкніться картки',
  demoDone: 'Ось і все.',
  demoDoneSub: 'Клієнт робить це за п’ять хвилин. Без акаунта, без застосунку, без англійської.',
  demoAgain: 'Ще раз',
  cta: 'Почати безкоштовно',
  ctaNote: 'Без номера картки · Нічого не платите до укладеної угоди',
  probKicker: 'Проблема',
  probQuote: 'зроби дорожче на вигляд',
  probLabel: 'Корисна інформація після ідеального перекладу',
  probAfter: 'Що відбувається насправді',
  probStep1: 'Три відхилені макети',
  probStep2: 'Переробка, за яку не платять',
  probStep3: 'Суперечка, а потім низька оцінка',
  mechKicker: 'Чому це працює',
  mechTitle: 'Дві картки різняться рівно однією річчю.',
  mechBody:
    'Тож клієнтові не треба з’ясовувати, що саме змінилося. Він просто обирає ту, що подобається. Цей дотик одразу фіксується як число — а числа не потребують перекладу.',
  mechCaption: 'По одній осі за раз. Відступи, потім колір, потім шрифт.',
  outKicker: 'Що виходить',
  outYou: 'Що отримуєте ви',
  outYou1: 'Специфікація без жодної мови',
  outYou2: 'Погоджені сума, строк і правки',
  outYou3: 'Текст пропозиції, готовий до вставки',
  outYou4: 'Хеш, що доводить домовленість',
  outClient: 'Що робить клієнт',
  outClient1: 'Відкриває посилання',
  outClient2: 'П’ять хвилин торкається карток',
  outClient3: 'Готово — без реєстрації та застосунку',
  moneyKicker: 'Ціни',
  moneyTitle: 'Безкоштовно, поки вам не заплатять.',
  moneyBody:
    'Реєстрація нічого не коштує. Комісія — лише після укладеної угоди. Ми ніколи не зберігаємо номери карток, лише токен вашого платіжного провайдера.',
  trustKicker: 'Чого ми не будуватимемо',
  trustTitle: 'Три речі, яких ми не зробимо ніколи.',
  trust1: 'Ніколи не питаємо ваш логін на маркетплейсі',
  trust1b: 'Для нього немає поля. За спільний доступ блокують акаунт, і збиток ваш, а не наш.',
  trust2: 'Ніколи не надсилаємо замість вас',
  trust2b: 'Лише кнопка копіювання. Автоматичні розсилки блокують акаунти, тож ми цього не робимо — навіть на прохання.',
  trust3: 'Ніколи не змушуємо клієнта реєструватися',
  trust3b: 'Одне посилання. Без акаунта, без завантажень, працює на повільному телефоні.',
  typesKicker: 'Типи робіт',
  typesTitle: 'Наразі чотири. Додати ще один можна без коду.',
  finalTitle: 'Укладіть наступну угоду, не написавши жодного слова англійською.',
  finalCta: 'Почати безкоштовно — 2 хвилини',
  langLabel: 'Мова',
}

const TABLE: Readonly<Record<Locale, Landing>> = {
  en,
  ko,
  es,
  'pt-BR': ptBR,
  vi,
  hi,
  tl,
  uk,
}

export function landingFor(locale: string): Landing {
  return (LOCALES as readonly string[]).includes(locale) ? TABLE[locale as Locale] : en
}

/**
 * Accept-Language 헤더에서 로케일을 고른다.
 *
 * 이 사람들은 대체로 영어권 브라우저를 쓰지 않는다 — 기본을 en 으로 두고
 * 끝내면 랜딩이 다시 영어 전용이 된다. 가중치는 무시한다. 첫 일치면 충분하고,
 * 어차피 상단 선택기로 언제든 바꿀 수 있다.
 */
export function pickLocale(header: string | null, override?: string | null): Locale {
  if (override !== null && override !== undefined && (LOCALES as readonly string[]).includes(override)) {
    return override as Locale
  }
  for (const part of (header ?? '').split(',')) {
    const tag = part.split(';')[0]!.trim()
    if (tag === '') continue
    if ((LOCALES as readonly string[]).includes(tag)) return tag as Locale
    const base = tag.split('-')[0]!
    if (base === 'pt') return 'pt-BR'
    if ((LOCALES as readonly string[]).includes(base)) return base as Locale
  }
  return 'en'
}
