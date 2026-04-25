# Archive — Discovery-Phase 2026-04-24

Dieser Ordner konserviert den vollständigen Stand von `scope.md` und `datasets.md` zum Ende der Discovery-Runde am **2026-04-24** (Konzept-v2-Finalisierung mit PHM SCARA als Primary).

## Warum archiviert

Am **2026-04-25** wurde der Primary-Datensatz auf **NIST UR5-Degradation** umgestellt (siehe `docs/idea-concept/unifi_konzept_v2.md` → Update-Banner und `docs/research/decisions.md`). Damit veraltete der Großteil der Discovery-Dokumentation:

- 13+ Datensatz-Detail-Blöcke in `datasets.md` (Robot Execution Failures, FEMTO/PRONOSTIA, IMS, CWRU, XJTU-SY, NASA C-MAPSS/N-CMAPSS/Milling/Battery/IGBT, CARE Wind Turbine, MetroPT, Kitting, viele Vision-Datensätze, …) sind als `verworfen` oder `Backup` markiert und für die laufende Implementierung nicht mehr relevant.
- `scope.md` enthielt die Discovery-Hierarchie und Bewertungskriterien aus der v1-Phase, die mit der UR5-NIST-Wahl strukturell überholt sind.

Statt die aktiven Files mit historischer Last weiter mitzuschleppen (>1100 Zeilen `datasets.md`), wurde der Stand hier eingefroren und in den aktiven Files nur die heute relevanten Inhalte behalten.

## Was hier liegt

- **`scope.md`** — Vollversion vom 2026-04-24, inkl. Discovery-Phase-Beschreibung, Foreign-Bewertungskriterien-Historie, Robotik-Priorität-Hierarchie.
- **`datasets.md`** — 1156 Zeilen, alle 30+ Discovery-Kandidaten mit Detail-Blöcken (auch verworfene).

## Wann hier reinschauen

- Wenn ein verworfener Datensatz erneut in Frage kommt (z.B. weil ein Plan-B nötig ist).
- Wenn die Discovery-Begründung für eine bestimmte Wahl nachgeschlagen werden muss.
- Bei Audit / Review der Datensatz-Selektion.

Sonst: **die aktiven Files unter `docs/research/` sind autoritativ.**
