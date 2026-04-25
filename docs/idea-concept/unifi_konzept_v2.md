# UNIFI — Hackathon-Konzept v2

**Stand: 2026-04-24 · ersetzt v1 funktional, v1 bleibt als historische Referenz in `unifi_hackathon_konzept.md`**

Ein funktionsfähiger Prototyp, der zeigt, wie Roboter-Telemetrie in bankenfähige Finanzdaten übersetzt wird. Zwei Hero-Views (CFO und Bank), ein UCS-Agent als Horizontalitäts-Beweis, ein Deal-Desk-Agent als Angebots-Generator. Gebaut in 24 Stunden.

---

## Positionierung: Das Visa-Netzwerk für Robotics-as-a-Service

**Visa macht kein Banking.** Visa vergibt keine Kredite, besitzt keine Filialen, verkauft nichts an Endkunden. Visa betreibt ein **Netzwerk** zwischen Banken, Händlern und Karteninhabern — stellt den Standard bereit (Kartennummer, Protokoll, Abrechnungsregeln), über den alle in derselben Sprache reden, und verdient an jeder Transaktion Basispunkte.

**UNIFI ist das Äquivalent für Robotics-as-a-Service.** Wir bauen keine Roboter, vermieten keine Roboter, finanzieren keine Roboter. Wir stellen bereit:

- den **Standard** (UCS — einheitliches Datenformat für Telemetrie und Datasheet),
- die **Bewertungs-Logik** (Wear-Rate-Modell + Kosten-Engine), mit der Hersteller, Kunden und Banken dieselbe Zahl sehen,
- die **Abrechnungs-Infrastruktur** (Pay-per-Pick, Bank-View, Deal-Desk).

Wir sitzen **zwischen** den Akteuren, nicht als Akteur. Daraus folgt zwingend: das System muss **horizontal und roboter-agnostisch** sein. Ein Visa, das für jede Bank ein eigenes Protokoll entwickeln müsste, wäre kein Netzwerk — es wäre ein Beratungsunternehmen. Deshalb läuft UNIFI auf **einem** Wear-Rate-Modell für alle Roboter, kalibriert über das jeweilige Datasheet. Der Wert eines Netzwerks entsteht daraus, dass derselbe Standard für alle gilt.

---

## Delta zu v1

Gegenüber der ursprünglichen Konzept-Fassung haben sich nach Datensatz-Analyse und konzeptioneller Schärfung acht Punkte verändert:

