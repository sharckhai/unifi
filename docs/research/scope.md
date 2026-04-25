# Research Scope — aktiver Stand

**Stand: 2026-04-25.** Primary ist **NIST UR5-Degradation**. Konzept-Referenz: `docs/idea-concept/unifi_konzept_v2.md`.

> Vollständiger Discovery-Scope vom 2026-04-24 (Foreign-Bewertungskriterien-Historie, Robotik-Priorität-Hierarchie, alle Discovery-Quellen) liegt unter `archive/2026-04-24-discovery/scope.md`.

## Ziel

Datenbasis für den UNIFI-Prototyp festlegen, bevor Code geschrieben wird. Der Primary trägt Wear-Rate-Training und CFO-View-Streaming; ein Foreign-Datensatz trägt die UCS-Live-Demo (LLM-Function-Call-Schema-Mapping); Hersteller- und Finanz-Konstanten machen die Kosten-Engine plausibel.

## Drei aktive Arbeitsfelder

### 1. Trainingsdaten

**Primary entschieden:** NIST UR5-Degradation. 6-DOF Cobot, 73 Felder, 125 Hz, explizite Payload/Speed/Coldstart-Stratifikation, lokal vorhanden. Detail-Block mit UCS-Mapping in `datasets.md`.

**Foreign-Top entschieden (vorbehaltlich Lizenz):** PHM Society 2021 SCARA. Schärfster Schema-Kontrast (4-DOF Pick-Cycle-Aggregate vs. UR5 6-DOF Joint-Stream). Detail-Block in `datasets.md`.

**Foreign-Alternativen für UCS-Demo:** AI4I 2020 (generisch-industrielles Komplement) und Azure PdM (Fleet-Komplement). Detail-Blöcke in `datasets.md`.

### 2. Hersteller-Normalisierungskonstanten

Datasheet-Werte sind die **Normalisierungs-Basis**, kein statischer Wear-Multiplier. Pflicht-Profil: **UR5** (offizielles Datenblatt aus dem NIST-Bundle). Plus 2–3 synthetische Alternativ-Profile für die Bank-View-Flotten-Demo. Schema und Werte siehe `mechanics.md`.

### 3. Finanz-Referenzdaten

Konstanten und Benchmarks für plausible Cost-per-Pick- und Restwert-Werte: Industrie-Strompreis DE 2025/2026, Wartungskosten-Quote, Equipment-Leasing-Zinsen, IFRS-16-Beispielrechnungen, Restwert-/Abschreibungskurven. Sammelort: `financials.md`.

## Aktuelle Phase: Pre-Build-Fixes

1. **Lizenzen verifizieren** — UR5-NIST + PHM SCARA, vor öffentlichem Commit.
2. **Pick-Detektion in UR5-NIST** entscheiden (TCP-Z-Heuristik vs. Joint-Velocity-Muster vs. Run-Index-Aggregation).
3. **Label-Konstruktionsformel** fixieren — Basquin-Exponent α, Referenz-Temperatur T_ref, Aggregator über 6 Joints. Vor Training in `decisions.md`.
4. **Hersteller-Profil UR5** in `mechanics.md` aus dem offiziellen Datenblatt aufbauen + 2–3 synthetische Alternativen.
5. **Finanz-Konstanten** in `financials.md` auffüllen.

## Foreign-Bewertungskriterien (für künftige Kandidaten)

| Kriterium | Warum wichtig |
|---|---|
| Lizenz | muss Demo/Pitch erlauben |
| LLM-mappbare Feldnamen | UCS-Agent ist ein einzelner LLM-Function-Call — sprechende Spaltennamen machen Mapping demo-zuverlässig |
| Sichtbar andere Struktur als der Primary | der „Aha"-Moment entsteht durch Schema-Kontrast |
| Sensoren mit Wear-Rate-Input-Analog | Torque, Current, Temperature werten die Demo auf |
| Größe/Handling | klein reicht — wir trainieren nicht auf dem Foreign |
| Kein Vision-Datensatz | Vision-Pipeline ist nicht im Scope |

## Scope-Grenzen (bewusst nicht in dieser Phase)

- Kein Modelltraining, kein Feature-Engineering — kommt im Build-Schritt.
- Keine UI-Entscheidungen — CFO-View und Bank-View sind in `unifi_konzept_v2.md` festgelegt.
- Keine Live-Integration mit Herstellern/APIs — Prototyp läuft auf statischen Datensätzen plus Replay.
- Kein echter IFRS-16-Simulator — vereinfachte Formel reicht.
- Keine Anomaly Detection im MVP — konzeptionell verankert, im 24-h-Scope postponed.
- Keine Vision-Pipeline.
