# Spora

**Spora turns free NASA weather and satellite data into plain-language crop rotation advice for a farmer's own field.**

A farmer draws their field on a map and says what they grow. Spora shows how the local weather has changed,
when the soil lies bare, and how the current rotation compares with a soil-building and a water-saving
alternative, in plain words, with clear warnings and questions to take to an advisor.

Built for the [NASA Space Apps Challenge 2026](https://www.spaceappschallenge.org/) challenge
**"Field Shift: Adapting Farms with NASA Data"**, at the Aachen local event.

> Spora supports the farmer's judgement. It does not replace local advice.

---

## Why

Weather on a given field is not what it was twenty years ago: more hot days, fewer frost days, heavier
downpours. A crop rotation (the order in which crops follow each other on a field over several years) decides
how well a farm copes. It decides when the soil is protected by plants and when it lies bare, how much water
the crops need, and which weather risks hit which crop.

NASA already publishes the data to answer these questions for any field on Earth, free of charge. But it comes
as gridded files, satellite scenes and scientific variables, not as answers a farmer can use. Spora closes that gap.

## What a farmer gets

1. **How the weather on their field has changed.** The last 20 years compared with the 20 before: warm and hot
   days, frost, heavy rain, dry spells and yearly rain, each marked as more common, less common or about the same.
2. **When their soil is bare.** A month-by-month strip of the whole rotation, green where something grows and
   brown where the soil is bare. On prepared fields, satellite images confirm the months seen from space.
3. **Three rotations side by side.** What they grow now, a **soil-building** option (a cover crop in the longest
   bare gap) and a **water-saving** option (a less thirsty crop in place of the thirstiest one). The best match
   for what matters most to them is marked, with what gets better, what to watch out for and what to ask an advisor.

---

## The experience, step by step

Spora is designed for farmers who do not use much technology: large buttons, short sentences, few numbers,
nothing that cannot be undone, and a guide that is always one tap away.

### 1. Start page
A moving farm scene with the Spora logo and the slogan *"See your field from space. Plan your rotation on the
ground."* Scrolling down, two illustrated scenes explain the idea: three steps along a glowing path (draw, we
read NASA data, compare), and the three NASA data sources on a satellite's arc. Each ring opens that data
source. The glowing field outline in the first scene is itself the **Start** button.

### 2. A first-time guide
On the first visit to the map, Spora asks *"First time here?"* and offers an eight-step guide. Each step
highlights the real button it explains (search, draw, edit, the crop form, Analyse, language) in large text
with big Back and Next buttons. The **?** button opens the guide again at any time.

### 3. Find the field
A full-screen satellite map with one search bar. Farmers can type a village name, or **coordinates** in the
form they have them: `50.92, 6.40`, `50,92; 6,40`, `N 50.92 E 6.40` or `50°55'08"N 6°24'07"E`. Coordinates
fly straight to the point and drop a pin. Buttons on the right go to the farmer's location, switch between
satellite and road map, and zoom.

### 4. Draw the field
Press the draw button and tap the field's corners; tap the first corner again to finish. A pencil moves corners;
a bin starts again. A hint at the bottom of the screen always says what to do next.

Every outline is checked at once: an outline that is mostly at sea (Natural Earth land polygons) or on a lake,
river or reservoir (OpenStreetMap) turns red, says why, and cannot be analysed until it is redrawn on land.

### 5. Tell Spora what grows there
A form opens beside the field (from the bottom on a phone):
- the crops in the order they are grown, each with its sowing and harvest month (sensible months are filled in
  when a crop is chosen), up to six crops;
- *Can you irrigate this field?* Yes / No;
- **Field health** (asked of everyone, with a "Not sure" answer): *Have there been pest or disease problems on
  this field?* (fungal, viral, insect pests, none) and *Fertiliser last season, or any shortage you noticed?*
  (usual, a lot of nitrogen, N, P or K shortage);
- **Your soil** (optional, folded away): texture (sandy, loamy, clay), colour (red = iron-rich; light or whitish
  = possibly chalky, high pH; very dark = organic, possibly acidic), pH if known, and whether this comes from a
  soil analysis or from what the farmer sees. Analysis results are stated firmly; observations are hedged and a
  soil test is suggested;
