"use client";

import { useMemo, useState } from "react";
import type { PageAccess, PageDomain, PageRegistryEntry } from "../../../../lib/platform/pageRegistry";

const DOMAINS: Array<PageDomain | "all"> = [
  "all",
  "platform",
  "identity",
  "profile",
  "content",
  "commerce",
  "learning",
  "collaboration",
  "ai",
  "admin",
  "settings",
  "operations",
];

const ACCESS: Array<PageAccess | "all"> = [
  "all",
  "public",
  "authenticated",
  "role_gated",
  "admin",
];

function statusClass(status: PageRegistryEntry["status"]): string {
  switch (status) {
    case "active":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
    case "legacy":
      return "border-amber-400/30 bg-amber-400/10 text-amber-100";
    case "deprecated":
      return "border-rose-400/30 bg-rose-400/10 text-rose-100";
    case "experimental":
      return "border-sky-400/30 bg-sky-400/10 text-sky-100";
    default:
      return "border-white/10 bg-white/5 text-white/70";
  }
}

export default function PageRegistryViewer({
  pages,
}: {
  pages: PageRegistryEntry[];
}) {
  const [domain, setDomain] = useState<(typeof DOMAINS)[number]>("all");
  const [access, setAccess] = useState<(typeof ACCESS)[number]>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pages.filter((page) => {
      if (domain !== "all" && page.domain !== domain) return false;
      if (access !== "all" && page.access !== access) return false;
      if (!q) return true;
      return (
        page.title.toLowerCase().includes(q) ||
        page.path.toLowerCase().includes(q) ||
        page.id.toLowerCase().includes(q)
      );
    });
  }, [pages, domain, access, query]);

  return (
    <div className="mt-6 space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block text-xs font-bold uppercase tracking-[0.16em] text-white/45">
          Domain
          <select
            className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b0b18] px-3 py-2 text-sm text-white"
            value={domain}
            onChange={(e) => setDomain(e.target.value as (typeof DOMAINS)[number])}
          >
            {DOMAINS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-bold uppercase tracking-[0.16em] text-white/45">
          Access
          <select
            className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b0b18] px-3 py-2 text-sm text-white"
            value={access}
            onChange={(e) => setAccess(e.target.value as (typeof ACCESS)[number])}
          >
            {ACCESS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-bold uppercase tracking-[0.16em] text-white/45">
          Search
          <input
            className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b0b18] px-3 py-2 text-sm text-white"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title or path"
          />
        </label>
      </div>

      <p className="text-sm text-white/50">
        Showing {filtered.length} of {pages.length} pages (read-only).
      </p>

      <ul className="divide-y divide-white/10 overflow-hidden rounded-[24px] border border-white/10">
        {filtered.map((page) => (
          <li
            key={page.id}
            className="grid gap-2 bg-[#080816]/70 px-4 py-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] md:items-center"
          >
            <div>
              <p className="text-sm font-bold text-white">{page.title}</p>
              <p className="font-mono text-xs text-white/45">{page.path}</p>
            </div>
            <div className="text-xs text-white/55">
              <span>{page.domain}</span>
              <span className="mx-2 text-white/20">·</span>
              <span>{page.access}</span>
              {page.dynamic ? (
                <>
                  <span className="mx-2 text-white/20">·</span>
                  <span>dynamic</span>
                </>
              ) : null}
              {page.orphan ? (
                <>
                  <span className="mx-2 text-white/20">·</span>
                  <span>orphan</span>
                </>
              ) : null}
            </div>
            <span
              className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${statusClass(page.status)}`}
            >
              {page.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
