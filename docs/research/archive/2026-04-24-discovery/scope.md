# Research Scope — Daten-Fundament für UNIFI-Prototyp

Stand: 2026-04-24 *(nach Konzept-v2 aktualisiert — siehe `docs/idea-concept/unifi_konzept_v2.md`)*

## Ziel

In 24 Stunden einen Prototyp bauen, der Roboter-Telemetrie in Finanzdaten übersetzt. Dieser Research-Schritt klärt die **Datenbasis**, bevor eine Zeile Code geschrieben wird. Alles, was hier nicht entschieden ist, wird im Build zum Blocker.

**Architektur laut Konzept-v2:** dynamisches **Wear-Rate-Modell** (pricing-relevant, im MVP gebaut) + **Anomaly Detection** (konzeptionell verankert, im MVP postponed). Labels sind physikalisch motiviert (Basquin / Arrhenius / Zyklusrate), **keine** klassische RUL-Regression. Primary-Datensatz ist **entschieden**: PHM Society 2021 SCARA (CSEM), lokal unter `data/phm-society-2021/`. Die verbleibende Datensuche fokussiert damit auf **Foreign-Datensatz für UCS-Demo**, **Hersteller-Normalisierungskonstanten** und **Finanz-Konstanten**.

## Drei parallele Arbeitsfelder

### 1. Wear-Rate-Trainingsdaten & Foreign-Datensatz *(Primary entschieden)*

**Primary: PHM Society 2021 SCARA** — lokal vorhanden, ~143 Files, ~170 h Betrieb, 51 Sensor-Felder. Details siehe `datasets.md`. Keine weitere primary-Suche mehr.

**Offene Suche: Foreign-Datensatz** für die UCS-Live-Demo (LLM-Function-Call mappt fremdes Schema auf kanonisches UCS-Schema).

**Bewertungskriterien für Foreign-Kandidaten** (revidiert gegenüber v1):

| Kriterium                          | Warum wichtig                                                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Lizenz                             | muss Demo/Pitch erlauben                                                                                       |
| **LLM-mappbare Feldnamen**         | UCS-Agent ist ein einzelner LLM-Function-Call — sprechende Spaltennamen machen Mapping demo-zuverlässig        |
| **Sichtbar andere Struktur als PHM SCARA** | der „Aha"-Moment entsteht durch Schema-Kontrast, nicht durch Ähnlichkeit                                       |
| Motor-/Last-/Prozess-Signale       | optional, aber Felder mit Wear-Rate-Input-Analog (Torque, Current, Temperature) werten die Demo auf            |
| Größe/Handling                     | klein reicht — wir trainieren nicht auf dem Foreign, wir mappen ihn nur                                        |
| **Kein Vision-Datensatz**          | Vision-Pipeline ist nicht im Scope                                                                              |

**Nicht mehr Pflichtkriterium:** RUL-Labels. Das Wear-Rate-Modell lernt keinen RUL direkt; RUL wird aus kumulierter Wear Rate abgeleitet. Robotik-Nähe ist beim Foreign weniger wichtig als beim primary — ein **nicht-Roboter**-Datensatz stärkt die „funktioniert industrieübergreifend"-Story.

**Fokus-Kandidaten für Foreign** (Entscheidung in `decisions.md` fixieren):
- **AI4I 2020** (UCI) — `Torque`, `Rotational speed`, `Tool wear`, `Air temperature`, `Process temperature`. Ideal LLM-mappbar.
- **Microsoft Azure Predictive Maintenance** — `volt`, `rotate`, `pressure`, `vibration`. Fleet-Setup, auch LLM-mappbar.

**Verworfen:**
- Vision-Datensätze (ViFailback, RoboFAC, Humanoid Everyday, ARMBench) — Vision-Pipeline nicht im Scope.
- C-MAPSS / N-CMAPSS als primary — Turbofan-Framing passt nicht zum Motor-Last-Logistik-Narrativ. Bleiben nur als Notfall-Backup.
- Comprehensive Dynamic Stability (ABB/FANUC/KUKA/UR5) — IEEE-DataPort-Subscription + keine Zeitreihen.
- CASPER — Identität unklar, nicht weiter verfolgt.
- Kitting Anomaly — 37 GB + ROS-Bag-Preprocessing zu teuer.

Details zu allen verworfenen Kandidaten stehen in `datasets.md`.

#### Evaluation-Template (verbindlich für jeden Kandidaten in `datasets.md`)

Jeder Datensatz wird mit **genau diesem Schema** dokumentiert — gleiche Reihenfolge, gleiche Überschriften. Das erlaubt Nebeneinanderlegen und schnelles Aussortieren. Leere Felder sind erlaubt, aber **nicht weglassen** (`tbd` / `n/a` schreiben).

