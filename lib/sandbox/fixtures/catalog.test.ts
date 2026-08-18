import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { UMTUBA_DEMO_PRODUCTS } from "../../store/demo/catalog";
import { SANDBOX_COMMERCIAL_MODEL } from "./commercial";
import { MOCK_PAYMENT_ADAPTER, SANDBOX_ORDERS, simulateSandboxPayment } from "./commerce";
import { courseLessonCount, SANDBOX_COURSES } from "./courses";
import { UMTUBA_ORIGINAL_SANDBOX_COURSES } from "./originals";
import {
  PROSPECTIVE_COMMERCE_PARTNERS,
  PROSPECTIVE_LEARNING_PARTNERS,
} from "./partners";
import { SANDBOX_INSTRUCTORS, SANDBOX_STUDENTS } from "./people";
import { SANDBOX_STUDENT_PROGRESS } from "./progress";
import { SANDBOX_STORE_ACTORS, SANDBOX_STORE_LISTINGS } from "./store";
import { effectiveRights, emptyRights } from "./types";

const ROOT = process.cwd();

describe("business sandbox fixtures", () => {
  it("keeps synthetic people in the requested bands", () => {
    expect(SANDBOX_STUDENTS.length).toBeGreaterThanOrEqual(20);
    expect(SANDBOX_STUDENTS.length).toBeLessThanOrEqual(30);
    expect(SANDBOX_INSTRUCTORS.length).toBeGreaterThanOrEqual(6);
    expect(SANDBOX_INSTRUCTORS.length).toBeLessThanOrEqual(10);
    expect(SANDBOX_STUDENTS.every((person) => person.displayName.startsWith("Demo Student"))).toBe(
      true
    );
    expect(
      SANDBOX_INSTRUCTORS.every((person) => person.displayName.startsWith("Demo Instructor —"))
    ).toBe(true);
  });

  it("includes 12–20 courses with originals, partner, and external kinds", () => {
    expect(SANDBOX_COURSES.length).toBeGreaterThanOrEqual(12);
    expect(SANDBOX_COURSES.length).toBeLessThanOrEqual(20);
    expect(SANDBOX_COURSES.filter((course) => course.kind === "UMTUBA_ORIGINAL")).toHaveLength(3);
    expect(SANDBOX_COURSES.some((course) => course.kind === "PARTNER_COURSE")).toBe(true);
    expect(SANDBOX_COURSES.some((course) => course.kind === "EXTERNAL_COURSE")).toBe(true);
  });

  it("keeps the three UMTUBA originals draft, unpublished, and 4x12", () => {
    const titles = UMTUBA_ORIGINAL_SANDBOX_COURSES.map((course) => course.title);
    expect(titles).toEqual([
      "UMTUBA Platform Essentials",
      "Digital Safety & Privacy Fundamentals",
      "AI Fundamentals for Everyone",
    ]);
    for (const course of UMTUBA_ORIGINAL_SANDBOX_COURSES) {
      expect(course.status).toBe("DRAFT");
      expect(course.publishState).toBe("DRAFT");
      expect(course.publicCatalog).toBe(false);
      expect(course.modules).toHaveLength(4);
      expect(courseLessonCount(course)).toBe(12);
    }
  });

  it("never marks prospective partners ACTIVE or imported", () => {
    const all = [...PROSPECTIVE_LEARNING_PARTNERS, ...PROSPECTIVE_COMMERCE_PARTNERS];
    expect(PROSPECTIVE_LEARNING_PARTNERS).toHaveLength(7);
    expect(PROSPECTIVE_COMMERCE_PARTNERS).toHaveLength(8);
    for (const partner of all) {
      expect(partner.status).toBe("PROSPECTIVE");
      expect(partner.partnerClaim).toBe("NOT AN UMTUBA PARTNER");
      expect(partner.logo).toBeNull();
      expect(partner.catalogImported).toBe(false);
      expect(Object.values(effectiveRights(partner.rights)).every((allowed) => !allowed)).toBe(
        true
      );
    }
  });

  it("reuses the 26 DEMO products as non-purchasable sandbox listings", () => {
    expect(UMTUBA_DEMO_PRODUCTS).toHaveLength(26);
    expect(SANDBOX_STORE_LISTINGS).toHaveLength(26);
    expect(SANDBOX_STORE_ACTORS.map((actor) => actor.displayName)).toEqual([
      "UMTUBA",
      "Demo Supplier A",
      "Demo Supplier B",
      "Demo Marketplace Seller C",
    ]);
    for (const listing of SANDBOX_STORE_LISTINGS) {
      expect(listing.product.purchasable).toBe(false);
      expect(listing.purchasableInProduction).toBe(false);
      expect(listing.realInventory).toBe(false);
    }
  });

  it("keeps payment mock off real rails", () => {
    expect(MOCK_PAYMENT_ADAPTER.realPayment).toBe(false);
    expect(MOCK_PAYMENT_ADAPTER.storesCardNumbers).toBe(false);
    expect(SANDBOX_ORDERS.every((order) => order.realPayment === false)).toBe(true);
    expect(SANDBOX_ORDERS.some((order) => order.paymentOutcome === "SUCCESS")).toBe(true);
    expect(SANDBOX_ORDERS.some((order) => order.paymentOutcome === "DECLINED")).toBe(true);
    expect(SANDBOX_ORDERS.some((order) => order.paymentOutcome === "REFUNDED_DEMO")).toBe(true);
    expect(simulateSandboxPayment("SUCCESS").realPayment).toBe(false);
    expect(simulateSandboxPayment("SUCCESS").realProviderCall).toBe(false);
  });

  it("denies UNKNOWN rights and keeps commercial copy synthetic", () => {
    const denied = effectiveRights(emptyRights());
    expect(Object.values(denied).every((allowed) => allowed === false)).toBe(true);
    expect(SANDBOX_COMMERCIAL_MODEL.payouts.enabled).toBe(false);
    expect(SANDBOX_COMMERCIAL_MODEL.disclaimer).toMatch(/Not a forecast/i);
  });

  it("gives every synthetic student a progress row", () => {
    expect(SANDBOX_STUDENT_PROGRESS).toHaveLength(SANDBOX_STUDENTS.length);
  });

  it("does not copy third-party course text or logos into fixtures", () => {
    const partners = readFileSync(join(ROOT, "lib/sandbox/fixtures/partners.ts"), "utf8");
    expect(partners).not.toMatch(/logoUrl|cdn\.|wikimedia|coursera-logo/i);
    const courses = readFileSync(join(ROOT, "lib/sandbox/fixtures/courses.ts"), "utf8");
    expect(courses).not.toMatch(/Complete Python Bootcamp|Machine Learning by Andrew/i);
  });
});
