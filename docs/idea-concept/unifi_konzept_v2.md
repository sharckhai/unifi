# UNIFI — Hackathon-Konzept v2

**Stand: 2026-04-25 · ersetzt v1 funktional, v1 bleibt als historische Referenz in `unifi_hackathon_konzept.md`**

> **Update 2026-04-25 — Primary-Datensatz-Wechsel:** Der primary-Datensatz ist von PHM Society 2021 SCARA auf **NIST UR5-Degradation** umgestellt. Begründung: echter 6-DOF-Cobot, 73 sprechende Sensor-Felder bei 125 Hz Sampling, **explizite Payload-Stratifikation (16 lb / 45 lb)** als direkter Treffer für den „variable Last"-Use-Case, offizielles UR5-Datenblatt vorhanden (kein Stellvertreter mehr nötig). Architektur-Implikationen (Pick-Detektion, Label-Konstruktion, Foreign-Datensatz-Rolle für PHM SCARA) sind im Dokument durchgezogen. Detail-Evaluation siehe `docs/research/datasets.md`.

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
2. **Datensatz entschieden:** NIST UR5-Degradation (lokal unter `data/nist-ur5-degradation/`). 6-DOF Universal-Robots-Cobot, 73 Sensor-Felder bei 125 Hz, 18 Test-Konfigurationen × 3 Wiederholungen mit expliziter Payload-Stratifikation (16 lb / 45 lb), Speed-Stratifikation und Coldstart-Variante. C-MAPSS und andere Turbinen-Kandidaten sind verworfen; PHM Society 2021 SCARA wandert in die Foreign-Rolle (Schema-Mapping-Demo).
3. **Zwei getrennte Modelle** statt eines kombinierten Health-Score-Modells: **Wear Rate** (pricing-relevant) und **Anomaly Detection** (health-/bank-relevant). Klare Trennung.
4. **Anomalien werden nicht gepreist.** Das ist Hersteller-/SLA-/Garantie-Territorium. Wear Rate ist die Funktion von Betriebsintensität; Anomalie ist ein Warnsignal, nicht ein Aufschlag auf die Kundenrechnung.
5. **Labels physikalisch motiviert**, nicht willkürlich erfunden. Basquin (Materialermüdung), Arrhenius (thermische Alterung), Zyklusrate. Im Pitch ehrlich als „physikalische Baseline, kalibriert sich mit echten Kundendaten" erklärbar.
6. **Anomaly Detection im MVP postponed.** Im Konzept verankert, aber nicht trainiert/implementiert in den 24 h. Der Bank-View-Drilldown nutzt vorerst nur Wear-Rate-Feature-Importance.
7. **UCS-Agent = einfacher LLM-Function-Call** für Schema-Mapping (nicht Multi-Turn-Agent mit Tool-Chain). 2–3 h Implementierungsaufwand, dafür demo-zuverlässig.
8. **Deal-Desk-Agent = voll narrativ LLM.** Nicht Preisrechner, sondern Narrator/Berater. Generiert Bilanz-Impact-Narrative, schlägt Szenarien vor, erklärt Covenant-Wirkung. Output als strukturiertes Angebotsdokument gerendert im CFO-View.
9. **UCS-Drop-in-Flow präzisiert.** Das Wear-Rate-Modell wird einmalig auf UCS-genormten, dimensionslosen Features trainiert — nicht auf rohen UR5-Spaltennamen. Fremde Datensätze werden per LLM-Schema-Mapping + Datasheet-Normalisierung live anwendbar, ohne Re-Training. Beim Drop-in droppt der User gleichzeitig Telemetrie (CSV) und Datasheet (CSV/JSON/PDF-Extrakt); der UCS-Agent mappt beides. Das ist der UCS-Beweis in Aktion.
10. **Demo-Mechanik CFO-View = Hybrid-Streaming.** UR5-NIST-Historie wird als Live-Stream abgespielt; Szenario-Slider skaliert die Stream-Werte in Echtzeit (z.B. „Peak" × 1.5 auf `actual_current_J{1..6}`, Umschaltung von 16-lb- auf 45-lb-Payload-Run) und schickt den modifizierten Stream durch das vor-trainierte Modell. Werte bleiben realistisch, Slider haben echten Effekt.

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

## Datengrundlage: NIST UR5-Degradation

Lokal unter `data/nist-ur5-degradation/`. National Institute of Standards and Technology — kontrollierte Degradations-Test-Suite auf Universal Robots UR5 (6-DOF Cobot).

**Quantitativ:**
- 40 Daten-CSVs (raw + flat-normalisiert), 406 MB gesamt
- **18 Test-Konfigurationen** × 3 Wiederholungen — Stratifikation entlang **Payload {16 lb, 45 lb}** × **Speed {fullspeed, halfspeed}** × **{Coldstart, warm}**
- ~8.6k Zeilen × 73 Spalten pro File, **125 Hz Sampling**, ~69 s pro Run
- 73 Sensor-Felder, alle Roboter-semantisch (6-DOF Joint-Telemetrie + TCP-Pose + TCP-Wrench + Joint-Temperaturen)
- **Keine expliziten Failure-/Klassen-Labels** — Degradation manifestiert sich implizit über (a) Run-Index 1/2/3 und (b) Coldstart vs. warm

**Kern-Felder für Wear-Rate-Modell** (alle 6 Joints J1–J6, soweit nicht anders vermerkt):
- `actual_current_J{1..6}` (A) — primärer Last-Proxy, ersetzt funktional `EPOSCurrent`
- `actual_position_J{1..6}`, `target_position_J{1..6}` (rad) — Positionsverlauf und Tracking-Fehler
- `actual_velocity_J{1..6}`, `target_velocity_J{1..6}` (rad/s) — Geschwindigkeitsprofil
- `target_torque_J{1..6}` (Nm) — Drehmoment-Sollwert
- `joint_temperature_J{1..6}` (°C) — Temperatur-Stress pro Joint, ersetzt funktional `FuseHeatSlope`
- `tcp_force_{x,y,z}`, `tcp_torque_{x,y,z}` — TCP-Wrench, indirekter Payload-Indikator
- `tcp_position_{x,y,z,rx,ry,rz}` — TCP-Pose
- `ROBOT_TIME` (s) — Zeitachse

**Pick-/Zyklus-Semantik:** UR5-NIST liefert keine native `DurationPickToPick`-Aggregation. Pick-Zyklen werden aus der Telemetrie abgeleitet (TCP-Z-Bewegung + Joint-Velocity-Muster → Pick/Drop-Detektion) und auf 10-s-Fenster aggregiert; alternativ wird der Run-Index als Pseudo-Zyklusachse genutzt.

**Pro Fenster** werden die gleichen Aggregat-Statistiken berechnet wie zuvor auf PHM SCARA (`vCnt`, `vFreq`, `vMax`, `vMin`, `vStd`, `vTrend`, `value`) — das Feature-Engineering ist nicht datensatz-spezifisch und überträgt sich direkt.

**Warum das passt:**
- **Variable Last ist explizit in den Daten** — die Payload-Stratifikation 16 lb / 45 lb deckt direkt den „leicht vs. schwer"-Use-Case ab, ohne dass wir Last-Mix synthetisch konstruieren müssen
- **Joint-Granularität** (6 Ströme, 6 Temperaturen) liefert reichere Wear-Rate-Features als die 1 globale Temperatur in PHM SCARA
- **Run-Index 1/2/3** liefert eine implizite Wear-Achse: dasselbe Setup, drei aufeinanderfolgende Runs — ideale Trainingsbasis für „so sieht 'frisch' aus, so 'leicht abgenutzt'"
- **Coldstart-Variante** trennt Anlauf-Effekte sauber von eingefahrenem Betrieb — natürlicher Arrhenius-Test
- **Offizielles UR5-Datenblatt** liegt bei (`datasheets/`), die Datasheet-Normalisierung ist damit aus erster Hand belegt

**Trainingsbasis (Äquivalent zu „class_0 in PHM SCARA"):** im MVP wird **Run 1 aller 18 Konfigurationen** als Baseline-Set behandelt (frischer Zustand), Run 2 und 3 dienen zur impliziten Degradations-Validierung. Cold-Start-Runs werden separat behandelt, um Arrhenius-Effekte zu kalibrieren.

---

## Architektur: zwei Modelle, saubere Trennung

Die wichtigste Konzept-Präzisierung gegenüber v1. Nicht ein Modell, das „Health Score" macht, sondern zwei getrennte Modelle mit unterschiedlichen Inputs, Outputs und Wirkwegen.

| Aspekt | **Wear-Rate-Modell** | **Anomaly Detection** |
|---|---|---|
| Was misst es? | Betriebsintensität → Verschleißgeschwindigkeit | Normalverhalten ja/nein |
| Input | Fenster-Features (Motor-Last, Zyklusrate, Temperatur) | Fenster-Features (ganzer Vektor) |
| Output | kontinuierlicher Wear Rate Multiplier (z.B. 0.5×–3.0×) | kontinuierlicher Anomaly Score (0–1) |
| Trainingsdaten | Run-1-Set aller UR5-NIST-Konfigurationen — Intensitäts-Segmente über Payload/Speed | Run-1-Set als Normal-Modell |
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

**Input:** Fenster-Features aus UR5-NIST (~73 Roh-Spalten × 7 Aggregat-Statistiken nach Reduktion auf relevante Felder ≈ 60–80 Feature-Dimensionen, normalisiert auf dimensionslose UCS-Features wie `motor_load_ratio`, `cycle_intensity`, `temp_delta_normalized`).

**Output:** ein Skalar — Wear Rate Multiplier relativ zu einer Baseline (z.B. 1.0× = Normalbetrieb mittlerer Last, 0.7× = Leichtbetrieb, 1.8× = Schwerbetrieb, 2.5× = Grenzlast mit Temperatur-Stress).

**Label-Konstruktion (physikalisch motiviert):**
Nicht willkürlich, sondern aus bekannten mechanischen Gesetzmäßigkeiten — Felder konkret auf UR5-NIST gemappt:
- **Basquin-Gesetz:** Materialermüdung wächst mit Last-Exponent (typisch ×² bis ×³). → `max(actual_current_J{1..6}).vMax^α` als Hauptfaktor (schwerstbelasteter Joint dominiert die Ermüdung).
- **Arrhenius-Beziehung:** chemische und thermische Alterungsprozesse beschleunigen exponentiell mit Temperatur. → `exp(k × (max(joint_temperature_J{1..6}).value − T_ref))` als Modulator.
- **Zyklusrate:** kürzere Zyklen = weniger Abkühlung, dichter mechanischer Stress. → `1 / cycle_duration_estimated.value` als Intensitäts-Proxy, wobei `cycle_duration_estimated` aus TCP-Bewegungs-Detektion oder dem Speed-Filename-Tag (`fullspeed` ≈ halbe Zyklusdauer wie `halfspeed`) abgeleitet wird.

Baseline-Labels werden aus dieser Formel auf der **Run-1-Trainingsbasis** berechnet (alle 18 Konfigurationen, frischer Zustand). Das Modell lernt, die Formel aus den Features zu rekonstruieren **und Kombinationen zu generalisieren** (z.B. „hohe Last plus lange Pausen = Cooldown-Effekt, Wear Rate geringer als Last allein suggerieren würde"). Diese Kombinationen händisch zu modellieren wäre aufwendig und spröde — genau hier rechtfertigt sich das ML.

**Validierung:** Run 2 und Run 3 derselben Konfiguration sollten gegenüber Run 1 leicht erhöhte Wear-Rates zeigen; Coldstart-Runs sollten erhöhte Arrhenius-Komponente in den ersten Sekunden aufweisen. Beides ist im Datensatz strukturell angelegt, ohne dass externe Labels nötig sind.

**Pitch-Framing:** „Unsere Baseline ist physikalisch motiviert. Sobald ein Kunde echte Run-to-Failure-Daten seiner Flotte liefert, rekalibriert das Modell und wird genauer. Die Methodik bleibt, die Genauigkeit steigt." — genau der Netzwerk-Effekt, der UNIFI als Visa-Äquivalent trägt.

**Modelltyp:** offen, beides valid:
- **LightGBM** mit SHAP-Explanations — klassischer Boosting-Ansatz, sehr schnell trainiert, direkt erklärbar.
- **Kleines neuronales Netz** (MLP, 2–3 Layer) mit SHAP via KernelSHAP oder DeepSHAP — mehr KI-Tiefe im Pitch, etwas längerer Trainings-Loop, gleiche Erklärbarkeit.

Entscheidung fällt in Runde 2 vor Training. Feature Importance / SHAP-Output wird für den Bank-View-Drilldown genutzt.

---

## Netzwerk-Effekt: Baseline heute, klassen-spezifisches Fine-Tuning über Felddaten

Das Wear-Rate-Modell ist eine **physikalisch motivierte Baseline**, keine perfekte Wahrheit. Die Annahme *„gleicher Relativ-Stress → gleicher Verschleiß"* stimmt als Näherung erster Ordnung — aber unterschiedliche Werkstoffe, Mechanismen und Versagensmodi (UR-Harmonic-Drive vs. SCARA-Präzisionslager vs. Baxter-SEA-Torsionsfedern vs. Gantry-Linearführungen) haben im Detail unterschiedliche Koeffizienten, die die Baseline nicht eins-zu-eins abbildet.

Genau deshalb ist UNIFI **als Netzwerk konzipiert**:

1. **Tag 1 — Baseline.** Ein Modell, auf UR5-NIST-Daten trainiert, physikalisch motivierte Labels. Jeder neue Roboter läuft über Datasheet-Normalisierung sofort mit — ohne Re-Training, ohne Integrationsprojekt.
2. **Wachstumsphase — klassen-spezifisches Fine-Tuning.** Sobald echte Felddaten aus mehreren Roboter-Klassen (scara / cobot / parallel / gantry) reinkommen, trainieren wir pro Klasse ein feinjustiertes Modell, das die klassen-typischen Koeffizienten korrekt lernt.
3. **Reifephase — Key-Account-Fine-Tuning.** Für Kunden mit großen Flotten und eigener Historie gibt es zusätzlich kundenspezifische Kalibrierung auf deren Nutzungsprofile.

**Pitch-Botschaft:** *„Die Methodik steht ab Tag 1. Die Genauigkeit wächst mit jedem Kunden, dessen Felddaten ins Netzwerk fließen."* Das ist das direkte Analogon zum Visa-Netzwerk: der Wert entsteht nicht aus einer einzelnen Transaktion, sondern aus Skalen- und Netzwerk-Wirkung über viele Teilnehmer hinweg.

**Im MVP wird nur Stufe 1 gebaut.** Fine-Tuning-Stufen sind konzeptionell verankert, nicht implementiert.

---

## Anomaly Detection (konzeptionell, im MVP postponed)

**Nicht im 24-h-Scope**, aber Teil des Zielbildes. Konkrete Überlegung:
- **Trainingsdaten:** ausschließlich Run-1-Daten der UR5-NIST-Konfigurationen (frischer Zustand). Das Modell lernt „so sieht normaler Betrieb aus".
- **Ansatz:** Autoencoder (Reconstruction Error als Anomaly Score) oder Isolation Forest / One-Class SVM.
- **Validierung:** gegen Run 2 / Run 3 derselben Konfigurationen sowie gegen Coldstart-Runs — liefert das Modell dort erwartet erhöhte Anomaly Scores? Zusatz-Validierung gegen das **PHM-SCARA-Foreign-Set** als Out-of-Distribution-Check.
- **Wirkweg:** Anomaly Score → Health Score (Bank-View) → SLA-Trigger (Operator) → Hersteller-Feedback (Garantie-Pfad). **Nicht** → Kundenrate.

Im MVP wird der Bank-View-Drilldown stattdessen SHAP-Output des Wear-Rate-Modells zeigen („warum ist der Score so wie er ist?" → „`actual_current_J3.vMax` und `joint_temperature_J5.vStd` dominieren"). Anomaly Detection wird in einer Folge-Iteration (Post-Hackathon) ergänzt.

---

## Datasheet als Normalisierungs-Basis und Modell-Portabilitäts-Enabler

Das Datasheet des Roboters liefert **Normalisierungs-Konstanten**, keine Wear-Multiplier. Pro Roboter-Modell:

```json
{
  "model": "Universal Robots UR5",
  "manufacturer": "Universal Robots",
  "cost_new_eur": 35000,
  "nominal_picks_lifetime": 30000000,
  "rated_current_a": 6.0,
  "rated_cycle_time_s": 2.0,
  "rated_payload_kg": 5.0,
  "nominal_duty_cycle": 0.8
}
```

Diese Werte fließen:
- in die **Normalisierung** der Modell-Inputs (`max(actual_current_J{1..6}).vMax / rated_current_a` = relative Auslastung)
- in die **Kapital-Komponente** der Kosten-Engine (`cost_new_eur / nominal_picks_lifetime` = nominaler Kapital-Anteil pro Pick)
- in die **Abschreibungs-Kurve** für den Restwert

Entscheidend: der Wear-Rate-Multiplier wird **nicht** aus dem Datasheet abgeleitet. Er kommt aus den Live-Betriebsdaten. Das ist der Unterschied zu einer naiven Kalkulation.

**Warum das der Schlüssel zur Modell-Portabilität ist:** Das Wear-Rate-Modell wird auf **dimensionslosen UCS-Features** trainiert (`motor_load_ratio`, `cycle_intensity`, `temp_delta_normalized`) — nicht auf rohen UR5-spezifischen Ampere-Werten. Solange für einen fremden Roboter ein Datasheet-Äquivalent existiert (rated current/torque, rated cycle time, cost new, nominal picks lifetime), landen seine Features nach der Normalisierung im selben Wertebereich wie die UR5-NIST-Trainingsdaten. **Dasselbe vor-trainierte Modell kann dann den fremden Stream scoren, ohne Re-Training.**

Das ist die technische Grundlage für den UCS-Drop-in: Schema-Mapping + Datasheet-Normalisierung reichen, um einen neuen Roboter live in die Kosten-Engine zu integrieren. Der vollständige On-Stage-Flow steht weiter unten unter „Drop-in-Flow".

### Konkrete Quelle im Repo: offizielles UR5-Datenblatt

Mit dem Wechsel auf NIST UR5-Degradation entfällt der vorherige FANUC-Stellvertreter — das **offizielle Universal-Robots-UR5-Datenblatt liegt direkt im Datensatz** und ist die autoritative Quelle für Normalisierung und Kosten-Engine.

- **PDF:** `data/nist-ur5-degradation/datasheets/` (UR5-Datenblatt aus dem NIST-Bundle)
- **Specs übernehmen** (Reach, Payload, Joint-Geschwindigkeiten, Wiederholgenauigkeit, Stromaufnahme) und in `docs/research/mechanics.md` als kanonisches UR5-Profil hinterlegen — der vorherige FANUC-SR-3iA-Eintrag bleibt als historischer Stellvertreter dokumentiert, wird aber nicht mehr für die Normalisierung verwendet.

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

### Klartext-Rechenbeispiel (UR5, Normalbetrieb)

Mit Datasheet-Werten aus dem UR5-Profil (Neupreis 35 k€, 30 M Picks Lebensdauer, 5 % Wartung p. a., 2 M Picks p. a., 5 % Zins):

- **Verschleiß nominal:** `35.000 € / 30.000.000 = 0,00117 € pro Pick`. Bei Wear-Faktor `1.5×` → `0,00175 €`, bei `2.5×` → `0,0029 €`. Der ML-Teil schlägt hier genau durch.
- **Kapital:** `(35.000 × 5 %) / 30.000.000 = 0,00006 € pro Pick`.
- **Wartung:** `(35.000 × 5 %) / 2.000.000 = 0,000875 € pro Pick`.
- **Energie:** `0,30 €/kWh × 0,15 kW × 2 s / 3600 ≈ 0,000025 € pro Pick`. Verschwindend klein — für den Prototyp reicht **konstante Leistung aus Datasheet × Pickdauer**, keine dynamische Ableitung aus Joint-Strom × Spannung. Der Effekt auf die Gesamtkosten ist marginal.

**Gesamt:** rund `0,002 € pro Pick` bei Normalbetrieb, rund `0,0026 € pro Pick` bei Schwerbetrieb mit Wear-Faktor 1.5×. Der Wear-Anteil bewegt den Gesamtpreis spürbar, aber nicht explosiv — genau das gewünschte Verhalten für faire Preisdifferenzierung. (Absolute Werte sind kleiner als beim vorherigen SCARA-Beispiel, weil der UR5 günstiger in der Anschaffung ist; der Wear-Hub bleibt prozentual gleich.)

**Für einen fremden Roboter** (z.B. SCARA, FANUC-Industrie-Arm, Baxter, anderer Cobot) läuft dieselbe Rechnung mit dessen Datasheet-Werten. Der Wear-Faktor kommt aus demselben Modell; die Euro-Skalierung ist roboter-spezifisch.

---

## CFO-View (Hero)

Der CFO der Mieter-Firma. Hier trägt die IFRS-16-Story.

- **Live Cost-per-Pick-Tile** — große Zahl, **tickt mit jedem Pick anders**, weil das Modell pro Fenster einen neuen Wear-Rate-Multiplier liefert. Hover zeigt Breakdown (Energie, Verschleiß, Kapital, Wartung).
- **Monthly Bill Preview** — akkumuliert tagaktuell, Hochrechnung auf Monatsende basierend auf historischer Last-Mix.
- **Usage-Chart** — Picks pro Stunde, eingefärbt nach Wear-Rate-Segment (grün = Leichtbetrieb, orange = Mittel, rot = Schwerbetrieb).
- **Bilanz-Vergleicher** — Split-Screen „IFRS-16-Leasing" (rot, Covenant-Warnung) vs. „UNIFI-Service" (grün, saubere OpEx). Moneyshot.
- **Szenario-Slider** — Leichtbetrieb / Mittelbetrieb / Schwerbetrieb / Saisonpeak. Implementiert als **Hybrid-Demo**: UR5-NIST-Historie läuft als Stream, der Slider skaliert die Stream-Werte in Echtzeit (z.B. „Peak" multipliziert `actual_current_J{1..6}` mit 1.5×, erhöht die Zyklusrate, schaltet von 16-lb- auf 45-lb-Payload-Run). Der modifizierte Stream fließt durchs vor-trainierte Modell, das liefert einen neuen Wear-Rate-Multiplier, die Kosten-Engine rendert die neue Zahl. Ändert **real die Modell-Inputs** (nicht nur UI-Farben) — Werte bleiben realistisch (aus echten Daten), Modell reagiert tatsächlich. Das ist der direkte Datenehrlichkeits-Beweis.
- **„Angebot anfragen"-Button** — triggert den Deal-Desk-Agent.

---

## Bank-View

Der Financier sieht die Flotte als neue Asset-Klasse mit Echtzeit-Transparenz.

- **Robot Credit Score** — zusammengesetzter Wert aus Wear Rate (Verbrauch) + Restwert + Cashflow-Deckung. (Im MVP: ohne Anomaly-Score-Komponente; konzeptionell vorgesehen.)
- **Fleet-Tabelle** — alle Roboter mit Current Wear Rate, kumuliertem Verschleiß, Restwert (€), Daily Revenue, Risiko-Ampel. **Entscheidend:** differenzierter Restwert pro Roboter — Roboter #17 in Leichtbetrieb hat einen anderen Restwert als #34 in Dauer-Schwerbetrieb.
- **Portfolio-Kennzahlen** — Collateral Value gesamt (Summe der Restwerte), gewichteter Flotten-Wear-Average, Konzentrationsrisiko.
- **Drilldown** — Klick auf Roboter zeigt Wear-Rate-Verlauf und **SHAP-Feature-Importance** („warum ist die Wear Rate so hoch? → `actual_current_J3.vMax` + `joint_temperature_J5.vStd` dominieren"). Das ersetzt im MVP den Anomaly-Drilldown.
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

**Voraussetzung demo-tauglich:** foreign-Datensatz mit **sprechenden Feldnamen** (LLM kann semantisch mappen). Kandidaten:
- **PHM Society 2021 SCARA (CSEM)** — strukturell stark anders als UR5-NIST (4-DOF Pick-Cycle-Aggregate vs. 6-DOF Joint-Stream, eingebaute `DurationPickToPick`-Semantik, class_0/class_2-12-Labels). Ergibt den schärfsten Schema-Kontrast und damit den überzeugendsten Drop-in-Moment.
- **AI4I 2020** (`Torque`, `Rotational speed`, `Tool wear`) — generisch-industrielles Komplement, beweist „funktioniert auch außerhalb der Robotik".
- **Microsoft Azure PdM** (`volt`, `rotate`, `pressure`, `vibration`) — Fleet-Komplement.

Entscheidung in Runde 2 (`decisions.md`).

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
- **Klassisches RUL-Regression** (wie in C-MAPSS) ist verworfen — die UR5-NIST-Daten sind keine Run-to-Failure-Trajektorien (~69 s Snapshots, 3 Wiederholungen pro Konfiguration). RUL wird abgeleitet aus kumulierter Wear Rate ÷ nominaler Lifetime.
- **Video-basierte Roboter-Datasets** (ViFailback, RoboFAC, Humanoid Everyday, ARMBench) sind verworfen — Vision-Pipeline im 24-h-Fenster nicht machbar.
- **Zusätzliche Hersteller-Datasheets** (ABB/FANUC/KUKA, weitere UR-Modelle) sind optional; im MVP reicht das offizielle UR5-Datenblatt aus dem NIST-Bundle plus 2–3 synthetische Alternativ-Profile für den Flotten-Bank-View. Synthetische Werte werden im Pitch transparent als Hackathon-Vereinfachung genannt.
- **Multi-Roboter-Flotte** wird im Bank-View simuliert (10–20 synthetisch generierte Roboter mit unterschiedlichem Nutzungsprofil, alle auf Basis des UR5-NIST-Modells; Heterogenität entsteht über Streuung der Datasheet-Konstanten und der gestreamten Last-Profile).

---

## Offene Entscheidungen (Runde 2)

- **Wahl Foreign-Datensatz** — **PHM SCARA** (schärfster Schema-Kontrast: 4-DOF Pick-Cycle-Aggregate vs. UR5 6-DOF Joint-Stream) vs. AI4I 2020 (generisch-industriell) vs. Azure PdM (Fleet). Empfehlung: PHM SCARA als primärer Foreign, AI4I als Sekundär-Demo.
- **Pick-Detektion in UR5-NIST** — TCP-Z-Bewegungs-Heuristik, Joint-Velocity-Muster oder Run-Index-Aggregation? Entscheidung vor Training.
- **Wahl Wear-Rate-Modelltyp** — LightGBM + SHAP oder kleines NN + SHAP. Entscheidung vor Training.
- **Konkrete Label-Formel** — Exponent α für Basquin, Referenz-Temperatur T_ref, Gewichtung Zyklusrate, Aggregator über die 6 Joint-Ströme/-Temperaturen (max, mean, p95). Wird in `decisions.md` fixiert, bevor Training startet.
- **IFRS-16-Simulator** — deterministische Python-Formel oder LLM-generierte Narrative als Teil des Deal-Desk-Agent?

---

*UNIFI · Financial Infrastructure for the Robotics-as-a-Service Economy*
