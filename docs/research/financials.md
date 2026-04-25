# Finanz-Referenzdaten

Ziel: Konstanten und Benchmarks, damit Cost-per-Pick und Restwert im Prototyp plausible Größenordnungen haben. Keine Zeitreihen.

**Stand nach Konzept-v2 (2026-04-24):** Die Verschleiß-Komponente der Kosten-Engine wird dynamisch aus dem Wear-Rate-Modell gespeist (nicht aus einem festen Multiplikator pro Roboter-Modell). Damit sind die hier gesuchten Konstanten (Strompreis, Wartung, Zinsen, Abschreibungskurven) reine **Normalisierungs-Basis** für die Arithmetik — nicht Stellschrauben des ML-Modells. Pitch-Botschaft bleibt: „im Produktivsystem kommen diese Werte aus Kunden-ERP / Leasing-Verträgen; hier Hackathon-Defaults."

## Gesuchte Werte

### Energie
- Industrie-Strompreis Deutschland 2025/2026 in €/kWh (Netz- und Industrie-Tarif, mittlere Abnahme)
- Durchschnittlicher Energieverbrauch pro Roboter (kWh/h) je Klasse

### Wartung
- Jährliche Wartungskosten als % vom Neupreis (typischer Range 3–8 % — verifizieren)
- Wartungsintervalle in Betriebsstunden

### Finanzierung
- Typische Zinsen Equipment-Leasing DE 2025/2026 (effektiver Jahreszins)
- Typische Laufzeiten (3/5/7 Jahre)
- Restwert-Annahmen der Leasing-Branche für Industrie-Equipment

### IFRS 16
- Beispielrechnung "Leasing als Schuld": wie wandert eine Rate in den Abschluss?
- Covenant-Beispiele: ab welcher Eigenkapitalquote reagieren Banken typischerweise?
- Öffentliche Berichte/Cases zu IFRS-16-Impact im Mittelstand

### RaaS-Pricing (Marktvergleich)
- Gibt es öffentliche Pay-per-Pick-Preise (Formic, Locus, Vecna)?
- Alternativ: Pay-per-Hour-Preise für Cobot-Miete in DACH
- Falls nichts publik: plausibles Ranges aus TCO rückrechnen (Strom + Wartung + Kapital + Marge)

### Abschreibung
- Lineare vs. degressive Kurven — Standard für Industrie-Equipment in DE
- Steuerliche Nutzungsdauer Industrie-Roboter laut AfA-Tabelle

## Verwendung im Prototyp

Die Werte landen als **Konstanten in einem Config-File** (vermutlich `data/config.yaml` oder ähnliches), nicht hardcoded. Pitch-Botschaft: „im Produktiv-System kommen diese Werte aus dem Kunden-ERP / den Leasing-Verträgen — hier als Hackathon-Defaults".

## Findings

_(Quellen mit Link + Jahr + Wert. Beim Pitch muss jede Zahl auf eine Quelle zeigen können.)_
