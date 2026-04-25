"""FastAPI-App-Skelett.

Inferenz-Endpoints (Wear-Rate, Cost-per-Pick) werden in Folge-Iterationen
unter `unifi.api.routes` ergänzt und hier registriert.
"""

from fastapi import FastAPI

from unifi.api.routes import health

app = FastAPI(title="UNIFI Backend", version="0.1.0")
app.include_router(health.router)
