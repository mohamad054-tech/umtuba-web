import {
  STORE_DEPARTMENTS,
  STORE_SUBCATEGORIES,
  type StoreDepartment,
} from "../../services/cj/expansionTaxonomy";
import { REQUIRED_STORE_LOCALES, type StoreLocale } from "./requiredLocales";
import { EXTRA_DEPARTMENT_BY_LOCALE, EXTRA_SUBCATEGORY_BY_LOCALE } from "./taxonomyLocaleExtended";

export const DEPARTMENT_LABEL_EN: Record<StoreDepartment, string> = {
  HOME: "Home",
  FASHION: "Fashion",
  "BEAUTY & PERSONAL": "Beauty & Personal",
  CAR: "Car",
  PET: "Pet",
  TRAVEL: "Travel",
  "ELECTRONICS & ACCESSORIES": "Electronics & Accessories",
  "KIDS & TOYS": "Kids & Toys",
  "SPORTS & FITNESS": "Sports & Fitness",
  "GARDEN & OUTDOOR": "Garden & Outdoor",
};

export const DEPARTMENT_LABEL_AR: Record<StoreDepartment, string> = {
  HOME: "المنزل",
  FASHION: "الأزياء",
  "BEAUTY & PERSONAL": "الجمال والعناية الشخصية",
  CAR: "السيارات",
  PET: "الحيوانات الأليفة",
  TRAVEL: "السفر",
  "ELECTRONICS & ACCESSORIES": "الإلكترونيات والإكسسوارات",
  "KIDS & TOYS": "الأطفال والألعاب",
  "SPORTS & FITNESS": "الرياضة واللياقة",
  "GARDEN & OUTDOOR": "الحديقة والخارج",
};

const SUBCATEGORY_AR: Record<string, string> = {
  Kitchen: "المطبخ",
  Baking: "الخَبز",
  "Storage & Organization": "التخزين والتنظيم",
  Cleaning: "التنظيف",
  Bathroom: "الحمّام",
  Lighting: "الإضاءة",
  "Home Decor": "ديكور المنزل",
  "Small Home Accessories": "إكسسوارات منزلية صغيرة",
  Women: "نسائي",
  Men: "رجالي",
  Kids: "أطفال",
  Bags: "حقائب",
  "Fashion Accessories": "إكسسوارات الأزياء",
  Jewellery: "مجوهرات",
  "Scarves / Hats / Small Accessories": "أوشحة / قبعات / إكسسوارات صغيرة",
  "Makeup Tools": "أدوات المكياج",
  "Hair Accessories": "إكسسوارات الشعر",
  "Personal Care Tools": "أدوات العناية الشخصية",
  "Nail Accessories": "إكسسوارات الأظافر",
  "Beauty Organizers": "منظّمات التجميل",
  "Phone Holders": "حاملات الهاتف",
  "Interior Organization": "تنظيم المقصورة",
  "Travel Accessories": "إكسسوارات السفر",
  "Small Car Accessories": "إكسسوارات سيارة صغيرة",
  Cats: "القطط",
  Dogs: "الكلاب",
  "Bowls & Feeding": "الأوعية والتغذية",
  Travel: "السفر",
  Grooming: "العناية",
  "Toys & Accessories": "الألعاب والإكسسوارات",
  "Luggage Organization": "تنظيم الأمتعة",
  "Packing Accessories": "إكسسوارات التعبئة",
  "Travel Comfort": "راحة السفر",
  "Travel Safety": "أمان السفر",
  "Portable Accessories": "إكسسوارات محمولة",
  "Phone Accessories": "إكسسوارات الهاتف",
  "Desk Accessories": "إكسسوارات المكتب",
  "Cables / Adapters": "كابلات / محوّلات",
  "Stands / Holders": "حوامل",
  "Small Smart Accessories": "إكسسوارات ذكية صغيرة",
  "Educational Toys": "ألعاب تعليمية",
  Organization: "التنظيم",
  "Safe Lightweight Toys": "ألعاب خفيفة وآمنة",
  "Workout Accessories": "إكسسوارات التمرين",
  "Resistance / Stretching": "المقاومة / التمدد",
  "Small Fitness Tools": "أدوات لياقة صغيرة",
  "Outdoor Accessories": "إكسسوارات خارجية",
  "Garden Tools": "أدوات الحديقة",
  "Plant Accessories": "إكسسوارات النباتات",
  "Outdoor Organization": "تنظيم خارجي",
  "Solar / Outdoor Accessories": "إكسسوارات شمسية / خارجية",
};

