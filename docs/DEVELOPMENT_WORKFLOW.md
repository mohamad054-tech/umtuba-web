# UMTUBA Development Workflow

## Goal

This document defines the official development workflow for the UMTUBA project.
All AI agents and contributors should follow these rules unless explicitly instructed otherwise.

---

# Development Machines

There are two development machines:

1. Laptop
   - Primary development machine.
   - Primary integration machine.
   - Preferred place for daily implementation.
2. Office Desktop
   - Secondary development machine.
   - Can implement features in parallel.
   - Must always synchronize correctly before pushing.

Both machines work on the same Git repository and same remote.

---

# Multi-Machine Synchronization

Before starting work on either machine:

1. Check current branch.
2. `git fetch origin`
3. If local branch is behind:
   `git pull --ff-only origin <current-branch>`
4. Verify `git status` is clean before starting new work.

Before every push:

1. `git fetch origin`
2. `git pull --ff-only origin <current-branch>`
3. Resolve any divergence before committing or pushing.
4. Never force push unless explicitly instructed.

If another machine has already pushed changes:

- Stop implementation.
- Synchronize first.
- Only continue after the local repository matches the remote.

Never continue development on an outdated branch.

---

# Git Rules

Before ANY push:
Always synchronize with remote first (see **Multi-Machine Synchronization**).

Preferred sequence:

```bash
git fetch origin
```

If local branch is behind:

```bash
git pull --ff-only origin <current-branch>
```

If fast-forward is impossible:
STOP.
Never create merge commits automatically.
Explain why synchronization failed and ask for instructions.

Never use:

```bash
git push --force
```

unless explicitly requested.

---

# Branch Policy

Work only on the currently assigned branch.
Never switch branches automatically.
Never checkout another branch without approval.

---

# Commits

One logical feature = one commit.
Commit messages follow Conventional Commits.

Examples:

- `feat(stories): ...`
- `fix(beta): ...`
- `refactor(search): ...`

Never combine unrelated work in one commit.

---

# Migrations

See **Migration Version Policy** for numbering rules.
See **Remote History Verification** before any remote apply.

When applying remotely:
Always use targeted migration application.

Never execute:

```bash
supabase db push
```

for all migrations unless explicitly instructed.

Never run:

```bash
db reset
```

without explicit approval.

---

# Migration Version Policy

Migration version numbers are globally unique.

Rules:

- Never reuse a migration version.
- Before creating a migration:
  1. Check the local repository.
  2. Check the remote migration history when relevant.
  3. Use the next available unique version.
- If a migration exists locally but has not yet been applied remotely, its version remains reserved and must not be reused.
- Never renumber existing committed migrations.
- Never create duplicate migration version numbers.
- If migration history and repository become inconsistent, stop and explain the situation before proceeding.

---

# Remote History Verification

Before any remote migration:

1. Verify the linked project.
2. Verify migration history.
3. Detect missing or conflicting versions.
4. Apply only the intended migration.
5. Register migration history only after successful application.
6. Never use `db push` for all migrations unless explicitly instructed.

Also verify remote objects after a successful apply (see security and QA checklists for the feature).

---

# Security Reviews

Every major feature must receive a security review before remote application.

Review includes:

- RLS
- FORCE RLS
- grants
- SECURITY DEFINER
- search_path
- auth.uid()
- ownership
- storage
- signed URLs
- privilege escalation
- append-only audit
- validation

---

# Testing

Before every commit:

```bash
npx tsc --noEmit
```

```bash
npx vitest run
```

```bash
npm run build
```

Do not commit if any fails.

---

# Push Policy

Push only after:

- local verification
- security review
- approval
- clean git status

---

# Admin Rules

Platform administrators are determined only by:

`platform_admins`

Database authorization is the source of truth.

Never trust only:

- JWT claims
- environment variables
- client metadata

---

# Feature Flags

Never enable production features without approval.

Examples:

`ADS_DELIVERY_ENABLED`

must remain disabled until explicitly enabled.

---

# Documentation

Every major foundation requires:

- implementation document
- architecture notes
- security notes
- QA notes

---

# Decision Log

Major architectural or workflow decisions that affect the entire project
must be documented in this file or referenced from project documentation.

AI agents must not silently replace or contradict previous accepted
architectural decisions.

If a new proposal conflicts with an existing accepted decision,
the conflict must be explained explicitly before implementation.

---

# AI Agent Behavior

If uncertain:
Stop.
Explain the issue.
Never guess.
Never silently change architecture.
Never silently modify production data.
Always prefer safe, reversible operations.
