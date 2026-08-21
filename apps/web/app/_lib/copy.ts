/**
 * 프리랜서 화면 문구 — FR-8.6.
 *
 * 클라이언트 화면은 무언어라 사전이 필요 없다. 프리랜서 화면은 반대로 문장을
 * 쓰며, **여기가 이 제품에서 번역이 실제로 필요한 유일한 곳**이다.
 *
 * 그전까지 콘솔이 한국어로 하드코딩돼 있었다. 영어를 못 하는 프리랜서를 위한
 * 제품인데 프리랜서 화면이 한국어 고정이라는 건 전제와 정면으로 어긋난다.
 *
 * measure 는 여기 넣지 않는다 — 절대 번역하지 않는다 (02 §3 · 06 §4).
 *
 * ⚠ 비영어 19종은 **원어민 검수 전**이다. 라벨 번들과 같은 상태이며 07 §5.3 의
 * 5개국 테스트 전에 검수해야 한다. 영어로 폴백된 항목이 하나도 없다는 것은
 * `pnpm copy:check` 가 기계로 본다 — 어감은 사람이 봐야 한다.
 */
import { LOCALES, type Locale } from '@preflight/core'
// 로케일이 20종이라 한 파일에 다 두면 읽을 수가 없다. 지역별로 나눈다.
import * as A from './copy.asia.ts'
import * as E from './copy.euro.ts'

export interface Copy {
  tagline: string

  issueTitle: string
  issueType: string
  issueLabel: string
  issueLabelHint: string
  issueGate: string
  issueGateHint: string
  issueSubmit: string

  issuedLink: string
  issuedShare: string
  /** 공유 문구를 어느 언어로 뽑을지. **고객**이 읽는 문장이다 */
  shareLang: string
  issuedNote: string
  issuedOpen: string

  listTitle: string
  listEmpty: string

  copy: string
  copied: string

  detailBack: string
  detailClient: string
  detailPending: string
  sheet: string
  sheetLocal: string
  offer: string

  reviewTitle: string
  reviewHint: string
  reviewPass: string
  reviewSend: string
  reviewReason: string
  reviewSent: string
  reviewWaiting: string
  reviewNone: string

  requestsTitle: string
  requestsEmpty: string

  signupTitle: string
  signupLead: string
  signupAccount: string
  signupEmail: string
  signupName: string
  signupLocale: string
  signupTimezone: string
  signupTimezoneHint: string
  signupSubmit: string
  signupTime: string
  stepOf: string
  signupDone: string
  billingTitle: string
  billingNote: string
  billingKey: string
  billingSubmit: string
  billingNoCharge: string
  billingDone: string
  toConsole: string

  /** 05 §1 에러. 내부 코드는 노출하지 않는다 (invariant.ts) */
  err: Readonly<Record<string, string>>
  errFallback: string
  errBillingCta: string
}

const en: Copy = {
  tagline: 'Agree before you start. In any language.',

  issueTitle: 'New agreement link',
  issueType: 'Trade type',
  issueLabel: 'Client note',
  issueLabelHint: 'Only you see this',
  issueGate: 'Review before it locks',
  issueGateHint:
    'You get 24 hours to counter-propose before the spec locks. The client has to open the link again, so tell them in your marketplace chat.',
  issueSubmit: 'Create link',

  issuedLink: 'Link',
  issuedShare: 'Message to paste',
  shareLang: "Client's language",
  issuedNote: 'Send it yourself. Paste it into your marketplace chat — auto-sending gets accounts banned, so we do not offer it.',
  issuedOpen: 'Open the client screen',

  listTitle: 'In progress',
  listEmpty: 'No links yet. Create one above and paste it into your marketplace chat.',

  copy: 'Copy',
  copied: 'Copied',

  detailBack: 'Back to console',
  detailClient: 'Client screen',
  detailPending: 'The spec sheet and offer text appear once the client finishes.',
  sheet: 'Spec sheet (language-neutral)',
  sheetLocal: 'Spec sheet (with your language)',
  offer: 'Marketplace offer (English)',

  reviewTitle: 'Review',
  reviewHint: 'Pick the aspects you would change. The client sees two pictures and the numbers — never your reason.',
  reviewPass: 'Pass without changes',
  reviewSend: 'Send',
  reviewReason: 'Reason (client never sees this)',
  reviewSent: 'Sent',
  reviewWaiting: 'Waiting for the client to answer',
  reviewNone: 'Nothing to review yet — the client has not finished.',

  requestsTitle: 'Change requests',
  requestsEmpty: 'None yet.',

  signupTitle: 'Sign up',
  signupLead: 'Win work without English. Your client only has to pick.',
  signupAccount: 'Account',
  signupEmail: 'Email',
  signupName: 'Display name',
  signupLocale: 'Your language',
  signupTimezone: 'Time zone',
  signupTimezoneHint: 'Used to time notifications across the date line',
  signupSubmit: 'Sign up',
  signupTime: 'Takes about 2 minutes',
  stepOf: 'Step',
  signupDone: 'Account created',
  billingTitle: 'Payment method',
  billingNote:
    'Signing up is free. The fee applies only after a deal closes. We still need a payment method first — we bill afterwards, so there is no other way to collect. We never store card numbers, only the token your payment provider issues.',
  billingKey: 'Billing key',
  billingSubmit: 'Register',
  billingNoCharge: 'Nothing is charged now. This only lets us bill the fee after a deal closes.',
  billingDone: 'Registered — you can create links now',
  toConsole: 'Go to console',

  err: {
    BILLING_REQUIRED: 'Register a payment method before creating links.',
    PRO_SUSPENDED: 'This account is suspended.',
    UNAUTHORIZED: 'Sign in again.',
    PROFILE_NOT_FOUND: 'That trade type is no longer available.',
    EMAIL_TAKEN: 'That email is already registered.',
    EMAIL_INVALID: 'Check the email address.',
    NAME_REQUIRED: 'Enter a display name.',
    LOCALE_UNSUPPORTED: 'That language is not supported yet.',
    TIMEZONE_INVALID: 'Check the time zone.',
    BILLING_KEY_REQUIRED: 'Enter the billing key.',
    PG_PROVIDER_REQUIRED: 'Choose a payment provider.',
    LOOKS_LIKE_CARD_NUMBER: 'That looks like a card number. Paste the billing key instead.',
    TOO_MANY_PROPOSALS: 'Up to 3 changes at a time.',
    DUPLICATE_AXIS_PROPOSAL: 'One change per aspect.',
    REVIEW_GATE_OFF: 'This link locks without review.',
    ALREADY_SETTLED: 'The spec is already locked.',
    NEGOTIATION_PENDING: 'Waiting for the client to answer your proposal.',
    GATE_LOCKED: 'The client has not finished yet.',
  },
  errFallback: 'Something went wrong. Try again.',
  errBillingCta: 'Register now',
}

