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
  "auth.login.title": "Bem-vindo de volta",
  "auth.login.subtitle": "Entre para continuar na UMTUBA.",
  "auth.login.panelTitle": "O seu mundo espera.",
  "auth.login.panelBody":
    "Continue para o seu perfil, ou de onde parou.",
  "auth.login.submit": "Entrar",
  "auth.login.createOne": "Criar uma",
  "auth.signup.title": "Criar conta",
  "auth.signup.subtitle":
    "Dois passos rápidos — credenciais primeiro, depois o seu perfil.",
  "auth.signup.create": "Criar conta",
  "auth.signup.signIn": "Entrar",
  "auth.shell.panelTitle": "Criar. Descobrir. Crescer.",
  "auth.shell.panelBody":
    "Junte-se à UMTUBA para vídeos, descoberta ao vivo e criadores ao redor do mundo.",
  "world.eyebrow": "UMTUBA World",
  "world.navTitle": "Descoberta do mundo",
  "world.navSubtitleLive": "Lugares e destinos",
  "world.navSubtitleHold": "Ainda não está no ar",
  "world.titleLive": "Explore um destino do seu jeito",
  "world.titleHold": "A descoberta do mundo está em pausa",
  "world.introLive":
    "Descubra lojas, restaurantes, hotéis, cafés e serviços locais públicos aprovados. O GPS vem do seu dispositivo e é sempre opcional; a UMTUBA não armazena a sua localização precisa aqui.",
  "world.hold.migrations":
    "As migrações da base de World Discovery ainda não estão disponíveis neste ambiente.",
  "world.hold.flagOff":
    "World Discovery está pronto, mas desativado até a aprovação da plataforma.",
  "world.preparing": "A preparar World Discovery…",
  "world.requestedDestination":
    "Destino pedido: {city}. Os controlos de exploração da cidade ficam ocultos até os dados de World estarem disponíveis.",
  "world.location.holdNoPermission":
    "Nenhuma permissão de localização é pedida enquanto a descoberta estiver indisponível.",
  "world.backHome": "Voltar ao início",
  "world.chooseWhere": "Escolha onde explorar",
  "world.chooseWhereHelp":
    "A localização do dispositivo é opcional. A descoberta manual por país/cidade continua disponível quando World Discovery está ativo.",
  "world.destination": "Destino",
  "world.category": "Categoria",
  "world.allCategories": "Todas as categorias",
  "world.radiusKm": "Raio: {radius} km",
  "world.exploreDestination": "Explorar destino",
  "world.searching": "A pesquisar…",
  "world.useLocationOnce": "Usar a minha localização uma vez",
  "world.openCity": "Abrir perfil da cidade",
  "world.searchWorld": "Pesquisar World",
  "world.location.notRequested": "A localização não foi pedida.",
  "world.location.granted":
    "Localização única concedida. Não é armazenada.",
  "world.location.denied":
    "Localização recusada. Escolha um destino em vez disso.",
  "world.location.unavailable":
    "A localização está indisponível. Escolha um destino em vez disso.",
  "world.location.destinationOnly":
    "Descoberta só por destino — sem localização do dispositivo.",
  "world.location.noTracking": "Não é usado rastreamento contínuo.",
  "world.empty.destination":
    "Nenhum lugar público aprovado corresponde a este destino.",
  "world.empty.nearby": "Nenhum lugar público aprovado por perto.",
  "world.empty.cities": "Ainda não há destinos selecionados",
  "world.verified": "verificado",
  "world.helloCity": "Hello City",
  "world.helloCityHelp":
    "A publicação é explícita, moderada e apenas ao nível da cidade.",
  "world.search.navTitle": "Pesquisa World",
  "world.search.navSubtitleLive": "Cidades, lugares e categorias",
  "world.search.navSubtitleHold": "Ainda não está no ar",
  "world.search.titleLive": "Pesquisar o domínio World",
  "world.search.titleHold": "A pesquisa World está em pausa",
  "world.search.introLive":
    "Pesquisa em base de dados por cidades, lugares, negócios, atrações, hotéis, restaurantes e categorias públicos aprovados.",
  "world.search.hold.migrations":
    "As migrações da base de World Search ainda não estão disponíveis neste ambiente.",
  "world.search.hold.flagOff":
    "World Search está pronto, mas desativado até a aprovação da plataforma.",
  "world.search.loading": "A carregar a pesquisa…",
  "world.search.placeholder": "Cidade, lugar, hotel, restaurante…",
  "world.search.type": "Tipo",
  "world.search.everything": "Tudo",
  "world.search.city": "Cidade",
  "world.search.allCities": "Todas as cidades",
  "world.search.empty": "Nenhum resultado World correspondente.",
  "world.error.unavailable": "World Discovery ainda não está disponível.",
  "world.error.invalidDestination": "Escolha um destino válido.",
  "world.error.loadPlaces": "Não foi possível carregar os lugares.",
  "world.error.searchFailed": "Não foi possível concluir a pesquisa World.",
  "world.error.coordsTogether":
    "As coordenadas de localização devem ser enviadas juntas.",
  "world.error.coordsInvalid": "As coordenadas de localização são inválidas.",
  "world.error.chooseDestination":
    "Escolha um destino ou partilhe a localização uma vez.",
  "world.error.invalidCategory": "A categoria do lugar é inválida.",
  "world.error.searchLength": "A pesquisa deve ter de 2 a 80 caracteres.",
  "world.error.searchType": "O tipo de pesquisa é inválido.",
  "world.error.searchFilter": "O filtro de pesquisa é inválido.",
  "world.city.unavailableTitle": "O perfil da cidade ainda não está disponível",
  "world.city.unavailableBody": "Esta cidade está a ser preparada.",
  "world.place.unavailableTitle": "O perfil do lugar ainda não está disponível",
  "world.place.unavailableBody": "Este lugar está a ser preparado.",
  "world.backToWorld": "Voltar a World",
};
