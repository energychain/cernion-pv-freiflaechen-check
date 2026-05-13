# ☀️ PV Freiflächen Express-Check

> **Agentic-Hackathon Lauf #1** — Ein lauffähiges UI-Tool für Projektierer, das den Mehrwert von [Cernion a²mdm](https://github.com/energychain/cernion-energy-tools) demonstriert.

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-GitHub_Pages-e8b339)](https://energychain.github.io/cernion-pv-freiflaechen-check)
[![Cernion](https://img.shields.io/badge/Powered_by-Cernion_a²mdm-16213e)](https://github.com/energychain/cernion-energy-tools)
[![License](https://img.shields.io/badge/License-AGPL--3.0-blue)](LICENSE)

---

## 🎯 Der Use Case

**Medien-Anker:** Innovationspreis 3CON für Photovoltaik-Freiflächen — Projektierer klagen über Netzanschluss-Bürokratie und fehlende Transparenz bei der Kapazitätsprüfung.

> **„Als Projektierer einer PV-Freiflächenanlage möchte ich innerhalb von Minuten prüfen, ob der geplante Standort eine Anschlusskapazität hat und wie hoch die Netzengpass-Wahrscheinlichkeit ist — ohne Excel-Listen und E-Mails an den Netzbetreiber."**

---

## 🖥️ Was das Tool zeigt

| Feature | Beschreibung |
|---------|-------------|
| **Dashboard** | Portfolio-Übersicht aller PV-Anlagen mit KPIs (Gesamtleistung, Standort, Netzanschlusspunkt) |
| **Tagesverlauf** | Echtzeit-Chart der Erzeugungsdaten aus Cernion EDM (15-Min-Werte) |
| **Anlagenverzeichnis** | Tabellarische Übersicht aller MeLos mit Typ, Leistung, Inbetriebnahme |
| **Schnellprüfung** | Netzanschluss-Check per Standort + Leistung gegen Cernion Grid-Connection Validation |
| **API-Konfiguration** | Umschaltbar zwischen Dev- und Produktiv-API, Tenant-isoliert |

---

## 🏗️ Technischer Stack

| Ebene | Technologie | Begründung |
|-------|------------|------------|
| **Frontend** | HTML5 + CSS3 + ES6 (Vanilla) | Zero-Build, sofort deploybar, für Dritte transparent |
| **Styling** | [Pico.css](https://picocss.com) | Professioneller Dark-Mode ohne Build-Step |
| **Charts** | [Chart.js](https://chartjs.org) | Industriestandard, einfach, keine Toolchain |
| **Backend** | Cernion a²mdm Dev-API | Alle Daten aus Master-Data-Management |
| **Hosting** | GitHub Pages | Kostenlos, jeder Fork = eigene Demo-URL |

---

## 🚀 Schnellstart

### 1. Live-Demo testen
👉 **[energychain.github.io/cernion-pv-freiflaechen-check](https://energychain.github.io/cernion-pv-freiflaechen-check)**

### 2. Lokal ausführen
```bash
git clone https://github.com/energychain/cernion-pv-freiflaechen-check.git
cd cernion-pv-freiflaechen-check
# Einfach index.html im Browser öffnen — kein Server nötig
```

### 3. API-Konfiguration
- Standard: `http://10.0.0.8:3900/api` (Dev-API)
- Tenant: `agentic-hackathon`
- Für Produktion: URL und Token in den Einstellungen anpassen

---

## 💡 Der Cernion-Mehrwert

| Ohne Cernion | Mit Cernion a²mdm |
|-------------|-------------------|
| Excel-Listen aus verschiedenen Systemen manuell zusammenführen | **Eine API** — alle MeLos, Zeitreihen und Metadaten zentralisiert |
| Netzanschluss-Prüfung per E-Mail beim Betreiber (Tage) | **Sofort-Prüfung** via deterministischer Validierung |
| Keine Tenant-Isolation — Daten vermischen sich | **Tenant-isoliert** — jeder Kunde sieht nur seine Daten |
| Statische Reports, keine Echtzeit | **Live-Charts** aus 15-Min-Zeitreihen direkt aus der Datenbank |
| Keine Auditierbarkeit | **Deterministische Pipeline** — gleiche Eingabe = gleiches Ergebnis (BNetzA-tauglich) |

---

## 📊 Demo-Daten (Tenant: `agentic-hackathon`)

| MeLo-ID | Name | Typ | Leistung | Standort |
|---------|------|-----|----------|----------|
| `melo-pv-freiflaeche-01` | PV Freifläche Hockenheim | Freifläche | 8,2 MWp | 68766 Hockenheim |
| `melo-pv-dach-02` | PV Dach Halle Ost | Dach | 450 kWp | 68766 Hockenheim |
| `melo-pv-freiflaeche-03` | PV Freifläche Sandhausen | Freifläche | 5,0 MWp | 69207 Sandhausen |
| `melo-anschluss-hv` | Netzanschluss HV Industrie | Anschlusspunkt | 15 MW | 68766 Hockenheim |

Alle Zeitreihen sind synthetisch, aber physikalisch plausibel (Sinus-Verlauf mit Kapazitätsfaktor ~75%).

---

## 🧩 Architektur

```
┌─────────────────────────────────────────┐
│  GitHub Pages (Static HTML/JS/CSS)      │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐  │
│  │  HTML   │ │  Chart   │ │  API.js  │  │
│  │  Shell  │ │   .js    │ │  Client  │  │
│  └────┬────┘ └────┬─────┘ └────┬─────┘  │
│       └────────────┴────────────┘        │
│                   │ Fetch API            │
└───────────────────┼─────────────────────┘
                    │
        ┌───────────┴────────────┐
        │  Cernion a²mdm Dev-API  │
        │  127.0.0.1:3900 /        │
        │  10.0.0.8:3900           │
        ├──────────────────────────┤
        │  EDM Service             │
        │  Grid-Connection Service │
        │  (Tenant-isoliert)       │
        └──────────────────────────┘
```

---

## 📄 Lizenz

AGPL-3.0 — wie das komplette [cernion-energy-tools](https://github.com/energychain/cernion-energy-tools)-Ökosystem.

---

## 🙋‍♂️ Autor

Erstellt im Rahmen des **Cernion Agentic Hackathon 2026** von Thorsten Zörner & Hermes Agent.  
Betrieben von [STROMDAO GmbH](https://stromdao.com).
