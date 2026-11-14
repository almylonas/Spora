import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "@geoman-io/leaflet-geoman-free";
import { searchPlaces, type Place } from "./api";
import { parseCoordinates } from "./coords";
import { LANGS, useI18n } from "./i18n";
import {
  IconDraw, IconEdit, IconFit, IconHelp, IconLayers, IconLocate, IconMinus, IconPin, IconPlus, IconSearch, IconTrash,
} from "./icons";

const FIELD_STYLE: L.PathOptions = { color: "#E3B23C", weight: 3, fillColor: "#E3B23C", fillOpacity: 0.18 };

type Mode = "idle" | "drawing" | "editing";

interface Props {
  field: GeoJSON.Polygon | null;
  onField: (p: GeoJSON.Polygon | null) => void;
  onHome: () => void;
  onHelp: () => void;
}

export default function MapScreen(props: Props) {
  const [satellite, setSatellite] = useState(true);
  return (
    <MapContainer center={[50.92, 6.36]} zoom={14} zoomControl={false} className="map" attributionControl>
      {satellite ? (
        <TileLayer
          key="sat"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Imagery © Esri, Maxar, Earthstar Geographics"
          maxZoom={19}
        />
      ) : (
        <TileLayer
          key="osm"
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap contributors"
          maxZoom={19}
        />
      )}
      <MapTools {...props} satellite={satellite} setSatellite={setSatellite} />
    </MapContainer>
  );
}

function MapTools({ field, onField, onHome, onHelp, satellite, setSatellite }: Props & {
  satellite: boolean; setSatellite: (v: boolean) => void;
}) {
  const { t } = useI18n();
  const map = useMap();
  const layerRef = useRef<L.Polygon | null>(null);
  const pinRef = useRef<L.CircleMarker | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [locating, setLocating] = useState(false);

  // Keep the drawn layer and the app state in sync
  useEffect(() => {
    map.pm.setGlobalOptions({ allowSelfIntersection: false, snappable: false, templineStyle: { color: "#E3B23C" } as L.CircleMarkerOptions, hintlineStyle: { color: "#E3B23C", dashArray: "4 6" } as L.PolylineOptions });
    const onCreate = (e: { layer: L.Layer }) => {
      layerRef.current?.remove();
      const layer = e.layer as L.Polygon;
      layer.setStyle(FIELD_STYLE);
      layerRef.current = layer;
      layer.on("pm:edit", () => onField(toGeo(layer)));
      onField(toGeo(layer));
      setMode("idle");
    };
    map.on("pm:create", onCreate as L.LeafletEventHandlerFn);
    // Test hook: lets automated browser tests place an outline without clicking corners
    (window as unknown as { __fieldshiftSetOutline?: (ll: [number, number][]) => void }).__fieldshiftSetOutline = (ll) => {
      const layer = L.polygon(ll, FIELD_STYLE).addTo(map);
      onCreate({ layer });
      map.fitBounds(layer.getBounds(), { padding: [80, 80] });
    };
    return () => { map.off("pm:create", onCreate as L.LeafletEventHandlerFn); };
  }, [map, onField]);

  // If the app clears the field (e.g. "Draw again"), remove the layer
  useEffect(() => {
    if (!field && layerRef.current) {
      layerRef.current.remove();
      layerRef.current = null;
    }
  }, [field]);

  const startDraw = () => {
    if (mode === "drawing") {
      map.pm.disableDraw();
      setMode("idle");
      return;
    }
    layerRef.current?.pm.disable();
    pinRef.current?.remove();
    map.pm.enableDraw("Polygon", { pathOptions: FIELD_STYLE } as L.PM.DrawModeOptions);
    setMode("drawing");
  };

  const toggleEdit = () => {
    const layer = layerRef.current;
    if (!layer) return;
    if (mode === "editing") {
      layer.pm.disable();
      onField(toGeo(layer));
      setMode("idle");
    } else {
      map.pm.disableDraw();
      layer.pm.enable({ allowSelfIntersection: false });
      setMode("editing");
    }
  };

  const clear = () => {
    map.pm.disableDraw();
    layerRef.current?.remove();
    layerRef.current = null;
    onField(null);
    setMode("idle");
  };

  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { map.flyTo([p.coords.latitude, p.coords.longitude], 16); setLocating(false); },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const fit = () => { if (layerRef.current) map.fitBounds(layerRef.current.getBounds(), { padding: [80, 80] }); };

  const goTo = (p: Place) => {
    pinRef.current?.remove();
    if (p.coords) {
      // Typed coordinates: fly close and mark the exact point
      map.flyTo([p.lat, p.lon], 16);
      pinRef.current = L.circleMarker([p.lat, p.lon], {
        radius: 9, color: "#fff", weight: 3, fillColor: "#E3B23C", fillOpacity: 1,
      }).addTo(map);
    } else if (p.bbox) map.fitBounds([[p.bbox[0], p.bbox[2]], [p.bbox[1], p.bbox[3]]], { maxZoom: 16 });
    else map.flyTo([p.lat, p.lon], 15);
  };

  const hint = mode === "drawing" ? t("hint_drawing") : mode === "editing" ? t("hint_editing") : !field ? t("hint_idle") : null;

  return (
    <>
      <div className="topbar" onDoubleClick={(e) => e.stopPropagation()}>
        <button type="button" className="brand" onClick={onHome} aria-label={t("home")}>
          <img className="brand-mark" src="/landing/spora-mark.png" alt="" aria-hidden="true" />
          Spora
        </button>
        <SearchBox onPick={goTo} />
      </div>

      <nav className="toolrail" aria-label={t("map_tools")} onDoubleClick={(e) => e.stopPropagation()}>
        <span data-tour="help"><ToolButton label={t("help")} onClick={onHelp} accent><IconHelp /></ToolButton></span>
        <LangMenu />
        <span className="rail-gap" />
        <span data-tour="draw">
          <ToolButton label={mode === "drawing" ? t("stop_draw") : t("draw")} active={mode === "drawing"} onClick={startDraw} primary>
            <IconDraw />
          </ToolButton>
        </span>
        <span className="rail-group" data-tour="fix">
          <ToolButton label={mode === "editing" ? t("finish_edit") : t("edit")} active={mode === "editing"} onClick={toggleEdit} disabled={!field}>
            <IconEdit />
          </ToolButton>
          <ToolButton label={t("delete")} onClick={clear} disabled={!field && mode !== "drawing"}>
            <IconTrash />
          </ToolButton>
        </span>
        <span className="rail-gap" />
        <ToolButton label={t("zoom_field")} onClick={fit} disabled={!field}><IconFit /></ToolButton>
        <ToolButton label={locating ? t("locating") : t("locate")} onClick={locate}><IconLocate /></ToolButton>
        <ToolButton label={satellite ? t("road_map") : t("sat_view")} onClick={() => setSatellite(!satellite)} active={!satellite}>
          <IconLayers />
        </ToolButton>
        <span className="rail-gap desktop-only" />
        <span className="rail-group desktop-only" data-tour="zoom">
          <ToolButton label={t("zoom_in")} onClick={() => map.zoomIn()}><IconPlus /></ToolButton>
          <ToolButton label={t("zoom_out")} onClick={() => map.zoomOut()}><IconMinus /></ToolButton>
        </span>
      </nav>

      {hint && <div className="hint" role="status">{hint}</div>}
    </>
  );
}

