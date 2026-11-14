import { useState } from "react";
import { PRIORITIES, type CropOption, type CropRow, type Health, type Issue, type Nutrient, type Priority } from "./types";
import { MONTHS, useI18n, type Key } from "./i18n";
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
  health: Health;
  setHealth: (h: Health) => void;
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
      : p.health.issues.length === 0 ? t("need_issues")
        : p.health.nutrients.length === 0 ? t("need_nutr")
          : p.priority === null ? t("need_prio") : null;
  const setH = (patch: Partial<Health>) => p.setHealth({ ...p.health, ...patch });
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

      <section className="panel-section" aria-labelledby="health-h">
        <h3 id="health-h" className="section-kicker">{t("health_h")}</h3>
        <h3 id="issues-q">{t("issues_q")}</h3>
        <p className="muted small">{t("issues_hint")}</p>
        <MultiChoice<Issue>
          labelledBy="issues-q"
          value={p.health.issues}
          onChange={(v) => setH({ issues: v })}
          only={["none", "unknown"]}
          missing={touched && p.health.issues.length === 0}
          options={[
            { id: "fungal", label: "i_fungal", hint: "i_fungal_hint" },
            { id: "viral", label: "i_viral", hint: "i_viral_hint" },
            { id: "pests", label: "i_pests", hint: "i_pests_hint" },
            { id: "none", label: "i_none" },
            { id: "unknown", label: "unsure" },
          ]}
        />
        <h3 id="nutr-q" className="q-gap">{t("nutr_q")}</h3>
        <MultiChoice<Nutrient>
          labelledBy="nutr-q"
          value={p.health.nutrients}
          onChange={(v) => setH({ nutrients: v })}
          only={["normal", "unknown"]}
          missing={touched && p.health.nutrients.length === 0}
          options={[
            { id: "normal", label: "n_normal" },
            { id: "high_n", label: "n_high" },
            { id: "low_n", label: "n_low_n" },
            { id: "low_p", label: "n_low_p" },
            { id: "low_k", label: "n_low_k" },
            { id: "unknown", label: "unsure" },
          ]}
        />
      </section>

      <details className="panel-section soil-optional">
        <summary>
          <span><strong>{t("soil_opt")}</strong><span className="muted small">{t("soil_opt_hint")}</span></span>
        </summary>
        <h3 id="tex-q">{t("texture_q")}</h3>
        <SingleChoice
          labelledBy="tex-q"
          value={p.health.soil_texture}
          onChange={(v) => setH({ soil_texture: v as Health["soil_texture"] })}
          options={[{ id: "sandy", label: "t_sandy" }, { id: "loamy", label: "t_loamy" }, { id: "clay", label: "t_clay" },
            { id: "unknown", label: "unsure" }]}
        />
        <h3 id="look-q" className="q-gap">{t("look_q")}</h3>
        <SingleChoice
          labelledBy="look-q"
          value={p.health.soil_look}
          onChange={(v) => setH({ soil_look: v as Health["soil_look"] })}
          options={[{ id: "red", label: "l_red", hint: "l_red_hint", swatch: "#9c4a2f" },
            { id: "light", label: "l_light", hint: "l_light_hint", swatch: "#d9cfbd" },
            { id: "dark", label: "l_dark", hint: "l_dark_hint", swatch: "#2e2620" },
            { id: "unknown", label: "unsure" }]}
        />
        <label className="ph-field q-gap">{t("ph_q")}
          <input type="number" inputMode="decimal" min={3} max={10} step={0.1} placeholder="6.5"
            value={p.health.ph ?? ""}
            onChange={(e) => {
              const v = e.target.value === "" ? null : Number(e.target.value.replace(",", "."));
              setH({ ph: v !== null && v >= 3 && v <= 10 ? v : null });
            }} />
        </label>
        <h3 id="src-q" className="q-gap">{t("source_q")}</h3>
        <SingleChoice
          labelledBy="src-q"
          value={p.health.soil_source}
          onChange={(v) => setH({ soil_source: v as Health["soil_source"] })}
          options={[{ id: "analysis", label: "s_analysis" }, { id: "experience", label: "s_experience" }]}
        />
      </details>

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

interface Opt<T extends string> { id: T; label: Key; hint?: Key; swatch?: string }

/** Several answers allowed; "only" answers (such as "No problems" or "Not sure") clear the others. */
function MultiChoice<T extends string>({ options, value, onChange, only, labelledBy, missing }: {
  options: Opt<T>[]; value: T[]; onChange: (v: T[]) => void; only: T[]; labelledBy: string; missing?: boolean;
}) {
  const { t } = useI18n();
  const toggle = (id: T) => {
    if (value.includes(id)) onChange(value.filter((x) => x !== id));
    else if (only.includes(id)) onChange([id]);
    else onChange([...value.filter((x) => !only.includes(x)), id]);
  };
  return (
    <div className={`chips${missing ? " is-missing" : ""}`} role="group" aria-labelledby={labelledBy}>
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value.includes(o.id)}
          className={`chip${value.includes(o.id) ? " is-on" : ""}${o.hint ? " chip-wide" : ""}`} onClick={() => toggle(o.id)}>
          <strong>{t(o.label)}</strong>{o.hint && <span>{t(o.hint)}</span>}
        </button>
      ))}
    </div>
  );
}

function SingleChoice({ options, value, onChange, labelledBy }: {
  options: Opt<string>[]; value: string; onChange: (v: string) => void; labelledBy: string;
}) {
  const { t } = useI18n();
  return (
    <div className="chips" role="radiogroup" aria-labelledby={labelledBy}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id}
          className={`chip${value === o.id ? " is-on" : ""}${o.hint ? " chip-wide" : ""}`} onClick={() => onChange(o.id)}>
          {o.swatch && <span className="swatch" style={{ background: o.swatch }} aria-hidden="true" />}
          <strong>{t(o.label)}</strong>{o.hint && <span>{t(o.hint)}</span>}
        </button>
      ))}
    </div>
  );
}
