import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const art = path.resolve(
  "C:/Users/1/Desktop/umtuba/worktrees/DESKTOP-UMTUBA-PRODUCTION-HOME-SUPABASE-ENV-P0-V1/docs/ops/production-home-supabase-env-p0-v1"
);

const envChunk = readFileSync(
  path.join(art, "chunks/__next_static_chunks_0ztghknfw-iyv.js"),
  "utf8"
);
const callerChunk = readFileSync(
  path.join(art, "chunks/__next_static_chunks_14r5yx8u_5qpq.js"),
  "utf8"
);

function count(re, text) {
  return (text.match(re) || []).length;
}

const inlinedUrlAssign = /NEXT_PUBLIC_SUPABASE_URL:\s*["']https?:\/\//.test(
  envChunk
);
const inlinedPublishableAssign =
  /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:\s*["']/.test(envChunk);
const inlinedAnonAssign = /NEXT_PUBLIC_SUPABASE_ANON_KEY:\s*["']/.test(
  envChunk
);
const processEnvUrlShape =
  /NEXT_PUBLIC_SUPABASE_URL:\s*[A-Za-z_$]/.test(envChunk) && !inlinedUrlAssign;

const report = {
  envChunkBytes: envChunk.length,
  callerChunkBytes: callerChunk.length,
  supabaseUrlMessageCount: count(/Supabase URL is not configured/g, envChunk),
  nextPublicUrlNameCount: count(/NEXT_PUBLIC_SUPABASE_URL/g, envChunk),
  nextPublicPublishableNameCount: count(
    /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/g,
    envChunk
  ),
  nextPublicAnonNameCount: count(/NEXT_PUBLIC_SUPABASE_ANON_KEY/g, envChunk),
  httpsSupabaseHostLiteralCount: count(
    /https:\/\/[a-z0-9.-]+\.supabase\.co/gi,
    envChunk
  ),
  bareSupabaseCoCount: count(/supabase\.co/g, envChunk),
  INLINED_NEXT_PUBLIC_SUPABASE_URL: inlinedUrlAssign ? "YES" : "NO",
  INLINED_NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: inlinedPublishableAssign
    ? "YES"
    : "NO",
  INLINED_NEXT_PUBLIC_SUPABASE_ANON_KEY: inlinedAnonAssign ? "YES" : "NO",
  PROCESS_ENV_RUNTIME_SHAPE: processEnvUrlShape ? "YES" : "NO",
  CALLER_HAS_POST_COUNTERS: callerChunk.includes("post-counters") ? "YES" : "NO",
  CALLER_HAS_HTTPS_SUPABASE_HOST: /https:\/\/[a-z0-9.-]+\.supabase\.co/i.test(
    callerChunk
  )
    ? "YES"
    : "NO",
};

writeFileSync(
  path.join(art, "chunk-inline-report.json"),
  JSON.stringify(report, null, 2),
  "utf8"
);
console.log(JSON.stringify(report, null, 2));
