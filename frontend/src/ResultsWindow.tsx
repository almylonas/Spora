import { useEffect, useRef, useState } from "react";
import MonthStrip from "./MonthStrip";
import { LangSwitch, useI18n, type Key } from "./i18n";
import { PRIORITIES, type Analysis, type Priority, type RotationResult, type RotationWords, type SoilAnswer } from "./types";
import {
  IconArrow, IconAsk, IconChevron, IconClose, IconCoin, IconDown, IconDrop, IconLeaf, IconRain, IconSame, IconSprout,
  IconUp, IconWarn, IconBug, IconCheck, IconSpeaker, IconSave,
} from "./icons";

interface Props {
  data: Analysis | null;
  busy: boolean;
  error: string | null;
  soilAnswer: SoilAnswer;
  onSoilAnswer: (a: SoilAnswer) => void;
  priority: Priority;
  onPriority: (p: Priority) => void;
  onClose: () => void;
  onSave: () => void;
}

const ROT_NAME: Record<RotationResult["id"], Key> = {
  current: "r_current", soil_building: "r_soil_building", water_saving: "r_water_saving",
};

export default function ResultsWindow(p: Props) {
  const { t } = useI18n();
  const [slide, setSlide] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(p.onClose);
  closeRef.current = p.onClose;
  const slides = [t("tab_field"), t("tab_options")];

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

  useEffect(() => { dialogRef.current?.querySelectorAll(".slide")[slide]?.scrollTo(0, 0); }, [slide]);

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) p.onClose(); }}>
      <div className="window" role="dialog" aria-modal="true" aria-labelledby="window-title" tabIndex={-1} ref={dialogRef}>
        <header className="window-head">
          <h2 id="window-title" className="sr-only">{t("analysis_title")}</h2>
          <div className="tabs" role="tablist">
            {slides.map((s, i) => (
              <button key={i} role="tab" aria-selected={slide === i} className={`tab${slide === i ? " is-on" : ""}`}
                onClick={() => setSlide(i)} disabled={!p.data}>
                <span className="tab-dot" aria-hidden="true" />{s}
              </button>
            ))}
          </div>
          <div className="window-head-end">
            <LangSwitch className="window-lang desktop-only-flex" />
            <button type="button" className="icon-button" onClick={p.onClose} aria-label={t("close_window")}>
              <IconClose />
            </button>
          </div>
        </header>

        <div className="slides" style={{ transform: `translateX(${-slide * 100}%)` }}>
          <section className="slide" role="tabpanel" aria-label={slides[0]} aria-hidden={slide !== 0}>
            {p.error ? <ErrorState message={p.error} /> : !p.data ? <Loading /> : (
              <FieldSlide data={p.data} soilAnswer={p.soilAnswer} onSoilAnswer={p.onSoilAnswer} busy={p.busy} />
            )}
            <p className="disclaimer phone-only">{t("disclaimer")}</p>
          </section>
          <section className="slide" role="tabpanel" aria-label={slides[1]} aria-hidden={slide !== 1}>
            {p.data && <OptionsSlide data={p.data} priority={p.priority} onPriority={p.onPriority} busy={p.busy} />}
            <p className="disclaimer phone-only">{t("disclaimer")}</p>
          </section>
        </div>

        <footer className="window-foot">
          <p className="disclaimer desktop-only">{t("disclaimer")}</p>
          <LangSwitch className="window-lang phone-only-flex" />
          <button type="button" className="save-button" disabled={!p.data} onClick={p.onSave}>
            <IconSave /> {t("save_field")}
          </button>
          {slide === 0 ? (
            <button type="button" className="primary" disabled={!p.data} onClick={() => setSlide(1)}>
              {t("compare")} <IconArrow dir="right" />
            </button>
          ) : (
            <button type="button" className="secondary" onClick={() => setSlide(0)}>
              <IconArrow dir="left" /> {t("back_field")}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function Loading() {
  const { t } = useI18n();
  return (
    <div className="state">
      <div className="loader" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <span key={i} style={{ animationDelay: `${i * 90}ms` }} />)}</div>
      <p className="state-title">{t("loading")}</p>
      <p className="muted">{t("loading_sub")}</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  const { t } = useI18n();
  return (
    <div className="state">
      <p className="state-title">{t("error_title")}</p>
      <p>{message}</p>
      <p className="muted">{t("error_hint")}</p>
    </div>
  );
}

/* ---------------- Slide 1: the field ---------------- */

const TREND_ICON = { up: <IconUp />, down: <IconDown />, same: <IconSame /> };

function FieldSlide({ data, soilAnswer, onSoilAnswer, busy }: {
  data: Analysis; soilAnswer: SoilAnswer; onSoilAnswer: (a: SoilAnswer) => void; busy: boolean;
}) {
  const { t } = useI18n();
  const w = data.words;
  const current = data.result.rotations.find((r) => r.id === "current")!;
  const answers: [SoilAnswer, Key][] = [["bare", "bare_soil"], ["stubble", "stubble"], ["other", "something_else"]];
  return (
    <div className="field-slide">
      <div className="field-col">
        <h3 className="slide-title">{t("weather_title")}</h3>
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
          <h4>{t("water_h")}</h4>
          <p>{w.water}</p>
        </div>
      </div>

      <div className="field-col">
        <h3 className="slide-title">{t("bare_title")}</h3>
        <MonthStrip items={current.timeline} />
        <ul className="plain-list">
          <li>{w.soil.covered}</li>
          <li>{w.soil.rain} {t("heavy_note")}</li>
          {w.soil.slope && <li>{w.soil.slope}</li>}
        </ul>
        {w.health && (w.health.lines.length > 0 || w.health.ask.length > 0) && (
          <div className="health-note">
            <h4><IconBug /> {t("health_h")}</h4>
            <ul>{w.health.lines.map((x) => <li key={x}>{x}</li>)}</ul>
            {w.health.ask.length > 0 && (
              <>
                <h5><IconAsk /> {t("health_ask_h")}</h5>
                <ul>{w.health.ask.map((x) => <li key={x}>{x}</li>)}</ul>
              </>
            )}
          </div>
        )}
        {w.satellite && (
          <div className="space-note">
            <h4>{t("space_h")}</h4>
            <p>{w.satellite.agreement}</p>
            {w.satellite.blind && <p className="muted small">{w.satellite.blind}</p>}
          </div>
        )}

        <fieldset className="confirm" disabled={busy}>
          <legend>{t("confirm_legend")}</legend>
          <p className="muted small">{t("confirm_hint")}</p>
          <div className="choice-pair three">
            {answers.map(([v, label]) => (
              <button key={v} type="button" className={`choice${soilAnswer === v ? " is-on" : ""}`}
                aria-pressed={soilAnswer === v} onClick={() => onSoilAnswer(v)}>
                {t(label)}
              </button>
            ))}
          </div>
          {busy && <p className="muted small" role="status">{t("updating")}</p>}
        </fieldset>

        <div className="sources">
          <h4>{t("sources_h")}</h4>
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
  const { t } = useI18n();
  const ranking = data.result.ranking;
  const order = [...data.result.rotations].sort((a, b) => rankOf(ranking, a.id) - rankOf(ranking, b.id));
  const current = data.result.rotations.find((r) => r.id === "current")!;
  const maxWater = Math.max(1, ...data.result.rotations.map((r) => r.extra_water_mm_per_year ?? 0));
  const shared = data.words.shared_warnings;
  // Show "cereal after cereal" when any option has it, so the cards can be compared on pest pressure
  const showCereal = data.result.rotations.some((r) => (r.health?.cereal_repeats ?? 0) > 0);
  return (
    <div className="options-slide">
      <div className="decision">
        <div className="decision-main">
          <p className="decision-text">{data.words.summary}</p>
          <ReadAloud text={[data.words.summary, ...shared].join(" ")} />
        </div>
        <div className="priority-switch" role="radiogroup" aria-label={t("matters_aria")}>
          {PRIORITIES.map((o) => (
            <button key={o.id} type="button" role="radio" aria-checked={priority === o.id} disabled={busy}
              className={`pill${priority === o.id ? " is-on" : ""}`} onClick={() => onPriority(o.id)}>
              {t(o.label)}
            </button>
          ))}
        </div>
      </div>

      {shared.length > 0 && (
        <section className="shared-warnings">
          <h3><IconWarn /> {shared.length === 1 ? t("shared_h1") : t("shared_h", { n: shared.length })}</h3>
          <p className="muted small">{t("shared_hint")}</p>
          <SharedList items={shared} />
        </section>
      )}

      <div className={`cards${busy ? " is-busy" : ""}`}>
        {order.map((r) => (
          <OptionCard
            key={r.id}
            rot={r}
            current={current}
            maxWater={maxWater}
            priority={priority}
            words={data.words.rotations.find((x) => x.id === r.id)!}
            best={ranking[0] === r.id}
            showCereal={showCereal}
          />
        ))}
      </div>
    </div>
  );
}

function SharedList({ items }: { items: string[] }) {
  const { t } = useI18n();
  const [all, setAll] = useState(false);
  const show = 2;
  return (
    <>
      <ul>{(all ? items : items.slice(0, show)).map((s) => <li key={s}>{s}</li>)}</ul>
      {items.length > show && (
        <button type="button" className="link-button small-link" onClick={() => setAll(!all)} aria-expanded={all}>
          {all ? t("show_less") : t("show_more", { n: items.length - show })}
        </button>
      )}
    </>
  );
}

function rankOf(ranking: string[], id: string) {
  const i = ranking.indexOf(id);
  return i === -1 ? 99 : i;
}

type Dir = "better" | "worse" | "same";

/** Compare with the current rotation; `higherIsBetter` says which way is good. */
function compare(value: number, now: number, higherIsBetter: boolean, tolerance: number): Dir {
  if (Math.abs(value - now) < tolerance) return "same";
  return (value > now) === higherIsBetter ? "better" : "worse";
}

function OptionCard({ rot, current, maxWater, priority, words, best, showCereal }: {
  rot: RotationResult; current: RotationResult; maxWater: number; priority: Priority; words: RotationWords; best: boolean;
  showCereal: boolean;
}) {
  const { t, num } = useI18n();
  const name = t(ROT_NAME[rot.id]);
  const badge = best ? t("best_match") : rot.id === "current" ? t("grow_now") : null;
  if (!words.available) {
    return (
      <article className="card is-unavailable">
        <header className="card-head"><h3>{name}</h3></header>
        <p className="card-reason">{words.reason}</p>
      </article>
    );
  }
  const isCurrent = rot.id === "current";
  const cover = rot.months_covered_per_year ?? 0;
  const rain = rot.rain_on_open_soil_pct ?? 0;
  const water = rot.extra_water_mm_per_year ?? 0;
  const earn = rot.earning_months_per_year ?? 0;
  const reps = rot.health?.cereal_repeats ?? 0;
  const years = Math.max(1, Math.round((rot.cycle_months ?? 12) / 12));
  const mains = (rot.crops ?? []).filter((c) => !c.cover_crop).length;
  const speech = [words.decision ?? "", ...(words.better ?? []), ...(words.warnings ?? [])].join(" ");
  return (
    <article className={`card${best ? " is-best" : ""}`}>
      <header className="card-head">
        <h3>{name}</h3>
        {badge && <span className={`badge${best ? " badge-best" : ""}`}>{badge}</span>}
      </header>
      <p className="card-decision">{words.decision}</p>
      <ReadAloud text={`${name}. ${speech}`} />

      {/* The advice in words comes first; the numbers and months follow for those who want them */}
      {words.better && words.better.length > 0 && (
        <TextList title={t("why_h")} icon={<IconLeaf />} items={words.better} tone="good" show={3} />
      )}
      {words.warnings && words.warnings.length > 0 && (
        <TextList title={t("warnings_h")} icon={<IconWarn />} items={words.warnings} tone="warn" show={isCurrent ? 3 : 2} />
      )}
      {words.ask_advisor && words.ask_advisor.length > 0 && (
        <div className="more">
          <More title={t("advisor_h")} icon={<IconAsk />} items={words.ask_advisor} tone="ask" />
        </div>
      )}

      <section className="card-numbers" aria-label={t("in_numbers")}>
        <h4 className="numbers-h">{t("in_numbers")}</h4>
        <dl className="glance">
          <GlanceRow icon={<IconSprout />} label={t("g_cover")} value={t("g_cover_val", { n: num(cover) })}
            bar={<MonthsBar months={cover} />}
            dir={isCurrent ? null : compare(cover, current.months_covered_per_year ?? 0, true, 0.5)} />
          <GlanceRow icon={<IconRain />} label={t("g_rain")} value={`${num(rain)} %`}
            bar={<Bar share={rain / 100} tone="loam" />}
            dir={isCurrent ? null : compare(rain, current.rain_on_open_soil_pct ?? 0, false, 3)} />
          <GlanceRow icon={<IconDrop />} label={t("g_water")} value={t("g_water_val", { n: num(water) })}
            bar={<Bar share={water / maxWater} tone="sky" />}
            dir={isCurrent ? null : compare(water, current.extra_water_mm_per_year ?? 0, false, 10)} />
          {showCereal && (
            <GlanceRow icon={<IconBug />} label={t("g_cereal")}
              value={reps === 0 ? t("g_cereal_none") : t("g_cereal_val", { n: `${reps}×`, y: years })}
              bar={<Bar share={Math.min(1, reps / Math.max(1, mains))} tone="beet" />}
              dir={isCurrent ? null : compare(reps, current.health?.cereal_repeats ?? 0, false, 0.5)} />
          )}
          {priority === "income_forage" && (
            <GlanceRow icon={<IconCoin />} label={t("g_earn")} value={t("g_earn_val", { n: num(earn, 1) })}
              bar={<Bar share={earn / 12} tone="straw" />}
              dir={isCurrent ? null : compare(earn, current.earning_months_per_year ?? 0, true, 0.5)} />
          )}
        </dl>
        <details className="months-more">
          <summary><span>{t("month_by_month")}</span><span className="chev" aria-hidden="true"><IconChevron /></span></summary>
          <MonthStrip items={rot.timeline} compact />
        </details>
      </section>
    </article>
  );
}

/** A list shown as text, with the first few lines always visible. */
function TextList({ title, icon, items, tone, show }: {
  title: string; icon: React.ReactNode; items: string[]; tone: string; show: number;
}) {
  const { t } = useI18n();
  const [all, setAll] = useState(false);
  const visible = all ? items : items.slice(0, show);
  return (
    <section className={`text-list tone-${tone}`}>
      <h4><span className="more-icon" aria-hidden="true">{icon}</span>{title}</h4>
      <ul>{visible.map((s) => <li key={s}>{s}</li>)}</ul>
      {items.length > show && (
        <button type="button" className="link-button small-link" onClick={() => setAll(!all)} aria-expanded={all}>
          {all ? t("show_less") : t("show_more", { n: items.length - show })}
        </button>
      )}
    </section>
  );
}

/** Reads the advice out loud with the browser's own voice, in the chosen language. */
const VOICE_LANG = { en: "en-GB", de: "de-DE", el: "el-GR" } as const;
function ReadAloud({ text }: { text: string }) {
  const { t, lang } = useI18n();
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => () => { if (speaking) window.speechSynthesis?.cancel(); }, [speaking]);
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const toggle = () => {
    const synth = window.speechSynthesis;
    if (speaking) { synth.cancel(); setSpeaking(false); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = VOICE_LANG[lang];
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang));
    if (voice) u.voice = voice;
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.speak(u);
    setSpeaking(true);
  };
  return (
    <button type="button" className={`read-aloud${speaking ? " is-on" : ""}`} onClick={toggle} aria-pressed={speaking}>
      <IconSpeaker /> {speaking ? t("stop_reading") : t("read_aloud")}
    </button>
  );
}

