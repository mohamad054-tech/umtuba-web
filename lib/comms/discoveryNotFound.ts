/** Shared not-found copy. Keep this module client-safe; do not mark it as a server module. */
export const GENERIC_NOT_FOUND =
  "No UMTUBA account is available to message with this lookup.";

export function discoveryNotFoundMessage(): string {
  return GENERIC_NOT_FOUND;
}
