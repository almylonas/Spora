import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useI18n, type Key } from "./i18n";
import { IconArrow, IconClose, IconHelp } from "./icons";

/** A step-by-step guide over the real interface. Each step highlights one control (found by its data-tour
 *  attribute) and explains it in a few plain sentences. Steps whose control is not on screen yet (for example
 *  the crop form, which opens after drawing) are shown in the middle of the screen instead. */
const STEPS: { target: string | null; title: Key; text: Key }[] = [
  { target: null, title: "t1_t", text: "t1_d" },
  { target: "search", title: "t2_t", text: "t2_d" },
  { target: "zoom", title: "t3_t", text: "t3_d" },
  { target: "draw", title: "t4_t", text: "t4_d" },
  { target: "fix", title: "t5_t", text: "t5_d" },
  { target: "panel", title: "t6_t", text: "t6_d" },
  { target: "analyse", title: "t7_t", text: "t7_d" },
  { target: "lang", title: "t8_t", text: "t8_d" },
];

const PAD = 8;           // space around the highlighted control
const CARD_W = 380;

interface Box { top: number; left: number; width: number; height: number }

function findTarget(name: string | null): HTMLElement | null {
  if (!name) return null;
  const el = document.querySelector<HTMLElement>(`[data-tour="${name}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? el : null;   // hidden on this screen size
}

export default function HelpTour({ onClose }: { hasField: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [vw, setVw] = useState(window.innerWidth);
  const cardRef = useRef<HTMLDivElement>(null);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  const measure = useCallback(() => {
    setVw(window.innerWidth);
    const el = findTarget(step.target);
    if (!el) { setBox(null); return; }
    el.scrollIntoView({ block: "nearest" });
    const r = el.getBoundingClientRect();
    setBox({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [step.target]);

  useLayoutEffect(() => { measure(); }, [measure]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);
  useEffect(() => { cardRef.current?.focus(); }, [i]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && !last) setI((x) => x + 1);
      if (e.key === "ArrowLeft" && i > 0) setI((x) => x - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, last, onClose]);

  // Place the card next to the highlighted control, or in the middle when there is none.
  const phone = vw <= 760;
  const style: React.CSSProperties = {};
  let placement = "center";
  if (box && phone) {
    placement = box.top + box.height / 2 > window.innerHeight / 2 ? "phone-top" : "phone-bottom";
  } else if (box) {
    const h = window.innerHeight;
    if (box.left > vw / 2 && box.left - CARD_W - 16 > 0) {          // control on the right: card to its left
      placement = "side";
      style.left = box.left - CARD_W - 16;
      style.top = Math.min(Math.max(16, box.top), h - 320);
    } else if (box.top + box.height + 16 + 260 < h) {               // room below
      placement = "side";
      style.left = Math.min(Math.max(16, box.left), vw - CARD_W - 16);
      style.top = box.top + box.height + 16;
    } else {                                                        // above
      placement = "side";
      style.left = Math.min(Math.max(16, box.left), vw - CARD_W - 16);
      style.bottom = h - box.top + 16;
    }
  }

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {box ? (
        <div className="tour-spot" style={{ top: box.top, left: box.left, width: box.width, height: box.height }} aria-hidden="true" />
      ) : (
        <div className="tour-dim" aria-hidden="true" />
      )}
      <div className={`tour-card tour-${placement}`} style={style} ref={cardRef} tabIndex={-1}>
        <div className="tour-head">
          <span className="tour-step">{t("tour_step", { n: i + 1, total: STEPS.length })}</span>
          <button type="button" className="icon-button" onClick={onClose} aria-label={t("tour_close")}><IconClose /></button>
        </div>
        <div className="tour-dots" aria-hidden="true">
          {STEPS.map((_, k) => <span key={k} className={k === i ? "on" : k < i ? "done" : ""} />)}
        </div>
        <h2 id="tour-title" className="tour-title">{t(step.title)}</h2>
        <p className="tour-text">{t(step.text)}</p>
        {last && <p className="tour-note">{t("tour_reopen")}</p>}
        <div className="tour-actions">
          {i > 0 ? (
            <button type="button" className="secondary" onClick={() => setI(i - 1)}><IconArrow dir="left" /> {t("tour_back")}</button>
          ) : <span />}
          <button type="button" className="primary" onClick={() => (last ? onClose() : setI(i + 1))}>
            {last ? t("tour_done") : <>{t("tour_next")} <IconArrow dir="right" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Shown once, on the first visit to the map. */
export function TourOffer({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  const { t } = useI18n();
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="offer-title">
      <div className="tour-dim" aria-hidden="true" onClick={onSkip} />
      <div className="tour-card tour-center tour-offer">
        <span className="offer-icon" aria-hidden="true"><IconHelp /></span>
        <h2 id="offer-title" className="tour-title">{t("tour_offer_t")}</h2>
        <p className="tour-text">{t("tour_offer_d")}</p>
        <div className="tour-actions">
          <button type="button" className="secondary" onClick={onSkip}>{t("tour_skip")}</button>
          <button type="button" className="primary" onClick={onStart} ref={ref}>{t("tour_start")}</button>
        </div>
      </div>
    </div>
  );
}
