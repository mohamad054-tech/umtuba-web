import type { Metadata } from "next";
import type { AppLocale } from "../i18n/locales";
import { DEFAULT_LOCALE, isAppLocale } from "../i18n/locales";
import { BRAND } from "./brand";
import { buildPageMetadata, type PageIndexPolicy } from "./metadata";
export { ogLocaleFor } from "./ogLocale";

export type SeoRouteKey =
  | "home"
  | "life"
  | "store"
  | "learningCatalog"
  | "watch"
  | "discover"
  | "games"
  | "search";

export type SeoCopy = {
  title: string;
  description: string;
};

const EN: Record<SeoRouteKey, SeoCopy> = {
  home: {
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: `Watch short videos from creators on ${BRAND.name}. ${BRAND.tagline}. ${BRAND.mission}`,
  },
  life: {
    title: `UM Life — ${BRAND.name}`,
    description: `Read public posts from the UMTUBA community on UM Life. ${BRAND.tagline}.`,
  },
  store: {
    title: `Store — ${BRAND.name}`,
    description: `Browse the public ${BRAND.name} storefront for active products and creator shops.`,
  },
  learningCatalog: {
    title: `Learning Catalog — ${BRAND.name}`,
    description: `Browse free public courses on ${BRAND.name} Learning.`,
  },
  watch: {
    title: `Watch — ${BRAND.name}`,
    description: `Watch public videos on ${BRAND.name}. ${BRAND.tagline}.`,
  },
  discover: {
    title: `Discover — ${BRAND.name}`,
    description: `Discover creators and videos on ${BRAND.name}. ${BRAND.tagline}.`,
  },
  games: {
    title: `Games — ${BRAND.name}`,
    description: `Open the ${BRAND.name} Games hub.`,
  },
  search: {
    title: `Search — ${BRAND.name}`,
    description: `Search people, videos, stories, stores, and products on ${BRAND.name}.`,
  },
};

