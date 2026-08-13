import { enMessages } from "./en";
import type { FoundationMessages } from "./types";

/** Portuguese: foundation keys localized; App Shell keys inherit English until PT shell pass. */
export const ptMessages: FoundationMessages = {
  ...enMessages,
  "languages.ar": "Árabe",
  "languages.en": "Inglês",
  "languages.fr": "Francês",
  "languages.es": "Espanhol",
  "languages.de": "Alemão",
  "languages.pt": "Português",
  "actions.save": "Salvar",
  "actions.cancel": "Cancelar",
  "actions.continue": "Continuar",
  "actions.back": "Voltar",
  "actions.retry": "Tentar novamente",
  "actions.close": "Fechar",
  "status.loading": "Carregando…",
  "status.empty": "Nada aqui ainda.",
  "status.error": "Algo deu errado. Tente novamente.",
  "settings.language": "Idioma",
  "settings.languageDescription": "Escolha o idioma usado no UMTUBA.",
  "landing.joinCta": "Entrar na UMTUBA",
  "landing.startExploring": "Começar a explorar",
  "landing.goLive": "Ir ao vivo",
};
