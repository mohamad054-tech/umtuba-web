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
  "world.eyebrow": "UMTUBA World",
  "world.navTitle": "World-Entdeckung",
  "world.navSubtitleLive": "Orte und Reiseziele",
  "world.navSubtitleHold": "Noch nicht live",
  "world.titleLive": "Entdecke ein Ziel auf deine Weise",
  "world.titleHold": "World-Entdeckung ist pausiert",
  "world.introLive":
    "Entdecke genehmigte öffentliche Geschäfte, Restaurants, Hotels, Cafés und lokale Dienste. GPS kommt von deinem Gerät und ist immer optional; UMTUBA speichert hier keinen genauen Standort.",
  "world.hold.migrations":
    "World-Discovery-Datenbankmigrationen sind in dieser Umgebung noch nicht verfügbar.",
  "world.hold.flagOff":
    "World Discovery ist vorbereitet, aber bis zur Plattformfreigabe deaktiviert.",
  "world.preparing": "World Discovery wird vorbereitet…",
  "world.requestedDestination":
    "Angefragtes Ziel: {city}. Die Stadt-Explorer-Steuerung bleibt ausgeblendet, bis World-Daten verfügbar sind.",
  "world.location.holdNoPermission":
    "Solange Discovery nicht verfügbar ist, wird keine Standortberechtigung angefragt.",
  "world.backHome": "Zurück zur Startseite",
  "world.chooseWhere": "Wähle, wo du entdecken möchtest",
  "world.chooseWhereHelp":
    "Der Gerätestandort ist optional. Die manuelle Entdeckung nach Land/Stadt bleibt verfügbar, wenn World Discovery aktiviert ist.",
  "world.destination": "Ziel",
  "world.category": "Kategorie",
  "world.allCategories": "Alle Kategorien",
  "world.radiusKm": "Radius: {radius} km",
  "world.exploreDestination": "Ziel erkunden",
  "world.searching": "Suche…",
  "world.useLocationOnce": "Meinen Standort einmal verwenden",
  "world.openCity": "Stadtprofil öffnen",
  "world.searchWorld": "World durchsuchen",
  "world.location.notRequested": "Der Standort wurde nicht angefragt.",
  "world.location.granted":
    "Einmaliger Standort gewährt. Er wird nicht gespeichert.",
  "world.location.denied":
    "Standort abgelehnt. Wähle stattdessen ein Ziel.",
  "world.location.unavailable":
    "Standort nicht verfügbar. Wähle stattdessen ein Ziel.",
  "world.location.destinationOnly":
    "Nur Ziel-Entdeckung — kein Gerätestandort verwendet.",
  "world.location.noTracking": "Es wird kein fortlaufendes Tracking verwendet.",
  "world.empty.destination":
    "Keine genehmigten öffentlichen Orte passen zu diesem Ziel.",
  "world.empty.nearby": "Keine genehmigten öffentlichen Orte in der Nähe.",
  "world.empty.cities": "Noch keine kuratierten Ziele",
  "world.verified": "verifiziert",
  "world.helloCity": "Hello City",
  "world.helloCityHelp":
    "Das Veröffentlichen ist ausdrücklich, moderiert und nur auf Stadt-Ebene.",
  "world.search.navTitle": "World-Suche",
  "world.search.navSubtitleLive": "Städte, Orte und Kategorien",
  "world.search.navSubtitleHold": "Noch nicht live",
  "world.search.titleLive": "Den World-Bereich durchsuchen",
  "world.search.titleHold": "Die World-Suche ist pausiert",
  "world.search.introLive":
    "Datenbankgestützte Suche über genehmigte öffentliche Städte, Orte, Unternehmen, Attraktionen, Hotels, Restaurants und Kategorien.",
  "world.search.hold.migrations":
    "World-Search-Datenbankmigrationen sind in dieser Umgebung noch nicht verfügbar.",
  "world.search.hold.flagOff":
    "World Search ist vorbereitet, aber bis zur Plattformfreigabe deaktiviert.",
  "world.search.loading": "Suche wird geladen…",
  "world.search.placeholder": "Stadt, Ort, Hotel, Restaurant…",
  "world.search.type": "Typ",
  "world.search.everything": "Alles",
  "world.search.city": "Stadt",
  "world.search.allCities": "Alle Städte",
  "world.search.empty": "Keine passenden World-Ergebnisse.",
  "world.error.unavailable": "World Discovery ist noch nicht verfügbar.",
  "world.error.invalidDestination": "Wähle ein gültiges Ziel.",
  "world.error.loadPlaces": "Orte konnten nicht geladen werden.",
  "world.error.searchFailed": "Die World-Suche konnte nicht abgeschlossen werden.",
  "world.error.coordsTogether":
    "Standortkoordinaten müssen zusammen angegeben werden.",
  "world.error.coordsInvalid": "Standortkoordinaten sind ungültig.",
  "world.error.chooseDestination":
    "Wähle ein Ziel oder teile einmalig den Standort.",
  "world.error.invalidCategory": "Die Orts-Kategorie ist ungültig.",
  "world.error.searchLength": "Die Suche muss 2 bis 80 Zeichen enthalten.",
  "world.error.searchType": "Der Suchtyp ist ungültig.",
  "world.error.searchFilter": "Der Suchfilter ist ungültig.",
  "world.city.unavailableTitle": "Das Stadtprofil ist noch nicht verfügbar",
  "world.city.unavailableBody": "Diese Stadt wird vorbereitet.",
  "world.place.unavailableTitle": "Das Ortsprofil ist noch nicht verfügbar",
  "world.place.unavailableBody": "Dieser Ort wird vorbereitet.",
  "world.backToWorld": "Zurück zu World",
};
