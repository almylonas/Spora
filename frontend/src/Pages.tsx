import { useEffect } from "react";
import { LangSwitch, useI18n, type Key } from "./i18n";
import { TEAM, TEAM_NAME, TEAM_THANKS } from "./team";

export type Page = "home" | "how" | "about";

export function go(hash: string) { window.location.hash = hash; }

/** Top bar of the start page and its two sub-pages: three links and the language switch. */
export function LandNav({ page }: { page: Page }) {
  const { t } = useI18n();
  const link = (id: Page, hash: string, label: Key) => (
    <a href={`#${hash}`} className={page === id ? "is-on" : ""} aria-current={page === id ? "page" : undefined}
      onClick={(e) => { e.preventDefault(); go(hash); }}>{t(label)}</a>
  );
  return (
    <header className="land-nav">
      <nav aria-label={t("nav_label")}>
        {link("home", "", "nav_home")}
        {link("how", "how", "nav_how")}
        {link("about", "about", "nav_about")}
      </nav>
      <LangSwitch className="land-lang" />
    </header>
  );
}

export function LandFooter() {
  const { t } = useI18n();
  return (
    <footer className="land-foot">
      <img src="/landing/spora-logo.png" alt="" aria-hidden="true" />
      <p>{t("disclaimer")}</p>
      <p className="land-foot-links">
        <a href="#how" onClick={(e) => { e.preventDefault(); go("how"); }}>{t("nav_how")}</a>
        <a href="#about" onClick={(e) => { e.preventDefault(); go("about"); }}>{t("nav_about")}</a>
      </p>
    </footer>
  );
}

function Shell({ page, title, children }: { page: Page; title: Key; children: React.ReactNode }) {
  const { t } = useI18n();
  useEffect(() => { document.title = `${t(title)} · Spora`; }, [t, title]);
  return (
    <div className="landing subpage">
      <LandNav page={page} />
      <main className="sub-main">{children}</main>
      <section className="land-cta">
        <p>{t("ready")}</p>
        <button type="button" className="hero-cta" onClick={() => go("map")}>{t("draw")}</button>
      </section>
      <LandFooter />
    </div>
  );
}

/* ------------------------------------------------------------------ About */
const IMPACT: { t: Key; d: Key }[] = [
  { t: "imp1_t", d: "imp1_d" },
  { t: "imp2_t", d: "imp2_d" },
  { t: "imp3_t", d: "imp3_d" },
];

export function AboutPage() {
  const { t } = useI18n();
  return (
    <Shell page="about" title="about_title">
      <h1 className="sub-title">{t("about_title")}</h1>

      <section className="sub-block">
        <h2>{t("why_t")}</h2>
        <div className="sub-prose">
          <p>{t("why_1")}</p>
          <p>{t("why_2")}</p>
        </div>
      </section>

      <section className="sub-block">
        <h2>{t("what_t")}</h2>
        <div className="sub-prose"><p>{t("what_d")}</p></div>
      </section>

      <section className="sub-block">
        <h2>{t("impact_t")}</h2>
        <ul className="impact-list">
          {IMPACT.map((i) => (
            <li key={i.t}><h3>{t(i.t)}</h3><p>{t(i.d)}</p></li>
          ))}
        </ul>
      </section>

      <section className="sub-block">
        <h2>{t("scope_t")}</h2>
        <div className="sub-prose"><p>{t("scope_d")}</p></div>
      </section>

      <section className="sub-block">
        <h2>{t("team_t")}</h2>
        <p className="team-sub">{TEAM_NAME} · {t("team_event")}</p>
        <ul className="team-list">
          {TEAM.map((m, i) => (
            <li key={i}><span className="team-name">{m.name}</span><span className="team-aff">{m.affiliation}</span></li>
          ))}
        </ul>
        {TEAM_THANKS && <p className="team-thanks">{TEAM_THANKS}</p>}
      </section>
    </Shell>
  );
}

/* ------------------------------------------------------------- How it works */
const STAGES: { id: string; t: Key; items: Key[] }[] = [
  { id: "input", t: "fl1_t", items: ["fl1_a", "fl1_b", "fl1_c", "fl1_d", "fl1_e"] },
  { id: "data", t: "fl2_t", items: ["fl2_a", "fl2_b", "fl2_c", "fl2_d"] },
  { id: "engine", t: "fl3_t", items: ["fl3_a", "fl3_b", "fl3_c", "fl3_d", "fl3_e"] },
  { id: "result", t: "fl4_t", items: ["fl4_a", "fl4_b", "fl4_c", "fl4_d"] },
];

export function HowPage() {
  const { t } = useI18n();
  return (
    <Shell page="how" title="how_title">
      <h1 className="sub-title">{t("how_title")}</h1>
      <p className="sub-lead">{t("how_sub")}</p>

      <ol className="flow" aria-label={t("how_title")}>
        {STAGES.map((s, i) => (
          <li key={s.id} className={`flow-stage flow-${s.id}`}>
            <span className="flow-num" aria-hidden="true">{i + 1}</span>
            <h2>{t(s.t)}</h2>
            <ul>{s.items.map((k) => <li key={k}>{t(k)}</li>)}</ul>
          </li>
        ))}
      </ol>

      <section className="sub-block">
        <h2>{t("farmer_t")}</h2>
        <div className="sub-prose"><p>{t("farmer_d")}</p></div>
      </section>

      <section className="sub-block">
        <h2>{t("bb_t")}</h2>
        <div className="sub-prose"><p>{t("bb_d")}</p></div>
      </section>

      <section className="sub-block method-block">
        <h2>{t("method_t")}</h2>
        <div className="sub-prose"><p>{t("method_d")}</p></div>
        <a className="hero-cta method-btn" href="/spora-method.pdf" target="_blank" rel="noreferrer">{t("method_btn")}</a>
      </section>

      <section className="sub-block">
        <h2>{t("ex_t")}</h2>
        <div className="sub-prose"><p>{t("ex_d")}</p></div>
      </section>
    </Shell>
  );
}
