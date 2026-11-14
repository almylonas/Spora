import { MONTH_INITIALS, MONTHS, type TimelineItem } from "./types";

/** The rotation as rows of 12 months: green when something protects the soil, brown when it is bare.
 *  Crop names sit above the months they occupy. */
export default function MonthStrip({ items, compact = false }: { items: TimelineItem[]; compact?: boolean }) {
  const years = Array.from(new Set(items.map((i) => i.year)));
  return (
    <div className={`strip${compact ? " strip-compact" : ""}`}>
      {years.map((y) => {
        const row = items.filter((i) => i.year === y);
        const spans: { crop: string | null; cover: boolean; from: number; to: number }[] = [];
        row.forEach((it, k) => {
          const last = spans[spans.length - 1];
          if (last && last.crop === it.crop) last.to = k;
          else spans.push({ crop: it.crop, cover: it.cover_crop, from: k, to: k });
        });
        return (
          <div className="strip-year" key={y}>
            {years.length > 1 && <span className="strip-year-label">Year {y}</span>}
            <div className="strip-names" aria-hidden="true">
              {spans.map((s) => (
                <span key={s.from} style={{ gridColumn: `${s.from + 1} / ${s.to + 2}` }} className={s.cover ? "is-cover" : ""}>
                  {s.crop && s.to - s.from >= (compact ? 2 : 1) ? s.crop : ""}
                </span>
              ))}
            </div>
            <div className="strip-cells" role="list" aria-label={years.length > 1 ? `Year ${y}` : "Months"}>
              {row.map((it, k) => (
                <span
                  key={k}
                  role="listitem"
                  className={`cell ${it.protected ? (it.cover_crop ? "cell-cover" : "cell-crop") : "cell-bare"}`}
                  title={`${MONTHS[it.month - 1]}: ${it.crop ? it.crop : "no crop"}${it.protected ? "" : " (bare soil)"}`}
                  aria-label={`${MONTHS[it.month - 1]}: ${it.crop ?? "no crop"}, ${it.protected ? "soil covered" : "soil bare"}`}
                />
              ))}
            </div>
            {!compact && row.some((it) => it.seen_from_space) && (
              <div className="strip-seen" role="list" aria-label="Seen from space">
                {row.map((it, k) => {
                  const s = it.seen_from_space ?? "no_image";
                  const differs = s !== "no_image" && (s === "bare") !== it.crop_months_say_bare;
                  return (
                    <span key={k} role="listitem"
                      className={`seen seen-${s}${differs ? " is-differs" : ""}`}
                      title={`${MONTHS[it.month - 1]}, seen from space: ${s === "no_image" ? "no clear image" : s}${differs ? " (differs from your crop months)" : ""}`}
                      aria-label={`${MONTHS[it.month - 1]}, seen from space: ${s === "no_image" ? "no clear image" : s}`} />
                  );
                })}
              </div>
            )}
            {(!compact || y === years[years.length - 1]) && (
              <div className="strip-months" aria-hidden="true">
                {row.map((it, k) => <span key={k}>{MONTH_INITIALS[it.month - 1]}</span>)}
              </div>
            )}
          </div>
        );
      })}
      {!compact && (
        <ul className="strip-legend">
          <li><span className="cell cell-crop" /> Crop growing</li>
          <li><span className="cell cell-cover" /> Cover crop</li>
          <li><span className="cell cell-bare" /> Bare soil</li>
          {items.some((i) => i.seen_from_space) && (
            <li><span className="seen seen-covered" /><span className="seen seen-bare" /> Seen from space</li>
          )}
        </ul>
      )}
    </div>
  );
}
