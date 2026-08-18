import { createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: function MockLink({
    href,
    children,
  }: {
    href: string;
    children?: ReactNode;
  }) {
    return createElement("a", { href }, children);
  },
}));

function collectText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join(" ");
  if (!isValidElement(node)) return "";
  const element = node as ReactElement<{ children?: ReactNode; title?: ReactNode; description?: ReactNode }>;
  const props = element.props;
  return [props.title, props.description, props.children].map(collectText).join(" ");
}

describe("LearningSandbox exercise route render", () => {
  it("renders pe-m1-l1-ex instructions and return links", async () => {
    const { default: LearningSandbox } = await import(
      "../../../app/components/sandbox/learning/LearningSandbox"
    );
    const tree = LearningSandbox({
      locale: "en",
      route: {
        surface: "exercise",
        slug: "umtuba-platform-essentials",
        exerciseId: "pe-m1-l1-ex",
      },
    });
    const text = collectText(tree);
    expect(text).toMatch(/Practice: Account, profile, and Settings/);
    expect(text).toMatch(/Using only this lesson/);
    expect(text).toMatch(/Return to lesson/);
    expect(text).toMatch(/Return to course/);
    expect(text).not.toMatch(/This page couldn/);
    expect(text).not.toMatch(/unknown sandbox lesson/i);
  });

  it("renders Learning-specific unavailable for a missing exercise id", async () => {
    const { default: LearningSandbox } = await import(
      "../../../app/components/sandbox/learning/LearningSandbox"
    );
    const tree = LearningSandbox({
      locale: "en",
      route: {
        surface: "exercise",
        slug: "umtuba-platform-essentials",
        exerciseId: "no-such-exercise",
      },
    });
    const text = collectText(tree);
    expect(text).toMatch(/This Learning exercise is unavailable/);
    expect(text).toMatch(/missing or invalid/);
    expect(text).not.toMatch(/This page couldn/);
  });
});
