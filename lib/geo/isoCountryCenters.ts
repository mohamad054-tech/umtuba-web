/**
 * Static ISO 3166-1 alpha-2 → display name + approximate capital/centroid.
 * Local lookup only. No network. Coordinates are country-scale, never a street.
 */

export type IsoCountryCenter = {
  name: string;
  lat: number;
  lng: number;
};

export const ISO_COUNTRY_CENTERS: Record<string, IsoCountryCenter> = {
  AD: { name: "Andorra", lat: 42.51, lng: 1.52 },
  AE: { name: "United Arab Emirates", lat: 24.45, lng: 54.38 },
  AF: { name: "Afghanistan", lat: 34.53, lng: 69.17 },
  AG: { name: "Antigua and Barbuda", lat: 17.12, lng: -61.85 },
  AI: { name: "Anguilla", lat: 18.22, lng: -63.06 },
  AL: { name: "Albania", lat: 41.33, lng: 19.82 },
  AM: { name: "Armenia", lat: 40.18, lng: 44.51 },
  AO: { name: "Angola", lat: -8.84, lng: 13.23 },
  AQ: { name: "Antarctica", lat: -77.85, lng: 166.67 },
  AR: { name: "Argentina", lat: -34.6, lng: -58.38 },
  AS: { name: "American Samoa", lat: -14.28, lng: -170.7 },
  AT: { name: "Austria", lat: 48.21, lng: 16.37 },
  AU: { name: "Australia", lat: -35.28, lng: 149.13 },
  AW: { name: "Aruba", lat: 12.52, lng: -70.03 },
  AX: { name: "Åland Islands", lat: 60.1, lng: 19.93 },
  AZ: { name: "Azerbaijan", lat: 40.41, lng: 49.87 },
  BA: { name: "Bosnia and Herzegovina", lat: 43.86, lng: 18.41 },
  BB: { name: "Barbados", lat: 13.1, lng: -59.62 },
  BD: { name: "Bangladesh", lat: 23.81, lng: 90.41 },
  BE: { name: "Belgium", lat: 50.85, lng: 4.35 },
  BF: { name: "Burkina Faso", lat: 12.37, lng: -1.52 },
  BG: { name: "Bulgaria", lat: 42.7, lng: 23.32 },
  BH: { name: "Bahrain", lat: 26.23, lng: 50.59 },
  BI: { name: "Burundi", lat: -3.38, lng: 29.36 },
  BJ: { name: "Benin", lat: 6.5, lng: 2.63 },
  BL: { name: "Saint Barthélemy", lat: 17.9, lng: -62.85 },
  BM: { name: "Bermuda", lat: 32.29, lng: -64.78 },
  BN: { name: "Brunei", lat: 4.89, lng: 114.94 },
  BO: { name: "Bolivia", lat: -16.5, lng: -68.15 },
  BQ: { name: "Caribbean Netherlands", lat: 12.18, lng: -68.26 },
  BR: { name: "Brazil", lat: -15.79, lng: -47.88 },
  BS: { name: "Bahamas", lat: 25.05, lng: -77.36 },
  BT: { name: "Bhutan", lat: 27.47, lng: 89.64 },
  BV: { name: "Bouvet Island", lat: -54.42, lng: 3.35 },
  BW: { name: "Botswana", lat: -24.65, lng: 25.91 },
  BY: { name: "Belarus", lat: 53.9, lng: 27.57 },
  BZ: { name: "Belize", lat: 17.25, lng: -88.77 },
  CA: { name: "Canada", lat: 45.42, lng: -75.7 },
  CC: { name: "Cocos Islands", lat: -12.17, lng: 96.83 },
  CD: { name: "Democratic Republic of the Congo", lat: -4.32, lng: 15.31 },
  CF: { name: "Central African Republic", lat: 4.39, lng: 18.56 },
  CG: { name: "Republic of the Congo", lat: -4.27, lng: 15.28 },
  CH: { name: "Switzerland", lat: 46.95, lng: 7.44 },
  CI: { name: "Côte d'Ivoire", lat: 6.83, lng: -5.28 },
  CK: { name: "Cook Islands", lat: -21.21, lng: -159.78 },
  CL: { name: "Chile", lat: -33.45, lng: -70.67 },
  CM: { name: "Cameroon", lat: 3.87, lng: 11.52 },
  CN: { name: "China", lat: 39.9, lng: 116.4 },
  CO: { name: "Colombia", lat: 4.71, lng: -74.07 },
  CR: { name: "Costa Rica", lat: 9.93, lng: -84.09 },
  CU: { name: "Cuba", lat: 23.11, lng: -82.37 },
  CV: { name: "Cabo Verde", lat: 14.92, lng: -23.51 },
  CW: { name: "Curaçao", lat: 12.12, lng: -68.93 },
  CX: { name: "Christmas Island", lat: -10.49, lng: 105.63 },
  CY: { name: "Cyprus", lat: 35.17, lng: 33.37 },
  CZ: { name: "Czechia", lat: 50.08, lng: 14.44 },
  DE: { name: "Germany", lat: 52.52, lng: 13.41 },
  DJ: { name: "Djibouti", lat: 11.59, lng: 43.15 },
  DK: { name: "Denmark", lat: 55.68, lng: 12.57 },
  DM: { name: "Dominica", lat: 15.3, lng: -61.39 },
  DO: { name: "Dominican Republic", lat: 18.49, lng: -69.93 },
  DZ: { name: "Algeria", lat: 36.75, lng: 3.06 },
  EC: { name: "Ecuador", lat: -0.18, lng: -78.47 },
  EE: { name: "Estonia", lat: 59.44, lng: 24.75 },
  EG: { name: "Egypt", lat: 30.04, lng: 31.24 },
  EH: { name: "Western Sahara", lat: 27.15, lng: -13.2 },
  ER: { name: "Eritrea", lat: 15.32, lng: 38.93 },
  ES: { name: "Spain", lat: 40.42, lng: -3.7 },
  ET: { name: "Ethiopia", lat: 9.03, lng: 38.74 },
  FI: { name: "Finland", lat: 60.17, lng: 24.94 },
  FJ: { name: "Fiji", lat: -18.14, lng: 178.44 },
  FK: { name: "Falkland Islands", lat: -51.7, lng: -57.85 },
  FM: { name: "Micronesia", lat: 6.92, lng: 158.16 },
  FO: { name: "Faroe Islands", lat: 62.01, lng: -6.77 },
  FR: { name: "France", lat: 48.86, lng: 2.35 },
  GA: { name: "Gabon", lat: 0.39, lng: 9.45 },
  GB: { name: "United Kingdom", lat: 51.51, lng: -0.13 },
  GD: { name: "Grenada", lat: 12.06, lng: -61.75 },
  GE: { name: "Georgia", lat: 41.72, lng: 44.79 },
  GF: { name: "French Guiana", lat: 4.94, lng: -52.33 },
  GG: { name: "Guernsey", lat: 49.45, lng: -2.54 },
  GH: { name: "Ghana", lat: 5.56, lng: -0.2 },
  GI: { name: "Gibraltar", lat: 36.14, lng: -5.35 },
  GL: { name: "Greenland", lat: 64.18, lng: -51.72 },
  GM: { name: "Gambia", lat: 13.45, lng: -16.58 },
  GN: { name: "Guinea", lat: 9.51, lng: -13.71 },
  GP: { name: "Guadeloupe", lat: 16.0, lng: -61.73 },
  GQ: { name: "Equatorial Guinea", lat: 3.75, lng: 8.78 },
  GR: { name: "Greece", lat: 37.98, lng: 23.73 },
  GS: { name: "South Georgia", lat: -54.28, lng: -36.51 },
  GT: { name: "Guatemala", lat: 14.63, lng: -90.51 },
  GU: { name: "Guam", lat: 13.48, lng: 144.75 },
  GW: { name: "Guinea-Bissau", lat: 11.86, lng: -15.6 },
  GY: { name: "Guyana", lat: 6.8, lng: -58.16 },
  HK: { name: "Hong Kong", lat: 22.32, lng: 114.17 },
  HM: { name: "Heard Island", lat: -53.1, lng: 73.52 },
  HN: { name: "Honduras", lat: 14.07, lng: -87.22 },
  HR: { name: "Croatia", lat: 45.81, lng: 15.98 },
  HT: { name: "Haiti", lat: 18.54, lng: -72.34 },
  HU: { name: "Hungary", lat: 47.5, lng: 19.04 },
  ID: { name: "Indonesia", lat: -6.21, lng: 106.85 },
  IE: { name: "Ireland", lat: 53.35, lng: -6.26 },
  IL: { name: "Israel", lat: 31.77, lng: 35.22 },
  IM: { name: "Isle of Man", lat: 54.15, lng: -4.48 },
  IN: { name: "India", lat: 28.61, lng: 77.21 },
  IO: { name: "British Indian Ocean Territory", lat: -7.32, lng: 72.42 },
  IQ: { name: "Iraq", lat: 33.32, lng: 44.37 },
  IR: { name: "Iran", lat: 35.69, lng: 51.39 },
  IS: { name: "Iceland", lat: 64.15, lng: -21.94 },
  IT: { name: "Italy", lat: 41.9, lng: 12.5 },
  JE: { name: "Jersey", lat: 49.19, lng: -2.11 },
  JM: { name: "Jamaica", lat: 18.02, lng: -76.81 },
  JO: { name: "Jordan", lat: 31.95, lng: 35.93 },
  JP: { name: "Japan", lat: 35.68, lng: 139.65 },
  KE: { name: "Kenya", lat: -1.29, lng: 36.82 },
  KG: { name: "Kyrgyzstan", lat: 42.87, lng: 74.57 },
  KH: { name: "Cambodia", lat: 11.56, lng: 104.92 },
  KI: { name: "Kiribati", lat: 1.33, lng: 172.98 },
  KM: { name: "Comoros", lat: -11.7, lng: 43.26 },
  KN: { name: "Saint Kitts and Nevis", lat: 17.3, lng: -62.72 },
  KP: { name: "North Korea", lat: 39.04, lng: 125.75 },
  KR: { name: "South Korea", lat: 37.57, lng: 126.98 },
  KW: { name: "Kuwait", lat: 29.38, lng: 47.99 },
  KY: { name: "Cayman Islands", lat: 19.29, lng: -81.37 },
  KZ: { name: "Kazakhstan", lat: 51.17, lng: 71.43 },
  LA: { name: "Laos", lat: 17.98, lng: 102.63 },
  LB: { name: "Lebanon", lat: 33.89, lng: 35.5 },
  LC: { name: "Saint Lucia", lat: 14.01, lng: -60.99 },
  LI: { name: "Liechtenstein", lat: 47.14, lng: 9.52 },
  LK: { name: "Sri Lanka", lat: 6.93, lng: 79.85 },
  LR: { name: "Liberia", lat: 6.3, lng: -10.8 },
  LS: { name: "Lesotho", lat: -29.32, lng: 27.48 },
  LT: { name: "Lithuania", lat: 54.69, lng: 25.28 },
  LU: { name: "Luxembourg", lat: 49.61, lng: 6.13 },
  LV: { name: "Latvia", lat: 56.95, lng: 24.11 },
  LY: { name: "Libya", lat: 32.89, lng: 13.19 },
  MA: { name: "Morocco", lat: 34.02, lng: -6.84 },
  MC: { name: "Monaco", lat: 43.74, lng: 7.42 },
  MD: { name: "Moldova", lat: 47.01, lng: 28.86 },
  ME: { name: "Montenegro", lat: 42.43, lng: 19.26 },
  MF: { name: "Saint Martin", lat: 18.07, lng: -63.05 },
  MG: { name: "Madagascar", lat: -18.88, lng: 47.51 },
  MH: { name: "Marshall Islands", lat: 7.12, lng: 171.19 },
  MK: { name: "North Macedonia", lat: 41.99, lng: 21.43 },
  ML: { name: "Mali", lat: 12.64, lng: -8.0 },
  MM: { name: "Myanmar", lat: 19.76, lng: 96.08 },
  MN: { name: "Mongolia", lat: 47.89, lng: 106.91 },
  MO: { name: "Macao", lat: 22.2, lng: 113.54 },
  MP: { name: "Northern Mariana Islands", lat: 15.21, lng: 145.75 },
  MQ: { name: "Martinique", lat: 14.6, lng: -61.07 },
  MR: { name: "Mauritania", lat: 18.07, lng: -15.96 },
  MS: { name: "Montserrat", lat: 16.74, lng: -62.19 },
  MT: { name: "Malta", lat: 35.9, lng: 14.51 },
  MU: { name: "Mauritius", lat: -20.16, lng: 57.5 },
  MV: { name: "Maldives", lat: 4.18, lng: 73.51 },
  MW: { name: "Malawi", lat: -13.96, lng: 33.79 },
  MX: { name: "Mexico", lat: 19.43, lng: -99.13 },
  MY: { name: "Malaysia", lat: 3.14, lng: 101.69 },
  MZ: { name: "Mozambique", lat: -25.97, lng: 32.57 },
  NA: { name: "Namibia", lat: -22.57, lng: 17.08 },
  NC: { name: "New Caledonia", lat: -22.28, lng: 166.46 },
  NE: { name: "Niger", lat: 13.51, lng: 2.11 },
  NF: { name: "Norfolk Island", lat: -29.06, lng: 167.96 },
  NG: { name: "Nigeria", lat: 9.08, lng: 7.4 },
  NI: { name: "Nicaragua", lat: 12.11, lng: -86.24 },
  NL: { name: "Netherlands", lat: 52.37, lng: 4.89 },
  NO: { name: "Norway", lat: 59.91, lng: 10.75 },
  NP: { name: "Nepal", lat: 27.72, lng: 85.32 },
  NR: { name: "Nauru", lat: -0.55, lng: 166.92 },
  NU: { name: "Niue", lat: -19.05, lng: -169.92 },
  NZ: { name: "New Zealand", lat: -41.29, lng: 174.78 },
  OM: { name: "Oman", lat: 23.59, lng: 58.38 },
  PA: { name: "Panama", lat: 8.99, lng: -79.52 },
  PE: { name: "Peru", lat: -12.05, lng: -77.04 },
  PF: { name: "French Polynesia", lat: -17.68, lng: -149.43 },
  PG: { name: "Papua New Guinea", lat: -9.44, lng: 147.18 },
  PH: { name: "Philippines", lat: 14.6, lng: 120.98 },
  PK: { name: "Pakistan", lat: 33.68, lng: 73.05 },
  PL: { name: "Poland", lat: 52.23, lng: 21.01 },
  PM: { name: "Saint Pierre and Miquelon", lat: 46.78, lng: -56.18 },
  PN: { name: "Pitcairn", lat: -25.07, lng: -130.1 },
  PR: { name: "Puerto Rico", lat: 18.47, lng: -66.11 },
  PS: { name: "Palestine", lat: 31.9, lng: 35.2 },
  PT: { name: "Portugal", lat: 38.72, lng: -9.14 },
  PW: { name: "Palau", lat: 7.5, lng: 134.62 },
  PY: { name: "Paraguay", lat: -25.26, lng: -57.58 },
  QA: { name: "Qatar", lat: 25.29, lng: 51.53 },
  RE: { name: "Réunion", lat: -20.88, lng: 55.45 },
  RO: { name: "Romania", lat: 44.43, lng: 26.1 },
  RS: { name: "Serbia", lat: 44.82, lng: 20.46 },
  RU: { name: "Russia", lat: 55.76, lng: 37.62 },
  RW: { name: "Rwanda", lat: -1.94, lng: 30.06 },
  SA: { name: "Saudi Arabia", lat: 24.71, lng: 46.68 },
  SB: { name: "Solomon Islands", lat: -9.43, lng: 159.95 },
  SC: { name: "Seychelles", lat: -4.62, lng: 55.45 },
  SD: { name: "Sudan", lat: 15.5, lng: 32.56 },
  SE: { name: "Sweden", lat: 59.33, lng: 18.07 },
  SG: { name: "Singapore", lat: 1.35, lng: 103.82 },
  SH: { name: "Saint Helena", lat: -15.93, lng: -5.72 },
  SI: { name: "Slovenia", lat: 46.05, lng: 14.51 },
  SJ: { name: "Svalbard and Jan Mayen", lat: 78.22, lng: 15.65 },
  SK: { name: "Slovakia", lat: 48.15, lng: 17.11 },
  SL: { name: "Sierra Leone", lat: 8.48, lng: -13.23 },
  SM: { name: "San Marino", lat: 43.94, lng: 12.45 },
  SN: { name: "Senegal", lat: 14.69, lng: -17.45 },
  SO: { name: "Somalia", lat: 2.05, lng: 45.32 },
  SR: { name: "Suriname", lat: 5.85, lng: -55.2 },
  SS: { name: "South Sudan", lat: 4.86, lng: 31.57 },
  ST: { name: "Sao Tome and Principe", lat: 0.34, lng: 6.73 },
  SV: { name: "El Salvador", lat: 13.69, lng: -89.22 },
  SX: { name: "Sint Maarten", lat: 18.04, lng: -63.05 },
  SY: { name: "Syria", lat: 33.51, lng: 36.28 },
  SZ: { name: "Eswatini", lat: -26.32, lng: 31.14 },
  TC: { name: "Turks and Caicos Islands", lat: 21.47, lng: -71.14 },
  TD: { name: "Chad", lat: 12.13, lng: 15.05 },
  TF: { name: "French Southern Territories", lat: -49.35, lng: 70.22 },
  TG: { name: "Togo", lat: 6.17, lng: 1.23 },
  TH: { name: "Thailand", lat: 13.76, lng: 100.5 },
  TJ: { name: "Tajikistan", lat: 38.56, lng: 68.77 },
  TK: { name: "Tokelau", lat: -9.2, lng: -171.85 },
  TL: { name: "Timor-Leste", lat: -8.56, lng: 125.57 },
  TM: { name: "Turkmenistan", lat: 37.95, lng: 58.38 },
  TN: { name: "Tunisia", lat: 36.81, lng: 10.18 },
  TO: { name: "Tonga", lat: -21.13, lng: -175.2 },
  TR: { name: "Turkey", lat: 39.93, lng: 32.86 },
  TT: { name: "Trinidad and Tobago", lat: 10.69, lng: -61.53 },
  TV: { name: "Tuvalu", lat: -8.52, lng: 179.2 },
  TW: { name: "Taiwan", lat: 25.03, lng: 121.57 },
  TZ: { name: "Tanzania", lat: -6.16, lng: 35.75 },
  UA: { name: "Ukraine", lat: 50.45, lng: 30.52 },
  UG: { name: "Uganda", lat: 0.35, lng: 32.58 },
  UM: { name: "U.S. Outlying Islands", lat: 19.28, lng: 166.65 },
  US: { name: "United States", lat: 38.91, lng: -77.04 },
  UY: { name: "Uruguay", lat: -34.9, lng: -56.19 },
  UZ: { name: "Uzbekistan", lat: 41.3, lng: 69.24 },
  VA: { name: "Vatican City", lat: 41.9, lng: 12.45 },
  VC: { name: "Saint Vincent and the Grenadines", lat: 13.16, lng: -61.23 },
  VE: { name: "Venezuela", lat: 10.48, lng: -66.9 },
  VG: { name: "British Virgin Islands", lat: 18.42, lng: -64.62 },
  VI: { name: "U.S. Virgin Islands", lat: 18.34, lng: -64.93 },
  VN: { name: "Vietnam", lat: 21.03, lng: 105.85 },
  VU: { name: "Vanuatu", lat: -17.73, lng: 168.33 },
  WF: { name: "Wallis and Futuna", lat: -13.28, lng: -176.17 },
  WS: { name: "Samoa", lat: -13.83, lng: -171.77 },
  YE: { name: "Yemen", lat: 15.35, lng: 44.21 },
  YT: { name: "Mayotte", lat: -12.78, lng: 45.23 },
  ZA: { name: "South Africa", lat: -25.75, lng: 28.19 },
  ZM: { name: "Zambia", lat: -15.42, lng: 28.28 },
  ZW: { name: "Zimbabwe", lat: -17.83, lng: 31.05 },
};

