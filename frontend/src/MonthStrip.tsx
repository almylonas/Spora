import { MONTHS, MONTH_INITIALS, useI18n } from "./i18n";
import type { TimelineItem } from "./types";

/** The rotation as rows of 12 months: green when something protects the soil, brown when it is bare.
 *  Crop names sit above the months they occupy. */
export default function MonthStrip({ items, compact = false }: { items: TimelineItem[]; compact?: boolean }) {
  const { t, lang } = useI18n();
  const months = MONTHS[lang];
  const years = Array.from(new Set(items.map((i) => i.year)));
  const name = (it: TimelineItem) => it.crop_label ?? it.crop;
  const seenWord = (s: string) => (s === "no_image" ? t("seen_none") : s === "bare" ? t("seen_bare") : t("seen_covered"));
  return (
    <div className={`strip${compact ? " strip-compact" : ""}`}>
      {years.map((y) => {
        const row = items.filter((i) => i.year === y);
        const spans: { crop: string | null; label: string | null; cover: boolean; from: number; to: number }[] = [];
        row.forEach((it, k) => {
          const last = spans[spans.length - 1];
          if (last && last.crop === it.crop) last.to = k;
          else spans.push({ crop: it.crop, label: name(it), cover: it.cover_crop, from: k, to: k });
        });
        return (
          <div className="strip-year" key={y}>
            {years.length > 1 && <span className="strip-year-label">{t("year_n", { n: y })}</span>}
            <div className="strip-names" aria-hidden="true">
              {spans.map((s) => (
                <span key={s.from} style={{ gridColumn: `${s.from + 1} / ${s.to + 2}` }} className={s.cover ? "is-cover" : ""}>
                  {s.label && s.to - s.from >= (compact ? 2 : 1) ? s.label : ""}
                </span>
              ))}
            </div>
            <div className="strip-cells" role="list" aria-label={years.length > 1 ? t("year_n", { n: y }) : t("months")}>
              {row.map((it, k) => (
                <span
                  key={k}
                  role="listitem"
                  className={`cell ${it.protected ? (it.cover_crop ? "cell-cover" : "cell-crop") : "cell-bare"}`}
                  title={`${months[it.month - 1]}: ${name(it) ?? t("no_crop")}${it.protected ? "" : ` (${t("soil_bare")})`}`}
                  aria-label={`${months[it.month - 1]}: ${name(it) ?? t("no_crop")}, ${it.protected ? t("soil_covered") : t("soil_bare")}`}
                />
              ))}
            </div>
            {!compact && row.some((it) => it.seen_from_space) && (
              <div className="strip-seen" role="list" aria-label={t("space_h")}>
                {row.map((it, k) => {
                  const s = it.seen_from_space ?? "no_image";
                  const differs = s !== "no_image" && (s === "bare") !== it.crop_months_say_bare;
                  return (
                    <span key={k} role="listitem"
                      className={`seen seen-${s}${differs ? " is-differs" : ""}`}
                      title={`${months[it.month - 1]}, ${t("space_h")}: ${seenWord(s)}${differs ? ` (${t("seen_differs")})` : ""}`}
                      aria-label={`${months[it.month - 1]}, ${t("space_h")}: ${seenWord(s)}`} />
                  );
                })}
              </div>
            )}
            {(!compact || y === years[years.length - 1]) && (
              <div className="strip-months" aria-hidden="true">
                {row.map((it, k) => <span key={k}>{MONTH_INITIALS[lang][it.month - 1]}</span>)}
              </div>
            )}
          </div>
        );
      })}
      {!compact && (
        <ul className="strip-legend">
          <li><span className="cell cell-crop" /> {t("crop_growing")}</li>
          <li><span className="cell cell-cover" /> {t("cover_crop")}</li>
          <li><span className="cell cell-bare" /> {t("bare_soil")}</li>
          {items.some((i) => i.seen_from_space) && (
            <li><span className="seen seen-covered" /><span className="seen seen-bare" /> {t("space_h")}</li>
          )}
        </ul>
      )}
    </div>
  );
}