function LangMenu() {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  const current = LANGS.find((l) => l.id === lang)!;
  return (
    <span className="lang-menu" ref={ref} data-tour="lang">
      <button type="button" className="tool tool-text" aria-haspopup="menu" aria-expanded={open}
        aria-label={`${t("language")}: ${current.name}`} data-tip={t("language")} onClick={() => setOpen(!open)}>
        {current.short}
      </button>
      {open && (
        <ul className="lang-list" role="menu">
          {LANGS.map((l) => (
            <li key={l.id}>
              <button type="button" role="menuitemradio" aria-checked={l.id === lang} lang={l.id}
                className={l.id === lang ? "is-on" : ""} onClick={() => { setLang(l.id); setOpen(false); }}>
                <span className="lang-short">{l.short}</span>{l.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}

function ToolButton({ label, onClick, children, active, disabled, primary, accent }: {
  label: string; onClick: () => void; children: React.ReactNode; active?: boolean; disabled?: boolean;
  primary?: boolean; accent?: boolean;
}) {
  return (
    <button
      type="button"
      className={`tool${active ? " is-active" : ""}${primary ? " is-primary" : ""}${accent ? " is-accent" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      data-tip={label}
    >
      {children}
    </button>
  );
}

function SearchBox({ onPick }: { onPick: (p: Place) => void }) {
  const { t, lang, num } = useI18n();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [empty, setEmpty] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setEmpty(false);
    const c = parseCoordinates(q);
    if (c) {   // typed coordinates: no lookup needed
      setResults([{ name: `${num(c.lat, 5)}, ${num(c.lon, 5)}`, lat: c.lat, lon: c.lon, coords: true }]);
      setOpen(true);
      return;
    }
    if (q.trim().length < 3) { setResults([]); return; }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      searchPlaces(q, lang, ctrl.signal).then((r) => { setResults(r); setEmpty(r.length === 0); setOpen(true); }).catch(() => {});
    }, 600);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [q, lang, num]);

  const pick = (p: Place) => { onPick(p); setOpen(false); if (!p.coords) setQ(p.name.split(",")[0]); };

  return (
    <form
      className="search"
      role="search"
      data-tour="search"
      onSubmit={(e) => { e.preventDefault(); if (results[0]) pick(results[0]); }}
    >
      <IconSearch />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => (results.length || empty) && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={t("search_ph")}
        aria-label={t("search_label")}
        title={t("search_label")}
      />
      {open && (results.length > 0 || empty) && (
        <ul className="search-results" role="listbox">
          {results.map((r) => (
            <li key={`${r.lat},${r.lon}`}>
              <button type="button" onMouseDown={() => pick(r)} className={r.coords ? "is-coords" : ""}>
                {r.coords ? <><IconPin /><span><strong>{t("go_coords")}</strong><br />{r.name}</span></> : r.name}
              </button>
            </li>
          ))}
          {empty && <li className="search-empty">{t("no_results")}</li>}
        </ul>
      )}
    </form>
  );
}

function toGeo(layer: L.Polygon): GeoJSON.Polygon {
  return (layer.toGeoJSON() as GeoJSON.Feature<GeoJSON.Polygon>).geometry;
}
