import type { Analysis, CropRow, Health, Priority, SoilAnswer } from "./types";

/** A field the farmer saved: the outline, everything entered in the form, and the last results. */
export interface SavedField {
  id: string;
  name: string;
  savedAt: string;            // ISO date
  field: GeoJSON.Polygon;
  areaHa: number;
  rows: CropRow[];
  irrigated: boolean | null;
  priority: Priority | null;
  soilAnswer: SoilAnswer;
  health: Health;
  lang: string;
  analysis: Analysis | null;
}

/* Saved in this browser only (localStorage). Every access is wrapped: storage can be blocked or full. */
const KEY = "spora-fields";

export function loadFields(): SavedField[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter(isSavedField) : [];
  } catch {
    return [];
  }
}

/** Returns false when the browser refused to store (blocked or full). Results are dropped first if space runs out. */
export function storeFields(list: SavedField[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    try {
      localStorage.setItem(KEY, JSON.stringify(list.map((f, i) => (i === 0 ? f : { ...f, analysis: null }))));
      return true;
    } catch {
      return false;
    }
  }
}

export function newId(): string {
  return `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function isSavedField(x: unknown): x is SavedField {
  const f = x as SavedField;
  return !!f && typeof f.id === "string" && typeof f.name === "string" && f.field?.type === "Polygon"
    && Array.isArray(f.rows);
}

/** A file the farmer can keep or move to another device. */
export function exportFields(list: SavedField[]) {
  const blob = new Blob([JSON.stringify({ app: "spora", version: 1, fields: list }, null, 1)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `spora-fields-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readFieldsFile(file: File): Promise<SavedField[] | null> {
  try {
    const data = JSON.parse(await file.text());
    const list = Array.isArray(data) ? data : data?.fields;
    if (!Array.isArray(list)) return null;
    const ok = list.filter(isSavedField);
    return ok.length ? ok : null;
  } catch {
    return null;
  }
}
