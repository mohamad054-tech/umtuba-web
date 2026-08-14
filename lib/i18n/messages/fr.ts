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
  "landing.joinCta": "Rejoindre UMTUBA",
  "landing.startExploring": "Commencer à explorer",
  "landing.goLive": "Passer en direct",
  "auth.login.title": "Bon retour",
  "auth.login.subtitle": "Connectez-vous pour continuer sur UMTUBA.",
  "auth.login.panelTitle": "Votre monde vous attend.",
  "auth.login.panelBody":
    "Continuez vers votre profil, ou là où vous vous étiez arrêté.",
  "auth.login.submit": "Se connecter",
  "auth.login.createOne": "Créer un compte",
  "auth.signup.title": "Créer un compte",
  "auth.signup.subtitle":
    "Deux étapes rapides — identifiants d’abord, puis votre profil.",
  "auth.signup.create": "Créer un compte",
  "auth.signup.signIn": "Se connecter",
  "auth.shell.panelTitle": "Créer. Découvrir. Grandir.",
  "auth.shell.panelBody":
    "Rejoignez UMTUBA pour des vidéos, la découverte en direct et des créateurs du monde entier.",
};