export const DEPARTMENT_LABEL_FR: Record<StoreDepartment, string> = {
  HOME: "Maison",
  FASHION: "Mode",
  "BEAUTY & PERSONAL": "Beauté et soins",
  CAR: "Auto",
  PET: "Animaux",
  TRAVEL: "Voyage",
  "ELECTRONICS & ACCESSORIES": "Électronique et accessoires",
  "KIDS & TOYS": "Enfants et jouets",
  "SPORTS & FITNESS": "Sport et fitness",
  "GARDEN & OUTDOOR": "Jardin et extérieur",
};

export const DEPARTMENT_LABEL_ES: Record<StoreDepartment, string> = {
  HOME: "Hogar",
  FASHION: "Moda",
  "BEAUTY & PERSONAL": "Belleza y cuidado personal",
  CAR: "Coche",
  PET: "Mascotas",
  TRAVEL: "Viajes",
  "ELECTRONICS & ACCESSORIES": "Electrónica y accesorios",
  "KIDS & TOYS": "Niños y juguetes",
  "SPORTS & FITNESS": "Deportes y fitness",
  "GARDEN & OUTDOOR": "Jardín y exterior",
};

export const DEPARTMENT_LABEL_DE: Record<StoreDepartment, string> = {
  HOME: "Zuhause",
  FASHION: "Mode",
  "BEAUTY & PERSONAL": "Schönheit und Pflege",
  CAR: "Auto",
  PET: "Haustiere",
  TRAVEL: "Reisen",
  "ELECTRONICS & ACCESSORIES": "Elektronik und Zubehör",
  "KIDS & TOYS": "Kinder und Spielzeug",
  "SPORTS & FITNESS": "Sport und Fitness",
  "GARDEN & OUTDOOR": "Garten und Outdoor",
};

export const DEPARTMENT_LABEL_PT: Record<StoreDepartment, string> = {
  HOME: "Casa",
  FASHION: "Moda",
  "BEAUTY & PERSONAL": "Beleza e cuidados pessoais",
  CAR: "Carro",
  PET: "Animais de estimação",
  TRAVEL: "Viagem",
  "ELECTRONICS & ACCESSORIES": "Eletrônicos e acessórios",
  "KIDS & TOYS": "Crianças e brinquedos",
  "SPORTS & FITNESS": "Esportes e fitness",
  "GARDEN & OUTDOOR": "Jardim e exterior",
};

const DEPARTMENT_BY_LOCALE: Record<StoreLocale, Record<StoreDepartment, string>> = {
  en: DEPARTMENT_LABEL_EN,
  ar: DEPARTMENT_LABEL_AR,
  fr: DEPARTMENT_LABEL_FR,
  es: DEPARTMENT_LABEL_ES,
  de: DEPARTMENT_LABEL_DE,
  pt: DEPARTMENT_LABEL_PT,
  ...EXTRA_DEPARTMENT_BY_LOCALE,
};

const SUBCATEGORY_FR: Record<string, string> = {
  Kitchen: "Cuisine",
  Baking: "Pâtisserie",
  "Storage & Organization": "Rangement",
  Cleaning: "Nettoyage",
  Bathroom: "Salle de bain",
  Lighting: "Éclairage",
  "Home Decor": "Décoration",
  "Small Home Accessories": "Petits accessoires",
  Women: "Femme",
  Men: "Homme",
  Kids: "Enfants",
  Bags: "Sacs",
  "Fashion Accessories": "Accessoires de mode",
  Jewellery: "Bijoux",
  "Scarves / Hats / Small Accessories": "Écharpes / chapeaux / petits accessoires",
  "Makeup Tools": "Outils de maquillage",
  "Hair Accessories": "Accessoires pour cheveux",
  "Personal Care Tools": "Soins personnels",
  "Nail Accessories": "Accessoires d'ongles",
  "Beauty Organizers": "Organisateurs beauté",
  "Phone Holders": "Supports téléphone",
  "Interior Organization": "Organisation intérieure",
  "Travel Accessories": "Accessoires de voyage",
  "Small Car Accessories": "Petits accessoires auto",
  Cats: "Chats",
  Dogs: "Chiens",
  "Bowls & Feeding": "Gamelles et alimentation",
  Travel: "Voyage",
  Grooming: "Toilettage",
  "Toys & Accessories": "Jouets et accessoires",
  "Luggage Organization": "Organisation des bagages",
  "Packing Accessories": "Accessoires de packing",
  "Travel Comfort": "Confort de voyage",
  "Travel Safety": "Sécurité voyage",
  "Portable Accessories": "Accessoires portables",
  "Phone Accessories": "Accessoires téléphone",
  "Desk Accessories": "Accessoires de bureau",
  "Cables / Adapters": "Câbles / adaptateurs",
  "Stands / Holders": "Supports",
  "Small Smart Accessories": "Petits accessoires connectés",
  "Educational Toys": "Jouets éducatifs",
  Organization: "Organisation",
  "Safe Lightweight Toys": "Jouets légers et sûrs",
  "Workout Accessories": "Accessoires d'entraînement",
  "Resistance / Stretching": "Résistance / étirements",
  "Small Fitness Tools": "Petits outils fitness",
  "Outdoor Accessories": "Accessoires outdoor",
  "Garden Tools": "Outils de jardin",
  "Plant Accessories": "Accessoires plantes",
  "Outdoor Organization": "Organisation extérieure",
  "Solar / Outdoor Accessories": "Accessoires solaires / extérieurs",
};

