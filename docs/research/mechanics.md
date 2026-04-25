# Roboter-Mechanik-Profile — Normalisierungs-Konstanten

**Stand: 2026-04-25.** Datasheets liefern **Normalisierungs-Basis**, keine statischen Wear-Multiplier. Der Wear-Rate-Multiplier wird dynamisch aus Telemetrie gelernt (siehe `unifi_konzept_v2.md` → „Wear-Rate-Modell" und „Datasheet als Normalisierungs-Basis"). Ziel dieses Dokuments: pro Roboter-Modell ein schlankes Profil, das Modell-Inputs normalisiert und in die Kosten-Engine fließt.

## Minimal-Schema

```json
{
  "model": "Universal Robots UR5",
  "manufacturer": "Universal Robots",
  "class": "cobot_6dof",
  "cost_new_eur": 35000,
  "nominal_picks_lifetime": 30000000,
  "rated_current_a": 6.0,
  "rated_cycle_time_s": 2.0,
  "rated_payload_kg": 5.0,
  "nominal_duty_cycle": 0.8,
  "maintenance_cost_pct_per_year": 0.05,
  "source": "offizielles UR5-Datenblatt (data/nist-ur5-degradation/datasheets/) + plausible Cobot-Picks-Lifetime-Annahme",
  "notes": "Primary-Datensatz-Modell. UR-typische Lebensdauer ~35.000 h Betrieb × ~1.000 Picks/h ≈ 35 M Picks; auf 30 M konservativ gerundet."
}
```

**Felder erklärt:**
- `cost_new_eur` → Kapital- und Abschreibungs-Basis in der Kosten-Engine.
- `nominal_picks_lifetime` → Normalisierungs-Nenner für Kapital-Komponente pro Pick und für RUL-Ableitung aus kumulierter Wear Rate.
- `rated_current_a` → Bezugsgröße für `max(actual_current_J{1..6}).vMax / rated_current_a` = relative Motor-Auslastung (fließt als Modell-Input).
- `rated_cycle_time_s` → Bezugsgröße für `cycle_duration_estimated / rated_cycle_time_s` = relative Zyklus-Intensität.
- `rated_payload_kg` → für Payload-Szenarien im CFO-View-Slider; passt direkt zur 16-lb-/45-lb-Stratifikation der UR5-NIST-Daten.
- `nominal_duty_cycle` → für Auslastungs-Hochrechnungen.
- `maintenance_cost_pct_per_year` → Wartungs-Komponente der Kosten-Engine.

**Nicht im Schema:** `wear_multiplier` und `nominal_mtbf_hours`. Der Wear-Multiplier kommt live aus dem ML-Modell; MTBF ist nicht nötig, weil wir Verschleiß aus Telemetrie rechnen.

## Zielmodelle

Für das MVP:

1. **Universal Robots UR5** — passt zum primary-Datensatz (NIST UR5-Degradation). Pflicht. Datasheet authentisch aus dem NIST-Bundle.
2. **3–4 synthetische Alternativ-Modelle** für den **Bank-View** (Fleet-Tabelle muss Differenzierung zeigen: verschiedene Kosten, verschiedene Auslastungen). Sinnvolle Platzhalter: UR10e, FANUC CRX-10iA, KUKA KR 6, ein „SCARA"-Profil (passt zum PHM-Foreign-Datensatz im Drop-in-Demo).

Reale Alternativ-Datasheets sind optional; im MVP reichen plausible Schätzwerte aus öffentlichen Robotik-Preislisten und Klassenmittelwerten. Im Pitch transparent als Hackathon-Vereinfachung markiert.

## Suchquellen (falls reale Daten gewünscht)

- Offizielle Hersteller-Datasheets (UR, FANUC, ABB, KUKA, Yaskawa)
- Reseller-Preislisten für Neupreis
- IFR-Berichte und Wevolver-Artikel für Lebensdauer-Ranges
- Akademische TCO-Studien (Google Scholar: „robot TCO", „collaborative robot lifecycle cost")

**MTBF ist nicht Suchfokus.** Fokus: Nennstrom, Nennzykluszeit, Neupreis, nominale Picks-Lebensdauer, Nennlast.

## Findings

### Universal Robots UR5 *(primary-Datensatz-Modell)*

- **Quelle:** offizielles UR5-Datenblatt unter `data/nist-ur5-degradation/datasheets/` (im NIST-Bundle enthalten).
- **Vorschlag (zu fixieren in `decisions.md`):**
  - `cost_new_eur`: 35.000 (typischer UR5-Listenpreis ohne Peripherie)
  - `nominal_picks_lifetime`: 30.000.000 (konservative Annahme aus ~35.000 h Lebensdauer × ~1.000 Picks/h)
  - `rated_current_a`: 6.0 (UR5-Nennstrom Joints)
  - `rated_cycle_time_s`: 2.0 (typischer Cobot-Pick-Zyklus)
  - `rated_payload_kg`: 5.0 (UR5-Nennlast)
  - `nominal_duty_cycle`: 0.8
  - `maintenance_cost_pct_per_year`: 0.05

### CSEM SCARA *(Foreign-Profil, für Drop-in-Demo)*

Wird verwendet, wenn die PHM-SCARA-Daten als Foreign durch die UCS-Pipeline laufen. CSEM ist ein Forschungsinstitut, der beschriebene Aufbau ist kein kommerzielles Produkt — Zahlen sind plausibel geschätzt, im Pitch transparent als Stellvertreter markiert.

- **Vorschlag:**
  - `cost_new_eur`: 120.000 (SCARA-Industrie-Setup mit Vision + Feeder + Test Bench)
  - `nominal_picks_lifetime`: 50.000.000
  - `rated_current_a`: 3.5
  - `rated_cycle_time_s`: 2.5
  - `rated_payload_kg`: 2.0 (Sicherungs-Picken = Leichtlast)
  - `nominal_duty_cycle`: 0.8
  - `maintenance_cost_pct_per_year`: 0.05

## Fallback-Strategie

Für jedes Modell, für das keine belastbaren Zahlen findbar sind:

1. **Plausibler Schätzwert** aus Klassenmittelwerten.
2. **Im Pitch transparent** machen: Beispiel-Profile, nicht real-sourced. Entscheidend ist die Methodik, nicht der Zahlenwert — der kalibriert sich mit echten Kundendaten (Visa-Netzwerk-Effekt, siehe Konzept-v2).
