/**
 * Mention parsing for comments and social text.
 * Uses existing `@username` convention already stored in comment bodies.
 * No schema change — typeahead is a client of people search.
 */

export const MENTION_USERNAME_RE = /@([A-Za-z0-9._]{2,32})/g;

export type MentionSegment =
  | { kind: "text"; value: string }
  | { kind: "mention"; username: string; raw: string };

export function normalizeMentionUsername(username: string): string {
  return username.trim().replace(/^@+/, "").toLowerCase();
}

export function splitMentionText(text: string): MentionSegment[] {
  const segments: MentionSegment[] = [];
  const source = text ?? "";
  const matcher = new RegExp(MENTION_USERNAME_RE.source, "g");
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = matcher.exec(source)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: "text", value: source.slice(lastIndex, match.index) });
    }
    segments.push({
      kind: "mention",
      username: normalizeMentionUsername(match[1] ?? ""),
      raw: match[0],
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < source.length) {
    segments.push({ kind: "text", value: source.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ kind: "text", value: source }];
}

export type ActiveMentionQuery = {
  query: string;
  start: number;
  end: number;
};

/**
 * If the caret sits inside an `@token`, return the typed query for typeahead.
 * Requires at least one character after `@` so people-search min-length can run.
 */
export function getActiveMentionQuery(
  text: string,
  caret: number
): ActiveMentionQuery | null {
  if (caret < 0 || caret > text.length) {
    return null;
  }

  const before = text.slice(0, caret);
  const match = before.match(/(^|[\s([{])@([A-Za-z0-9._]{0,32})$/);
  if (!match) {
    return null;
  }

  const query = match[2] ?? "";
  if (!query) {
    return null;
  }

  const start = caret - query.length - 1;
  return { query, start, end: caret };
}

export function applyMentionInsertion(
  text: string,
  caret: number,
  username: string
): { text: string; caret: number } | null {
  const active = getActiveMentionQuery(text, caret);
  if (!active) {
    return null;
  }

  const handle = `@${normalizeMentionUsername(username)} `;
  const next = `${text.slice(0, active.start)}${handle}${text.slice(active.end)}`;
  return { text: next, caret: active.start + handle.length };
}
