import {
  PROFILE_ERROR_SOFT_BANNER_CLASS,
  PROFILE_ERROR_STATES_COPY,
  shouldShowProfileErrorRetry,
} from "../lib/profileErrorStates";

type ProfilePanelErrorProps = {
  message: string;
  onRetry?: () => void;
};

/**
 * Inline panel error (§20) — secondary fetch failure stays in-panel with optional Retry.
 */
export default function ProfilePanelError({
  message,
  onRetry,
}: ProfilePanelErrorProps) {
  const showRetry = shouldShowProfileErrorRetry(onRetry);

  return (
    <div className="space-y-3">
      <p role="status" className={PROFILE_ERROR_SOFT_BANNER_CLASS}>
        {message}
      </p>
      {showRetry && onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-white/80 transition hover:bg-white/10"
        >
          {PROFILE_ERROR_STATES_COPY.retryCta}
        </button>
      ) : null}
    </div>
  );
}
