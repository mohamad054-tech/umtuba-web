"use client";

import { useMemo, useState, useTransition } from "react";
import type {
  CreatorAiSession,
  CreatorContentResult,
  CreatorDraft,
  CreatorHistoryEntry,
  CreatorOutputKind,
  CreatorPromptTemplate,
  CreatorStudioOperation,
} from "../../../lib/ai/creatorStudio";

type Props = {
  templates: CreatorPromptTemplate[];
  initialSession: CreatorAiSession;
  initialDrafts: CreatorDraft[];
  initialHistory: CreatorHistoryEntry[];
  runAction: (input: {
    sessionId: string;
    templateId: string;
    operation: CreatorStudioOperation;
    prompt: string;
    locale: string;
    targetLocale: string;
    outputKind: CreatorOutputKind;
    structuredOutput: boolean;
    draftId: string | null;
  }) => Promise<{
    ok: boolean;
    error?: string;
    result?: CreatorContentResult;
    drafts?: CreatorDraft[];
    history?: CreatorHistoryEntry[];
    favorites?: string[];
  }>;
  toggleFavoriteAction: (input: {
    sessionId: string;
    templateId: string;
  }) => Promise<{ favorites: string[] }>;
  createDraftAction: (input: {
    sessionId: string;
    templateId: string;
    title: string;
    prompt: string;
  }) => Promise<{ draft: CreatorDraft; drafts: CreatorDraft[] }>;
};

const OPERATIONS: CreatorStudioOperation[] = [
  "draft",
  "rewrite",
  "suggest",
  "generate_title",
  "generate_description",
  "suggest_hashtags",
  "seo_metadata",
  "translate",
  "moderation_preview",
];

export default function CreatorStudioClient(props: Props) {
  const [templateId, setTemplateId] = useState(
    props.templates[0]?.templateId ?? ""
  );
  const [operation, setOperation] =
    useState<CreatorStudioOperation>("draft");
  const [prompt, setPrompt] = useState("");
  const [locale, setLocale] = useState(props.initialSession.locale);
  const [targetLocale, setTargetLocale] = useState("ar");
  const [outputKind, setOutputKind] =
    useState<CreatorOutputKind>("plain_text");
  const [structured, setStructured] = useState(false);
  const [favorites, setFavorites] = useState(
    props.initialSession.favoriteTemplateIds
  );
  const [drafts, setDrafts] = useState(props.initialDrafts);
  const [history, setHistory] = useState(props.initialHistory);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(
    props.initialSession.activeDraftId
  );
  const [lastResult, setLastResult] = useState<CreatorContentResult | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const template = useMemo(
    () => props.templates.find((t) => t.templateId === templateId) ?? null,
    [props.templates, templateId]
  );

  return (
    <div className="mt-6 space-y-4">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          Creator Space
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">
          AI Creator Studio
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Foundation only — contracts, drafts, and Unified Execution planning.
          No live model output.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-white/40">
              Template
            </span>
            <select
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              {props.templates.map((t) => (
                <option key={t.templateId} value={t.templateId}>
                  {t.displayName}
                  {favorites.includes(t.templateId) ? " ★" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-white/40">
              Operation
            </span>
            <select
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2"
              value={operation}
              onChange={(e) =>
                setOperation(e.target.value as CreatorStudioOperation)
              }
            >
              {OPERATIONS.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-white/40">
              Locale
            </span>
            <input
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-white/40">
              Target locale (translate)
            </span>
            <input
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2"
              value={targetLocale}
              onChange={(e) => setTargetLocale(e.target.value)}
            />
          </label>

          <label className="block text-sm md:col-span-2">
            <span className="text-xs font-bold uppercase tracking-wider text-white/40">
              Output kind
            </span>
            <select
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2"
              value={outputKind}
              onChange={(e) =>
                setOutputKind(e.target.value as CreatorOutputKind)
              }
            >
              {(template?.supportedOutputKinds ?? ["plain_text"]).map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 block text-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-white/40">
            Prompt
          </span>
          <textarea
            className="mt-1 min-h-28 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want to create…"
          />
        </label>

        <label className="mt-3 flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={structured}
            onChange={(e) => setStructured(e.target.checked)}
          />
          Structured output contract
        </label>

        {template ? (
          <p className="mt-3 text-xs text-white/40">
            Capability {template.capabilityId} · outputs{" "}
            {template.supportedOutputKinds.join(", ")}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            className="watch-focus-ring rounded-full border border-blue-400/30 bg-blue-500/15 px-4 py-2 text-xs font-bold text-blue-100 disabled:opacity-50"
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const res = await props.runAction({
                  sessionId: props.initialSession.sessionId,
                  templateId,
                  operation,
                  prompt,
                  locale,
                  targetLocale,
                  outputKind,
                  structuredOutput: structured || outputKind === "structured_json",
                  draftId: activeDraftId,
                });
                if (!res.ok) {
                  setError(res.error ?? "Request failed.");
                  return;
                }
                setLastResult(res.result ?? null);
                if (res.drafts) setDrafts(res.drafts);
                if (res.history) setHistory(res.history);
              });
            }}
          >
            Run via Unified Execution
          </button>
          <button
            type="button"
            className="watch-focus-ring rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-bold text-white/80"
            onClick={() => {
              startTransition(async () => {
                const res = await props.toggleFavoriteAction({
                  sessionId: props.initialSession.sessionId,
                  templateId,
                });
                setFavorites(res.favorites);
              });
            }}
          >
            Toggle favorite
          </button>
          <button
            type="button"
            className="watch-focus-ring rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-bold text-white/80"
            onClick={() => {
              startTransition(async () => {
                const res = await props.createDraftAction({
                  sessionId: props.initialSession.sessionId,
                  templateId,
                  title: `${template?.displayName ?? "Draft"} · ${new Date().toLocaleString()}`,
                  prompt,
                });
                setDrafts(res.drafts);
                setActiveDraftId(res.draft.draftId);
              });
            }}
          >
            Save draft
          </button>
        </div>

        {error ? (
          <p className="mt-4 text-sm text-rose-300">{error}</p>
        ) : null}

        {lastResult ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
            <p className="font-bold text-white">
              Result · {lastResult.status} · unified {lastResult.unifiedResult}
            </p>
            <p className="mt-2 text-white/60">
              {lastResult.mockOutput ?? lastResult.stopReason ?? "No mock output."}
            </p>
            {lastResult.structuredMock ? (
              <pre className="mt-3 overflow-auto text-xs text-white/45">
                {JSON.stringify(lastResult.structuredMock, null, 2)}
              </pre>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
          <h2 className="text-lg font-black">Drafts</h2>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            {drafts.length === 0 ? (
              <li>No drafts yet.</li>
            ) : (
              drafts.map((d) => (
                <li key={d.draftId}>
                  <button
                    type="button"
                    className="text-left hover:text-white"
                    onClick={() => setActiveDraftId(d.draftId)}
                  >
                    {d.title} · v{d.latestVersion}
                    {activeDraftId === d.draftId ? " · active" : ""}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
          <h2 className="text-lg font-black">History</h2>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            {history.length === 0 ? (
              <li>No history yet.</li>
            ) : (
              history
                .slice()
                .reverse()
                .map((h) => (
                  <li key={h.historyId}>
                    {h.operation} · {h.templateId} · {h.resultStatus}
                  </li>
                ))
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
