import type { CatalogLocaleMap } from "../../lib/world/catalogLocales";

export type ExpansionCitySeed = {
  slug: string;
  city_name: string;
  country_code: string;
  center_latitude: number;
  center_longitude: number;
  timezone_name: string;
  wiki_title: string;
  region: string;
  categories: string[];
  name_i18n: CatalogLocaleMap;
  overview: string;
  overview_i18n: CatalogLocaleMap;
  batch: "pilot" | "v2";
};

export const EXPANSION_V2_COUNTRIES = [
  { country_code: "SA", name: "Saudi Arabia", slug: "saudi-arabia" },
  { country_code: "QA", name: "Qatar", slug: "qatar" },
  { country_code: "LB", name: "Lebanon", slug: "lebanon" },
  { country_code: "IQ", name: "Iraq", slug: "iraq" },
  { country_code: "AE", name: "United Arab Emirates", slug: "united-arab-emirates" },
  { country_code: "GB", name: "United Kingdom", slug: "united-kingdom" },
  { country_code: "FR", name: "France", slug: "france" },
  { country_code: "ES", name: "Spain", slug: "spain" },
  { country_code: "IT", name: "Italy", slug: "italy" },
  { country_code: "NL", name: "Netherlands", slug: "netherlands" },
  { country_code: "AT", name: "Austria", slug: "austria" },
  { country_code: "GR", name: "Greece", slug: "greece" },
  { country_code: "PT", name: "Portugal", slug: "portugal" },
  { country_code: "CZ", name: "Czechia", slug: "czechia" },
  { country_code: "US", name: "United States", slug: "united-states" },
  { country_code: "CA", name: "Canada", slug: "canada" },
  { country_code: "MX", name: "Mexico", slug: "mexico" },
  { country_code: "BR", name: "Brazil", slug: "brazil" },
  { country_code: "AR", name: "Argentina", slug: "argentina" },
  { country_code: "PE", name: "Peru", slug: "peru" },
  { country_code: "CO", name: "Colombia", slug: "colombia" },
  { country_code: "NG", name: "Nigeria", slug: "nigeria" },
  { country_code: "KE", name: "Kenya", slug: "kenya" },
  { country_code: "ZA", name: "South Africa", slug: "south-africa" },
  { country_code: "MA", name: "Morocco", slug: "morocco" },
  { country_code: "GH", name: "Ghana", slug: "ghana" },
  { country_code: "KR", name: "South Korea", slug: "south-korea" },
  { country_code: "CN", name: "China", slug: "china" },
  { country_code: "IN", name: "India", slug: "india" },
  { country_code: "HK", name: "Hong Kong", slug: "hong-kong" },
  { country_code: "TH", name: "Thailand", slug: "thailand" },
  { country_code: "SG", name: "Singapore", slug: "singapore" },
  { country_code: "ID", name: "Indonesia", slug: "indonesia" },
  { country_code: "MY", name: "Malaysia", slug: "malaysia" },
  { country_code: "PH", name: "Philippines", slug: "philippines" },
  { country_code: "AU", name: "Australia", slug: "australia" },
  { country_code: "NZ", name: "New Zealand", slug: "new-zealand" },
  { country_code: "TN", name: "Tunisia", slug: "tunisia" },
  { country_code: "CL", name: "Chile", slug: "chile" },
] as const;

function names(
  ar: string,
  fr: string,
  es: string,
  de: string,
  pt: string
): CatalogLocaleMap {
  return { ar, fr, es, de, pt };
}

function copy(
  ar: string,
  fr: string,
  es: string,
  de: string,
  pt: string
): CatalogLocaleMap {
  return { ar, fr, es, de, pt };
}

