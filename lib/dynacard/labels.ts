/** Plain-language description of the card shape behind each label, in model order. */
export const LABEL_DESCRIPTIONS: Record<string, string> = {
  "Full Pump":
    "Rectangle with rounded corners. Load picked up at the start of the upstroke and gone right after the top.",
  "Fluid Pound":
    "Full top, then the load is held on the downstroke until the plunger hits fluid and drops sharply.",
  "Gas Interference":
    "Slanted and rounded. Slow pickup going up and a long curved release coming down.",
  "Tubing Movement": "Tilted on both sides like a parallelogram. Load moves on and off slowly.",
  "Pump Hitting Down": "Normal card with a sharp load spike at the very end of the downstroke.",
  "Sticking Pump": "Bulge up on the upstroke and dip down on the downstroke at the tight spot.",
  "Worn Barrel": "Dip in the top of the card where fluid leaks past the plunger.",
  "Worn Standing Valve": "Flat top with a rounded bottom. Load released slowly on the downstroke.",
  "Worn Traveling Valve":
    "Dome-shaped top. Load builds slowly, peaks mid-stroke, then falls off.",
  "Stuck Piston":
    "Thin diagonal loop with almost no area. Load and position rise together because the plunger is stuck.",
};

export const LABELS = Object.keys(LABEL_DESCRIPTIONS);

export const FULL_PUMP = "Full Pump";
export const NO_PREDICTION = "No prediction";

/** Labels whose cards still look "full" — high fillage is expected for these. */
export const FULLISH_LABELS = [
  FULL_PUMP,
  "Pump Hitting Down",
  "Worn Barrel",
  "Sticking Pump",
  NO_PREDICTION,
];

export const isFullPump = (label: string) => label === FULL_PUMP;
