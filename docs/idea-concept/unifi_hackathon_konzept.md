# Unifi
**Hackathon-Konzept · Feature-Übersicht · April 2026**

Ein funktionsfähiger Prototyp, der zeigt, wie Roboter-Telemetrie in bankenfähige Finanzdaten übersetzt wird. Zwei Views als Hero (CFO und Bank), ein UCS-Agent als Horizontalitäts-Beweis, ein Deal-Desk-Agent als Angebots-Generator. Gebaut solo in 24 Stunden.

---

## Datensatz

Noch offen. Als starker Kandidat steht der **NASA C-MAPSS Turbinen-Verschleiß-Datensatz** — öffentliche Zeitreihen zu Turbofan-Degradation mit sauberen Restlebensdauer-Labels und umfangreicher Benchmark-Literatur. Wir framen "1 Zyklus = 1 Pick" und erzählen die Story, als wäre jeder Datensatz ein Roboter in einem Logistik-Lager. Alternativen wie AI4I 2020, Microsoft Azure Predictive Maintenance oder CASPER bleiben auf dem Tisch; die Entscheidung fällt kurz vor dem Build nach Abwägung von Datenqualität vs. Robotik-Nähe. Dass es im Prototyp keine echten Roboter-Daten sind, ist für den Pitch unerheblich — wir positionieren uns ohnehin als Infrastruktur-Schicht über Operator-Daten wie denen von Sereact.

---

## UCS-Agent (Unifi Certification Standard)

Der strategisch wichtigste Teil. Jeder Roboter-Hersteller hat andere Sensor-Namen, andere Skalen, andere Zeitformate. Der UCS-Agent nimmt einen fremden Datensatz entgegen, erkennt, was was ist, und schlägt ein Mapping auf unsere kanonischen Felder vor — Zyklen, kumulative Last, Vibration, Temperatur-Delta. Auf der Bühne: zweites CSV droppen → Agent analysiert live → "dein *torque_nm* ist unser *load_cumulative*" → User bestätigt → Daten fließen durch das *gleiche* Modell und die *gleiche* Kosten-Engine wie der erste Datensatz. Das ist der Horizontal-Infrastruktur-Beweis in dreißig Sekunden. Ohne diesen Moment bleibt der Prototyp ein schönes Dashboard für einen einzigen Roboter-Typ.

---

## ML-Modell

Sagt für jeden Roboter zwei Dinge voraus: einen **Health Score** von 0–100 (wie gut geht es der Maschine gerade?) und die **verbleibende Lebensdauer** in Zyklen. Daraus leiten wir den **aktuellen Restwert in Euro** ab — über eine degressive Abschreibungskurve, die wir im Pitch transparent als Hackathon-Vereinfachung kennzeichnen. Technisch LightGBM, nicht Deep Learning — schnell, robust, erklärbar. Auf der Bühne kann man sagen "der Vibrationspeak bei Zyklus 142 hat den Score um 8 Punkte gedrückt", und das stützt die Glaubwürdigkeit mehr als eine blackbox-artige LSTM-Vorhersage.

---

## Kosten-Engine

Reine Arithmetik, kein ML — aber die Brücke zwischen Sensor-Welt und Finanz-Welt. Nimmt den Modell-Output plus Betriebsdaten und berechnet live die Stückkosten pro Pick, aufgeschlüsselt in:

- **Energie** — gemessener Verbrauch × kWh-Preis
- **Verschleiß** — Wertverlust im Zeitraum / Anzahl Picks (gespeist aus dem ML-Modell)
- **Kapital** — Finanzierungskosten / erwartete Gesamt-Picks über die Lebensdauer
- **Wartung** — erwartete Wartungskosten / Picks zwischen Wartungsintervallen

Ohne diese Engine hätten wir nur einen Health Score; mit ihr haben wir Euro-pro-Pick — und damit das, worüber Banken und CFOs tatsächlich reden.

---

## CFO-View (Hero)

Der CFO der Mieter-Firma, also des KMU, das die Roboter nutzt aber nicht besitzt. Die Hero-View, weil hier die IFRS-16-Story zum ersten Mal wirklich sichtbar wird — und das kann keiner der Wettbewerber.

- **Live Cost-per-Pick-Tile** — große Zahl, tickt mit jedem Pick, Hover zeigt Breakdown
- **Monthly Bill Preview** — akkumulierend, mit Hochrechnung auf Monatsende
- **Usage-Chart** — Picks pro Stunde über die letzten 24h
- **Bilanz-Vergleicher** — Split-Screen "IFRS-16-Leasing" (rot, Covenant-Warnung) vs. "Unifi-Service" (grün, saubere OpEx). Der Moneyshot der Demo.
- **Szenario-Buttons** — Leichtbetrieb / Schwerbetrieb / Saisonpeak, ändern live alles
- **"Angebot anfragen"-Button** — triggert den Deal-Desk-Agent

---

## Bank-View

Der Financier sieht die Flotte als **neue Asset-Klasse** — analog zu Flugzeug- oder Baumaschinen-Leasing, aber endlich mit Echtzeit-Transparenz statt jährlichem Gutachten.

- **Robot Credit Score** — zusammengesetzter Wert aus Health Score, Restwert und Cashflow-Deckung. Unser Kern-Output an die Bank.
- **Fleet-Tabelle** — alle Roboter mit Health, RUL, Restwert (€), Daily Revenue, Risiko-Ampel
- **Portfolio-Kennzahlen** — Collateral Value gesamt, gewichteter Flotten-Health, Konzentrationsrisiko
- **Drilldown** — Klick auf einzelne Maschine zeigt Health-Verlauf und Feature-Importance ("warum ist der Score gefallen?")
- **Cashflow-Proof** — aggregierte tägliche Einnahmen aus Pay-per-Pick über die ganze Flotte. Killer-Argument: die Raten fließen aus echtem Umsatz, nicht aus Versprechen.

---

## Deal-Desk-Agent

Der zweite Skill des Agents, der strategisch den Kreis schließt. Operator (oder im Prototyp du als Demonstrator) gibt Kundenparameter ein — Volumen, Saisonalität, grobe Bilanzdaten — und der Agent generiert ein strukturiertes Angebot: Pay-per-Pick-Preis, erwartete Monatsrechnung, Bilanz-Impact-Simulation mit Vorher/Nachher. Im Hintergrund ruft er die Kosten-Engine und den IFRS-16-Simulator als Werkzeuge auf. Das Ergebnis wird nicht als Chat-Blase gerendert, sondern als fertige Angebots-Ansicht im CFO-View — genau das, was in realen Sales-Calls gezeigt würde. Damit ist der Agent nicht nur Deko, sondern produziert den tatsächlichen Geschäftsoutput von Unifi.

---

## Bewusst weggelassen

Eine vollwertige Operator-View. Sie bleibt minimal — ein paar KPI-Kacheln und der UCS-Onboarding-Button, mehr nicht. In 24 Stunden muss man zwei Views richtig gut bauen, nicht drei halbgut. Und weil der CFO-View die emotionale Geschichte trägt und der Bank-View die Asset-Klasse beweist, sind das die richtigen zwei.

---

*Unifi · Financial Infrastructure for the Robotics-as-a-Service Economy*