const COPY: Record<AppLocale, Record<SeoRouteKey, SeoCopy>> = {
  en: EN,
  ar: {
    home: {
      title: `${BRAND.name} — ${BRAND.taglineAr}`,
      description: `شاهد فيديوهات قصيرة من صنّاع المحتوى على ${BRAND.name}. ${BRAND.taglineAr}.`,
    },
    life: {
      title: `حياة UM — ${BRAND.name}`,
      description: `اقرأ المنشورات العامة من مجتمع ${BRAND.name} في حياة UM.`,
    },
    store: {
      title: `المتجر — ${BRAND.name}`,
      description: `تصفّح واجهة متجر ${BRAND.name} العامة للمنتجات والمتاجر النشطة.`,
    },
    learningCatalog: {
      title: `كتالوج التعلّم — ${BRAND.name}`,
      description: `تصفّح الدورات العامة المجانية في تعلّم ${BRAND.name}.`,
    },
    watch: {
      title: `شاهد — ${BRAND.name}`,
      description: `شاهد الفيديوهات العامة على ${BRAND.name}. ${BRAND.taglineAr}.`,
    },
    discover: {
      title: `اكتشف — ${BRAND.name}`,
      description: `اكتشف صنّاع المحتوى والفيديوهات على ${BRAND.name}.`,
    },
    games: {
      title: `الألعاب — ${BRAND.name}`,
      description: `افتح مركز ألعاب ${BRAND.name}.`,
    },
    search: {
      title: `بحث — ${BRAND.name}`,
      description: `ابحث عن أشخاص وفيديوهات وقصص ومتاجر ومنتجات على ${BRAND.name}.`,
    },
  },
  fr: {
    home: {
      title: `${BRAND.name} — ${BRAND.tagline}`,
      description: `Regardez de courtes vidéos de créateurs sur ${BRAND.name}. ${BRAND.tagline}.`,
    },
    life: {
      title: `UM Life — ${BRAND.name}`,
      description: `Lisez les publications publiques de la communauté ${BRAND.name} sur UM Life.`,
    },
    store: {
      title: `Boutique — ${BRAND.name}`,
      description: `Parcourez la vitrine publique ${BRAND.name} des produits et boutiques actives.`,
    },
    learningCatalog: {
      title: `Catalogue d’apprentissage — ${BRAND.name}`,
      description: `Parcourez les cours publics gratuits sur ${BRAND.name} Learning.`,
    },
    watch: {
      title: `Regarder — ${BRAND.name}`,
      description: `Regardez les vidéos publiques sur ${BRAND.name}.`,
    },
    discover: {
      title: `Découvrir — ${BRAND.name}`,
      description: `Découvrez des créateurs et des vidéos sur ${BRAND.name}.`,
    },
    games: {
      title: `Jeux — ${BRAND.name}`,
      description: `Ouvrez le hub Jeux de ${BRAND.name}.`,
    },
    search: {
      title: `Recherche — ${BRAND.name}`,
      description: `Recherchez des personnes, vidéos, histoires, boutiques et produits sur ${BRAND.name}.`,
    },
  },
  es: {
    home: {
      title: `${BRAND.name} — ${BRAND.tagline}`,
      description: `Mira videos cortos de creadores en ${BRAND.name}. ${BRAND.tagline}.`,
    },
    life: {
      title: `UM Life — ${BRAND.name}`,
      description: `Lee publicaciones públicas de la comunidad ${BRAND.name} en UM Life.`,
    },
    store: {
      title: `Tienda — ${BRAND.name}`,
      description: `Explora el escaparate público de ${BRAND.name} con productos y tiendas activas.`,
    },
    learningCatalog: {
      title: `Catálogo de aprendizaje — ${BRAND.name}`,
      description: `Explora cursos públicos gratuitos en ${BRAND.name} Learning.`,
    },
    watch: {
      title: `Ver — ${BRAND.name}`,
      description: `Mira videos públicos en ${BRAND.name}.`,
    },
    discover: {
      title: `Descubrir — ${BRAND.name}`,
      description: `Descubre creadores y videos en ${BRAND.name}.`,
    },
    games: {
      title: `Juegos — ${BRAND.name}`,
      description: `Abre el centro de juegos de ${BRAND.name}.`,
    },
    search: {
      title: `Buscar — ${BRAND.name}`,
      description: `Busca personas, videos, historias, tiendas y productos en ${BRAND.name}.`,
    },
  },
  de: {
    home: {
      title: `${BRAND.name} — ${BRAND.tagline}`,
      description: `Sieh dir kurze Videos von Creatorn auf ${BRAND.name} an. ${BRAND.tagline}.`,
    },
    life: {
      title: `UM Life — ${BRAND.name}`,
      description: `Lies öffentliche Beiträge der ${BRAND.name}-Community auf UM Life.`,
    },
    store: {
      title: `Shop — ${BRAND.name}`,
      description: `Durchstöbere die öffentliche ${BRAND.name}-Storefront mit aktiven Produkten und Shops.`,
    },
    learningCatalog: {
      title: `Lernkatalog — ${BRAND.name}`,
      description: `Durchstöbere öffentliche kostenlose Kurse auf ${BRAND.name} Learning.`,
    },
    watch: {
      title: `Ansehen — ${BRAND.name}`,
      description: `Sieh dir öffentliche Videos auf ${BRAND.name} an.`,
    },
    discover: {
      title: `Entdecken — ${BRAND.name}`,
      description: `Entdecke Creator und Videos auf ${BRAND.name}.`,
    },
    games: {
      title: `Spiele — ${BRAND.name}`,
      description: `Öffne den ${BRAND.name}-Spielehub.`,
    },
    search: {
      title: `Suche — ${BRAND.name}`,
      description: `Suche Personen, Videos, Stories, Shops und Produkte auf ${BRAND.name}.`,
    },
  },
  pt: {
    home: {
      title: `${BRAND.name} — ${BRAND.tagline}`,
      description: `Assista a vídeos curtos de criadores no ${BRAND.name}. ${BRAND.tagline}.`,
    },
    life: {
      title: `UM Life — ${BRAND.name}`,
      description: `Leia publicações públicas da comunidade ${BRAND.name} no UM Life.`,
    },
    store: {
      title: `Loja — ${BRAND.name}`,
      description: `Explore a vitrine pública do ${BRAND.name} com produtos e lojas ativas.`,
    },
    learningCatalog: {
      title: `Catálogo de aprendizagem — ${BRAND.name}`,
      description: `Explore cursos públicos gratuitos no ${BRAND.name} Learning.`,
    },
    watch: {
      title: `Assistir — ${BRAND.name}`,
      description: `Assista a vídeos públicos no ${BRAND.name}.`,
    },
    discover: {
      title: `Descobrir — ${BRAND.name}`,
      description: `Descubra criadores e vídeos no ${BRAND.name}.`,
    },
    games: {
      title: `Jogos — ${BRAND.name}`,
      description: `Abra o hub de jogos do ${BRAND.name}.`,
    },
    search: {
      title: `Pesquisar — ${BRAND.name}`,
      description: `Pesquise pessoas, vídeos, histórias, lojas e produtos no ${BRAND.name}.`,
    },
  },
  id: {
    home: {
      title: `${BRAND.name} — ${BRAND.tagline}`,
      description: `Tonton video pendek dari kreator di ${BRAND.name}. ${BRAND.tagline}.`,
    },
    life: {
      title: `UM Life — ${BRAND.name}`,
      description: `Baca unggahan publik komunitas ${BRAND.name} di UM Life.`,
    },
    store: {
      title: `Toko — ${BRAND.name}`,
      description: `Jelajahi etalase publik ${BRAND.name} untuk produk dan toko aktif.`,
    },
    learningCatalog: {
      title: `Katalog pembelajaran — ${BRAND.name}`,
      description: `Jelajahi kursus publik gratis di ${BRAND.name} Learning.`,
    },
    watch: {
      title: `Tonton — ${BRAND.name}`,
      description: `Tonton video publik di ${BRAND.name}.`,
    },
    discover: {
      title: `Temukan — ${BRAND.name}`,
      description: `Temukan kreator dan video di ${BRAND.name}.`,
    },
    games: {
      title: `Game — ${BRAND.name}`,
      description: `Buka hub Game ${BRAND.name}.`,
    },
    search: {
      title: `Cari — ${BRAND.name}`,
      description: `Cari orang, video, cerita, toko, dan produk di ${BRAND.name}.`,
    },
  },
  hi: {
    home: {
      title: `${BRAND.name} — ${BRAND.tagline}`,
      description: `${BRAND.name} पर रचनाकारों के छोटे वीडियो देखें. ${BRAND.tagline}.`,
    },
    life: {
      title: `UM Life — ${BRAND.name}`,
      description: `UM Life पर ${BRAND.name} समुदाय की सार्वजनिक पोस्ट पढ़ें.`,
    },
    store: {
      title: `स्टोर — ${BRAND.name}`,
      description: `सक्रिय उत्पादों और दुकानों के लिए सार्वजनिक ${BRAND.name} स्टोर देखें.`,
    },
    learningCatalog: {
      title: `लर्निंग कैटलॉग — ${BRAND.name}`,
      description: `${BRAND.name} Learning पर सार्वजनिक मुफ़्त पाठ्यक्रम देखें.`,
    },
    watch: {
      title: `देखें — ${BRAND.name}`,
      description: `${BRAND.name} पर सार्वजनिक वीडियो देखें.`,
    },
    discover: {
      title: `डिस्कवर — ${BRAND.name}`,
      description: `${BRAND.name} पर रचनाकार और वीडियो खोजें.`,
    },
    games: {
      title: `गेम्स — ${BRAND.name}`,
      description: `${BRAND.name} गेम्स हब खोलें.`,
    },
    search: {
      title: `खोज — ${BRAND.name}`,
      description: `${BRAND.name} पर लोग, वीडियो, स्टोरी, स्टोर और उत्पाद खोजें.`,
    },
  },
  ru: {
    home: {
      title: `${BRAND.name} — ${BRAND.tagline}`,
      description: `Смотрите короткие видео авторов на ${BRAND.name}. ${BRAND.tagline}.`,
    },
    life: {
      title: `UM Life — ${BRAND.name}`,
      description: `Читайте публичные записи сообщества ${BRAND.name} в UM Life.`,
    },
    store: {
      title: `Магазин — ${BRAND.name}`,
      description: `Смотрите публичную витрину ${BRAND.name} с активными товарами и магазинами.`,
    },
    learningCatalog: {
      title: `Каталог обучения — ${BRAND.name}`,
      description: `Смотрите бесплатные публичные курсы на ${BRAND.name} Learning.`,
    },
    watch: {
      title: `Смотреть — ${BRAND.name}`,
      description: `Смотрите публичные видео на ${BRAND.name}.`,
    },
    discover: {
      title: `Обзор — ${BRAND.name}`,
      description: `Открывайте авторов и видео на ${BRAND.name}.`,
    },
    games: {
      title: `Игры — ${BRAND.name}`,
      description: `Откройте хаб игр ${BRAND.name}.`,
    },
    search: {
      title: `Поиск — ${BRAND.name}`,
      description: `Ищите людей, видео, истории, магазины и товары на ${BRAND.name}.`,
    },
  },
  tr: {
    home: {
      title: `${BRAND.name} — ${BRAND.tagline}`,
      description: `${BRAND.name} üzerinde yaratıcıların kısa videolarını izleyin. ${BRAND.tagline}.`,
    },
    life: {
      title: `UM Life — ${BRAND.name}`,
      description: `${BRAND.name} topluluğunun herkese açık gönderilerini UM Life’da okuyun.`,
    },
    store: {
      title: `Mağaza — ${BRAND.name}`,
      description: `Aktif ürünler ve mağazalar için herkese açık ${BRAND.name} vitrinini gezin.`,
    },
    learningCatalog: {
      title: `Öğrenme kataloğu — ${BRAND.name}`,
      description: `${BRAND.name} Learning üzerindeki herkese açık ücretsiz kurslara göz atın.`,
    },
    watch: {
      title: `İzle — ${BRAND.name}`,
      description: `${BRAND.name} üzerindeki herkese açık videoları izleyin.`,
    },
    discover: {
      title: `Keşfet — ${BRAND.name}`,
      description: `${BRAND.name} üzerinde yaratıcıları ve videoları keşfedin.`,
    },
    games: {
      title: `Oyunlar — ${BRAND.name}`,
      description: `${BRAND.name} Oyunlar merkezini açın.`,
    },
    search: {
      title: `Ara — ${BRAND.name}`,
      description: `${BRAND.name} üzerinde kişi, video, hikâye, mağaza ve ürün arayın.`,
    },
  },
  "zh-CN": {
    home: {
      title: `${BRAND.name} — ${BRAND.tagline}`,
      description: `在 ${BRAND.name} 观看创作者的短视频。${BRAND.tagline}。`,
    },
    life: {
      title: `UM Life — ${BRAND.name}`,
      description: `在 UM Life 阅读 ${BRAND.name} 社区的公开动态。`,
    },
    store: {
      title: `商店 — ${BRAND.name}`,
      description: `浏览 ${BRAND.name} 公开店面中的在售商品与店铺。`,
    },
    learningCatalog: {
      title: `学习目录 — ${BRAND.name}`,
      description: `浏览 ${BRAND.name} Learning 上的公开免费课程。`,
    },
    watch: {
      title: `观看 — ${BRAND.name}`,
      description: `在 ${BRAND.name} 观看公开视频。`,
    },
    discover: {
      title: `发现 — ${BRAND.name}`,
      description: `在 ${BRAND.name} 发现创作者和视频。`,
    },
    games: {
      title: `游戏 — ${BRAND.name}`,
      description: `打开 ${BRAND.name} 游戏中心。`,
    },
    search: {
      title: `搜索 — ${BRAND.name}`,
      description: `在 ${BRAND.name} 搜索用户、视频、故事、店铺和商品。`,
    },
  },
  ja: {
    home: {
      title: `${BRAND.name} — ${BRAND.tagline}`,
      description: `${BRAND.name} でクリエイターのショート動画を視聴できます。${BRAND.tagline}。`,
    },
    life: {
      title: `UM Life — ${BRAND.name}`,
      description: `UM Life で ${BRAND.name} コミュニティの公開投稿を読めます。`,
    },
    store: {
      title: `ストア — ${BRAND.name}`,
      description: `${BRAND.name} の公開ストアで販売中の商品とショップを探せます。`,
    },
    learningCatalog: {
      title: `ラーニングカタログ — ${BRAND.name}`,
      description: `${BRAND.name} Learning の公開無料コースを閲覧できます。`,
    },
    watch: {
      title: `視聴 — ${BRAND.name}`,
      description: `${BRAND.name} の公開動画を視聴できます。`,
    },
    discover: {
      title: `見つける — ${BRAND.name}`,
      description: `${BRAND.name} でクリエイターと動画を見つけられます。`,
    },
    games: {
      title: `ゲーム — ${BRAND.name}`,
      description: `${BRAND.name} のゲームハブを開きます。プレイ可能なカタログはまだありません。`,
    },
    search: {
      title: `検索 — ${BRAND.name}`,
      description: `${BRAND.name} で人、動画、ストーリー、ショップ、商品を検索できます。`,
    },
  },
  ko: {
    home: {
      title: `${BRAND.name} — ${BRAND.tagline}`,
      description: `${BRAND.name}에서 크리에이터의 짧은 영상을 시청하세요. ${BRAND.tagline}.`,
    },
    life: {
      title: `UM Life — ${BRAND.name}`,
      description: `UM Life에서 ${BRAND.name} 커뮤니티의 공개 게시물을 읽으세요.`,
    },
    store: {
      title: `스토어 — ${BRAND.name}`,
      description: `판매 중인 상품과 상점의 공개 ${BRAND.name} 스토어를 둘러보세요.`,
    },
    learningCatalog: {
      title: `러닝 카탈로그 — ${BRAND.name}`,
      description: `${BRAND.name} Learning의 공개 무료 강좌를 둘러보세요.`,
    },
    watch: {
      title: `시청 — ${BRAND.name}`,
      description: `${BRAND.name}의 공개 영상을 시청하세요.`,
    },
    discover: {
      title: `발견 — ${BRAND.name}`,
      description: `${BRAND.name}에서 크리에이터와 영상을 찾아보세요.`,
    },
    games: {
      title: `게임 — ${BRAND.name}`,
      description: `${BRAND.name} 게임 허브를 엽니다.`,
    },
    search: {
      title: `검색 — ${BRAND.name}`,
      description: `${BRAND.name}에서 사람, 영상, 스토리, 스토어, 상품을 검색하세요.`,
    },
  },
};

export function resolveSeoLocale(raw: string | null | undefined): AppLocale {
  return isAppLocale(raw) ? raw : DEFAULT_LOCALE;
}

export function getSeoCopy(key: SeoRouteKey, locale: AppLocale): SeoCopy {
  return COPY[locale][key];
}

export function buildLocalizedRouteMetadata(input: {
  key: SeoRouteKey;
  path: string;
  locale: AppLocale;
  index?: PageIndexPolicy;
  absoluteTitle?: boolean;
}): Metadata {
  const copy = getSeoCopy(input.key, input.locale);
  const meta = buildPageMetadata({
    title: copy.title,
    description: copy.description,
    path: input.path,
    index: input.index ?? "index",
    locale: input.locale,
  });
  return {
    ...meta,
    title: { absolute: copy.title },
  };
}

export const SEO_ROUTE_KEYS: readonly SeoRouteKey[] = [
  "home",
  "life",
  "store",
  "learningCatalog",
  "watch",
  "discover",
  "games",
  "search",
];
