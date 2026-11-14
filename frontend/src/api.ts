import type { AnalyseRequest, Analysis, CropOption } from "./types";

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = "ERR_SERVER";            // the app turns these codes into words in the chosen language
    try {
      const body = await res.json();
      if (typeof body.detail === "string") message = body.detail;
      else if (Array.isArray(body.detail)) message = "ERR_MISSING";
    } catch {
      /* keep the default message */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function fetchCrops(): Promise<CropOption[]> {
  return asJson(await fetch("/api/crops"));
}

export async function analyse(req: AnalyseRequest): Promise<Analysis> {
  return asJson(
    await fetch("/api/analyse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    }),
  );
}

/** Is the drawn outline usable (size, shape, on land)? Resolves to null when fine, or the problem in words. */
export async function checkField(field: GeoJSON.Polygon, lang: string, signal?: AbortSignal): Promise<string | null> {
  const res = await fetch("/api/check_field", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ field, lang }), signal,
  });
  if (res.ok) return null;
  if (res.status === 422) {
    try { const b = await res.json(); if (typeof b.detail === "string") return b.detail; } catch { /* ignore */ }
  }
  return null;   // the check itself failed: do not block the farmer
}

export interface Place {
  name: string;
  lat: number;
  lon: number;
  bbox?: [number, number, number, number];
  coords?: boolean;   // typed coordinates rather than a place found by name
}

/** Place search with OpenStreetMap Nominatim (free; keep requests to about one per second). */
export async function searchPlaces(q: string, lang: string, signal?: AbortSignal): Promise<Place[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { signal, headers: { "Accept-Language": lang } });
  if (!res.ok) return [];
  const rows: { display_name: string; lat: string; lon: string; boundingbox?: string[] }[] = await res.json();
  return rows.map((r) => ({
    name: r.display_name,
    lat: Number(r.lat),
    lon: Number(r.lon),
    bbox: r.boundingbox ? (r.boundingbox.map(Number) as [number, number, number, number]) : undefined,
  }));
}

/** Area of a lon/lat polygon in hectares (spherical approximation, good to about 0.5%). */
export function areaHa(poly: GeoJSON.Polygon): number {
  const R = 6378137;
  const ring = poly.coordinates[0];
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [lon1, lat1] = ring[i].map((v) => (v * Math.PI) / 180);
    const [lon2, lat2] = ring[i + 1].map((v) => (v * Math.PI) / 180);
    sum += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  return Math.abs((sum * R * R) / 2) / 10000;
}
