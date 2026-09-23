import type { QuizItem } from "./banks";
import { shuffled } from "./engine";

export type PlaceCard = {
  file: string;
  nameAr: string;
  nameEn: string;
  countryAr: string;
  countryEn: string;
  lat: number;
  lng: number;
};

export const GAME_CITIES: PlaceCard[] = [
  {
    "file": "jerusalem.webp",
    "nameAr": "القدس",
    "nameEn": "Jerusalem",
    "countryAr": "فلسطين",
    "countryEn": "Palestine",
    "lat": 31.7683,
    "lng": 35.2137
  },
  {
    "file": "mecca.webp",
    "nameAr": "مكة المكرمة",
    "nameEn": "Mecca",
    "countryAr": "السعودية",
    "countryEn": "Saudi Arabia",
    "lat": 21.3891,
    "lng": 39.8579
  },
  {
    "file": "medina.webp",
    "nameAr": "المدينة المنورة",
    "nameEn": "Medina",
    "countryAr": "السعودية",
    "countryEn": "Saudi Arabia",
    "lat": 24.5247,
    "lng": 39.5692
  },
  {
    "file": "dubai.webp",
    "nameAr": "دبي",
    "nameEn": "Dubai",
    "countryAr": "الإمارات العربية المتحدة",
    "countryEn": "United Arab Emirates",
    "lat": 25.2048,
    "lng": 55.2708
  },
  {
    "file": "cairo.webp",
    "nameAr": "القاهرة",
    "nameEn": "Cairo",
    "countryAr": "مصر",
    "countryEn": "Egypt",
    "lat": 30.0444,
    "lng": 31.2357
  },
  {
    "file": "istanbul.webp",
    "nameAr": "إسطنبول",
    "nameEn": "Istanbul",
    "countryAr": "تركيا",
    "countryEn": "Turkey",
    "lat": 41.0082,
    "lng": 28.9784
  },
  {
    "file": "doha.webp",
    "nameAr": "الدوحة",
    "nameEn": "Doha",
    "countryAr": "قطر",
    "countryEn": "Qatar",
    "lat": 25.2854,
    "lng": 51.531
  },
  {
    "file": "riyadh.webp",
    "nameAr": "الرياض",
    "nameEn": "Riyadh",
    "countryAr": "السعودية",
    "countryEn": "Saudi Arabia",
    "lat": 24.7136,
    "lng": 46.6753
  },
  {
    "file": "baghdad.webp",
    "nameAr": "بغداد",
    "nameEn": "Baghdad",
    "countryAr": "العراق",
    "countryEn": "Iraq",
    "lat": 33.3152,
    "lng": 44.3661
  },
  {
    "file": "marrakech.webp",
    "nameAr": "مراكش",
    "nameEn": "Marrakech",
    "countryAr": "المغرب",
    "countryEn": "Morocco",
    "lat": 31.6295,
    "lng": -7.9811
  },
  {
    "file": "amman.webp",
    "nameAr": "عمّان",
    "nameEn": "Amman",
    "countryAr": "الأردن",
    "countryEn": "Jordan",
    "lat": 31.9539,
    "lng": 35.9106
  },
  {
    "file": "beirut.webp",
    "nameAr": "بيروت",
    "nameEn": "Beirut",
    "countryAr": "لبنان",
    "countryEn": "Lebanon",
    "lat": 33.8938,
    "lng": 35.5018
  },
  {
    "file": "damascus.webp",
    "nameAr": "دمشق",
    "nameEn": "Damascus",
    "countryAr": "سوريا",
    "countryEn": "Syria",
    "lat": 33.5138,
    "lng": 36.2765
  },
  {
    "file": "muscat.webp",
    "nameAr": "مسقط",
    "nameEn": "Muscat",
    "countryAr": "عُمان",
    "countryEn": "Oman",
    "lat": 23.588,
    "lng": 58.3829
  },
  {
    "file": "abu-dhabi.webp",
    "nameAr": "أبوظبي",
    "nameEn": "Abu Dhabi",
    "countryAr": "الإمارات العربية المتحدة",
    "countryEn": "United Arab Emirates",
    "lat": 24.4539,
    "lng": 54.3773
  },
  {
    "file": "kuwait-city.webp",
    "nameAr": "مدينة الكويت",
    "nameEn": "Kuwait City",
    "countryAr": "الكويت",
    "countryEn": "Kuwait",
    "lat": 29.3759,
    "lng": 47.9774
  },
  {
    "file": "algiers.webp",
    "nameAr": "الجزائر",
    "nameEn": "Algiers",
    "countryAr": "الجزائر",
    "countryEn": "Algeria",
    "lat": 36.7538,
    "lng": 3.0588
  },
  {
    "file": "tunis.webp",
    "nameAr": "تونس",
    "nameEn": "Tunis",
    "countryAr": "تونس",
    "countryEn": "Tunisia",
    "lat": 36.8065,
    "lng": 10.1815
  },
  {
    "file": "casablanca.webp",
    "nameAr": "الدار البيضاء",
    "nameEn": "Casablanca",
    "countryAr": "المغرب",
    "countryEn": "Morocco",
    "lat": 33.5731,
    "lng": -7.5898
  },
  {
    "file": "fez.webp",
    "nameAr": "فاس",
    "nameEn": "Fez",
    "countryAr": "المغرب",
    "countryEn": "Morocco",
    "lat": 34.0181,
    "lng": -5.0078
  },
  {
    "file": "alexandria.webp",
    "nameAr": "الإسكندرية",
    "nameEn": "Alexandria",
    "countryAr": "مصر",
    "countryEn": "Egypt",
    "lat": 31.2001,
    "lng": 29.9187
  },
  {
    "file": "luxor.webp",
    "nameAr": "الأقصر",
    "nameEn": "Luxor",
    "countryAr": "مصر",
    "countryEn": "Egypt",
    "lat": 25.6872,
    "lng": 32.6396
  },
  {
    "file": "jeddah.webp",
    "nameAr": "جدة",
    "nameEn": "Jeddah",
    "countryAr": "السعودية",
    "countryEn": "Saudi Arabia",
    "lat": 21.4858,
    "lng": 39.1925
  },
  {
    "file": "sanaa.webp",
    "nameAr": "صنعاء",
    "nameEn": "Sanaa",
    "countryAr": "اليمن",
    "countryEn": "Yemen",
    "lat": 15.3694,
    "lng": 44.191
  },
  {
    "file": "samarkand.webp",
    "nameAr": "سمرقند",
    "nameEn": "Samarkand",
    "countryAr": "أوزبكستان",
    "countryEn": "Uzbekistan",
    "lat": 39.6542,
    "lng": 66.9597
  },
  {
    "file": "bukhara.webp",
    "nameAr": "بخارى",
    "nameEn": "Bukhara",
    "countryAr": "أوزبكستان",
    "countryEn": "Uzbekistan",
    "lat": 39.7747,
    "lng": 64.4286
  },
  {
    "file": "lahore.webp",
    "nameAr": "لاهور",
    "nameEn": "Lahore",
    "countryAr": "باكستان",
    "countryEn": "Pakistan",
    "lat": 31.5204,
    "lng": 74.3587
  },
  {
    "file": "kuala-lumpur.webp",
    "nameAr": "كوالالمبور",
    "nameEn": "Kuala Lumpur",
    "countryAr": "ماليزيا",
    "countryEn": "Malaysia",
    "lat": 3.139,
    "lng": 101.6869
  },
  {
    "file": "jakarta.webp",
    "nameAr": "جاكرتا",
    "nameEn": "Jakarta",
    "countryAr": "إندونيسيا",
    "countryEn": "Indonesia",
    "lat": -6.2088,
    "lng": 106.8456
  },
  {
    "file": "sarajevo.webp",
    "nameAr": "سراييفو",
    "nameEn": "Sarajevo",
    "countryAr": "البوسنة والهرسك",
    "countryEn": "Bosnia and Herzegovina",
    "lat": 43.8563,
    "lng": 18.4131
  },
  {
    "file": "paris.webp",
    "nameAr": "باريس",
    "nameEn": "Paris",
    "countryAr": "فرنسا",
    "countryEn": "France",
    "lat": 48.8566,
    "lng": 2.3522
  },
  {
    "file": "london.webp",
    "nameAr": "لندن",
    "nameEn": "London",
    "countryAr": "المملكة المتحدة",
    "countryEn": "United Kingdom",
    "lat": 51.5074,
    "lng": -0.1278
  },
  {
    "file": "rome.webp",
    "nameAr": "روما",
    "nameEn": "Rome",
    "countryAr": "إيطاليا",
    "countryEn": "Italy",
    "lat": 41.9028,
    "lng": 12.4964
  },
  {
    "file": "barcelona.webp",
    "nameAr": "برشلونة",
    "nameEn": "Barcelona",
    "countryAr": "إسبانيا",
    "countryEn": "Spain",
    "lat": 41.3874,
    "lng": 2.1686
  },
  {
    "file": "new-york-city.webp",
    "nameAr": "نيويورك",
    "nameEn": "New York City",
    "countryAr": "الولايات المتحدة",
    "countryEn": "United States",
    "lat": 40.7128,
    "lng": -74.006
  },
  {
    "file": "san-francisco.webp",
    "nameAr": "سان فرانسيسكو",
    "nameEn": "San Francisco",
    "countryAr": "الولايات المتحدة",
    "countryEn": "United States",
    "lat": 37.7749,
    "lng": -122.4194
  },
  {
    "file": "rio-de-janeiro.webp",
    "nameAr": "ريو دي جانيرو",
    "nameEn": "Rio de Janeiro",
    "countryAr": "البرازيل",
    "countryEn": "Brazil",
    "lat": -22.9068,
    "lng": -43.1729
  },
  {
    "file": "mexico-city.webp",
    "nameAr": "مكسيكو سيتي",
    "nameEn": "Mexico City",
    "countryAr": "المكسيك",
    "countryEn": "Mexico",
    "lat": 19.4326,
    "lng": -99.1332
  },
  {
    "file": "toronto.webp",
    "nameAr": "تورونتو",
    "nameEn": "Toronto",
    "countryAr": "كندا",
    "countryEn": "Canada",
    "lat": 43.6532,
    "lng": -79.3832
  },
  {
    "file": "vancouver.webp",
    "nameAr": "فانكوفر",
    "nameEn": "Vancouver",
    "countryAr": "كندا",
    "countryEn": "Canada",
    "lat": 49.2827,
    "lng": -123.1207
  },
  {
    "file": "tokyo.webp",
    "nameAr": "طوكيو",
    "nameEn": "Tokyo",
    "countryAr": "اليابان",
    "countryEn": "Japan",
    "lat": 35.6762,
    "lng": 139.6503
  },
  {
    "file": "kyoto.webp",
    "nameAr": "كيوتو",
    "nameEn": "Kyoto",
    "countryAr": "اليابان",
    "countryEn": "Japan",
    "lat": 35.0116,
    "lng": 135.7681
  },
  {
    "file": "seoul.webp",
    "nameAr": "سيول",
    "nameEn": "Seoul",
    "countryAr": "كوريا الجنوبية",
    "countryEn": "South Korea",
    "lat": 37.5665,
    "lng": 126.978
  },
  {
    "file": "beijing.webp",
    "nameAr": "بكين",
    "nameEn": "Beijing",
    "countryAr": "الصين",
    "countryEn": "China",
    "lat": 39.9042,
    "lng": 116.4074
  },
  {
    "file": "shanghai.webp",
    "nameAr": "شنغهاي",
    "nameEn": "Shanghai",
    "countryAr": "الصين",
    "countryEn": "China",
    "lat": 31.2304,
    "lng": 121.4737
  },
  {
    "file": "hong-kong.webp",
    "nameAr": "هونغ كونغ",
    "nameEn": "Hong Kong",
    "countryAr": "الصين",
    "countryEn": "China",
    "lat": 22.3193,
    "lng": 114.1694
  },
  {
    "file": "singapore.webp",
    "nameAr": "سنغافورة",
    "nameEn": "Singapore",
    "countryAr": "سنغافورة",
    "countryEn": "Singapore",
    "lat": 1.3521,
    "lng": 103.8198
  },
  {
    "file": "bangkok.webp",
    "nameAr": "بانكوك",
    "nameEn": "Bangkok",
    "countryAr": "تايلاند",
    "countryEn": "Thailand",
    "lat": 13.7563,
    "lng": 100.5018
  },
  {
    "file": "sydney.webp",
    "nameAr": "سيدني",
    "nameEn": "Sydney",
    "countryAr": "أستراليا",
    "countryEn": "Australia",
    "lat": -33.8688,
    "lng": 151.2093
  },
  {
    "file": "melbourne.webp",
    "nameAr": "ملبورن",
    "nameEn": "Melbourne",
    "countryAr": "أستراليا",
    "countryEn": "Australia",
    "lat": -37.8136,
    "lng": 144.9631
  },
  {
    "file": "amsterdam.webp",
    "nameAr": "أمستردام",
    "nameEn": "Amsterdam",
    "countryAr": "هولندا",
    "countryEn": "Netherlands",
    "lat": 52.3676,
    "lng": 4.9041
  },
  {
    "file": "athens.webp",
    "nameAr": "أثينا",
    "nameEn": "Athens",
    "countryAr": "اليونان",
    "countryEn": "Greece",
    "lat": 37.9838,
    "lng": 23.7275
  },
  {
    "file": "prague.webp",
    "nameAr": "براغ",
    "nameEn": "Prague",
    "countryAr": "التشيك",
    "countryEn": "Czech Republic",
    "lat": 50.0755,
    "lng": 14.4378
  },
  {
    "file": "vienna.webp",
    "nameAr": "فيينا",
    "nameEn": "Vienna",
    "countryAr": "النمسا",
    "countryEn": "Austria",
    "lat": 48.2082,
    "lng": 16.3738
  },
  {
    "file": "moscow.webp",
    "nameAr": "موسكو",
    "nameEn": "Moscow",
    "countryAr": "روسيا",
    "countryEn": "Russia",
    "lat": 55.7558,
    "lng": 37.6173
  },
  {
    "file": "cape-town.webp",
    "nameAr": "كيب تاون",
    "nameEn": "Cape Town",
    "countryAr": "جنوب أفريقيا",
    "countryEn": "South Africa",
    "lat": -33.9249,
    "lng": 18.4241
  },
  {
    "file": "nairobi.webp",
    "nameAr": "نيروبي",
    "nameEn": "Nairobi",
    "countryAr": "كينيا",
    "countryEn": "Kenya",
    "lat": -1.2921,
    "lng": 36.8219
  },
  {
    "file": "lagos.webp",
    "nameAr": "لاغوس",
    "nameEn": "Lagos",
    "countryAr": "نيجيريا",
    "countryEn": "Nigeria",
    "lat": 6.5244,
    "lng": 3.3792
  },
  {
    "file": "addis-ababa.webp",
    "nameAr": "أديس أبابا",
    "nameEn": "Addis Ababa",
    "countryAr": "إثيوبيا",
    "countryEn": "Ethiopia",
    "lat": 8.9806,
    "lng": 38.7578
  },
  {
    "file": "zanzibar-city.webp",
    "nameAr": "مدينة زنجبار",
    "nameEn": "Zanzibar City",
    "countryAr": "تنزانيا",
    "countryEn": "Tanzania",
    "lat": -6.1659,
    "lng": 39.2026
  },
  {
    "file": "berlin.webp",
    "nameAr": "برلين",
    "nameEn": "Berlin",
    "countryAr": "ألمانيا",
    "countryEn": "Germany",
    "lat": 52.52,
    "lng": 13.405
  },
  {
    "file": "lisbon.webp",
    "nameAr": "لشبونة",
    "nameEn": "Lisbon",
    "countryAr": "البرتغال",
    "countryEn": "Portugal",
    "lat": 38.7223,
    "lng": -9.1393
  },
  {
    "file": "venice.webp",
    "nameAr": "البندقية",
    "nameEn": "Venice",
    "countryAr": "إيطاليا",
    "countryEn": "Italy",
    "lat": 45.4408,
    "lng": 12.3155
  },
  {
    "file": "budapest.webp",
    "nameAr": "بودابست",
    "nameEn": "Budapest",
    "countryAr": "المجر",
    "countryEn": "Hungary",
    "lat": 47.4979,
    "lng": 19.0402
  },
  {
    "file": "edinburgh.webp",
    "nameAr": "إدنبرة",
    "nameEn": "Edinburgh",
    "countryAr": "المملكة المتحدة",
    "countryEn": "United Kingdom",
    "lat": 55.9533,
    "lng": -3.1883
  },
  {
    "file": "buenos-aires.webp",
    "nameAr": "بوينس آيرس",
    "nameEn": "Buenos Aires",
    "countryAr": "الأرجنتين",
    "countryEn": "Argentina",
    "lat": -34.6037,
    "lng": -58.3816
  },
  {
    "file": "lima.webp",
    "nameAr": "ليما",
    "nameEn": "Lima",
    "countryAr": "بيرو",
    "countryEn": "Peru",
    "lat": -12.0464,
    "lng": -77.0428
  },
  {
    "file": "havana.webp",
    "nameAr": "هافانا",
    "nameEn": "Havana",
    "countryAr": "كوبا",
    "countryEn": "Cuba",
    "lat": 23.1136,
    "lng": -82.3666
  },
  {
    "file": "santiago.webp",
    "nameAr": "سانتياغو",
    "nameEn": "Santiago",
    "countryAr": "تشيلي",
    "countryEn": "Chile",
    "lat": -33.4489,
    "lng": -70.6693
  },
  {
    "file": "quebec-city.webp",
    "nameAr": "مدينة كيبيك",
    "nameEn": "Quebec City",
    "countryAr": "كندا",
    "countryEn": "Canada",
    "lat": 46.8139,
    "lng": -71.208
  },
  {
    "file": "mumbai.webp",
    "nameAr": "مومباي",
    "nameEn": "Mumbai",
    "countryAr": "الهند",
    "countryEn": "India",
    "lat": 19.076,
    "lng": 72.8777
  },
  {
    "file": "delhi.webp",
    "nameAr": "دلهي",
    "nameEn": "Delhi",
    "countryAr": "الهند",
    "countryEn": "India",
    "lat": 28.6139,
    "lng": 77.209
  },
  {
    "file": "taipei.webp",
    "nameAr": "تايبيه",
    "nameEn": "Taipei",
    "countryAr": "تايوان",
    "countryEn": "Taiwan",
    "lat": 25.033,
    "lng": 121.5654
  },
  {
    "file": "hanoi.webp",
    "nameAr": "هانوي",
    "nameEn": "Hanoi",
    "countryAr": "فيتنام",
    "countryEn": "Vietnam",
    "lat": 21.0278,
    "lng": 105.8342
  },
  {
    "file": "ho-chi-minh-city.webp",
    "nameAr": "مدينة هو تشي منه",
    "nameEn": "Ho Chi Minh City",
    "countryAr": "فيتنام",
    "countryEn": "Vietnam",
    "lat": 10.8231,
    "lng": 106.6297
  },
  {
    "file": "manila.webp",
    "nameAr": "مانيلا",
    "nameEn": "Manila",
    "countryAr": "الفلبين",
    "countryEn": "Philippines",
    "lat": 14.5995,
    "lng": 120.9842
  },
  {
    "file": "auckland.webp",
    "nameAr": "أوكلاند",
    "nameEn": "Auckland",
    "countryAr": "نيوزيلندا",
    "countryEn": "New Zealand",
    "lat": -36.8509,
    "lng": 174.7645
  },
  {
    "file": "honolulu.webp",
    "nameAr": "هونولولو",
    "nameEn": "Honolulu",
    "countryAr": "الولايات المتحدة",
    "countryEn": "United States",
    "lat": 21.3069,
    "lng": -157.8583
  },
  {
    "file": "reykjavik.webp",
    "nameAr": "ريكيافيك",
    "nameEn": "Reykjavik",
    "countryAr": "آيسلندا",
    "countryEn": "Iceland",
    "lat": 64.1466,
    "lng": -21.9426
  },
  {
    "file": "stockholm.webp",
    "nameAr": "ستوكهولم",
    "nameEn": "Stockholm",
    "countryAr": "السويد",
    "countryEn": "Sweden",
    "lat": 59.3293,
    "lng": 18.0686
  }
];

