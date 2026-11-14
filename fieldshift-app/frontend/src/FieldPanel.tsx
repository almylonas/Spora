import { useState } from "react";
import { MONTHS, PRIORITIES, type CropOption, type CropRow, type Priority } from "./types";
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
  const [touched, setTouched] = useState(false);
  const sizeProblem = p.areaHa < 1 ? "This outline is smaller than 1 hectare. Draw the whole field."
    : p.areaHa > 500 ? "This outline is larger than 500 hectares. Draw a single field." : null;
  const missing = p.rows.some((r) => !r.crop) ? "Choose a crop in every row."
    : p.irrigated === null ? "Tell us whether you can irrigate."
      : p.priority === null ? "Choose what matters most to you." : null;
  const problem = sizeProblem ?? missing;

  const update = (id: number, patch: Partial<CropRow>) =>
    p.setRows(p.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const pickCrop = (id: number, crop: string) => {
    const opt = p.crops.find((c) => c.crop === crop);
    update(id, opt ? { crop, sow_month: opt.sow_month, harvest_month: opt.harvest_month } : { crop });
  };

  return (
    <aside className="panel" aria-labelledby="panel-title">
      <header className="panel-head">
        <div>
          <h2 id="panel-title">Your field</h2>
          <p className="muted">{p.areaHa.toFixed(1)} hectares outlined</p>
        </div>
        <button type="button" className="link-button" onClick={p.onRedraw}>Draw again</button>
      </header>

      <section className="panel-section">
        <h3>What do you grow here, in order?</h3>
        <p className="muted">Start with the crop you sow next and add the ones that follow, up to six.</p>
        <ol className="crop-rows">
          {p.rows.map((r, i) => (
            <li key={r.id} className="crop-row">
              <div className="crop-row-head">
                <span className="crop-step" aria-hidden="true">{i + 1}</span>
                <select
                  aria-label={`Crop ${i + 1}`}
                  value={r.crop}
                  onChange={(e) => pickCrop(r.id, e.target.value)}
                  className={touched && !r.crop ? "is-missing" : ""}
                >
                  <option value="">Choose a crop</option>
                  {p.crops.map((c) => <option key={c.crop} value={c.crop}>{c.label}</option>)}
                </select>
                {p.rows.length > 1 && (
                  <button type="button" className="icon-button" aria-label={`Remove crop ${i + 1}`}
                    onClick={() => p.setRows(p.rows.filter((x) => x.id !== r.id))}>
                    <IconTrash />
                  </button>
                )}
              </div>
              <div className="crop-row-months">
                <label>Sown in
                  <select value={r.sow_month} onChange={(e) => update(r.id, { sow_month: Number(e.target.value) })}>
                    {MONTHS.map((m, k) => <option key={m} value={k + 1}>{m}</option>)}
                  </select>
                </label>
                <label>Harvested in
                  <select value={r.harvest_month} onChange={(e) => update(r.id, { harvest_month: Number(e.target.value) })}>
                    {MONTHS.map((m, k) => <option key={m} value={k + 1}>{m}</option>)}
                  </select>
                </label>
              </div>
            </li>
          ))}
        </ol>
        {p.rows.length < 6 && (
          <button type="button" className="add-row"
            onClick={() => p.setRows([...p.rows, { id: nextId++, crop: "", sow_month: 9, harvest_month: 7 }])}>
            <IconPlus /> Add the next crop
          </button>
        )}
      </section>

      <section className="panel-section">
        <h3 id="irr">Can you irrigate this field?</h3>
        <div className="choice-pair" role="radiogroup" aria-labelledby="irr">
          {[true, false].map((v) => (
            <button key={String(v)} type="button" role="radio" aria-checked={p.irrigated === v}
              className={`choice${p.irrigated === v ? " is-on" : ""}`} onClick={() => p.setIrrigated(v)}>
              {v ? "Yes" : "No"}
            </button>
          ))}
        </div>
      </section>

      <section className="panel-section">
        <h3 id="prio">What matters most to you?</h3>
        <div className="choice-list" role="radiogroup" aria-labelledby="prio">
          {PRIORITIES.map((o) => (
            <button key={o.id} type="button" role="radio" aria-checked={p.priority === o.id}
              className={`choice choice-wide${p.priority === o.id ? " is-on" : ""}`} onClick={() => p.setPriority(o.id)}>
              <strong>{o.label}</strong>
              <span>{o.hint}</span>
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
          disabled={p.busy || !!sizeProblem}
          onClick={() => { setTouched(true); if (!problem) p.onAnalyse(); }}
        >
          {p.busy ? "Analysing your field…" : "Analyse my field"}
        </button>
      </footer>
    </aside>
  );
}
