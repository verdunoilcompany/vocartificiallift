import "server-only";
import path from "path";

/** Folder holding flat data files. Defaults to ./db under the app root. */
export const dataDir = () => path.resolve(process.cwd(), process.env.EXCEL_DATA_DIR || "db");
