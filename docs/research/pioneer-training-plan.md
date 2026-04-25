# Pioneer Training Plan — Datasheet-Field-Extraction

**Zweck:** Konkreter Plan, wie wir mit Pioneer (Fastino Labs) ein GLiNER-Modell auf Roboter-Datasheet-Field-Extraction fine-tunen — Aufwand, Trainingsdaten, Evaluation, Deployment, Fallbacks.

**Stand:** 2026-04-25. Voraussetzung gelesen: [`datasheet-data-and-finance.md`](./datasheet-data-and-finance.md) (Schema + Synonym-Tabellen).

---

## 1. Was ist Pioneer + GLiNER

- **Pioneer** ist ein Agent-System von **Fastino Labs**, gelauncht 2026-04-21, für Fine-tuning + Inferenz von kleinen Open-Source-Modellen (Qwen, Gemma, Llama, Nemotron, **GLiNER**). Der Agent generiert synthetic training data, wählt Hyperparameter, trainiert und evaluiert in einem No-Code-Single-Prompt-Workflow.
- **GLiNER** = „Generalist and Lightweight Named Entity Recognizer". Information-Extraction-Modell mit Schema-basierten Labels. Klein (~50M–300M Parameter), CPU-tauglich, Sub-Sekunden-Inferenz. **GLiNER2** (von Fastino) erweitert das Original um vollwertige Schema-based Information Extraction (nicht nur NER, sondern Pydantic-artige Strukturen).
- Quellen: [pioneer.ai](https://pioneer.ai), [github.com/fastino-ai/GLiNER2](https://github.com/fastino-ai/GLiNER2), [huggingface.co/fastino](https://huggingface.co/fastino), PR-Newswire-Launch-Release.

---

## 2. Warum Pioneer/GLiNER für Datasheet-Extraction passt

### Fit der Aufgabe

Datasheet-Field-Extraction ist ein **klassischer GLiNER-Use-Case**:
- Strukturierter Text mit definierten Feldern (Payload, Reach, Mass, Repeatability, …).
- Heterogenes Layout pro Hersteller (UR-Reseller-PDF: 6 Felder textuell; FANUC-OEM-Tabelle: 15+ Felder spaltenförmig).
- Ziel-Output: kanonisches JSON gegen ein festes Schema (`UcsDatasheet` aus Doc 1).
- Kein generatives Reasoning nötig — pure Span-Extraction + Unit-Mapping.

### Vorteile vs. Claude API

| Aspekt | Claude API | Pioneer/GLiNER fine-tuned |
|---|---|---|
| Genauigkeit auf In-Domain-Daten | gut, generell | besser nach Fine-tuning |
| Latenz | API-Roundtrip 1–3s | <500ms lokal |
| Kosten pro Inference | ~0,01–0,05 € | quasi gratis |
| Pitch-Story | „LLM-Wrapper" | **„eigenes Modell, Network-Effect, Visa-Analogie technisch belegt"** |
| Setup-Aufwand | minimal | **mittel (Daten + Training)** |
| Risiko Hackathon-Fenster | sehr niedrig | mittel (Training kann scheitern) |
| Geht offline | nein | ja |

### Strategischer Wert

Die UNIFI-Pitch-These ist: **„Jedes neue Datasheet macht den UCS-Standard präziser."** Das ist mit Claude API nicht belegbar — Claude wird nicht besser, weil mehr UNIFI-Kunden Datasheets droppen. Mit einem eigenen GLiNER-Modell **wird** es besser. Das ist der Unterschied zwischen „LLM-Tool gebaut" und „Network-Effect-Modell gebaut".

### Risiken (siehe Abschnitt 9 für Fallbacks)

- Trainingsdaten-Aufwand: 30–50 gelabelte Datasheets sind nicht trivial.
- Pioneer ist neu (April 2026): Pricing, Latenz, Quality-of-Service unbekannt.
- Generalisierung auf nicht gesehene Hersteller (ABB, KUKA) ist nicht garantiert.

---

## 3. Training-Set-Plan

### 3.1 Ziel-Felder (NER-Labels)

Aus Doc 1 Abschnitt 4 (was tatsächlich in Datasheets steht): **8 Pflicht-Labels + 4 Optional-Labels**.

**Pflicht-Labels (Akzeptanz ≥85% Accuracy):**
1. `model` — z.B. „UR5", „SR-3iA"
2. `manufacturer` — z.B. „Universal Robots", „FANUC"
3. `rated_payload_kg` — Zahl + Einheit
4. `weight_kg` — Zahl + Einheit
5. `reach_mm` — Zahl + Einheit
6. `dof` — Integer (Achsen-Anzahl)
7. `repeatability_mm` — Zahl + Einheit (kann auch ° für SCARA-J4 sein)
8. `power_consumption_w` — Zahl + Einheit (W oder kVA, beides labeln)

**Optional-Labels (nice-to-have, nicht akzeptanz-kritisch):**
9. `motion_speed_per_joint` — strukturierter Text
10. `motion_range_per_joint` — strukturierter Text
11. `push_force_n` — FANUC-spezifisch
12. `ip_rating` — Schutzklasse (IP20, IP54)

**Bewusst NICHT trainiert:** `cost_new_eur`, `nominal_picks_lifetime`, `rated_current_a`, `rated_cycle_time_s`, `maintenance_cost_pct_per_year`, `nominal_duty_cycle`. Diese stehen in Datasheets nicht (siehe Doc 1 Abschnitt 4) — sie kommen aus Reseller-Catalog / Klasse-Defaults.

### 3.2 Datasheet-Beschaffung (User-Vorgabe: UR + FANUC)

**Universal Robots (Ziel: 12–15 PDFs):**
- UR3, UR3e, UR5, UR5e, UR10, UR10e, UR16e, UR20 — je 1–2 Datasheet-Versionen (OEM von ur.com + Reseller).
- **Schon lokal:** UR5 von T.I.E. (Reseller-Stil, knapp).

**FANUC (Ziel: 15–20 PDFs):**
- SR-Serie: SR-3iA, SR-6iA, SR-12iA (SCARA).
- LR Mate: 200iD/4S, 200iD/7L, 200iD/14L (kompakte Industrial).
- CRX-Serie: CRX-5iA, CRX-10iA, CRX-10iA/L, CRX-25iA (Cobot).
- M-Serie: M-10iD/12, M-20iD/25 (mittlere Industrial).
- **Schon lokal:** SR-3iA (OEM, Tabellen-Stil).

**Hold-out für Generalisierungs-Test (Ziel: 5–8 PDFs):**
- ABB IRB 1200, IRB 1300 (Industrial).
- KUKA KR 6 R900, KR 10 R1100 (Industrial).
- Yaskawa GP7, GP8 (Industrial).

**Beschaffung:** Hersteller-Webseiten, alle PDF-Downloads ohne Auth. Geschätzter Aufwand: 1h.

**Storage:** `data/datasheets/{manufacturer}/{model}.pdf` — gitignored wie der Rest von `data/`. Erweitert um `data/datasheets/labels/{manufacturer}-{model}.json` für die gelabelten Spans.

### 3.3 Sample-Größe-Begründung

GLiNER-Fine-tuning braucht typisch 50–200 Beispiele pro Label für solide Performance. Bei 30 Datasheets × ~6 Labels pro Datasheet = ~180 Spans pro Label im Median. Das ist **am unteren Ende** des Komfortbereichs — Pioneer's synthetic-data-augmentation soll dieses Defizit füllen.

---

## 4. Labeling-Methodik

### 4.1 Bootstrap-Strategie (Aufwand minimieren)

Manuelles Labeling von 30 Datasheets würde ~10 min × 30 = 5h dauern — zu viel im Hackathon-Fenster. Stattdessen Bootstrap:

1. **Step 1 — PDF→Text:** PyMuPDF (`pymupdf` package) extrahiert Text aus PDF. Output: pro PDF eine Plaintext-Datei. Aufwand: ~10 LOC + 5 min.

2. **Step 2 — Claude pre-labelt:** Claude (Sonnet 4.6 mit Pydantic-Structured-Output) bekommt Plaintext + UcsDatasheet-Schema, gibt JSON zurück mit Spans (`{label, start, end, text, value}`). Aufwand: ~50 LOC + 1h Prompt-Iteration.

3. **Step 3 — Human Review:** Eine simple Streamlit/HTML-UI zeigt PDF-Text + Claude-Vorschläge nebeneinander. User klickt „bestätigen" oder editiert. Geschätzt 2–3 min pro Datasheet bei guter Initial-Quality. Aufwand: ~150 LOC für UI + 30 × 3 min = 90 min Review-Zeit.

4. **Step 4 — Format-Konversion zu GLiNER-Training-Format:**
   ```json
   {
     "tokenized_text": ["Universal", "Robots", "UR5", "Payload", ":", "5", "kg", ...],
     "ner": [
       [0, 1, "manufacturer"],     // "Universal Robots"
       [2, 2, "model"],            // "UR5"
       [5, 6, "rated_payload_kg"]  // "5 kg"
     ]
   }
   ```
   Konversion: Claude-Spans (Char-Indices) → GLiNER-Spans (Token-Indices). Aufwand: ~30 LOC.

**Gesamt-Aufwand Labeling: ~5h** (3h Tooling + 90min Review + Buffer).

### 4.2 Edge-Cases beim Labeling

- **Multi-Modell-Tabellen** (FANUC-Stil: eine Tabelle, mehrere Modelle pro Zeile) — entweder pro Zeile als separates Beispiel labeln, oder die ganze Tabelle als ein Beispiel mit Labels die explizit Reihen referenzieren. **Empfehlung:** pro Zeile ein Beispiel — einfacher.
- **Numerische Werte mit Einheit** — `5 kg` als ein Span labeln, nicht `5` und `kg` getrennt. Doc 1 Pipeline parst Zahl + Einheit nachgelagert.
- **Per-Joint-Werte** (FANUC: J1=±142°, J2=±145°) — als zusammengesetztes Span `motion_range_per_joint` labeln, der Pipeline-Parser zerlegt nachgelagert in dict.
- **Bilder/Diagramme** — von PyMuPDF nicht extrahiert. Felder die nur als Bild im PDF stehen (z.B. Workspace-Diagramm) werden ignoriert. Verifiziert durch Self-Check (Doc 1 Abschnitt 4): keine UCS-Pflichtfelder sind nur in Bildern.
- **Reseller-PDFs vs. OEM-PDFs** — Reseller (z.B. T.I.E. UR5) typisch knapper und marketing-text-lastig. Beide Stile müssen im Training-Set vertreten sein.

---

## 5. Fine-tuning-Workflow

### 5.1 Pioneer Agent Mode (Primary-Pfad)

Pioneer ist als „No-Code"-Agent designed (siehe pioneer.ai). Erwarteter Workflow:

1. **Account anlegen** auf pioneer.ai. Pricing prüfen — wenn kostenpflichtig und über Hackathon-Budget: zu manuellem Pfad wechseln.
2. **Training-Daten upload** im Pioneer-erwarteten Format (vermutlich JSONL mit Spans, exakter Format aus Pioneer-Docs zu entnehmen).
3. **Single-Prompt** an den Agenten:
   > „Fine-tune GLiNER2-medium on this dataset for robot datasheet field extraction. Labels: model, manufacturer, rated_payload_kg, weight_kg, reach_mm, dof, repeatability_mm, power_consumption_w. Use 80/20 train-eval split. Apply synthetic data augmentation. Report per-label F1 on eval set. Export final model checkpoint."
4. **Pioneer Agent macht autonom:** Hyperparameter-Search, Synthetic-Data-Generation, Training, Eval. Erwartete Laufzeit: 1–3h.
5. **Modell-Artefakt downloaden** (Hugging Face Push oder direkter Export).

**Falls Pioneer keinen Agent-Mode für Custom-Datasets hat (nur für gelistete Tasks):** zu manuellem Pfad.

### 5.2 Manueller Pfad (Backup)

Wenn Pioneer nicht praktikabel:

1. `git clone https://github.com/fastino-ai/GLiNER2`
2. Training-Skript anpassen auf custom dataset (`gliner.train(data, base_model="urchade/gliner_medium-v2.1")`)
3. Training auf lokaler GPU (Mac M-series via MLX-Equivalent, oder Cloud — RunPod, Modal). Erwartete Laufzeit: 30 min–2h auf einer A100.
4. Eval-Skript pro Label.

**Aufwand-Differenz:** Manueller Pfad +2h vs. Pioneer-Pfad — vorausgesetzt Pioneer funktioniert wie versprochen.

### 5.3 Base-Modell-Wahl

| Modell | Größe | Inferenz-Latenz | Erwartete Quality |
|---|---|---|---|
| `gliner_small-v2.1` | 50M | <100ms CPU | gut für klare Struktur |
| `gliner_medium-v2.1` | 200M | ~300ms CPU | sehr gut, **Default** |
| `gliner_large-v2.1` | 500M | ~1s CPU | best, aber zu groß für CPU-Demo |
| `GLiNER2-fastino` | varies | varies | Fastino's Schema-IE-Erweiterung — wenn Pipeline strukturierte Outputs braucht |

**Empfehlung:** Start mit `gliner_medium-v2.1`. Wenn Performance gut genug → bleiben. Wenn zu schwach → zu `gliner_large` wechseln.

---

## 6. Evaluation

### 6.1 Hold-out-Strategie

- **In-Distribution Eval (Standard):** 20% der UR + FANUC Datasheets (~6 PDFs). Misst Performance auf dem Verteilungstyp, auf dem trainiert wurde.
- **Out-of-Distribution Eval (Generalisierung):** 5–8 ABB/KUKA/Yaskawa-PDFs, die das Modell nie gesehen hat. Misst, ob das Modell auf neuen Herstellern lernt — kritisch für die „Network-Effect"-Pitch-Story.

### 6.2 Metriken pro Label

```python
# Pro Label berechnet
extraction_accuracy = correctly_extracted / total_present     # binär: gefunden + korrekter Span
recall              = correctly_extracted / total_present      # wieviel % der vorhandenen Felder
precision           = correctly_extracted / total_extracted    # wieviel % der Extraktionen sind korrekt
f1                  = 2 × p × r / (p + r)
numerical_accuracy  = sum(|extracted - truth| / truth ≤ 0.05) / total_with_value  # ±5% Toleranz für Floats
```

### 6.3 Akzeptanzkriterien

| Kategorie | Kriterium |
|---|---|
| **Pflicht-Labels (8)** | F1 ≥ 0.85 auf In-Distribution |
| **Pflicht-Labels (8)** | F1 ≥ 0.70 auf Out-of-Distribution (Generalisierung) |
| **Optional-Labels (4)** | F1 ≥ 0.60 (best effort) |
| **Numerical Accuracy** | ≥90% innerhalb ±5% bei `rated_payload_kg`, `weight_kg`, `reach_mm` |
| **Vergleich vs. Claude-Baseline** | Pioneer-Modell ≥ Claude oder innerhalb 5% F1 |

Wenn diese Schwellen erreicht sind → Modell wird im Demo-Flow benutzt. Wenn nicht → Fallback auf Claude API (Abschnitt 9).

---

## 7. Deployment in UCS-Pipeline

### 7.1 Wo das Modell sitzt

Datasheet-PDF-Upload-Flow (ersetzt den im Konzept v2 Z. 281 handgewinkten Schritt „User droppt Datasheet als CSV/JSON/PDF-Extrakt"):

```
Frontend (Next.js)
    ↓ PDF upload
Backend (FastAPI, apps/backend/src/extraction/)
    ↓ pymupdf extracts text
GLiNER fine-tuned model (loaded once at startup)
    ↓ extracts spans
Span-to-Field-Parser (Zahl + Einheit aus Span)
    ↓ structured dict
Class-Default-Filler (für Felder die nicht im PDF stehen)
    ↓ vollständiger UcsDatasheet
Pydantic Validation (Range-Checks aus Doc 1 Abschnitt 5)
    ↓ valid UcsDatasheet
Frontend zeigt Bestätigungs-UI
    ↓ User confirms / edits
Persistiert + fließt in Cost-per-Pick-Engine
```

### 7.2 Konkrete Module

- `apps/backend/src/extraction/pdf_text.py` — PyMuPDF-Wrapper.
- `apps/backend/src/extraction/gliner_extractor.py` — Modell-Loading + Inferenz.
- `apps/backend/src/extraction/parser.py` — Span → typed value (Zahl + Einheit-Konvertierung).
- `apps/backend/src/extraction/defaults.py` — Class-Heuristik + Klasse-Defaults aus Doc 1 Tabelle 3.3.
- `apps/backend/src/schemas/ucs_datasheet.py` — Pydantic `UcsDatasheet` aus Doc 1 Abschnitt 5.3.

### 7.3 Bestätigungs-UI (im Frontend)

Aus Konzept v2 Z. 306 vorgesehen — bleibt prominenter Teil des Flows. Layout:

| Feld | Auto-extrahierter Wert | Source | Confidence | User-Aktion |
|---|---|---|---|---|
| model | UR5 | datasheet | 0.98 | ✓ |
| manufacturer | Universal Robots | datasheet | 0.96 | ✓ |
| rated_payload_kg | 5,0 | datasheet | 0.94 | ✓ |
| **cost_new_eur** | **35.000** | **reseller-catalog** | n/a | [edit] |
| **rated_current_a** | **6,0** | **default (Cobot)** | n/a | [edit] |

Auto-extrahierte Felder (Source = `datasheet`) zeigen GLiNER-Confidence. Default/Reseller-Felder sind editierbar mit Verweis auf die Source.

---

## 8. Aufwand + Timeline

| Schritt | Aufwand | Voraussetzung |
|---|---|---|
| 1. Datensammlung (PDFs runterladen) | 1h | — |
| 2. PDF→Text + Claude-Pre-Labeling-Skript | 2h | — |
| 3. Manuelles Review der gelabelten Datasheets | 1,5h | Step 2 |
| 4. Format-Konversion zu GLiNER-Training-Format | 0,5h | Step 3 |
| 5. Pioneer-Setup + Training | 1–3h | Step 4 |
| 6. Evaluation + ggfs. Iteration | 2–3h | Step 5 |
| 7. Backend-Integration (PDF-Upload-Endpoint, GLiNER-Loader) | 2h | Step 5 (Modell-Artefakt) |
| 8. Frontend Bestätigungs-UI | 2h | Step 7 |
| **Gesamt** | **12–15h** | — |

Realistisch über 2 Tage verteilt, mit 1–2 anderen Personen die parallel an UI, Data-Pipeline und Wear-Rate-Modell arbeiten.

**Frühe Schritte (Datensammlung + Bootstrap-Labeling)** können vor dem eigentlichen Hackathon-Fenster gemacht werden — das senkt das Risiko deutlich.

---

## 9. Risiken und Fallbacks

### 9.1 Pioneer nicht verfügbar / zu teuer / zu langsam

**Symptom:** Pioneer-Account-Setup braucht Auth wir nicht haben, oder Pricing > 50€, oder Training-Latenz > 8h.

**Fallback:** Manueller GLiNER2-Pfad via Hugging Face (Abschnitt 5.2). +2h Aufwand, aber voll kontrolliert.

### 9.2 GLiNER nach Training nicht gut genug

**Symptom:** F1 < 0.70 auf In-Distribution oder < 0.50 auf Out-of-Distribution.

**Fallback A:** Größeres Modell (`gliner_large-v2.1`) probieren. +1h.

**Fallback B:** Claude API mit Pydantic-Schema (zero training, 2h Implementation). Verliert die „eigenes Modell"-Pitch-Story, aber Demo läuft trotzdem.

**Fallback C (Hybrid):** GLiNER für die einfachen Felder (model, manufacturer, payload, weight), Claude für komplexere (per-joint-data). Best of both worlds, +2h Coordination.

### 9.3 Datasheets zu heterogen — kein Universal-Modell

**Symptom:** Modell funktioniert auf UR, scheitert auf FANUC (oder umgekehrt).

**Fallback:** Per-Hersteller-Sub-Modelle. Hersteller-Erkennung aus Logo/Header → spezifisches Sub-Modell. +3h, aber robuster.

### 9.4 PyMuPDF extrahiert manche Layouts schlecht

**Symptom:** Tabellen-PDFs (FANUC-Stil) verlieren Spalten-Struktur beim Text-Extract.

**Fallback A:** `pdfplumber` für Tabellen-Erkennung als Pre-Processor.

**Fallback B:** OCR (Tesseract) für gescannte PDFs.

**Fallback C:** Claude mit Vision (PDF als Bild) — funktioniert immer, aber langsamer + teurer.

### 9.5 Cost_new_eur und nominal_picks_lifetime nicht verfügbar

**Schon im Plan adressiert:** GLiNER extrahiert nur was im PDF steht, Reseller-Catalog + Class-Defaults füllen den Rest. **Keine Fallback nötig — das ist by design.**

---

## 10. Erfolgskriterium für den Pitch

**Live-Demo-Anforderung:** User droppt UR5- oder FANUC-Datasheet im Frontend → GLiNER extrahiert in <500ms → Cost-per-Pick rechnet live → Bühne <30 Sekunden.

**Pitch-Narrative (aus core-concept.md Z. 11 weiterentwickelt):**

> „Wir haben unser eigenes Datasheet-Extraction-Modell auf 30+ Hersteller-Datasheets fine-getunt. Jeder neue Hersteller, der UNIFI nutzt, fügt sein Datasheet zum Training-Pool hinzu — und macht den UCS-Standard für alle anderen präziser. Das ist die technische Substanz hinter der Visa-Analogie: ein Netzwerk-Effekt-Modell, kein API-Wrapper."

---

## 11. Konkrete Next Actions

1. **Vor Hackathon-Tag 1:** PDFs runterladen (UR + FANUC + Hold-out, Ziel: 35–45 PDFs in `data/datasheets/`).
2. **Vor Hackathon-Tag 1:** PDF→Text-Skript + Claude-Pre-Labeling-Skript schreiben (~2h, kann der CI-Agent oder eine Person nebenbei machen).
3. **Hackathon-Tag 1 morgens:** Manuelles Review der gelabelten Datasheets (~1,5h).
4. **Hackathon-Tag 1 mittags:** Pioneer-Account anlegen, Format-Konversion, Training starten.
5. **Hackathon-Tag 1 abends:** Eval-Run, Modell-Artefakt sichern.
6. **Hackathon-Tag 2:** Backend-Integration + Frontend-UI + End-to-End-Test mit echtem PDF auf der Bühne.

---

## 12. Quellen

- [pioneer.ai](https://pioneer.ai) — Hauptseite
- [github.com/fastino-ai/GLiNER2](https://github.com/fastino-ai/GLiNER2) — Modell-Code, Training-Format
- [huggingface.co/fastino](https://huggingface.co/fastino) — Modell-Artefakte
- PR Newswire: „Fastino Launches Pioneer", 2026-04-21 — Pioneer Capabilities
- [`datasheet-data-and-finance.md`](./datasheet-data-and-finance.md) — Schema, Synonyme, Defaults (Voraussetzung für diesen Plan)
- `docs/idea-concept/unifi_konzept_v2.md` — Z. 275–297 (UCS-Agent — was Pioneer ersetzt), Z. 300–314 (Drop-in-Flow — wo Pioneer einspringt)
- `docs/research/decisions.md` — Z. 59 ff. (UCS-Agent-Design — muss um Pioneer-Entscheidung ergänzt werden)
- `docs/core-concept.md` Z. 11 — Network-Effect / Fine-tuning-These (wird hier konkret umgesetzt)