function GlanceRow({ icon, label, value, bar, dir }: {
  icon: React.ReactNode; label: string; value: string; bar: React.ReactNode; dir: Dir | null;
}) {
  const { t } = useI18n();
  const word = dir === "better" ? t("g_better") : dir === "worse" ? t("g_worse") : t("g_same");
  return (
    <div className="glance-row">
      <dt><span className="glance-icon" aria-hidden="true">{icon}</span>{label}</dt>
      <dd>
        {bar}
        <span className="glance-value">{value}</span>
        {dir && (
          <span className={`delta delta-${dir}`} title={word}>
            <span aria-hidden="true">{dir === "better" ? <IconCheck /> : dir === "worse" ? <IconWarn /> : <IconSame />}</span>
            <span className="sr-only">{word}</span>
          </span>
        )}
      </dd>
    </div>
  );
}

function MonthsBar({ months }: { months: number }) {
  const full = Math.round(months);
  return (
    <span className="months-bar" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => <span key={i} className={i < full ? "on" : ""} />)}
    </span>
  );
}

function Bar({ share, tone }: { share: number; tone: string }) {
  return (
    <span className={`bar bar-${tone}`} aria-hidden="true">
      <span style={{ width: `${Math.max(0, Math.min(1, share)) * 100}%` }} />
    </span>
  );
}

function More({ title, icon, items, tone }: { title: string; icon: React.ReactNode; items: string[]; tone: string }) {
  return (
    <details className={`more-item tone-${tone}`}>
      <summary>
        <span className="more-icon" aria-hidden="true">{icon}</span>
        <span className="more-title">{title}</span>
        <span className="more-count">{items.length}</span>
        <span className="chev" aria-hidden="true"><IconChevron /></span>
      </summary>
      <ul>{items.map((s) => <li key={s}>{s}</li>)}</ul>
    </details>
  );
}
