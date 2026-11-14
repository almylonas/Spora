import { useEffect, useRef } from "react";

const STEPS = [
  { title: "Draw your field", text: "Outline it on the satellite map and tell us which crops you grow, month by month." },
  { title: "We read NASA data", text: "Forty years of weather, satellite greenness and slope for exactly that spot." },
  { title: "Compare three rotations", text: "What you grow now, a soil-building option and a water-saving option, in plain words." },
];

const DATA = [
  { name: "NASA POWER", text: "Daily rain, temperature, sun, wind and humidity since 1981, to see how your weather has changed." },
  { name: "HLS satellite imagery", text: "Landsat and Sentinel-2 every few days at 30 m, to see when your soil really lies bare." },
  { name: "NASADEM elevation", text: "Slope of your field, to tell where heavy rain carries soil away." },
];

export default function Landing({ onStart }: { onStart: () => void }) {
  const howRef = useRef<HTMLElement>(null);
  useEffect(() => { document.title = "Spora"; }, []);

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-bg" aria-hidden="true">
          <img src="/landing/field.gif" alt="" />
        </div>
        <div className="hero-wash" aria-hidden="true" />

        <div className="hero-content">
          <h1 className="hero-logo">
            <img src="/landing/spora-logo.png" alt="Spora" width={1600} height={570} />
          </h1>
          <p className="hero-slogan">See your field from space.<br />Plan your rotation on the ground.</p>
          <p className="hero-sub">
            Free NASA weather and satellite data, turned into plain-language advice on which crops to grow and when.
          </p>
          <div className="hero-actions">
            <button type="button" className="hero-cta" onClick={onStart}>Draw your field</button>
            <button type="button" className="hero-link" onClick={() => howRef.current?.scrollIntoView({ behavior: "smooth" })}>
              How it works
            </button>
          </div>
        </div>

        <p className="hero-credit">NASA Space Apps Challenge 2026, Aachen</p>
      </section>

      {/* Desktop and tablet: the designed visuals. Their words are repeated in the text blocks, which screen
          readers always read and phones show instead (the words inside the images are too small there). */}
      <section className="land-visual" ref={howRef} aria-labelledby="how-title">
        <img className="visual-img" src="/landing/steps.jpg" alt="" width={1920} height={1088} loading="lazy" />
        <div className="visual-text">
          <h2 id="how-title" className="land-title">From a drawn field to an actionable decision in three simple steps</h2>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="step-num" aria-hidden="true">{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="land-visual" aria-labelledby="data-title">
        <img className="visual-img" src="/landing/open-data.jpg" alt="" width={1920} height={1088} loading="lazy" />
        <div className="visual-text">
          <h2 id="data-title" className="land-title">Built only on open NASA and other open data sources</h2>
          <dl className="data-list">
            {DATA.map((d) => (
              <div key={d.name}>
                <dt>{d.name}</dt>
                <dd>{d.text}</dd>
              </div>
            ))}
          </dl>
          <p className="land-note">
            Weather and soil-cover results work for any field. Crop suggestions are checked for North Rhine-Westphalia
            first; elsewhere, confirm them with a local advisor.
          </p>
        </div>
      </section>

      <section className="land-cta">
        <p>Ready to look at your own field?</p>
        <button type="button" className="hero-cta" onClick={onStart}>Draw your field</button>
      </section>

      <footer className="land-foot">
        <img src="/landing/spora-logo.png" alt="" aria-hidden="true" />
        <p>Spora supports your judgement. It does not replace local advice.</p>
      </footer>
    </div>
  );
}
