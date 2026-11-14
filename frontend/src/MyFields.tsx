import { useEffect, useRef, useState } from "react";
import { useI18n } from "./i18n";
import { IconClose, IconTrash } from "./icons";
import { exportFields, readFieldsFile, type SavedField } from "./storage";

/** The list of saved fields: open, rename, delete, export and import. */
export default function MyFields({ fields, currentId, onOpen, onRename, onDelete, onImport, onClose }: {
  fields: SavedField[];
  currentId: string | null;
  onOpen: (f: SavedField) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onImport: (list: SavedField[]) => void;
  onClose: () => void;
}) {
  const { t, lang, num } = useI18n();
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [importError, setImportError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panelRef.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  const date = (iso: string) => new Date(iso).toLocaleDateString(lang, { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="drawer-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="myfields-title" tabIndex={-1} ref={panelRef}>
        <header className="drawer-head">
          <h2 id="myfields-title">{t("my_fields")}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label={t("close")}><IconClose /></button>
        </header>

        <div className="drawer-body">
          {fields.length === 0 ? (
            <p className="drawer-empty">{t("no_fields")}</p>
          ) : (
            <ul className="saved-list">
              {[...fields].sort((a, b) => b.savedAt.localeCompare(a.savedAt)).map((f) => (
                <li key={f.id} className={`saved${f.id === currentId ? " is-current" : ""}`}>
                  {editing === f.id ? (
                    <form className="rename" onSubmit={(e) => {
                      e.preventDefault();
                      const v = new FormData(e.currentTarget).get("name")?.toString().trim();
                      if (v) onRename(f.id, v);
                      setEditing(null);
                    }}>
                      <input name="name" defaultValue={f.name} autoFocus aria-label={t("rename")} maxLength={60} />
                      <button type="submit" className="primary">{t("save")}</button>
                    </form>
                  ) : (
                    <>
                      <FieldThumb field={f.field} />
                      <div className="saved-info">
                        <strong>{f.name}</strong>
                        <span className="muted small">
                          {num(f.areaHa, 1)} ha · {t("saved_on", { date: date(f.savedAt) })}{f.analysis ? ` · ${t("with_results")}` : ""}
                        </span>
                      </div>
                    </>
                  )}
                  {confirming === f.id ? (
                    <div className="saved-actions confirm-delete" role="alert">
                      <span>{t("confirm_delete", { name: f.name })}</span>
                      <button type="button" className="danger" onClick={() => { onDelete(f.id); setConfirming(null); }}>{t("delete_field")}</button>
                      <button type="button" className="link-button" onClick={() => setConfirming(null)}>{t("cancel")}</button>
                    </div>
                  ) : editing !== f.id && (
                    <div className="saved-actions">
                      <button type="button" className="primary" onClick={() => onOpen(f)}>{t("open")}</button>
                      <button type="button" className="link-button" onClick={() => setEditing(f.id)}>{t("rename")}</button>
                      <button type="button" className="icon-button" aria-label={`${t("delete_field")}: ${f.name}`}
                        onClick={() => setConfirming(f.id)}><IconTrash /></button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="drawer-foot">
          <p className="muted small">{t("device_note")}</p>
          {importError && <p className="form-error" role="alert">{t("import_bad")}</p>}
          <div className="drawer-buttons">
            <button type="button" className="secondary" disabled={!fields.length} onClick={() => exportFields(fields)}>{t("export")}</button>
            <button type="button" className="secondary" onClick={() => fileRef.current?.click()}>{t("import")}</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              const list = await readFieldsFile(file);
              setImportError(!list);
              if (list) onImport(list);
            }} />
          </div>
        </footer>
      </div>
    </div>
  );
}

/** A small drawing of the field outline, so farmers recognise fields by shape. */
function FieldThumb({ field }: { field: GeoJSON.Polygon }) {
  const ring = field.coordinates[0];
  const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const k = Math.cos(((minY + maxY) / 2) * Math.PI / 180);           // keep the shape's proportions
  const w = (maxX - minX) * k || 1e-9, h = maxY - minY || 1e-9, s = 40 / Math.max(w, h);
  const pts = ring.map(([x, y]) => `${4 + ((x - minX) * k) * s + (40 - w * s) / 2},${4 + (maxY - y) * s + (40 - h * s) / 2}`).join(" ");
  return (
    <svg className="thumb" width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
      <polygon points={pts} />
    </svg>
  );
}

/** Asks for a name the first time a field is saved. */
export function NameDialog({ initial, onSave, onCancel }: { initial: string; onSave: (name: string) => void; onCancel: () => void }) {
  const { t } = useI18n();
  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="name-title">
      <div className="tour-dim" onClick={onCancel} />
      <form className="tour-card tour-center name-dialog" onSubmit={(e) => {
        e.preventDefault();
        const v = new FormData(e.currentTarget).get("name")?.toString().trim();
        onSave(v || initial);
      }}>
        <h2 id="name-title" className="tour-title">{t("name_field")}</h2>
        <input name="name" defaultValue={initial} autoFocus maxLength={60} aria-labelledby="name-title" />
        <p className="muted small">{t("device_note")}</p>
        <div className="tour-actions">
          <button type="button" className="secondary" onClick={onCancel}>{t("cancel")}</button>
          <button type="submit" className="primary">{t("save")}</button>
        </div>
      </form>
    </div>
  );
}

/** A short confirmation at the bottom of the screen. */
export function Toast({ text }: { text: string }) {
  return <div className="toast" role="status">{text}</div>;
}
