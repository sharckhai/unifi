# Research-Entscheidungen

Kurze, verbindliche Notizen. Jede Entscheidung mit Datum und Begründung. Änderungen werden nicht überschrieben, sondern ergänzt.

Autoritative Konzept-Quelle: `docs/idea-concept/unifi_konzept_v2.md`.

---

## Getroffen

### 2026-04-24 — Primary-Datensatz

**PHM Society 2021 Europe Data Challenge — SCARA-Roboter (CSEM).**

Lokal unter `data/phm-society-2021/`. 143 Files, ~170 h Betrieb, 51 Sensor-Felder, Klassen-Labels (class_0 = gesund, class_2/3/4/5/7/9/11/12 = diverse Fehlertypen).

**Begründung:** einziger echter Industrieroboter-Datensatz in der gesamten Discovery mit eingebauter Zyklus-Semantik (`DurationPickToPick`) und direkt Roboter-semantischen Feldern (EPOSCurrent/Position/Velocity, FuseHeatSlope, Vacuum). Alle anderen Kandidaten (C-MAPSS, Bearings, Vision-Datasets) haben entweder kein Roboter-Narrativ oder fordern Pipeline-Infrastruktur außerhalb des 24-h-Scopes.

**Noch ausstehend:** Lizenz formal verifizieren vor Commit ins öffentliche Repo.

---

### 2026-04-24 — Architektur: zwei getrennte Modelle

**Wear-Rate-Modell (pricing-relevant, im MVP gebaut) + Anomaly Detection (konzeptionell, im MVP postponed).**

**Begründung:** saubere Trennung zwischen preisbarer Nutzung (Betriebsintensität → Verschleiß) und nicht-preisbaren Produkt-/Prozess-Defekten (Garantie-/SLA-Territorium). Vermischung wäre ökonomisch toxisch — Kunden dürfen nicht für Herstellerfehler zahlen. Anomaly Detection wird post-Hackathon ergänzt.

**Wear-Rate-Input:** Fenster-Features aus PHM SCARA (ca. 50 Dimensionen nach Aggregation). **Output:** kontinuierlicher Wear Rate Multiplier relativ zu Baseline. **Labels:** physikalisch motiviert — Basquin (Lastexponent), Arrhenius (Temperatur), Zyklusrate.

---

### 2026-04-24 — Use-Case-Frame: Logistik/E-Commerce mit variabler Paket-Last

**Nicht Produktion, sondern Pick-Roboter in Fulfillment-Centern.**

**Begründung:** rechtfertigt dynamisches Pay-per-Pick zwingend (Pakete sind mal 50 g, mal 12 kg — jeder Pick hat andere Motor-Last). Rechtfertigt ML-Modell (Kombination aus 50+ Features auf Wear Rate — händisch nicht modellierbar). Macht Live-Demo aussagekräftig (Cost-per-Pick-Tile tickt pro Pick anders). Stationäre Industriearme bleiben als PHM-SCARA-Beispiel bestehen — das Narrativ wird auf Logistik übertragen.

---

### 2026-04-24 — UCS-Agent: einfacher LLM-Function-Call

**Nicht Multi-Turn-Agent, keine Tool-Chains. Ein einziger LLM-Call mit Structured Output.**

**Begründung:** 24-h-Scope; Reliability vor Eleganz. Prompt enthält Ziel-UCS-Schema + fremde Spaltennamen + 5 Beispielwerte; Output ist JSON-Mapping `{fremd_feld → ucs_feld}` mit Confidence. User bestätigt in UI. Erwartete Implementierungs-Zeit: 2–3 h. Demo-zuverlässig, wenn Foreign-Datensatz sprechende Feldnamen hat.

---

### 2026-04-24 — Deal-Desk-Agent: voll narrativ LLM

**Nicht Preisrechner, sondern Narrator + Berater. Output ist strukturiertes Angebotsdokument mit Begründungen.**

**Begründung:** höchster Pitch-Wert; LLM-Stärken (Narrative, Kontext-Synthese, Unsicherheits-Verhandlung) werden genutzt. Agent bekommt Tools (Kosten-Engine, IFRS-16-Simulator) und erklärt Bilanz-Impact, schlägt Szenarien vor, nennt Pricing-Bandbreite. Rendering als Angebots-Ansicht im CFO-View, nicht als Chat-Blase.

**Konkretes Output-Schema noch offen** (siehe `open-questions.md`).

---

### 2026-04-24 — Video-basierte Roboter-Datasets: verworfen

**ViFailback, RoboFAC, Humanoid Everyday, ARMBench, Handover Failure, I-FailSense, EJUST-PdM-1 sind alle verworfen.**

**Begründung:** Vision-Pipeline im 24-h-Fenster nicht machbar; würde Tabular-Engine + Vision-Branch erfordern. Alle genannten sind Priorität 1 in Robotik-Nähe, aber inkompatibel mit MVP-Scope. Konzept-v2 ist bewusst Tabular-only.

---

### 2026-04-24 — Priorität-4-Datensätze: Backup statt primary-Kandidaten

**NASA C-MAPSS, N-CMAPSS, CARE Wind Turbine, MIMII, TCM Steel, Nigerian Energy: alle Backup.**

**Begründung:** Konzept-v2 baut auf dynamischer Motor-Last-Logik. Turbinen, Wind und generisch-industrielle Fault-Klassifikation passen nicht zum Logistik-Pick-Roboter-Narrativ. Bleiben nur als Notfall-Option, falls PHM SCARA lizenz-blockiert wäre.

---

### 2026-04-24 — Comprehensive Dynamic Stability (ABB/FANUC/KUKA/UR5): verworfen

