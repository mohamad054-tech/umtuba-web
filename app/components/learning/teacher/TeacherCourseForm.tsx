import BootstrapField, {
  bootstrapInputClass,
  bootstrapSelectClass,
} from "../instructor/BootstrapField";
import { LEARNING_COURSE_DIFFICULTIES } from "../../../../lib/learning/coursesFoundation";
import type { TranslationKey } from "../../../../lib/i18n/messages/types";

type Translator = (key: TranslationKey) => string;

export type TeacherCourseFormValues = {
  course_id?: string;
  title?: string;
  subtitle?: string | null;
  description?: string | null;
  category?: string | null;
  level?: string | null;
  language?: string | null;
  cover_url?: string | null;
  promo_video_url?: string | null;
  learning_objectives?: string[];
  prerequisites?: string | null;
  access_kind?: string | null;
  future_price_amount_minor?: number | null;
  future_price_currency?: string | null;
};

type Props = {
  t: Translator;
  action: (formData: FormData) => Promise<void>;
  values?: TeacherCourseFormValues;
  submitLabel: string;
};

export default function TeacherCourseForm({
  t,
  action,
  values,
  submitLabel,
}: Props) {
  return (
    <form action={action} className="space-y-4">
      {values?.course_id ? (
        <input type="hidden" name="course_id" value={values.course_id} />
      ) : null}
      <BootstrapField label={t("teacher.course.title")} required>
        <input
          className={bootstrapInputClass}
          name="title"
          defaultValue={values?.title ?? ""}
          required
          minLength={3}
          maxLength={160}
        />
      </BootstrapField>
      <BootstrapField label={t("teacher.course.subtitle")}>
        <input
          className={bootstrapInputClass}
          name="subtitle"
          defaultValue={values?.subtitle ?? ""}
          maxLength={240}
        />
      </BootstrapField>
      <BootstrapField label={t("teacher.course.description")}>
        <textarea
          className={`${bootstrapInputClass} min-h-28`}
          name="description"
          defaultValue={values?.description ?? ""}
          maxLength={8000}
        />
      </BootstrapField>
      <div className="grid gap-4 sm:grid-cols-2">
        <BootstrapField label={t("teacher.course.category")}>
          <input
            className={bootstrapInputClass}
            name="category"
            defaultValue={values?.category ?? ""}
          />
        </BootstrapField>
        <BootstrapField label={t("teacher.course.level")}>
          <select
            className={bootstrapSelectClass}
            name="level"
            defaultValue={values?.level ?? ""}
          >
            <option value="">—</option>
            {LEARNING_COURSE_DIFFICULTIES.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </BootstrapField>
        <BootstrapField label={t("teacher.course.language")}>
          <input
            className={bootstrapInputClass}
            name="language"
            defaultValue={values?.language ?? "ar"}
          />
        </BootstrapField>
        <BootstrapField label={t("teacher.course.access")}>
          <select
            className={bootstrapSelectClass}
            name="access_kind"
            defaultValue={values?.access_kind ?? "free"}
          >
            <option value="free">{t("teacher.course.free")}</option>
            <option value="paid">{t("teacher.course.paid")}</option>
          </select>
        </BootstrapField>
      </div>
      <BootstrapField label={t("teacher.course.cover")}>
        <input
          className={bootstrapInputClass}
          name="cover_url"
          defaultValue={values?.cover_url ?? ""}
        />
      </BootstrapField>
      <BootstrapField label={t("teacher.course.promoVideo")}>
        <input
          className={bootstrapInputClass}
          name="promo_video_url"
          defaultValue={values?.promo_video_url ?? ""}
        />
      </BootstrapField>
      <BootstrapField label={t("teacher.course.objectives")}>
        <textarea
          className={`${bootstrapInputClass} min-h-24`}
          name="learning_objectives"
          defaultValue={(values?.learning_objectives ?? []).join("\n")}
        />
      </BootstrapField>
      <BootstrapField label={t("teacher.course.prerequisites")}>
        <textarea
          className={`${bootstrapInputClass} min-h-20`}
          name="prerequisites"
          defaultValue={values?.prerequisites ?? ""}
        />
      </BootstrapField>
      <BootstrapField
        label={t("teacher.course.futurePrice")}
        hint={t("teacher.course.futurePriceHint")}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className={bootstrapInputClass}
            name="future_price_amount_minor"
            type="number"
            min={0}
            defaultValue={values?.future_price_amount_minor ?? ""}
          />
          <input
            className={bootstrapInputClass}
            name="future_price_currency"
            defaultValue={values?.future_price_currency ?? "USD"}
          />
        </div>
      </BootstrapField>
      <p className="text-xs text-white/40">{t("teacher.payments.disabled")}</p>
      <button
        type="submit"
        className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
      >
        {submitLabel}
      </button>
    </form>
  );
}
