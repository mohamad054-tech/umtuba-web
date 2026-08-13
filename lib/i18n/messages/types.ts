/**
 * App Shell + foundation translation catalog shape.
 * Keys are stable; expand carefully — do not rename without migration.
 */

export type FoundationMessages = {
  "languages.ar": string;
  "languages.en": string;
  "languages.fr": string;
  "languages.es": string;
  "languages.de": string;
  "languages.pt": string;

  "actions.save": string;
  "actions.cancel": string;
  "actions.continue": string;
  "actions.back": string;
  "actions.retry": string;
  "actions.close": string;
  "actions.edit": string;
  "actions.delete": string;
  "actions.search": string;
  "actions.confirm": string;

  "status.loading": string;
  "status.empty": string;
  "status.error": string;
  "status.success": string;
  "status.working": string;
  "status.retrying": string;
  "status.saving": string;
  "status.signingOut": string;

  "nav.home": string;
  "nav.discover": string;
  "nav.world": string;
  "nav.learning": string;
  "nav.live": string;
  "nav.messages": string;
  "nav.profile": string;
  "nav.search": string;
  "nav.primary": string;
  "nav.primaryMobile": string;
  "nav.homeAria": string;

  "settings.title": string;
  "settings.subtitle": string;
  "settings.sectionsLabel": string;
  "settings.language": string;
  "settings.languageDescription": string;
  "settings.profile": string;
  "settings.profileDescription": string;
  "settings.notifications": string;
  "settings.notificationsDescription": string;
  "settings.account": string;
  "settings.accountDescription": string;
  "settings.languageNav": string;
  "settings.languageNavDescription": string;
  "settings.viewProfile": string;
  "settings.saveProfile": string;
  "settings.signOut": string;
  "settings.profileHeading": string;
  "settings.profileIntro": string;
  "settings.notificationsHeading": string;
  "settings.notificationsIntro": string;
  "settings.accountHeading": string;
  "settings.accountIntro": string;

  "menu.accountMenu": string;
  "menu.you": string;
  "menu.account": string;
  "menu.session": string;
  "menu.profile": string;
  "menu.create": string;
  "menu.saved": string;
  "menu.learning": string;
  "menu.instructor": string;
  "menu.rewards": string;
  "menu.notifications": string;
  "menu.settings": string;
  "menu.store": string;
  "menu.seller": string;
  "menu.wishlist": string;
  "menu.advertise": string;
  "menu.admin": string;
  "menu.signIn": string;
  "menu.signOut": string;
  "menu.switchAccount": string;
  "menu.switching": string;

  "dialog.confirmTitle": string;
  "dialog.confirmBody": string;
  "dialog.cancel": string;
  "dialog.confirmAction": string;

  "empty.title": string;
  "empty.description": string;

  "error.title": string;
  "error.description": string;
  "error.tryAgain": string;

  "success.generic": string;

  /** Landing / welcome join + hero (UAF-03 / UAF-06). */
  "landing.joinCta": string;
  "landing.startExploring": string;
  "landing.goLive": string;
  "landing.badge": string;
  "landing.headline": string;
  "landing.headlineAccent": string;
  "landing.subhead": string;
  "landing.worldsEyebrow": string;
  "landing.worldsTitle": string;
  "landing.worldsTitleLine2": string;
  "landing.openHomeFeed": string;
  "landing.missionEyebrow": string;
  "landing.missionTitle": string;
  "landing.missionBody": string;
  "landing.world.videos.title": string;
  "landing.world.videos.text": string;
  "landing.world.challenges.title": string;
  "landing.world.challenges.text": string;
  "landing.world.ai.title": string;
  "landing.world.ai.text": string;
  "landing.world.ideas.title": string;
  "landing.world.ideas.text": string;
  "landing.world.global.title": string;
  "landing.world.global.text": string;
  "landing.world.opportunities.title": string;
  "landing.world.opportunities.text": string;
  "landing.focusLivingEarth": string;
  "landing.focusExploring": string;
};

export type TranslationKey = keyof FoundationMessages;
