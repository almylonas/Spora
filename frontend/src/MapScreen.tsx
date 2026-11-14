import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "@geoman-io/leaflet-geoman-free";
import { searchPlaces, type Place } from "./api";
import {
  IconDraw, IconEdit, IconFit, IconLayers, IconLocate, IconMinus, IconPlus, IconSearch, IconTrash,
} from "./icons";

const FIELD_STYLE: L.PathOptions = { color: "#E3B23C", weight: 3, fillColor: "#E3B23C", fillOpacity: 0.18 };

type Mode = "idle" | "drawing" | "editing";

interface Props {
  field: GeoJSON.Polygon | null;
  onField: (p: GeoJSON.Polygon | null) => void;
  onHome: () => void;
}

export default function MapScreen({ field, onField, onHome }: Props) {
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
      <MapTools field={field} onField={onField} onHome={onHome} satellite={satellite} setSatellite={setSatellite} />
    </MapContainer>
  );
}

function MapTools({ field, onField, onHome, satellite, setSatellite }: Props & {
  satellite: boolean; setSatellite: (v: boolean) => void;
}) {
  const map = useMap();
  const layerRef = useRef<L.Polygon | null>(null);
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

  const hint =
    mode === "drawing" ? "Tap each corner of your field. Tap the first corner again to finish."
      : mode === "editing" ? "Drag the corners to adjust the outline, then press the edit button again."
        : !field ? "Find your field, then press the draw button to outline it." : null;

  return (
    <>
      <div className="topbar" onDoubleClick={(e) => e.stopPropagation()}>
        <button type="button" className="brand" onClick={onHome} aria-label="Spora, back to the start page">
          <img className="brand-mark" src="/landing/spora-mark.png" alt="" aria-hidden="true" />
          Spora
        </button>
        <SearchBox onPick={(p) => {
          if (p.bbox) map.fitBounds([[p.bbox[0], p.bbox[2]], [p.bbox[1], p.bbox[3]]], { maxZoom: 16 });
          else map.flyTo([p.lat, p.lon], 15);
        }} />
      </div>

      <nav className="toolrail" aria-label="Map tools" onDoubleClick={(e) => e.stopPropagation()}>
        <ToolButton label={mode === "drawing" ? "Stop drawing" : "Draw your field"} active={mode === "drawing"} onClick={startDraw} primary>
          <IconDraw />
        </ToolButton>
        <ToolButton label={mode === "editing" ? "Finish editing" : "Edit outline"} active={mode === "editing"} onClick={toggleEdit} disabled={!field}>
          <IconEdit />
        </ToolButton>
        <ToolButton label="Delete outline" onClick={clear} disabled={!field && mode !== "drawing"}>
          <IconTrash />
        </ToolButton>
        <span className="rail-gap" />
        <ToolButton label="Zoom to my field" onClick={fit} disabled={!field}><IconFit /></ToolButton>
        <ToolButton label={locating ? "Finding you…" : "Go to my location"} onClick={locate}><IconLocate /></ToolButton>
        <ToolButton label={satellite ? "Show road map" : "Show satellite view"} onClick={() => setSatellite(!satellite)} active={!satellite}>
          <IconLayers />
        </ToolButton>
        <span className="rail-gap desktop-only" />
        <span className="desktop-only"><ToolButton label="Zoom in" onClick={() => map.zoomIn()}><IconPlus /></ToolButton></span>
        <span className="desktop-only"><ToolButton label="Zoom out" onClick={() => map.zoomOut()}><IconMinus /></ToolButton></span>
      </nav>

      {hint && <div className="hint" role="status">{hint}</div>}
    </>
  );
}

function ToolButton({ label, onClick, children, active, disabled, primary }: {
  label: string; onClick: () => void; children: React.ReactNode; active?: boolean; disabled?: boolean; primary?: boolean;
}) {
  return (
    <button
      type="button"
      className={`tool${active ? " is-active" : ""}${primary ? " is-primary" : ""}`}
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
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (q.trim().length < 3) { setResults([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      searchPlaces(q, ctrl.signal).then((r) => { setResults(r); setOpen(true); }).catch(() => {});
    }, 600);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  const pick = (p: Place) => { onPick(p); setOpen(false); setQ(p.name.split(",")[0]); };

  return (
    <form
      className="search"
      role="search"
      onSubmit={(e) => { e.preventDefault(); if (results[0]) pick(results[0]); }}
    >
      <IconSearch />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search a village, town or address"
        aria-label="Search a place"
      />
      {open && results.length > 0 && (
        <ul className="search-results" role="listbox">
          {results.map((r) => (
            <li key={`${r.lat},${r.lon}`}>
              <button type="button" onMouseDown={() => pick(r)}>{r.name}</button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

function toGeo(layer: L.Polygon): GeoJSON.Polygon {
  return (layer.toGeoJSON() as GeoJSON.Feature<GeoJSON.Polygon>).geometry;
}