const SUBCATEGORY_ES: Record<string, string> = {
  Kitchen: "Cocina",
  Baking: "Repostería",
  "Storage & Organization": "Almacenamiento y organización",
  Cleaning: "Limpieza",
  Bathroom: "Baño",
  Lighting: "Iluminación",
  "Home Decor": "Decoración",
  "Small Home Accessories": "Pequeños accesorios",
  Women: "Mujer",
  Men: "Hombre",
  Kids: "Niños",
  Bags: "Bolsos",
  "Fashion Accessories": "Accesorios de moda",
  Jewellery: "Joyería",
  "Scarves / Hats / Small Accessories": "Pañuelos / sombreros / accesorios",
  "Makeup Tools": "Herramientas de maquillaje",
  "Hair Accessories": "Accesorios para el cabello",
  "Personal Care Tools": "Cuidado personal",
  "Nail Accessories": "Accesorios de uñas",
  "Beauty Organizers": "Organizadores de belleza",
  "Phone Holders": "Soportes para teléfono",
  "Interior Organization": "Organización interior",
  "Travel Accessories": "Accesorios de viaje",
  "Small Car Accessories": "Pequeños accesorios de coche",
  Cats: "Gatos",
  Dogs: "Perros",
  "Bowls & Feeding": "Comederos",
  Travel: "Viajes",
  Grooming: "Aseo",
  "Toys & Accessories": "Juguetes y accesorios",
  "Luggage Organization": "Organización de equipaje",
  "Packing Accessories": "Accesorios de empaque",
  "Travel Comfort": "Comodidad de viaje",
  "Travel Safety": "Seguridad de viaje",
  "Portable Accessories": "Accesorios portátiles",
  "Phone Accessories": "Accesorios para teléfono",
  "Desk Accessories": "Accesorios de escritorio",
  "Cables / Adapters": "Cables / adaptadores",
  "Stands / Holders": "Soportes",
  "Small Smart Accessories": "Pequeños accesorios inteligentes",
  "Educational Toys": "Juguetes educativos",
  Organization: "Organización",
  "Safe Lightweight Toys": "Juguetes ligeros y seguros",
  "Workout Accessories": "Accesorios de entrenamiento",
  "Resistance / Stretching": "Resistencia / estiramiento",
  "Small Fitness Tools": "Pequeñas herramientas fitness",
  "Outdoor Accessories": "Accesorios outdoor",
  "Garden Tools": "Herramientas de jardín",
  "Plant Accessories": "Accesorios para plantas",
  "Outdoor Organization": "Organización exterior",
  "Solar / Outdoor Accessories": "Accesorios solares / exteriores",
};

