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
  "world.eyebrow": "UMTUBA World",
  "world.navTitle": "Découverte du monde",
  "world.navSubtitleLive": "Lieux et destinations",
  "world.navSubtitleHold": "Pas encore en ligne",
  "world.titleLive": "Explorez une destination à votre façon",
  "world.titleHold": "La découverte du monde est en pause",
  "world.introLive":
    "Découvrez des commerces, restaurants, hôtels, cafés et services locaux publics approuvés. Le GPS vient de votre appareil et reste optionnel ; UMTUBA ne stocke pas votre position précise ici.",
  "world.hold.migrations":
    "Les migrations de la base World Discovery ne sont pas encore disponibles dans cet environnement.",
  "world.hold.flagOff":
    "World Discovery est prêt mais désactivé en attendant l’approbation de la plateforme.",
  "world.preparing": "Préparation de World Discovery…",
  "world.requestedDestination":
    "Destination demandée : {city}. Les contrôles d’exploration restent masqués jusqu’à ce que les données World soient disponibles.",
  "world.location.holdNoPermission":
    "Aucune permission de localisation n’est demandée tant que la découverte est indisponible.",
  "world.backHome": "Retour à l’accueil",
  "world.chooseWhere": "Choisissez où explorer",
  "world.chooseWhereHelp":
    "La localisation de l’appareil est optionnelle. La découverte manuelle par pays/ville reste disponible lorsque World Discovery est activé.",
  "world.destination": "Destination",
  "world.category": "Catégorie",
  "world.allCategories": "Toutes les catégories",
  "world.radiusKm": "Rayon : {radius} km",
  "world.exploreDestination": "Explorer la destination",
  "world.searching": "Recherche…",
  "world.useLocationOnce": "Utiliser ma position une fois",
  "world.openCity": "Ouvrir le profil de la ville",
  "world.searchWorld": "Rechercher dans le monde",
  "world.location.notRequested": "La localisation n’a pas été demandée.",
  "world.location.granted":
    "Localisation unique accordée. Elle n’est pas stockée.",
  "world.location.denied":
    "Localisation refusée. Choisissez une destination à la place.",
  "world.location.unavailable":
    "Localisation indisponible. Choisissez une destination à la place.",
  "world.location.destinationOnly":
    "Découverte par destination uniquement — aucune localisation de l’appareil.",
  "world.location.noTracking": "Aucun suivi continu n’est utilisé.",
  "world.empty.destination":
    "Aucun lieu public approuvé ne correspond à cette destination.",
  "world.empty.nearby": "Aucun lieu public approuvé à proximité.",
  "world.empty.cities": "Aucune destination sélectionnée pour le moment",
  "world.empty.unknownDestination":
    "Cette destination n’est pas encore dans le catalogue World : {city}. Choisissez une ville listée, ou parcourez sans destination prédéfinie.",
  "world.verified": "vérifié",
  "world.helloCity": "Hello City",
  "world.helloCityHelp":
    "La publication est explicite, modérée et limitée à la ville.",
  "world.search.navTitle": "Recherche World",
  "world.search.navSubtitleLive": "Villes, lieux et catégories",
  "world.search.navSubtitleHold": "Pas encore en ligne",
  "world.search.titleLive": "Rechercher dans le domaine World",
  "world.search.titleHold": "La recherche World est en pause",
  "world.search.introLive":
    "Recherche en base de données parmi les villes, lieux, commerces, attractions, hôtels, restaurants et catégories publics approuvés.",
  "world.search.hold.migrations":
    "Les migrations de la base World Search ne sont pas encore disponibles dans cet environnement.",
  "world.search.hold.flagOff":
    "World Search est prêt mais désactivé en attendant l’approbation de la plateforme.",
  "world.search.loading": "Chargement de la recherche…",
  "world.search.placeholder": "Ville, lieu, hôtel, restaurant…",
  "world.search.type": "Type",
  "world.search.everything": "Tout",
  "world.search.city": "Ville",
  "world.search.allCities": "Toutes les villes",
  "world.search.empty": "Aucun résultat World correspondant.",
  "world.error.unavailable": "World Discovery n’est pas encore disponible.",
  "world.error.invalidDestination": "Choisissez une destination valide.",
  "world.error.loadPlaces": "Impossible de charger les lieux.",
  "world.error.searchFailed": "La recherche World n’a pas pu aboutir.",
  "world.error.coordsTogether":
    "Les coordonnées de localisation doivent être fournies ensemble.",
  "world.error.coordsInvalid": "Les coordonnées de localisation sont invalides.",
  "world.error.chooseDestination":
    "Choisissez une destination ou partagez une localisation unique.",
  "world.error.invalidCategory": "La catégorie de lieu est invalide.",
  "world.error.searchLength":
    "La recherche doit contenir entre 2 et 80 caractères.",
  "world.error.searchType": "Le type de recherche est invalide.",
  "world.error.searchFilter": "Le filtre de recherche est invalide.",
  "world.city.unavailableTitle": "Le profil de la ville n’est pas encore disponible",
  "world.city.unavailableBody": "Cette ville est en cours de préparation.",
  "world.city.overviewPending": "Une présentation vérifiée de la ville est en cours de préparation.",
  "world.city.placesEmpty": "Aucun lieu public approuvé pour le moment.",
  "world.place.unavailableTitle": "Le profil du lieu n’est pas encore disponible",
  "world.place.unavailableBody": "Ce lieu est en cours de préparation.",
  "world.backToWorld": "Retour à World",
  "nav.following": "Abonnements",
  "menu.following": "Abonnements",
  "following.title": "Abonnements",
  "following.subtitle": "Publications des créateurs que vous suivez",
  "following.loading": "Ouverture des abonnements…",
  "following.emptyTitle": "Aucune publication des personnes que vous suivez",
  "following.emptyDescription":
    "Suivez des créateurs pour voir leurs dernières vidéos ici, les plus récentes d’abord.",
  "following.emptyNoPosts":
    "Les créateurs que vous suivez n’ont pas encore publié de vidéo prête.",
  "following.emptyCta": "Trouver des créateurs sur l’accueil",
  "following.errorTitle": "Impossible de charger les abonnements",
  "learning.lesson.unavailableTitle": "Leçon indisponible",
  "learning.lesson.unavailableBody":
    "Cette leçon n’est pas disponible. Elle peut être non publiée, supprimée ou nécessiter une inscription.",
  "learning.lesson.errorTitle": "Impossible de charger la leçon",
  "learning.lesson.errorBody":
    "Learning n’a pas pu ouvrir cette leçon pour le moment. Réessayez ou revenez au cours.",
  "learning.lesson.returnToCourse": "Retour au cours",
  "learning.lesson.returnToLearning": "Retour à Learning",
  "learning.lesson.returnToCatalog": "Retour au catalogue Learning",
};
