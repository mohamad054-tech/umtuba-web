#!/usr/bin/env node
/**
 * Idempotent Learning E2E fixture provisioner.
 *
 * Creates/reuses (under namespace UMTUBA_LEARNING_E2E_V1):
 * - instructor + learner Auth users (Admin API; never INSERT into auth.users via SQL)
 * - space → program → course → section → open lesson + locked lesson
 * - published content block on open lesson
 * - point-cost lock on locked lesson
 * - active course enrollment for the learner
 *
 * Prints fixture IDs only (JSON). Never prints passwords or service-role keys.
 *
 * Exit:
 *   0 — fixtures ready (IDs printed)
 *   2 — BLOCKED_ENV / BLOCKED_PROD (missing/refused)
 *   1 — FAIL (provision error)
 *
 * Usage:
 *   node scripts/learning-e2e/provision-fixtures.mjs
 */

import { createClient } from "@supabase/supabase-js";
import {
  FIXTURE_COURSE_SLUG,
  FIXTURE_LESSON_LOCKED_SLUG,
  FIXTURE_LESSON_OPEN_SLUG,
  FIXTURE_NS,
  FIXTURE_PROGRAM_SLUG,
  FIXTURE_SECTION_SLUG,
  FIXTURE_SPACE_SLUG,
  resolveProvisionEnv,
} from "./provision-env.mjs";

function fail(message) {
  console.error("LEARNING_E2E_PROVISION FAIL");
  console.error(message);
  process.exit(1);
}

function blocked(code, missing) {
  console.error(code);
  console.error(
    `Learning E2E fixture provision blocked — ${missing.join(", ")}`
  );
  process.exit(2);
}

function asId(payload, key = "id") {
  if (!payload || typeof payload !== "object") return null;
  const value = payload[key] ?? payload[`${key}`];
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function ensureAuthUser(admin, { email, password, role }) {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listed.error) {
    throw new Error(`listUsers failed (${role})`);
  }
  const existing = (listed.data?.users ?? []).find(
    (u) => (u.email || "").toLowerCase() === email.toLowerCase()
  );
  if (existing?.id) {
    // Keep password aligned for deterministic login (idempotent upsert).
    const updated = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: {
        ...(existing.user_metadata ?? {}),
        umtuba_e2e_ns: FIXTURE_NS,
        umtuba_e2e_role: role,
      },
    });
    if (updated.error) throw new Error(`updateUser failed (${role})`);
    return existing.id;
  }

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      umtuba_e2e_ns: FIXTURE_NS,
      umtuba_e2e_role: role,
    },
  });
  if (created.error || !created.data?.user?.id) {
    throw new Error(`createUser failed (${role})`);
  }
  return created.data.user.id;
}

