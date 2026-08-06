# Current Task

## Task title

UM Learning - E2E Fixture Provisioning Foundation V1

## Status

`implementation-complete` — safe fixture provisioner closed as tooling foundation; live run deferred pending isolated env credentials.

## Milestone

`learning.ops.e2e_fixture_provisioning_foundation_v1`

## What landed

- Idempotent `UMTUBA_LEARNING_E2E_V1` provisioner (`scripts/learning-e2e/provision-*.mjs`)
- Fail-closed env gates + prod refuse unless `LEARNING_E2E_ALLOW_PROD=1`
- Contract tests + operations doc
- No live browser execution in this close

## Branch / HEAD base

`office/learning-e2e-fixture-provisioning-v1`
Base: `origin/office/learning-browser-e2e-foundation-v1` @ `88de13b`

## Worktree

`D:\umtuba-central\repos\umtuba-web-learning-e2e-fixture-provisioning-v1`
