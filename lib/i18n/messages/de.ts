import { enMessages } from "./en";
import type { FoundationMessages } from "./types";

/** German: foundation keys localized; App Shell keys inherit English until DE shell pass. */
export const deMessages: FoundationMessages = {
  ...enMessages,
  "languages.ar": "Arabisch",
  "languages.en": "Englisch",
  "languages.fr": "Französisch",
  "languages.es": "Spanisch",
  "languages.de": "Deutsch",
  "languages.pt": "Portugiesisch",
  "actions.save": "Speichern",
  "actions.cancel": "Abbrechen",
  "actions.continue": "Weiter",
  "actions.back": "Zurück",
  "actions.retry": "Erneut versuchen",
  "actions.close": "Schließen",
  "status.loading": "Wird geladen…",
  "status.empty": "Hier ist noch nichts.",
  "status.error": "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
  "settings.language": "Sprache",
  "settings.languageDescription":
    "Wähle die Sprache, die in UMTUBA verwendet wird.",
};
