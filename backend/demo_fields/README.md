Pre-computed satellite layers for demo fields go here (one JSON file per field).
Create them with:  python precompute.py --name my_field --geojson my_field.geojson
When someone draws a field that overlaps a demo field by 70% or more, the app uses its
satellite green cover and slope automatically.
