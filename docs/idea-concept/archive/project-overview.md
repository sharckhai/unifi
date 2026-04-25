# UNIFI – Financial Infrastructure for the Robotics-as-a-Service Economy

> **Hinweis:** Der folgende One-Pager wurde ursprünglich unter dem Arbeitsnamen **„Torq"** (April 2026) erstellt. Das Projekt heißt inzwischen **UNIFI**. Inhalt unverändert übernommen, Namensreferenzen bleiben im Original.

---

## One-Pager

### Das Problem

Robotik-Automatisierung scheitert nicht an der Technik, sondern an der Finanzierung:

- **Die Investitionshürde:** Ein Roboter kostet 30.000–100.000 €. KMU können sich das nicht leisten. Also Leasing? Seit IFRS 16 (2019) müssen Leasingverträge als Schulden in der Bilanz stehen – als hätte die Firma einen Kredit aufgenommen. 10 Roboter à 30.000 € = 300.000 € Verbindlichkeiten.
- **Die Folgen für den Kunden:** Eigenkapitalquote sinkt → Kredit-Rating verschlechtert sich → Banken verlangen höhere Zinsen auf *alle* Kredite → bestehende Kreditvereinbarungen (Covenants) können brechen → Hausbank kürzt Kontokorrent. Der Kunde wollte produktiver werden und hat sich die Kreditwürdigkeit ruiniert.
- **Die Restwert-Blackbox:** Was ist ein Roboter nach 3 Jahren noch wert? Leichtbetrieb = fast neu. Schwerbetrieb 24/7 = Schrott. Weil niemand das messen kann, kalkulieren Banken mit extremen Sicherheitsabschlägen → Raten werden unnötig teuer oder die Finanzierung wird abgelehnt.
- **Das Sereact-Dilemma:** Software-Firmen wie Sereact wollen Pay-per-Pick anbieten, müssten dafür aber Roboter selbst kaufen und vermieten. Dann binden sie Kapital, blähen ihre Bilanz auf, und sind plötzlich keine Software-Company mehr – sondern eine Bank.

### Die Idee

Wir bauen den **Financial Layer für Robotik** – eine Plattform, die Roboter-Sensordaten in bankenfähige Finanzdaten übersetzt. Damit kann jeder Roboter-Hersteller oder Software-Anbieter seinen Kunden ein Pay-per-Pick-Modell anbieten, ohne selbst Kapital zu binden.

### Das Produkt

Unsere Plattform sitzt auf bestehender Roboter-Telemetrie und liefert drei Outputs:

- **Abrechnungs-Engine** – Exakte Kosten pro Pick/Werkstück (Energie, Verschleiß, Kapital, Wartung)
- **Robot Credit Score** – Dynamischer Restwert und Restlebensdauer in Echtzeit, basierend auf Nutzungsdaten
- **RaaS-Konfigurator** – Generiert Pay-per-Pick-Angebote mit bilanzieller Auswirkungsanalyse

### Vorteile pro Stakeholder

#### Mieter (Endkunde / CFO)

- Roboter als OpEx statt Schulden – IFRS 16-konform als Dienstleistung, Bilanz bleibt sauber
- Kein Einfluss auf Kredit-Rating – Eigenkapitalquote, Covenants und Bankkonditionen bleiben intakt
- Usage-based Pricing – Leichtbetrieb zahlt weniger als Schwerbetrieb, fair statt pauschal
- Null Restwert-Risiko – Kunde gibt den Roboter zurück wenn er ihn nicht mehr braucht
- Skalierbar ohne Kapitalbindung – 10 Roboter in der Hochsaison, 3 im Sommer
- Planbare Stückkosten – bei jedem Auftrag exakte Kalkulation der Roboterkosten

#### Vermieter (Sereact, Integratoren)

- Asset-light bleiben – kein eigenes Kapital in Hardware binden, Bewertung bleibt hoch
- Kein Finanzteam nötig – Pricing, Abrechnung, Bank-Reporting läuft über die Plattform
- Attraktiveres Angebot – Pay-per-Pick statt 100.000 € Invest, mehr Market Share
- Kürzerer Sales-Cycle – von Monaten (Vorstandsbeschluss) auf Tage (einfach ausprobieren)
- Weniger Churn – laufendes Vertragsverhältnis statt einmaliger Verkauf
- Jeder kann RaaS werden – horizontale Plattform statt alles selbst bauen

#### Banken / Leasinggeber

- Blackbox verschwindet – Echtzeit-Einsicht in Verschleiß und Restwert jedes einzelnen Roboters
- Laufendes Monitoring – Live-Dashboard statt einmaliger Bewertung bei Vertragsabschluss
- Cashflow-Transparenz – Nutzungsdaten = Umsatzdaten, Bank sieht ob Geld fließt
- Neue Asset-Klasse mit Rendite – ähnlich Flugzeug-/Baumaschinen-Leasing
- Portfolio-Diversifikation – 500 Roboter bei 50 Kunden, Risiko gestreut

#### Hersteller (Neura, UR, FANUC)

- Größerer adressierbarer Markt – mehr Firmen können Roboter mieten, die sich keinen Kauf leisten
- Mehr Absatz – nicht an Endkunden, sondern an SPVs und Leasinggeber, die über die Plattform finanzieren

### Markt & Abgrenzung

RaaS-Markt: **~2,5 Mrd. $ (2025)**, wächst auf **10–15 Mrd. $ bis 2035 (17–25% CAGR)**. Bestehende RaaS-Anbieter (Formic, Locus, Vecna) sind vertikal integriert – jeder baut eigene Abrechnung, eigenes Pricing, eigene Risikobewertung. **Es gibt keinen horizontalen Financial Layer.** Wir bauen nicht RaaS, wir *ermöglichen* RaaS.

### Was ist neu?

- Kein RaaS-Anbieter übersetzt Telemetrie in einen bankenfähigen, standardisierten Restwert
- Kein horizontaler Finanz-Layer, den Sereact, Integratoren oder Leasinggeber als Plug-in nutzen können
- Keiner macht die bilanzielle Auswirkung (OpEx vs. IFRS 16-Schuld) zum expliziten Verkaufsargument

---

## Additional Info

### Der „Unifi Certification Standard" (UCS)

Folgendes könnte eine gute Idee sein für den Hackathon und das Dashboard:

**Die Unifi-Lösung:** Unifi fungiert als **Orchestrator zwischen Kapitalgebern, Hardware-Produzenten und Software-Anbietern**. Wir nutzen Sereact als strategischen Launch-Partner für die KI-Intelligenz. Um jedoch Klumpenrisiken zu vermeiden, ist die Plattform für jeden Anbieter offen, der den UCS erfüllt.

Dieser Standard definiert Anforderungen an:

- Telemetrie-Schnittstellen
- Cyber-Security
- „Edge-Anonymization"

Damit wird Unifi zum **„Visa-Netzwerk" für automatisierte Arbeit**.

**Alternative Interpretation:** UCS kann auch als interner Standard für Roboter-Mechaniken und Verschleiß-Metriken verstanden werden. Man bringt eingehende Roboterdaten zuerst in die einheitliche UCS-Form, und der Algorithmus fittet sich darauf.
