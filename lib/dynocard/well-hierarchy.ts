/**
 * Area → Route → Well hierarchy used by the Dynocard Explorer filters.
 * Provided by the business (Nov 2026). Names are kept as given (trimmed); matching against
 * card NodeIDs is case-insensitive and ignores "#" and extra spaces (see wellKey).
 */

export interface WellLocation {
  area: string;
  route: string;
  well: string;
}

const RAW: [area: string, route: string, wells: string[]][] = [
  [
    "Eagle Ford",
    "Route 10",
    [
      "Maltsberger North Cut 09H",
      "Newman 01H",
      "Newman 03H",
      "Newman 04H",
      "Newman 08H",
      "Newman 09H",
      "Newman 10H",
      "Newman 11H",
      "Newman 13H",
      "Newman 16H",
      "Newman 17H",
      "Newman 18H",
      "Newman 19H",
      "Newman 20H",
    ],
  ],
  [
    "Eagle Ford",
    "Route 11",
    [
      "Brown 05H",
      "Brown 15H",
      "Brown 6H",
      "Brown 7H",
      "Brown B 08H",
      "Brown B 13H",
      "Brown C 16H",
      "Brown D 01H",
      "Brown D 20H",
      "Brown D 21H",
      "Pena-Butts 1H",
      "Taylor Butts 1H",
    ],
  ],
  ["Eagle Ford", "Route 13", ["S Altito C 01H"]],
  [
    "Eagle Ford",
    "Route 2",
    ["Cenizo 1H", "Cenizo 3H", "Cenizo 4H", "Cenizo B2"],
  ],
  [
    "Eagle Ford",
    "Route 5",
    [
      "Wareing 01H",
      "Wareing 02H",
      "Wareing 03H",
      "Wareing 04H",
      "Wareing 05H",
      "Wareing 06H",
      "Wareing 07H",
      "Wareing 08H",
      "Wareing 09H",
      "Wareing 11H",
      "Wareing 12H",
      "Wareing 13H",
      "Wareing 14H",
      "Wareing 18H",
      "Wareing 19H",
      "Wareing 20H",
      "Wareing 21H",
      "Wareing 22H",
      "Wareing 23H",
      "Wareing 24H",
      "Wareing 25H",
      "Wareing 26H",
      "Wareing 27H",
      "Wareing 29H",
      "Wareing 33H",
      "Wareing 34H",
      "Wareing 35H",
      "Wareing 42H",
    ],
  ],
  [
    "Eagle Ford",
    "Route 6",
    [
      "Media Luna 1H",
      "Media Luna 2H",
      "Media Luna 3H",
      "St Reed 01H",
      "St Reed 02H",
      "St Reed 03H",
      "St Reed 04H",
      "St Reed 05H",
      "St Reed 06H",
      "St Reed 07H",
      "St Reed 08H",
      "St Reed 10H",
      "St Reed 11H",
      "St Reed 12H",
      "St Reed 13H",
      "St Reed 14H",
      "St Reed 20H",
      "St Reed 27H",
      "St Reed 28H",
      "St Reed 29H",
      "St Reed 30H",
      "St Reed 31H",
      "St Reed 32H",
      "St Reed 33H",
      "St Reed 34H",
      "St Reed 35H",
      "St Reed 36H",
      "St Reed 37H",
      "St Reed 38H",
      "St Reed 39H",
      "St Reed 40H",
      "St Reed 41H",
      "St Reed 42",
      "St Reed 43",
      "St Reed 44H",
      "St Reed 45H",
    ],
  ],
  [
    "Verdun 1",
    "Martin Ranch",
    [
      "MAK Martin SA #24H",
      "MAK Martin SA #28H",
      "MAK Martin SA #61H",
      "MAK Martin SA #62H",
      "Martin Ranch A #15H",
      "Martin Ranch A #1H",
      "Martin Ranch A #34H",
      "Martin Ranch A #36H",
      "Martin Ranch A #43H",
      "Martin Ranch B #9RH",
    ],
  ],
  [
    "Verdun 1",
    "Miller/Kokel/Hornsby",
    ["Hornsby 101H", "Hornsby 10H", "Hornsby 11H"],
  ],
  ["Verdun 1", "Verdun 1 Fashing", ["Tom 2", "Tom 3"]],
  [
    "Verdun 1",
    "Verdun 2 Frost Bank",
    [
      "Frio Tex 105",
      "Frio Tex 106",
      "Frio Tex 10H",
      "Frost Bank 102H",
      "Frost Bank 103H",
      "Frost Bank 104H",
      "Frost Bank 105H",
      "Frost Bank 20H",
      "Frost Bank 22H",
      "Siegele 103H",
      "Siegele 104H",
      "SIegele 105H",
      "Siegele 106H",
      "Siegele 108H",
      "Siegele 109H",
      "Siegele 10H",
      "Siegele 110H",
      "Siegele 111H",
      "Siegele 11H",
      "Siegele 22H",
      "Siegele 23H",
      "Siegele 61H",
      "Siegele 62H",
    ],
  ],
];

export const WELL_HIERARCHY: WellLocation[] = RAW.flatMap(
  ([area, route, wells]) =>
    wells.map((well) => ({ area, route, well: well.trim() })),
);

/** Normalized key for matching card NodeIDs to hierarchy wells. */
export function wellKey(name: string): string {
  return name.toLowerCase().replace(/#/g, "").replace(/\s+/g, " ").trim();
}

const BY_KEY = new Map(WELL_HIERARCHY.map((w) => [wellKey(w.well), w]));

export function locateWell(node: string): WellLocation | undefined {
  return BY_KEY.get(wellKey(node));
}

export interface HierarchyFilter {
  area: string | null;
  route: string | null;
  well: string | null;
}

/** True when the card's well sits inside the chosen area/route/well (all null = everything). */
export function matchesHierarchy(node: string, f: HierarchyFilter): boolean {
  if (!f.area && !f.route && !f.well) return true;
  const loc = locateWell(node);
  if (!loc) return false;
  return (
    (!f.area || loc.area === f.area) &&
    (!f.route || loc.route === f.route) &&
    (!f.well || loc.well === f.well)
  );
}

const uniq = (xs: string[]) => [...new Set(xs)];
const natural = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true });

export const AREAS = uniq(WELL_HIERARCHY.map((w) => w.area)).sort(natural);

export function routesFor(area: string | null): string[] {
  return uniq(
    WELL_HIERARCHY.filter((w) => !area || w.area === area).map((w) => w.route),
  ).sort(natural);
}

export function wellsFor(area: string | null, route: string | null): string[] {
  return WELL_HIERARCHY.filter(
    (w) => (!area || w.area === area) && (!route || w.route === route),
  )
    .map((w) => w.well)
    .sort(natural);
}
