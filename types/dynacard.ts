/** Number of binned loads per card: L0–L24 upstroke, L25–L49 downstroke. */
export const LOAD_BINS = 50;
export const UPSTROKE_BINS = 25;

/** A single downhole dynacard with the classifier's predicted label. */
export interface DynaCard {
  /** Stable key for React lists (row + node + index). */
  id: string;
  /** Row number from the source file. */
  row: string | number;
  /** Well / node name. */
  node: string;
  /** Card timestamp as given by the source (not parsed). */
  date: string;
  /** Strokes per minute. */
  spm: number | null;
  /** Pump fillage, percent. */
  fill: number | null;
  /** Classifier's predicted label. */
  label: string;
  /** 50 scaled loads (0–1). */
  L: number[];
}

/** Raw sample row as stored in db/sample-cards.json. */
export type SampleCardRow = Omit<DynaCard, "id">;

/** Model metadata: typical shape per label and per-bin feature importance. */
export interface ModelReference {
  /** Typical 50-bin shape for each label the model can predict. */
  ref: Record<string, number[]>;
  /** Relative importance (0–1) of each of the 50 bins. */
  imp: number[];
}

export type CardSource = "sample" | "upload";

export interface CardsResponse {
  cards: DynaCard[];
  source: CardSource;
  fileName?: string;
}

export interface ApiError {
  error: string;
}
