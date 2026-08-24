import { submitCourseReviewAction } from "../../learning/teacher/actions";
import type { TranslationKey } from "../../../lib/i18n/messages/types";

type Translator = (key: TranslationKey) => string;

type Props = {
  t: Translator;
  courseId: string;
  returnTo: string;
};

export default function CourseReviewForm({ t, courseId, returnTo }: Props) {
  return (
    <form action={submitCourseReviewAction} className="mt-4 space-y-3">
      <input type="hidden" name="course_id" value={courseId} />
      <input type="hidden" name="return_to" value={returnTo} />
      <label className="block text-sm font-bold text-white/70">
        {t("learning.review.rating")}
        <select
          name="rating"
          required
          className="watch-focus-ring mt-1 w-full rounded-lg border border-white/15 bg-[#0b0b14] px-3 py-2 text-sm text-white"
          defaultValue="5"
        >
          <option value="5">5</option>
          <option value="4">4</option>
          <option value="3">3</option>
          <option value="2">2</option>
          <option value="1">1</option>
        </select>
      </label>
      <label className="block text-sm font-bold text-white/70">
        {t("learning.review.comment")}
        <textarea
          name="comment"
          maxLength={2000}
          className="watch-focus-ring mt-1 min-h-20 w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white"
        />
      </label>
      <button
        type="submit"
        className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
      >
        {t("learning.review.submit")}
      </button>
    </form>
  );
}
