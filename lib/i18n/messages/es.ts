import { enMessages } from "./en";
import type { FoundationMessages } from "./types";

/** Spanish: foundation keys localized; App Shell keys inherit English until ES shell pass. */
export const esMessages: FoundationMessages = {
  ...enMessages,
  "languages.ar": "Árabe",
  "languages.en": "Inglés",
  "languages.fr": "Francés",
  "languages.es": "Español",
  "languages.de": "Alemán",
  "languages.pt": "Portugués",
  "actions.save": "Guardar",
  "actions.cancel": "Cancelar",
  "actions.continue": "Continuar",
  "actions.back": "Atrás",
  "actions.retry": "Reintentar",
  "actions.close": "Cerrar",
  "status.loading": "Cargando…",
  "status.empty": "Todavía no hay nada aquí.",
  "status.error": "Algo salió mal. Inténtalo de nuevo.",
  "settings.language": "Idioma",
  "settings.languageDescription": "Elige el idioma usado en UMTUBA.",
  "landing.joinCta": "Únete a UMTUBA",
  "landing.startExploring": "Empezar a explorar",
  "landing.goLive": "Salir en vivo",
  "auth.login.title": "Bienvenido de nuevo",
  "auth.login.subtitle": "Inicia sesión para continuar en UMTUBA.",
  "auth.login.panelTitle": "Tu mundo te espera.",
  "auth.login.panelBody":
    "Continúa a tu perfil, o donde lo dejaste.",
  "auth.login.submit": "Iniciar sesión",
  "auth.login.createOne": "Crear una",
  "auth.signup.title": "Crear cuenta",
  "auth.signup.subtitle":
    "Dos pasos rápidos: primero credenciales, luego tu perfil.",
  "auth.signup.create": "Crear cuenta",
  "auth.signup.signIn": "Iniciar sesión",
  "auth.shell.panelTitle": "Crea. Descubre. Crece.",
  "auth.shell.panelBody":
    "Únete a UMTUBA para videos, descubrimiento en vivo y creadores de todo el mundo.",
  "world.eyebrow": "UMTUBA World",
  "world.navTitle": "Descubrimiento del mundo",
  "world.navSubtitleLive": "Lugares y destinos",
  "world.navSubtitleHold": "Aún no está en vivo",
  "world.titleLive": "Explora un destino a tu manera",
  "world.titleHold": "El descubrimiento del mundo está en pausa",
  "world.introLive":
    "Descubre tiendas, restaurantes, hoteles, cafés y servicios locales públicos aprobados. El GPS lo da tu dispositivo y siempre es opcional; UMTUBA no guarda tu ubicación precisa aquí.",
  "world.hold.migrations":
    "Las migraciones de la base de World Discovery aún no están disponibles en este entorno.",
  "world.hold.flagOff":
    "World Discovery está listo pero desactivado a la espera de la aprobación de la plataforma.",
  "world.preparing": "Preparando World Discovery…",
  "world.requestedDestination":
    "Destino solicitado: {city}. Los controles de exploración permanecen ocultos hasta que haya datos de World.",
  "world.location.holdNoPermission":
    "No se solicita permiso de ubicación mientras el descubrimiento no está disponible.",
  "world.backHome": "Volver al inicio",
  "world.chooseWhere": "Elige dónde explorar",
  "world.chooseWhereHelp":
    "La ubicación del dispositivo es opcional. El descubrimiento manual por país/ciudad sigue disponible cuando World Discovery está activado.",
  "world.destination": "Destino",
  "world.category": "Categoría",
  "world.allCategories": "Todas las categorías",
  "world.radiusKm": "Radio: {radius} km",
  "world.exploreDestination": "Explorar destino",
  "world.searching": "Buscando…",
  "world.useLocationOnce": "Usar mi ubicación una vez",
  "world.openCity": "Abrir perfil de la ciudad",
  "world.searchWorld": "Buscar en World",
  "world.location.notRequested": "No se ha solicitado la ubicación.",
  "world.location.granted":
    "Ubicación única concedida. No se almacena.",
  "world.location.denied":
    "Ubicación denegada. Elige un destino en su lugar.",
  "world.location.unavailable":
    "La ubicación no está disponible. Elige un destino en su lugar.",
  "world.location.destinationOnly":
    "Descubrimiento solo por destino — no se usa la ubicación del dispositivo.",
  "world.location.noTracking": "No se usa seguimiento continuo.",
  "world.empty.destination":
    "No hay lugares públicos aprobados que coincidan con este destino.",
  "world.empty.nearby": "No hay lugares públicos aprobados cerca.",
  "world.empty.cities": "Aún no hay destinos seleccionados",
  "world.empty.unknownDestination":
    "Este destino aún no está en el catálogo World: {city}. Elige una ciudad de la lista o explora sin un destino predefinido.",
  "world.verified": "verificado",
  "world.helloCity": "Hello City",
  "world.helloCityHelp":
    "La publicación es explícita, moderada y solo a nivel de ciudad.",
  "world.search.navTitle": "Búsqueda World",
  "world.search.navSubtitleLive": "Ciudades, lugares y categorías",
  "world.search.navSubtitleHold": "Aún no está en vivo",
  "world.search.titleLive": "Buscar en el dominio World",
  "world.search.titleHold": "La búsqueda World está en pausa",
  "world.search.introLive":
    "Búsqueda en base de datos entre ciudades, lugares, negocios, atracciones, hoteles, restaurantes y categorías públicos aprobados.",
  "world.search.hold.migrations":
    "Las migraciones de la base de World Search aún no están disponibles en este entorno.",
  "world.search.hold.flagOff":
    "World Search está listo pero desactivado a la espera de la aprobación de la plataforma.",
  "world.search.loading": "Cargando búsqueda…",
  "world.search.placeholder": "Ciudad, lugar, hotel, restaurante…",
  "world.search.type": "Tipo",
  "world.search.everything": "Todo",
  "world.search.city": "Ciudad",
  "world.search.allCities": "Todas las ciudades",
  "world.search.empty": "No hay resultados de World coincidentes.",
  "world.error.unavailable": "World Discovery aún no está disponible.",
  "world.error.invalidDestination": "Elige un destino válido.",
  "world.error.loadPlaces": "No se pudieron cargar los lugares.",
  "world.error.searchFailed": "No se pudo completar la búsqueda World.",
  "world.error.coordsTogether":
    "Las coordenadas de ubicación deben enviarse juntas.",
  "world.error.coordsInvalid": "Las coordenadas de ubicación no son válidas.",
  "world.error.chooseDestination":
    "Elige un destino o comparte la ubicación una vez.",
  "world.error.invalidCategory": "La categoría del lugar no es válida.",
  "world.error.searchLength": "La búsqueda debe tener entre 2 y 80 caracteres.",
  "world.error.searchType": "El tipo de búsqueda no es válido.",
  "world.error.searchFilter": "El filtro de búsqueda no es válido.",
  "world.city.unavailableTitle": "El perfil de la ciudad aún no está disponible",
  "world.city.unavailableBody": "Esta ciudad se está preparando.",
  "world.city.overviewPending": "Se está preparando una presentación verificada de la ciudad.",
  "world.city.placesEmpty": "Aún no hay lugares públicos aprobados.",
  "world.place.unavailableTitle": "El perfil del lugar aún no está disponible",
  "world.place.unavailableBody": "Este lugar se está preparando.",
  "world.backToWorld": "Volver a World",
};
