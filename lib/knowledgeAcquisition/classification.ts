import type { KnowledgeDomain } from "./types";

const DOMAIN_HINTS: Array<{ domain: KnowledgeDomain; needles: string[] }> = [
  { domain: "translation", needles: ["translation", "locale", "i18n", "subtitle"] },
  { domain: "programming", needles: ["code", "typescript", "python", "api", "sdk"] },
  { domain: "learning", needles: ["course", "lesson", "learner", "assessment"] },
  { domain: "commerce", needles: ["product", "order", "checkout", "seller"] },
  { domain: "creator", needles: ["creator", "post", "publish", "profile"] },
  { domain: "live", needles: ["live", "stream", "session"] },
  { domain: "world", needles: ["world", "place", "city", "map"] },
  { domain: "games", needles: ["game", "play", "score"] },
  { domain: "legal", needles: ["legal", "terms", "privacy policy", "license"] },
  { domain: "medical", needles: ["medical", "clinical", "patient"] },
  { domain: "finance", needles: ["finance", "invoice", "payment", "bank"] },
  { domain: "science", needles: ["science", "research", "experiment"] },
  { domain: "geography", needles: ["geography", "country", "coordinates"] },
  { domain: "media", needles: ["video", "audio", "image", "media"] },
  { domain: "documents", needles: ["document", "manual", "pdf", "handbook"] },
];

export function classifyKnowledgeDomains(input: {
  title: string;
  contentPreview: string;
  hints?: KnowledgeDomain[];
}): KnowledgeDomain[] {
  if (input.hints && input.hints.length > 0) {
    return [...new Set(input.hints)];
  }
  const haystack = `${input.title}\n${input.contentPreview}`.toLowerCase();
  const found = DOMAIN_HINTS.filter((d) =>
    d.needles.some((n) => haystack.includes(n))
  ).map((d) => d.domain);
  return found.length > 0 ? [...new Set(found)] : ["general"];
}
