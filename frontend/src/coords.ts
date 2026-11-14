/** Read coordinates typed into the search box. Accepts, for example:
 *   50.92, 6.40      50.92 6.40      50,92; 6,40      N 50.92 E 6.40      50.92N 6.40E
 *   50°55'08"N 6°24'07"E      50° 55.13' N, 6° 24.12' E
 * Latitude comes first unless letters (N/S/E/W) say otherwise or the first number cannot be a latitude. */
export interface LatLon { lat: number; lon: number }

const PART = String.raw`([NSEWOnsewo])?\s*(-?\d+(?:[.,]\d+)?)\s*(?:°|º|deg)?\s*(?:(\d+(?:[.,]\d+)?)\s*(?:'|′|’|min)?\s*)?(?:(\d+(?:[.,]\d+)?)\s*(?:"|″|”|''|sec)?\s*)?([NSEWOnsewo])?`;

function toNum(s?: string) { return s === undefined ? undefined : Number(s.replace(",", ".")); }

export function parseCoordinates(input: string): LatLon | null {
  const q = input.trim();
  if (!/\d/.test(q) || /[a-df-mp-rt-vx-zA-DF-MP-RT-VX-Z]{2,}/.test(q.replace(/deg|min|sec/gi, ""))) return null;
  // Split into the two numbers
  let parts: string[];
  const commas = (q.match(/,/g) || []).length;
  if (q.includes(";")) parts = q.split(";");
  else if (q.includes(".") && commas === 1) parts = q.split(",");          // 50.92,6.40  or  50.92, 6.40
  else if (!q.includes(".") && commas === 3) {                              // 50,92, 6,40 (decimal commas)
    const i = q.indexOf(",", q.indexOf(",") + 1);
    parts = [q.slice(0, i), q.slice(i + 1)];
  } else if (commas === 1 && /^\s*-?\d+\s*,\s*-?\d+\s*$/.test(q)) parts = q.split(",");   // 50, 6
  else {
    const m = q.match(new RegExp(`^\\s*(${PART})\\s+(${PART})\\s*$`));
    if (!m) return null;
    parts = [m[1], m[7]];
  }
  if (parts.length !== 2) return null;
  const vals = parts.map((p) => {
    const m = p.trim().match(new RegExp(`^${PART}$`));
    if (!m) return null;
    const hemi = (m[1] || m[5] || "").toUpperCase().replace("O", "E");   // German "O" = Ost
    const deg = toNum(m[2])!, min = toNum(m[3]) ?? 0, sec = toNum(m[4]) ?? 0;
    if (min >= 60 || sec >= 60) return null;
    let v = Math.abs(deg) + min / 60 + sec / 3600;
    if (deg < 0 || hemi === "S" || hemi === "W") v = -v;
    return { v, hemi };
  });
  if (vals.some((x) => x === null)) return null;
  let [a, b] = vals as { v: number; hemi: string }[];
  if (a.hemi === "E" || a.hemi === "W" || b.hemi === "N" || b.hemi === "S" || (Math.abs(a.v) > 90 && Math.abs(b.v) <= 90)) {
    [a, b] = [b, a];
  }
  if (Math.abs(a.v) > 90 || Math.abs(b.v) > 180) return null;
  return { lat: a.v, lon: b.v };
}
