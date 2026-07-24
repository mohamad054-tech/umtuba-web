import {
  LEARNING_SPACE_MODES,
  LEARNING_SPACE_VISIBILITIES,
} from "../../../../lib/learning/spacesFoundation";
import { createLearningSpaceAction } from "../../../learning/instructor/actions";

export default function CreateSpaceForm({
  errorMessage,
}: {
  errorMessage?: string | null;
}) {
  return (
    <form action={createLearningSpaceAction} className="space-y-4">
      {errorMessage ? (
        <p
          role="alert"
          className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {errorMessage}
        </p>
      ) : null}

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-white/50">
          Name
        </span>
        <input
          name="name"
          required
          maxLength={120}
          placeholder="UMTUBA Academy"
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none ring-0 placeholder:text-white/30 focus:border-white/25"
        />
      </label>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-white/50">
          Slug
        </span>
        <input
          name="slug"
          required
          minLength={3}
          maxLength={64}
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          placeholder="umtuba-academy"
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25"
        />
        <span className="mt-1 block text-xs text-white/40">
          Lowercase letters, numbers, hyphens (3–64).
        </span>
      </label>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-white/50">
          Description
        </span>
        <textarea
          name="description"
          rows={3}
          maxLength={4000}
          placeholder="Optional"
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25"
        />
      </label>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-white/50">
          Mode
        </span>
        <select
          name="mode"
          required
          defaultValue="general_academy"
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0a0a14] px-3 py-2.5 text-sm text-white outline-none focus:border-white/25"
        >
          {LEARNING_SPACE_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {mode.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-white/50">
          Visibility
        </span>
        <select
          name="visibility"
          defaultValue="private"
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0a0a14] px-3 py-2.5 text-sm text-white outline-none focus:border-white/25"
        >
          {LEARNING_SPACE_VISIBILITIES.map((visibility) => (
            <option key={visibility} value={visibility}>
              {visibility}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        className="watch-focus-ring w-full rounded-full bg-white px-4 py-2.5 text-sm font-bold text-black transition hover:bg-white/90"
      >
        Create space
      </button>
    </form>
  );
}
