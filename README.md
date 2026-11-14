# FieldShift web app

Draw a field, describe the rotation, and get the field's conditions and three rotations compared,
in plain words with warnings and decisions.

```
frontend/   React + TypeScript + Leaflet (map, drawing, form, results window)
backend/    FastAPI around the calculation code (fieldshift_core, fieldshift_rotations, verbal)
```

## Run on your computer
Back end (terminal 1):
```
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt          # web app only; satellite downloads need requirements-data.txt
uvicorn api:app --reload --port 8000
```
Front end (terminal 2):
```
cd frontend
npm install
npm run dev            # opens on http://localhost:5173 and forwards /api to port 8000
```

## One server for the demo
`cd frontend && npm run build`, then start the back end: it serves the built app at http://localhost:8000.
Deploy that one service (for example on Render) and the whole app is online.

## How it fits together
| Screen | File | Data |
|---|---|---|
| Full-screen map, search, tools | `frontend/src/MapScreen.tsx` | Esri satellite or OpenStreetMap tiles; place search with OpenStreetMap Nominatim |
| Rotation form | `frontend/src/FieldPanel.tsx` | `GET /api/crops` |
| Results window, two slides | `frontend/src/ResultsWindow.tsx`, `MonthStrip.tsx` | `POST /api/analyse` |
| Plain-language text | `backend/verbal.py` | built from the numbers in the result |

`POST /api/analyse` takes the field outline (GeoJSON), the crops in growing order with sowing and
harvest months, irrigation yes/no, the priority, and the answer to "is the soil really bare after harvest?".
It returns the numeric result (agreed format), the words for both slides, and a month-by-month timeline
for each rotation.

## Satellite data for demo fields (NASA HLS and NASADEM/SRTM)
The app adds two NASA satellite layers for fields you prepare in advance:
- **Green cover** from HLS (Landsat + Sentinel-2): which months the field is really bare, seen from space.
- **Slope** from NASADEM / SRTM elevation: how easily bare soil washes away.

Prepare a field once (needs a free NASA Earthdata account and the extra packages):
```
cd backend
pip install -r requirements-data.txt
python precompute.py --name juelich_field1 --geojson juelich_field1.geojson --start 2023-01-01 --end 2025-12-31
```
This writes `backend/demo_fields/juelich_field1.json` (a few kB). Whenever someone draws a field that overlaps it
by 70% or more, slide 1 shows "Seen from space" dots under each month, marks months where the satellite and
the crop months disagree, says which months clouds hid, and adds a slope sentence. The rotation is lined up
with the satellite years automatically. Fields elsewhere use the crop months the farmer enters.

Tests (no internet needed): `python tests/test_api.py`

## Good to know
- If NASA POWER cannot be reached, the API uses the saved Aachen weather in `backend/demo_weather_aachen.csv`
  and says so on slide 1. Replace it with your demo field's file before judging.
- Place search uses the free Nominatim service (about one request per second); keep the credits visible.

## Languages, help and search

- **Languages:** English, Deutsch and Ελληνικά. Interface text is in `frontend/src/i18n.tsx`; the result sentences
  are written by the back end in the requested language (`backend/i18n.py`, chosen with `lang` in `/api/analyse`).
  To add a language, add a column to both files.
- **Help guide:** the ? button on the map opens a step-by-step guide; it is offered once on the first visit.
- **Search:** place names (OpenStreetMap Nominatim) or coordinates, e.g. `50.92, 6.40`, `50,92; 6,40`,
  `N 50.92 E 6.40` or `50°55'08"N 6°24'07"E`.

## Deploy on Vercel

The repo deploys as one Vercel project: the website is built from `frontend/` and served as static files,
and the FastAPI back end runs as a Python function (`api/index.py`, which loads `backend/api.py`).

1. Push this folder to GitHub, with `vercel.json`, `requirements.txt`, `.vercelignore` and `api/` at the top level.
2. On vercel.com: **Add New → Project**, import the repo, leave **Root Directory** as the repo root and
   **Framework Preset** as "Other". The settings in `vercel.json` are picked up automatically.
3. Deploy. No API keys or NASA login are needed: weather comes live from NASA POWER, and the demo field's
   satellite cover and slope are read from `backend/demo_fields/*.json`.

Notes: the first analysis of a new location downloads 45 years of weather (10–30 s); the function may run up to
60 s. Vercel only allows writing to `/tmp`, so the weather cache lives there and is lost when the function
restarts. If NASA POWER cannot be reached, the saved Aachen weather is used and the results say so.
