import { useEffect, useRef, useState } from "react";
import { useI18n, type Key } from "./i18n";
import { LandFooter, LandNav, go } from "./Pages";

/* The two scenes are the team's illustrations with their words removed; the words are live text placed where the
 * originals were (positions in % of the 1920 × 1088 artwork), so they can be translated and read aloud.
 * On narrow screens the artwork sits on top and the same content follows as a list. */

const STEPS: { title: Key; text: Key; icon: string; pos: { x: number; y: number; w: number } }[] = [
  { title: "step1_t", text: "step1_d", icon: "/landing/icon-step1.jpg", pos: { x: 7.2, y: 45.5, w: 22 } },
  { title: "step2_t", text: "step2_d", icon: "/landing/icon-step2.jpg", pos: { x: 41.4, y: 54.8, w: 21.5 } },
  { title: "step3_t", text: "step3_d", icon: "/landing/icon-step3.jpg", pos: { x: 73.8, y: 63.4, w: 23 } },
];

const DATA: { title: Key; text: Key; icon: string; url: string; circle: { x: number; y: number }; textPos: { x: number; y: number } }[] = [
  { title: "d1_t", text: "d1_d", icon: "/landing/icon-power.jpg", url: "https://power.larc.nasa.gov/",
    circle: { x: 15.8, y: 41.8 }, textPos: { x: 14.8, y: 52.6 } },
  { title: "d2_t", text: "d2_d", icon: "/landing/icon-hls.jpg", url: "https://hls.gsfc.nasa.gov/",
    circle: { x: 50.15, y: 38.1 }, textPos: { x: 50.15, y: 48.6 } },
  { title: "d3_t", text: "d3_d", icon: "/landing/icon-dem.jpg", url: "https://lpdaac.usgs.gov/products/nasadem_hgtv001/",
    circle: { x: 86, y: 41.8 }, textPos: { x: 85.2, y: 52.6 } },
];

/** Adds "is-in" once the element scrolls into view, for the one reveal per scene. */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) { setInView(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView] as const;
}

export default function Landing({ onStart }: { onStart: () => void }) {
  const { t } = useI18n();
  const [stepsRef, stepsIn] = useReveal<HTMLDivElement>();
  const [dataRef, dataIn] = useReveal<HTMLDivElement>();
  useEffect(() => { document.title = "Spora"; }, []);

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-bg" aria-hidden="true">
          <img src="/landing/field.gif" alt="" />
        </div>
        <div className="hero-wash" aria-hidden="true" />

        <LandNav page="home" />

        <div className="hero-content">
          <h1 className="hero-logo">
            <img src="/landing/spora-logo.png" alt="Spora" width={1600} height={570} />
          </h1>
          <p className="hero-slogan">{t("slogan_1")}<br />{t("slogan_2")}</p>
          <p className="hero-sub">{t("hero_sub")}</p>
          <div className="hero-actions">
            <button type="button" className="hero-cta" onClick={onStart}>{t("draw")}</button>
            <button type="button" className="hero-link" onClick={() => go("how")}>
              {t("how_it_works")}
            </button>
          </div>
        </div>

        <p className="hero-credit">{t("credit")}</p>
      </section>

      {/* Scene 1: three steps along the glowing path */}
      <section className="scene-wrap" aria-labelledby="how-title">
        <div className={`scene scene-steps${stepsIn ? " is-in" : ""}`} ref={stepsRef}>
          <img className="scene-art" src="/landing/steps-plate.jpg" alt="" width={1920} height={1088} loading="lazy" />
          <h2 id="how-title" className="scene-title" style={{ "--x": 4.2, "--y": 8.4, "--w": 64 } as React.CSSProperties}>
            {t("steps_title")}
          </h2>
          <ol className="scene-steps-list">
            {STEPS.map((s, i) => (
              <li key={s.title} className="scene-step"
                style={{ "--x": s.pos.x, "--y": s.pos.y, "--w": s.pos.w, "--d": i } as React.CSSProperties}>
                <img className="scene-icon" src={s.icon} alt="" aria-hidden="true" />
                <span className="scene-num" aria-hidden="true">{i + 1}</span>
                <h3>{t(s.title)}</h3>
                <p>{t(s.text)}</p>
              </li>
            ))}
          </ol>
          {/* The glowing field outline in the artwork becomes the button */}
          <button type="button" className="scene-field-cta" onClick={onStart}
            style={{ "--x": 26.9, "--y": 76 } as React.CSSProperties}>
            {t("start_here")}
          </button>
        </div>
      </section>

      {/* Scene 2: the satellite and the three data sources on its arc */}
      <section className="scene-wrap" aria-labelledby="data-title">
        <div className={`scene scene-data${dataIn ? " is-in" : ""}`} ref={dataRef}>
          <img className="scene-art" src="/landing/data-plate.jpg" alt="" width={1920} height={1088} loading="lazy" />
          <h2 id="data-title" className="scene-title scene-title-center" style={{ "--x": 50, "--y": 1.6, "--w": 84 } as React.CSSProperties}>
            {t("data_title")}
          </h2>
          <ul className="scene-data-list">
            {DATA.map((d, i) => (
              <li key={d.title} className="scene-source" style={{ "--d": i } as React.CSSProperties}>
                <a className="scene-orb" href={d.url} target="_blank" rel="noreferrer"
                  aria-label={t("open_source", { name: t(d.title) })}
                  style={{ "--x": d.circle.x, "--y": d.circle.y } as React.CSSProperties}>
                  <img className="scene-icon" src={d.icon} alt="" aria-hidden="true" />
                </a>
                <div className="scene-source-text" style={{ "--x": d.textPos.x, "--y": d.textPos.y, "--w": 21 } as React.CSSProperties}>
                  <h3>{t(d.title)}</h3>
                  <p>{t(d.text)}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="scene-note" style={{ "--x": 50, "--y": 93.2, "--w": 88 } as React.CSSProperties}>{t("data_note")}</p>
        </div>
      </section>

      <section className="land-cta">
        <p>{t("ready")}</p>
        <button type="button" className="hero-cta" onClick={onStart}>{t("draw")}</button>
      </section>

      <LandFooter />
    </div>
  );
}
