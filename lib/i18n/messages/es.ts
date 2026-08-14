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
};
