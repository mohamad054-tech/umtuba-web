/**
 * UM Core Spec / Standards / Release Contract alignment (TEST-ONLY).
 *
 * TASK: UM_CORE_PLATFORM_SPEC_STANDARDS_RELEASE_CONTRACT_CLOSEOUT_V1
 * AGENT: PC2-A2 · SOURCE_DEVICE=PC2
 *
 * Asserts docs packaging + constant/barrel visibility alignment.
 * Does not invent runtime semantics. Does not wire P23 root exports.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as UmCore from "./index";
import { UM_CORE_DEPENDENCY_VALIDATOR_PHASE } from "./packageIdentity";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "../..");
const docsCore = join(rootDir, "docs", "core");

const RELEASE_CONTRACT = join(
  docsCore,
  "UM_CORE_PLATFORM_RELEASE_CONTRACT_V1.md",
);
const SPEC = join(docsCore, "UM_CORE_SPECIFICATION_V1.md");
const STANDARDS = join(docsCore, "UM_CORE_ENGINEERING_STANDARDS_V1.md");
const BC_FIXTURE = join(
  dirname(fileURLToPath(import.meta.url)),
  "test",
  "publicApiBackwardCompatibility.fixture.json",
);

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("UM Core Spec/Standards release contract alignment V1", () => {
  it("ships authoritative Spec, Standards, and Release Contract docs", () => {
    expect(existsSync(SPEC), "UM_CORE_SPECIFICATION_V1.md").toBe(true);
    expect(existsSync(STANDARDS), "UM_CORE_ENGINEERING_STANDARDS_V1.md").toBe(
      true,
    );
    expect(
      existsSync(RELEASE_CONTRACT),
      "UM_CORE_PLATFORM_RELEASE_CONTRACT_V1.md",
    ).toBe(true);
  });

  it("documents P19 = UNUSED_BY_DEFAULT and P23 NOT root-public", () => {
    const release = read(RELEASE_CONTRACT);
    const spec = read(SPEC);
    const standards = read(STANDARDS);

    expect(release).toMatch(/UNUSED_BY_DEFAULT/);
    expect(release).toMatch(/NOT ROOT_PUBLIC|NOT root-public|not root-public/i);
    expect(release).toMatch(/P23/);
    expect(release).toMatch(/P19/);

    expect(spec).toMatch(/UNUSED_BY_DEFAULT/);
    expect(spec).toMatch(/P23/);
    expect(standards).toMatch(/UNUSED_BY_DEFAULT/);
    expect(standards).toMatch(/not root-public/i);
  });

  it("aligns packageIdentity P19 marker with release packaging", () => {
    expect(UM_CORE_DEPENDENCY_VALIDATOR_PHASE).toBe("P19");
    expect(UmCore.UM_CORE_DEPENDENCY_VALIDATOR_PHASE).toBe("P19");
    expect(UmCore.UM_CORE_PACKAGE_ID).toBe("um.core");
  });

  it("keeps P19 root-public and P23 off the root barrel", () => {
    const root = UmCore as Record<string, unknown>;

    expect(typeof root.createInMemoryDependencyValidator).toBe("function");
    expect(typeof root.validateDependencyRequirements).toBe("function");
    expect(root.UmDependencyValidatorCode).toBeTypeOf("object");

    expect(root.createPlatformReadinessEvaluator).toBeUndefined();
    expect(root.derivePlatformReadiness).toBeUndefined();
    expect(root.UmPlatformReadinessCode).toBeUndefined();
    expect(root.UM_CORE_PLATFORM_LIFECYCLE_READINESS_PHASE).toBeUndefined();
  });

  it("preserves BC fixture floor callables on the root barrel", () => {
    const fixture = JSON.parse(read(BC_FIXTURE)) as {
      publicCallables: string[];
      constants: Record<string, string>;
    };

    for (const name of fixture.publicCallables) {
      expect(typeof (UmCore as Record<string, unknown>)[name], name).toBe(
        "function",
      );
    }

    for (const [name, expected] of Object.entries(fixture.constants)) {
      expect((UmCore as Record<string, unknown>)[name], name).toBe(expected);
    }
  });
});
