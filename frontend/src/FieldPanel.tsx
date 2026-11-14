import { useState } from "react";
import { PRIORITIES, type CropOption, type CropRow, type Priority } from "./types";
import { MONTHS, useI18n } from "./i18n";
import { IconPlus, IconTrash, IconWarn } from "./icons";

interface Props {
  areaHa: number;
  crops: CropOption[];
  rows: CropRow[];
  setRows: (r: CropRow[]) => void;
  irrigated: boolean | null;
  setIrrigated: (v: boolean) => void;
  priority: Priority | null;
  setPriority: (p: Priority) => void;
  onAnalyse: () => void;
  onRedraw: () => void;
  busy: boolean;
  error: string | null;
}

let nextId = 100;

export default function FieldPanel(p: Props) {
  const { t, lang, num } = useI18n();
  const [touched, setTouched] = useState(false);
  const sizeProblem = p.areaHa < 1 ? t("size_small") : p.areaHa > 500 ? t("size_large") : null;
  const missing = p.rows.some((r) => !r.crop) ? t("need_crop")
    : p.irrigated === null ? t("need_irr")
      : p.priority === null ? t("need_prio") : null;
  const months = MONTHS[lang];
  const cropOptions = [...p.crops].map((c) => ({ ...c, shown: c.labels?.[lang] ?? c.label }))
    .sort((a, b) => a.shown.localeCompare(b.shown, lang));
  const problem = sizeProblem ?? missing;

  const update = (id: number, patch: Partial<CropRow>) =>
    p.setRows(p.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const pickCrop = (id: number, crop: string) => {
    const opt = p.crops.find((c) => c.crop === crop);
    update(id, opt ? { crop, sow_month: opt.sow_month, harvest_month: opt.harvest_month } : { crop });
  };

  return (
    <aside className="panel" aria-labelledby="panel-title" data-tour="panel">
      <header className="panel-head">
        <div>
          <h2 id="panel-title">{t("your_field")}</h2>
          <p className="muted">{t("ha_outlined", { ha: num(p.areaHa, 1) })}</p>
        </div>
        <button type="button" className="link-button" onClick={p.onRedraw}>{t("draw_again")}</button>
      </header>

      <section className="panel-section">
        <h3>{t("grow_q")}</h3>
        <p className="muted">{t("grow_hint")}</p>
        <ol className="crop-rows">
          {p.rows.map((r, i) => (
            <li key={r.id} className="crop-row">
              <div className="crop-row-head">
                <span className="crop-step" aria-hidden="true">{i + 1}</span>
                <select
                  aria-label={t("crop_n", { n: i + 1 })}
                  value={r.crop}
                  onChange={(e) => pickCrop(r.id, e.target.value)}
                  className={touched && !r.crop ? "is-missing" : ""}
                >
                  <option value="">{t("choose_crop")}</option>
                  {cropOptions.map((c) => <option key={c.crop} value={c.crop}>{c.shown}</option>)}
                </select>
                {p.rows.length > 1 && (
                  <button type="button" className="icon-button" aria-label={t("remove_crop", { n: i + 1 })}
                    onClick={() => p.setRows(p.rows.filter((x) => x.id !== r.id))}>
                    <IconTrash />
                  </button>
                )}
              </div>
              <div className="crop-row-months">
                <label>{t("sown_in")}
                  <select value={r.sow_month} onChange={(e) => update(r.id, { sow_month: Number(e.target.value) })}>
                    {months.map((m, k) => <option key={m} value={k + 1}>{m}</option>)}
                  </select>
                </label>
                <label>{t("harvested_in")}
                  <select value={r.harvest_month} onChange={(e) => update(r.id, { harvest_month: Number(e.target.value) })}>
                    {months.map((m, k) => <option key={m} value={k + 1}>{m}</option>)}
                  </select>
                </label>
              </div>
            </li>
          ))}
        </ol>
        {p.rows.length < 6 && (
          <button type="button" className="add-row"
            onClick={() => p.setRows([...p.rows, { id: nextId++, crop: "", sow_month: 9, harvest_month: 7 }])}>
            <IconPlus /> {t("add_next")}
          </button>
        )}
      </section>

      <section className="panel-section">
        <h3 id="irr">{t("irrigate_q")}</h3>
        <div className="choice-pair" role="radiogroup" aria-labelledby="irr">
          {[true, false].map((v) => (
            <button key={String(v)} type="button" role="radio" aria-checked={p.irrigated === v}
              className={`choice${p.irrigated === v ? " is-on" : ""}`} onClick={() => p.setIrrigated(v)}>
              {v ? t("yes") : t("no")}
            </button>
          ))}
        </div>
      </section>

      <section className="panel-section">
        <h3 id="prio">{t("matters_q")}</h3>
        <div className="choice-list" role="radiogroup" aria-labelledby="prio">
          {PRIORITIES.map((o) => (
            <button key={o.id} type="button" role="radio" aria-checked={p.priority === o.id}
              className={`choice choice-wide${p.priority === o.id ? " is-on" : ""}`} onClick={() => p.setPriority(o.id)}>
              <strong>{t(o.label)}</strong>
              <span>{t(o.hint)}</span>
            </button>
          ))}
        </div>
      </section>

      <footer className="panel-foot">
        {(touched && problem) || p.error ? (
          <p className="form-error" role="alert"><IconWarn /> {p.error ?? problem}</p>
        ) : null}
        <button
          type="button"
          className="primary"
          data-tour="analyse"
          disabled={p.busy || !!sizeProblem}
          onClick={() => { setTouched(true); if (!problem) p.onAnalyse(); }}
        >
          {p.busy ? t("analysing") : t("analyse")}
        </button>
      </footer>
    </aside>
  );
}
