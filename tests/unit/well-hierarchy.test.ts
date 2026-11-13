import { describe, expect, it } from "vitest";
import {
  AREAS,
  WELL_HIERARCHY,
  locateWell,
  matchesHierarchy,
  routesFor,
  wellsFor,
} from "@/lib/dynocard/well-hierarchy";

describe("well hierarchy", () => {
  it("loads every well from the list", () => {
    expect(WELL_HIERARCHY).toHaveLength(133);
    expect(AREAS).toEqual(["Eagle Ford", "Verdun 1"]);
    expect(routesFor("Verdun 1")).toContain("Martin Ranch");
    expect(wellsFor("Eagle Ford", "Route 2")).toEqual([
      "Cenizo 1H",
      "Cenizo 3H",
      "Cenizo 4H",
      "Cenizo B2",
    ]);
  });

  it("matches NodeIDs loosely (case, #, spaces, trailing blanks)", () => {
    expect(locateWell("Cenizo 3H")?.route).toBe("Route 2");
    expect(locateWell("siegele 105h")?.area).toBe("Verdun 1");
    expect(locateWell("MAK Martin SA 24H")?.route).toBe("Martin Ranch");
    expect(locateWell("Unknown 1H")).toBeUndefined();
  });

  it("filters by area, route and well", () => {
    const none = { area: null, route: null, well: null };
    expect(matchesHierarchy("Unknown 1H", none)).toBe(true);
    expect(
      matchesHierarchy("Unknown 1H", { ...none, area: "Eagle Ford" }),
    ).toBe(false);
    expect(matchesHierarchy("St Reed 11H", { ...none, route: "Route 6" })).toBe(
      true,
    );
    expect(
      matchesHierarchy("St Reed 11H", {
        area: "Eagle Ford",
        route: "Route 5",
        well: null,
      }),
    ).toBe(false);
    expect(
      matchesHierarchy("Newman 01H", { ...none, well: "Newman 01H" }),
    ).toBe(true);
  });
});