const ko: Copy = {
  tagline: '시작하기 전에 합의하세요. 어떤 언어로든.',

  issueTitle: '새 확정 링크',
  issueType: '거래 유형',
  issueLabel: '클라이언트 메모',
  issueLabelHint: '나만 봅니다',
  issueGate: '확정 전 검토 받기',
  issueGateHint:
    '사양이 확정되기 전 24시간 동안 역제안할 수 있습니다. 클라이언트가 링크를 다시 열어야 하니 마켓플레이스 채팅으로 알려주세요.',
  issueSubmit: '링크 발급',

  issuedLink: '링크',
  issuedShare: '붙여넣을 안내문',
  shareLang: '고객 언어',
  issuedNote:
    '발송은 직접 하세요. 마켓플레이스 채팅에 붙여넣으면 됩니다 — 자동 전송은 계정 정지 사유라 제공하지 않습니다.',
  issuedOpen: '클라이언트 화면 열기',

  listTitle: '진행 중',
  listEmpty: '아직 발급한 링크가 없습니다. 위에서 만들어 마켓플레이스 채팅에 붙여넣으세요.',

  copy: '복사',
  copied: '복사됨',

  detailBack: '콘솔로',
  detailClient: '클라이언트 화면',
  detailPending: '클라이언트가 끝내면 사양서와 오퍼 텍스트가 생성됩니다.',
  sheet: '사양서 (언어 중립)',
  sheetLocal: '사양서 (내 언어 병기)',
  offer: '마켓플레이스 오퍼 (영문)',

  reviewTitle: '검토',
  reviewHint: '바꾸고 싶은 축을 고르세요. 클라이언트에게는 그림 두 장과 수치만 갑니다 — 근거는 가지 않습니다.',
  reviewPass: '그대로 통과',
  reviewSend: '보내기',
  reviewReason: '근거 (클라이언트에게 가지 않음)',
  reviewSent: '보냄',
  reviewWaiting: '클라이언트 응답을 기다리는 중',
  reviewNone: '아직 검토할 것이 없습니다 — 클라이언트가 끝내지 않았습니다.',

  requestsTitle: '수정 요청',
  requestsEmpty: '아직 없습니다.',

  signupTitle: '프리랜서 가입',
  signupLead: '영어를 못 해도 수주합니다. 클라이언트는 고르기만 하면 됩니다.',
  signupAccount: '계정',
  signupEmail: '이메일',
  signupName: '표시 이름',
  signupLocale: '내 언어',
  signupTimezone: '타임존',
  signupTimezoneHint: '시차를 넘어 알림 시각을 계산하는 데 씁니다',
  signupSubmit: '가입',
  signupTime: '2분이면 끝납니다',
  stepOf: '단계',
  signupDone: '가입 완료',
  billingTitle: '결제수단',
  billingNote:
    '가입은 무료입니다. 계약이 성사된 뒤에만 수수료가 붙습니다. 그래도 결제수단이 먼저 필요합니다 — 후청구 구조라 달리 받을 방법이 없습니다. 카드 번호는 저장하지 않고 PG 사가 발급한 빌링키만 보관합니다.',
  billingKey: 'PG 빌링키',
  billingSubmit: '등록',
  billingNoCharge: '지금 결제되지 않습니다. 계약이 성사된 뒤 수수료를 청구하기 위한 등록입니다.',
  billingDone: '등록 완료 — 이제 링크를 발급할 수 있습니다',
  toConsole: '콘솔로',

  err: {
    BILLING_REQUIRED: '링크를 발급하려면 결제수단을 먼저 등록하세요.',
    PRO_SUSPENDED: '정지된 계정입니다.',
    UNAUTHORIZED: '다시 로그인하세요.',
    PROFILE_NOT_FOUND: '그 거래 유형은 더 이상 없습니다.',
    EMAIL_TAKEN: '이미 등록된 이메일입니다.',
    EMAIL_INVALID: '이메일 주소를 확인하세요.',
    NAME_REQUIRED: '표시 이름을 입력하세요.',
    LOCALE_UNSUPPORTED: '아직 지원하지 않는 언어입니다.',
    TIMEZONE_INVALID: '타임존을 확인하세요.',
    BILLING_KEY_REQUIRED: '빌링키를 입력하세요.',
    PG_PROVIDER_REQUIRED: 'PG 사를 고르세요.',
    LOOKS_LIKE_CARD_NUMBER: '카드 번호로 보입니다. 빌링키를 붙여넣으세요.',
    TOO_MANY_PROPOSALS: '한 번에 최대 3건입니다.',
    DUPLICATE_AXIS_PROPOSAL: '축당 한 건만 가능합니다.',
    REVIEW_GATE_OFF: '이 링크는 검토 없이 확정됩니다.',
    ALREADY_SETTLED: '이미 확정된 사양입니다.',
    NEGOTIATION_PENDING: '클라이언트 응답을 기다리는 중입니다.',
    GATE_LOCKED: '클라이언트가 아직 끝내지 않았습니다.',
  },
  errFallback: '문제가 생겼습니다. 다시 시도하세요.',
  errBillingCta: '등록하러 가기',
}