const SUBCATEGORY_DE: Record<string, string> = {
  Kitchen: "Küche",
  Baking: "Backen",
  "Storage & Organization": "Aufbewahrung und Organisation",
  Cleaning: "Reinigung",
  Bathroom: "Badezimmer",
  Lighting: "Beleuchtung",
  "Home Decor": "Wohnaccessoires",
  "Small Home Accessories": "Kleine Wohnaccessoires",
  Women: "Damen",
  Men: "Herren",
  Kids: "Kinder",
  Bags: "Taschen",
  "Fashion Accessories": "Modeaccessoires",
  Jewellery: "Schmuck",
  "Scarves / Hats / Small Accessories": "Schals / Hüte / kleine Accessoires",
  "Makeup Tools": "Make-up-Tools",
  "Hair Accessories": "Haaraccessoires",
  "Personal Care Tools": "Körperpflege",
  "Nail Accessories": "Nagelaccessoires",
  "Beauty Organizers": "Beauty-Organizer",
  "Phone Holders": "Handyhalter",
  "Interior Organization": "Innenraum-Organisation",
  "Travel Accessories": "Reiseaccessoires",
  "Small Car Accessories": "Kleine Autoaccessoires",
  Cats: "Katzen",
  Dogs: "Hunde",
  "Bowls & Feeding": "Näpfe und Fütterung",
  Travel: "Reisen",
  Grooming: "Pflege",
  "Toys & Accessories": "Spielzeug und Zubehör",
  "Luggage Organization": "Gepäckorganisation",
  "Packing Accessories": "Packaccessoires",
  "Travel Comfort": "Reisekomfort",
  "Travel Safety": "Reisesicherheit",
  "Portable Accessories": "Tragbare Accessoires",
  "Phone Accessories": "Handy-Zubehör",
  "Desk Accessories": "Schreibtisch-Zubehör",
  "Cables / Adapters": "Kabel / Adapter",
  "Stands / Holders": "Ständer",
  "Small Smart Accessories": "Kleine Smart-Accessoires",
  "Educational Toys": "Lernspielzeug",
  Organization: "Organisation",
  "Safe Lightweight Toys": "Leichtes sicheres Spielzeug",
  "Workout Accessories": "Trainingsaccessoires",
  "Resistance / Stretching": "Widerstand / Dehnung",
  "Small Fitness Tools": "Kleine Fitnessgeräte",
  "Outdoor Accessories": "Outdoor-Accessoires",
  "Garden Tools": "Gartenwerkzeug",
  "Plant Accessories": "Pflanzenaccessoires",
  "Outdoor Organization": "Outdoor-Organisation",
  "Solar / Outdoor Accessories": "Solar- / Outdoor-Accessoires",
};

const SUBCATEGORY_PT: Record<string, string> = {
  Kitchen: "Cozinha",
  Baking: "Confeitaria",
  "Storage & Organization": "Armazenamento e organização",
  Cleaning: "Limpeza",
  Bathroom: "Banheiro",
  Lighting: "Iluminação",
  "Home Decor": "Decoração",
  "Small Home Accessories": "Acessórios domésticos pequenos",
  Women: "Feminino",
  Men: "Masculino",
  Kids: "Infantil",
  Bags: "Bolsas",
  "Fashion Accessories": "Acessórios de moda",
  Jewellery: "Joias",
  "Scarves / Hats / Small Accessories": "Lenços / chapéus / acessórios",
  "Makeup Tools": "Ferramentas de maquiagem",
  "Hair Accessories": "Acessórios de cabelo",
  "Personal Care Tools": "Cuidados pessoais",
  "Nail Accessories": "Acessórios de unhas",
  "Beauty Organizers": "Organizadores de beleza",
  "Phone Holders": "Suportes para celular",
  "Interior Organization": "Organização interna",
  "Travel Accessories": "Acessórios de viagem",
  "Small Car Accessories": "Acessórios automotivos pequenos",
  Cats: "Gatos",
  Dogs: "Cães",
  "Bowls & Feeding": "Tigelas e alimentação",
  Travel: "Viagem",
  Grooming: "Higiene",
  "Toys & Accessories": "Brinquedos e acessórios",
  "Luggage Organization": "Organização de bagagem",
  "Packing Accessories": "Acessórios de embalagem",
  "Travel Comfort": "Conforto de viagem",
  "Travel Safety": "Segurança de viagem",
  "Portable Accessories": "Acessórios portáteis",
  "Phone Accessories": "Acessórios para celular",
  "Desk Accessories": "Acessórios de mesa",
  "Cables / Adapters": "Cabos / adaptadores",
  "Stands / Holders": "Suportes",
  "Small Smart Accessories": "Acessórios inteligentes pequenos",
  "Educational Toys": "Brinquedos educativos",
  Organization: "Organização",
  "Safe Lightweight Toys": "Brinquedos leves e seguros",
  "Workout Accessories": "Acessórios de treino",
  "Resistance / Stretching": "Resistência / alongamento",
  "Small Fitness Tools": "Ferramentas de fitness pequenas",
  "Outdoor Accessories": "Acessórios para ar livre",
  "Garden Tools": "Ferramentas de jardim",
  "Plant Accessories": "Acessórios para plantas",
  "Outdoor Organization": "Organização externa",
  "Solar / Outdoor Accessories": "Acessórios solares / externos",
};