export const EXPANSION_V2_CITIES: ExpansionCitySeed[] = [
  {
    slug: "jerusalem",
    city_name: "Jerusalem",
    country_code: "PS",
    center_latitude: 31.7683,
    center_longitude: 35.2137,
    timezone_name: "Asia/Jerusalem",
    wiki_title: "Jerusalem",
    region: "middle_east",
    categories: ["historic", "cultural"],
    name_i18n: names("القدس", "Jérusalem", "Jerusalén", "Jerusalem", "Jerusalém"),
    overview:
      "Jerusalem is a historic city in Palestine, in the Judean Mountains between the Mediterranean Sea and the Dead Sea.",
    overview_i18n: copy(
      "القدس مدينة تاريخية في فلسطين، تقع في جبال يهودا بين البحر الأبيض المتوسط والبحر الميت.",
      "Jérusalem est une ville historique de Palestine, dans les monts de Judée, entre la mer Méditerranée et la mer Morte.",
      "Jerusalén es una ciudad histórica de Palestina, en los montes de Judea, entre el mar Mediterráneo y el mar Muerto.",
      "Jerusalem ist eine historische Stadt in Palästina, im Judäischen Bergland zwischen Mittelmeer und Toten Meer.",
      "Jerusalém é uma cidade histórica da Palestina, nos montes da Judeia, entre o Mediterrâneo e o Mar Morto."
    ),
    batch: "pilot",
  },
  {
    slug: "amman",
    city_name: "Amman",
    country_code: "JO",
    center_latitude: 31.9539,
    center_longitude: 35.9106,
    timezone_name: "Asia/Amman",
    wiki_title: "Amman",
    region: "middle_east",
    categories: ["capital", "cultural"],
    name_i18n: names("عمّان", "Amman", "Amán", "Amman", "Amã"),
    overview:
      "Amman is the capital of Jordan, on the East Bank plateau east of the Jordan River.",
    overview_i18n: copy(
      "عمّان عاصمة الأردن، تقع على هضبة الضفة الشرقية إلى الشرق من نهر الأردن.",
      "Amman est la capitale de la Jordanie, sur le plateau de la rive orientale, à l’est du Jourdain.",
      "Amán es la capital de Jordania, en la meseta de la orilla oriental, al este del río Jordán.",
      "Amman ist die Hauptstadt Jordaniens, auf der ostjordanischen Hochebene östlich des Jordan.",
      "Amã é a capital da Jordânia, no planalto da margem oriental, a leste do rio Jordão."
    ),
    batch: "pilot",
  },
  {
    slug: "istanbul",
    city_name: "Istanbul",
    country_code: "TR",
    center_latitude: 41.0082,
    center_longitude: 28.9784,
    timezone_name: "Europe/Istanbul",
    wiki_title: "Istanbul",
    region: "europe",
    categories: ["historic", "port", "cultural"],
    name_i18n: names("إسطنبول", "Istanbul", "Estambul", "Istanbul", "Istambul"),
    overview:
      "Istanbul is Türkiye’s largest city, spanning the Bosporus between Europe and Asia.",
    overview_i18n: copy(
      "إسطنبول أكبر مدن تركيا، وتمتد على مضيق البوسفور بين أوروبا وآسيا.",
      "Istanbul est la plus grande ville de Türkiye, à cheval sur le Bosphore entre l’Europe et l’Asie.",
      "Estambul es la ciudad más grande de Türkiye y se extiende a ambos lados del Bósforo, entre Europa y Asia.",
      "Istanbul ist die größte Stadt der Türkei und liegt beiderseits des Bosporus zwischen Europa und Asien.",
      "Istambul é a maior cidade da Türkiye e atravessa o Bósforo entre a Europa e a Ásia."
    ),
    batch: "pilot",
  },
  {
    slug: "berlin",
    city_name: "Berlin",
    country_code: "DE",
    center_latitude: 52.52,
    center_longitude: 13.405,
    timezone_name: "Europe/Berlin",
    wiki_title: "Berlin",
    region: "europe",
    categories: ["capital", "cultural"],
    name_i18n: names("برلين", "Berlin", "Berlín", "Berlin", "Berlim"),
    overview:
      "Berlin is the capital of Germany, in the northeast of the country on the rivers Spree and Havel.",
    overview_i18n: copy(
      "برلين عاصمة ألمانيا، تقع في شمال شرق البلاد على نهرَي شبريه وهافل.",
      "Berlin est la capitale de l’Allemagne, dans le nord-est du pays, sur la Spree et la Havel.",
      "Berlín es la capital de Alemania, en el noreste del país, sobre los ríos Spree y Havel.",
      "Berlin ist die Hauptstadt Deutschlands, im Nordosten des Landes an Spree und Havel.",
      "Berlim é a capital da Alemanha, no nordeste do país, junto aos rios Spree e Havel."
    ),
    batch: "pilot",
  },
  {
    slug: "dubai",
    city_name: "Dubai",
    country_code: "AE",
    center_latitude: 25.2048,
    center_longitude: 55.2708,
    timezone_name: "Asia/Dubai",
    wiki_title: "Dubai",
    region: "middle_east",
    categories: ["port", "commercial"],
    name_i18n: names("دبي", "Dubaï", "Dubái", "Dubai", "Dubai"),
    overview:
      "Dubai is a major city in the United Arab Emirates, on the southern coast of the Persian Gulf.",
    overview_i18n: copy(
      "دبي مدينة رئيسة في الإمارات العربية المتحدة، على الساحل الجنوبي للخليج العربي.",
      "Dubaï est une grande ville des Émirats arabes unis, sur la côte sud du golfe Persique.",
      "Dubái es una ciudad principal de los Emiratos Árabes Unidos, en la costa sur del golfo Pérsico.",
      "Dubai ist eine bedeutende Stadt der Vereinigten Arabischen Emirate an der Südküste des Persischen Golfs.",
      "Dubai é uma cidade principal dos Emirados Árabes Unidos, na costa sul do Golfo Pérsico."
    ),
    batch: "pilot",
  },
  {
    slug: "new-york",
    city_name: "New York",
    country_code: "US",
    center_latitude: 40.7128,
    center_longitude: -74.006,
    timezone_name: "America/New_York",
    wiki_title: "New York City",
    region: "north_america",
    categories: ["port", "cultural", "commercial"],
    name_i18n: names("نيويورك", "New York", "Nueva York", "New York", "Nova Iorque"),
    overview:
      "New York is a major city in the United States, at the mouth of the Hudson River on the Atlantic coast.",
    overview_i18n: copy(
      "نيويورك مدينة رئيسة في الولايات المتحدة، عند مصب نهر هدسون على ساحل الأطلسي.",
      "New York est une grande ville des États-Unis, à l’embouchure de l’Hudson sur la côte atlantique.",
      "Nueva York es una ciudad principal de Estados Unidos, en la desembocadura del Hudson, en la costa atlántica.",
      "New York ist eine bedeutende Stadt der Vereinigten Staaten an der Mündung des Hudson am Atlantik.",
      "Nova Iorque é uma cidade principal dos Estados Unidos, na foz do rio Hudson, na costa atlântica."
    ),
    batch: "pilot",
  },
  {
    slug: "tokyo",
    city_name: "Tokyo",
    country_code: "JP",
    center_latitude: 35.6762,
    center_longitude: 139.6503,
    timezone_name: "Asia/Tokyo",
    wiki_title: "Tokyo",
    region: "asia",
    categories: ["capital", "port", "cultural"],
    name_i18n: names("طوكيو", "Tokyo", "Tokio", "Tokio", "Tóquio"),
    overview:
      "Tokyo is the capital of Japan, on the eastern coast of Honshu around Tokyo Bay.",
    overview_i18n: copy(
      "طوكيو عاصمة اليابان، على الساحل الشرقي لهونشو حول خليج طوكيو.",
      "Tokyo est la capitale du Japon, sur la côte est de Honshū, autour de la baie de Tokyo.",
      "Tokio es la capital de Japón, en la costa este de Honshu, en torno a la bahía de Tokio.",
      "Tokio ist die Hauptstadt Japans, an der Ostküste von Honshū um die Bucht von Tokio.",
      "Tóquio é a capital do Japão, na costa leste de Honshu, em torno da baía de Tóquio."
    ),
    batch: "pilot",
  },
  {
    slug: "cairo",
    city_name: "Cairo",
    country_code: "EG",
    center_latitude: 30.0444,
    center_longitude: 31.2357,
    timezone_name: "Africa/Cairo",
    wiki_title: "Cairo",
    region: "africa",
    categories: ["capital", "historic", "cultural"],
    name_i18n: names("القاهرة", "Le Caire", "El Cairo", "Kairo", "Cairo"),
    overview:
      "Cairo is the capital of Egypt, on the Nile near the Giza plateau and historic Islamic Cairo.",
    overview_i18n: copy(
      "القاهرة عاصمة مصر، على النيل قرب هضبة الجيزة والقاهرة الإسلامية التاريخية.",
      "Le Caire est la capitale de l’Égypte, sur le Nil, près du plateau de Gizeh et du Caire islamique historique.",
      "El Cairo es la capital de Egipto, junto al Nilo, cerca de la meseta de Giza y el El Cairo islámico histórico.",
      "Kairo ist die Hauptstadt Ägyptens, am Nil nahe der Giza-Hochebene und dem historischen islamischen Kairo.",
      "Cairo é a capital do Egito, no Nilo, junto ao planalto de Gizé e ao Cairo islâmico histórico."
    ),
    batch: "pilot",
  },
  {
    slug: "riyadh",
    city_name: "Riyadh",
    country_code: "SA",
    center_latitude: 24.6333,
    center_longitude: 46.7167,
    timezone_name: "Asia/Riyadh",
    wiki_title: "Riyadh",
    region: "middle_east",
    categories: ["capital"],
    name_i18n: names("الرياض", "Riyad", "Riad", "Riad", "Riade"),
    overview:
      "Riyadh is the capital of Saudi Arabia, in the Najd plateau of the central Arabian Peninsula.",
    overview_i18n: copy(
      "الرياض عاصمة المملكة العربية السعودية، في هضبة نجد وسط شبه الجزيرة العربية.",
      "Riyad est la capitale de l’Arabie saoudite, sur le plateau du Najd, au centre de la péninsule arabique.",
      "Riad es la capital de Arabia Saudita, en la meseta de Najd, en el centro de la península arábiga.",
      "Riad ist die Hauptstadt Saudi-Arabiens, auf der Nedschd-Hochebene im Zentrum der Arabischen Halbinsel.",
      "Riade é a capital da Arábia Saudita, no planalto de Najd, no centro da Península Arábica."
    ),
    batch: "v2",
  },
  {
    slug: "doha",
    city_name: "Doha",
    country_code: "QA",
    center_latitude: 25.2867,
    center_longitude: 51.5333,
    timezone_name: "Asia/Qatar",
    wiki_title: "Doha",
    region: "middle_east",
    categories: ["capital", "port"],
    name_i18n: names("الدوحة", "Doha", "Doha", "Doha", "Doha"),
    overview:
      "Doha is the capital of Qatar, on the east coast of the Qatar peninsula on the Persian Gulf.",
    overview_i18n: copy(
      "الدوحة عاصمة قطر، على الساحل الشرقي لشبه جزيرة قطر على الخليج العربي.",
      "Doha est la capitale du Qatar, sur la côte est de la péninsule qatarienne, au golfe Persique.",
      "Doha es la capital de Catar, en la costa este de la península de Catar, en el golfo Pérsico.",
      "Doha ist die Hauptstadt Katars, an der Ostküste der Katar-Halbinsel am Persischen Golf.",
      "Doha é a capital do Catar, na costa leste da península do Catar, no Golfo Pérsico."
    ),
    batch: "v2",
  },
  {
    slug: "beirut",
    city_name: "Beirut",
    country_code: "LB",
    center_latitude: 33.8981,
    center_longitude: 35.5058,
    timezone_name: "Asia/Beirut",
    wiki_title: "Beirut",
    region: "middle_east",
    categories: ["capital", "port", "cultural"],
    name_i18n: names("بيروت", "Beyrouth", "Beirut", "Beirut", "Beirute"),
    overview:
      "Beirut is the capital of Lebanon, on the Mediterranean coast at the foot of the Lebanon Mountains.",
    overview_i18n: copy(
      "بيروت عاصمة لبنان، على ساحل المتوسط عند سفح جبال لبنان.",
      "Beyrouth est la capitale du Liban, sur la côte méditerranéenne, au pied du mont Liban.",
      "Beirut es la capital del Líbano, en la costa mediterránea, al pie de las montañas del Líbano.",
      "Beirut ist die Hauptstadt des Libanon, an der Mittelmeerküste am Fuß des Libanongebirges.",
      "Beirute é a capital do Líbano, na costa mediterrânica, ao pé das montanhas do Líbano."
    ),
    batch: "v2",
  },
  {
    slug: "abu-dhabi",
    city_name: "Abu Dhabi",
    country_code: "AE",
    center_latitude: 24.4667,
    center_longitude: 54.3667,
    timezone_name: "Asia/Dubai",
    wiki_title: "Abu Dhabi",
    region: "middle_east",
    categories: ["capital", "port"],
    name_i18n: names("أبو ظبي", "Abou Dabi", "Abu Dabi", "Abu Dhabi", "Abu Dhabi"),
    overview:
      "Abu Dhabi is the capital of the United Arab Emirates, on an island along the southern Persian Gulf.",
    overview_i18n: copy(
      "أبو ظبي عاصمة الإمارات العربية المتحدة، على جزيرة في جنوب الخليج العربي.",
      "Abou Dabi est la capitale des Émirats arabes unis, sur une île du sud du golfe Persique.",
      "Abu Dabi es la capital de los Emiratos Árabes Unidos, en una isla del sur del golfo Pérsico.",
      "Abu Dhabi ist die Hauptstadt der Vereinigten Arabischen Emirate, auf einer Insel am südlichen Persischen Golf.",
      "Abu Dhabi é a capital dos Emirados Árabes Unidos, numa ilha no sul do Golfo Pérsico."
    ),
    batch: "v2",
  },
  {
    slug: "baghdad",
    city_name: "Baghdad",
    country_code: "IQ",
    center_latitude: 33.3153,
    center_longitude: 44.3661,
    timezone_name: "Asia/Baghdad",
    wiki_title: "Baghdad",
    region: "middle_east",
    categories: ["capital", "historic"],
    name_i18n: names("بغداد", "Bagdad", "Bagdad", "Bagdad", "Bagdade"),
    overview:
      "Baghdad is the capital of Iraq, on the Tigris in the Mesopotamian plain.",
    overview_i18n: copy(
      "بغداد عاصمة العراق، على نهر دجلة في سهل بلاد الرافدين.",
      "Bagdad est la capitale de l’Irak, sur le Tigre, dans la plaine mésopotamienne.",
      "Bagdad es la capital de Irak, junto al Tigris, en la llanura mesopotámica.",
      "Bagdad ist die Hauptstadt des Irak, am Tigris in der mesopotamischen Ebene.",
      "Bagdade é a capital do Iraque, no Tigre, na planície da Mesopotâmia."
    ),
    batch: "v2",
  },
  {
    slug: "london",
    city_name: "London",
    country_code: "GB",
    center_latitude: 51.5072,
    center_longitude: -0.1275,
    timezone_name: "Europe/London",
    wiki_title: "London",
    region: "europe",
    categories: ["capital", "port", "cultural"],
    name_i18n: names("لندن", "Londres", "Londres", "London", "Londres"),
    overview:
      "London is the capital of the United Kingdom, on the River Thames in southeastern England.",
    overview_i18n: copy(
      "لندن عاصمة المملكة المتحدة، على نهر التايمز في جنوب شرق إنجلترا.",
      "Londres est la capitale du Royaume-Uni, sur la Tamise, dans le sud-est de l’Angleterre.",
      "Londres es la capital del Reino Unido, junto al Támesis, en el sureste de Inglaterra.",
      "London ist die Hauptstadt des Vereinigten Königreichs, an der Themse im Südosten Englands.",
      "Londres é a capital do Reino Unido, no rio Tamisa, no sudeste de Inglaterra."
    ),
    batch: "v2",
  },
  {
    slug: "paris",
    city_name: "Paris",
    country_code: "FR",
    center_latitude: 48.8567,
    center_longitude: 2.3522,
    timezone_name: "Europe/Paris",
    wiki_title: "Paris",
    region: "europe",
    categories: ["capital", "cultural"],
    name_i18n: names("باريس", "Paris", "París", "Paris", "Paris"),
    overview:
      "Paris is the capital of France, on the River Seine in the north of the country.",
    overview_i18n: copy(
      "باريس عاصمة فرنسا، على نهر السين في شمال البلاد.",
      "Paris est la capitale de la France, sur la Seine, dans le nord du pays.",
      "París es la capital de Francia, junto al Sena, en el norte del país.",
      "Paris ist die Hauptstadt Frankreichs, an der Seine im Norden des Landes.",
      "Paris é a capital de França, no rio Sena, no norte do país."
    ),
    batch: "v2",
  },
  {
    slug: "madrid",
    city_name: "Madrid",
    country_code: "ES",
    center_latitude: 40.4169,
    center_longitude: -3.7033,
    timezone_name: "Europe/Madrid",
    wiki_title: "Madrid",
    region: "europe",
    categories: ["capital", "cultural"],
    name_i18n: names("مدريد", "Madrid", "Madrid", "Madrid", "Madrid"),
    overview:
      "Madrid is the capital of Spain, on the Meseta Central in the interior of the Iberian Peninsula.",
    overview_i18n: copy(
      "مدريد عاصمة إسبانيا، على الهضبة الوسطى في داخل شبه الجزيرة الإيبيرية.",
      "Madrid est la capitale de l’Espagne, sur la Meseta centrale, à l’intérieur de la péninsule Ibérique.",
      "Madrid es la capital de España, en la Meseta Central, en el interior de la península ibérica.",
      "Madrid ist die Hauptstadt Spaniens, auf der zentralen Hochebene im Inneren der Iberischen Halbinsel.",
      "Madrid é a capital de Espanha, na Meseta Central, no interior da Península Ibérica."
    ),
    batch: "v2",
  },
  {
    slug: "rome",
    city_name: "Rome",
    country_code: "IT",
    center_latitude: 41.8933,
    center_longitude: 12.4828,
    timezone_name: "Europe/Rome",
    wiki_title: "Rome",
    region: "europe",
    categories: ["capital", "historic", "cultural"],
    name_i18n: names("روما", "Rome", "Roma", "Rom", "Roma"),
    overview:
      "Rome is the capital of Italy, on the Tiber in the Lazio region of the Italian peninsula.",
    overview_i18n: copy(
      "روما عاصمة إيطاليا، على نهر التيبر في إقليم لاتسيو بشبه الجزيرة الإيطالية.",
      "Rome est la capitale de l’Italie, sur le Tibre, dans le Latium, sur la péninsule italienne.",
      "Roma es la capital de Italia, junto al Tíber, en la región del Lacio, en la península italiana.",
      "Rom ist die Hauptstadt Italiens, am Tiber in der Region Latium auf der Apenninhalbinsel.",
      "Roma é a capital de Itália, no Tibre, na região do Lácio, na península italiana."
    ),
    batch: "v2",
  },
  {
    slug: "amsterdam",
    city_name: "Amsterdam",
    country_code: "NL",
    center_latitude: 52.3728,
    center_longitude: 4.8936,
    timezone_name: "Europe/Amsterdam",
    wiki_title: "Amsterdam",
    region: "europe",
    categories: ["capital", "port", "cultural"],
    name_i18n: names("أمستردام", "Amsterdam", "Ámsterdam", "Amsterdam", "Amesterdão"),
    overview:
      "Amsterdam is the capital of the Netherlands, in the province of North Holland on the IJ and Amstel.",
    overview_i18n: copy(
      "أمستردام عاصمة هولندا، في مقاطعة شمال هولندا على خليج آي ونهر أمستل.",
      "Amsterdam est la capitale des Pays-Bas, en Hollande-Septentrionale, sur l’IJ et l’Amstel.",
      "Ámsterdam es la capital de los Países Bajos, en Holanda Septentrional, junto al IJ y el Amstel.",
      "Amsterdam ist die Hauptstadt der Niederlande, in Nordholland an IJ und Amstel.",
      "Amesterdão é a capital dos Países Baixos, na Holanda do Norte, junto ao IJ e ao Amstel."
    ),
    batch: "v2",
  },
  {
    slug: "vienna",
    city_name: "Vienna",
    country_code: "AT",
    center_latitude: 48.2083,
    center_longitude: 16.3725,
    timezone_name: "Europe/Vienna",
    wiki_title: "Vienna",
    region: "europe",
    categories: ["capital", "cultural"],
    name_i18n: names("فيينا", "Vienne", "Viena", "Wien", "Viena"),
    overview:
      "Vienna is the capital of Austria, in the northeast of the country on the River Danube.",
    overview_i18n: copy(
      "فيينا عاصمة النمسا، في شمال شرق البلاد على نهر الدانوب.",
      "Vienne est la capitale de l’Autriche, dans le nord-est du pays, sur le Danube.",
      "Viena es la capital de Austria, en el noreste del país, junto al Danubio.",
      "Wien ist die Hauptstadt Österreichs, im Nordosten des Landes an der Donau.",
      "Viena é a capital da Áustria, no nordeste do país, no rio Danúbio."
    ),
    batch: "v2",
  },
  {
    slug: "athens",
    city_name: "Athens",
    country_code: "GR",
    center_latitude: 37.9842,
    center_longitude: 23.7281,
    timezone_name: "Europe/Athens",
    wiki_title: "Athens",
    region: "europe",
    categories: ["capital", "historic", "cultural"],
    name_i18n: names("أثينا", "Athènes", "Atenas", "Athen", "Atenas"),
    overview:
      "Athens is the capital of Greece, in Attica near the Saronic Gulf of the Aegean Sea.",
    overview_i18n: copy(
      "أثينا عاصمة اليونان، في إقليم أتيكا قرب الخليج الساروني في بحر إيجة.",
      "Athènes est la capitale de la Grèce, en Attique, près du golfe Saronique, en mer Égée.",
      "Atenas es la capital de Grecia, en el Ática, cerca del golfo Sarónico, en el mar Egeo.",
      "Athen ist die Hauptstadt Griechenlands, in Attika nahe dem Saronischen Golf der Ägäis.",
      "Atenas é a capital da Grécia, na Ática, junto ao golfo Sarónico, no mar Egeu."
    ),
    batch: "v2",
  },
  {
    slug: "lisbon",
    city_name: "Lisbon",
    country_code: "PT",
    center_latitude: 38.7253,
    center_longitude: -9.15,
    timezone_name: "Europe/Lisbon",
    wiki_title: "Lisbon",
    region: "europe",
    categories: ["capital", "port", "cultural"],
    name_i18n: names("لشبونة", "Lisbonne", "Lisboa", "Lissabon", "Lisboa"),
    overview:
      "Lisbon is the capital of Portugal, on the estuary of the River Tagus at the Atlantic.",
    overview_i18n: copy(
      "لشبونة عاصمة البرتغال، على مصب نهر التاجة عند المحيط الأطلسي.",
      "Lisbonne est la capitale du Portugal, sur l’estuaire du Tage, à l’Atlantique.",
      "Lisboa es la capital de Portugal, en el estuario del Tajo, junto al Atlántico.",
      "Lissabon ist die Hauptstadt Portugals, am Ästuar des Tejo am Atlantik.",
      "Lisboa é a capital de Portugal, no estuário do Tejo, junto ao Atlântico."
    ),
    batch: "v2",
  },
  {
    slug: "prague",
    city_name: "Prague",
    country_code: "CZ",
    center_latitude: 50.0875,
    center_longitude: 14.4214,
    timezone_name: "Europe/Prague",
    wiki_title: "Prague",
    region: "europe",
    categories: ["capital", "historic", "cultural"],
    name_i18n: names("براغ", "Prague", "Praga", "Prag", "Praga"),
    overview:
      "Prague is the capital of Czechia, on the Vltava in Bohemia.",
    overview_i18n: copy(
      "براغ عاصمة التشيك، على نهر فلتافا في بوهيميا.",
      "Prague est la capitale de la Tchéquie, sur la Vltava, en Bohême.",
      "Praga es la capital de Chequia, junto al Vltava, en Bohemia.",
      "Prag ist die Hauptstadt Tschechiens, an der Moldau in Böhmen.",
      "Praga é a capital da Chéquia, no Vltava, na Boémia."
    ),
    batch: "v2",
  },
  {
    slug: "barcelona",
    city_name: "Barcelona",
    country_code: "ES",
    center_latitude: 41.3833,
    center_longitude: 2.1833,
    timezone_name: "Europe/Madrid",
    wiki_title: "Barcelona",
    region: "europe",
    categories: ["port", "cultural"],
    name_i18n: names("برشلونة", "Barcelone", "Barcelona", "Barcelona", "Barcelona"),
    overview:
      "Barcelona is a major city in Spain, the capital of Catalonia, on the Mediterranean coast.",
    overview_i18n: copy(
      "برشلونة مدينة رئيسة في إسبانيا وعاصمة كتالونيا، على ساحل البحر الأبيض المتوسط.",
      "Barcelone est une grande ville d’Espagne, capitale de la Catalogne, sur la côte méditerranéenne.",
      "Barcelona es una ciudad principal de España, capital de Cataluña, en la costa mediterránea.",
      "Barcelona ist eine bedeutende Stadt Spaniens und die Hauptstadt Kataloniens an der Mittelmeerküste.",
      "Barcelona é uma cidade principal de Espanha, capital da Catalunha, na costa mediterrânica."
    ),
    batch: "v2",
  },
  {
    slug: "los-angeles",
    city_name: "Los Angeles",
    country_code: "US",
    center_latitude: 34.05,
    center_longitude: -118.25,
    timezone_name: "America/Los_Angeles",
    wiki_title: "Los Angeles",
    region: "north_america",
    categories: ["port", "cultural"],
    name_i18n: names("لوس أنجلوس", "Los Angeles", "Los Ángeles", "Los Angeles", "Los Angeles"),
    overview:
      "Los Angeles is a major city in the United States, in southern California on the Pacific coast.",
    overview_i18n: copy(
      "لوس أنجلوس مدينة رئيسة في الولايات المتحدة، في جنوب كاليفورنيا على ساحل المحيط الهادئ.",
      "Los Angeles est une grande ville des États-Unis, dans le sud de la Californie, sur la côte Pacifique.",
      "Los Ángeles es una ciudad principal de Estados Unidos, en el sur de California, en la costa del Pacífico.",
      "Los Angeles ist eine bedeutende Stadt der Vereinigten Staaten, in Südkalifornien an der Pazifikküste.",
      "Los Angeles é uma cidade principal dos Estados Unidos, no sul da Califórnia, na costa do Pacífico."
    ),
    batch: "v2",
  },
  {
    slug: "chicago",
    city_name: "Chicago",
    country_code: "US",
    center_latitude: 41.8819,
    center_longitude: -87.6278,
    timezone_name: "America/Chicago",
    wiki_title: "Chicago",
    region: "north_america",
    categories: ["port", "commercial"],
    name_i18n: names("شيكاغو", "Chicago", "Chicago", "Chicago", "Chicago"),
    overview:
      "Chicago is a major city in the United States, on the southwestern shore of Lake Michigan.",
    overview_i18n: copy(
      "شيكاغو مدينة رئيسة في الولايات المتحدة، على الساحل الجنوبي الغربي لبحيرة ميشيغان.",
      "Chicago est une grande ville des États-Unis, sur la rive sud-ouest du lac Michigan.",
      "Chicago es una ciudad principal de Estados Unidos, en la orilla suroeste del lago Míchigan.",
      "Chicago ist eine bedeutende Stadt der Vereinigten Staaten, am Südwestufer des Michigansees.",
      "Chicago é uma cidade principal dos Estados Unidos, na margem sudoeste do lago Michigan."
    ),
    batch: "v2",
  },
  {
    slug: "toronto",
    city_name: "Toronto",
    country_code: "CA",
    center_latitude: 43.6525,
    center_longitude: -79.3817,
    timezone_name: "America/Toronto",
    wiki_title: "Toronto",
    region: "north_america",
    categories: ["port", "commercial"],
    name_i18n: names("تورونتو", "Toronto", "Toronto", "Toronto", "Toronto"),
    overview:
      "Toronto is the capital of Ontario and the most populous city in Canada, on the northwestern shore of Lake Ontario.",
    overview_i18n: copy(
      "تورونتو عاصمة أونتاريو وأكثر مدن كندا سكانًا، على الساحل الشمالي الغربي لبحيرة أونتاريو.",
      "Toronto est la capitale de l’Ontario et la ville la plus peuplée du Canada, sur la rive nord-ouest du lac Ontario.",
      "Toronto es la capital de Ontario y la ciudad más poblada de Canadá, en la orilla noroeste del lago Ontario.",
      "Toronto ist die Hauptstadt Ontarios und die bevölkerungsreichste Stadt Kanadas, am Nordwestufer des Ontariosees.",
      "Toronto é a capital de Ontário e a cidade mais populosa do Canadá, na margem noroeste do lago Ontário."
    ),
    batch: "v2",
  },
  {
    slug: "mexico-city",
    city_name: "Mexico City",
    country_code: "MX",
    center_latitude: 19.4333,
    center_longitude: -99.1333,
    timezone_name: "America/Mexico_City",
    wiki_title: "Mexico City",
    region: "north_america",
    categories: ["capital", "historic", "cultural"],
    name_i18n: names("مدينة مكسيكو", "Mexico", "Ciudad de México", "Mexiko-Stadt", "Cidade do México"),
    overview:
      "Mexico City is the capital of Mexico, in the Valley of Mexico on the south-central Mexican plateau.",
    overview_i18n: copy(
      "مدينة مكسيكو عاصمة المكسيك، في وادي المكسيك على الهضبة الوسطى الجنوبية.",
      "Mexico est la capitale du Mexique, dans la vallée de Mexico, sur le plateau du centre-sud.",
      "Ciudad de México es la capital de México, en el Valle de México, en la meseta del centro-sur.",
      "Mexiko-Stadt ist die Hauptstadt Mexikos, im Tal von Mexiko auf der südlichen Hochebene.",
      "A Cidade do México é a capital do México, no Vale do México, no planalto centro-sul."
    ),
    batch: "v2",
  },
  {
    slug: "vancouver",
    city_name: "Vancouver",
    country_code: "CA",
    center_latitude: 49.2608,
    center_longitude: -123.1139,
    timezone_name: "America/Vancouver",
    wiki_title: "Vancouver",
    region: "north_america",
    categories: ["port"],
    name_i18n: names("فانكوفر", "Vancouver", "Vancouver", "Vancouver", "Vancouver"),
    overview:
      "Vancouver is a major city in Canada, in British Columbia on the Strait of Georgia near the Pacific coast.",
    overview_i18n: copy(
      "فانكوفر مدينة رئيسة في كندا، في كولومبيا البريطانية على مضيق جورجيا قرب ساحل المحيط الهادئ.",
      "Vancouver est une grande ville du Canada, en Colombie-Britannique, sur le détroit de Géorgie, près du Pacifique.",
      "Vancouver es una ciudad principal de Canadá, en Columbia Británica, en el estrecho de Georgia, cerca del Pacífico.",
      "Vancouver ist eine bedeutende Stadt Kanadas, in British Columbia an der Straße von Georgia nahe dem Pazifik.",
      "Vancouver é uma cidade principal do Canadá, na Colúmbia Britânica, no estreito de Geórgia, junto ao Pacífico."
    ),
    batch: "v2",
  },
  {
    slug: "sao-paulo",
    city_name: "São Paulo",
    country_code: "BR",
    center_latitude: -23.55,
    center_longitude: -46.6333,
    timezone_name: "America/Sao_Paulo",
    wiki_title: "São Paulo",
    region: "south_america",
    categories: ["commercial"],
    name_i18n: names("ساو باولو", "São Paulo", "São Paulo", "São Paulo", "São Paulo"),
    overview:
      "São Paulo is the most populous city in Brazil, on the Piratininga plateau in the southeast of the country.",
    overview_i18n: copy(
      "ساو باولو أكثر مدن البرازيل سكانًا، على هضبة بيراتينينغا في جنوب شرق البلاد.",
      "São Paulo est la ville la plus peuplée du Brésil, sur le plateau de Piratininga, dans le sud-est du pays.",
      "São Paulo es la ciudad más poblada de Brasil, en la meseta de Piratininga, en el sureste del país.",
      "São Paulo ist die bevölkerungsreichste Stadt Brasiliens, auf der Hochebene von Piratininga im Südosten des Landes.",
      "São Paulo é a cidade mais populosa do Brasil, no planalto de Piratininga, no sudeste do país."
    ),
    batch: "v2",
  },
  {
    slug: "rio-de-janeiro",
    city_name: "Rio de Janeiro",
    country_code: "BR",
    center_latitude: -22.9111,
    center_longitude: -43.2056,
    timezone_name: "America/Sao_Paulo",
    wiki_title: "Rio de Janeiro",
    region: "south_america",
    categories: ["port", "cultural"],
    name_i18n: names("ريو دي جانيرو", "Rio de Janeiro", "Río de Janeiro", "Rio de Janeiro", "Rio de Janeiro"),
    overview:
      "Rio de Janeiro is a major city in Brazil, on the Atlantic coast of Guanabara Bay.",
    overview_i18n: copy(
      "ريو دي جانيرو مدينة رئيسة في البرازيل، على ساحل الأطلسي عند خليج غوانابارا.",
      "Rio de Janeiro est une grande ville du Brésil, sur la côte atlantique, au bord de la baie de Guanabara.",
      "Río de Janeiro es una ciudad principal de Brasil, en la costa atlántica, en la bahía de Guanabara.",
      "Rio de Janeiro ist eine bedeutende Stadt Brasiliens, an der Atlantikküste der Guanabara-Bucht.",
      "O Rio de Janeiro é uma cidade principal do Brasil, na costa atlântica da baía de Guanabara."
    ),
    batch: "v2",
  },
  {
    slug: "buenos-aires",
    city_name: "Buenos Aires",
    country_code: "AR",
    center_latitude: -34.6039,
    center_longitude: -58.3814,
    timezone_name: "America/Argentina/Buenos_Aires",
    wiki_title: "Buenos Aires",
    region: "south_america",
    categories: ["capital", "port", "cultural"],
    name_i18n: names("بوينس آيرس", "Buenos Aires", "Buenos Aires", "Buenos Aires", "Buenos Aires"),
    overview:
      "Buenos Aires is the capital of Argentina, on the western shore of the Río de la Plata estuary.",
    overview_i18n: copy(
      "بوينس آيرس عاصمة الأرجنتين، على الضفة الغربية لمصب ريو دي لا بلاتا.",
      "Buenos Aires est la capitale de l’Argentine, sur la rive ouest de l’estuaire du Río de la Plata.",
      "Buenos Aires es la capital de Argentina, en la orilla oeste del estuario del Río de la Plata.",
      "Buenos Aires ist die Hauptstadt Argentiniens, am Westufer des Río-de-la-Plata-Ästuars.",
      "Buenos Aires é a capital da Argentina, na margem oeste do estuário do Rio da Prata."
    ),
    batch: "v2",
  },
  {
    slug: "lima",
    city_name: "Lima",
    country_code: "PE",
    center_latitude: -12.06,
    center_longitude: -77.0375,
    timezone_name: "America/Lima",
    wiki_title: "Lima",
    region: "south_america",
    categories: ["capital", "port"],
    name_i18n: names("ليما", "Lima", "Lima", "Lima", "Lima"),
    overview:
      "Lima is the capital of Peru, on the central Pacific coast of the country beside the Rimac River.",
    overview_i18n: copy(
      "ليما عاصمة بيرو، على الساحل الأوسط للمحيط الهادئ إلى جانب نهر ريماك.",
      "Lima est la capitale du Pérou, sur la côte pacifique centrale, près du fleuve Rímac.",
      "Lima es la capital del Perú, en la costa central del Pacífico, junto al río Rímac.",
      "Lima ist die Hauptstadt Perus, an der zentralen Pazifikküste am Río Rímac.",
      "Lima é a capital do Peru, na costa central do Pacífico, junto ao rio Rímac."
    ),
    batch: "v2",
  },
  {
    slug: "bogota",
    city_name: "Bogotá",
    country_code: "CO",
    center_latitude: 4.7111,
    center_longitude: -74.0722,
    timezone_name: "America/Bogota",
    wiki_title: "Bogotá",
    region: "south_america",
    categories: ["capital"],
    name_i18n: names("بوغوتا", "Bogota", "Bogotá", "Bogotá", "Bogotá"),
    overview:
      "Bogotá is the capital of Colombia, on the Bogotá savanna of the Eastern Andes.",
    overview_i18n: copy(
      "بوغوتا عاصمة كولومبيا، على سافانا بوغوتا في جبال الأنديز الشرقية.",
      "Bogota est la capitale de la Colombie, sur la savane de Bogotá, dans la Cordillère orientale.",
      "Bogotá es la capital de Colombia, en la sabana de Bogotá, en la cordillera Oriental de los Andes.",
      "Bogotá ist die Hauptstadt Kolumbiens, auf der Sabana de Bogotá in den Ostanden.",
      "Bogotá é a capital da Colômbia, na savana de Bogotá, nos Andes Orientais."
    ),
    batch: "v2",
  },
  {
    slug: "santiago",
    city_name: "Santiago",
    country_code: "CL",
    center_latitude: -33.4375,
    center_longitude: -70.65,
    timezone_name: "America/Santiago",
    wiki_title: "Santiago",
    region: "south_america",
    categories: ["capital"],
    name_i18n: names("سانتياغو", "Santiago", "Santiago", "Santiago", "Santiago"),
    overview:
      "Santiago is the capital of Chile, in the central valley between the Andes and the Chilean Coastal Range.",
    overview_i18n: copy(
      "سانتياغو عاصمة تشيلي، في الوادي الأوسط بين جبال الأنديز والسلسلة الساحلية.",
      "Santiago est la capitale du Chili, dans la vallée centrale, entre les Andes et la cordillère de la Côte.",
      "Santiago es la capital de Chile, en el valle central, entre los Andes y la cordillera de la Costa.",
      "Santiago ist die Hauptstadt Chiles, im Zentraltal zwischen den Anden und der chilenischen Küstenkordillere.",
      "Santiago é a capital do Chile, no vale central, entre os Andes e a Cordilheira da Costa."
    ),
    batch: "v2",
  },
  {
    slug: "lagos",
    city_name: "Lagos",
    country_code: "NG",
    center_latitude: 6.4561,
    center_longitude: 3.3936,
    timezone_name: "Africa/Lagos",
    wiki_title: "Lagos",
    region: "africa",
    categories: ["port", "commercial"],
    name_i18n: names("لاغوس", "Lagos", "Lagos", "Lagos", "Lagos"),
    overview:
      "Lagos is the most populous city in Nigeria, on the Bight of Benin in the southwest of the country.",
    overview_i18n: copy(
      "لاغوس أكثر مدن نيجيريا سكانًا، على خليج بنين في جنوب غرب البلاد.",
      "Lagos est la ville la plus peuplée du Nigeria, sur la baie du Bénin, dans le sud-ouest du pays.",
      "Lagos es la ciudad más poblada de Nigeria, en la bahía de Benín, en el suroeste del país.",
      "Lagos ist die bevölkerungsreichste Stadt Nigerias, an der Bucht von Benin im Südwesten des Landes.",
      "Lagos é a cidade mais populosa da Nigéria, no golfo do Benim, no sudoeste do país."
    ),
    batch: "v2",
  },
  {
    slug: "nairobi",
    city_name: "Nairobi",
    country_code: "KE",
    center_latitude: -1.2864,
    center_longitude: 36.8172,
    timezone_name: "Africa/Nairobi",
    wiki_title: "Nairobi",
    region: "africa",
    categories: ["capital"],
    name_i18n: names("نيروبي", "Nairobi", "Nairobi", "Nairobi", "Nairóbi"),
    overview:
      "Nairobi is the capital of Kenya, on the Athi plains south of the equator in the Kenyan highlands.",
    overview_i18n: copy(
      "نيروبي عاصمة كينيا، على سهول آثي جنوب خط الاستواء في مرتفعات كينيا.",
      "Nairobi est la capitale du Kenya, sur les plaines de l’Athi, au sud de l’équateur, dans les hauts plateaux kényans.",
      "Nairobi es la capital de Kenia, en las llanuras del Athi, al sur del ecuador, en las tierras altas kenianas.",
      "Nairobi ist die Hauptstadt Kenias, auf den Athi-Ebenen südlich des Äquators im kenianischen Hochland.",
      "Nairóbi é a capital do Quénia, nas planícies do Athi, a sul do equador, no planalto queniano."
    ),
    batch: "v2",
  },
  {
    slug: "cape-town",
    city_name: "Cape Town",
    country_code: "ZA",
    center_latitude: -33.9253,
    center_longitude: 18.4239,
    timezone_name: "Africa/Johannesburg",
    wiki_title: "Cape Town",
    region: "africa",
    categories: ["capital", "port", "cultural"],
    name_i18n: names("كيب تاون", "Le Cap", "Ciudad del Cabo", "Kapstadt", "Cidade do Cabo"),
    overview:
      "Cape Town is the legislative capital of South Africa, on the Atlantic coast of the Cape Peninsula.",
    overview_i18n: copy(
      "كيب تاون العاصمة التشريعية لجنوب أفريقيا، على الساحل الأطلسي لشبه جزيرة الكاب.",
      "Le Cap est la capitale législative de l’Afrique du Sud, sur la côte atlantique de la péninsule du Cap.",
      "Ciudad del Cabo es la capital legislativa de Sudáfrica, en la costa atlántica de la península del Cabo.",
      "Kapstadt ist die gesetzgebende Hauptstadt Südafrikas, an der Atlantikküste der Kap-Halbinsel.",
      "A Cidade do Cabo é a capital legislativa da África do Sul, na costa atlântica da península do Cabo."
    ),
    batch: "v2",
  },
  {
    slug: "johannesburg",
    city_name: "Johannesburg",
    country_code: "ZA",
    center_latitude: -26.2044,
    center_longitude: 28.0456,
    timezone_name: "Africa/Johannesburg",
    wiki_title: "Johannesburg",
    region: "africa",
    categories: ["commercial"],
    name_i18n: names("جوهانسبرغ", "Johannesburg", "Johannesburgo", "Johannesburg", "Joanesburgo"),
    overview:
      "Johannesburg is the most populous city in South Africa, on the Highveld of Gauteng.",
    overview_i18n: copy(
      "جوهانسبرغ أكثر مدن جنوب أفريقيا سكانًا، على هضبة الهايفلد في غوتنغ.",
      "Johannesburg est la ville la plus peuplée d’Afrique du Sud, sur le Highveld, dans le Gauteng.",
      "Johannesburgo es la ciudad más poblada de Sudáfrica, en el Highveld de Gauteng.",
      "Johannesburg ist die bevölkerungsreichste Stadt Südafrikas, auf dem Highveld in Gauteng.",
      "Joanesburgo é a cidade mais populosa da África do Sul, no Highveld de Gauteng."
    ),
    batch: "v2",
  },
  {
    slug: "casablanca",
    city_name: "Casablanca",
    country_code: "MA",
    center_latitude: 33.5333,
    center_longitude: -7.5833,
    timezone_name: "Africa/Casablanca",
    wiki_title: "Casablanca",
    region: "africa",
    categories: ["port", "commercial"],
    name_i18n: names("الدار البيضاء", "Casablanca", "Casablanca", "Casablanca", "Casablanca"),
    overview:
      "Casablanca is the largest city in Morocco, on the Atlantic coast of the Chaouia plain.",
    overview_i18n: copy(
      "الدار البيضاء أكبر مدن المغرب، على الساحل الأطلسي في سهل الشاوية.",
      "Casablanca est la plus grande ville du Maroc, sur la côte atlantique de la plaine de la Chaouia.",
      "Casablanca es la ciudad más grande de Marruecos, en la costa atlántica de la llanura de Chaouia.",
      "Casablanca ist die größte Stadt Marokkos, an der Atlantikküste der Chaouia-Ebene.",
      "Casablanca é a maior cidade de Marrocos, na costa atlântica da planície da Chaouia."
    ),
    batch: "v2",
  },
  {
    slug: "accra",
    city_name: "Accra",
    country_code: "GH",
    center_latitude: 5.55,
    center_longitude: -0.2,
    timezone_name: "Africa/Accra",
    wiki_title: "Accra",
    region: "africa",
    categories: ["capital", "port"],
    name_i18n: names("أكرا", "Accra", "Acra", "Accra", "Acra"),
    overview:
      "Accra is the capital of Ghana, on the Gulf of Guinea in the south of the country.",
    overview_i18n: copy(
      "أكرا عاصمة غانا، على خليج غينيا في جنوب البلاد.",
      "Accra est la capitale du Ghana, sur le golfe de Guinée, dans le sud du pays.",
      "Acra es la capital de Ghana, en el golfo de Guinea, en el sur del país.",
      "Accra ist die Hauptstadt Ghanas, am Golf von Guinea im Süden des Landes.",
      "Acra é a capital do Gana, no golfo da Guiné, no sul do país."
    ),
    batch: "v2",
  },
  {
    slug: "tunis",
    city_name: "Tunis",
    country_code: "TN",
    center_latitude: 36.8064,
    center_longitude: 10.1817,
    timezone_name: "Africa/Tunis",
    wiki_title: "Tunis",
    region: "africa",
    categories: ["capital", "historic", "port"],
    name_i18n: names("تونس", "Tunis", "Túnez", "Tunis", "Tunes"),
    overview:
      "Tunis is the capital of Tunisia, on the Lake of Tunis near the Mediterranean coast and ancient Carthage.",
    overview_i18n: copy(
      "تونس عاصمة الجمهورية التونسية، على بحيرة تونس قرب ساحل المتوسط وقرطاج القديمة.",
      "Tunis est la capitale de la Tunisie, sur le lac de Tunis, près de la côte méditerranéenne et de l’ancienne Carthage.",
      "Túnez es la capital de Túnez, en el lago de Túnez, cerca de la costa mediterránea y de la antigua Cartago.",
      "Tunis ist die Hauptstadt Tunesiens, am See von Tunis nahe der Mittelmeerküste und dem antiken Karthago.",
      "Tunes é a capital da Tunísia, no lago de Tunes, junto à costa mediterrânica e à antiga Cartago."
    ),
    batch: "v2",
  },
  {
    slug: "seoul",
    city_name: "Seoul",
    country_code: "KR",
    center_latitude: 37.56,
    center_longitude: 126.99,
    timezone_name: "Asia/Seoul",
    wiki_title: "Seoul",
    region: "asia",
    categories: ["capital", "cultural"],
    name_i18n: names("سيول", "Séoul", "Seúl", "Seoul", "Seul"),
    overview:
      "Seoul is the capital of South Korea, on the Han River in the northwest of the Korean Peninsula.",
    overview_i18n: copy(
      "سيول عاصمة كوريا الجنوبية، على نهر هان في شمال غرب شبه الجزيرة الكورية.",
      "Séoul est la capitale de la Corée du Sud, sur le fleuve Han, dans le nord-ouest de la péninsule coréenne.",
      "Seúl es la capital de Corea del Sur, junto al río Han, en el noroeste de la península de Corea.",
      "Seoul ist die Hauptstadt Südkoreas, am Hangang im Nordwesten der Koreanischen Halbinsel.",
      "Seul é a capital da Coreia do Sul, no rio Han, no noroeste da península coreana."
    ),
    batch: "v2",
  },
  {
    slug: "beijing",
    city_name: "Beijing",
    country_code: "CN",
    center_latitude: 39.9067,
    center_longitude: 116.3975,
    timezone_name: "Asia/Shanghai",
    wiki_title: "Beijing",
    region: "asia",
    categories: ["capital", "historic", "cultural"],
    name_i18n: names("بكين", "Pékin", "Pekín", "Peking", "Pequim"),
    overview:
      "Beijing is the capital of China, on the North China Plain at the northern edge of the North China agricultural heartland.",
    overview_i18n: copy(
      "بكين عاصمة الصين، على سهل شمال الصين عند الطرف الشمالي للقلب الزراعي في شمال البلاد.",
      "Pékin est la capitale de la Chine, sur la plaine de Chine du Nord, à la lisière nord du cœur agricole du nord du pays.",
      "Pekín es la capital de China, en la llanura del Norte de China, en el borde septentrional del corazón agrícola del norte.",
      "Peking ist die Hauptstadt Chinas, auf der Nordchinesischen Ebene am nördlichen Rand des nordchinesischen Agrarraums.",
      "Pequim é a capital da China, na Planície do Norte da China, no limite setentrional do coração agrícola do norte."
    ),
    batch: "v2",
  },
  {
    slug: "shanghai",
    city_name: "Shanghai",
    country_code: "CN",
    center_latitude: 31.2325,
    center_longitude: 121.4692,
    timezone_name: "Asia/Shanghai",
    wiki_title: "Shanghai",
    region: "asia",
    categories: ["port", "commercial"],
    name_i18n: names("شنغهاي", "Shanghai", "Shanghái", "Shanghai", "Xangai"),
    overview:
      "Shanghai is a major city in China, on the Yangtze River delta at the East China Sea.",
    overview_i18n: copy(
      "شنغهاي مدينة رئيسة في الصين، على دلتا نهر اليانغتسي عند بحر الصين الشرقي.",
      "Shanghai est une grande ville de Chine, sur le delta du Yangtsé, en mer de Chine orientale.",
      "Shanghái es una ciudad principal de China, en el delta del Yangtsé, junto al mar de la China Oriental.",
      "Shanghai ist eine bedeutende Stadt Chinas, im Jangtse-Delta am Ostchinesischen Meer.",
      "Xangai é uma cidade principal da China, no delta do Yangtzé, no Mar da China Oriental."
    ),
    batch: "v2",
  },
  {
    slug: "mumbai",
    city_name: "Mumbai",
    country_code: "IN",
    center_latitude: 19.0761,
    center_longitude: 72.8775,
    timezone_name: "Asia/Kolkata",
    wiki_title: "Mumbai",
    region: "asia",
    categories: ["port", "commercial"],
    name_i18n: names("مومباي", "Mumbai", "Bombay", "Mumbai", "Mumbai"),
    overview:
      "Mumbai is the capital of Maharashtra and the most populous city in India, on the west coast of the Konkan.",
    overview_i18n: copy(
      "مومباي عاصمة ماهاراشترا وأكثر مدن الهند سكانًا، على الساحل الغربي لإقليم كونكان.",
      "Mumbai est la capitale du Maharashtra et la ville la plus peuplée d’Inde, sur la côte ouest du Konkan.",
      "Bombay es la capital de Maharashtra y la ciudad más poblada de la India, en la costa oeste del Konkan.",
      "Mumbai ist die Hauptstadt Maharashtras und die bevölkerungsreichste Stadt Indiens, an der Westküste des Konkan.",
      "Mumbai é a capital de Maharashtra e a cidade mais populosa da Índia, na costa oeste do Concão."
    ),
    batch: "v2",
  },
  {
    slug: "new-delhi",
    city_name: "New Delhi",
    country_code: "IN",
    center_latitude: 28.6139,
    center_longitude: 77.2089,
    timezone_name: "Asia/Kolkata",
    wiki_title: "New Delhi",
    region: "asia",
    categories: ["capital"],
    name_i18n: names("نيودلهي", "New Delhi", "Nueva Delhi", "Neu-Delhi", "Nova Deli"),
    overview:
      "New Delhi is the capital of India, in the National Capital Territory of Delhi on the Yamuna River.",
    overview_i18n: copy(
      "نيودلهي عاصمة الهند، في إقليم دلهي العاصمة على نهر يامونا.",
      "New Delhi est la capitale de l’Inde, dans le Territoire de la capitale nationale de Delhi, sur la Yamuna.",
      "Nueva Delhi es la capital de la India, en el Territorio de la Capital Nacional de Delhi, junto al Yamuna.",
      "Neu-Delhi ist die Hauptstadt Indiens, im Nationalen Hauptstadtterritorium Delhi am Yamuna.",
      "Nova Deli é a capital da Índia, no Território da Capital Nacional de Deli, no rio Yamuna."
    ),
    batch: "v2",
  },
  {
    slug: "hong-kong",
    city_name: "Hong Kong",
    country_code: "HK",
    center_latitude: 22.3,
    center_longitude: 114.2,
    timezone_name: "Asia/Hong_Kong",
    wiki_title: "Hong Kong",
    region: "asia",
    categories: ["port", "commercial"],
    name_i18n: names("هونغ كونغ", "Hong Kong", "Hong Kong", "Hongkong", "Hong Kong"),
    overview:
      "Hong Kong is a special administrative region of China, on the eastern side of the Pearl River estuary of the South China Sea.",
    overview_i18n: copy(
      "هونغ كونغ منطقة إدارية خاصة تابعة للصين، على الجانب الشرقي لمصب نهر اللؤلؤ في بحر الصين الجنوبي.",
      "Hong Kong est une région administrative spéciale de Chine, sur le côté est de l’estuaire de la rivière des Perles, en mer de Chine méridionale.",
      "Hong Kong es una región administrativa especial de China, en el lado este del estuario del río Perla, en el mar de la China Meridional.",
      "Hongkong ist eine Sonderverwaltungszone Chinas, an der Ostseite des Perlfluss-Ästuars im Südchinesischen Meer.",
      "Hong Kong é uma região administrativa especial da China, no lado leste do estuário do Rio das Pérolas, no Mar da China Meridional."
    ),
    batch: "v2",
  },
  {
    slug: "bangkok",
    city_name: "Bangkok",
    country_code: "TH",
    center_latitude: 13.7525,
    center_longitude: 100.4942,
    timezone_name: "Asia/Bangkok",
    wiki_title: "Bangkok",
    region: "southeast_asia",
    categories: ["capital", "port", "cultural"],
    name_i18n: names("بانكوك", "Bangkok", "Bangkok", "Bangkok", "Banguecoque"),
    overview:
      "Bangkok is the capital of Thailand, on the Chao Phraya River near the Gulf of Thailand.",
    overview_i18n: copy(
      "بانكوك عاصمة تايلاند، على نهر تشاو فرايا قرب خليج تايلاند.",
      "Bangkok est la capitale de la Thaïlande, sur le Chao Phraya, près du golfe de Thaïlande.",
      "Bangkok es la capital de Tailandia, junto al Chao Phraya, cerca del golfo de Tailandia.",
      "Bangkok ist die Hauptstadt Thailands, am Mae Nam Chao Phraya nahe dem Golf von Thailand.",
      "Banguecoque é a capital da Tailândia, no rio Chao Phraya, junto ao golfo da Tailândia."
    ),
    batch: "v2",
  },
  {
    slug: "singapore",
    city_name: "Singapore",
    country_code: "SG",
    center_latitude: 1.2833,
    center_longitude: 103.8333,
    timezone_name: "Asia/Singapore",
    wiki_title: "Singapore",
    region: "southeast_asia",
    categories: ["capital", "port"],
    name_i18n: names("سنغافورة", "Singapour", "Singapur", "Singapur", "Singapura"),
    overview:
      "Singapore is a city-state at the southern tip of the Malay Peninsula, on the Strait of Singapore.",
    overview_i18n: copy(
      "سنغافورة دولة مدينة عند الطرف الجنوبي لشبه الجزيرة الملاوية، على مضيق سنغافورة.",
      "Singapour est une cité-État à la pointe sud de la péninsule Malaise, sur le détroit de Singapour.",
      "Singapur es una ciudad-Estado en el extremo sur de la península malaya, en el estrecho de Singapur.",
      "Singapur ist ein Stadtstaat an der Südspitze der Malaiischen Halbinsel, an der Straße von Singapur.",
      "Singapura é uma cidade-Estado na ponta sul da Península Malaia, no estreito de Singapura."
    ),
    batch: "v2",
  },
  {
    slug: "jakarta",
    city_name: "Jakarta",
    country_code: "ID",
    center_latitude: -6.18,
    center_longitude: 106.83,
    timezone_name: "Asia/Jakarta",
    wiki_title: "Jakarta",
    region: "southeast_asia",
    categories: ["capital", "port"],
    name_i18n: names("جاكرتا", "Jakarta", "Yakarta", "Jakarta", "Jacarta"),
    overview:
      "Jakarta is the capital of Indonesia, on the northwest coast of Java on the Java Sea.",
    overview_i18n: copy(
      "جاكرتا عاصمة إندونيسيا، على الساحل الشمالي الغربي لجزيرة جاوة عند بحر جاوة.",
      "Jakarta est la capitale de l’Indonésie, sur la côte nord-ouest de Java, en mer de Java.",
      "Yakarta es la capital de Indonesia, en la costa noroeste de Java, en el mar de Java.",
      "Jakarta ist die Hauptstadt Indonesiens, an der Nordwestküste Javas am Javasee.",
      "Jacarta é a capital da Indonésia, na costa noroeste de Java, no mar de Java."
    ),
    batch: "v2",
  },
  {
    slug: "kuala-lumpur",
    city_name: "Kuala Lumpur",
    country_code: "MY",
    center_latitude: 3.1478,
    center_longitude: 101.6953,
    timezone_name: "Asia/Kuala_Lumpur",
    wiki_title: "Kuala Lumpur",
    region: "southeast_asia",
    categories: ["capital"],
    name_i18n: names("كوالالمبور", "Kuala Lumpur", "Kuala Lumpur", "Kuala Lumpur", "Kuala Lumpur"),
    overview:
      "Kuala Lumpur is the capital of Malaysia, in the Klang Valley of Peninsular Malaysia.",
    overview_i18n: copy(
      "كوالالمبور عاصمة ماليزيا، في وادي كلانغ بشبه الجزيرة الماليزية.",
      "Kuala Lumpur est la capitale de la Malaisie, dans la vallée du Klang, en Malaisie péninsulaire.",
      "Kuala Lumpur es la capital de Malasia, en el valle del Klang, en la Malasia peninsular.",
      "Kuala Lumpur ist die Hauptstadt Malaysias, im Klang-Tal auf der Malaiischen Halbinsel.",
      "Kuala Lumpur é a capital da Malásia, no vale do Klang, na Malásia Peninsular."
    ),
    batch: "v2",
  },
  {
    slug: "manila",
    city_name: "Manila",
    country_code: "PH",
    center_latitude: 14.5958,
    center_longitude: 120.9772,
    timezone_name: "Asia/Manila",
    wiki_title: "Manila",
    region: "southeast_asia",
    categories: ["capital", "port"],
    name_i18n: names("مانيلا", "Manille", "Manila", "Manila", "Manila"),
    overview:
      "Manila is the capital of the Philippines, on Manila Bay on the western side of Luzon.",
    overview_i18n: copy(
      "مانيلا عاصمة الفلبين، على خليج مانيلا في غرب جزيرة لوزون.",
      "Manille est la capitale des Philippines, sur la baie de Manille, à l’ouest de Luçon.",
      "Manila es la capital de Filipinas, en la bahía de Manila, en el oeste de Luzón.",
      "Manila ist die Hauptstadt der Philippinen, an der Manilabucht im Westen Luzons.",
      "Manila é a capital das Filipinas, na baía de Manila, no oeste de Luzon."
    ),
    batch: "v2",
  },
  {
    slug: "sydney",
    city_name: "Sydney",
    country_code: "AU",
    center_latitude: -33.8678,
    center_longitude: 151.21,
    timezone_name: "Australia/Sydney",
    wiki_title: "Sydney",
    region: "oceania",
    categories: ["port", "cultural"],
    name_i18n: names("سيدني", "Sydney", "Sídney", "Sydney", "Sydney"),
    overview:
      "Sydney is the capital of New South Wales and the most populous city in Australia, on Port Jackson on the Tasman Sea.",
    overview_i18n: copy(
      "سيدني عاصمة نيو ساوث ويلز وأكثر مدن أستراليا سكانًا، على بورت جاكسون في بحر تاسمان.",
      "Sydney est la capitale de la Nouvelle-Galles du Sud et la ville la plus peuplée d’Australie, sur Port Jackson, en mer de Tasman.",
      "Sídney es la capital de Nueva Gales del Sur y la ciudad más poblada de Australia, en Port Jackson, en el mar de Tasmania.",
      "Sydney ist die Hauptstadt von New South Wales und die bevölkerungsreichste Stadt Australiens, an Port Jackson in der Tasmansee.",
      "Sydney é a capital de Nova Gales do Sul e a cidade mais populosa da Austrália, em Port Jackson, no mar de Tasmânia."
    ),
    batch: "v2",
  },
  {
    slug: "melbourne",
    city_name: "Melbourne",
    country_code: "AU",
    center_latitude: -37.8142,
    center_longitude: 144.9631,
    timezone_name: "Australia/Melbourne",
    wiki_title: "Melbourne",
    region: "oceania",
    categories: ["port", "cultural"],
    name_i18n: names("ملبورن", "Melbourne", "Melbourne", "Melbourne", "Melbourne"),
    overview:
      "Melbourne is the capital of Victoria, on Port Phillip in southeastern Australia.",
    overview_i18n: copy(
      "ملبورن عاصمة فيكتوريا، على خليج بورت فيليب في جنوب شرق أستراليا.",
      "Melbourne est la capitale de l’État de Victoria, sur Port Phillip, dans le sud-est de l’Australie.",
      "Melbourne es la capital de Victoria, en Port Phillip, en el sureste de Australia.",
      "Melbourne ist die Hauptstadt von Victoria, an Port Phillip im Südosten Australiens.",
      "Melbourne é a capital de Vitória, em Port Phillip, no sudeste da Austrália."
    ),
    batch: "v2",
  },
  {
    slug: "auckland",
    city_name: "Auckland",
    country_code: "NZ",
    center_latitude: -36.8492,
    center_longitude: 174.7653,
    timezone_name: "Pacific/Auckland",
    wiki_title: "Auckland",
    region: "oceania",
    categories: ["port"],
    name_i18n: names("أوكلاند", "Auckland", "Auckland", "Auckland", "Auckland"),
    overview:
      "Auckland is the most populous city in New Zealand, on an isthmus between the Waitematā and Manukau harbours of the North Island.",
    overview_i18n: copy(
      "أوكلاند أكثر مدن نيوزيلندا سكانًا، على برزخ بين ميناءَي وايتماتا ومانوكاو في الجزيرة الشمالية.",
      "Auckland est la ville la plus peuplée de Nouvelle-Zélande, sur un isthme entre les ports de Waitematā et de Manukau, dans l’île du Nord.",
      "Auckland es la ciudad más poblada de Nueva Zelanda, en un istmo entre los puertos de Waitematā y Manukau, en la Isla Norte.",
      "Auckland ist die bevölkerungsreichste Stadt Neuseelands, auf einer Landenge zwischen den Häfen Waitematā und Manukau auf der Nordinsel.",
      "Auckland é a cidade mais populosa da Nova Zelândia, num istmo entre os portos de Waitematā e Manukau, na Ilha Norte."
    ),
    batch: "v2",
  },
];

