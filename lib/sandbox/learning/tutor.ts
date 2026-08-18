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

export function sandboxTutorAnswer(course: SandboxCourse, lesson: SandboxLesson, prompt: string): {
  allowed: boolean;
  answer: string;
  citation: string;
  sendsToExternalAi: false;
} {
  const access = resolveSandboxTutorAccess(course);
  if (!access.allowed) {
    return {
      allowed: false,
      answer: access.reason,
      citation: course.slug,
      sendsToExternalAi: false,
    };
  }
  const bodyState = lessonBodyState(lesson);
  if (bodyState === "MISSING") {
    return {
      allowed: true,
      answer:
        "This lesson body is not authored yet. The sandbox will not invent missing content or send a placeholder to any external model.",
      citation: lesson.id,
      sendsToExternalAi: false,
    };
  }
  const clipped = lesson.body.slice(0, 280);
  const safePrompt = prompt.trim().slice(0, 160) || "Explain this lesson.";
  return {
    allowed: true,
    answer: `Local sandbox tutor (no external AI). Prompt: “${safePrompt}”. From this owned lesson: ${clipped}`,
    citation: `${course.slug}/${lesson.id}`,
    sendsToExternalAi: false,
  };
}