const SUBCATEGORY_BY_LOCALE: Record<StoreLocale, Record<string, string> | null> = {
  en: null,
  ar: SUBCATEGORY_AR,
  fr: SUBCATEGORY_FR,
  es: SUBCATEGORY_ES,
  de: SUBCATEGORY_DE,
  pt: SUBCATEGORY_PT,
  id: EXTRA_SUBCATEGORY_BY_LOCALE.id,
  hi: EXTRA_SUBCATEGORY_BY_LOCALE.hi,
  ru: EXTRA_SUBCATEGORY_BY_LOCALE.ru,
  tr: EXTRA_SUBCATEGORY_BY_LOCALE.tr,
  "zh-CN": EXTRA_SUBCATEGORY_BY_LOCALE["zh-CN"],
  ja: EXTRA_SUBCATEGORY_BY_LOCALE.ja,
  ko: EXTRA_SUBCATEGORY_BY_LOCALE.ko,
};

export function departmentLabel(department: StoreDepartment, locale: StoreLocale | "en" | "ar"): string {
  return DEPARTMENT_BY_LOCALE[locale][department];
}

export function subcategoryLabel(
  subcategory: string,
  locale: StoreLocale | "en" | "ar"
): string {
  const map = SUBCATEGORY_BY_LOCALE[locale];
  if (!map) return subcategory;
  return map[subcategory] ?? subcategory;
}

export function assertTaxonomyLocaleComplete(): void {
  for (const department of STORE_DEPARTMENTS) {
    if (!DEPARTMENT_LABEL_EN[department] || !DEPARTMENT_LABEL_AR[department]) {
      throw new Error(`Missing department locale labels for ${department}`);
    }
    for (const sub of STORE_SUBCATEGORIES[department]) {
      if (!SUBCATEGORY_AR[sub]) {
        throw new Error(`Missing Arabic subcategory label for ${department} / ${sub}`);
      }
    }
  }
}

export function assertAllLocaleTaxonomyComplete(): void {
  assertTaxonomyLocaleComplete();
  for (const locale of REQUIRED_STORE_LOCALES) {
    for (const department of STORE_DEPARTMENTS) {
      if (!departmentLabel(department, locale).trim()) {
        throw new Error(`Missing ${locale} department label for ${department}`);
      }
    }
    for (const department of STORE_DEPARTMENTS) {
      for (const sub of STORE_SUBCATEGORIES[department]) {
        if (!subcategoryLabel(sub, locale).trim()) {
          throw new Error(`Missing ${locale} subcategory label for ${department} / ${sub}`);
        }
      }
    }
  }
}

/**
 * Editorial store placement onto the official 10-department taxonomy.
 * Does not invent product facts — only chooses an existing subcategory.
 */
export function placeProductInTaxonomy(input: {
  sourceTitle: string;
  sourceDepartment: StoreDepartment;
  sourceSubcategory: string;
}): { department: StoreDepartment; subcategory: string } {
  const t = input.sourceTitle.toLowerCase();
  if (/makeup brush|blush|eyeshadow|concealer|foundation brush/.test(t)) {
    return { department: "BEAUTY & PERSONAL", subcategory: "Makeup Tools" };
  }
  if (/toothbrush|bottle brush|nipple/.test(t)) {
    return { department: "BEAUTY & PERSONAL", subcategory: "Personal Care Tools" };
  }
  if (/phone holder|phone mount|suction cup holder|magnetic.*phone/.test(t)) {
    return { department: "CAR", subcategory: "Phone Holders" };
  }
  if (/cup holder|bottle holder|car organizer/.test(t) && /car/.test(t)) {
    return { department: "CAR", subcategory: "Interior Organization" };
  }
  if (/folding bowl|travel.*bowl|portable.*bowl|pet travel/.test(t)) {
    return { department: "PET", subcategory: "Travel" };
  }
  if (/pet|cat |dog |cat bowl|dog bowl|water bowl/.test(t)) {
    return { department: "PET", subcategory: "Bowls & Feeding" };
  }
  if (/spatula|baking|cake cream|cookie press|icing|pastry/.test(t)) {
    return { department: "HOME", subcategory: "Baking" };
  }
  if (/bathtub|hair catcher|toilet|bathroom/.test(t) && /drain|strainer|filter/.test(t)) {
    return { department: "HOME", subcategory: "Bathroom" };
  }
  if (
    /silicone cover|food cover|ice|burger press|garlic|drainboard|cup silicone|kitchen/.test(t)
  ) {
    return { department: "HOME", subcategory: "Kitchen" };
  }
  if (STORE_SUBCATEGORIES[input.sourceDepartment].includes(input.sourceSubcategory)) {
    return { department: input.sourceDepartment, subcategory: input.sourceSubcategory };
  }
  return { department: input.sourceDepartment, subcategory: input.sourceSubcategory };
}
