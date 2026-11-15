/**
 * Les 54 pays africains (plus la diaspora). Liste extensible : ajouter une ligne suffit.
 * `timezone` sert de fuseau par défaut à l'inscription.
 */
export type Country = { code: string; name: string; timezone: string };

export const COUNTRIES: Country[] = [
  { code: "ZA", name: "Afrique du Sud", timezone: "Africa/Johannesburg" },
  { code: "DZ", name: "Algérie", timezone: "Africa/Algiers" },
  { code: "AO", name: "Angola", timezone: "Africa/Luanda" },
  { code: "BJ", name: "Bénin", timezone: "Africa/Porto-Novo" },
  { code: "BW", name: "Botswana", timezone: "Africa/Gaborone" },
  { code: "BF", name: "Burkina Faso", timezone: "Africa/Ouagadougou" },
  { code: "BI", name: "Burundi", timezone: "Africa/Bujumbura" },
  { code: "CM", name: "Cameroun", timezone: "Africa/Douala" },
  { code: "CV", name: "Cap-Vert", timezone: "Atlantic/Cape_Verde" },
  { code: "KM", name: "Comores", timezone: "Indian/Comoro" },
  { code: "CG", name: "Congo", timezone: "Africa/Brazzaville" },
  { code: "CI", name: "Côte d'Ivoire", timezone: "Africa/Abidjan" },
  { code: "DJ", name: "Djibouti", timezone: "Africa/Djibouti" },
  { code: "EG", name: "Égypte", timezone: "Africa/Cairo" },
  { code: "ER", name: "Érythrée", timezone: "Africa/Asmara" },
  { code: "SZ", name: "Eswatini", timezone: "Africa/Mbabane" },
  { code: "ET", name: "Éthiopie", timezone: "Africa/Addis_Ababa" },
  { code: "GA", name: "Gabon", timezone: "Africa/Libreville" },
  { code: "GM", name: "Gambie", timezone: "Africa/Banjul" },
  { code: "GH", name: "Ghana", timezone: "Africa/Accra" },
  { code: "GN", name: "Guinée", timezone: "Africa/Conakry" },
  { code: "GW", name: "Guinée-Bissau", timezone: "Africa/Bissau" },
  { code: "GQ", name: "Guinée équatoriale", timezone: "Africa/Malabo" },
  { code: "KE", name: "Kenya", timezone: "Africa/Nairobi" },
  { code: "LS", name: "Lesotho", timezone: "Africa/Maseru" },
  { code: "LR", name: "Liberia", timezone: "Africa/Monrovia" },
  { code: "LY", name: "Libye", timezone: "Africa/Tripoli" },
  { code: "MG", name: "Madagascar", timezone: "Indian/Antananarivo" },
  { code: "MW", name: "Malawi", timezone: "Africa/Blantyre" },
  { code: "ML", name: "Mali", timezone: "Africa/Bamako" },
  { code: "MA", name: "Maroc", timezone: "Africa/Casablanca" },
  { code: "MU", name: "Maurice", timezone: "Indian/Mauritius" },
  { code: "MR", name: "Mauritanie", timezone: "Africa/Nouakchott" },
  { code: "MZ", name: "Mozambique", timezone: "Africa/Maputo" },
  { code: "NA", name: "Namibie", timezone: "Africa/Windhoek" },
  { code: "NE", name: "Niger", timezone: "Africa/Niamey" },
  { code: "NG", name: "Nigeria", timezone: "Africa/Lagos" },
  { code: "UG", name: "Ouganda", timezone: "Africa/Kampala" },
  { code: "CD", name: "RD Congo", timezone: "Africa/Kinshasa" },
  { code: "CF", name: "République centrafricaine", timezone: "Africa/Bangui" },
  { code: "RW", name: "Rwanda", timezone: "Africa/Kigali" },
  { code: "ST", name: "Sao Tomé-et-Principe", timezone: "Africa/Sao_Tome" },
  { code: "SN", name: "Sénégal", timezone: "Africa/Dakar" },
  { code: "SC", name: "Seychelles", timezone: "Indian/Mahe" },
  { code: "SL", name: "Sierra Leone", timezone: "Africa/Freetown" },
  { code: "SO", name: "Somalie", timezone: "Africa/Mogadishu" },
  { code: "SD", name: "Soudan", timezone: "Africa/Khartoum" },
  { code: "SS", name: "Soudan du Sud", timezone: "Africa/Juba" },
  { code: "TZ", name: "Tanzanie", timezone: "Africa/Dar_es_Salaam" },
  { code: "TD", name: "Tchad", timezone: "Africa/Ndjamena" },
  { code: "TG", name: "Togo", timezone: "Africa/Lome" },
  { code: "TN", name: "Tunisie", timezone: "Africa/Tunis" },
  { code: "ZM", name: "Zambie", timezone: "Africa/Lusaka" },
  { code: "ZW", name: "Zimbabwe", timezone: "Africa/Harare" },
  { code: "ZZ", name: "Diaspora (hors d'Afrique)", timezone: "UTC" },
];

const BY_CODE = new Map(COUNTRIES.map((country) => [country.code, country]));

export function countryName(code: string | null | undefined): string | null {
  if (!code) return null;
  return BY_CODE.get(code)?.name ?? code;
}

export function countryTimezone(code: string | null | undefined): string {
  return (code && BY_CODE.get(code)?.timezone) || "UTC";
}

export const COUNTRY_CODES = COUNTRIES.map((country) => country.code);

/** Fuseaux proposés dans les réglages (dédoublonnés). */
export const TIMEZONES: string[] = Array.from(
  new Set(["UTC", ...COUNTRIES.map((country) => country.timezone), "Europe/Paris", "Europe/London", "America/New_York", "America/Montreal"]),
).sort();

/** Langues de travail proposées. Liste extensible. */
export const LANGUAGES: { code: string; name: string }[] = [
  { code: "fr", name: "Français" },
  { code: "en", name: "Anglais" },
  { code: "ar", name: "Arabe" },
  { code: "pt", name: "Portugais" },
  { code: "es", name: "Espagnol" },
  { code: "sw", name: "Swahili" },
  { code: "ha", name: "Haoussa" },
  { code: "yo", name: "Yoruba" },
  { code: "ig", name: "Igbo" },
  { code: "am", name: "Amharique" },
  { code: "wo", name: "Wolof" },
  { code: "ff", name: "Peul" },
  { code: "bm", name: "Bambara" },
  { code: "ln", name: "Lingala" },
  { code: "zu", name: "Zoulou" },
  { code: "xh", name: "Xhosa" },
  { code: "af", name: "Afrikaans" },
  { code: "so", name: "Somali" },
  { code: "rw", name: "Kinyarwanda" },
  { code: "mg", name: "Malgache" },
  { code: "ee", name: "Éwé" },
  { code: "tw", name: "Twi" },
  { code: "sn", name: "Shona" },
  { code: "om", name: "Oromo" },
  { code: "ti", name: "Tigrigna" },
  { code: "kg", name: "Kikongo" },
  { code: "zgh", name: "Amazigh" },
];

const LANGUAGE_BY_CODE = new Map(LANGUAGES.map((language) => [language.code, language.name]));

export function languageName(code: string): string {
  return LANGUAGE_BY_CODE.get(code) ?? code.toUpperCase();
}

export const LANGUAGE_CODES = LANGUAGES.map((language) => language.code);
