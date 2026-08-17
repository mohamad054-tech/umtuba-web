import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

describe("WP-QA-02 World destination handoff", () => {
  it("keeps World hub query city and shows requested city when data is unavailable", () => {
    const page = readFileSync(join(ROOT, "app/world/page.tsx"), "utf8");
    expect(page).toMatch(/initialCitySlug/);
    expect(page).toMatch(/query\.city/);

    const client = readFileSync(
      join(ROOT, "app/world/WorldDiscoveryClient.tsx"),
      "utf8"
    );
    expect(client).toMatch(/world\.requestedDestination/);
    expect(client).toMatch(/world\.empty\.unknownDestination/);
    expect(client).toMatch(/resolveWorldDestination/);
    expect(client).not.toMatch(/cities\[0\]\?\.id \?\?/);
    expect(client).toMatch(/runDestinationDiscovery/);
    expect(client).toMatch(/initialCitySlug/);
    expect(client).toMatch(/aria-label=\{t\("world.destination"\)\}/);
    expect(client).toMatch(/\/world\/city\/\$\{encodeURIComponent\(city.slug\)\}/);
    expect(client).not.toMatch(/hide World/);
  });
});
