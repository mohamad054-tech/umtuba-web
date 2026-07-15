/** Approximate geo only — never lat/lng. ISO country code → display name. */

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  DE: "Germany",
  FR: "France",
  TR: "Turkey",
  PS: "Palestine",
  JO: "Jordan",
  EG: "Egypt",
  SA: "Saudi Arabia",
  AE: "United Arab Emirates",
  IL: "Israel",
  CA: "Canada",
  AU: "Australia",
  BR: "Brazil",
  IN: "India",
  JP: "Japan",
  KR: "South Korea",
  CN: "China",
  NL: "Netherlands",
  ES: "Spain",
  IT: "Italy",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  PL: "Poland",
  UA: "Ukraine",
  RU: "Russia",
  MX: "Mexico",
  NG: "Nigeria",
  KE: "Kenya",
  ZA: "South Africa",
  MA: "Morocco",
  PK: "Pakistan",
  BD: "Bangladesh",
  ID: "Indonesia",
  MY: "Malaysia",
  SG: "Singapore",
  PH: "Philippines",
  TH: "Thailand",
  VN: "Vietnam",
};

export type ApproximateGeo = {
  countryCode: string | null;
  countryName: string | null;
  city: string | null;
};

export function normalizeCountryCode(value: string | null | undefined): string | null {
  const code = (value ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

export function countryNameFromCode(code: string | null | undefined): string | null {
  const normalized = normalizeCountryCode(code);
  if (!normalized) return null;
  return COUNTRY_NAMES[normalized] ?? normalized;
}

/** Reject strings that look like coordinate pairs. */
export function sanitizeApproximateCity(value: string | null | undefined): string | null {
  const city = (value ?? "").trim();
  if (!city || city.length > 120) return null;
  if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?/.test(city)) return null;
  return city;
}

export function buildApproximateGeo(input: {
  countryCode?: string | null;
  countryName?: string | null;
  city?: string | null;
}): ApproximateGeo {
  const countryCode = normalizeCountryCode(input.countryCode);
  const countryName =
    (input.countryName && input.countryName.trim()) ||
    countryNameFromCode(countryCode);
  return {
    countryCode,
    countryName: countryCode ? countryName : null,
    city: sanitizeApproximateCity(input.city),
  };
}
