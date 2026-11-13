import "server-only";
import path from "path";
import ExcelJS from "exceljs";
import { dataDir } from "./data-dir";

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().replace("T", " ").slice(0, 16);
  if (typeof value === "object") {
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
    if ("text" in value) return String(value.text);
    if ("richText" in value) return value.richText.map((r) => r.text).join("");
    return "";
  }
  return String(value);
}

function sheetToRows(sheet: ExcelJS.Worksheet): string[][] {
  const width = sheet.columnCount;
  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    for (let c = 1; c <= width; c++) cells.push(cellText(row.getCell(c).value));
    rows.push(cells);
  });
  return rows;
}

/** Reads the first (or named) worksheet of an .xlsx buffer as a grid of strings. */
export async function readWorkbookRows(
  data: ArrayBuffer,
  sheetName?: string,
): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data);
  const sheet = sheetName ? wb.getWorksheet(sheetName) : wb.worksheets[0];
  if (!sheet) throw new Error(sheetName ? `Worksheet "${sheetName}" not found.` : "Workbook has no sheets.");
  return sheetToRows(sheet);
}

/** Reads a workbook from the data folder (see dataDir) as a grid of strings. */
export async function readWorkbookFile(fileName: string, sheetName?: string): Promise<string[][]> {
  const full = path.join(dataDir(), path.basename(fileName));
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(full);
  const sheet = sheetName ? wb.getWorksheet(sheetName) : wb.worksheets[0];
  if (!sheet) throw new Error(`No worksheet found in ${fileName}.`);
  return sheetToRows(sheet);
}
