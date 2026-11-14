import { useCallback, useEffect, useState } from "react";
import MapScreen from "./MapScreen";
import FieldPanel from "./FieldPanel";
import ResultsWindow from "./ResultsWindow";
import { analyse, areaHa, fetchCrops } from "./api";
import type { Analysis, CropOption, CropRow, Priority, SoilAnswer } from "./types";

export default function App() {
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
  const [cropsError, setCropsError] = useState<string | null>(null);

  useEffect(() => {
    fetchCrops().then(setCrops).catch(() => setCropsError("The crop list could not be loaded. Reload the page."));
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
      });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The analysis failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app">
      <MapScreen field={field} onField={onField} />

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
          error={cropsError}
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
    </div>
  );
}
