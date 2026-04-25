# Datasheet-Datenbedarf & Finance-Modell

**Zweck:** Single Source of Truth für die Frage „welche Datasheet-Felder brauchen wir, woher kommen sie, und welche Finance-Formel füttert jedes Feld". Ergänzt — nicht ersetzt — `mechanics.md` (kanonisches Schema) und `unifi_konzept_v2.md` (Formel-Quelle, Z. 225–244).

**Stand:** 2026-04-25, basierend auf Konzept v2 + Inspektion der zwei lokalen Datasheets (UR5 von T.I.E., FANUC SR-3iA).

---

## 1. TL;DR

- **Cost-per-Pick** setzt sich aus 4 Komponenten zusammen: Energie + Verschleiß + Kapital + Wartung. Nur die Verschleiß-Komponente ist dynamisch (live aus dem ML-Modell), die anderen drei sind statisch aus Datasheet + Defaults.
- **Aus echten Datasheets bekommen wir nur einen Teil der UCS-Felder** — typisch: Payload, Reach, Mass, Repeatability, Joint-Geschwindigkeiten/-Ranges, Achsenzahl. **NICHT typisch im Datasheet:** Neupreis, nominale Picks-Lebensdauer, Nennstrom, Wartungskosten, nominale Zykluszeit.
- **Pflicht-Inputs für die Finance-Engine** kommen aus drei verschiedenen Quellen — Datasheet, Reseller/Catalog, Industry-Default. Das Doc trennt diese drei Quellen pro Feld.

---

## 2. Finance-Modell — Cost-per-Pick

### 2.1 Komponenten-Formel (aus Konzept v2, Z. 226–231)

```
cost_per_pick =
    energy_cost_per_pick            ← strompreis × verbrauch × pick_duration / 3600
  + wear_cost_per_pick              ← (cost_new / nominal_picks_lifetime) × wear_rate_multiplier
  + capital_cost_per_pick           ← (cost_new × zinssatz) / nominal_picks_lifetime
  + maintenance_cost_per_pick       ← (cost_new × maintenance_pct) / picks_per_year
```

| Komponente | Statisch / Dynamisch | Datenquelle |
|---|---|---|
| Energy | Statisch (im MVP) | Datasheet `power_consumption_w` × Default `strompreis_eur_per_kwh` |
| Wear | **Dynamisch** | `cost_new_eur` & `nominal_picks_lifetime` aus Reseller/Default × `wear_rate_multiplier` aus ML-Modell |
| Capital | Statisch | `cost_new_eur` × Default `zinssatz_pct` ÷ `nominal_picks_lifetime` |
| Maintenance | Statisch | `cost_new_eur` × Default `maintenance_pct_per_year` ÷ `picks_per_year` |

### 2.2 Worked Example UR5 (aus Konzept v2, Z. 235–244)

Annahmen: `cost_new = 35.000 €`, `nominal_picks_lifetime = 30.000.000`, `zinssatz = 5%`, `maintenance = 5% p.a.`, `picks_per_year = 2.000.000`, `verbrauch = 0.15 kW`, `pick_duration = 2 s`, `strompreis = 0.30 €/kWh`.

**Nominalbetrieb (`wear_rate_multiplier = 1.0`):**

| Komponente | Rechnung | Wert |
|---|---|---|
| Wear | 35.000 ÷ 30.000.000 × 1.0 | 0,00117 €/Pick |
| Capital | 35.000 × 5% ÷ 30.000.000 | 0,00006 €/Pick |
| Maintenance | 35.000 × 5% ÷ 2.000.000 | 0,000875 €/Pick |
| Energy | 0,30 × 0,15 × 2 ÷ 3.600 | 0,000025 €/Pick |
| **Gesamt** | | **~0,002 €/Pick** |

**Schwerbetrieb (`wear_rate_multiplier = 1.5`):**

| Komponente | Wert |
|---|---|
| Wear | 0,00175 €/Pick |
| (übrige unverändert) | 0,00096 €/Pick |
| **Gesamt** | **~0,0027 €/Pick** |

**Beobachtung:** Wear ist 60–70% der Gesamtkosten und der einzige preisverändernde Hebel. Capital und Maintenance dominieren den Rest.

### 2.3 Pricing-Band-Logik

