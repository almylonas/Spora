import { useEffect, useRef, useState } from "react";
import MonthStrip from "./MonthStrip";
import { PRIORITIES, type Analysis, type Priority, type RotationResult, type RotationWords, type SoilAnswer } from "./types";
import { IconArrow, IconAsk, IconClose, IconDown, IconLeaf, IconSame, IconUp, IconWarn } from "./icons";

interface Props {
  data: Analysis | null;
  busy: boolean;
  error: string | null;
  soilAnswer: SoilAnswer;
  onSoilAnswer: (a: SoilAnswer) => void;
  priority: Priority;
  onPriority: (p: Priority) => void;
  onClose: () => void;
}

const SLIDES = ["Your field", "Your options"] as const;

export default function ResultsWindow(p: Props) {
  const [slide, setSlide] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(p.onClose);
  closeRef.current = p.onClose;

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      const typing = (e.target as HTMLElement).closest("input, select, textarea");
      if (!typing && e.key === "ArrowRight") setSlide(1);
      if (!typing && e.key === "ArrowLeft") setSlide(0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { dialogRef.current?.querySelector(".slide")?.scrollTo(0, 0); }, [slide]);

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) p.onClose(); }}>
      <div className="window" role="dialog" aria-modal="true" aria-labelledby="window-title" tabIndex={-1} ref={dialogRef}>
        <header className="window-head">
          <h2 id="window-title" className="sr-only">Analysis of your field</h2>
          <div className="tabs" role="tablist">
            {SLIDES.map((s, i) => (
              <button key={s} role="tab" aria-selected={slide === i} className={`tab${slide === i ? " is-on" : ""}`}
                onClick={() => setSlide(i)} disabled={!p.data}>
                <span className="tab-dot" aria-hidden="true" />{s}
              </button>
            ))}
          </div>
          <button type="button" className="icon-button" onClick={p.onClose} aria-label="Close and go back to the map">
            <IconClose />
          </button>
        </header>

        <div className="slides" style={{ transform: `translateX(${-slide * 100}%)` }}>
          <section className="slide" role="tabpanel" aria-label="Your field" aria-hidden={slide !== 0}>
            {p.error ? <ErrorState message={p.error} /> : !p.data ? <Loading /> : (
              <FieldSlide data={p.data} soilAnswer={p.soilAnswer} onSoilAnswer={p.onSoilAnswer} busy={p.busy} />
            )}
            <p className="disclaimer phone-only">FieldShift supports your judgement. It does not replace local advice.</p>
          </section>
          <section className="slide" role="tabpanel" aria-label="Your options" aria-hidden={slide !== 1}>
            {p.data && <OptionsSlide data={p.data} priority={p.priority} onPriority={p.onPriority} busy={p.busy} />}
            <p className="disclaimer phone-only">FieldShift supports your judgement. It does not replace local advice.</p>
          </section>
        </div>

        <footer className="window-foot">
          <p className="disclaimer desktop-only">FieldShift supports your judgement. It does not replace local advice.</p>
          {slide === 0 ? (
            <button type="button" className="primary" disabled={!p.data} onClick={() => setSlide(1)}>
              Compare rotations <IconArrow dir="right" />
            </button>
          ) : (
            <button type="button" className="secondary" onClick={() => setSlide(0)}>
              <IconArrow dir="left" /> Back to your field
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="state">
      <div className="loader" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <span key={i} style={{ animationDelay: `${i * 90}ms` }} />)}</div>
      <p className="state-title">Reading 40 years of weather for your field…</p>
      <p className="muted">This takes a few seconds the first time.</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="state">
      <p className="state-title">The analysis did not finish</p>
      <p>{message}</p>
      <p className="muted">Close this window to adjust your field or crops, then try again.</p>
    </div>
  );
}

/* ---------------- Slide 1: the field ---------------- */

const TREND_ICON = { up: <IconUp />, down: <IconDown />, same: <IconSame /> };

