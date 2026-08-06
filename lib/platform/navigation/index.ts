export type {
  BreadcrumbItem,
  NavigationContext,
  NavigationGroup,
  NavigationGroupId,
  NavigationItem,
  NavigationOrphanReport,
  PageRegistrySource,
  RobotsDocument,
  RobotsRule,
  SitemapEntry,
} from "./types";

export { NAVIGATION_GROUP_IDS } from "./types";

export {
  NAVIGATION_GROUP_DEFINITIONS,
  getGroupDefinition,
} from "./navigationGroups";

export {
  ADMIN_NAV_CONTEXT,
  AUTHENTICATED_NAV_CONTEXT,
  PUBLIC_NAV_CONTEXT,
  filterNavigationItems,
  isNavigationItemVisible,
} from "./navigationFilters";

export {
  assertNavigationItemsInRegistry,
  assertUniqueNavigationPaths,
  buildAllNavigationGroups,
  buildNavigationGroup,
  listAllNavigationItems,
  reportNavigationOrphans,
  resolveRegistryPage,
} from "./navigationBuilder";

export {
  assertBreadcrumbsResolve,
  buildBreadcrumbs,
  resolvePageForPath,
} from "./breadcrumbs";

export {
  buildSitemapEntries,
  renderSitemapXml,
} from "./sitemapBuilder";

export {
  buildRobotsDocument,
  collectRobotsDisallowPaths,
  renderRobotsTxt,
} from "./robotsBuilder";

export {
  listAdminAdsNavLinks,
  listAdminNavLinks,
  listAdminStoreNavLinks,
  listAiAdminNavLinks,
  listAiDataNavLinks,
  listCommerceNavLinks,
  listKnowledgeNavLinks,
  listLearningNavLinks,
  listPrivateAiNavLinks,
  listSettingsNavLinks,
  type WiredNavLink,
} from "./wiring";

export {
  DEFAULT_CHROME_FEATURE_FLAGS,
  DESKTOP_MAIN_PRESENTATION,
  MOBILE_MAIN_PRESENTATION,
  USER_MENU_ACCOUNT_PRESENTATION,
  USER_MENU_YOU_PRESENTATION,
  SELLER_STORE_CHROME_PRESENTATION,
  BUYER_STORE_CHROME_PRESENTATION,
  LEARNING_LEARNER_CHROME_PRESENTATION,
  LEARNING_INSTRUCTOR_CHROME_PRESENTATION,
  isPresentationEnabled,
  type ChromeFeatureFlags,
  type ChromeNavPresentation,
  type UserMenuCapabilityKey,
} from "./presentation";

export {
  assertChromeLinksMatchRegistry,
  buildChromeUserMenuGroups,
  listDesktopMainNavLinks,
  listMobileMainNavLinks,
  type ChromeNavLink,
  type ChromeUserMenuCapabilities,
  type ChromeUserMenuGroup,
} from "./chromeNavigation";

export {
  fillRegistryPath,
  isRegistryHrefActive,
  requireRegistryPath,
  requireRegistryTemplate,
} from "./routeTemplates";

export {
  buildLearningActivityHref,
  buildLearningCourseHref,
  buildLearningInstructorCourseHref,
  buildLearningInstructorLessonHref,
  buildLearningLessonHref,
  buildSellerOrderDetailHref,
  buildSellerProductEditHref,
  buildStoreBySlugHref,
  buildStoreOrderDetailHref,
  buildStoreProductSlugHref,
  listBuyerStoreChromeNavLinks,
  listLearningInstructorChromeNavLinks,
  listLearningLearnerChromeNavLinks,
  listSellerStoreChromeNavLinks,
  resolveCommerceStaticPath,
  resolveLearningStaticPath,
  COMMERCE_STATIC_PAGE_IDS,
  LEARNING_STATIC_PAGE_IDS,
} from "./commerceLearningChrome";