**Begründung:** IEEE-DataPort-Subscription nötig für Download, und der Datensatz enthält nur statische Parameter pro Roboter, keine Zeitreihen. Damit ungeeignet als primary (keine Telemetrie) und auch nicht als Quelle für `mechanics.md` (Paywall).

---

### 2026-04-24 — Kitting Anomaly (Baxter): Backup statt primary

**Begründung:** 37 GB ROS-Bags + 3,1 GB Video, plus ROS-Bag-zu-CSV-Konvertierung. Zu teuer für 24 h. Bleibt als Notfall-Option, falls PHM SCARA ausfällt.

---

### 2026-04-24 — Anomaly Detection im MVP postponed

**Begründung:** der Bank-View-Drilldown wird im MVP mit SHAP-Feature-Importance des Wear-Rate-Modells bestückt. Das reicht, um „warum ist der Score so wie er ist?" zu erklären. Anomaly Detection (Autoencoder / One-Class auf class_0) bleibt in Konzept-v2 verankert für Post-Hackathon-Iteration.

---

### 2026-04-24 — Modell-Portabilität via dimensionsloser UCS-Features

**Das Wear-Rate-Modell wird auf dimensionslosen UCS-Features trainiert (`motor_load_ratio`, `cycle_intensity`, `temp_delta_normalized`), nicht auf rohen SCARA-Ampere-Werten.**

**Begründung:** Macht das einmalig trainierte Modell über Hersteller hinweg anwendbar. Sobald für einen fremden Roboter ein Datasheet-Äquivalent existiert (rated current/torque, rated cycle time, cost new, nominal picks lifetime), landen die normalisierten Features im gleichen Wertebereich wie die SCARA-Trainingsdaten. Fremder Stream wird durch dasselbe Modell gescored, ohne Re-Training. Das ist die technische Grundlage für das UCS-Versprechen. Siehe `unifi_konzept_v2.md` → „Datasheet als Normalisierungs-Basis und Modell-Portabilitäts-Enabler" und „Drop-in-Flow".

**Konsequenz für die Pipeline:** Trainings-Feature-Extraktor produziert normalisierte Größen vor dem Training. Inferenz-Pipeline nutzt denselben Extraktor mit roboter-spezifischem Datasheet als Kalibrierungsquelle.

---

### 2026-04-24 — UCS-Drop-in: Telemetrie + Datasheet als Doppel-Drop

**Der User droppt beim UCS-Onboarding zwei Dateien: Telemetrie-CSV und Datasheet (CSV/JSON/PDF-Extrakt). Der UCS-Agent mappt beide Schemata gegen das UCS-Zielschema.**

**Begründung:** Ohne Datasheet keine Normalisierung; ohne Normalisierung kann das vor-trainierte Modell den fremden Stream nicht scoren. Die Doppel-Drop-Geste macht den Onboarding-Flow vollständig und live vorführbar, ohne Magie im Hintergrund. In Produktion kommen Datasheet-Werte aus Hersteller-Katalog / Kunden-ERP; im Hackathon als JSON-Beilage.

**LLM-Call-Struktur:** zwei strukturierte Calls — einmal Telemetrie-Mapping, einmal Datasheet-Mapping. Beide mit eigenem Zielschema, Confidence und User-Bestätigungs-Step.

---

### 2026-04-24 — CFO-View-Demo-Mechanik: Hybrid-Streaming

**PHM-Historie läuft als Stream; Szenario-Slider skaliert Stream-Werte live (z.B. „Peak" × 1.5 auf EPOSCurrent, erhöhte Zyklusrate). Modifizierter Stream fließt durchs vor-trainierte Modell, Cost-per-Pick reagiert.**

**Begründung:** Verworfen wurden (A) reine Playback-Demo (Slider hätte keinen Effekt auf fixen Stream) und (B) reiner synthetischer Simulator (Werte wirken schnell unecht). Hybrid-Streaming behält realistische Werte aus echten PHM-Daten UND hat echten Modell-Effekt bei Slider-Änderung. Keine Live-Trainings-Logik, dafür deterministische Stream-Transformation + Modell-Inferenz.

**Konsequenz:** Backend braucht Stream-Modulator (multipliziert EPOSCurrent-Werte vor Modell-Input) und Event-Loop, die pro Pick einen neuen Wear-Rate-Multiplier berechnet und ans Frontend pusht.

---

## Noch zu entscheiden (Runde 2, vor Build)

- [ ] **Foreign-Datensatz:** AI4I 2020 vs. Microsoft Azure PdM. Aktuelle Neigung: AI4I (kleiner, semantischer, schneller zu handhaben). Entscheidung vor UCS-Demo-Implementierung.
- [ ] **Wear-Rate-Modelltyp:** LightGBM + SHAP vs. kleines NN + SHAP. Abhängig von Trainings-Zeit und SHAP-Integration — Entscheidung erst wenn Trainings-Pipeline existiert.
- [ ] **Label-Konstruktions-Formel:** konkrete Werte für Basquin-Exponent α (Vorschlag 2.5), Referenz-Temperatur T_ref (Vorschlag: Median `CpuTemperature.value` aus class_0), Zyklusrate-Gewichtung. Vor Training fixieren.
- [ ] **Robot Credit Score — Formel:** Gewichte für Wear Rate / Restwert / Cashflow, Normalisierung auf 0–1 oder Rating-Buchstaben.
- [ ] **IFRS-16-Simulator:** deterministische Python-Funktion oder LLM-Narrative im Deal-Desk-Agent (Tools-Aufruf).
- [ ] **Deal-Desk-Output-Schema:** konkrete Felder des strukturierten Angebots (Header, Pricing-Range, Bilanz-Impact, Covenant-Erklärung, Klauseln).
- [ ] **PHM-SCARA-Lizenz:** formal bestätigen; entscheidet ob lokaler Commit oder nur Download-Instruktion.
