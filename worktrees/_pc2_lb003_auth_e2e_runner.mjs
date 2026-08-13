/**
 * PC2 LB003 authenticated learner E2E runner (sanitized output only).
 * NEVER prints email/password/tokens/cookies/session payloads.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const WORKSPACE = process.cwd();
const LOOKUP =
  process.env.PC2_LOOKUP_PATH ||
  "P:\\secrets\\lb003_learner_auth.env";
const OUT =
  process.env.PC2_LB003_EVIDENCE_OUT ||
  path.join(WORKSPACE, "worktrees", "_PC2_LB003_E2E_V2_evidence.json");

function parseEnvFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const map = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || /^\s*#/.test(line)) continue;
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2];
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    map[m[1]] = v;
  }
  return map;
}

function loadDotEnvLocal() {
  const p = path.join(WORKSPACE, ".env.local");
  if (!fs.existsSync(p)) return {};
  return parseEnvFile(p);
}

function redactErr(e) {
  const msg = String(e?.message || e || "unknown");
  return msg
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(/eyJ[A-Za-z0-9._-]{10,}/g, "[REDACTED_JWT]")
    .slice(0, 240);
}

function stamp(obj) {
  return { ...obj, at: new Date().toISOString() };
}

async function main() {
  const evidence = {
    TASK_ID: "PC2_LB003_END_TO_END_FINAL_EXECUTION_V2",
    PROJECT_REF_EXPECTED: "tgucwnjwoyeqoxqaxmew",
    RAW_SECRETS_EXPOSED: "NO",
    SECRET_VALUES_PRINTED: "NO",
    LOOKUP_PATH_USED: LOOKUP,
    steps: {},
  };

  try {
    if (!fs.existsSync(LOOKUP)) {
      evidence.steps.fixture_lookup = stamp({
        ok: false,
        class: "LOOKUP_ABSENT",
      });
      throw new Error("LOOKUP_ABSENT");
    }

    const secrets = parseEnvFile(LOOKUP);
    const email = secrets.UMTUBA_LEARNING_E2E_LEARNER_EMAIL || "";
    const password = secrets.UMTUBA_LEARNING_E2E_LEARNER_PASSWORD || "";
    const projectRef = secrets.PROJECT_REF || "";

    evidence.steps.fixture_lookup = stamp({
      ok: true,
      email_length_gt_zero: email.length > 0,
      password_length_gt_zero: password.length > 0,
      email_e2e_learner_pattern: /e2e-learner/i.test(email),
      project_ref_in_file: projectRef || null,
      fixture_project_match: projectRef === "tgucwnjwoyeqoxqaxmew",
      teacher_keys_present: Boolean(
        secrets.UMTUBA_LEARNING_E2E_TEACHER_EMAIL ||
          secrets.UMTUBA_LEARNING_E2E_TEACHER_PASSWORD
      ),
    });

    if (!email || !password) {
      evidence.steps.fixture_consumable = stamp({
        ok: false,
        class: "REQUIRED_KEYS_EMPTY",
      });
      throw new Error("REQUIRED_KEYS_EMPTY");
    }
    if (projectRef && projectRef !== "tgucwnjwoyeqoxqaxmew") {
      evidence.steps.fixture_consumable = stamp({
        ok: false,
        class: "PROJECT_MISMATCH",
      });
      throw new Error("PROJECT_MISMATCH");
    }

    const dotenv = loadDotEnvLocal();
    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL || dotenv.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      dotenv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      dotenv.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    evidence.steps.public_client_config = stamp({
      ok: Boolean(url && key),
      url_present: Boolean(url),
      publishable_or_anon_key_present: Boolean(key),
      url_host_has_project_ref: Boolean(
        url && String(url).includes("tgucwnjwoyeqoxqaxmew")
      ),
    });
    if (!url || !key) throw new Error("PUBLIC_CLIENT_CONFIG_ABSENT");

    const authed = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const login = await authed.auth.signInWithPassword({ email, password });
    if (login.error || !login.data?.user?.id || !login.data?.session) {
      evidence.steps.auth_login = stamp({
        ok: false,
        class: "AUTH_LOGIN_FAIL",
        error: redactErr(login.error),
        has_user: Boolean(login.data?.user),
        has_session: Boolean(login.data?.session),
      });
      throw new Error("AUTH_LOGIN_FAIL");
    }

    const userId = login.data.user.id;
    const role =
      login.data.user.role ||
      login.data.user.app_metadata?.role ||
      login.data.user.user_metadata?.role ||
      null;

    evidence.steps.auth_login = stamp({
      ok: true,
      auth_user_id: userId,
      supabase_role: role || "authenticated_default",
      email_confirmed_at_present: Boolean(login.data.user.email_confirmed_at),
    });
    evidence.AUTH_USER_ID = userId;

    // Fail-closed: anon must not read owner completion RPCs as this user
    const anon = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const anonCerts = await anon.rpc("get_my_learning_certificates");
    const anonTranscript = await anon.rpc("get_my_learning_transcript");
    evidence.steps.auth_fail_closed = stamp({
      ok:
        Boolean(anonCerts.error || !anonCerts.data) &&
        Boolean(anonTranscript.error || !anonTranscript.data),
      anon_certs_error: Boolean(anonCerts.error),
      anon_transcript_error: Boolean(anonTranscript.error),
      anon_certs_error_class: anonCerts.error
        ? redactErr(anonCerts.error)
        : null,
    });

    // Learner enrollment entitlement surface
    const enrollments = await authed
      .from("learning_enrollments")
      .select("id,status,target_type,course_id,program_id,space_id,updated_at")
      .eq("user_id", userId)
      .limit(50);

    if (enrollments.error) {
      evidence.steps.learner_enrollments = stamp({
        ok: false,
        class: "ENROLLMENT_READ_FAIL",
        error: redactErr(enrollments.error),
      });
    } else {
      const rows = enrollments.data || [];
      const active = rows.filter((r) => r.status === "active");
      evidence.steps.learner_enrollments = stamp({
        ok: true,
        total_count: rows.length,
        active_count: active.length,
        statuses: [...new Set(rows.map((r) => r.status))],
        target_types: [...new Set(rows.map((r) => r.target_type))],
        course_ids_present: rows.filter((r) => r.course_id).length,
        program_ids_present: rows.filter((r) => r.program_id).length,
      });
      evidence.SAMPLE_COURSE_ID = active.find((r) => r.course_id)?.course_id || null;
    }

    // Transcript + certificates (authenticated)
    const transcript1 = await authed.rpc("get_my_learning_transcript");
    const certs1 = await authed.rpc("get_my_learning_certificates");
    evidence.steps.transcript_read_1 = stamp({
      ok: !transcript1.error,
      error: transcript1.error ? redactErr(transcript1.error) : null,
      entry_count:
        transcript1.data && typeof transcript1.data === "object"
          ? Number(transcript1.data.entry_count ?? 0)
          : null,
      has_data: transcript1.data != null,
    });
    evidence.steps.certificates_read_1 = stamp({
      ok: !certs1.error,
      error: certs1.error ? redactErr(certs1.error) : null,
      row_count: Array.isArray(certs1.data) ? certs1.data.length : null,
      has_data: certs1.data != null,
    });

    // Course progress bundle for first active course (if any)
    const courseId = evidence.SAMPLE_COURSE_ID;
    if (courseId) {
      const bundle = await authed.rpc("get_my_learning_course_progress_bundle", {
        p_course_id: courseId,
      });
      evidence.steps.course_progress_bundle = stamp({
        ok: !bundle.error,
        error: bundle.error ? redactErr(bundle.error) : null,
        has_data: bundle.data != null,
        course_id: courseId,
      });

      // Attempt finalize (may be not_eligible — report truthfully)
      const finalize = await authed.rpc(
        "finalize_my_learning_course_completion",
        { p_course_id: courseId }
      );
      evidence.steps.finalize_completion = stamp({
        ok: !finalize.error,
        error: finalize.error ? redactErr(finalize.error) : null,
        status:
          finalize.data && typeof finalize.data === "object"
            ? finalize.data.status || null
            : null,
        reason:
          finalize.data && typeof finalize.data === "object"
            ? finalize.data.reason || null
            : null,
        certificate_issued:
          finalize.data && typeof finalize.data === "object"
            ? Boolean(finalize.data.certificate_issued)
            : null,
      });

      // Idempotent re-finalize
      const finalize2 = await authed.rpc(
        "finalize_my_learning_course_completion",
        { p_course_id: courseId }
      );
      evidence.steps.finalize_idempotent = stamp({
        ok: !finalize2.error,
        error: finalize2.error ? redactErr(finalize2.error) : null,
        status:
          finalize2.data && typeof finalize2.data === "object"
            ? finalize2.data.status || null
            : null,
      });
    } else {
      evidence.steps.course_progress_bundle = stamp({
        ok: false,
        class: "NO_ACTIVE_COURSE_ENROLLMENT",
        skipped: true,
      });
      evidence.steps.finalize_completion = stamp({
        ok: false,
        class: "NO_ACTIVE_COURSE_ENROLLMENT",
        skipped: true,
      });
      evidence.steps.finalize_idempotent = stamp({
        ok: false,
        class: "NO_ACTIVE_COURSE_ENROLLMENT",
        skipped: true,
      });
    }

    // Persistence re-read
    const transcript2 = await authed.rpc("get_my_learning_transcript");
    const certs2 = await authed.rpc("get_my_learning_certificates");
    const enrollments2 = await authed
      .from("learning_enrollments")
      .select("id,status,course_id,updated_at")
      .eq("user_id", userId)
      .limit(50);

    const t1c = evidence.steps.transcript_read_1.entry_count;
    const t2c =
      transcript2.data && typeof transcript2.data === "object"
        ? Number(transcript2.data.entry_count ?? 0)
        : null;
    const c1c = evidence.steps.certificates_read_1.row_count;
    const c2c = Array.isArray(certs2.data) ? certs2.data.length : null;
    const e1c = evidence.steps.learner_enrollments?.total_count ?? null;
    const e2c = enrollments2.error ? null : (enrollments2.data || []).length;

    evidence.steps.persistence_reread = stamp({
      ok:
        !transcript2.error &&
        !certs2.error &&
        !enrollments2.error &&
        t1c === t2c &&
        c1c === c2c &&
        e1c === e2c,
      transcript_stable: t1c === t2c,
      certificates_stable: c1c === c2c,
      enrollments_stable: e1c === e2c,
      transcript_error: transcript2.error ? redactErr(transcript2.error) : null,
      certificates_error: certs2.error ? redactErr(certs2.error) : null,
      enrollments_error: enrollments2.error
        ? redactErr(enrollments2.error)
        : null,
    });

    // Sign out cleanup
    await authed.auth.signOut({ scope: "local" });
    evidence.steps.sign_out = stamp({ ok: true });

    // Aggregate gates
    const authOk = evidence.steps.auth_login.ok === true;
    const failClosedOk = evidence.steps.auth_fail_closed.ok === true;
    const enrollOk = evidence.steps.learner_enrollments.ok === true;
    const transcriptOk = evidence.steps.transcript_read_1.ok === true;
    const certsOk = evidence.steps.certificates_read_1.ok === true;
    const persistOk = evidence.steps.persistence_reread.ok === true;
    const hasCourse = Boolean(courseId);
    const progressOk = hasCourse
      ? evidence.steps.course_progress_bundle.ok === true
      : false;
    const finalizeCallable =
      hasCourse && evidence.steps.finalize_completion.error == null;

    evidence.AUTHENTICATED_LEARNER_E2E =
      authOk && failClosedOk && enrollOk && transcriptOk && certsOk
        ? "PASS"
        : "FAIL";
    evidence.LEARNER_ROLE_PATH =
      authOk && enrollOk && transcriptOk ? "PASS" : "FAIL";
    evidence.RUNTIME_SMOKE_LEARNER_CORE =
      authOk &&
      failClosedOk &&
      enrollOk &&
      transcriptOk &&
      certsOk &&
      (hasCourse ? progressOk : true)
        ? hasCourse
          ? "PASS"
          : "PASS_AUTH_EMPTY_ENROLLMENT"
        : "FAIL";
    evidence.PERSISTENCE = persistOk ? "PASS" : "FAIL";
    evidence.CERTIFICATION =
      hasCourse && finalizeCallable
        ? evidence.steps.finalize_completion.certificate_issued
          ? "PASS"
          : evidence.steps.finalize_completion.status
            ? `OBSERVED_${String(evidence.steps.finalize_completion.status).toUpperCase()}`
            : "PASS_RPC_CALLABLE"
        : hasCourse
          ? "FAIL"
          : "BLOCKED_NO_ACTIVE_COURSE_ENROLLMENT";
    evidence.TEACHER_PATH = "NOT_REQUIRED";
    evidence.HAS_ACTIVE_COURSE_ENROLLMENT = hasCourse;

  } catch (e) {
    evidence.FATAL = redactErr(e);
    if (!evidence.AUTHENTICATED_LEARNER_E2E) {
      evidence.AUTHENTICATED_LEARNER_E2E = "FAIL";
    }
  }

  fs.writeFileSync(OUT, JSON.stringify(evidence, null, 2), "utf8");
  // Console: stamps only, never secrets
  const safe = {
    AUTHENTICATED_LEARNER_E2E: evidence.AUTHENTICATED_LEARNER_E2E,
    LEARNER_ROLE_PATH: evidence.LEARNER_ROLE_PATH,
    RUNTIME_SMOKE_LEARNER_CORE: evidence.RUNTIME_SMOKE_LEARNER_CORE,
    PERSISTENCE: evidence.PERSISTENCE,
    CERTIFICATION: evidence.CERTIFICATION,
    TEACHER_PATH: evidence.TEACHER_PATH,
    HAS_ACTIVE_COURSE_ENROLLMENT: evidence.HAS_ACTIVE_COURSE_ENROLLMENT,
    AUTH_USER_ID: evidence.AUTH_USER_ID || null,
    FATAL: evidence.FATAL || null,
    fixture_lookup_ok: evidence.steps?.fixture_lookup?.ok,
    auth_login_ok: evidence.steps?.auth_login?.ok,
    auth_fail_closed_ok: evidence.steps?.auth_fail_closed?.ok,
    enrollments_ok: evidence.steps?.learner_enrollments?.ok,
    enrollments_total: evidence.steps?.learner_enrollments?.total_count,
    enrollments_active: evidence.steps?.learner_enrollments?.active_count,
    OUT,
  };
  console.log(JSON.stringify(safe, null, 2));
}

main().catch((e) => {
  console.log(
    JSON.stringify(
      {
        AUTHENTICATED_LEARNER_E2E: "FAIL",
        FATAL: String(e?.message || e).slice(0, 240),
        RAW_SECRETS_EXPOSED: "NO",
      },
      null,
      2
    )
  );
  process.exit(1);
});
