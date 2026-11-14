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
pip install -r requirements.txt
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

## Good to know
- If NASA POWER cannot be reached, the API uses the saved Aachen weather in `backend/demo_weather_aachen.csv`
  and says so on slide 1. Replace it with your demo field's file before judging.
- Satellite green cover is not wired into the API yet: bare months come from the crop months the farmer enters.
- Place search uses the free Nominatim service (about one request per second); keep the credits visible.
