import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type { DynaCard, ModelReference, SampleCardRow } from "@/types/dynacard";
import { withReviewNotes } from "@/lib/dynacard/review";
import { dataDir } from "@/lib/data-dir";

async function readJson<T>(file: string): Promise<T> {
  const raw = await fs.readFile(path.join(dataDir(), file), "utf8");
  return JSON.parse(raw) as T;
}

/** The 25 sample cards shipped in db/sample-cards.json, with auto review notes. */
export async function getSampleCards(): Promise<DynaCard[]> {
  const rows = await readJson<SampleCardRow[]>("sample-cards.json");
  return withReviewNotes(rows.map((r, k) => ({ ...r, id: `${r.row}|${r.node}|${k}` })));
}

/** Typical shape per label and per-bin importance from db/model-reference.json. */
export function getModelReference(): Promise<ModelReference> {
  return readJson<ModelReference>("model-reference.json");
}