export const GAME_LANDMARKS: PlaceCard[] = [
  {
    "file": "petra-treasury.webp",
    "nameAr": "خزنة البتراء",
    "nameEn": "Petra Treasury",
    "countryAr": "الأردن",
    "countryEn": "Jordan",
    "lat": 30.3285,
    "lng": 35.4444
  },
  {
    "file": "alhambra-court-of-lions.webp",
    "nameAr": "قصر الحمراء",
    "nameEn": "Alhambra",
    "countryAr": "إسبانيا",
    "countryEn": "Spain",
    "lat": 37.1761,
    "lng": -3.5881
  },
  {
    "file": "sheikh-lotfollah-mosque.webp",
    "nameAr": "مسجد الشيخ لطف الله",
    "nameEn": "Sheikh Lotfollah Mosque",
    "countryAr": "إيران",
    "countryEn": "Iran",
    "lat": 32.6575,
    "lng": 51.6789
  },
  {
    "file": "imam-reza-shrine.webp",
    "nameAr": "ضريح الإمام الرضا",
    "nameEn": "Imam Reza Shrine",
    "countryAr": "إيران",
    "countryEn": "Iran",
    "lat": 36.2879,
    "lng": 59.615
  },
  {
    "file": "nasir-al-mulk-mosque.webp",
    "nameAr": "مسجد نصير الملك",
    "nameEn": "Nasir al-Mulk Mosque",
    "countryAr": "إيران",
    "countryEn": "Iran",
    "lat": 29.6086,
    "lng": 52.5486
  },
  {
    "file": "persepolis.webp",
    "nameAr": "برسيبوليس",
    "nameEn": "Persepolis",
    "countryAr": "إيران",
    "countryEn": "Iran",
    "lat": 29.935,
    "lng": 52.8916
  },
  {
    "file": "faisal-mosque.webp",
    "nameAr": "مسجد فيصل",
    "nameEn": "Faisal Mosque",
    "countryAr": "باكستان",
    "countryEn": "Pakistan",
    "lat": 33.7295,
    "lng": 73.0372
  },
  {
    "file": "taj-mahal.webp",
    "nameAr": "تاج محل",
    "nameEn": "Taj Mahal",
    "countryAr": "الهند",
    "countryEn": "India",
    "lat": 27.1751,
    "lng": 78.0421
  },
  {
    "file": "hegra-qasr-al-farid.webp",
    "nameAr": "قصر الفريد في الحِجر",
    "nameEn": "Qasr al-Farid at Hegra",
    "countryAr": "السعودية",
    "countryEn": "Saudi Arabia",
    "lat": 26.7868,
    "lng": 37.954
  },
  {
    "file": "abu-simbel.webp",
    "nameAr": "أبو سمبل",
    "nameEn": "Abu Simbel",
    "countryAr": "مصر",
    "countryEn": "Egypt",
    "lat": 22.3372,
    "lng": 31.6258
  },
  {
    "file": "great-mosque-of-kairouan.webp",
    "nameAr": "جامع القيروان الكبير",
    "nameEn": "Great Mosque of Kairouan",
    "countryAr": "تونس",
    "countryEn": "Tunisia",
    "lat": 35.6814,
    "lng": 10.104
  },
  {
    "file": "ait-benhaddou.webp",
    "nameAr": "آيت بن حدو",
    "nameEn": "Ait Benhaddou",
    "countryAr": "المغرب",
    "countryEn": "Morocco",
    "lat": 31.047,
    "lng": -7.1298
  },
  {
    "file": "bahia-palace.webp",
    "nameAr": "قصر الباهية",
    "nameEn": "Bahia Palace",
    "countryAr": "المغرب",
    "countryEn": "Morocco",
    "lat": 31.6218,
    "lng": -7.9814
  },
  {
    "file": "itchan-kala.webp",
    "nameAr": "إيتشان قلعة",
    "nameEn": "Itchan Kala",
    "countryAr": "أوزبكستان",
    "countryEn": "Uzbekistan",
    "lat": 41.3783,
    "lng": 60.3597
  },
  {
    "file": "bibi-khanym-mosque.webp",
    "nameAr": "مسجد بيبي خانم",
    "nameEn": "Bibi-Khanym Mosque",
    "countryAr": "أوزبكستان",
    "countryEn": "Uzbekistan",
    "lat": 39.6609,
    "lng": 66.9797
  },
  {
    "file": "selimiye-mosque.webp",
    "nameAr": "جامع السليمية",
    "nameEn": "Selimiye Mosque",
    "countryAr": "تركيا",
    "countryEn": "Turkey",
    "lat": 41.678,
    "lng": 26.5594
  },
  {
    "file": "bahrain-fort.webp",
    "nameAr": "قلعة البحرين",
    "nameEn": "Bahrain Fort",
    "countryAr": "البحرين",
    "countryEn": "Bahrain",
    "lat": 26.2336,
    "lng": 50.5206
  },
  {
    "file": "al-zubarah-fort.webp",
    "nameAr": "حصن الزبارة",
    "nameEn": "Al Zubarah Fort",
    "countryAr": "قطر",
    "countryEn": "Qatar",
    "lat": 25.9769,
    "lng": 51.0458
  },
  {
    "file": "qasr-al-watan.webp",
    "nameAr": "قصر الوطن",
    "nameEn": "Qasr Al Watan",
    "countryAr": "الإمارات",
    "countryEn": "United Arab Emirates",
    "lat": 24.4604,
    "lng": 54.3054
  },
  {
    "file": "mount-nemrut.webp",
    "nameAr": "جبل نمرود",
    "nameEn": "Mount Nemrut",
    "countryAr": "تركيا",
    "countryEn": "Turkey",
    "lat": 37.98,
    "lng": 38.7408
  }
];

export const CITY_ROUND = 8;
export const LANDMARK_ROUND = 8;

export function placeLabel(place: PlaceCard): string {
  return `${place.nameAr}\n${place.nameEn}`;
}

export function placeSrc(folder: "cities" | "landmarks", file: string): string {
  return `/games/${folder}/${file}`;
}

export function buildPlaceQuiz(places: readonly PlaceCard[], count: number): QuizItem[] {
  return shuffled(places)
    .slice(0, Math.min(count, places.length))
    .map((place) => {
      const label = placeLabel(place);
      const wrong = shuffled(places.filter((item) => item.file !== place.file))
        .slice(0, 3)
        .map(placeLabel);
      const choices = shuffled([label, ...wrong]);
      return {
        prompt: place.file,
        choices,
        correct: choices.indexOf(label),
        why: `${place.nameAr} · ${place.nameEn} — ${place.countryAr} · ${place.countryEn}`,
      };
    });
}