- *What matters most to you?* Save water · Build healthier soil · Earn more or feed animals.

Then **Analyse my field**.

### 6. Results, page 1: your field
- **How the weather here has changed**, one line per topic with an up, down or level arrow.
- **Water:** whether rain covers what the crops need.
- **When your soil is bare:** the month strip for every year of the rotation, plus how much of the year's rain
  falls on bare soil and, on prepared fields, the slope and what the satellite saw.
- **Field health:** what the farmer reported, what it changes in the advice, how often a cereal follows a cereal,
  soil notes, and the questions about this field to take to an advisor.
- One question back to the farmer: *Is the soil really bare after harvest?* (bare soil, stubble left, something
  else). The answer updates the results at once.
- **Where this comes from:** the data behind each statement.

### 7. Results, page 2: your options
The advice comes first, in words; the numbers follow for those who want them.
- One sentence at the top with the decision, for example: *"For building healthier soil, the best option is the
  soil-building rotation: sow winter rye in September and end it in February, before the sugar beet is sown."*
  Switching the priority re-ranks the options instantly.
- Warnings that apply to every option are folded into one line, so the cards show only what differs.
- Three cards. Each starts with what to do, then **Why choose it** and **Watch out for** as plain sentences, always
  visible (the first few, with "Show more"), and *Ask your advisor* one tap away. Below, **In numbers**: soil
  covered, rain on bare soil, extra water and cereal after cereal, each with a small bar and a check mark (better
  than today), a warning mark (worse) or a dash (about the same), and the months strip one tap away.
- **Read aloud** on the decision and on every card reads the advice with the device's own voice, in the chosen
  language, for farmers who prefer listening to reading.

### 8. Save fields
**Save field** (in the form and in the results) keeps the outline, all answers and the latest results. **My fields**
on the map lists them with a small drawing of each outline: open one to see its results again, rename or delete
it. Fields are saved on the farmer's device, with no account; **Export** writes them to a file that can be kept as
a copy or imported on another device.

### 9. Three languages
English, Deutsch and Ελληνικά, switchable on the start page, on the map and inside the results. Everything is
translated, including crop names, months and the result sentences. The choice is remembered on the device.

Works on phones, tablets and computers, with keyboard navigation and screen-reader labels.

---

## Example: a demo field near Jülich (North Rhine-Westphalia)

A 12.5 ha arable block (official NRW field block DENWLI0550042220), rotation sugar beet → winter wheat →
winter rapeseed → winter wheat:

| | Current | Soil-building | Water-saving |
|---|---|---|---|
| Change | — | winter rye from September to February, before sugar beet | sunflower instead of sugar beet |
| Soil covered | 7.8 months a year | 9.0 | 7.5 |
| Rain on bare soil | 34 % | 24 % | 36 % |
| Extra water needed | 134 mm a year | 134 | 107 |

Weather (Nov 2006 – Oct 2026 against the 20 years before): hot days of 30 °C or more went from about 5 to 8 a
year, frost days from 71 to 58. HLS satellite images from 2023 to 2025 match the rotation the farmer entered,
and the field's mean slope is 3 %.

---

## Data