Platzhalter (in geschweiften Klammern) werden beim Ausfüllen durch die konkreten Werte ersetzt:

```markdown
### {Datensatz-Name}

- **Status:** seed | prüfen | verworfen | shortlist | gewählt (primary | foreign)
- **Quelle / Link:** {autoritative URL}
- **Version / Stand:** {z.B. "v2 (2022)"}
- **Lizenz:** {Name + 1-Satz-Bedeutung, z.B. "CC-BY 4.0 — Demo + Re-Distribution erlaubt, Namensnennung"}
- **Format & Größe:** {CSV/Parquet/HDF5/…, MB/GB, Anzahl Rows, Anzahl Entitäten}

**Was ist drin**
- Entitäten: {z.B. "100 simulierte Turbofan-Runs"}
- Zeit-/Zyklusachse: {Einheit + Range}
- Sensor-Felder: {Liste mit Einheiten, so weit bekannt}
- Labels: {RUL kontinuierlich? Binär-Failure? gar nicht?}
- Metadaten: {Modelltyp, Betriebsbedingungen, Fehlermoden}

**Was fehlt** *(gemessen am UNIFI-Idealbild)*
- {z.B. "keine Roboter-Kontextdaten (Payload, Duty Cycle)"}
- {z.B. "keine Timestamps, nur Zyklus-Index"}

**Pros für UNIFI**
- {konkret auf unser Vorhaben bezogen — was gewinnen wir?}

**Cons / Risiken**
- {Narrative-Gap, Lizenz-Unsicherheit, hoher Preprocessing-Aufwand, fehlende Modell-Bekanntheit, …}

**UCS-Mapping-Skizze**

| Quellfeld | → UCS-Feld | Konvertierung |
|---|---|---|
| `sensor_12` | `vibration_rms` | Rohwert, keine Skalierung |
| … | … | … |

**Rolle-Kandidat:** primary | foreign | beides möglich | keiner der beiden
**Aufwand bis nutzbar:** {h-Schätzung von Download bis "läuft durch die Pipeline"}
**Offene Fragen:** {1–3 pointierte Fragen, kommen auch in `open-questions.md`}

**Kriterien-Score** *(1 = schwach, 2 = ok, 3 = stark; bei tbd → `?`)*

| Kriterium | Score | Kommentar |
|---|---|---|
| Lizenz | ? | |
| RUL-Labels | ? | |
| Sensor-Felder | ? | |
| Mapping-Distanz zu UCS | ? | |
| Robotik-Nähe | ? | |
| Größe/Handling | ? | |
| UCS-Demo-Tauglichkeit | ? | |
| **Summe** | **?/21** | |
```

Regeln:

- **Ein Datensatz pro H3-Block.** Keine Sammelabschnitte.
- **Kein Kandidat ohne Score-Tabelle** verlässt den `prüfen`-Status.
- **Verworfene Datensätze nicht löschen** — Status auf `verworfen` setzen und 1 Satz Begründung in den Kommentar. Das spart uns später das zweite Mal-Überlegen.
- **Vergleichs-Übersicht** am Anfang von `datasets.md` als Tabelle (Name · Status · Rolle · Summen-Score · Kernrisiko) — wird nach jedem Kandidaten-Update aktualisiert.

### 2. Hersteller-Normalisierungskonstanten *(pro Roboter-Modell)*

**Präzisierung laut Konzept-v2:** Datasheets liefern **Normalisierungs-Basis**, keine statischen Wear-Multiplier. Der Wear-Rate-Multiplier wird dynamisch aus Telemetrie gelernt, nicht aus Datenblättern abgeleitet. Das macht den Algorithmus modellagnostisch.

**Minimal-Schema pro Roboter-Modell (aktualisiert):**

```json
{
  "model": "CSEM SCARA Sicherungs-Sorter",
  "manufacturer": "CSEM",
  "cost_new_eur": 120000,
  "nominal_picks_lifetime": 50000000,
  "rated_current_a": 3.5,
  "rated_cycle_time_s": 2.5,
  "nominal_duty_cycle": 0.8,
  "source": "Hersteller-Datasheet / plausibler Schätzwert"
}
```

Diese Werte fließen als Normalisierung in Modell-Input (`EPOSCurrent.vMax / rated_current_a`), in die Kapital-Komponente der Kosten-Engine und in die Abschreibungskurve für den Restwert.

