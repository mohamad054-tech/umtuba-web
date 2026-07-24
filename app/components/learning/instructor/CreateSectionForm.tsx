import { LEARNING_SECTION_VISIBILITIES } from "../../../../lib/learning/sectionsFoundation";
import { createLearningSectionAction } from "../../../learning/instructor/actions";

export default function CreateSectionForm({
  courseId,
  errorMessage,
}: {
  courseId: string;
  errorMessage?: string | null;
}) {
  return (
    <form action={createLearningSectionAction} className="space-y-4">
      <input type="hidden" name="courseId" value={courseId} />

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
          maxLength={160}
          placeholder="Getting started"
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25"
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
          placeholder="getting-started"
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25"
        />
      </label>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-white/50">
          Description
        </span>
        <textarea
          name="description"
          rows={3}
          maxLength={8000}
          placeholder="Optional"
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25"
        />
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
          {LEARNING_SECTION_VISIBILITIES.map((visibility) => (
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
        Create section
      </button>
    </form>
  );
}
