import BootstrapField, {
  bootstrapInputClass,
  bootstrapSelectClass,
} from "../instructor/BootstrapField";
import {
  LEARNING_TEACHER_EXPERIENCE_LEVELS,
  type LearningTeacherProfile,
} from "../../../../lib/learning/teacherPlatform";
import {
  saveTeacherDraftAction,
  submitTeacherApplicationAction,
} from "../../../learning/teacher/actions";
import type { TranslationKey } from "../../../../lib/i18n/messages/types";

type Translator = (key: TranslationKey) => string;

type Props = {
  t: Translator;
  profile: LearningTeacherProfile | null;
  editable: boolean;
};

export default function TeacherApplicationForm({ t, profile, editable }: Props) {
  return (
    <form className="mt-6 space-y-4">
      <BootstrapField label={t("teacher.become.displayName")} required>
        <input
          className={bootstrapInputClass}
          name="display_name"
          defaultValue={profile?.display_name ?? ""}
          required
          minLength={2}
          maxLength={80}
          disabled={!editable}
        />
      </BootstrapField>
      <BootstrapField label={t("teacher.become.biography")} required>
        <textarea
          className={`${bootstrapInputClass} min-h-28`}
          name="biography"
          defaultValue={profile?.biography ?? ""}
          required
          maxLength={4000}
          disabled={!editable}
        />
      </BootstrapField>
      <BootstrapField label={t("teacher.become.subjects")} required>
        <input
          className={bootstrapInputClass}
          name="subjects"
          defaultValue={(profile?.subjects ?? []).join(", ")}
          required
          disabled={!editable}
        />
      </BootstrapField>
      <BootstrapField label={t("teacher.become.languages")} required>
        <input
          className={bootstrapInputClass}
          name="teaching_languages"
          defaultValue={(profile?.teaching_languages ?? []).join(", ")}
          required
          disabled={!editable}
        />
      </BootstrapField>
      <BootstrapField label={t("teacher.become.experience")}>
        <select
          className={bootstrapSelectClass}
          name="experience_level"
          defaultValue={profile?.experience_level ?? ""}
          disabled={!editable}
        >
          <option value="">—</option>
          {LEARNING_TEACHER_EXPERIENCE_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </BootstrapField>
      <BootstrapField label={t("teacher.become.qualifications")}>
        <textarea
          className={`${bootstrapInputClass} min-h-20`}
          name="qualifications"
          defaultValue={profile?.qualifications ?? ""}
          maxLength={2000}
          disabled={!editable}
        />
      </BootstrapField>
      <BootstrapField label={t("teacher.become.profileImage")}>
        <input
          className={bootstrapInputClass}
          name="profile_image_url"
          defaultValue={profile?.profile_image_url ?? ""}
          disabled={!editable}
        />
      </BootstrapField>
      <BootstrapField label={t("teacher.become.teachingDescription")} required>
        <textarea
          className={`${bootstrapInputClass} min-h-28`}
          name="teaching_description"
          defaultValue={profile?.teaching_description ?? ""}
          required
          maxLength={4000}
          disabled={!editable}
        />
      </BootstrapField>
      {editable ? (
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            formAction={saveTeacherDraftAction}
            className="watch-focus-ring rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold text-white"
          >
            {t("teacher.become.saveDraft")}
          </button>
          <button
            formAction={submitTeacherApplicationAction}
            className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
          >
            {t("teacher.become.submit")}
          </button>
        </div>
      ) : null}
    </form>
  );
}