const es: Copy = {
  ...en,
  tagline: 'Acuerden antes de empezar. En cualquier idioma.',
  issueTitle: 'Nuevo enlace de acuerdo',
  issueType: 'Tipo de trabajo',
  issueLabel: 'Nota del cliente',
  issueLabelHint: 'Solo tú la ves',
  issueGate: 'Revisar antes de fijar',
  issueGateHint:
    'Tienes 24 horas para contraproponer antes de que se fije. El cliente debe abrir el enlace otra vez, avísale por el chat del marketplace.',
  issueSubmit: 'Crear enlace',
  issuedLink: 'Enlace',
  issuedShare: 'Mensaje para pegar',
  shareLang: 'Idioma del cliente',
  issuedNote:
    'Envíalo tú. Pégalo en el chat del marketplace — el envío automático provoca bloqueos de cuenta, por eso no lo ofrecemos.',
  issuedOpen: 'Abrir la pantalla del cliente',
  listTitle: 'En curso',
  listEmpty: 'Aún no hay enlaces. Crea uno arriba y pégalo en el chat del marketplace.',
  copy: 'Copiar',
  copied: 'Copiado',
  detailBack: 'Volver a la consola',
  detailClient: 'Pantalla del cliente',
  detailPending: 'La ficha y el texto de oferta aparecen cuando el cliente termina.',
  sheet: 'Ficha técnica (sin idioma)',
  sheetLocal: 'Ficha técnica (con tu idioma)',
  offer: 'Oferta para el marketplace (inglés)',
  reviewTitle: 'Revisión',
  reviewHint: 'Elige los aspectos que cambiarías. El cliente ve dos imágenes y los números — nunca tu motivo.',
  reviewPass: 'Aprobar sin cambios',
  reviewSend: 'Enviar',
  reviewReason: 'Motivo (el cliente no lo ve)',
  reviewSent: 'Enviado',
  reviewWaiting: 'Esperando la respuesta del cliente',
  reviewNone: 'Nada que revisar todavía — el cliente no ha terminado.',
  requestsTitle: 'Solicitudes de cambio',
  requestsEmpty: 'Ninguna todavía.',
  signupTitle: 'Crear cuenta',
  signupLead: 'Consigue trabajo sin inglés. Tu cliente solo tiene que elegir.',
  signupAccount: 'Cuenta',
  signupEmail: 'Correo',
  signupName: 'Nombre visible',
  signupLocale: 'Tu idioma',
  signupTimezone: 'Zona horaria',
  signupTimezoneHint: 'Se usa para calcular la hora de los avisos entre husos',
  signupSubmit: 'Crear cuenta',
  signupTime: 'Unos 2 minutos',
  stepOf: 'Paso',
  signupDone: 'Cuenta creada',
  billingTitle: 'Método de pago',
  billingNote:
    'Registrarse es gratis. La comisión solo se aplica cuando se cierra un trato. Aun así necesitamos un método de pago primero — cobramos después, no hay otra forma. Nunca guardamos números de tarjeta, solo el token de tu pasarela.',
  billingKey: 'Clave de facturación',
  billingSubmit: 'Registrar',
  billingNoCharge: 'No se cobra nada ahora. Solo sirve para cobrar la comisión cuando cierres un trato.',
  billingDone: 'Registrado — ya puedes crear enlaces',
  toConsole: 'Ir a la consola',
  err: {
    BILLING_REQUIRED: 'Registra un método de pago antes de crear enlaces.',
    PRO_SUSPENDED: 'Esta cuenta está suspendida.',
    UNAUTHORIZED: 'Vuelve a iniciar sesión.',
    PROFILE_NOT_FOUND: 'Ese tipo de trabajo ya no está disponible.',
    EMAIL_TAKEN: 'Ese correo ya está registrado.',
    EMAIL_INVALID: 'Revisa la dirección de correo.',
    NAME_REQUIRED: 'Escribe un nombre visible.',
    LOCALE_UNSUPPORTED: 'Ese idioma aún no está disponible.',
    TIMEZONE_INVALID: 'Revisa la zona horaria.',
    BILLING_KEY_REQUIRED: 'Escribe la clave de facturación.',
    PG_PROVIDER_REQUIRED: 'Elige una pasarela de pago.',
    LOOKS_LIKE_CARD_NUMBER: 'Eso parece un número de tarjeta. Pega la clave de facturación.',
    TOO_MANY_PROPOSALS: 'Máximo 3 cambios a la vez.',
    DUPLICATE_AXIS_PROPOSAL: 'Un cambio por aspecto.',
    REVIEW_GATE_OFF: 'Este enlace se fija sin revisión.',
    ALREADY_SETTLED: 'La ficha ya está fijada.',
    NEGOTIATION_PENDING: 'Esperando que el cliente responda a tu propuesta.',
    GATE_LOCKED: 'El cliente aún no ha terminado.',
  },
  errFallback: 'Algo salió mal. Inténtalo de nuevo.',
  errBillingCta: 'Registrar ahora',
}

