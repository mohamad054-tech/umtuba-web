import { emptyRights, effectiveRights, type RightsMatrix, type SandboxCourse } from "../fixtures/types";
import { lessonBodyState } from "./catalog";
import type { SandboxLesson } from "../fixtures/types";

export type TutorDecision = {
  allowed: boolean;
  reason: string;
  source: "OWNED_ORIGINAL" | "DENIED";
  sendsToExternalAi: false;
  usesPartnerContent: false;
};

export function courseAiRights(course: SandboxCourse): RightsMatrix {
  if (course.kind === "UMTUBA_ORIGINAL" && course.aiTutorAllowed) {
    return emptyRights({
      CATALOG_DISPLAY_ALLOWED: "ALLOW",
      IMAGE_USAGE_ALLOWED: "ALLOW",
      CONTENT_HOSTING_ALLOWED: "ALLOW",
      CHECKOUT_ALLOWED: "DENY",
      RESELL_ALLOWED: "DENY",
      AI_USAGE_ALLOWED: "ALLOW",
      CERTIFICATE_RIGHTS: "ALLOW",
    });
  }
  return emptyRights({
    AI_USAGE_ALLOWED: course.aiTutorAllowed ? "ALLOW" : "DENY",
  });
}

export function resolveSandboxTutorAccess(course: SandboxCourse): TutorDecision {
  const rights = effectiveRights(courseAiRights(course));
  if (course.kind !== "UMTUBA_ORIGINAL") {
    return {
      allowed: false,
      reason:
        "AI Tutor is denied on partner and external previews. Partner AI_USAGE_ALLOWED stays blocked. UNKNOWN equals DENY.",
      source: "DENIED",
      sendsToExternalAi: false,
      usesPartnerContent: false,
    };
  }
  if (!course.aiTutorAllowed || !rights.AI_USAGE_ALLOWED) {
    return {
      allowed: false,
      reason: "AI_USAGE_ALLOWED is not ALLOW. UNKNOWN and DENY both block the tutor.",
      source: "DENIED",
      sendsToExternalAi: false,
      usesPartnerContent: false,
    };
  }
  return {
    allowed: true,
    reason: "Sandbox tutor may use this owned UMTUBA Original draft locally. It is not sent to an external AI.",
    source: "OWNED_ORIGINAL",
    sendsToExternalAi: false,
    usesPartnerContent: false,
  };
}

export function buildTutorContext(course: SandboxCourse, lesson: SandboxLesson): {
  courseTitle: string;
  moduleTitle: string;
  lessonTitle: string;
  excerpt: string;
} {
  const courseModule = course.modules.find((row) => row.lessons.some((item) => item.id === lesson.id));
  return {
    courseTitle: course.title,
    moduleTitle: courseModule?.title ?? course.title,
    lessonTitle: lesson.title,
    excerpt: lesson.body.trim().slice(0, 400),
  };
}

export function sandboxTutorAnswer(course: SandboxCourse, lesson: SandboxLesson, prompt: string): {
  allowed: boolean;
  answer: string;
  citation: string;
  context: ReturnType<typeof buildTutorContext> | null;
  sendsToExternalAi: false;
} {
  const access = resolveSandboxTutorAccess(course);
  if (!access.allowed) {
    return {
      allowed: false,
      answer: access.reason,
      citation: course.slug,
      context: null,
      sendsToExternalAi: false,
    };
  }
  const context = buildTutorContext(course, lesson);
  const bodyState = lessonBodyState(lesson);
  if (bodyState === "MISSING") {
    return {
      allowed: true,
      answer:
        "This lesson body is not authored yet. The sandbox will not invent missing content or send a placeholder to any external model.",
      citation: lesson.id,
      context,
      sendsToExternalAi: false,
    };
  }
  const safePrompt = prompt.trim().slice(0, 160) || "Explain this lesson.";
  return {
    allowed: true,
    answer: `Local sandbox tutor (no external AI). Course: ${context.courseTitle}. Module: ${context.moduleTitle}. Lesson: ${context.lessonTitle}. Prompt: “${safePrompt}”. From this owned lesson: ${context.excerpt}`,
    citation: `${course.slug}/${lesson.id}`,
    context,
    sendsToExternalAi: false,
  };
}
