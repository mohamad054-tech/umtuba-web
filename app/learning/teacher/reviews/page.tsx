import { createTranslator } from "../../../../lib/i18n";
import { resolveRequestLocale } from "../../../../lib/i18n/server";
import { createClient } from "../../../../lib/supabase/server";
import { LEARNING_COURSE_REVIEW_RPCS } from "../../../../lib/learning/courseReviews";

export default async function TeacherReviewsPage() {
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  const supabase = await createClient();
  const { data } = await supabase.rpc(LEARNING_COURSE_REVIEW_RPCS.listMineTeaching);
  const rows = Array.isArray(data) ? data : [];

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-black">{t("teacher.reviews.title")}</h1>
      {rows.length === 0 ? (
        <p className="text-sm text-white/55">{t("teacher.reviews.empty")}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const review = row as { id?: string; rating?: number; comment?: string };
            return (
              <li
                key={review.id ?? `${review.rating}-${review.comment}`}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <p className="font-bold">{review.rating}/5</p>
                {review.comment ? (
                  <p className="mt-1 text-sm text-white/70">{review.comment}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