const ptBR: Copy = {
  ...en,
  tagline: 'Combinem antes de começar. Em qualquer idioma.',
  issueTitle: 'Novo link de acordo',
  issueType: 'Tipo de trabalho',
  issueLabel: 'Nota do cliente',
  issueLabelHint: 'Só você vê',
  issueGate: 'Revisar antes de fechar',
  issueGateHint:
    'Você tem 24 horas para contrapropor antes de fechar. O cliente precisa abrir o link de novo, avise no chat do marketplace.',
  issueSubmit: 'Criar link',
  issuedLink: 'Link',
  issuedShare: 'Mensagem para colar',
  shareLang: 'Idioma do cliente',
  issuedNote:
    'Envie você mesmo. Cole no chat do marketplace — envio automático derruba contas, por isso não oferecemos.',
  issuedOpen: 'Abrir a tela do cliente',
  listTitle: 'Em andamento',
  listEmpty: 'Nenhum link ainda. Crie um acima e cole no chat do marketplace.',
  copy: 'Copiar',
  copied: 'Copiado',
  detailBack: 'Voltar ao console',
  detailClient: 'Tela do cliente',
  detailPending: 'A ficha e o texto da oferta aparecem quando o cliente terminar.',
  sheet: 'Ficha técnica (sem idioma)',
  sheetLocal: 'Ficha técnica (com seu idioma)',
  offer: 'Oferta do marketplace (inglês)',
  reviewTitle: 'Revisão',
  reviewHint: 'Escolha o que você mudaria. O cliente vê duas imagens e os números — nunca o seu motivo.',
  reviewPass: 'Aprovar sem mudanças',
  reviewSend: 'Enviar',
  reviewReason: 'Motivo (o cliente não vê)',
  reviewSent: 'Enviado',
  reviewWaiting: 'Aguardando a resposta do cliente',
  reviewNone: 'Nada para revisar ainda — o cliente não terminou.',
  requestsTitle: 'Pedidos de alteração',
  requestsEmpty: 'Nenhum ainda.',
  signupTitle: 'Criar conta',
  signupLead: 'Feche trabalhos sem inglês. Seu cliente só precisa escolher.',
  signupAccount: 'Conta',
  signupEmail: 'E-mail',
  signupName: 'Nome exibido',
  signupLocale: 'Seu idioma',
  signupTimezone: 'Fuso horário',
  signupTimezoneHint: 'Usado para calcular a hora dos avisos entre fusos',
  signupSubmit: 'Criar conta',
  signupTime: 'Leva uns 2 minutos',
  stepOf: 'Etapa',
  signupDone: 'Conta criada',
  billingTitle: 'Forma de pagamento',
  billingNote:
    'Cadastrar é grátis. A taxa só entra quando um trabalho fecha. Ainda assim precisamos de uma forma de pagamento antes — cobramos depois, não há outro jeito. Nunca guardamos números de cartão, só o token do seu provedor.',
  billingKey: 'Chave de cobrança',
  billingSubmit: 'Registrar',
  billingNoCharge: 'Nada é cobrado agora. Serve só para cobrar a taxa depois que um trabalho fechar.',
  billingDone: 'Registrado — agora você pode criar links',
  toConsole: 'Ir para o console',
  err: {
    BILLING_REQUIRED: 'Cadastre uma forma de pagamento antes de criar links.',
    PRO_SUSPENDED: 'Esta conta está suspensa.',
    UNAUTHORIZED: 'Entre novamente.',
    PROFILE_NOT_FOUND: 'Esse tipo de trabalho não está mais disponível.',
    EMAIL_TAKEN: 'Esse e-mail já está cadastrado.',
    EMAIL_INVALID: 'Confira o endereço de e-mail.',
    NAME_REQUIRED: 'Informe um nome exibido.',
    LOCALE_UNSUPPORTED: 'Esse idioma ainda não é suportado.',
    TIMEZONE_INVALID: 'Confira o fuso horário.',
    BILLING_KEY_REQUIRED: 'Informe a chave de cobrança.',
    PG_PROVIDER_REQUIRED: 'Escolha um provedor de pagamento.',
    LOOKS_LIKE_CARD_NUMBER: 'Isso parece um número de cartão. Cole a chave de cobrança.',
    TOO_MANY_PROPOSALS: 'No máximo 3 alterações por vez.',
    DUPLICATE_AXIS_PROPOSAL: 'Uma alteração por item.',
    REVIEW_GATE_OFF: 'Este link fecha sem revisão.',
    ALREADY_SETTLED: 'A ficha já está fechada.',
    NEGOTIATION_PENDING: 'Aguardando o cliente responder à sua proposta.',
    GATE_LOCKED: 'O cliente ainda não terminou.',
  },
  errFallback: 'Algo deu errado. Tente de novo.',
  errBillingCta: 'Cadastrar agora',
}

