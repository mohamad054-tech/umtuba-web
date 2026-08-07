/**
 * App Shell inventory — namespaces allowed for Catalog Ingestion V1.
 * Excludes Learning / Commerce / Creator / Live / World / Games domain catalogs.
 */

export const APP_SHELL_NAMESPACES = [
  "languages",
  "actions",
  "status",
  "nav",
  "settings",
  "menu",
  "dialog",
  "empty",
  "error",
  "success",
] as const;

export type AppShellNamespace = (typeof APP_SHELL_NAMESPACES)[number];

export const APP_SHELL_NAMESPACE_SET = new Set<string>(APP_SHELL_NAMESPACES);

/** Surfaces covered by this milestone (documentation / inventory). */
export const APP_SHELL_SURFACES = [
  "desktop_navigation",
  "mobile_navigation",
  "search",
  "user_menu",
  "settings_titles_and_sections",
  "language_selector_labels",
  "sign_out",
  "generic_actions",
  "loading_empty_error_success",
  "common_dialogs",
  "shared_product_loading_empty_error",
] as const;

export function isAppShellNamespace(name: string): boolean {
  return APP_SHELL_NAMESPACE_SET.has(name);
}

export function namespaceOfKey(key: string): string {
  return key.split(".")[0] ?? "app";
}

export function isAppShellCatalogKey(key: string): boolean {
  return isAppShellNamespace(namespaceOfKey(key));
}

export function stableAppShellKeyId(key: string): string {
  return `key_appshell_${key.replace(/\./g, "__")}`;
}

export function stableAppShellValueId(
  key: string,
  language: string
): string {
  return `val_appshell_${key.replace(/\./g, "__")}_${language}`;
}

export function stableAppShellNamespaceId(namespace: string): string {
  return `ns_${namespace}`;
}

/**
 * App Shell translation-memory stable id — key + target locale.
 * Must not truncate source fingerprints (collisions across distinct source texts).
 */
export function stableAppShellMemoryId(
  key: string,
  language: string
): string {
  return `tm_appshell_${key.replace(/\./g, "__")}_${language}`;
}
