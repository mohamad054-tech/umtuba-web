/**
 * Future first-user Welcome Video hook.
 *
 * Does not create a video. Never mandatory. When no source is configured,
 * the hook is inert and Learning remains fully usable.
 */

import { LEARNING_TEACHER_ROUTES } from "./teacherPlatform";
import { LEARNING_PUBLIC_ROUTES } from "./publicCatalog";
import { LEARNING_LEARNER_ROUTES } from "./learnerDelivery";

export const LEARNING_WELCOME_VIDEO_HOOK_ID = "learning-welcome-video" as const;

export const LEARNING_WELCOME_VIDEO_DESTINATIONS = [
  "learning_home",
  "become_a_teacher",
  "first_free_course",
] as const;
export type LearningWelcomeVideoDestination =
  (typeof LEARNING_WELCOME_VIDEO_DESTINATIONS)[number];

export type LearningWelcomeVideoHook = {
  id: typeof LEARNING_WELCOME_VIDEO_HOOK_ID;
  enabled: boolean;
  mandatory: false;
  source_url: string | null;
  destinations: Record<LearningWelcomeVideoDestination, string>;
};

export function resolveWelcomeVideoSource(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): string | null {
  const raw = (env.UMTUBA_LEARNING_WELCOME_VIDEO_URL ?? "").trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) return null;
  return raw;
}

export function buildWelcomeVideoHook(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
  firstFreeCourseHref?: string | null
): LearningWelcomeVideoHook {
  const source = resolveWelcomeVideoSource(env);
  return {
    id: LEARNING_WELCOME_VIDEO_HOOK_ID,
    enabled: Boolean(source),
    mandatory: false,
    source_url: source,
    destinations: {
      learning_home: LEARNING_LEARNER_ROUTES.hub,
      become_a_teacher: LEARNING_TEACHER_ROUTES.become,
      first_free_course: firstFreeCourseHref || LEARNING_PUBLIC_ROUTES.catalog,
    },
  };
}

export function shouldRenderWelcomeVideo(
  hook: LearningWelcomeVideoHook,
  dismissed: boolean
): boolean {
  if (hook.mandatory) return false;
  return hook.enabled && Boolean(hook.source_url) && !dismissed;
}