const vi: Copy = {
  ...en,
  tagline: 'Thống nhất trước khi bắt đầu. Bằng mọi ngôn ngữ.',
  issueTitle: 'Liên kết thỏa thuận mới',
  issueType: 'Loại công việc',
  issueLabel: 'Ghi chú khách hàng',
  issueLabelHint: 'Chỉ bạn thấy',
  issueGate: 'Xem lại trước khi chốt',
  issueGateHint:
    'Bạn có 24 giờ để đề xuất thay đổi trước khi chốt. Khách phải mở lại liên kết, hãy nhắn cho họ trên chat của sàn.',
  issueSubmit: 'Tạo liên kết',
  issuedLink: 'Liên kết',
  issuedShare: 'Tin nhắn để dán',
  shareLang: 'Ngôn ngữ của khách',
  issuedNote:
    'Bạn tự gửi. Dán vào chat của sàn — gửi tự động sẽ bị khóa tài khoản nên chúng tôi không làm.',
  issuedOpen: 'Mở màn hình khách hàng',
  listTitle: 'Đang tiến hành',
  listEmpty: 'Chưa có liên kết nào. Tạo một cái ở trên rồi dán vào chat của sàn.',
  copy: 'Sao chép',
  copied: 'Đã chép',
  detailBack: 'Về bảng điều khiển',
  detailClient: 'Màn hình khách hàng',
  detailPending: 'Bản đặc tả và nội dung chào giá xuất hiện khi khách hoàn tất.',
  sheet: 'Bản đặc tả (không ngôn ngữ)',
  sheetLocal: 'Bản đặc tả (kèm tiếng của bạn)',
  offer: 'Chào giá cho sàn (tiếng Anh)',
  reviewTitle: 'Xem lại',
  reviewHint: 'Chọn những điểm bạn muốn đổi. Khách chỉ thấy hai hình và các con số — không thấy lý do.',
  reviewPass: 'Duyệt, không đổi gì',
  reviewSend: 'Gửi',
  reviewReason: 'Lý do (khách không thấy)',
  reviewSent: 'Đã gửi',
  reviewWaiting: 'Đang chờ khách trả lời',
  reviewNone: 'Chưa có gì để xem lại — khách chưa hoàn tất.',
  requestsTitle: 'Yêu cầu chỉnh sửa',
  requestsEmpty: 'Chưa có.',
  signupTitle: 'Đăng ký',
  signupLead: 'Nhận việc dù không giỏi tiếng Anh. Khách chỉ cần chọn.',
  signupAccount: 'Tài khoản',
  signupEmail: 'Email',
  signupName: 'Tên hiển thị',
  signupLocale: 'Ngôn ngữ của bạn',
  signupTimezone: 'Múi giờ',
  signupTimezoneHint: 'Dùng để tính giờ gửi thông báo giữa các múi giờ',
  signupSubmit: 'Đăng ký',
  signupTime: 'Mất khoảng 2 phút',
  stepOf: 'Bước',
  signupDone: 'Đã tạo tài khoản',
  billingTitle: 'Phương thức thanh toán',
  billingNote:
    'Đăng ký miễn phí. Phí chỉ tính khi chốt được việc. Nhưng vẫn cần phương thức thanh toán trước — chúng tôi thu sau nên không có cách nào khác. Chúng tôi không lưu số thẻ, chỉ lưu mã do cổng thanh toán cấp.',
  billingKey: 'Mã thanh toán',
  billingSubmit: 'Đăng ký',
  billingNoCharge: 'Bây giờ chưa trừ tiền. Đây chỉ để thu phí sau khi bạn chốt được việc.',
  billingDone: 'Đã đăng ký — bạn có thể tạo liên kết',
  toConsole: 'Vào bảng điều khiển',
  err: {
    BILLING_REQUIRED: 'Hãy thêm phương thức thanh toán trước khi tạo liên kết.',
    PRO_SUSPENDED: 'Tài khoản này đã bị đình chỉ.',
    UNAUTHORIZED: 'Vui lòng đăng nhập lại.',
    PROFILE_NOT_FOUND: 'Loại công việc đó không còn nữa.',
    EMAIL_TAKEN: 'Email này đã được đăng ký.',
    EMAIL_INVALID: 'Hãy kiểm tra địa chỉ email.',
    NAME_REQUIRED: 'Hãy nhập tên hiển thị.',
    LOCALE_UNSUPPORTED: 'Ngôn ngữ này chưa được hỗ trợ.',
    TIMEZONE_INVALID: 'Hãy kiểm tra múi giờ.',
    BILLING_KEY_REQUIRED: 'Hãy nhập mã thanh toán.',
    PG_PROVIDER_REQUIRED: 'Hãy chọn cổng thanh toán.',
    LOOKS_LIKE_CARD_NUMBER: 'Cái này giống số thẻ. Hãy dán mã thanh toán thay vào đó.',
    TOO_MANY_PROPOSALS: 'Tối đa 3 thay đổi mỗi lần.',
    DUPLICATE_AXIS_PROPOSAL: 'Mỗi mục chỉ một thay đổi.',
    REVIEW_GATE_OFF: 'Liên kết này chốt mà không cần xem lại.',
    ALREADY_SETTLED: 'Đặc tả đã được chốt.',
    NEGOTIATION_PENDING: 'Đang chờ khách trả lời đề xuất của bạn.',
    GATE_LOCKED: 'Khách vẫn chưa hoàn tất.',
  },
  errFallback: 'Có gì đó không ổn. Hãy thử lại.',
  errBillingCta: 'Thêm ngay',
}

