import type { StyleProfile, StyleProfileId } from "./types";

export const STYLE_PROFILES: Record<StyleProfileId, StyleProfile> = {
  platform_ui: {
    id: "platform_ui",
    label: "Platform UI",
    tone: "clear, compact, product-native",
    formality: "medium",
    sentenceLengthPreference: "short",
    terminologyStrictness: "strict",
    punctuationPreferences: "Prefer sparingly used ellipsis and title case for labels.",
    allowedAdaptationLevel: "light",
    subtitleConstraints: null,
    dubbingConstraints: null,
  },
  learning_educational: {
    id: "learning_educational",
    label: "Learning / Educational",
    tone: "supportive, instructional",
    formality: "medium",
    sentenceLengthPreference: "medium",
    terminologyStrictness: "guided",
    punctuationPreferences: "Complete sentences; avoid slang.",
    allowedAdaptationLevel: "adaptive",
    subtitleConstraints: null,
    dubbingConstraints: null,
  },
  commerce_product: {
    id: "commerce_product",
    label: "Commerce / Product",
    tone: "persuasive but honest",
    formality: "medium",
    sentenceLengthPreference: "short",
    terminologyStrictness: "strict",
    punctuationPreferences: "Currency and units preserved exactly.",
    allowedAdaptationLevel: "light",
    subtitleConstraints: null,
    dubbingConstraints: null,
  },
  legal_formal: {
    id: "legal_formal",
    label: "Legal / Formal",
    tone: "precise, formal",
    formality: "high",
    sentenceLengthPreference: "flexible",
    terminologyStrictness: "strict",
    punctuationPreferences: "Preserve legal enumeration and clause markers.",
    allowedAdaptationLevel: "literal",
    subtitleConstraints: null,
    dubbingConstraints: null,
  },
  marketing_friendly: {
    id: "marketing_friendly",
    label: "Marketing / Friendly",
    tone: "warm, inviting",
    formality: "low",
    sentenceLengthPreference: "medium",
    terminologyStrictness: "flexible",
    punctuationPreferences: "Exclamation marks sparingly.",
    allowedAdaptationLevel: "adaptive",
    subtitleConstraints: null,
    dubbingConstraints: null,
  },
  subtitles_concise: {
    id: "subtitles_concise",
    label: "Subtitles Concise",
    tone: "readable at a glance",
    formality: "medium",
    sentenceLengthPreference: "short",
    terminologyStrictness: "guided",
    punctuationPreferences: "Prefer short clauses; avoid dense punctuation.",
    allowedAdaptationLevel: "adaptive",
    subtitleConstraints: "Respect timing budget and line length.",
    dubbingConstraints: null,
  },
  dubbing_natural: {
    id: "dubbing_natural",
    label: "Dubbing Natural",
    tone: "spoken, natural",
    formality: "medium",
    sentenceLengthPreference: "flexible",
    terminologyStrictness: "guided",
    punctuationPreferences: "Write for the ear; avoid written-only constructs.",
    allowedAdaptationLevel: "adaptive",
    subtitleConstraints: null,
    dubbingConstraints: "Match target speech duration; preserve named-entity pronunciation.",
  },
};

export function listStyleProfiles(): StyleProfile[] {
  return Object.values(STYLE_PROFILES);
}

export function getStyleProfile(id: StyleProfileId): StyleProfile {
  return STYLE_PROFILES[id];
}

export function selectStyleProfileForContent(input: {
  contentType: string;
  domain?: string | null;
}): StyleProfileId {
  if (input.contentType === "subtitle_segment") return "subtitles_concise";
  if (input.contentType === "dubbing_segment" || input.contentType === "voice_script") {
    return "dubbing_natural";
  }
  const domain = (input.domain ?? "").toLowerCase();
  if (domain.includes("learn")) return "learning_educational";
  if (domain.includes("store") || domain.includes("commerce")) {
    return "commerce_product";
  }
  if (domain.includes("legal") || domain.includes("terms")) return "legal_formal";
  if (domain.includes("market") || domain.includes("promo")) {
    return "marketing_friendly";
  }
  return "platform_ui";
}