export function wikiCitation(title: string, lat: number, lon: number) {
  const href = `https://en.wikipedia.org/wiki/${title.replace(/ /g, "_")}`;
  return {
    kind: "public_geographic_fact" as const,
    source: "Wikipedia Geo coordinates API",
    citation: `Primary coordinates from ${href} (${lat}, ${lon}), retrieved 2026-08-17 via action=query&prop=coordinates.`,
  };
}

export function buildExpansionV2Manifest() {
  const cities = EXPANSION_V2_CITIES.filter((city) => city.batch === "v2");
  return {
    id: "world-catalog-expansion-v2",
    version: "2.0.0",
    publication: "draft" as const,
    notes:
      "Batch V2 major-city expansion. Coordinates from Wikipedia primary Geo. Overviews are short factual discovery text. No media. No places. Localized names/descriptions in city-copy-v2. Wave 2 locales reserved, not filled.",
    countries: [...EXPANSION_V2_COUNTRIES],
    cities: cities.map((city) => ({
      slug: city.slug,
      city_name: city.city_name,
      country_code: city.country_code,
      center_latitude: city.center_latitude,
      center_longitude: city.center_longitude,
      timezone_name: city.timezone_name,
      overview: city.overview,
      name_i18n: city.name_i18n,
      overview_i18n: city.overview_i18n,
      discovery: {
        region: city.region,
        categories: city.categories,
      },
      provenance: wikiCitation(
        city.wiki_title,
        city.center_latitude,
        city.center_longitude
      ),
    })),
    places: [],
  };
}

export function buildCityCopyV2Bundle() {
  return {
    id: "world-city-copy-v2",
    version: "2.0.0",
    locales: ["ar", "en", "fr", "es", "de", "pt"],
    reserved_locales: ["tr", "id", "zh", "hi", "ja", "ru"],
    cities: EXPANSION_V2_CITIES.map((city) => ({
      slug: city.slug,
      name_i18n: { en: city.city_name, ...city.name_i18n },
      overview: city.overview,
      overview_i18n: city.overview_i18n,
    })),
  };
}