const hi: Copy = {
  ...en,
  tagline: 'शुरू करने से पहले तय करें। किसी भी भाषा में।',
  issueTitle: 'नया सहमति लिंक',
  issueType: 'काम का प्रकार',
  issueLabel: 'क्लाइंट नोट',
  issueLabelHint: 'केवल आप देखते हैं',
  issueGate: 'तय होने से पहले समीक्षा',
  issueGateHint:
    'तय होने से पहले आपके पास बदलाव सुझाने के लिए 24 घंटे हैं। क्लाइंट को लिंक फिर से खोलना होगा, इसलिए मार्केटप्लेस चैट पर बता दें।',
  issueSubmit: 'लिंक बनाएँ',
  issuedLink: 'लिंक',
  issuedShare: 'चिपकाने का संदेश',
  shareLang: 'क्लाइंट की भाषा',
  issuedNote:
    'आप खुद भेजें। मार्केटप्लेस चैट में चिपका दें — अपने आप भेजने से खाते बंद हो जाते हैं, इसलिए हम वह सुविधा नहीं देते।',
  issuedOpen: 'क्लाइंट स्क्रीन खोलें',
  listTitle: 'चल रहे',
  listEmpty: 'अभी कोई लिंक नहीं। ऊपर एक बनाएँ और मार्केटप्लेस चैट में चिपकाएँ।',
  copy: 'कॉपी',
  copied: 'कॉपी हुआ',
  detailBack: 'कंसोल पर वापस',
  detailClient: 'क्लाइंट स्क्रीन',
  detailPending: 'क्लाइंट के पूरा करने पर विवरण-पत्र और ऑफ़र टेक्स्ट बनते हैं।',
  sheet: 'विवरण-पत्र (भाषा-रहित)',
  sheetLocal: 'विवरण-पत्र (आपकी भाषा के साथ)',
  offer: 'मार्केटप्लेस ऑफ़र (अंग्रेज़ी)',
  reviewTitle: 'समीक्षा',
  reviewHint: 'जो पहलू बदलना चाहें चुनें। क्लाइंट को दो तस्वीरें और संख्याएँ दिखती हैं — आपका कारण कभी नहीं।',
  reviewPass: 'बिना बदलाव पास करें',
  reviewSend: 'भेजें',
  reviewReason: 'कारण (क्लाइंट नहीं देखता)',
  reviewSent: 'भेजा गया',
  reviewWaiting: 'क्लाइंट के उत्तर की प्रतीक्षा',
  reviewNone: 'अभी समीक्षा के लिए कुछ नहीं — क्लाइंट ने पूरा नहीं किया।',
  requestsTitle: 'बदलाव के अनुरोध',
  requestsEmpty: 'अभी कोई नहीं।',
  signupTitle: 'खाता बनाएँ',
  signupLead: 'अंग्रेज़ी के बिना काम पाएँ। क्लाइंट को बस चुनना है।',
  signupAccount: 'खाता',
  signupEmail: 'ईमेल',
  signupName: 'दिखने वाला नाम',
  signupLocale: 'आपकी भाषा',
  signupTimezone: 'समय क्षेत्र',
  signupTimezoneHint: 'अलग-अलग समय क्षेत्रों में सूचना का समय तय करने के लिए',
  signupSubmit: 'खाता बनाएँ',
  signupTime: 'लगभग 2 मिनट',
  stepOf: 'चरण',
  signupDone: 'खाता बन गया',
  billingTitle: 'भुगतान का साधन',
  billingNote:
    'खाता बनाना मुफ़्त है। शुल्क तभी लगता है जब सौदा तय हो। फिर भी भुगतान का साधन पहले चाहिए — हम बाद में लेते हैं, और कोई रास्ता नहीं। हम कार्ड नंबर कभी नहीं रखते, केवल आपके भुगतान प्रदाता का टोकन।',
  billingKey: 'बिलिंग कुंजी',
  billingSubmit: 'दर्ज करें',
  billingNoCharge: 'अभी कोई शुल्क नहीं कटता। यह सिर्फ़ सौदा तय होने के बाद शुल्क लेने के लिए है।',
  billingDone: 'दर्ज हुआ — अब आप लिंक बना सकते हैं',
  toConsole: 'कंसोल पर जाएँ',
  err: {
    BILLING_REQUIRED: 'लिंक बनाने से पहले भुगतान का साधन दर्ज करें।',
    PRO_SUSPENDED: 'यह खाता निलंबित है।',
    UNAUTHORIZED: 'फिर से साइन इन करें।',
    PROFILE_NOT_FOUND: 'वह काम का प्रकार अब उपलब्ध नहीं है।',
    EMAIL_TAKEN: 'यह ईमेल पहले से दर्ज है।',
    EMAIL_INVALID: 'ईमेल पता जाँच लें।',
    NAME_REQUIRED: 'दिखने वाला नाम भरें।',
    LOCALE_UNSUPPORTED: 'यह भाषा अभी समर्थित नहीं है।',
    TIMEZONE_INVALID: 'समय क्षेत्र जाँच लें।',
    BILLING_KEY_REQUIRED: 'बिलिंग कुंजी भरें।',
    PG_PROVIDER_REQUIRED: 'भुगतान प्रदाता चुनें।',
    LOOKS_LIKE_CARD_NUMBER: 'यह कार्ड नंबर लगता है। इसके बजाय बिलिंग कुंजी चिपकाएँ।',
    TOO_MANY_PROPOSALS: 'एक बार में अधिकतम 3 बदलाव।',
    DUPLICATE_AXIS_PROPOSAL: 'हर पहलू पर एक बदलाव।',
    REVIEW_GATE_OFF: 'यह लिंक बिना समीक्षा के तय हो जाता है।',
    ALREADY_SETTLED: 'विवरण पहले ही तय हो चुका है।',
    NEGOTIATION_PENDING: 'आपके प्रस्ताव पर क्लाइंट के उत्तर की प्रतीक्षा है।',
    GATE_LOCKED: 'क्लाइंट ने अभी पूरा नहीं किया।',
  },
  errFallback: 'कुछ गड़बड़ हो गई। फिर कोशिश करें।',
  errBillingCta: 'अभी दर्ज करें',
}

