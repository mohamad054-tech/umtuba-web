import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../..");

const EXPECT = {
  m35: {
    blob: "ff136ad7b0b7156e73a75caf5f7816901ba5c323",
    sha256: "4c63fa7bcee25b753e83603778c1abecc0aac836bce5ca51945c4c010c4ba6ed",
  },
  m36: {
    blob: "06f631bca75832a06c643fbdecddefb2f414ef91",
    sha256: "d1044767afcdcc2ec0622e781158cd24ebc8ecdecc962efa9e3b7cd5b3d4d8cf",
  },
};

function blobBytes(blob) {
  return execFileSync("git", ["cat-file", "blob", blob], {
    cwd: repo,
    maxBuffer: 20 * 1024 * 1024,
  });
}

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

const b35 = blobBytes(EXPECT.m35.blob);
const b36 = blobBytes(EXPECT.m36.blob);
const h35 = sha256(b35);
const h36 = sha256(b36);
if (h35 !== EXPECT.m35.sha256 || h36 !== EXPECT.m36.sha256) {
  console.error("BLOB_HASH_MISMATCH", { h35, h36 });
  process.exit(2);
}

const verify35 = `
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260935', 'rich_personal_profile_foundation_v1');

DO $umtuba_verify_35$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'bio_long'
  ) THEN
    RAISE EXCEPTION '20260935 verify failed: profiles.bio_long missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'cover_url'
  ) THEN
    RAISE EXCEPTION '20260935 verify failed: profiles.cover_url missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'website_url'
  ) THEN
    RAISE EXCEPTION '20260935 verify failed: profiles.website_url missing';
  END IF;
  IF to_regclass('public.profile_places') IS NULL
     OR to_regclass('public.profile_education') IS NULL
     OR to_regclass('public.profile_work') IS NULL
     OR to_regclass('public.profile_tags') IS NULL
     OR to_regclass('public.profile_milestones') IS NULL
     OR to_regclass('public.profile_links') IS NULL THEN
    RAISE EXCEPTION '20260935 verify failed: one or more rich profile tables missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'can_read_profile_audience'
  ) THEN
    RAISE EXCEPTION '20260935 verify failed: can_read_profile_audience missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20260935'
  ) THEN
    RAISE EXCEPTION '20260935 verify failed: schema_migrations row missing';
  END IF;
END;
$umtuba_verify_35$;
`;

const verify36 = `
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20260936', 'communications_identity_discovery_v1');

DO $umtuba_verify_36$
BEGIN
  IF to_regclass('public.communication_privacy_settings') IS NULL
     OR to_regclass('public.communication_phone_identities') IS NULL
     OR to_regclass('public.communication_contact_sync_state') IS NULL THEN
    RAISE EXCEPTION '20260936 verify failed: communication tables missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'communication_privacy_settings_pkey'
      AND contype = 'p'
      AND conrelid = 'public.communication_privacy_settings'::regclass
  ) THEN
    RAISE EXCEPTION '20260936 verify failed: communication_privacy_settings_pkey missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'discover_user_by_email'
  ) THEN
    RAISE EXCEPTION '20260936 verify failed: discover_user_by_email missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20260936'
  ) THEN
    RAISE EXCEPTION '20260936 verify failed: schema_migrations row missing';
  END IF;
END;
$umtuba_verify_36$;
`;

const header35 = `-- ATOMIC APPLY WRAPPER — 20260935
-- Source: git blob ${EXPECT.m35.blob} from 3ccc164f
-- SHA256: ${h35}
-- NOT a working-tree copy. Exact commit blob + history insert + in-tx verify.

BEGIN;

`;

const header36 = `-- ATOMIC APPLY WRAPPER — 20260936
-- Source: git blob ${EXPECT.m36.blob} from 3ccc164f
-- SHA256: ${h36}
-- NOT a working-tree copy. Exact commit blob + history insert + in-tx verify.

BEGIN;

`;

const footer = `

COMMIT;
`;

const out35 = path.join(here, "apply_20260935_atomic.sql");
const out36 = path.join(here, "apply_20260936_atomic.sql");
const wrap35 = Buffer.concat([Buffer.from(header35, "utf8"), b35, Buffer.from(verify35, "utf8"), Buffer.from(footer, "utf8")]);
const wrap36 = Buffer.concat([Buffer.from(header36, "utf8"), b36, Buffer.from(verify36, "utf8"), Buffer.from(footer, "utf8")]);
fs.writeFileSync(out35, wrap35);
fs.writeFileSync(out36, wrap36);

const read35 = fs.readFileSync(out35);
const read36 = fs.readFileSync(out36);
const hOff35 = Buffer.from(header35, "utf8").length;
const hOff36 = Buffer.from(header36, "utf8").length;
const inner35 = read35.subarray(hOff35, hOff35 + b35.length);
const inner36 = read36.subarray(hOff36, hOff36 + b36.length);

console.log(JSON.stringify({
  inner35_sha256: sha256(inner35),
  inner36_sha256: sha256(inner36),
  inner35_match: sha256(inner35) === h35,
  inner36_match: sha256(inner36) === h36,
  wrap35_bytes: read35.length,
  wrap36_bytes: read36.length,
  out35,
  out36,
}, null, 2));

if (sha256(inner35) !== h35 || sha256(inner36) !== h36) {
  process.exit(3);
}
