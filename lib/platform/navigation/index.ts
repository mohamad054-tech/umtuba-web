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