const tl: Copy = {
  ...en,
  tagline: 'Magkasundo bago magsimula. Sa kahit anong wika.',
  issueTitle: 'Bagong link ng kasunduan',
  issueType: 'Uri ng trabaho',
  issueLabel: 'Tala tungkol sa kliyente',
  issueLabelHint: 'Ikaw lang ang nakakakita',
  issueGate: 'Suriin bago magsara',
  issueGateHint:
    'May 24 oras kang magmungkahi ng pagbabago bago magsara. Kailangang buksan muli ng kliyente ang link, kaya sabihan mo siya sa chat ng marketplace.',
  issueSubmit: 'Gumawa ng link',
  issuedLink: 'Link',
  issuedShare: 'Mensaheng idikit',
  shareLang: 'Wika ng kliyente',
  issuedNote:
    'Ikaw ang magpadala. Idikit sa chat ng marketplace — ang awtomatikong pagpapadala ay nagpapasara ng account, kaya hindi namin ito inaalok.',
  issuedOpen: 'Buksan ang screen ng kliyente',
  listTitle: 'Kasalukuyan',
  listEmpty: 'Wala pang link. Gumawa sa itaas at idikit sa chat ng marketplace.',
  copy: 'Kopyahin',
  copied: 'Nakopya',
  detailBack: 'Balik sa console',
  detailClient: 'Screen ng kliyente',
  detailPending: 'Lalabas ang spec sheet at teksto ng alok kapag tapos na ang kliyente.',
  sheet: 'Spec sheet (walang wika)',
  sheetLocal: 'Spec sheet (may wika mo)',
  offer: 'Alok sa marketplace (Ingles)',
  reviewTitle: 'Pagsusuri',
  reviewHint: 'Piliin ang gusto mong baguhin. Dalawang larawan at numero lang ang nakikita ng kliyente — hindi ang dahilan mo.',
  reviewPass: 'Payagan nang walang pagbabago',
  reviewSend: 'Ipadala',
  reviewReason: 'Dahilan (hindi nakikita ng kliyente)',
  reviewSent: 'Naipadala',
  reviewWaiting: 'Hinihintay ang sagot ng kliyente',
  reviewNone: 'Wala pang masusuri — hindi pa tapos ang kliyente.',
  requestsTitle: 'Hiling na pagbabago',
  requestsEmpty: 'Wala pa.',
  signupTitle: 'Mag-sign up',
  signupLead: 'Kumita nang hindi marunong mag-Ingles. Pipili lang ang kliyente mo.',
  signupAccount: 'Account',
  signupEmail: 'Email',
  signupName: 'Pangalang ipapakita',
  signupLocale: 'Wika mo',
  signupTimezone: 'Time zone',
  signupTimezoneHint: 'Ginagamit sa oras ng abiso sa magkaibang time zone',
  signupSubmit: 'Mag-sign up',
  signupTime: 'Mga 2 minuto lang',
  stepOf: 'Hakbang',
  signupDone: 'Nagawa ang account',
  billingTitle: 'Paraan ng bayad',
  billingNote:
    'Libre ang pag-sign up. May bayad lang kapag natuloy ang trabaho. Kailangan pa rin ng paraan ng bayad muna — sa huli kami naniningil, wala nang ibang paraan. Hindi namin iniimbak ang numero ng card, ang token lang mula sa provider mo.',
  billingKey: 'Billing key',
  billingSubmit: 'Irehistro',
  billingNoCharge: 'Walang sinisingil ngayon. Para lang ito sa bayad kapag may natapos nang deal.',
  billingDone: 'Nakarehistro — puwede ka nang gumawa ng link',
  toConsole: 'Pumunta sa console',
  err: {
    BILLING_REQUIRED: 'Magrehistro ng paraan ng bayad bago gumawa ng link.',
    PRO_SUSPENDED: 'Suspendido ang account na ito.',
    UNAUTHORIZED: 'Mag-sign in ulit.',
    PROFILE_NOT_FOUND: 'Wala na ang uri ng trabahong iyon.',
    EMAIL_TAKEN: 'Nakarehistro na ang email na iyon.',
    EMAIL_INVALID: 'Suriin ang email address.',
    NAME_REQUIRED: 'Maglagay ng pangalang ipapakita.',
    LOCALE_UNSUPPORTED: 'Hindi pa suportado ang wikang iyon.',
    TIMEZONE_INVALID: 'Suriin ang time zone.',
    BILLING_KEY_REQUIRED: 'Ilagay ang billing key.',
    PG_PROVIDER_REQUIRED: 'Pumili ng payment provider.',
    LOOKS_LIKE_CARD_NUMBER: 'Mukhang numero ng card iyan. Idikit ang billing key sa halip.',
    TOO_MANY_PROPOSALS: 'Hanggang 3 pagbabago sa isang pagkakataon.',
    DUPLICATE_AXIS_PROPOSAL: 'Isang pagbabago kada bahagi.',
    REVIEW_GATE_OFF: 'Nagsasara ang link na ito nang walang pagsusuri.',
    ALREADY_SETTLED: 'Sarado na ang spec.',
    NEGOTIATION_PENDING: 'Hinihintay ang sagot ng kliyente sa panukala mo.',
    GATE_LOCKED: 'Hindi pa tapos ang kliyente.',
  },
  errFallback: 'May nagkamali. Subukan ulit.',
  errBillingCta: 'Magrehistro na',
}