function FieldSlide({ data, soilAnswer, onSoilAnswer, busy }: {
  data: Analysis; soilAnswer: SoilAnswer; onSoilAnswer: (a: SoilAnswer) => void; busy: boolean;
}) {
  const w = data.words;
  const current = data.result.rotations.find((r) => r.id === "current")!;
  return (
    <div className="field-slide">
      <div className="field-col">
        <h3 className="slide-title">How the weather here has changed</h3>
        <p className="muted small">{w.weather_period}</p>
        <ul className="trend-list">
          {w.weather.map((x) => (
            <li key={x.topic} className={`trend trend-${x.trend}`}>
              <span className="trend-icon" aria-hidden="true">{TREND_ICON[x.trend]}</span>
              <span>{x.text}</span>
            </li>
          ))}
        </ul>
        <div className="water-note">
          <h4>Water</h4>
          <p>{w.water}</p>
        </div>
      </div>

      <div className="field-col">
        <h3 className="slide-title">When your soil is bare</h3>
        <MonthStrip items={current.timeline} />
        <ul className="plain-list">
          <li>{w.soil.covered}</li>
          <li>{w.soil.rain} Bare soil in heavy rain is where soil and nutrients are lost.</li>
        </ul>

        <fieldset className="confirm" disabled={busy}>
          <legend>Is the soil really bare after harvest?</legend>
          <p className="muted small">We assumed nothing covers the soil between your crops. Tell us what you usually leave.</p>
          <div className="choice-pair three">
            {([["bare", "Bare soil"], ["stubble", "Stubble left"], ["other", "Something else"]] as const).map(([v, label]) => (
              <button key={v} type="button" className={`choice${soilAnswer === v ? " is-on" : ""}`}
                aria-pressed={soilAnswer === v} onClick={() => onSoilAnswer(v)}>
                {label}
              </button>
            ))}
          </div>
          {busy && <p className="muted small" role="status">Updating with your answer…</p>}
        </fieldset>

        <div className="sources">
          <h4>Where this comes from</h4>
          <ul>{w.sources.map((s) => <li key={s}>{s}</li>)}</ul>
          {data.weather_note && <p className="notice">{data.weather_note}</p>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Slide 2: the options ---------------- */

function OptionsSlide({ data, priority, onPriority, busy }: {
  data: Analysis; priority: Priority; onPriority: (p: Priority) => void; busy: boolean;
}) {
  const ranking = data.result.ranking;
  const order = [...data.result.rotations].sort((a, b) => rankOf(ranking, a.id) - rankOf(ranking, b.id));
  return (
    <div className="options-slide">
      <div className="decision">
        <p className="decision-text">{data.words.summary}</p>
        <div className="priority-switch" role="radiogroup" aria-label="What matters most to you">
          {PRIORITIES.map((o) => (
            <button key={o.id} type="button" role="radio" aria-checked={priority === o.id} disabled={busy}
              className={`pill${priority === o.id ? " is-on" : ""}`} onClick={() => onPriority(o.id)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div className={`cards${busy ? " is-busy" : ""}`}>
        {order.map((r) => (
          <OptionCard
            key={r.id}
            rot={r}
            words={data.words.rotations.find((x) => x.id === r.id)!}
            best={ranking[0] === r.id}
          />
        ))}
      </div>
    </div>
  );
}

function rankOf(ranking: string[], id: string) {
  const i = ranking.indexOf(id);
  return i === -1 ? 99 : i;
}

function OptionCard({ rot, words, best }: { rot: RotationResult; words: RotationWords; best: boolean }) {
  const badge = best ? "Best match" : rot.id === "current" ? "What you grow now" : null;
  if (!words.available) {
    return (
      <article className="card is-unavailable">
        <header className="card-head"><h3>{rot.name}</h3></header>
        <p className="card-reason">{words.reason}</p>
      </article>
    );
  }
  return (
    <article className={`card${best ? " is-best" : ""}`}>
      <header className="card-head">
        <h3>{rot.name}</h3>
        {badge && <span className={`badge${best ? " badge-best" : ""}`}>{badge}</span>}
      </header>
      <MonthStrip items={rot.timeline} compact />
      <p className="card-decision">{words.decision}</p>

      {words.better && words.better.length > 0 && (
        <CardList title="What gets better" icon={<IconLeaf />} items={words.better} tone="good" />
      )}
      {words.warnings && words.warnings.length > 0 && (
        <CardList title="Warnings" icon={<IconWarn />} items={words.warnings} tone="warn" />
      )}
      {words.ask_advisor && words.ask_advisor.length > 0 && (
        <CardList title="Ask your advisor" icon={<IconAsk />} items={words.ask_advisor} tone="ask" />
      )}

      <details className="numbers">
        <summary>Show the numbers</summary>
        <dl>
          <dt>Months a year with something growing</dt><dd>{rot.months_covered_per_year}</dd>
          <dt>Share of rain on bare soil</dt><dd>{rot.rain_on_open_soil_pct}%</dd>
          <dt>Extra water needed a year</dt><dd>{rot.extra_water_mm_per_year} mm</dd>
          <dt>Months a year with a crop to sell or graze</dt><dd>{rot.earning_months_per_year}</dd>
        </dl>
      </details>
    </article>
  );
}

function CardList({ title, icon, items, tone }: { title: string; icon: React.ReactNode; items: string[]; tone: string }) {
  return (
    <section className={`card-list tone-${tone}`}>
      <h4>{title}</h4>
      <ul>{items.map((t) => <li key={t}><span aria-hidden="true">{icon}</span><span>{t}</span></li>)}</ul>
    </section>
  );
}
