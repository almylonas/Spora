import { useCallback, useEffect, useRef, useState } from "react";
import MapScreen from "./MapScreen";
import Landing from "./Landing";
import FieldPanel from "./FieldPanel";
import ResultsWindow from "./ResultsWindow";
import HelpTour, { TourOffer } from "./HelpTour";
import { analyse, areaHa, fetchCrops } from "./api";
import { useI18n } from "./i18n";
import type { Analysis, CropOption, CropRow, Priority, SoilAnswer } from "./types";

const TOUR_SEEN = "spora-tour-seen";

export default function App() {
  const { lang, t } = useI18n();
  // The start page shows first; "#map" in the address opens the map directly (handy for the demo).
  const [started, setStarted] = useState(() => window.location.hash === "#map");
  useEffect(() => {
    const onHash = () => setStarted(window.location.hash === "#map");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const [field, setField] = useState<GeoJSON.Polygon | null>(null);
  const [crops, setCrops] = useState<CropOption[]>([]);
  const [rows, setRows] = useState<CropRow[]>([{ id: 1, crop: "", sow_month: 4, harvest_month: 10 }]);
  const [irrigated, setIrrigated] = useState<boolean | null>(null);
  const [priority, setPriority] = useState<Priority | null>(null);
  const [soilAnswer, setSoilAnswer] = useState<SoilAnswer>("bare");

  const [windowOpen, setWindowOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cropsError, setCropsError] = useState(false);

  // Help guide: offered once on the first visit to the map, and always available from the ? button
  const [tourOpen, setTourOpen] = useState(false);
  const [offer, setOffer] = useState(false);
  useEffect(() => {
    if (!started) return;
    let seen = false;
    try { seen = localStorage.getItem(TOUR_SEEN) === "1"; } catch { /* storage blocked */ }
    if (!seen) setOffer(true);
  }, [started]);
  const markSeen = () => { try { localStorage.setItem(TOUR_SEEN, "1"); } catch { /* ignore */ } };

  useEffect(() => {
    fetchCrops().then(setCrops).catch(() => setCropsError(true));
  }, []);

  const onField = useCallback((p: GeoJSON.Polygon | null) => { setField(p); setData(null); }, []);

  const run = async (over: { priority?: Priority; soilAnswer?: SoilAnswer } = {}) => {
    if (!field || irrigated === null || !(over.priority ?? priority)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await analyse({
        field,
        crops: rows.map(({ crop, sow_month, harvest_month }) => ({ crop, sow_month, harvest_month })),
        irrigated,
        priority: over.priority ?? priority!,
        soil_answer: over.soilAnswer ?? soilAnswer,
        lang,
      });
      setData(res);
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      setError(m === "ERR_SERVER" ? t("server_error") : m === "ERR_MISSING" ? t("missing_answers") : m || t("analysis_failed"));
    } finally {
      setBusy(false);
    }
  };

  // The result sentences come from the server: ask again in the new language when it changes
  const firstLang = useRef(true);
  useEffect(() => {
    if (firstLang.current) { firstLang.current = false; return; }
    if (windowOpen && data) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  if (!started) return <Landing onStart={() => { window.location.hash = "map"; }} />;

  return (
    <div className="app">
      <MapScreen field={field} onField={onField} onHome={() => { window.location.hash = ""; }}
        onHelp={() => { setOffer(false); setTourOpen(true); }} />

      {field && (
        <FieldPanel
          areaHa={areaHa(field)}
          crops={crops}
          rows={rows}
          setRows={setRows}
          irrigated={irrigated}
          setIrrigated={setIrrigated}
          priority={priority}
          setPriority={setPriority}
          busy={busy}
          error={cropsError ? t("crops_load_error") : null}
          onRedraw={() => onField(null)}
          onAnalyse={() => { setData(null); setWindowOpen(true); run(); }}
        />
      )}

      {windowOpen && (
        <ResultsWindow
          data={data}
          busy={busy}
          error={error}
          soilAnswer={soilAnswer}
          onSoilAnswer={(a) => { setSoilAnswer(a); run({ soilAnswer: a }); }}
          priority={priority ?? "build_soil"}
          onPriority={(p) => { setPriority(p); run({ priority: p }); }}
          onClose={() => setWindowOpen(false)}
        />
      )}

      {offer && !tourOpen && !windowOpen && (
        <TourOffer
          onStart={() => { setOffer(false); markSeen(); setTourOpen(true); }}
          onSkip={() => { setOffer(false); markSeen(); }}
        />
      )}
      {tourOpen && <HelpTour hasField={!!field} onClose={() => { setTourOpen(false); markSeen(); }} />}
    </div>
  );
}