const uk: Copy = {
  ...en,
  tagline: 'Домовтеся до початку. Будь-якою мовою.',
  issueTitle: 'Нове посилання на угоду',
  issueType: 'Тип роботи',
  issueLabel: 'Нотатка про клієнта',
  issueLabelHint: 'Бачите лише ви',
  issueGate: 'Переглянути перед фіксацією',
  issueGateHint:
    'У вас є 24 години, щоб запропонувати зміни до фіксації. Клієнт має відкрити посилання ще раз — напишіть йому в чат маркетплейсу.',
  issueSubmit: 'Створити посилання',
  issuedLink: 'Посилання',
  issuedShare: 'Повідомлення для вставки',
  shareLang: 'Мова клієнта',
  issuedNote:
    'Надішліть самі. Вставте в чат маркетплейсу — автоматична розсилка призводить до блокування акаунтів, тому ми її не робимо.',
  issuedOpen: 'Відкрити екран клієнта',
  listTitle: 'У роботі',
  listEmpty: 'Посилань ще немає. Створіть вище і вставте в чат маркетплейсу.',
  copy: 'Копіювати',
  copied: 'Скопійовано',
  detailBack: 'До консолі',
  detailClient: 'Екран клієнта',
  detailPending: 'Специфікація та текст пропозиції з’являться, коли клієнт завершить.',
  sheet: 'Специфікація (без мови)',
  sheetLocal: 'Специфікація (з вашою мовою)',
  offer: 'Пропозиція для маркетплейсу (англійською)',
  reviewTitle: 'Перегляд',
  reviewHint: 'Оберіть, що змінили б. Клієнт бачить два зображення й числа — ніколи вашу причину.',
  reviewPass: 'Пропустити без змін',
  reviewSend: 'Надіслати',
  reviewReason: 'Причина (клієнт не бачить)',
  reviewSent: 'Надіслано',
  reviewWaiting: 'Очікуємо відповідь клієнта',
  reviewNone: 'Поки нема чого переглядати — клієнт не завершив.',
  requestsTitle: 'Запити на зміни',
  requestsEmpty: 'Поки немає.',
  signupTitle: 'Реєстрація',
  signupLead: 'Отримуйте замовлення без англійської. Клієнту треба лише обрати.',
  signupAccount: 'Акаунт',
  signupEmail: 'Пошта',
  signupName: 'Видиме ім’я',
  signupLocale: 'Ваша мова',
  signupTimezone: 'Часовий пояс',
  signupTimezoneHint: 'Потрібен, щоб рахувати час сповіщень між поясами',
  signupSubmit: 'Зареєструватися',
  signupTime: 'Близько 2 хвилин',
  stepOf: 'Крок',
  signupDone: 'Акаунт створено',
  billingTitle: 'Спосіб оплати',
  billingNote:
    'Реєстрація безкоштовна. Комісія лише після укладеної угоди. Але спосіб оплати потрібен заздалегідь — ми виставляємо рахунок після, інакше не отримаємо оплату. Номери карток не зберігаємо, лише токен вашого провайдера.',
  billingKey: 'Ключ оплати',
  billingSubmit: 'Зареєструвати',
  billingNoCharge: 'Зараз нічого не списується. Це лише щоб стягнути комісію після укладеної угоди.',
  billingDone: 'Зареєстровано — тепер можна створювати посилання',
  toConsole: 'До консолі',
  err: {
    BILLING_REQUIRED: 'Додайте спосіб оплати, перш ніж створювати посилання.',
    PRO_SUSPENDED: 'Цей акаунт заблоковано.',
    UNAUTHORIZED: 'Увійдіть ще раз.',
    PROFILE_NOT_FOUND: 'Цей тип роботи більше недоступний.',
    EMAIL_TAKEN: 'Ця пошта вже зареєстрована.',
    EMAIL_INVALID: 'Перевірте адресу пошти.',
    NAME_REQUIRED: 'Введіть видиме ім’я.',
    LOCALE_UNSUPPORTED: 'Ця мова поки не підтримується.',
    TIMEZONE_INVALID: 'Перевірте часовий пояс.',
    BILLING_KEY_REQUIRED: 'Введіть ключ оплати.',
    PG_PROVIDER_REQUIRED: 'Оберіть платіжного провайдера.',
    LOOKS_LIKE_CARD_NUMBER: 'Схоже на номер картки. Вставте натомість ключ оплати.',
    TOO_MANY_PROPOSALS: 'Не більше 3 змін за раз.',
    DUPLICATE_AXIS_PROPOSAL: 'По одній зміні на аспект.',
    REVIEW_GATE_OFF: 'Це посилання фіксується без перевірки.',
    ALREADY_SETTLED: 'Специфікацію вже зафіксовано.',
    NEGOTIATION_PENDING: 'Очікуємо відповідь клієнта на вашу пропозицію.',
    GATE_LOCKED: 'Клієнт ще не завершив.',
  },
  errFallback: 'Щось пішло не так. Спробуйте ще раз.',
  errBillingCta: 'Додати зараз',
}

const TABLE: Readonly<Record<Locale, Copy>> = {
  en,
  ko,
  es,
  'pt-BR': ptBR,
  vi,
  hi,
  tl,
  uk,
  ja: A.ja,
  'zh-CN': A.zhCN,
  ar: A.ar,
  ur: A.ur,
  bn: A.bn,
  th: A.th,
  id: E.id,
  tr: E.tr,
  ru: E.ru,
  pl: E.pl,
  de: E.de,
  fr: E.fr,
}

export function copyFor(locale: string): Copy {
  return (LOCALES as readonly string[]).includes(locale) ? TABLE[locale as Locale] : en
}