| Source | What Spora uses it for |
|---|---|
| [NASA POWER](https://power.larc.nasa.gov/) daily point data (1981 to today) | Temperature, rain, sun, humidity and wind for the field's area (about 50 km): weather changes, warnings and the water balance |
| [NASA HLS](https://hls.gsfc.nasa.gov/) (Harmonized Landsat Sentinel-2, 30 m) | Monthly greenness (NDVI) of the field, to see from space when the soil is really bare |
| [NASADEM](https://lpdaac.usgs.gov/products/nasadem_hgtv001/) (30 m elevation) | Slope of the field, to judge how easily bare soil washes away |
| FAO-56 (Allen et al., 1998) | Reference evapotranspiration method and crop water coefficients |
| Agronomy text on winter cereals, crop rotation, pests and diseases | Field-health rules: pests, diseases, nutrients and soil |
| Landwirtschaftskammer NRW and FAO crop calendars | Sowing and harvest months, cover crops and crop limits in the crop table (`backend/crops.csv`) |
| NRW field blocks (ogc-api.nrw.de) | The outline of the demo field |
| OpenStreetMap / Nominatim, Esri World Imagery | Map tiles and place search |
| Natural Earth 1:10m land (via world-atlas) and OpenStreetMap water areas (Overpass API) | Refusing outlines at sea or on lakes, rivers and reservoirs |

Only open data is used; no paid services and no Google Earth Engine.

---

## How it works

**Bare months.** A rotation repeats every $T$ months. For each month $m$, $u(m)=1$ if the soil is bare and
$u(m)=0$ if a crop or cover crop protects it. It comes from the crop months the farmer enters (a crop protects
the soil from its second month) or, on prepared fields, from satellite greenness ($\text{NDVI} < 0.3$ = bare).

**Weather.** The last 20 complete years are compared with the 20 before. Water lost to the air, $ET_0$, uses the
FAO-56 Penman–Monteith equation on the six POWER variables (Hargreaves if some are missing).

**Four numbers per rotation**, all per year:

$$N_1 = 12 - \frac{12}{T}\sum_m u(m) \qquad \text{months with the soil covered}$$

$$N_2 = 100\,\frac{\sum_m u(m)\,P(m)}{\sum_m P(m)} \qquad \text{share of rain falling on bare soil (\%)}$$

$$N_3 = \frac{12}{T}\sum_m \max\bigl(0,\; K_c(m)\,ET_0(m) - P(m)\bigr) \qquad \text{extra water needed (mm)}$$

$N_4$ counts months with a crop that can be sold or grazed. $P(m)$ is monthly rain and $K_c(m)$ the crop's
water use relative to grass.

**Alternatives.** The soil-building option places a cover crop in the longest bare gap, if it can be sown then,
gets enough warmth to establish (growing degree days), escapes damaging frost and has rain to start; legumes are
preferred, and crop-health rules apply (for example no brassica or clover covers with rapeseed). The
water-saving option replaces the thirstiest main crop with one that fits the same season, ripens in the local
warmth and needs at least 20 % less water.

**Ranking.** No hidden score: the farmer's priority picks the number. Save water → lowest $N_3$. Build soil →
lowest $N_2$, then highest $N_1$. Earn more or feed animals → highest $N_4$.

**Pests and diseases.** The farmer's field-health answers change what Spora suggests, following an agronomy text
on winter cereals, crop rotation, pests and diseases supplied by the team's agronomist:
- A cereal after a cereal is not a true rotation: same nutrient needs and roots, nearly the same pests and
  diseases, and shed grain comes up in the next crop. Spora counts how often it happens in each option.
- With past pests or diseases, no cereal cover crop (such as winter rye) is placed before a cereal, the
  water-saving swap never puts a crop next to its own family, and an option with more cereals in a row than
  today is never ranked first.
- Legumes add nitrogen and make phosphorus, potassium and sulphur easier to take up, but are themselves prone to
  fungal diseases; oilseeds are good breaks.
- Heavy clay soil: more root rots, soil-borne mosaic viruses and cereal ground beetle. Heavy nitrogen: more
  powdery mildew and cereal leaf beetle. Viral problems: sow winter cereals later in autumn, after the aphid
  flight. Fungal problems: certified, treated seed and resistant varieties against rusts, bunts and smuts.
- General agronomy, not from the text: sandy soil holds little water and loses nitrogen; acidic soil hurts sugar
  beet, barley, rapeseed and clover; chalky soil locks up phosphorus.

The rules live in `backend/health.py`.

**Warnings** are counted over the last 20 years and shown when they happen in at least 4 of them: heat during
a crop's sensitive months, frost after sowing, two-week dry spells, and heavy rain (20 mm or more in a day) on
bare soil. They are written as how often they happen, for example "about one year in four".

---

## Scope and limits

- **Weather and soil-cover results work for any field.** Crop suggestions are checked for North
  Rhine-Westphalia first; elsewhere they need a local advisor's confirmation. The crop table knows two climate
  types (temperate and Mediterranean) so far.
- POWER weather describes the wider area (about 50 km), not a single field; local frost pockets and storms differ.
- Water stored in the soil is not modelled, so the water numbers are a conservative guide.
- Satellite cover and slope are prepared in advance for demo fields; other fields use the crop months the
  farmer enters.
- Markets, prices, machinery, subsidies and local rules are not checked; the cards say so and list the
  questions to ask.

## What comes next

- A global crop table built from FAO GAEZ suitability, global crop calendars and ECOCROP, with a confidence
  label per region (checked locally, global data, or rule-based).
- Köppen climate zones instead of the two-zone rule.
- Satellite cover and slope for any drawn field, computed on demand.
- More languages and more regions, each added by filling in a table.
- Accounts and a database (for example Postgres on Neon) so fields follow the farmer across devices and can be
  shared with an advisor.

---

## For developers

```
frontend/   React 19 + TypeScript + Vite + Leaflet/Geoman: start page, map, form, results, help guide, i18n
backend/    Python: calculations (fieldshift_core, fieldshift_rotations), wording (verbal, i18n), FastAPI (api.py)
api/        Vercel entry point for the back end
```

| Part | File |
|---|---|
| Start page | `frontend/src/Landing.tsx` |
| Map, search (places and coordinates), tools, language menu | `frontend/src/MapScreen.tsx`, `coords.ts` |
| Crop form | `frontend/src/FieldPanel.tsx` |
| Results window | `frontend/src/ResultsWindow.tsx`, `MonthStrip.tsx` |
| Help guide | `frontend/src/HelpTour.tsx` |
| Saved fields (on the device), export and import | `frontend/src/storage.ts`, `MyFields.tsx` |
| Land and water check | `backend/landcheck.py`, `backend/data/land-10m.json` |
| Interface text (EN, DE, EL) | `frontend/src/i18n.tsx` |
| Calculations | `backend/fieldshift_core.py`, `backend/fieldshift_rotations.py` |
| Field health rules (pests, diseases, nutrients, soil) | `backend/health.py` |
| Result sentences (EN, DE, EL) | `backend/verbal.py`, `backend/i18n.py` |
| Crop table | `backend/crops.csv` |
| Satellite and slope for demo fields | `backend/satellite.py`, `backend/precompute.py`, `backend/demo_fields/` |

**API.** `POST /api/check_field` checks an outline (size, shape, on land) in the farmer's language. `GET /api/crops` lists crops with names in all three languages. `POST /api/analyse` takes the field
outline (GeoJSON), the crops in order with sowing and harvest months, irrigation, priority, the answer about
bare soil after harvest, the field-health answers (`health`) and `lang` (`en`, `de` or `el`). It returns the numbers, the sentences for both pages and a
month-by-month timeline for each rotation.

### Run on your computer
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
npm run dev            # http://localhost:5173, forwards /api to port 8000
```
Or build once (`cd frontend && npm run build`) and open http://localhost:8000: the back end serves the built site.
Add `#map` to the address to skip the start page.

Tests (no internet needed): `python backend/tests/test_api.py`

### Deploy on Vercel
The repo deploys as one Vercel project: the site is built from `frontend/` and the FastAPI back end runs as a
Python function (`api/index.py`). Import the repo on vercel.com with the root directory as is and Framework
Preset "Other"; `vercel.json` does the rest. No API keys or NASA login are needed.

The first analysis of a new location downloads 45 years of weather (10–30 s). The weather cache lives in
`/tmp` and is lost when the function restarts. If NASA POWER cannot be reached, saved Aachen weather is used and
the results say so.

### Prepare a demo field (satellite cover and slope)
Needs a free [NASA Earthdata](https://urs.earthdata.nasa.gov/) account:
```
cd backend
pip install -r requirements-data.txt
python precompute.py --name juelich_field1 --geojson juelich_field1.geojson
```
This writes `backend/demo_fields/juelich_field1.json`. Any drawn field that overlaps it by 70 % or more gets the
"Seen from space" layer and the slope sentence.

### Add a language
Add a column to `frontend/src/i18n.tsx` (interface) and `backend/i18n.py` (result sentences, crop names, months).

---

## Credits

Made by Team Spora for the NASA Space Apps Challenge 2026, Aachen.
Data: NASA POWER, NASA HLS (LP DAAC), NASADEM; FAO; Landwirtschaftskammer Nordrhein-Westfalen; Land NRW field
blocks; OpenStreetMap contributors; Esri World Imagery. NASA does not endorse this project.
