import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const KEY = "profile.videosShowingLatest";
const values = {
  en: "Showing the latest videos on this profile. Open any clip to watch it.",
  ar: "عرض أحدث الفيديوهات في هذا الملف. افتح أي مقطع لمشاهدته.",
  fr: "Dernières vidéos de ce profil. Ouvrez un clip pour le regarder.",
  es: "Últimos vídeos de este perfil. Abre un clip para verlo.",
  de: "Neueste Videos auf diesem Profil. Öffne einen Clip zum Ansehen.",
  pt: "Vídeos mais recentes neste perfil. Abra um clipe para ver.",
  id: "Menampilkan video terbaru di profil ini. Buka klip untuk menonton.",
  hi: "इस प्रोफ़ाइल के नवीनतम वीडियो. देखने के लिए कोई क्लिप खोलें.",
  ru: "Последние видео этого профиля. Откройте ролик, чтобы посмотреть.",
  tr: "Bu profildeki en son videolar. İzlemek için bir klip açın.",
  "zh-CN": "显示此主页的最新视频。打开任意片段即可观看。",
  ja: "このプロフィールの最新動画です。クリップを開いて視聴できます。",
  ko: "이 프로필의 최신 동영상입니다. 클립을 열어 시청하세요.",
};

const typesPath = join(ROOT, "lib/i18n/messages/types.ts");
let types = readFileSync(typesPath, "utf8");
if (!types.includes(KEY)) {
  types = types.replace(
    `"profile.umLife": string;`,
    `"${KEY}": string;\n  "profile.umLife": string;`
  );
  writeFileSync(typesPath, types);
}

for (const [locale, value] of Object.entries(values)) {
  const file = join(ROOT, `lib/i18n/messages/${locale}.ts`);
  let source = readFileSync(file, "utf8");
  if (source.includes(KEY)) continue;
  source = source.replace(
    `"profile.umLife":`,
    `"${KEY}": ${JSON.stringify(value)},\n  "profile.umLife":`
  );
  writeFileSync(file, source);
}

console.log("added", KEY);
