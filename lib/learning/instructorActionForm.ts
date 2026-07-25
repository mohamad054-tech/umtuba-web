/**
 * Safe post-async form reset for instructor action forms.
 * React nulls `event.currentTarget` after the sync submit handler returns,
 * so callers must pass a form element captured before awaiting.
 */
export function resetInstructorActionForm(
  form: HTMLFormElement | null | undefined
): void {
  form?.reset();
}