async function signIn(url, anonKey, email, password) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.session?.access_token) {
    throw new Error("signInWithPassword failed");
  }
  return createClient(url, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function rpcOk(client, name, args) {
  const { data, error } = await client.rpc(name, args);
  if (error) {
    throw new Error(`${name}: ${error.message || "rpc error"}`);
  }
  return data;
}

async function findBySlug(admin, table, slug, filters = {}) {
  let q = admin.from(table).select("id, slug, status").eq("slug", slug);
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
  const { data, error } = await q.maybeSingle();
  if (error && error.code !== "PGRST116") {
    throw new Error(`lookup ${table}: ${error.message}`);
  }
  return data?.id ?? null;
}

async function main() {
  const resolved = resolveProvisionEnv();
  if (!resolved.ok) {
    blocked(resolved.code, resolved.missing);
  }
  const { config } = resolved;
  console.log("LEARNING_E2E_PROVISION starting");
  console.log(`envClass=${config.envClass}`);
  console.log(`baseUrl=${config.baseUrl}`);
  console.log(`ns=${config.ns}`);
  // Never log emails/passwords/keys.

  const admin = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let learnerUserId;
  let instructorUserId;
  try {
    instructorUserId = await ensureAuthUser(admin, {
      email: config.instructorEmail,
      password: config.instructorPassword,
      role: "instructor",
    });
    learnerUserId = await ensureAuthUser(admin, {
      email: config.email,
      password: config.password,
      role: "learner",
    });
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }

  let instructor;
  try {
    instructor = await signIn(
      config.supabaseUrl,
      config.anonKey,
      config.instructorEmail,
      config.instructorPassword
    );
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }

  try {
    let spaceId = await findBySlug(admin, "learning_spaces", FIXTURE_SPACE_SLUG);
    if (!spaceId) {
      const created = await rpcOk(instructor, "create_learning_space", {
        p_slug: FIXTURE_SPACE_SLUG,
        p_name: `${FIXTURE_NS} Space`,
        p_description: "Isolated Learning browser E2E fixture space",
        p_mode: "personal_learning",
        p_visibility: "private",
        p_default_language: "en",
      });
      spaceId = asId(created) ?? asId(created, "space_id");
      if (!spaceId) throw new Error("create_learning_space returned no id");
      await rpcOk(instructor, "publish_learning_space", { p_space_id: spaceId });
    }

    let programId = await findBySlug(
      admin,
      "learning_programs",
      FIXTURE_PROGRAM_SLUG,
      { space_id: spaceId }
    );
    if (!programId) {
      const created = await rpcOk(instructor, "create_learning_program", {
        p_space_id: spaceId,
        p_slug: FIXTURE_PROGRAM_SLUG,
        p_name: `${FIXTURE_NS} Program`,
        p_format: "self_paced",
        p_description: "Isolated Learning browser E2E fixture program",
        p_visibility: "private",
        p_default_language: "en",
      });
      programId = asId(created) ?? asId(created, "program_id");
      if (!programId) throw new Error("create_learning_program returned no id");
      await rpcOk(instructor, "publish_learning_program", {
        p_program_id: programId,
      });
    }

    let courseId = await findBySlug(
      admin,
      "learning_courses",
      FIXTURE_COURSE_SLUG,
      { program_id: programId }
    );
    if (!courseId) {
      const created = await rpcOk(instructor, "create_learning_course", {
        p_program_id: programId,
        p_slug: FIXTURE_COURSE_SLUG,
        p_name: `${FIXTURE_NS} Course`,
        p_description: "Isolated Learning browser E2E fixture course",
        p_visibility: "private",
        p_default_language: "en",
      });
      courseId = asId(created) ?? asId(created, "course_id");
      if (!courseId) throw new Error("create_learning_course returned no id");
      await rpcOk(instructor, "publish_learning_course", {
        p_course_id: courseId,
      });
    }

    let sectionId = await findBySlug(
      admin,
      "learning_sections",
      FIXTURE_SECTION_SLUG,
      { course_id: courseId }
    );
    if (!sectionId) {
      const created = await rpcOk(instructor, "create_learning_section", {
        p_course_id: courseId,
        p_slug: FIXTURE_SECTION_SLUG,
        p_name: `${FIXTURE_NS} Section`,
        p_description: "Isolated Learning browser E2E fixture section",
        p_visibility: "private",
        p_default_language: "en",
      });
      sectionId = asId(created) ?? asId(created, "section_id");
      if (!sectionId) throw new Error("create_learning_section returned no id");
      await rpcOk(instructor, "publish_learning_section", {
        p_section_id: sectionId,
      });
    }

    let lessonId = await findBySlug(
      admin,
      "learning_lessons",
      FIXTURE_LESSON_OPEN_SLUG,
      { section_id: sectionId }
    );
    if (!lessonId) {
      const created = await rpcOk(instructor, "create_learning_lesson", {
        p_section_id: sectionId,
        p_slug: FIXTURE_LESSON_OPEN_SLUG,
        p_name: `${FIXTURE_NS} Open Lesson`,
        p_description: "Accessible published lesson for Learning E2E",
        p_visibility: "private",
        p_default_language: "en",
      });
      lessonId = asId(created) ?? asId(created, "lesson_id");
      if (!lessonId) throw new Error("create open lesson returned no id");
      await rpcOk(instructor, "publish_learning_lesson", {
        p_lesson_id: lessonId,
      });
      await rpcOk(instructor, "create_learning_lesson_content_block", {
        p_lesson_id: lessonId,
        p_block_type: "rich_text",
        p_content: {
          text: "UMTUBA Learning E2E foundation content block.",
          format: "plain",
        },
      });
      // Publish newest block for this lesson (idempotent enough for foundation).
      const { data: blocks } = await admin
        .from("learning_lesson_content_blocks")
        .select("id, status")
        .eq("lesson_id", lessonId)
        .order("position", { ascending: true });
      for (const block of blocks ?? []) {
        if (block.status !== "published") {
          await rpcOk(instructor, "publish_learning_lesson_content_block", {
            p_content_block_id: block.id,
          });
        }
      }
    }

    let lockedLessonId = await findBySlug(
      admin,
      "learning_lessons",
      FIXTURE_LESSON_LOCKED_SLUG,
      { section_id: sectionId }
    );
    if (!lockedLessonId) {
      const created = await rpcOk(instructor, "create_learning_lesson", {
        p_section_id: sectionId,
        p_slug: FIXTURE_LESSON_LOCKED_SLUG,
        p_name: `${FIXTURE_NS} Locked Lesson`,
        p_description: "Locked lesson fixture for Learning E2E fail-closed",
        p_visibility: "private",
        p_default_language: "en",
      });
      lockedLessonId = asId(created) ?? asId(created, "lesson_id");
      if (!lockedLessonId) throw new Error("create locked lesson returned no id");
      await rpcOk(instructor, "publish_learning_lesson", {
        p_lesson_id: lockedLessonId,
      });
      await rpcOk(instructor, "set_learning_lesson_point_cost", {
        p_lesson_id: lockedLessonId,
        p_unlock_cost: 999999,
        p_enabled: true,
      });
    } else {
      // Ensure lock stays enabled on reuse.
      await rpcOk(instructor, "set_learning_lesson_point_cost", {
        p_lesson_id: lockedLessonId,
        p_unlock_cost: 999999,
        p_enabled: true,
      });
    }

    // Enroll learner (manager assignment) — idempotent via live unique constraint.
    const { data: existingEnrollment } = await admin
      .from("learning_enrollments")
      .select("id, status")
      .eq("user_id", learnerUserId)
      .eq("course_id", courseId)
      .eq("target_type", "course")
      .in("status", ["pending", "active", "suspended"])
      .maybeSingle();

    if (!existingEnrollment?.id) {
      await rpcOk(instructor, "create_learning_enrollment", {
        p_target_type: "course",
        p_target_id: courseId,
        p_user_id: learnerUserId,
        p_source: "admin_assignment",
        p_status: "active",
        p_metadata: { umtuba_e2e_ns: FIXTURE_NS },
      });
    } else if (existingEnrollment.status !== "active") {
      await rpcOk(instructor, "activate_learning_enrollment", {
        p_enrollment_id: existingEnrollment.id,
      });
    }

    const fixtures = {
      ns: FIXTURE_NS,
      envClass: config.envClass,
      baseUrl: config.baseUrl,
      learnerUserId,
      instructorUserId,
      courseId,
      lessonId,
      lockedLessonId,
      spaceId,
      programId,
      sectionId,
    };

    // Emit IDs only — no secrets.
    console.log("LEARNING_E2E_PROVISION PASS");
    console.log(JSON.stringify(fixtures, null, 2));

    // Export shell-friendly lines for the runner (IDs only).
    console.log(`LEARNING_E2E_COURSE_ID=${courseId}`);
    console.log(`LEARNING_E2E_LESSON_ID=${lessonId}`);
    console.log(`LEARNING_E2E_LOCKED_LESSON_ID=${lockedLessonId}`);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
