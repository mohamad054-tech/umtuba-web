import { enMessages } from "./en";
import type { FoundationMessages } from "./types";

/** French: foundation keys localized; App Shell keys inherit English until FR shell pass. */
export const frMessages: FoundationMessages = {
  ...enMessages,
  "languages.ar": "Arabe",
  "languages.en": "Anglais",
  "languages.fr": "Français",
  "languages.es": "Espagnol",
  "languages.de": "Allemand",
  "languages.pt": "Portugais",
  "actions.save": "Enregistrer",
  "actions.cancel": "Annuler",
  "actions.continue": "Continuer",
  "actions.back": "Retour",
  "actions.retry": "Réessayer",
  "actions.close": "Fermer",
  "status.loading": "Chargement…",
  "status.empty": "Rien ici pour le moment.",
  "status.error": "Une erreur s'est produite. Veuillez réessayer.",
  "settings.language": "Langue",
  "settings.languageDescription":
    "Choisissez la langue utilisée sur UMTUBA.",
};