export type GlobeReachCountry = {
  countryCode: string;
  viewCount: number;
  isTrending?: boolean;
};

export type ResolvedGlobeReachMarker = {
  countryCode: string;
  displayName: string;
  lat: number;
  lng: number;
  viewCount: number;
  isTrending: boolean;
  radius: number;
};

const MIN_MARKER_RADIUS = 0.028;
const MAX_MARKER_RADIUS = 0.09;

export function normalizeIsoCountryCode(
  value: string | null | undefined
): string | null {
  const code = (value ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

/** Known ISO-2 codes from the static table (unsorted). */
export function listIsoCountryCodes(): string[] {
  return Object.keys(ISO_COUNTRY_CENTERS);
}

export function isoCountryDisplayName(code: string | null | undefined): string {
  const normalized = normalizeIsoCountryCode(code);
  if (!normalized) return "";
  return ISO_COUNTRY_CENTERS[normalized]?.name ?? normalized;
}

export function isoCountryCenter(
  code: string | null | undefined
): IsoCountryCenter | null {
  const normalized = normalizeIsoCountryCode(code);
  if (!normalized) return null;
  return ISO_COUNTRY_CENTERS[normalized] ?? null;
}

export function markerRadiusForViewCount(
  viewCount: number,
  maxViewCount: number
): number {
  const views = Math.max(0, viewCount);
  const max = Math.max(views, maxViewCount, 1);
  const t = Math.log1p(views) / Math.log1p(max);
  return MIN_MARKER_RADIUS + (MAX_MARKER_RADIUS - MIN_MARKER_RADIUS) * t;
}

/** Map RPC countries onto globe markers. Unknown ISO codes are omitted (no invented coords). */
export function resolveGlobeReachMarkers(
  countries: readonly GlobeReachCountry[]
): ResolvedGlobeReachMarker[] {
  const maxViewCount = countries.reduce(
    (max, country) => Math.max(max, country.viewCount),
    0
  );

  const markers: ResolvedGlobeReachMarker[] = [];
  for (const country of countries) {
    const code = normalizeIsoCountryCode(country.countryCode);
    if (!code) continue;
    const center = ISO_COUNTRY_CENTERS[code];
    if (!center) continue;
    markers.push({
      countryCode: code,
      displayName: center.name,
      lat: center.lat,
      lng: center.lng,
      viewCount: Math.max(0, country.viewCount),
      isTrending: Boolean(country.isTrending),
      radius: markerRadiusForViewCount(country.viewCount, maxViewCount),
    });
  }
  return markers;
}
