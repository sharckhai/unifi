# Roboter-Mechanik-Profile — Normalisierungs-Konstanten

**Stand nach Konzept-v2 (2026-04-24):** Datasheets liefern **Normalisierungs-Basis**, keine statischen Wear-Multiplier. Der Wear-Rate-Multiplier wird dynamisch aus Telemetrie gelernt (siehe `unifi_konzept_v2.md` → „Wear-Rate-Modell" und „Datasheet als Normalisierungs-Basis"). Ziel dieses Dokuments: pro Roboter-Modell ein schlankes Profil, das Modell-Inputs normalisiert und in die Kosten-Engine fließt.

## Minimal-Schema

```json
{
  "model": "CSEM SCARA Sicherungs-Sorter",
  "manufacturer": "CSEM",
  "class": "scara",
  "cost_new_eur": 120000,
  "nominal_picks_lifetime": 50000000,
  "rated_current_a": 3.5,
  "rated_cycle_time_s": 2.5,
  "rated_payload_kg": 2.0,
  "nominal_duty_cycle": 0.8,
  "maintenance_cost_pct_per_year": 0.05,
  "source": "Schätzung aus PHM-Challenge-Beschreibung / plausibler Wert",
  "notes": "Primary-Datensatz-Modell. Weitere Modelle für Flotten-Demo im Bank-View."
}
```

**Felder erklärt:**
- `cost_new_eur` → Kapital- und Abschreibungs-Basis in der Kosten-Engine.
- `nominal_picks_lifetime` → Normalisierungs-Nenner für Kapital-Komponente pro Pick und für RUL-Ableitung aus kumulierter Wear Rate.
- `rated_current_a` → Bezugsgröße für `EPOSCurrent.vMax / rated_current_a` = relative Motor-Auslastung (fließt als Modell-Input).
- `rated_cycle_time_s` → Bezugsgröße für `DurationPickToPick / rated_cycle_time_s` = relative Zyklus-Intensität (Zyklen-Verdichtung als Wear-Treiber).
- `rated_payload_kg` → für Payload-Szenarien im CFO-View-Slider.
- `nominal_duty_cycle` → für Auslastungs-Hochrechnungen.
- `maintenance_cost_pct_per_year` → Wartungs-Komponente der Kosten-Engine.

**Nicht mehr im Schema:** `wear_multiplier` und `nominal_mtbf_hours`. Der Wear-Multiplier kommt live aus dem ML-Modell; MTBF ist nicht nötig, weil wir Verschleiß aus Telemetrie rechnen.

## Zielmodelle

Für das MVP reichen:

1. **CSEM SCARA Sicherungs-Sorter** — passt zum primary-Datensatz (PHM Society 2021). Pflicht.
2. **3–4 synthetische Alternativ-Modelle** für den **Bank-View** (Fleet-Tabelle muss Differenzierung zeigen: verschiedene Kosten, verschiedene Auslastungen).

Synthetische Alternativen kann ich plausibel aus öffentlichen Robotik-Preislisten und typischen Cobot-Spezifikationen ableiten (UR-, FANUC-, KUKA-Modell-Platzhalter). Keine tiefe Recherche nötig, da nicht-datengestützt — der primary-Datensatz trägt das Modell.

Optional, wenn Zeit: 2–3 reale Cobot-Datasheets (UR10e, FANUC CRX-10iA, KUKA KR 6) als Plausibilisierung. Nicht Pflicht.

## Suchquellen (falls reale Daten gewünscht)

- Offizielle Hersteller-Datasheets (UR, FANUC, ABB, KUKA, Yaskawa)
- Reseller-Preislisten für Neupreis
- IFR-Berichte und Wevolver-Artikel für Lebensdauer-Ranges
- Akademische TCO-Studien (Google Scholar: „robot TCO", „collaborative robot lifecycle cost")

**MTBF ist nicht mehr Suchfokus.** Fokus auf: Nennstrom, Nennzykluszeit, Neupreis, nominale Picks-Lebensdauer.

## Fallback-Strategie

Für jedes Modell, für das keine belastbaren Zahlen findbar sind:

1. **Plausibler Schätzwert** aus Klassenmittelwerten (z.B. SCARA ~3 A Nennstrom, ~2–3 s pro Zyklus, 20–150k € Neupreis).
2. **Im Pitch transparent** machen: Beispiel-Profile, nicht real-sourced. Entscheidend ist die Methodik, nicht der Zahlenwert — der kalibriert sich mit echten Kundendaten.

Im Gegensatz zu v1 ist das **nicht nur akzeptabel, sondern korrekt**: der ganze Pitch baut darauf, dass UNIFI Kundendaten als Kalibrierungsquelle nutzt. Datasheet-Werte sind Platzhalter.

## Findings

_(Quellen werden hier gesammelt, sobald Recherche läuft. Format: Modell · Quelle · Zahlenwerte · Zuverlässigkeit 1–3.)_

### CSEM SCARA (primary-Datensatz-Modell)

- **Quelle:** Keine offiziellen Datasheet-Zahlen verfügbar — CSEM ist ein Forschungsinstitut, der beschriebene Aufbau ist kein kommerzielles Produkt.
- **Strategie:** plausible Schätzwerte festlegen, transparent kennzeichnen.
- **Vorschlag (zu bestätigen in `decisions.md`):**
  - `cost_new_eur`: 120.000 (SCARA-Industrie-Setup mit Vision + Feeder + Test Bench)
  - `nominal_picks_lifetime`: 50.000.000 (grobe Schätzung basierend auf SCARA-Zyklus-Lebensdauer)
  - `rated_current_a`: 3.5 (typisch für SCARA-EC-Motor)
  - `rated_cycle_time_s`: 2.5 (aus Challenge-Daten konsistent)
  - `rated_payload_kg`: 2.0 (Sicherungs-Picken = Leichtlast)
  - `nominal_duty_cycle`: 0.8
  - `maintenance_cost_pct_per_year`: 0.05 (5 % p.a. — Industrie-Standard)
