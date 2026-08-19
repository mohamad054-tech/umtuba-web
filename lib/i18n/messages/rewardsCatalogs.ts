import type { AppLocale } from "../locales";

export type RewardsMessages = {
  "rewards.title": string;
  "rewards.eyebrow": string;
  "rewards.intro": string;
  "rewards.balance": string;
  "rewards.earnedToday": string;
  "rewards.nextMilestone": string;
  "rewards.maxed": string;
  "rewards.progress": string;
  "rewards.empty": string;
  "rewards.recent": string;
  "rewards.toast": string;
  "rewards.invite.title": string;
  "rewards.invite.body": string;
  "rewards.invite.copy": string;
  "rewards.invite.copied": string;
  "rewards.invite.copyError": string;
  "rewards.invite.shareWhatsApp": string;
  "rewards.invite.code": string;
  "rewards.invite.successful": string;
  "rewards.invite.pending": string;
  "rewards.invite.points": string;
};

const en: RewardsMessages = {
  "rewards.title": "UM Points",
  "rewards.eyebrow": "Rewards",
  "rewards.intro":
    "Earn UM Points for real participation. They stay inside UMTUBA — not cash, crypto, or a transferable asset.",
  "rewards.balance": "Balance",
  "rewards.earnedToday": "Earned today",
  "rewards.nextMilestone": "Next milestone",
  "rewards.maxed": "Maxed",
  "rewards.progress": "Milestone progress",
  "rewards.empty":
    "No UM Points yet. Publish, comment, invite a friend, or keep learning.",
  "rewards.recent": "Recent activity",
  "rewards.toast": "+{points} UM Points",
  "rewards.invite.title": "Share your invitation link",
  "rewards.invite.body":
    "Earn {points} UM Points when someone creates an account through your link.",
  "rewards.invite.copy": "Copy link",
  "rewards.invite.copied": "Copied",
  "rewards.invite.copyError": "Couldn't copy the invite link. Please copy it manually.",
  "rewards.invite.shareWhatsApp": "Share on WhatsApp",
  "rewards.invite.code": "Your code",
  "rewards.invite.successful": "Successful invites",
  "rewards.invite.pending": "Pending",
  "rewards.invite.points": "Points from invites",
};

