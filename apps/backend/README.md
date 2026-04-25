# UNIFI Backend

Python 3.12, FastAPI, LightGBM. Liefert das UCS-Schema, die Wear-Rate-Trainings-Pipeline und den Inferenz-Endpoint.

## Setup

```bash
cd apps/backend
uv sync
```

## Tests

```bash
uv run pytest -q
```

## API (Skelett)

```bash
uv run uvicorn unifi.main:app --reload
```

- `GET /health` — Liveness + Modell-Status

Weitere Endpoints (Wear-Rate-Predict, Cost-per-Pick) werden in Folge-Iterationen ergänzt.

## Struktur

Single Source of Truth fürs Konzept: `docs/idea-concept/unifi_konzept_v2.md`.

```
src/unifi/
├── api/routes/      # FastAPI-Router
├── core/            # Settings
├── ucs/             # UCS-Schema + Normalizer (autoritativ)
├── data/            # UR5-Loader + Windowing
├── labels/          # Physikalisch motivierte Wear-Labels
├── models/          # LightGBM Wear-Rate-Modell
└── scripts/         # build_dataset, make_labels, train_wear_rate
```