**Suchfokus (revidiert):**
- Hersteller-Datasheets (UR, FANUC, ABB, KUKA, Yaskawa, Neura, Agile Robots) — Fokus auf Nennlast, Nennstrom, Neupreis, nominale Lebensdauer in Picks/Zyklen
- MTBF-Angaben sind **sekundär** — wir brauchen keine Ausfallzeit-Schätzung, weil wir den Verschleiß live aus Telemetrie rechnen
- Neupreis-Ranges für Abschreibungskurve
- Öffentliche Robotik-TCO-Studien als Plausibilitäts-Check

**Fallback:** Für das MVP reicht **ein** schlankes synthetisches CSEM-SCARA-Profil plus 2–3 plausible Alternativ-Modelle (für Flotten-Demo im Bank-View). Transparent im Pitch als Hackathon-Vereinfachung markiert. Kein `wear_multiplier` — der kommt aus dem Modell.

### 3. Finanz-Referenzdaten *(Priorität 3 — macht Zahlen realistisch)*

Keine Zeitreihen, eher Konstanten und Benchmarks, damit Cost-per-Pick und Restwert plausible Größenordnungen haben.

**Gesucht:**

- Industrie-Strompreis DE 2025/2026 (€/kWh)
- Typische Wartungskosten Industrieroboter (% vom Neupreis p.a.)
- Typische Finanzierungszinsen für Equipment-Leasing DE
- IFRS-16-Beispielrechnungen (Covenant-Impact) — idealerweise aus öffentlicher Berichterstattung
- RaaS-Marktpreise Pay-per-Pick (falls publik)
- Restwert-/Abschreibungskurven für Industrie-Equipment

## Robotik-Priorität (Hierarchie — nur noch historischer Kontext)

Die Priorität-Hierarchie aus der Discovery-Phase bleibt dokumentiert, ist aber nach Konzept-v2 **nicht mehr aktiv**: Primary ist mit PHM SCARA entschieden, für den Foreign gelten andere Kriterien (siehe oben, insbesondere LLM-Mappbarkeit und Schema-Kontrast).

1. **Roboter + PHM-Labels** — PHM SCARA erfüllt das (Klassen-Labels, echte SCARA-Telemetrie).
2. **Roboter + rohe Telemetrie** — nicht mehr relevant.
3. **Roboter-angrenzend** (Lager, Servomotoren, CNC-Spindeln) — nicht mehr relevant.
4. **Generisch industriell** (Turbinen, Pumpen, Fans) — **als Foreign-Kandidat explizit erwünscht**, weil Schema-Kontrast zu SCARA stark und LLM-mappbar (AI4I, Azure PdM).

## Vorgehen

**Runde 1 — Discovery (2026-04-24, abgeschlossen).** 4 parallele Explore-Agents haben 13+ Datensatzquellen durchsucht. Ergebnis konsolidiert in `datasets.md`. Primary-Wahl PHM SCARA lokal verifiziert.

**Runde 2 — Evaluation (aktuell).**
1. Foreign-Datensatz verifizieren und in `decisions.md` festschreiben (AI4I vs. Azure PdM).
2. PHM-SCARA-Evaluation-Block in `datasets.md` ist bereits gesetzt; noch ausstehend: formale Lizenz-Verifikation.
3. Hersteller-Konstanten in `mechanics.md` auffüllen (mindestens CSEM-SCARA-Profil + 2–3 Alternativ-Modelle für Flotten-Demo).
4. Finanz-Konstanten in `financials.md` auffüllen (Strompreis, Wartung, Zinsen, Abschreibung).
5. Label-Konstruktionsformel (physikalisch motiviert) in `decisions.md` fixieren, bevor Training startet.

**Runde 3 — Implementierung** (Hackathon-Tag).
- Kein Teil dieses Research-Scopes; wird in `apps/backend/` und `apps/frontend/` umgesetzt.

## Scope-Grenzen (bewusst nicht in dieser Phase)

- Kein Modelltraining, kein Feature-Engineering — kommt im Build-Schritt.
- Keine UI-Entscheidungen — CFO-View und Bank-View sind in `unifi_konzept_v2.md` festgelegt.
- Keine Live-Integration mit Herstellern/APIs — der Prototyp läuft auf statischen Datensätzen plus Replay.
- Kein echter IFRS-16-Simulator — vereinfachte Formel reicht (oder LLM-Narrative als Teil des Deal-Desk-Agent, Entscheidung offen in `open-questions.md`).
- **Keine Anomaly Detection im MVP** — konzeptionell dokumentiert, im 24-h-Scope postponed.
- **Keine Vision-Pipeline** — entfällt endgültig; alle Vision-basierten Datensätze sind in `datasets.md` als verworfen markiert.