export const REWARDS_CATALOGS: Record<AppLocale, RewardsMessages> = {
  en,
  ar: {
    "rewards.title": "نقاط UM",
    "rewards.eyebrow": "المكافآت",
    "rewards.intro":
      "اكسب نقاط UM بالمشاركة الحقيقية. تبقى داخل UMTUBA — ليست مالاً ولا عملة رقمية ولا أصلاً قابلاً للتحويل.",
    "rewards.balance": "الرصيد",
    "rewards.earnedToday": "المكتسب اليوم",
    "rewards.nextMilestone": "الإنجاز التالي",
    "rewards.maxed": "اكتمل",
    "rewards.progress": "تقدم الإنجاز",
    "rewards.empty": "لا نقاط بعد. انشر أو علّق أو ادعُ صديقاً أو تابع التعلّم.",
    "rewards.recent": "النشاط الأخير",
    "rewards.toast": "+{points} نقطة UM",
    "rewards.invite.title": "شارك رابط دعوتك",
    "rewards.invite.body":
      "اكسب {points} نقطة UM عندما ينشئ أحد حساباً عبر رابطك.",
    "rewards.invite.copy": "نسخ الرابط",
    "rewards.invite.copied": "تم النسخ",
    "rewards.invite.copyError": "تعذّر نسخ الرابط. انسخه يدوياً.",
    "rewards.invite.shareWhatsApp": "مشاركة عبر واتساب",
    "rewards.invite.code": "رمزك",
    "rewards.invite.successful": "دعوات ناجحة",
    "rewards.invite.pending": "قيد الانتظار",
    "rewards.invite.points": "نقاط الدعوات",
  },
  fr: {
    "rewards.title": "Points UM",
    "rewards.eyebrow": "Récompenses",
    "rewards.intro":
      "Gagnez des points UM pour une vraie participation. Ils restent dans UMTUBA — pas d’argent, ni crypto, ni actif transférable.",
    "rewards.balance": "Solde",
    "rewards.earnedToday": "Gagnés aujourd’hui",
    "rewards.nextMilestone": "Prochain palier",
    "rewards.maxed": "Maximum",
    "rewards.progress": "Progression",
    "rewards.empty":
      "Pas encore de points UM. Publiez, commentez, invitez ou continuez d’apprendre.",
    "rewards.recent": "Activité récente",
    "rewards.toast": "+{points} points UM",
    "rewards.invite.title": "Partagez votre lien d’invitation",
    "rewards.invite.body":
      "Gagnez {points} points UM lorsqu’une personne crée un compte via votre lien.",
    "rewards.invite.copy": "Copier le lien",
    "rewards.invite.copied": "Copié",
    "rewards.invite.copyError": "Impossible de copier le lien. Copiez-le manuellement.",
    "rewards.invite.shareWhatsApp": "Partager sur WhatsApp",
    "rewards.invite.code": "Votre code",
    "rewards.invite.successful": "Invitations réussies",
    "rewards.invite.pending": "En attente",
    "rewards.invite.points": "Points d’invitation",
  },
  es: {
    "rewards.title": "Puntos UM",
    "rewards.eyebrow": "Recompensas",
    "rewards.intro":
      "Gana puntos UM por participar de verdad. Se quedan en UMTUBA: no son dinero, cripto ni un activo transferible.",
    "rewards.balance": "Saldo",
    "rewards.earnedToday": "Ganados hoy",
    "rewards.nextMilestone": "Siguiente hito",
    "rewards.maxed": "Máximo",
    "rewards.progress": "Progreso",
    "rewards.empty":
      "Aún no hay puntos UM. Publica, comenta, invita o sigue aprendiendo.",
    "rewards.recent": "Actividad reciente",
    "rewards.toast": "+{points} puntos UM",
    "rewards.invite.title": "Comparte tu enlace de invitación",
    "rewards.invite.body":
      "Gana {points} puntos UM cuando alguien cree una cuenta con tu enlace.",
    "rewards.invite.copy": "Copiar enlace",
    "rewards.invite.copied": "Copiado",
    "rewards.invite.copyError": "No se pudo copiar el enlace. Cópialo manualmente.",
    "rewards.invite.shareWhatsApp": "Compartir en WhatsApp",
    "rewards.invite.code": "Tu código",
    "rewards.invite.successful": "Invitaciones exitosas",
    "rewards.invite.pending": "Pendientes",
    "rewards.invite.points": "Puntos por invitaciones",
  },
  de: {
    "rewards.title": "UM-Punkte",
    "rewards.eyebrow": "Belohnungen",
    "rewards.intro":
      "Sammle UM-Punkte für echte Teilnahme. Sie bleiben in UMTUBA — kein Geld, kein Krypto, kein übertragbares Asset.",
    "rewards.balance": "Guthaben",
    "rewards.earnedToday": "Heute verdient",
    "rewards.nextMilestone": "Nächster Meilenstein",
    "rewards.maxed": "Maximum",
    "rewards.progress": "Fortschritt",
    "rewards.empty":
      "Noch keine UM-Punkte. Veröffentlichen, kommentieren, einladen oder weiterlernen.",
    "rewards.recent": "Letzte Aktivität",
    "rewards.toast": "+{points} UM-Punkte",
    "rewards.invite.title": "Teile deinen Einladungslink",
    "rewards.invite.body":
      "Verdiene {points} UM-Punkte, wenn jemand über deinen Link ein Konto erstellt.",
    "rewards.invite.copy": "Link kopieren",
    "rewards.invite.copied": "Kopiert",
    "rewards.invite.copyError": "Link konnte nicht kopiert werden. Bitte manuell kopieren.",
    "rewards.invite.shareWhatsApp": "Über WhatsApp teilen",
    "rewards.invite.code": "Dein Code",
    "rewards.invite.successful": "Erfolgreiche Einladungen",
    "rewards.invite.pending": "Ausstehend",
    "rewards.invite.points": "Punkte aus Einladungen",
  },
  pt: {
    "rewards.title": "Pontos UM",
    "rewards.eyebrow": "Recompensas",
    "rewards.intro":
      "Ganhe pontos UM por participação real. Eles ficam no UMTUBA — sem dinheiro, cripto ou ativo transferível.",
    "rewards.balance": "Saldo",
    "rewards.earnedToday": "Ganhos hoje",
    "rewards.nextMilestone": "Próxima meta",
    "rewards.maxed": "Máximo",
    "rewards.progress": "Progresso",
    "rewards.empty":
      "Ainda não há pontos UM. Publique, comente, convide ou continue aprendendo.",
    "rewards.recent": "Atividade recente",
    "rewards.toast": "+{points} pontos UM",
    "rewards.invite.title": "Compartilhe seu link de convite",
    "rewards.invite.body":
      "Ganhe {points} pontos UM quando alguém criar uma conta pelo seu link.",
    "rewards.invite.copy": "Copiar link",
    "rewards.invite.copied": "Copiado",
    "rewards.invite.copyError": "Não foi possível copiar o link. Copie manualmente.",
    "rewards.invite.shareWhatsApp": "Compartilhar no WhatsApp",
    "rewards.invite.code": "Seu código",
    "rewards.invite.successful": "Convites bem-sucedidos",
    "rewards.invite.pending": "Pendentes",
    "rewards.invite.points": "Pontos de convites",
  },
  id: {
    "rewards.title": "Poin UM",
    "rewards.eyebrow": "Hadiah",
    "rewards.intro":
      "Dapatkan Poin UM dari partisipasi nyata. Tetap di UMTUBA — bukan uang, kripto, atau aset yang bisa ditransfer.",
    "rewards.balance": "Saldo",
    "rewards.earnedToday": "Diperoleh hari ini",
    "rewards.nextMilestone": "Pencapaian berikutnya",
    "rewards.maxed": "Maksimum",
    "rewards.progress": "Progres",
    "rewards.empty":
      "Belum ada Poin UM. Terbitkan, berkomentar, undang, atau terus belajar.",
    "rewards.recent": "Aktivitas terbaru",
    "rewards.toast": "+{points} Poin UM",
    "rewards.invite.title": "Bagikan tautan undangan Anda",
    "rewards.invite.body":
      "Dapatkan {points} Poin UM saat seseorang membuat akun lewat tautan Anda.",
    "rewards.invite.copy": "Salin tautan",
    "rewards.invite.copied": "Tersalin",
    "rewards.invite.copyError": "Tidak bisa menyalin tautan. Salin secara manual.",
    "rewards.invite.shareWhatsApp": "Bagikan ke WhatsApp",
    "rewards.invite.code": "Kode Anda",
    "rewards.invite.successful": "Undangan berhasil",
    "rewards.invite.pending": "Menunggu",
    "rewards.invite.points": "Poin dari undangan",
  },
  hi: {
    "rewards.title": "UM पॉइंट्स",
    "rewards.eyebrow": "इनाम",
    "rewards.intro":
      "असली भागीदारी पर UM पॉइंट्स कमाएँ। ये UMTUBA के अंदर रहते हैं — न नकद, न क्रिप्टो, न हस्तांतरणीय संपत्ति।",
    "rewards.balance": "शेष",
    "rewards.earnedToday": "आज कमाए",
    "rewards.nextMilestone": "अगला मील का पत्थर",
    "rewards.maxed": "पूर्ण",
    "rewards.progress": "प्रगति",
    "rewards.empty":
      "अभी UM पॉइंट्स नहीं। प्रकाशित करें, टिप्पणी करें, आमंत्रित करें या सीखते रहें।",
    "rewards.recent": "हाल की गतिविधि",
    "rewards.toast": "+{points} UM पॉइंट्स",
    "rewards.invite.title": "अपना आमंत्रण लिंक साझा करें",
    "rewards.invite.body":
      "जब कोई आपके लिंक से खाता बनाए तो {points} UM पॉइंट्स कमाएँ।",
    "rewards.invite.copy": "लिंक कॉपी करें",
    "rewards.invite.copied": "कॉपी हो गया",
    "rewards.invite.copyError": "लिंक कॉपी नहीं हो सका। कृपया स्वयं कॉपी करें।",
    "rewards.invite.shareWhatsApp": "व्हाट्सऐप पर साझा करें",
    "rewards.invite.code": "आपका कोड",
    "rewards.invite.successful": "सफल आमंत्रण",
    "rewards.invite.pending": "लंबित",
    "rewards.invite.points": "आमंत्रण से पॉइंट्स",
  },
  ru: {
    "rewards.title": "Баллы UM",
    "rewards.eyebrow": "Награды",
    "rewards.intro":
      "Получайте баллы UM за реальное участие. Они остаются в UMTUBA — не деньги, не крипто и не передаваемый актив.",
    "rewards.balance": "Баланс",
    "rewards.earnedToday": "Заработано сегодня",
    "rewards.nextMilestone": "Следующая цель",
    "rewards.maxed": "Максимум",
    "rewards.progress": "Прогресс",
    "rewards.empty":
      "Пока нет баллов UM. Публикуйте, комментируйте, приглашайте или учитесь.",
    "rewards.recent": "Недавняя активность",
    "rewards.toast": "+{points} баллов UM",
    "rewards.invite.title": "Поделитесь приглашением",
    "rewards.invite.body":
      "Получите {points} баллов UM, когда кто-то создаст аккаунт по вашей ссылке.",
    "rewards.invite.copy": "Копировать ссылку",
    "rewards.invite.copied": "Скопировано",
    "rewards.invite.copyError": "Не удалось скопировать ссылку. Скопируйте вручную.",
    "rewards.invite.shareWhatsApp": "Поделиться в WhatsApp",
    "rewards.invite.code": "Ваш код",
    "rewards.invite.successful": "Успешные приглашения",
    "rewards.invite.pending": "В ожидании",
    "rewards.invite.points": "Баллы за приглашения",
  },
  tr: {
    "rewards.title": "UM Puanları",
    "rewards.eyebrow": "Ödüller",
    "rewards.intro":
      "Gerçek katılım için UM Puanı kazanın. UMTUBA içinde kalır — nakit, kripto veya devredilebilir varlık değildir.",
    "rewards.balance": "Bakiye",
    "rewards.earnedToday": "Bugün kazanılan",
    "rewards.nextMilestone": "Sonraki hedef",
    "rewards.maxed": "Maksimum",
    "rewards.progress": "İlerleme",
    "rewards.empty":
      "Henüz UM Puanı yok. Yayınlayın, yorum yapın, davet edin veya öğrenmeye devam edin.",
    "rewards.recent": "Son etkinlik",
    "rewards.toast": "+{points} UM Puanı",
    "rewards.invite.title": "Davet bağlantını paylaş",
    "rewards.invite.body":
      "Birisi bağlantınla hesap oluşturduğunda {points} UM Puanı kazan.",
    "rewards.invite.copy": "Bağlantıyı kopyala",
    "rewards.invite.copied": "Kopyalandı",
    "rewards.invite.copyError": "Bağlantı kopyalanamadı. Lütfen elle kopyalayın.",
    "rewards.invite.shareWhatsApp": "WhatsApp’ta paylaş",
    "rewards.invite.code": "Kodun",
    "rewards.invite.successful": "Başarılı davetler",
    "rewards.invite.pending": "Beklemede",
    "rewards.invite.points": "Davet puanları",
  },
  "zh-CN": {
    "rewards.title": "UM 积分",
    "rewards.eyebrow": "奖励",
    "rewards.intro":
      "通过真实参与赚取 UM 积分。积分仅在 UMTUBA 内有效——不是现金、加密货币或可转让资产。",
    "rewards.balance": "余额",
    "rewards.earnedToday": "今日已赚",
    "rewards.nextMilestone": "下一里程碑",
    "rewards.maxed": "已满",
    "rewards.progress": "进度",
    "rewards.empty": "还没有 UM 积分。发布、评论、邀请好友或继续学习。",
    "rewards.recent": "最近动态",
    "rewards.toast": "+{points} UM 积分",
    "rewards.invite.title": "分享你的邀请链接",
    "rewards.invite.body": "有人通过你的链接注册后，你将获得 {points} UM 积分。",
    "rewards.invite.copy": "复制链接",
    "rewards.invite.copied": "已复制",
    "rewards.invite.copyError": "无法复制链接，请手动复制。",
    "rewards.invite.shareWhatsApp": "分享到 WhatsApp",
    "rewards.invite.code": "你的代码",
    "rewards.invite.successful": "成功邀请",
    "rewards.invite.pending": "待完成",
    "rewards.invite.points": "邀请积分",
  },
  ja: {
    "rewards.title": "UMポイント",
    "rewards.eyebrow": "リワード",
    "rewards.intro":
      "本物の参加でUMポイントを獲得。UMTUBA内だけのポイントで、現金・暗号資産・譲渡可能な資産ではありません。",
    "rewards.balance": "残高",
    "rewards.earnedToday": "今日の獲得",
    "rewards.nextMilestone": "次のマイルストーン",
    "rewards.maxed": "上限",
    "rewards.progress": "進捗",
    "rewards.empty":
      "まだUMポイントがありません。投稿、コメント、招待、学習を続けましょう。",
    "rewards.recent": "最近のアクティビティ",
    "rewards.toast": "+{points} UMポイント",
    "rewards.invite.title": "招待リンクを共有",
    "rewards.invite.body":
      "あなたのリンクからアカウントが作成されると {points} UMポイントを獲得できます。",
    "rewards.invite.copy": "リンクをコピー",
    "rewards.invite.copied": "コピーしました",
    "rewards.invite.copyError": "リンクをコピーできませんでした。手動でコピーしてください。",
    "rewards.invite.shareWhatsApp": "WhatsAppで共有",
    "rewards.invite.code": "あなたのコード",
    "rewards.invite.successful": "成功した招待",
    "rewards.invite.pending": "保留中",
    "rewards.invite.points": "招待ポイント",
  },
  ko: {
    "rewards.title": "UM 포인트",
    "rewards.eyebrow": "리워드",
    "rewards.intro":
      "실제 참여로 UM 포인트를 받으세요. UMTUBA 안에서만 쓰이며 현금, 암호화폐, 양도 자산이 아닙니다.",
    "rewards.balance": "잔액",
    "rewards.earnedToday": "오늘 획득",
    "rewards.nextMilestone": "다음 이정표",
    "rewards.maxed": "최대",
    "rewards.progress": "진행률",
    "rewards.empty":
      "아직 UM 포인트가 없습니다. 게시, 댓글, 초대 또는 학습을 이어 가세요.",
    "rewards.recent": "최근 활동",
    "rewards.toast": "+{points} UM 포인트",
    "rewards.invite.title": "초대 링크 공유",
    "rewards.invite.body":
      "내 링크로 계정을 만들면 {points} UM 포인트를 받습니다.",
    "rewards.invite.copy": "링크 복사",
    "rewards.invite.copied": "복사됨",
    "rewards.invite.copyError": "링크를 복사하지 못했습니다. 직접 복사해 주세요.",
    "rewards.invite.shareWhatsApp": "WhatsApp으로 공유",
    "rewards.invite.code": "내 코드",
    "rewards.invite.successful": "성공한 초대",
    "rewards.invite.pending": "대기 중",
    "rewards.invite.points": "초대 포인트",
  },
};

export function translateRewards(
  locale: AppLocale,
  key: keyof RewardsMessages,
  values?: Record<string, string | number>
): string {
  const catalog = REWARDS_CATALOGS[locale] ?? en;
  let text = catalog[key] || en[key] || key;
  if (values) {
    text = text.replace(/\{(\w+)\}/g, (match, name: string) => {
      const value = values[name];
      return value == null ? match : String(value);
    });
  }
  return text;
}