1. **Use-Case konkretisiert** auf Logistik/E-Commerce mit variabler Paket-Last. Dynamische Pay-per-Pick-Kosten sind nicht mehr Nebenprodukt, sondern **Kern-Pitch**.
2. **Datensatz entschieden:** PHM Society 2021 Europe Data Challenge (SCARA-Roboter, CSEM). Lokal verfügbar, echter Industrieroboter, 51 Sensor-Felder, ~170 h Betrieb, ~170k Picks. C-MAPSS und andere Turbinen-Kandidaten sind verworfen.
3. **Zwei getrennte Modelle** statt eines kombinierten Health-Score-Modells: **Wear Rate** (pricing-relevant) und **Anomaly Detection** (health-/bank-relevant). Klare Trennung.
4. **Anomalien werden nicht gepreist.** Das ist Hersteller-/SLA-/Garantie-Territorium. Wear Rate ist die Funktion von Betriebsintensität; Anomalie ist ein Warnsignal, nicht ein Aufschlag auf die Kundenrechnung.
5. **Labels physikalisch motiviert**, nicht willkürlich erfunden. Basquin (Materialermüdung), Arrhenius (thermische Alterung), Zyklusrate. Im Pitch ehrlich als „physikalische Baseline, kalibriert sich mit echten Kundendaten" erklärbar.
6. **Anomaly Detection im MVP postponed.** Im Konzept verankert, aber nicht trainiert/implementiert in den 24 h. Der Bank-View-Drilldown nutzt vorerst nur Wear-Rate-Feature-Importance.
7. **UCS-Agent = einfacher LLM-Function-Call** für Schema-Mapping (nicht Multi-Turn-Agent mit Tool-Chain). 2–3 h Implementierungsaufwand, dafür demo-zuverlässig.
8. **Deal-Desk-Agent = voll narrativ LLM.** Nicht Preisrechner, sondern Narrator/Berater. Generiert Bilanz-Impact-Narrative, schlägt Szenarien vor, erklärt Covenant-Wirkung. Output als strukturiertes Angebotsdokument gerendert im CFO-View.
9. **UCS-Drop-in-Flow präzisiert.** Das Wear-Rate-Modell wird einmalig auf UCS-genormten, dimensionslosen Features trainiert — nicht auf rohen PHM-Spaltennamen. Fremde Datensätze werden per LLM-Schema-Mapping + Datasheet-Normalisierung live anwendbar, ohne Re-Training. Beim Drop-in droppt der User gleichzeitig Telemetrie (CSV) und Datasheet (CSV/JSON/PDF-Extrakt); der UCS-Agent mappt beides. Das ist der UCS-Beweis in Aktion.
10. **Demo-Mechanik CFO-View = Hybrid-Streaming.** PHM-Historie wird als Live-Stream abgespielt; Szenario-Slider skaliert die Stream-Werte in Echtzeit (z.B. „Peak" × 1.5 auf EPOSCurrent) und schickt den modifizierten Stream durch das vor-trainierte Modell. Werte bleiben realistisch, Slider haben echten Effekt.

---

## Use-Case: Logistik-Pick-Roboter mit variabler Last

Ein Lager-Pick-Roboter handelt in realer E-Commerce-Logistik Produkte mit stark unterschiedlichem Gewicht:

| Pick | Artikel | Gewicht | Motor-Last |
|---|---|---|---|
| 1 | Schraubenset | 50 g | niedrig |
| 2 | Kaffeemaschine | 8 kg | hoch |
| 3 | Taschenbuch | 300 g | niedrig |
| 4 | Staubsauger | 12 kg | Grenzlast |

Jeder Pick hat eine andere mechanische Beanspruchung. Jeder Pick verbraucht eine andere Portion Lebensdauer des Roboters. Pauschale Pay-per-Pick-Modelle subventionieren Schwerbetrieb durch Leichtbetrieb: der Kunde, der nur Leichtes pickt, zahlt zu viel; der mit viel Schwerem zu wenig.

**UNIFIs Disruption:** Cost-per-Pick wird **live aus der tatsächlichen Motor-Last** berechnet, nicht pauschal. Das ist fair, datengetrieben und **zwingend** auf ein ML-Modell angewiesen — nicht weil wir ML haben wollen, sondern weil die Kombination aus ~50 Sensor-Features → Wear Rate nicht sinnvoll händisch als Formel modellierbar ist.

---

## Datengrundlage: PHM Society 2021 SCARA (CSEM)

Lokal unter `data/phm-society-2021/`. Swiss Center for Electronics and Microtechnology, Sicherungs-Sortierung mit SCARA-Arm + Feeder + Test Bench.

**Quantitativ:**
- ~143 Files (je ~1 MB, CSV)
- 361 Zeitfenster à 10 s pro File → ~60 min Roboterbetrieb pro File
- Insgesamt ~170 h Betrieb, ~170k Pick-Events
- 51 Sensor-Felder, alle Roboter-semantisch
- Klassen-Labels pro File: `class_0` (gesund, ~106 Files) + `class_2/3/4/5/7/9/11/12` (verschiedene Fehlertypen, ~37 Files)

**Kern-Felder für Wear-Rate-Modell:**
- `EPOSCurrent`, `EPOSPosition`, `EPOSVelocity` — Motor des Sortier-Conveyors
- `SmartMotorSpeed`, `SmartMotorPositionError` — Haupt-Conveyor-Motor
- `DurationPickToPick`, `DurationRobotFromFeederToTestBench`, `FuseCycleDuration` — Zyklus-Timings
- `Vacuum`, `VacuumFusePicked`, `VacuumValveClosed`, `Pressure` — Sauggreifer/Pneumatik
- `CpuTemperature`, `Temperature`, `TemperatureThermoCam` — Temperatur-Stress
- `Humidity` — Umgebungs-Kontext

Pro Fenster bis zu sieben Aggregat-Statistiken (`vCnt`, `vFreq`, `vMax`, `vMin`, `vStd`, `vTrend`, `value`) — Feature-Engineering ist damit weitgehend vorab erledigt.

**Warum das passt:** `DurationPickToPick` ist die Zyklus-Semantik direkt eingebaut. `EPOSCurrent` ist der primäre Last-Proxy. class_0 liefert ~106 h Normal-Betriebs-Baseline, auf der sich Betriebsintensitäts-Varianz (Leicht-/Schwer-/Grenzbetrieb-Segmente) sauber identifizieren lässt.

---

## Architektur: zwei Modelle, saubere Trennung

Die wichtigste Konzept-Präzisierung gegenüber v1. Nicht ein Modell, das „Health Score" macht, sondern zwei getrennte Modelle mit unterschiedlichen Inputs, Outputs und Wirkwegen.

| Aspekt | **Wear-Rate-Modell** | **Anomaly Detection** |
|---|---|---|
| Was misst es? | Betriebsintensität → Verschleißgeschwindigkeit | Normalverhalten ja/nein |
| Input | Fenster-Features (Motor-Last, Zyklusrate, Temperatur) | Fenster-Features (ganzer Vektor) |
| Output | kontinuierlicher Wear Rate Multiplier (z.B. 0.5×–3.0×) | kontinuierlicher Anomaly Score (0–1) |
| Trainingsdaten | class_0 (gesund) — Intensitäts-Segmente | class_0 als Normal-Modell |
| Label-Quelle | physikalisch motivierte Heuristik | unsupervised (Autoencoder / One-Class) |
| Was wird daraus? | Cost-per-Pick, RUL-Schätzung, Restwert | Health Score, Bank-Risiko-Signal, SLA-Trigger |
| **Kunden-Abrechnung?** | **Ja — preisbar** | **Nein — Hersteller-/Garantie-Territorium** |
| Im MVP? | **Ja — gebaut** | **Konzeptionell, postponed** |

Warum diese Trennung ökonomisch zwingend ist: Wenn Anomalien (Produktdefekte, Prozessstörungen) in die Kunden-Rate fließen würden, bestraft UNIFI den Kunden für Fehler, die nicht seine sind. Das ist kommerziell toxisch und würde das Netzwerk-Vertrauen sofort zerstören. Verschleiß-durch-Nutzung ist fair preisbar, Produktfehler nicht.

---

## Wear-Rate-Modell

### Was es in einfachen Worten ist

Stell dir einen **Anstrengungs-Meter** vor, der pro Pick sagt: *„dieser Pick war 0.6×, 1.0× oder 2.5× so anstrengend wie ein Normal-Pick."* Genau das ist das Wear-Rate-Modell. Eingabe: rund 50 aggregierte Sensor-Werte aus einem Pick-Fenster (Motorstrom, Geschwindigkeit, Temperatur, Zyklusdauer, Pneumatik). Ausgabe: **eine einzige Zahl**, der Wear-Faktor.

**Gewicht wird nicht direkt gemessen.** Es steckt implizit in den Motorsignalen: ein schwereres Objekt erzeugt höheren Motorstrom und stärkere Beschleunigungs-Spitzen. Das Modell lernt diesen Zusammenhang aus den Daten — eine separate Gewichtsangabe ist nicht nötig.

**Warum das über Roboter hinweg funktionieren soll:** die Sensor-Werte gehen **nicht roh** ins Modell, sondern **relativ zur Maschine** — nicht `3.5 A`, sondern `100 % der Nennstromkapazität`; nicht `1.6 s Pickdauer`, sondern `130 % der Nennzyklusrate`. Das Datasheet liefert die „100 %-Referenz" (siehe Abschnitt *Datasheet als Normalisierungs-Basis*). Ein Cobot bei 150 % seiner Nennlast erlebt einen ähnlichen Relativ-Stress wie ein SCARA bei 150 % seiner Nennlast — ähnlich, nicht identisch. Diese Näherung erster Ordnung reicht für die Baseline; die Feinjustierung kommt über den Netzwerk-Effekt (siehe unten).

**Beispielwerte:**
- `0.6×` — leichtes Objekt, gemächliches Tempo
- `1.0×` — Normalbetrieb, Nennlast
- `1.8×` — schweres Objekt, hohe Zyklusrate
- `2.5×` — Grenzlast mit Temperatur-Stress

### Technisch

**Input:** Fenster-Features aus PHM SCARA (50+ Dimensionen nach Aggregation über alle relevanten Sensor-Felder und ihre Stats).

**Output:** ein Skalar — Wear Rate Multiplier relativ zu einer Baseline (z.B. 1.0× = Normalbetrieb mittlerer Last, 0.7× = Leichtbetrieb, 1.8× = Schwerbetrieb, 2.5× = Grenzlast mit Temperatur-Stress).

**Label-Konstruktion (physikalisch motiviert):**
Nicht willkürlich, sondern aus bekannten mechanischen Gesetzmäßigkeiten:
- **Basquin-Gesetz:** Materialermüdung wächst mit Last-Exponent (typisch ×² bis ×³). → `EPOSCurrent.vMax^α` als Hauptfaktor.
- **Arrhenius-Beziehung:** chemische und thermische Alterungsprozesse beschleunigen exponentiell mit Temperatur. → `exp(k × (Temperature.value − T_ref))` als Modulator.
- **Zyklusrate:** kürzere Zyklen = weniger Abkühlung, dichter mechanischer Stress. → `1 / DurationPickToPick.value` als Intensitäts-Proxy.

Baseline-Labels werden aus dieser Formel auf class_0-Daten berechnet. Das Modell lernt, die Formel aus den Features zu rekonstruieren **und Kombinationen zu generalisieren** (z.B. „hohe Last plus lange Pausen = Cooldown-Effekt, Wear Rate geringer als Last allein suggerieren würde"). Diese Kombinationen händisch zu modellieren wäre aufwendig und spröde — genau hier rechtfertigt sich das ML.

**Pitch-Framing:** „Unsere Baseline ist physikalisch motiviert. Sobald ein Kunde echte Run-to-Failure-Daten seiner Flotte liefert, rekalibriert das Modell und wird genauer. Die Methodik bleibt, die Genauigkeit steigt." — genau der Netzwerk-Effekt, der UNIFI als Visa-Äquivalent trägt.

**Modelltyp:** offen, beides valid:
- **LightGBM** mit SHAP-Explanations — klassischer Boosting-Ansatz, sehr schnell trainiert, direkt erklärbar.
- **Kleines neuronales Netz** (MLP, 2–3 Layer) mit SHAP via KernelSHAP oder DeepSHAP — mehr KI-Tiefe im Pitch, etwas längerer Trainings-Loop, gleiche Erklärbarkeit.

Entscheidung fällt in Runde 2 vor Training. Feature Importance / SHAP-Output wird für den Bank-View-Drilldown genutzt.

---

## Netzwerk-Effekt: Baseline heute, klassen-spezifisches Fine-Tuning über Felddaten

Das Wear-Rate-Modell ist eine **physikalisch motivierte Baseline**, keine perfekte Wahrheit. Die Annahme *„gleicher Relativ-Stress → gleicher Verschleiß"* stimmt als Näherung erster Ordnung — aber unterschiedliche Werkstoffe, Mechanismen und Versagensmodi (SCARA-Präzisionslager vs. Baxter-SEA-Torsionsfedern vs. UR-Harmonic-Drive) haben im Detail unterschiedliche Koeffizienten, die die Baseline nicht eins-zu-eins abbildet.

Genau deshalb ist UNIFI **als Netzwerk konzipiert**:

1. **Tag 1 — Baseline.** Ein Modell, auf SCARA-Daten trainiert, physikalisch motivierte Labels. Jeder neue Roboter läuft über Datasheet-Normalisierung sofort mit — ohne Re-Training, ohne Integrationsprojekt.
2. **Wachstumsphase — klassen-spezifisches Fine-Tuning.** Sobald echte Felddaten aus mehreren Roboter-Klassen (scara / cobot / parallel / gantry) reinkommen, trainieren wir pro Klasse ein feinjustiertes Modell, das die klassen-typischen Koeffizienten korrekt lernt.
3. **Reifephase — Key-Account-Fine-Tuning.** Für Kunden mit großen Flotten und eigener Historie gibt es zusätzlich kundenspezifische Kalibrierung auf deren Nutzungsprofile.

**Pitch-Botschaft:** *„Die Methodik steht ab Tag 1. Die Genauigkeit wächst mit jedem Kunden, dessen Felddaten ins Netzwerk fließen."* Das ist das direkte Analogon zum Visa-Netzwerk: der Wert entsteht nicht aus einer einzelnen Transaktion, sondern aus Skalen- und Netzwerk-Wirkung über viele Teilnehmer hinweg.

**Im MVP wird nur Stufe 1 gebaut.** Fine-Tuning-Stufen sind konzeptionell verankert, nicht implementiert.

---

## Anomaly Detection (konzeptionell, im MVP postponed)

**Nicht im 24-h-Scope**, aber Teil des Zielbildes. Konkrete Überlegung:
- **Trainingsdaten:** ausschließlich class_0. Das Modell lernt „so sieht normaler Betrieb aus".
- **Ansatz:** Autoencoder (Reconstruction Error als Anomaly Score) oder Isolation Forest / One-Class SVM.
- **Validierung:** gegen class_2–12 — liefert das Modell dort erwartet hohe Anomaly Scores?
- **Wirkweg:** Anomaly Score → Health Score (Bank-View) → SLA-Trigger (Operator) → Hersteller-Feedback (Garantie-Pfad). **Nicht** → Kundenrate.

Im MVP wird der Bank-View-Drilldown stattdessen SHAP-Output des Wear-Rate-Modells zeigen („warum ist der Score so wie er ist?" → „EPOSCurrent.vMax und FuseHeatSlope.vStd dominieren"). Anomaly Detection wird in einer Folge-Iteration (Post-Hackathon) ergänzt.

---

## Datasheet als Normalisierungs-Basis und Modell-Portabilitäts-Enabler

Das Datasheet des Roboters liefert **Normalisierungs-Konstanten**, keine Wear-Multiplier. Pro Roboter-Modell:

```json
{
  "model": "CSEM SCARA Sicherungs-Sorter",
  "manufacturer": "CSEM",
  "cost_new_eur": 120000,
  "nominal_picks_lifetime": 50000000,
  "rated_current_a": 3.5,
  "rated_cycle_time_s": 2.5,
  "nominal_duty_cycle": 0.8
}
```

Diese Werte fließen:
- in die **Normalisierung** der Modell-Inputs (`EPOSCurrent.vMax / rated_current_a` = relative Auslastung)
- in die **Kapital-Komponente** der Kosten-Engine (`cost_new_eur / nominal_picks_lifetime` = nominaler Kapital-Anteil pro Pick)
- in die **Abschreibungs-Kurve** für den Restwert

Entscheidend: der Wear-Rate-Multiplier wird **nicht** aus dem Datasheet abgeleitet. Er kommt aus den Live-Betriebsdaten. Das ist der Unterschied zu einer naiven Kalkulation.

**Warum das der Schlüssel zur Modell-Portabilität ist:** Das Wear-Rate-Modell wird auf **dimensionslosen UCS-Features** trainiert (`motor_load_ratio`, `cycle_intensity`, `temp_delta_normalized`) — nicht auf rohen SCARA-spezifischen Ampere-Werten. Solange für einen fremden Roboter ein Datasheet-Äquivalent existiert (rated current/torque, rated cycle time, cost new, nominal picks lifetime), landen seine Features nach der Normalisierung im selben Wertebereich wie die SCARA-Trainingsdaten. **Dasselbe vor-trainierte Modell kann dann den fremden Stream scoren, ohne Re-Training.**

Das ist die technische Grundlage für den UCS-Drop-in: Schema-Mapping + Datasheet-Normalisierung reichen, um einen neuen Roboter live in die Kosten-Engine zu integrieren. Der vollständige On-Stage-Flow steht weiter unten unter „Drop-in-Flow".

### Konkrete Quelle im Repo: FANUC SR-3iA als Datasheet-Stellvertreter

Der CSEM-SCARA aus der PHM-Challenge ist anonymisiert — kein offizielles Datenblatt verfügbar. Als realer Stellvertreter gleicher Klasse (industrieller Tisch-SCARA) nutzen wir das **FANUC SR-3iA**. Damit hat das Konzept eine belastbare Datasheet-Quelle für Normalisierung und Kosten-Engine statt nur geschätzte Platzhalter.

- **PDF:** `docs/research/datasheets/fanuc-sr-3ia-datasheet.pdf`
- **Notiz** mit Specs tabellarisch, Begründung (*warum FANUC als Stellvertreter*) und erster UCS-Mapping-Skizze: `docs/research/datasheets/fanuc-sr-3ia.md`

---

## Kosten-Engine

Reine Arithmetik, kein ML. Brücke zwischen Sensor-Welt und Finanz-Welt:

```
cost_per_pick =
    energy_cost_per_pick            ← kWh_pro_Pick × Strompreis
  + wear_cost_per_pick              ← (cost_new / nominal_picks_lifetime) × wear_rate_multiplier
  + capital_cost_per_pick           ← (cost_new × zins) / nominal_picks_lifetime
  + maintenance_cost_per_pick       ← wartungskosten_p.a. / picks_p.a.
```

Der `wear_rate_multiplier` kommt **live aus dem Wear-Rate-Modell**, nicht aus einer Konstante. Damit variiert `cost_per_pick` mit jedem Pick, je nach aktueller Last. Genau das ist der Live-Demo-Moneyshot.

### Klartext-Rechenbeispiel (SCARA, Normalbetrieb)

Mit Datasheet-Werten aus `mechanics.md` (Neupreis 120 k€, 50 M Picks Lebensdauer, 5 % Wartung p. a., 2 M Picks p. a., 5 % Zins):

- **Verschleiß nominal:** `120.000 € / 50.000.000 = 0,0024 € pro Pick`. Bei Wear-Faktor `1.5×` → `0,0036 €`, bei `2.5×` → `0,006 €`. Der ML-Teil schlägt hier genau durch.
- **Kapital:** `(120.000 × 5 %) / 50.000.000 = 0,00012 € pro Pick`.
- **Wartung:** `(120.000 × 5 %) / 2.000.000 = 0,003 € pro Pick`.
- **Energie:** `0,30 €/kWh × 0,2 kW × 2 s / 3600 ≈ 0,00003 € pro Pick`. Verschwindend klein — für den Prototyp reicht **konstante Leistung aus Datasheet × Pickdauer**, keine dynamische Ableitung aus EPOSCurrent × Spannung. Der Effekt auf die Gesamtkosten ist marginal.

**Gesamt:** rund `0,007 € pro Pick` bei Normalbetrieb, rund `0,009 € pro Pick` bei Schwerbetrieb mit Wear-Faktor 1.5×. Der Wear-Anteil bewegt den Gesamtpreis spürbar, aber nicht explosiv — genau das gewünschte Verhalten für faire Preisdifferenzierung.

**Für einen fremden Roboter** (Baxter, UR, Cobot) läuft dieselbe Rechnung mit dessen Datasheet-Werten. Der Wear-Faktor kommt aus demselben Modell; die Euro-Skalierung ist roboter-spezifisch.

---

## CFO-View (Hero)

Der CFO der Mieter-Firma. Hier trägt die IFRS-16-Story.

- **Live Cost-per-Pick-Tile** — große Zahl, **tickt mit jedem Pick anders**, weil das Modell pro Fenster einen neuen Wear-Rate-Multiplier liefert. Hover zeigt Breakdown (Energie, Verschleiß, Kapital, Wartung).
- **Monthly Bill Preview** — akkumuliert tagaktuell, Hochrechnung auf Monatsende basierend auf historischer Last-Mix.
- **Usage-Chart** — Picks pro Stunde, eingefärbt nach Wear-Rate-Segment (grün = Leichtbetrieb, orange = Mittel, rot = Schwerbetrieb).
- **Bilanz-Vergleicher** — Split-Screen „IFRS-16-Leasing" (rot, Covenant-Warnung) vs. „UNIFI-Service" (grün, saubere OpEx). Moneyshot.
- **Szenario-Slider** — Leichtbetrieb / Mittelbetrieb / Schwerbetrieb / Saisonpeak. Implementiert als **Hybrid-Demo**: PHM-Historie läuft als Stream, der Slider skaliert die Stream-Werte in Echtzeit (z.B. „Peak" multipliziert EPOSCurrent mit 1.5×, erhöht die Zyklusrate). Der modifizierte Stream fließt durchs vor-trainierte Modell, das liefert einen neuen Wear-Rate-Multiplier, die Kosten-Engine rendert die neue Zahl. Ändert **real die Modell-Inputs** (nicht nur UI-Farben) — Werte bleiben realistisch (aus echten Daten), Modell reagiert tatsächlich. Das ist der direkte Datenehrlichkeits-Beweis.
- **„Angebot anfragen"-Button** — triggert den Deal-Desk-Agent.

---

## Bank-View

Der Financier sieht die Flotte als neue Asset-Klasse mit Echtzeit-Transparenz.

- **Robot Credit Score** — zusammengesetzter Wert aus Wear Rate (Verbrauch) + Restwert + Cashflow-Deckung. (Im MVP: ohne Anomaly-Score-Komponente; konzeptionell vorgesehen.)
- **Fleet-Tabelle** — alle Roboter mit Current Wear Rate, kumuliertem Verschleiß, Restwert (€), Daily Revenue, Risiko-Ampel. **Entscheidend:** differenzierter Restwert pro Roboter — Roboter #17 in Leichtbetrieb hat einen anderen Restwert als #34 in Dauer-Schwerbetrieb.
- **Portfolio-Kennzahlen** — Collateral Value gesamt (Summe der Restwerte), gewichteter Flotten-Wear-Average, Konzentrationsrisiko.
- **Drilldown** — Klick auf Roboter zeigt Wear-Rate-Verlauf und **SHAP-Feature-Importance** („warum ist die Wear Rate so hoch? → EPOSCurrent.vMax + FuseHeatSlope.vStd dominieren"). Das ersetzt im MVP den Anomaly-Drilldown.
- **Cashflow-Proof** — aggregierte tägliche Pay-per-Pick-Einnahmen über die Flotte. Killer-Argument: die Raten fließen aus echtem Umsatz, nicht aus Versprechen, und sind mit der selben Telemetrie verknüpft wie der Asset-Wert.

---

## UCS-Agent (LLM-Function-Call)

**Zweck:** horizontaler Infrastruktur-Beweis. Jeder Roboter-Hersteller hat andere Feldnamen. Der UCS-Agent mappt fremde Datensätze auf unser kanonisches Schema.

**Implementierung (leicht, 2–3 h):**
- Ein einziger LLM-Call (structured output / function calling), doppelt angewendet: einmal für das Telemetrie-Schema, einmal für das Datasheet.
- **User droppt beides:** Telemetrie-CSV + Datasheet (CSV, JSON oder extrahierte Key-Value-Liste aus PDF). Ohne Datasheet keine Normalisierung — und ohne Normalisierung keine Cost-per-Pick.
- **Prompt Telemetrie:** UCS-Zielschema + fremde Spaltennamen + 5 Beispielwerte pro Spalte.
- **Prompt Datasheet:** UCS-Datasheet-Zielschema (`rated_current_a`, `rated_cycle_time_s`, `cost_new_eur`, `nominal_picks_lifetime`, …) + Feld-Text des fremden Datasheets.
- **Output:** JSON-Mapping `{fremd_feld → ucs_feld, confidence, konvertierung}` für beide.
- User bestätigt/korrigiert im UI. Daten fließen durch die gleiche Kosten-Engine und das gleiche Wear-Rate-Modell wie der primary-Datensatz — **ohne Re-Training**, weil das Modell auf dimensionslose, Datasheet-normalisierte Features trainiert ist.

**Bühnen-Demo:** zweites CSV droppen → LLM-Call → Mapping-Vorschlag erscheint → User klickt „bestätigen" → Daten laufen durch die Pipeline → Dashboard zeigt Cost-per-Pick für den fremden Roboter. 30 Sekunden Show.

**Bewusst nicht:** Multi-Turn-Dialog, Tool-Chains, adaptive Datenexploration. Das würde im 24-h-Fenster Reliability kosten.

**Voraussetzung demo-tauglich:** foreign-Datensatz mit **sprechenden Feldnamen** (LLM kann semantisch mappen). Top-Kandidaten: AI4I 2020 (`Torque`, `Rotational speed`, `Tool wear`), Microsoft Azure PdM (`volt`, `rotate`, `pressure`, `vibration`). Entscheidung in Runde 2.

---

## Drop-in-Flow: Onboarding eines fremden Roboters

Das vollständige On-Stage-Szenario. Zeigt, warum UCS mehr ist als ein Schema-Hint: es ist die komplette Integration in wenigen Sekunden.

1. **User droppt zwei Dateien** ins UI: `telemetrie.csv` + `datasheet.json` (alternativ CSV oder extrahierter PDF-Text). Für Showcase-Zwecke kann das Datasheet als kleine JSON-Datei neben der Telemetrie liegen — in Produktion kommt es aus dem Hersteller-Katalog oder ERP.
2. **UCS-Agent** (LLM-Call, 2–4 s): mappt fremde Telemetrie-Spalten und fremde Datasheet-Felder auf das kanonische UCS-Schema. Output: JSON-Vorschlag mit Confidence pro Feld.
3. **Bestätigungs-UI:** Tabelle mit den Mappings, Confidence pro Zeile. User klickt „Übernehmen" (oder korrigiert Einzelfelder).
4. **Normalisierung:** Telemetrie-Features werden mit den Datasheet-Werten auf dimensionslose UCS-Features umgerechnet (`joint_effort / rated_torque` → `motor_load_ratio`, `timestamp_diff / rated_cycle_time` → `cycle_intensity`, …).
5. **Inferenz:** Dasselbe vor-trainierte Wear-Rate-Modell wie beim primary-Datensatz scoret den fremden Stream. Kein Re-Training.
6. **Dashboard:** neue Flotten-Zeile erscheint, Cost-per-Pick tickt live, der fremde Roboter ist vollwertig im System.

**Warum kein Re-Training nötig ist:** siehe „Datasheet als Normalisierungs-Basis". Das Modell sieht über alle Roboter hinweg dieselbe dimensionslose Verteilung — die Datasheet-Werte tragen die Roboter-spezifische Kalibrierung.

**Pitch-Moment:** *„Ein Roboter, den UNIFI noch nie gesehen hat. Kein eigenes Modell, kein Training, keine Integrationswoche. Dreißig Sekunden bis zum ersten live-gepreisten Pick."*

**De-Risking in der Umsetzung:** Mapping + Normalisierung + Modell-Output werden **vor dem Hackathon** auf den geplanten Showcase-Daten einmal end-to-end durchgespielt. Wenn die Wear Rate in plausiblem Bereich (0.7×–1.5×) landet, ist die Demo sicher; falls nicht, justieren wir das Datasheet-Mapping oder kuratieren, welches Sample wir zeigen. Das ist keine Demo-Manipulation — das ist der echte Kunden-Onboarding-Flow in klein: *„wir kalibrieren mit deinem Datasheet, validieren auf einem Sample, dann live."*

---

## Deal-Desk-Agent (voll narrativ LLM)

**Zweck:** Angebots-Generator. Der Agent wandelt Kundenparameter in ein strukturiertes Angebotsdokument um — nicht als Chat-Blase, sondern als gerenderte Angebots-Ansicht im CFO-View.

**Input:** Kundenparameter (Volumen, Saisonalität, Bilanz-Kennzahlen, Gewichts-Mix).

**Tools, die der Agent aufruft:**
- Kosten-Engine (für Cost-per-Pick-Berechnung bei gegebenem Last-Mix)
- IFRS-16-Simulator (einfache Formel oder LLM-Narrative — Entscheidung offen)
- Finanz-Konstanten-Lookup (kWh-Preis, Zinsen, Wartung)

**Output: narratives, strukturiertes Angebot.** Nicht nur Zahlen, sondern Kontext:
- *„Bei deinem Paket-Mix (60 % Leicht, 30 % Mittel, 10 % Schwer) ergibt sich ein Pay-per-Pick von 0,47 €. Bei Schwerbetrieb-dominantem Mix wären es 0,61 €."*
- *„Dieses Angebot verschiebt 280 k€ von IFRS-16-Schulden in OpEx. Deine Eigenkapitalquote steigt von 29 % auf 33 % — du bleibst damit unter der Covenant-Grenze deiner Hausbank, die bei deinem klassischen Leasing-Angebot gebrochen wäre."*
- *„Volumen wächst laut deiner Angabe um 15 % p.a. — soll ich eine Flex-Kapazitäts-Klausel für Saisonpeaks einbauen?"*

Das ist der einzige Agent im Konzept, der echte LLM-Stärken nutzt (Narrative, Kontext-Synthese, Unsicherheits-Verhandlung). Die Arithmetik läuft über Tools; das LLM erklärt, begründet und empfiehlt.

**Rendering:** strukturiertes Schema (Header, Preis-Range, Bilanz-Impact-Block, Szenarien-Block, Klausel-Vorschläge), nicht Free-Text. Das Schema wird im CFO-View als Angebots-Ansicht gerendert.

---

## Bewusst nicht im MVP

- **Operator-View** bleibt minimal (KPI-Kacheln + UCS-Onboarding-Button). In 24 h bauen wir zwei Views richtig, nicht drei halb.
- **Anomaly Detection** ist konzeptionell verankert, aber nicht trainiert. Bank-View-Drilldown nutzt vorerst Wear-Rate-SHAP.
- **Klassisches RUL-Regression** (wie in C-MAPSS) ist verworfen — die PHM-SCARA-Daten sind keine Run-to-Failure-Trajektorien. RUL wird abgeleitet aus kumulierter Wear Rate ÷ nominaler Lifetime.
- **Video-basierte Roboter-Datasets** (ViFailback, RoboFAC, Humanoid Everyday, ARMBench) sind verworfen — Vision-Pipeline im 24-h-Fenster nicht machbar.
- **Echte Hersteller-Datasheets** für ABB/FANUC/KUKA/UR sind optional; im MVP reicht ein einzelnes synthetisches CSEM-SCARA-Profil, das im Pitch transparent als Platzhalter genannt wird.
- **Multi-Roboter-Flotte** wird im Bank-View simuliert (10–20 synthetisch generierte Roboter mit unterschiedlichem Nutzungsprofil, alle auf Basis des PHM-SCARA-Modells).

---

## Offene Entscheidungen (Runde 2)

- **Wahl Foreign-Datensatz** — AI4I 2020 vs. Azure PdM. Beide mit semantischen Feldnamen, beide LLM-mappbar.
- **Wahl Wear-Rate-Modelltyp** — LightGBM + SHAP oder kleines NN + SHAP. Entscheidung vor Training.
- **Konkrete Label-Formel** — Exponent α für Basquin, Referenz-Temperatur T_ref, Gewichtung Zyklusrate. Wird in `decisions.md` fixiert, bevor Training startet.
- **IFRS-16-Simulator** — deterministische Python-Formel oder LLM-generierte Narrative als Teil des Deal-Desk-Agent?

---

*UNIFI · Financial Infrastructure for the Robotics-as-a-Service Economy*