Der RaaS-Konfigurator generiert einen Preis-Range pro Pay-per-Pick-Angebot (z.B. „€0,42 bis €0,58 pro Pick je nach Lastmix"). Logik:

1. Für jeden geplanten Pick wird `wear_rate_multiplier` aus dem Lastprofil prognostiziert (50g-Päckchen → ~0.6×, 8kg-Päckchen → ~1.8×, Grenzlast → ~2.5×).
2. Pro Pick wird `cost_per_pick` mit diesem Multiplier gerechnet, dann auf einen Verkaufspreis aufgeschlagen (Marge + Marktpreis-Korridor).
3. Min/Median/Max der Verteilung werden als Preis-Band ausgegeben.

**Wichtig:** Die Cents-Rechnung oben ist Selbstkosten. Die €0,42–€0,58-Range im Konzept Z. 54 enthält Marge + Marktpreis-Aufschlag — das ist nicht 1:1 die Cost-per-Pick.

---

## 3. UCS-Datasheet-Field-Schema

Das aktuelle Minimal-Schema aus `mechanics.md` Z. 7–22 wird hier um Source-Priorität, Validation-Range und Default-Werte erweitert. Die UCS-Feldliste ist normativ — Synonyme pro Hersteller siehe Abschnitt 4.

### 3.1 Pflichtfelder (Pipeline blockt ohne diese)

| `ucs_field` | Einheit | Plausibilitäts-Range | Source-Priorität | Default | Finance-Verwendung |
|---|---|---|---|---|---|
| `model` | string | nicht leer | Datasheet (Pflicht) | — | Display, Logging |
| `manufacturer` | string | nicht leer | Datasheet (Pflicht) | — | Display, Klassifikation |
| `rated_payload_kg` | kg | 0,1–2.000 | Datasheet (Pflicht) | — | Klassifikation Roboter-Klasse, CFO-Slider |
| `cost_new_eur` | € | 5.000–2.000.000 | Reseller-Catalog → Industry-Default | (Klasse-Heuristik, s.u.) | Wear-, Capital-, Maintenance-Komponente |
| `nominal_picks_lifetime` | Picks | 1e6–500e6 | Industry-Default → Schätzung | 30e6 (Cobot) / 100e6 (Industrial) | Wear-, Capital-Komponente Normalisierung |
| `rated_current_a` | A | 0,5–50 | Datasheet (Tech-Section) → Default | 3,5 (SCARA) / 6,0 (Cobot) | Telemetrie-Normalisierung (`motor_current / rated_current_a`) |
| `rated_cycle_time_s` | s | 0,5–30 | Datasheet (Performance-Section) → Default | 2,5 (SCARA) / 2,0 (Cobot) | Telemetrie-Normalisierung (`pick_duration / rated_cycle_time_s`) |

### 3.2 Optional / mit Industry-Default

| `ucs_field` | Einheit | Plausibilitäts-Range | Default | Verwendung |
|---|---|---|---|---|
| `maintenance_cost_pct_per_year` | % (0,01–0,15) | 0,03–0,08 typisch | 0,05 | Maintenance-Komponente |
| `nominal_duty_cycle` | (0,0–1,0) | 0,3–0,95 | 0,8 | Hochrechnung `picks_per_year` |
| `power_consumption_w` | W | 50–10.000 | 150 (Cobot) / 500 (Industrial) | Energy-Komponente |
| `weight_kg` | kg | 1–5.000 | — | Display, Mounting-Validation |
| `reach_mm` | mm | 200–4.000 | — | Display, Anwendungs-Klassifikation |
| `dof` | int (axes) | 3–7 | — | Klassifikation (4=SCARA, 6=Cobot/Industrial) |
| `repeatability_mm` | mm | 0,001–1,0 | — | Display, Anwendungs-Klassifikation |

### 3.3 Class-Heuristiken für Defaults

Wenn weder Datasheet noch Reseller einen Wert liefert, werden Defaults pro Roboter-Klasse genutzt. Klasse wird aus `dof` + `rated_payload_kg` bestimmt:

| Klasse | Erkennung | `cost_new_eur` Default | `nominal_picks_lifetime` Default | `rated_current_a` Default | `rated_cycle_time_s` Default | `power_consumption_w` Default |
|---|---|---|---|---|---|---|
| **SCARA** | dof=4 | 80.000 | 50e6 | 3,5 | 2,5 | 200 |
| **Cobot** | dof=6, payload<15kg | 35.000 | 30e6 | 6,0 | 2,0 | 150 |
| **Industrial** | dof=6, payload≥15kg | 80.000 | 100e6 | 12,0 | 1,5 | 800 |

Quelle der Default-Werte: Konzept v2 Z. 225–244 + `mechanics.md` Z. 73–79 + plausibilisiert mit den Class-Mittelwerten aus `mechanics.md` Z. 59. **Diese Defaults sind Hackathon-Platzhalter** — im Produktivsystem ersetzt durch Reseller-Daten und Kunden-ERP.

### 3.4 Industry-Defaults für Finance-Konstanten (nicht im Datasheet)

| Konstante | Default | Quelle / Verifikation |
|---|---|---|
| `strompreis_eur_per_kwh` | 0,30 | Konzept v2 Z. 242, Industrie-Tarif DE 2025/2026, in `financials.md` zu verifizieren |
| `zinssatz_pct` | 0,05 | Konzept v2 Z. 240, Equipment-Leasing DE, in `financials.md` zu verifizieren |
| `maintenance_pct_per_year` | 0,05 | Konzept v2 Z. 241, Industrie-Standard 3–8% |
| `picks_per_year` | 2.000.000 | Konzept v2 Z. 241 (UR5-Beispiel), abgeleitet aus `nominal_duty_cycle` × `picks_per_day` × 365 |

---

## 4. Hersteller-Synonyme

Pro Hersteller eine Tabelle `ucs_field` ↔ „so steht es im PDF" — basierend auf den zwei lokalen Datasheets plus Industrie-Erfahrung. **Lücken sind explizit markiert.**

### 4.1 Universal Robots (UR3 / UR5 / UR10 / UR16e / UR20)

Quelle für UR5: `data/nist-ur5-degradation/datasheets/UR5_3rd-party_datasheet.pdf` (T.I.E. Industrial Reseller-Datasheet). Plus: typische UR-OEM-Datasheets von ur.com.

| UCS-Feld | Wie es im UR-Datasheet steht | Wert im UR5-PDF |
|---|---|---|
| `model` | „Universal Robots UR5" / Header | „UR5" |
| `manufacturer` | „Universal Robots" / Logo | „Universal Robots" |
| `rated_payload_kg` | „Payload" | 5 kg |
| `weight_kg` | „Robot Mass" | 18,4 kg |
| `reach_mm` | „H-Reach" oder „Working radius" | 850 mm |
| `dof` | „Axes" | 6 |
| `repeatability_mm` | „Repeatability" | ± 0,1 mm |
| `power_consumption_w` | „Power consumption (Avg)" / „Typical power" — **NICHT in UR5-Reseller-PDF**, in OEM-Datasheets von ur.com typisch enthalten | (fehlt im PDF) |
| `rated_current_a` | **NICHT in UR-Datasheets** — Joint-Strom in NIST-Telemetrie messbar, aber nicht spezifiziert | (fehlt) |
| `rated_cycle_time_s` | **NICHT in UR-Datasheets** | (fehlt) |
| `cost_new_eur` | **NIE im Datasheet** — kommt aus Reseller-Angebot / öffentlicher Liste | (fehlt) |
| `nominal_picks_lifetime` | **NIE im Datasheet** — Hersteller geben „Lifetime" in Stunden/Jahren statt Picks an | (fehlt) |
| — | „Robot Motion Speed: J1–J6 = 180°/s" | nicht UCS-relevant (nur Display) |
| — | „Robot Motion Range: J1–J6 = ±360°" | nicht UCS-relevant (nur Display) |
| — | „Mounting" | nicht UCS-relevant |
| — | „Robot Applications" | nicht UCS-relevant |

**Beobachtung UR-Reseller-PDFs:** Sehr knapp — im Wesentlichen die 6 Display-Felder oben. **OEM-Datasheets** (ur.com offiziell) enthalten zusätzlich: `power_consumption_w` (typisch „Average power consumption"), `temperature_range_c`, „IP rating" / „Protection class", aber weiterhin keine Cost/Lifetime/Cycle-Time-Angaben.

### 4.2 FANUC (SR-3iA / CRX-Serie / LR Mate / M-Serie)

Quelle für SR-3iA: `data/phm-society-2021/datasheets/fanuc-sr-3ia-datasheet.pdf`. Plus: typische FANUC-OEM-Datasheets von fanuc.eu.

| UCS-Feld | Wie es im FANUC-Datasheet steht | Wert im SR-3iA-PDF |
|---|---|---|
| `model` | Header („SR-3iA") + Spalten „Series/Version/Type" | „SR-3iA" |
| `manufacturer` | Logo („FANUC") | „FANUC" |
| `rated_payload_kg` | „Max. load capacity at wrist (kg)" | 3 kg |
| `weight_kg` | „Mechanical weight (kg)" | 19 kg |
| `reach_mm` | „Reach (mm)" | 400 mm |
| `dof` | „Controlled axes" | 4** (4-axis SCARA) |
| `repeatability_mm` | „Repeatability (mm)" | ± 0,01 (J1, J2), ± 0,01 (J3), ± 0,004° (J4) |
| `power_consumption_w` | **Selten** in der Compact-Tabelle. In OEM-Volldatasheets unter „Power source" als kVA. | (fehlt im PDF) |
| `rated_current_a` | **NICHT typisch** im Datasheet | (fehlt) |
| `rated_cycle_time_s` | **NICHT typisch** im Datasheet — manchmal „Standard cycle time" für Pick-and-Place | (fehlt im PDF) |
| `cost_new_eur` | **NIE im Datasheet** | (fehlt) |
| `nominal_picks_lifetime` | **NIE im Datasheet** | (fehlt) |
| — | „Motion range (°)" pro Achse | nicht UCS-relevant |
| — | „Maximum speed (°/s)" pro Achse | nicht UCS-relevant |
| — | „Moments (N·m)/Inertia (kg·m²)" | nicht UCS-relevant |
| — | „Push Force (N)" — FANUC-spezifisch (SCARA) | nicht UCS-relevant |
| — | „Protection" (IP20) | optional UCS-relevant für Filter |

**Beobachtung FANUC:** Tabellen-orientiert (eine Zeile pro Modell, viele Spalten). Viel mehr Joint-Detail als UR, aber dieselben Lücken: kein Strom, keine Lebensdauer, kein Preis.

### 4.3 Wo kommen die fehlenden Werte her?

Da **alle 4 Pflicht-Finance-Felder (`cost_new_eur`, `nominal_picks_lifetime`, `rated_current_a`, `rated_cycle_time_s`) typisch nicht im Datasheet stehen**, läuft die Pipeline mit folgender Source-Hierarchie:

1. **Datasheet** — `model`, `manufacturer`, `rated_payload_kg`, `weight_kg`, `reach_mm`, `dof`, `repeatability_mm`, ggfs. `power_consumption_w`.
2. **Reseller-Catalog / Listenpreis** — `cost_new_eur`. Manuell einzutragen oder aus öffentlichen Reseller-Listen (T.I.E., Robotshop, RobotWorx) — im Hackathon Hardcoded pro Modell.
3. **Industry-Default per Klasse** (Tabelle 3.3) — `nominal_picks_lifetime`, `rated_current_a`, `rated_cycle_time_s`, `power_consumption_w`, `maintenance_cost_pct_per_year`, `nominal_duty_cycle`.
4. **Telemetrie-Statistik** (post-onboarding) — Sobald Live-Daten kommen, können `rated_current_a` und `rated_cycle_time_s` durch p95/p99-Statistiken aus Telemetrie ersetzt werden.

---

## 5. Validation Rules

### 5.1 Range-Checks (aus Tabellen 3.1 + 3.2)

```python
# Pflichtfeld-Checks (Pipeline blockt bei Verletzung)
assert 0.1 <= rated_payload_kg <= 2000
assert 5_000 <= cost_new_eur <= 2_000_000
assert 1e6 <= nominal_picks_lifetime <= 500e6
assert 0.5 <= rated_current_a <= 50
assert 0.5 <= rated_cycle_time_s <= 30
assert model and manufacturer  # nicht-leer

# Optional-Feld-Checks (Default bei Verletzung, Warning loggen)
assert 0.01 <= maintenance_cost_pct_per_year <= 0.15  # sonst → 0.05
assert 0.0 < nominal_duty_cycle <= 1.0                 # sonst → 0.8
```

### 5.2 Spezialfälle

- **Division-by-Zero in Normalisierung:** Wenn `rated_current_a == 0` oder `rated_cycle_time_s == 0` → Mapping muss explizit failen, nicht durchrutschen. UCS-Agent setzt diese Felder nie auf 0; bei fehlendem Wert → Default aus Klasse-Heuristik.
- **Klasse-Inferenz fehlschlägt:** Wenn `dof` fehlt oder unklar (z.B. 5-Achs-System) → Default auf "Cobot" mit Warning.
- **Mismatching Units:** FANUC gibt manchmal Repeatability als Grad statt mm (siehe SR-3iA J4 = ±0,004°). → Pro Joint separat parsen, Cobot-Repeatability ist Single-Wert (kartesisch), SCARA hat per-Joint-Repeatability.
- **Reseller-PDFs** (wie das UR5-T.I.E.-PDF): typisch noch dünner als OEM-Datasheets. Pipeline muss damit umgehen, dass nur 5–6 Felder extrahierbar sind und der Rest aus Defaults kommt.

### 5.3 Ergebnis-Kontrakt für UCS-Datasheet-Mapping

```python
class UcsDatasheet(BaseModel):
    # Required (must come from datasheet OR explicit user input)
    model: str
    manufacturer: str
    rated_payload_kg: float
    cost_new_eur: float          # often from reseller, not datasheet
    nominal_picks_lifetime: int  # often from class default

    # Required for normalization (datasheet OR class default)
    rated_current_a: float
    rated_cycle_time_s: float

    # Optional with defaults
    maintenance_cost_pct_per_year: float = 0.05
    nominal_duty_cycle: float = 0.8
    power_consumption_w: float | None = None

    # Display / classification (optional)
    weight_kg: float | None = None
    reach_mm: float | None = None
    dof: int | None = None
    repeatability_mm: float | None = None

    # Provenance pro Feld (welche Source hat den Wert geliefert)
    source: dict[str, Literal["datasheet", "reseller", "default", "user"]]
```

---

## 6. End-to-End-Beispiel: UR5

**Input:** `data/nist-ur5-degradation/datasheets/UR5_3rd-party_datasheet.pdf` (Reseller-Stil, knapp).

**Step 1 — Was Pioneer/Claude aus dem PDF extrahieren kann:**

```json
{
  "model": "UR5",
  "manufacturer": "Universal Robots",
  "rated_payload_kg": 5.0,
  "weight_kg": 18.4,
  "reach_mm": 850,
  "dof": 6,
  "repeatability_mm": 0.1,
  "source": {
    "model": "datasheet",
    "manufacturer": "datasheet",
    "rated_payload_kg": "datasheet",
    "weight_kg": "datasheet",
    "reach_mm": "datasheet",
    "dof": "datasheet",
    "repeatability_mm": "datasheet"
  }
}
```

**Step 2 — Klasse-Inferenz:** `dof=6` + `rated_payload_kg=5` < 15 → **Cobot**.

**Step 3 — Defaults aus Klasse füllen:**

```json
{
  "cost_new_eur": 35000,             // Reseller-Listenpreis UR5 (hardcoded MVP)
  "nominal_picks_lifetime": 30000000,// Cobot-Default
  "rated_current_a": 6.0,            // Cobot-Default
  "rated_cycle_time_s": 2.0,         // Cobot-Default
  "power_consumption_w": 150,        // Cobot-Default
  "maintenance_cost_pct_per_year": 0.05,
  "nominal_duty_cycle": 0.8,
  "source": {
    "cost_new_eur": "reseller",
    "nominal_picks_lifetime": "default",
    "rated_current_a": "default",
    "rated_cycle_time_s": "default",
    "power_consumption_w": "default",
    "maintenance_cost_pct_per_year": "default",
    "nominal_duty_cycle": "default"
  }
}
```

**Step 4 — Cost-per-Pick-Berechnung mit `wear_rate_multiplier=1.2` (typisch leichter Mischbetrieb):**

```
energy      = 0.30 × 0.150 × 2.0 / 3600 = 0.000025 €/Pick
wear        = 35000 / 30_000_000 × 1.2 = 0.00140 €/Pick
capital     = 35000 × 0.05 / 30_000_000 = 0.00006 €/Pick
maintenance = 35000 × 0.05 / 2_000_000 = 0.000875 €/Pick
─────────────────────────────────────────────────────
total       = 0.00236 €/Pick
```

**Step 5 — Pricing:** Bei Marge 100% + Marktpreis-Aufschlag → Pay-per-Pick ~€0,005–€0,007 (sehr niedriger Bereich, weil UR5 leichte Aufgaben). Größere Industrie-Roboter mit höherer Wear-Rate landen im €0,42–€0,58-Band aus dem Konzept.

**Beobachtung:** **Nur 7 von 13 finanzrelevanten Feldern kommen aus dem Datasheet.** 6 Felder kommen aus Reseller-Catalog oder Klasse-Defaults. Das ist nicht ein Pipeline-Problem — das ist die Realität. Pioneer/GLiNER kann nur extrahieren, was im PDF steht.

---

## 7. Konsequenzen für die Pipeline

1. **Pioneer/GLiNER wird auf einer kleineren Feld-Liste trainiert als das volle UCS-Schema.** Trainings-Labels sind nur Felder, die in Datasheets typisch enthalten sind: `model`, `manufacturer`, `rated_payload_kg`, `weight_kg`, `reach_mm`, `dof`, `repeatability_mm`, `power_consumption_w` (optional). Das sind ~7–8 Labels. **Siehe `pioneer-training-plan.md`.**

2. **Die UCS-Datasheet-Onboarding-UI braucht zwei Sektionen:**
   - **Auto-extracted** (aus Datasheet) — User reviewt + bestätigt.
   - **Manual / Default** (Reseller-Preis, Klasse-Defaults) — User kann überschreiben, aber Defaults sind vorgeschlagen.

3. **`cost_new_eur` braucht eine separate Source.** Im MVP: Hardcoded-Preisliste pro `(manufacturer, model)`-Tupel in `data/reseller-prices.json`. Im Pitch transparent: „Listenpreis aus Reseller-Catalog, im Produktiv-System aus Kunden-ERP".

4. **Class-Defaults aus Tabelle 3.3 sind die *eigentliche* Hackathon-Magie.** Sie ermöglichen, dass jeder Roboter — auch ohne perfektes Datasheet — eine Cost-per-Pick-Zahl bekommt. Das ist die UCS-„Standard"-Story: einheitliche Defaults pro Klasse, kalibriert mit echten Kundendaten.

---

## 8. Offene Punkte (in `open-questions.md` referenziert)

- **Restwert-Abschreibungskurve** — bleibt offen, siehe `open-questions.md` Z. 26.
- **Robot Credit Score Gewichte** — bleibt offen, siehe `open-questions.md` Z. 25.
- **Default-Werte in `financials.md` finalisieren** — Strompreis 2025/2026, Equipment-Leasing-Zinsen, IFRS-16-Beispiel.
- **Reseller-Preisliste** — welche Modelle hardcoded? Mindestens UR3/5/10/16, FANUC SR-3iA + CRX-10iA als Demo-Set.
- **`power_consumption_w` Kein-Datasheet-Fallback** — sollte Telemetrie-basiert (peak × duty) abgeleitet werden? Im MVP: Klasse-Default genügt.

---

## 9. Quellen

- `docs/idea-concept/unifi_konzept_v2.md` — Z. 225–244 (Cost-per-Pick), Z. 17–19 (UCS-Definition), Z. 275–297 (UCS-Agent), Z. 300–314 (Drop-in-Flow).
- `docs/research/mechanics.md` — Z. 7–22 (kanonisches Schema), Z. 73–79 (CSEM-SCARA-Profil).
- `docs/research/financials.md` — Default-Konstanten (in Recherche).
- `docs/research/decisions.md` — Z. 59 ff. (UCS-Agent-Design), Z. 121 ff. (Doppel-Drop-Entscheidung).
- `data/nist-ur5-degradation/datasheets/UR5_3rd-party_datasheet.pdf` (T.I.E. Industrial).
- `data/phm-society-2021/datasheets/fanuc-sr-3ia-datasheet.pdf` (FANUC OEM).
