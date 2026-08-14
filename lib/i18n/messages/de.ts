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
  "landing.joinCta": "UMTUBA beitreten",
  "landing.startExploring": "Entdecken starten",
  "landing.goLive": "Live gehen",
  "auth.login.title": "Willkommen zurück",
  "auth.login.subtitle": "Melde dich an, um bei UMTUBA weiterzumachen.",
  "auth.login.panelTitle": "Deine Welt wartet.",
  "auth.login.panelBody":
    "Weiter zu deinem Profil oder dorthin, wo du aufgehört hast.",
  "auth.login.submit": "Anmelden",
  "auth.login.createOne": "Konto erstellen",
  "auth.signup.title": "Konto erstellen",
  "auth.signup.subtitle":
    "Zwei kurze Schritte — zuerst Zugangsdaten, dann dein Profil.",
  "auth.signup.create": "Konto erstellen",
  "auth.signup.signIn": "Anmelden",
  "auth.shell.panelTitle": "Erstellen. Entdecken. Wachsen.",
  "auth.shell.panelBody":
    "Komm zu UMTUBA für Videos, Live-Entdeckung und Creator weltweit.",
};
