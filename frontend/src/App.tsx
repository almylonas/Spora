import { useCallback, useEffect, useRef, useState } from "react";
import MapScreen from "./MapScreen";
import Landing from "./Landing";
import FieldPanel from "./FieldPanel";
import ResultsWindow from "./ResultsWindow";
import HelpTour, { TourOffer } from "./HelpTour";
import MyFields, { NameDialog, Toast } from "./MyFields";
import { loadFields, newId, storeFields, type SavedField } from "./storage";
import { analyse, areaHa, checkField, fetchCrops } from "./api";
import { useI18n } from "./i18n";
import type { Analysis, CropOption, CropRow, Health, Priority, SoilAnswer } from "./types";

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
  const [health, setHealth] = useState<Health>({
    issues: [], nutrients: [], soil_texture: "unknown", soil_look: "unknown", ph: null, soil_source: "experience",
  });

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

  // Saved fields (on this device)
  const [saved, setSaved] = useState<SavedField[]>(loadFields);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [showFields, setShowFields] = useState(false);
  const [naming, setNaming] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [restore, setRestore] = useState<{ polygon: GeoJSON.Polygon; key: number } | null>(null);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), 2800); return () => clearTimeout(id); }, [toast]);

  const onField = useCallback((p: GeoJSON.Polygon | null, how?: "create" | "edit" | "clear") => {
    setField(p);
    setData(null);
    if (how !== "edit") setCurrentId(null);     // a new outline is a new field, not the saved one
  }, []);

  // Check every new or edited outline at once: size, shape and whether it is on land (not sea, lake or river)
  const [fieldProblem, setFieldProblem] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    setFieldProblem(null);
    if (!field) return;
    const ctrl = new AbortController();
    setChecking(true);
    checkField(field, lang, ctrl.signal)
      .then((problem) => setFieldProblem(problem))
      .catch(() => {})
      .finally(() => { if (!ctrl.signal.aborted) setChecking(false); });
    return () => ctrl.abort();
  }, [field, lang]);

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
        health,
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

  const persist = (list: SavedField[]) => {
    setSaved(list);
    if (!storeFields(list)) setToast(t("save_failed"));
  };
  const record = (id: string, name: string): SavedField => ({
    id, name, savedAt: new Date().toISOString(), field: field!, areaHa: areaHa(field!), rows, irrigated, priority,
    soilAnswer, health, lang, analysis: data,
  });
  const save = () => {
    if (!field) return;
    const existing = saved.find((f) => f.id === currentId);
    if (existing) {
      persist(saved.map((f) => (f.id === existing.id ? record(existing.id, existing.name) : f)));
      setToast(t("saved_toast"));
    } else setNaming(true);
  };
  const saveAs = (name: string) => {
    const id = newId();
    persist([...saved, record(id, name)]);
    setCurrentId(id);
    setNaming(false);
    setToast(t("saved_toast"));
  };
  const open = (f: SavedField) => {
    setField(f.field);
    setRows(f.rows);
    setIrrigated(f.irrigated);
    setPriority(f.priority);
    setSoilAnswer(f.soilAnswer);
    setHealth(f.health);
    setData(f.analysis);
    setError(null);
    setCurrentId(f.id);
    setRestore({ polygon: f.field, key: Date.now() });
    setShowFields(false);
    setWindowOpen(!!f.analysis);
  };
  const currentName = saved.find((f) => f.id === currentId)?.name ?? null;

  if (!started) return <Landing onStart={() => { window.location.hash = "map"; }} />;

  return (
    <div className="app">
      <MapScreen field={field} onField={onField} fieldBad={!!fieldProblem} restore={restore}
        onMyFields={() => setShowFields(true)} fieldsCount={saved.length} onHome={() => { window.location.hash = ""; }}
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
          health={health}
          setHealth={setHealth}
          busy={busy}
          error={cropsError ? t("crops_load_error") : null}
          fieldProblem={fieldProblem}
          checking={checking}
          onSave={save}
          savedName={currentName}
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
          onSave={save}
        />
      )}

      {offer && !tourOpen && !windowOpen && (
        <TourOffer
          onStart={() => { setOffer(false); markSeen(); setTourOpen(true); }}
          onSkip={() => { setOffer(false); markSeen(); }}
        />
      )}
      {showFields && (
        <MyFields
          fields={saved}
          currentId={currentId}
          onOpen={open}
          onRename={(id, name) => persist(saved.map((f) => (f.id === id ? { ...f, name } : f)))}
          onDelete={(id) => { persist(saved.filter((f) => f.id !== id)); if (id === currentId) setCurrentId(null); }}
          onImport={(list) => {
            const ids = new Set(saved.map((f) => f.id));
            persist([...saved, ...list.filter((f) => !ids.has(f.id))]);
          }}
          onClose={() => setShowFields(false)}
        />
      )}
      {naming && field && (
        <NameDialog initial={t("field_n", { n: saved.length + 1 })} onSave={saveAs} onCancel={() => setNaming(false)} />
      )}
      {toast && <Toast text={toast} />}
      {tourOpen && <HelpTour hasField={!!field} onClose={() => { setTourOpen(false); markSeen(); }} />}
    </div>
  );
}
