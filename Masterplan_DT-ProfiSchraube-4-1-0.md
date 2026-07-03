# 🔩 DT-ProfiSchraube — Masterplan
## Schraubenberechnung nach VDI 2230 Blatt 1 mit vollständiger, dreisprachiger Rechenweg-Dokumentation

═══════════════════════════════════════════════════════════════════════════
Version : 4.1.0
Stand   : 2026-07-03
Status  : **Implementierung läuft, Engine vollständig & testverifiziert.**
          Rechen-Engine R0–R13 (zentrisch), Eingabe-Validierung, Oberfläche,
          Dreisprachigkeit DE/EN/PT (inkl. **aller** Formel-/Werte-Beschriftungen
          im Rechenweg), der dokumentierte selbstprüfende Rechenweg und das
          Verspannungsschaubild stehen. **Vollständiger R11-Nachweis
          (Mindesteinschraubtiefe) und SV/SG-Dauerfestigkeit** sind normbelegt
          umgesetzt. **R10 prüft jetzt Montage- UND Betriebszustand** (kleineres
          S_P maßgeblich). Werkstoffdaten (τ/Rm, E-Modul, p_G) liegen in
          **einer vereinheitlichten Tabelle** (single source of truth) und werden
          über Werkstoff-Dropdowns mit „eigener Wert"-Haken vorbelegt.
          Ein **kompletter Bug-Report-Durchgang** (A1–A6, B1–B3, C1–C3) ist
          abgearbeitet; Details in Abschnitt 4.8 und Changelog v4.1.0.
          **Testverifiziert: 2.209.690 Assertions, 0 Fehler.**
          Noch offen: Ausgabe/Bericht (PDF/RTF/CSV/PNG), 2D-Schnitt,
          Flansch-Torsion als eigener Lastfall (Momentfelder M_Ymax/q_M/r_a
          sind bereits vorhanden), Inline-SVG-Skizzen, exzentrische Last,
          Dehnschrauben, Build/Obfuskierung.
Produkt : DT-ProfiSchraube — modular entwickelt (**8 flache Dateien** + Dev-Harness)
          → zur Auslieferung EINE gebündelte Offline-Datei (Handy/Tablet/PC)
Modell  : Einmalkauf (Vollversion) + eingeschränkte kostenlose Testversion (ohne Ausgabe)
Sprachen: Deutsch · Englisch · Português — **vollständig** (Bedienung, Feldtexte,
          Hilfe/Info, Auswahl-Hinweise, Prüfmeldungen, Engine-Hinweise, Rechenweg
          inkl. Formel- und Werte-Beschriftungen). Norm-Symbole bleiben sprachneutral.
GitHub  : Pages-Ordner (live) https://dietertepe.github.io/dt-profischraube.de/
          Referenz-Schwester   https://dietertepe.github.io/dt-profidreieck-web/
═══════════════════════════════════════════════════════════════════════════

---

## 📋 Inhaltsverzeichnis

0. [Für den neuen Chat zuerst lesen — Wiederanknüpfen, Arbeitsweise, Leitplanken](#0)
1. [Technische Recherche (Normfundament, verdichtet)](#1)
2. [Software-Architektur — modular entwickeln → eine Datei ausliefern](#2)
3. [UI/UX-Design, Style & Optik (Profi-Look)](#3)
4. [Aktueller Implementierungsstand (das Herz dieser Version)](#4)
5. [Umsetzungs-Roadmap — erledigt & offen](#5)
6. [Changelog](#6)

═══════════════════════════════════════════════════════════════════════════

<a id="0"></a>
## 0. Für den neuen Chat zuerst lesen — Wiederanknüpfen, Arbeitsweise, Leitplanken

> **Diese Datei ist das maßgebliche Wissensdokument für „DT-ProfiSchraube".** Ein frischer Chat weiß damit sofort, *was* gebaut wird, *wie* wir zusammenarbeiten, *welche* Leitplanken gelten, *wie weit* wir sind und *wo* es weitergeht. **Vor der ersten Aktion komplett lesen.**

### 0.1 Was wird gebaut (ein Absatz)
**DT-ProfiSchraube** berechnet Schraubenverbindungen nach **VDI 2230 Blatt 1** (Ausgabe 2015), Schritte **R0–R13**, zentrisch (exzentrisch vorbereitet). Jeder Schritt wird als nachvollziehbarer Rechenweg gezeigt (**Formel → eingesetzte Werte → Ergebnis**), mit Sicherheitsnachweisen (S_F, S_D, S_P, S_G **und S_A** = Einschraubtiefe). Es ist Nachweis- **und** überschlägiges Vorauswahl-Werkzeug. **Modular entwickelt** (getrennte JS-/CSS-/Daten-Dateien in EINEM Ordner) und für die Auslieferung in **EINE Offline-Datei** gebündelt — läuft ohne Installation und ohne externe Abhängigkeiten auf Handy, Tablet und PC.

### 0.2 ► WO WIR STEHEN & WAS ALS NÄCHSTES KOMMT (Wiederanknüpf-Punkt)
**Fertig und testverifiziert (2.209.690 Assertions, 0 Fehler):**
- Engine **`0.8.0-engine`**: R0–R13 zentrisch, inkl. **vollständigem R11-Nachweis** (Gewinde-Scherquerschnitte, R_S, C1/C2/C3, m_min, m_zu, S_A) und **SV/SG-Dauerfestigkeit** (Auto-Auswahl über Eingabefeld, Rückfall SV bei Bereichsverletzung).
- **R10 Flächenpressung im Montage- UND Betriebszustand** (p_max aus F_Mzul bzw. F_Smax; kleineres S_P ist maßgeblich; Ergebnis trägt `p_max_M/B`, `S_P_M/B`, `governing`; Hinweis `ASSUME_SP_OPERATING`).
- **R12 mit Drehmoment um die Schraubenachse** verdrahtet: Felder `M_Ymax`, `q_M`, `r_a` (Gruppe Belastung, advanced) + Cross-Validation (`MY_NEEDS_QM`/`MY_NEEDS_RA`/`MY_WITHOUT_FQ`). Basis für „Flansch-Torsion als eigener Lastfall".
- **Vereinheitlichte Werkstofftabelle** in `daten.js` (`TAU_RATIO`, 8 Werkstoffe): je Werkstoff `ratio` (τ_B/R_m), `E` (E-Modul), `pG` (Grenzflächenpressung), `rmDefault`, `grade`, `src`, `label{de,en,pt}` — **normbelegt** (VDI 2230:2015 via ing-hanke/schweizer-fn/Ruoss).
- **Werkstoff-Dropdowns mit „eigener Wert"-Haken** (Muster `fillFromMaterial`): Werkstoffgruppe → `Rm_M`; **Plattenwerkstoff** → `E_P` **und** `p_G`. Ohne Haken vorbelegt & gesperrt (mit Herkunftshinweis), mit Haken frei editierbar.
- **Rechenweg vollständig dreisprachig** — auch alle deutschen Formel-/Werte-Beschriftungen sind über den Helfer `LT(de,en,pt)` übersetzt (Formelzeichen bleiben sprachneutral). R11-, SG-, R10-Doppel- und R12-Momentschritte sind enthalten und gegen die Engine geprüft.
- **Verspannungsschaubild** (`schaubild.js`) live gezeichnet, dreisprachig, dezent gefülltes Dreieck, Zahlenwerte in der HTML-Legende (`sb-vals`).
- **Robustheit/UI gehärtet** (Bug-Durchgang v4.1.0): tanPhi-Clamp gegen NaN, δ_P-Duplikat-Guard-Test, kein `innerHTML` mit Werten mehr, Null-sichere Event-Bindung, Modal-Focus-Trap, Print-Disclaimer sichtbar, R11 im Step-Strip, korrekte Versionsanzeige. **Vollständige Liste in Abschnitt 4.8.**

**► NÄCHSTES ZIEL (zu Sessionbeginn kurz bestätigen): Ausgabe/Bericht.**
Browser-Druck + **self-hosted** PDF (jsPDF), RTF (Word), CSV (Werte) und Diagramm-PNG/SVG; bibliotheksfrei/offline. Der Bericht nimmt Schaubild + vollständigen Rechenweg mit. **Wichtig:** Der Haftungs-Disclaimer + die Normzeile müssen im PDF/Ausdruck erscheinen (Print-CSS ist dafür bereits vorbereitet, siehe 4.8/A4). Neues `report.js` als 9. Modul, `jspdf.min.js` self-hosted. Danach in bestätigter Reihenfolge: 2D-Schnitt → Flansch-Torsion als eigener Lastfall (Momentfelder liegen schon) → Inline-SVG-Skizzen → exzentrische Last → Dehnschrauben → Build/Obfuskierung + `_Pro.html`. Details in Abschnitt 5.

**► PARALLEL OFFEN (jederzeit einschiebbar): `TAU_RATIO`-Quellenabgleich.**
Die Scherfestigkeitsverhältnisse τ_B/R_m sind belegte Literatur-Richtwerte, aber noch nicht gegen eine einzelne zitierbare VDI-2230-Quellpaarung final gegengeprüft (Codes `ASSUME_R11_BASIS`/`VALIDATE_R11`). Gemeinsam per Websuche eine zitierbare Quelle finden. Kein Blocker, aber vor Produktivauslieferung zu klären.

### 0.3 So knüpfen wir nach einem Absturz sauber an (Recovery-Protokoll)
1. **Dateien im Projekt-Ordner sind die Wahrheit.** Alle aktuellen Dateien liegen im Projekt-Ordner (Dieter pflegt sie dort). Zu Beginn: Projektdateien nach `/home/claude/dt/` kopieren und dort arbeiten (Container wird zwischen Sessions zurückgesetzt — im Container erzeugte Zwischenstände gehen verloren, deshalb nach jeder Änderung ausliefern).
2. **Grün-Basislinie herstellen:** `node test_solver.js` → muss **2.209.690 (oder mehr) Assertions, 0 Fehler** zeigen. Erst dann weiterbauen.
3. **Diesen Masterplan lesen**, den Wiederanknüpf-Punkt (0.2) prüfen, das nächste Ziel kurz bestätigen, dann erst coden.

### 0.4 Standard-Arbeitsablauf je Aufgabe (bewährt)
1. **Plan in Worten** kurz abstimmen (Deutsch). 2. Datei für Datei umsetzen (minimale Diffs). 3. `node test_solver.js` → **grün**. 4. Geänderte Dateien nach `/mnt/user-data/outputs/` kopieren. 5. `present_files`. 6. **Knappe deutsche Zusammenfassung**, welche Dateien zu überschreiben sind. Dieter prüft auf dem Handy und bestätigt („Super läuft.") vor dem nächsten Schritt.

### 0.5 Arbeitsprinzipien (nicht verhandelbar)
- **Korrektheit vor Umfang.** Jede Formel/jeder Fall wird **vor** der Integration im **Node.js-Testharness** verifiziert. Bestehende Tests werden **erweitert, nie gelockert**; ein rot werdender Test ist Lernsignal, nie Anlass, die Schwelle zu senken.
- **Post-hoc-Rechenweg, strikt getrennt.** `rechenweg.js` rechnet jeden nachrechenbaren Wert **unabhängig** neu und prüft ihn gegen den Solver (✓ = „gegen Engine geprüft"). Tief verschachtelte Norm-Physik (z. B. der Gewinde-Scherquerschnitt in m_min) wird als Engine-Wert angezeigt statt dupliziert — **kein Formel-Duplikat über Module hinweg** (single source of truth).
- **Erst besprechen, dann coden.** Plan/Umfang wird kurz abgestimmt; danach Datei für Datei, jeweils bestätigt.
- **Physikalische Konstanten nicht runden** (z. B. C_PITCH = 1/(2π), nicht 0,16; τ/Rm-Verhältnisse exakt aus der Norm). Norm-abhängige Restpunkte werden **explizit** als Annahme/offen getrackt, nichts wird still angenommen. **Ehrliche Herkunfts-Kennzeichnung**: unbelegte Werte (z. B. Magnesium-τ/p_G) tragen sichtbar „Schätzwert".
- **Immer dreisprachig (DE/EN/PT)** — Feldtexte, Hilfe, Meldungen, Engine-Hinweise **und** Rechenweg-Beschriftungen. Neue Beschriftungen in Formeln nutzen `LT(de,en,pt)`; Formelzeichen bleiben neutral.
- **Ausgiebige Laien-Erklärungen** in den ⓘ-Infos (nicht nur Fachbegriffe).
- **Immer vollständige Rechenwege** in der Ausgabe.
- **Tabellenwerte als Auswahl-Liste + „eigener Wert"-Haken**, wo immer sinnvoll (Muster `fillFromMaterial`, siehe 2.6). Auswahl immer im erlaubten Bereich & fehlerfrei.
- **Privacy-first / DSGVO als harte Vorgabe.** Keine externen Abhängigkeiten: kein CDN, keine Google Fonts, keine Fremd-Skripte. Alle Assets self-hosted (auch jsPDF, sobald PDF kommt).
- **Obfuskierung immer zuletzt**, nach dem Bündeln. Lesbare Master-Module bleiben lokal; die gebündelte, obfuskierte Datei ist die Distribution.
- **Sprache der Zusammenarbeit: Deutsch.** Dieter arbeitet ausschließlich am Handy.

### 0.6 Technische Leitplanken (Projektstruktur)
- **Alles in EINEM Ordner, keine Unterordner**, relative Pfade (keine absoluten GitHub-URLs → sonst Internet-Abhängigkeit + Datenabfluss).
- **Startdatei trägt den Programmnamen, nie `index`** — `DT-ProfiSchraube_Test.html` / `_Pro.html`. `index.html` ist ausschließlich die Landingpage.
- **Offline-Regeln (hart):** CSS via `<link>`, JS via klassische `<script src>` in Abhängigkeitsreihenfolge, Daten als **JS-Globals** (UMD). **Kein** `fetch`/JSON, **kein** ES-`import` (brechen über `file://`).
- **`<html lang="de" translate="no">` + `<meta name="google" content="notranslate">`** sind Pflicht — sonst verändert die Browser-Auto-Übersetzung das DOM und bricht u. a. den Sprachumschalter.
- **Modular entwickeln → eine Datei ausliefern.** Ein Build-Schritt inlinet vor der Auslieferung alle Module in eine Datei; danach Obfuskierung.
- **Test vs. Pro:** Engine **byte-identisch**; Pro schaltet Ausgabe/Export frei.

### 0.7 Scope-Entscheidungen
- **Standard-Schaftschrauben (zentrisch)** = umgesetzt. **Exzentrisch** strukturell vorbereitet (`operatingStress` akzeptiert σ_b), Verdrahtung offen.
- **Dehn-/Taillenschrauben (DIN 2510)** = Phase 2 (Bezugsquerschnitt A_0 umschaltbar, δ_S erweiterbar).
- **Mehrschraubenverbindungen / Blatt 2 (FEM)** = später optional, separates Modul.

═══════════════════════════════════════════════════════════════════════════

<a id="1"></a>
## 1. Technische Recherche (Normfundament, verdichtet)

> Der VDI-2230-Normtext ist kostenpflichtig/geschützt. Formeln und Werte stammen aus seriösen frei veröffentlichten Sekundärquellen. **Vor Produktivnutzung Originalnorm beschaffen und validieren.** Die vollständigen Datentabellen sind in `daten.js` implementiert — hier Struktur, Kernformeln und Quellen.

### 1.1 Schritte R0–R13 (Ausgabe 2015, maßgeblich)

| Schritt | Bezeichnung | Größe(n) | Umsetzung |
|---|---|---|---|
| R0 | Nenndurchmesser/Vordimensionierung | d, G | Geometrie ✅, A7-Vordim. offen |
| R1 | Anziehfaktor | α_A | ✅ (Verfahren/Direktwert) |
| R2 | Mindestklemmkraft | F_Kerf | ✅ (Eingang) |
| R3 | Kraftverhältnis / Nachgiebigkeiten | δ_S, δ_P, Φ_K, Φ_en | ✅ inkl. Verformungskegel (Fallunterscheidung) |
| R4 | Vorspannkraftänderungen | F_Z, ΔF′_Vth | ✅ (F_Z aus Setztabelle; ΔF′_Vth als Eingang) |
| R5 | Mindestmontagevorspannkraft | F_Mmin | ✅ |
| R6 | Maximalmontagevorspannkraft | F_Mmax | ✅ |
| R7 | Montagebeanspruchung | σ_red,M, F_Mzul | ✅ (90 % Ausnutzung, ν=0,9) |
| R8 | Betriebsbeanspruchung | σ_red,B, S_F | ✅ (σ_b vorbereitet) |
| R9 | Schwingbeanspruchung | σ_a, σ_A, S_D | ✅ **SV und SG vollständig** (Auswahl über Feld `threadFinish`) |
| R10 | Flächenpressung | p_max, S_P | ✅ (Montage- **und** Betriebszustand: F_Mzul bzw. F_Smax; kleineres S_P maßgeblich; p_G aus Werkstofftabelle) |
| R11 | Mindesteinschraubtiefe | m_min, S_A | ✅ **vollständig** (Gewinde-Scherquerschnitte, R_S, C1/C2/C3) |
| R12 | Gleiten, Abscheren | S_G, τ_max | ✅ Reibschluss; Abschernachweis-Funktionen vorhanden |
| R13 | Anziehdrehmoment | M_A | ✅ |

Drei Blöcke: R0–R2 (Vorgaben), R3–R6 (Verspannungsdreieck/Kräfte), R7–R13 (Nachweise).

### 1.2 Kernformeln (wie in der Engine implementiert)
- **Nachgiebigkeit Schraube** (Reihenschaltung): δ_S = Σ l_i/(E·A_i) über Kopf (0,5·d), Schaft, freies Gewinde, eingeschr. Gewinde (0,5·d), Mutter/Einschraubteil (0,4·d).
- **Nachgiebigkeit Platten** — Fallunterscheidung: Hülse (D_A ≤ d_w); Vollkegel (D_A ≥ D_A,Gr); Kegel + Hülse (dazwischen). Kegelwinkel empirisch: DSV `tanφ = 0,362 + 0,032·ln(β_L/2) + 0,153·ln(y)`, ESV `0,348 + 0,013·ln(β_L) + 0,193·ln(y)`, β_L = l_K/d_w, y = D_A/d_w. Verbindungskoeffizient w = 1 (DSV)/2 (ESV). D_A,Gr = d_w + w·l_K·tanφ.
- **Kraftverhältnis:** Φ_K = δ_P/(δ_S+δ_P); Φ_en = n·Φ_K.
- **Setzen:** F_Z = (f_Z/1000)/(δ_S+δ_P).
- **F_Mmin** = F_Kerf + (1−Φ_en)·F_A + F_Z + ΔF′_Vth; **F_Mmax** = α_A·F_Mmin.
- **F_Mzul** = ν·R_p0,2/√(1/A_S² + 3·(m/W_p)²), m = P/(2π)+0,577·μ_G·d_2, W_p = π/16·d_S³, ν = 0,9. (0,16/0,58 sind Rundungen von C_PITCH=1/(2π), C_FLANK=1/(2cos30°) — **in der Engine unrundiert**.)
- **M_A** = F_Mzul·(P/(2π) + 0,577·μ_G·d_2 + μ_K·D_Km/2), D_Km = (d_w+d_h)/2.
- **F_Smax** = F_Mzul + Φ_en·F_Ao − ΔF′_Vth. σ_z,max = F_Smax/A_S; σ_red,B = √(σ_z,max² + 3·(k_τ·τ)²), τ = M_G/W_p; S_F = R_p0,2/σ_red,B.
- **R9 (Schwingbeanspruchung):** σ_a = Φ_en·(F_Ao−F_Au)/(2·A_S) [A_0 bei Dehnschraube]; **σ_A,SV = 0,85·(150/d + 45)** (schlussvergütet); **σ_A,SG = (2 − F_Sm/F_0,2min)·σ_A,SV** (schlussgewalzt), gültig F_Sm/F_0,2min ≈ 0,3…1, sonst konservativ SV; S_D = σ_A/σ_a. F_Sm = F_Mzul + Φ_en·(F_Ao+F_Au)/2, F_0,2min = R_p0,2·A_S.
- **R10:** A_p = π/4·(d_w²−d_h²). Zwei Zustände: p_max,M = F_Mzul/A_p (Montage) und p_max,B = F_Smax/A_p (Betrieb, größte Schraubenkraft). S_P = p_G/max(p_max,M, p_max,B) — das **kleinere** S_P beider Zustände ist maßgeblich (bei Zuglast ist der Betrieb ungünstiger).
- **R11 (Mindesteinschraubtiefe) — Kern der neuen Arbeit:**
  - Gewinde-Scherquerschnitte je mm Eingriff: A_GM = π·d/P·(P/2 + (d−d_2)·tan30°) (Mutter, schert am Bolzen-Außen-Ø d); A_GS = π·D_1/P·(P/2 + (d_2−D_1)·tan30°) (Bolzen, schert am Mutter-Kern-Ø D_1). d_2 = d − 0,64952·P, D_1 = d − 1,08253·P.
  - Kräfteverhältnis **R_S = (τ_B,M·A_GM)/(τ_B,S·A_GS)**; R_S<1 → Innengewinde schert zuerst (Ast „innen"), R_S≥1 → Bolzengewinde (Ast „bolzen").
  - Korrekturfaktoren (VDI 2230-1, bestätigt bei Ruoss):
    **C3 = 0,728 + 1,769·R_S − 2,896·R_S² + 1,296·R_S³** (Innengewinde, R_S<1; = VDI Gl. **202** wortgleich; Randwert R_S≤0,4 → C3≈1,055).
    **C2 = 5,594 − 13,682·R_S + 14,107·R_S² − 6,057·R_S³ + 0,9353·R_S⁴** (Bolzengewinde, R_S≥1; C2(2,0)=1,1668 ≈ Ruoss 1,16).
    C1 = 1 (Annahme s/d ≥ 1,9).
  - m_min = F_mS / (τ_B,schwächer · A_G,schwächer · C · C1) mit **F_mS = 1,2·R_m,S·A_S** (RM_MAX_FACTOR = 1,2).
  - Zuschlag **m_zu = 2·P** (Durchsteck/Mutter, kritisches Innengewinde) bzw. **3·P** (ESV/Sackloch, Innensechskant: u≤2P + 1P). m_eff,vorh = m_vorh − m_zu; **S_A = m_eff,vorh / m_min**.
  - Bolzen-Verhältnis **τ_B,S/R_m,S = 0,62** (VDI 2230 Anhang B1/B5, Ruoss).
- **R12:** F_KQ,erf = F_Qmax/(q_F·μ_T) [+ M_Ymax/(q_M·r_a·μ_T)]; F_KR = F_Mmin − F_Z − ΔF′_Vth − (1−Φ_en)·F_A; S_G = F_KR/F_KQ,erf.

### 1.3 Werkstofftabelle & Quellen (vereinheitlicht in `daten.js` → `TAU_RATIO`)
**Single source of truth** — je Werkstoff: `ratio` (τ_B/R_m), `E` (N/mm²), `pG` (N/mm²), `rmDefault`/`grade` (konservative, editierbare UI-Vorbelegung), `src`, `label{de,en,pt}`. Acht Gruppen:

| Schlüssel | Werkstoff | τ_B/R_m | E | p_G | rmDefault/grade | Quelle |
|---|---|---|---|---|---|---|
| stahl | Stahl vergütet/gehärtet | 0,65 | 210000 | 630 | 600 / C45 vergütet | VDI 2230:2015 |
| stahl_bau | Bau-/Automatenstahl | 0,80 | 210000 | 450 | 360 / S235 | VDI 2230:2015 |
| einsatz | Einsatzstahl (16MnCr5) | 0,85 | 210000 | 900 | 800 / 16MnCr5 | VDI 2230 Anh. B3 |
| gjs | Sphäroguss GJS | 0,90 | 175000 | 600 | 400 / GJS-400 | VDI 2230:2015 |
| gjl | Grauguss GJL | 1,15 | 110000 | 850 | 250 / GJL-250 | VDI 2230:2015 |
| alu_knet | Aluminium-Knet | 0,60 | 70000 | 230 | 260 / EN AW-6082 | VDI 2230:2015 |
| alu_guss | Aluminium-Guss | 0,52 | 70000 | 220 | 200 / AlSi-Guss | VDI 2230:2015 |
| mg_guss | Magnesium-Leg. | 0,55 | 45000 | 140 | 150 / AZ91 | **Schätzwert** (Decker/Ettenmayer für p_G) |

**Belege & Anker (frei veröffentlicht, gegen die Norm gegengeprüft):**
- **τ_B/R_m**: ing-hanke.de (Lork/Hanke, „nach VDI 2230-1:2015") + schweizer-fn.de (zitiert VDI 2230 Bl.1:2015-11) + Ruoss/hexagon.de (Anhang-B-Beispiele). GJS 0,90 und die Aufteilung Alu-Knet/Guss decken sich mehrfach.
- **p_G**: VDI 2230 **Tabelle A9** (experimentell, bei 90 % R_p0,2), Werte über schweizer-fn (Quelle [2]); Magnesium aus Decker/Ettenmayer [1] (kein VDI-Beleg → als Schätzwert markiert).
- **Zitierbarer Rechen-Anker B3 (M20×1,5):** Innengewinde 16MnCr5 (τ/Rm=0,85), Bolzen 8.8 (τ/Rm=0,65) → **R_S = 2,0**, **C2 = 1,16** (Ruoss). Als Test in der Suite.
- **C3 = VDI Gleichung 202** (wortgleich rekonstruiert). Beispiel B1 liefert R_S ≈ 0,985…1,01.
- **Sourcing-Entscheidung:** Hankes numerische m_min-Tabellen wurden als Anker **verworfen** (gebündelte, undokumentierte Konventionen); die reinen τ_B/R_m-**Verhältnisse** sind dagegen belegt und mehrfach bestätigt. Basisdaten (Gewinde M3–M39 DIN 13/ISO 898-1, Klassen 4.6–14.9, Reibungsklassen, α_A, Setzbeträge f_Z) wie gehabt in `daten.js`.

### 1.4 Wettbewerb & Marktlücke
MDESIGN bolt, KISSsoft, **HEXAGON SR1/SR1+** (beste Validierungsreferenz, sehr transparenter Rechenweg), eAssistant, CADFEM — durchweg installationspflichtig/hochpreisig/Abo. **Lücke:** ein günstiges, offline+online, Handy/Tablet/PC-fähiges Einmalkauf-Tool mit vollständig nachvollziehbarem, **dreisprachigem** Rechenweg. Stärkstes Differenzierungsmerkmal: der durchgängige, transparente Rechenweg. eAssistant bestätigt zudem unser UI-Muster (Werkstoff-Datenbank mit „benutzerdefiniert").

### 1.5 Naming & Caveats
„Profischraube" ist im DACH-Raum als Holzbau-/Universalschraube stark belegt → SEO-/Verwechslungsrisiko; „DT-"-Präfix + Software-Segment schafft Abstand. Marke (DPMA/EUIPO) und Domain vor Festlegung prüfen. **Produkt-Disclaimer Pflicht** („ersetzt keine geprüfte Berechnung"). Reibungs-/p_G-Werte streuen je Normausgabe → Quelle transparent ausweisen; Normtabellen nicht 1:1 kopieren, eigenständige Formel-Implementierung ist zulässig.

═══════════════════════════════════════════════════════════════════════════

<a id="2"></a>
## 2. Software-Architektur — modular entwickeln → eine Datei ausliefern

### 2.1 Modul-Struktur (Ist-Stand: 8 flache Dateien + Dev-Harness)
```
DT-ProfiSchraube/  (ein Ordner, keine Unterordner)
├── DT-ProfiSchraube_Test.html  → Gerüst; lädt Module relativ; translate="no"
├── style.css                   → Design-Tokens (dark default + light), Layout,
│                                 Rechenweg-, Schaubild- (sb-*), Feld-Hinweis-/
│                                 gesperrt-/Checkbox-Styles
├── daten.js        (DTSData)      → Norm-/Stoffdaten, vereinheitlichte Werkstoff-
│                                 tabelle TAU_RATIO, 10 Beispiele (PRESETS)
├── validate.js     (DTSValidate)  → Feldschema (46 Felder, DE/EN/PT) + zweistufige Prüfung
├── solver.js       (DTSSolver)    → Rechenlogik R0–R13 + Orchestrator computeJoint
├── rechenweg.js    (DTSRechenweg) → dokumentierter, SELBSTPRÜFENDER Rechenweg (post-hoc)
├── schaubild.js    (DTSSchaubild) → Verspannungsschaubild (Live-SVG, dreisprachig)
├── ui.js                          → Formularaufbau, Live-Prüfung, Ergebnis, Rechenweg,
│                                 Schaubild-Einbindung, i18n, Theme
└── test_solver.js  (DEV-ONLY)     → Node-Testharness — wird NIE ausgeliefert
```
**Browser-Ladereihenfolge:** `daten → validate → solver → rechenweg → schaubild → ui`.
**UMD überall:** läuft in Node (Tests) und im Browser (globale Objekte). Keine externen Abhängigkeiten.

Noch anzulegen (Roadmap): `report.js` (Druck/PDF/RTF/CSV), self-hosted `jspdf.min.js`, 2D-Schnitt-Zeichnung, Build-/Obfuskierungs-Schritt, `DT-ProfiSchraube_Pro.html`.

### 2.2 Solver-Prinzipien
Reine Funktionen, einzeln testbar; `computeJoint` verkettet sie und **validiert zuerst** die Eingabe (harte Fehler ⇒ `status:'invalid'`, keine Rechnung). Bedingte Nachweise laufen nur bei ausreichenden Eingaben:
- **R11** aktiv, wenn `r11===true` **und** Werkstoffgruppe (`matGroupM`) **und** `Rm_M>0` **und** `m_vorh>0`; sonst `engagement=null` + Hinweis `PENDING_R11` (Richtwert Stahl~1·d, Guss~1,4·d, Alu~2·d). Ergebnis unter `R.engagement`.
- **R9 SG**, wenn `threadFinish==='SG'` und Wechsel-/Schwelllast vorhanden; Bereichsverletzung → Rückfall SV (`SG_OUT_OF_RANGE`).
Angenommene Größen stehen im Ergebnis unter `notes.assumptions`/`notes.pending` — **als Codes** (UI übersetzt), deutscher Text als Rückfall. Neue Codes: `ASSUME_R11_BASIS`, `VALIDATE_R11`, `PENDING_R11`, `ASSUME_SG_FSM`, `SG_OUT_OF_RANGE`, `R11_INCOMPLETE`, `BOOL_INVALID` (alle EN/PT in `ui.js` hinterlegt).

### 2.3 „modular entwickeln" ↔ „eine Offline-Datei" (gelöst)
Entwicklung in getrennten, lesbaren Dateien; ein Build-Skript inlinet CSS + alle JS-Module fest in **eine** `DT-ProfiSchraube.html`, danach Obfuskierung → ein einzelnes File **ohne externe Requests**. Test und Pro nutzen denselben Build.

### 2.4 Test/Pro-Gating
Engine byte-identisch. **Test:** Rechnen + Rechenweg sichtbar, **Ausgabe gesperrt**, dezenter Upsell — auch die Testdatei wird gebündelt+obfuskiert (sonst läge der Rechenkern offen). **Pro:** Ausgabe frei, Lizenz nach Ehrlichkeitsprinzip (Name+Schlüssel in `localStorage`), Vertrieb Digistore24.

### 2.5 Bilder & Assets
Werkzeug bleibt bild-frei/schlank; Tool-Optik ist live gezeichnet (SVG). Schöne Grafik kommt als Hero auf die Landingpage.

### 2.6 Wiederkehrende Muster (unbedingt beibehalten)
- **`fillFromMaterial(srcKey, tgtKey, customKey, prop, unit)`** in `ui.js`: belegt ein Zahlenfeld aus der Werkstofftabelle vor und sperrt es (mit Herkunftshinweis), oder gibt es per „eigener Wert"-Haken frei. Aktuell: `matGroupM→Rm_M` (`rmDefault`), `plateMat→E_P` (`E`), `plateMat→p_G` (`pG`). **Neue Tabellenfelder nach genau diesem Muster anbinden.** Gesperrte Felder sind `readOnly` (nicht `disabled`) → gehen weiterhin in die Rechnung ein; `collectInputs` überspringt nur `disabled`-Felder.
- **`LT(de, en, pt)`** in `rechenweg.js`: übersetzt Beschriftungen in Formel-/Werte-Strings; Formelzeichen bleiben neutral. **Jede neue Formel-Beschriftung über `LT` führen.**
- **Presets tragen Rohdaten für die Engine** (z. B. `E_P`, `p_G` explizit), **plus** optionale UI-Vorbelege (`plateMat`, `matGroupM`) — die Engine kennt die UI-Auswahlfelder nicht. Konsistenz per Test absichern.
- **`enumValues`/`fieldOptions`** lesen Enums direkt aus `DATA.TAU_RATIO` (Schlüssel = Werkstoffe) → kein Drift zwischen Daten und Auswahl.

═══════════════════════════════════════════════════════════════════════════

<a id="3"></a>
## 3. UI/UX-Design, Style & Optik (Profi-Look)

> **Leitidee: Messinstrument, keine App.** Ruhig, technisch, Präzision sofort sichtbar. Vertrauen durch Zurückhaltung.

### 3.1 Look (umgesetzt)
- **Farbe = Information:** Graphit-Basis (dunkel als Standard); **Stahl-Cyan #34c3d4** für Interaktives/CAD-Linien; **Messing/Bernstein #caa04a** für Moment/Wärme; **Grün/Gelb/Rot nur für Nachweis-Ergebnisse** — immer Icon + Text.
- **Rechenblatt-Layout:** Desktop mehrspaltig (Eingabe · Ergebnis · Visualisierung); Handy einspaltig als Akkordeon.
- **Design-Tokens** als CSS-Variablen an einer Stelle; **Hell/Dunkel** per `data-theme` + Umschalter (Standard dunkel).
- **Technische Typografie:** System-Font (DSGVO), **Tabellenziffern**, serifenbetonte Formelschrift im Rechenweg; Norm-Symbole sprachneutral.

### 3.2 Eingabe & Verständlichkeit (umgesetzt)
- Zu jedem Feld ein **anklickbarer ⓘ-Button** (Titel · ausführliche Laien-Hilfe · zulässiger/üblicher Bereich · Auswahlmöglichkeiten). Button bewusst **groß und rechtsbündig** (Touch-Ziel).
- **Auswählen statt Tippen** (Dropdowns aus den Daten); Standardwerte vorausgewählt und mit „empfohlen" markiert.
- **Werkstoff-Dropdowns mit „eigener Wert"-Haken:** Werkstoffgruppe (Innengewinde) → `Rm_M`; **Plattenwerkstoff** → `E_P` und `p_G`. Ohne Haken vorbelegt/gesperrt mit Herkunftshinweis („Richtwert: GJL-250 · 850 N/mm²"); mit Haken frei. Unbelegte Werte (Magnesium) sind im Dropdown als „Schätzwert" gekennzeichnet.
- **Gruppen:** Schraube · Anziehen · Geometrie · Belastung · Setzen · **Nachweise** (neu: Gewindeherstellung SV/SG, Checkbox „R11 prüfen", Werkstoffgruppe, R_m, m_vorh; standardmäßig aufgeklappt).
- **Nicht benötigte/abhängige Felder werden ausgegraut** (`dependsOn`, auch auf Checkbox-Zustand: R11-Zusatzfelder nur bei gesetztem Haken).
- **Fehlende Pflichtfelder** pulsen am ⓘ orange. **Live-Prüfung in Klartext**, dreisprachig.
- **10 Beispiele** zum Direkt-Laden (siehe 4.4).

### 3.3 Ergebnis & Rechenweg (umgesetzt)
- **Status-Banner** + **fünf Sicherheits-Kacheln** (S_F/S_D/S_P/S_G/**S_A**, ampelfarbig, mit Grund-Text bei „n. b."), **Kennwert-Tabelle** (inkl. eigener **R11-Tabelle**: m_min, m_zu, m_eff,vorh, R_S, maßgebliches Gewinde; sowie **p_max Montage/Betrieb**, wenn beide vorliegen), Hinweise (Vorspann-Check, Warnungen, Annahmen/offene Punkte).
- **Aufklappbarer Rechenweg** unter dem Ergebnis: pro Schritt **Formel → eingesetzte Werte → Ergebnis**, kurzer Hinweis, VDI-Bezug, grüner Haken „gegen Engine geprüft". **Vollständig dreisprachig inkl. aller Formel-/Werte-Beschriftungen** (via `LT`), Formelzeichen neutral. Enthält die R11-Gruppe (F_mS, τ_B, R_S/Ast, m_min, m_zu, m_eff,vorh, S_A) und die SG-Kette (F_Sm, σ_A,SG). Mobil horizontal scrollbare Formeln.

### 3.4 Visualisierung
- **Verspannungsschaubild** (Kraft-Verformungs-Diagramm) als scharfes Live-SVG (`schaubild.js`) — **umgesetzt**: dezent gefülltes Dreieck, Gitternetz, Symbole in der Zeichnung, **Zahlenwerte in der HTML-Legende** (`sb-vals` mit Farb-Chips), dreisprachig. **Merksatz:** Zahlenwerte gehören in die Legende unter dem SVG, nie in die Zeichnung.
- **2D-Schnitt** der Verbindung: **offen** (nächste Visualisierungs-Stufe), gleiche Geometrie-/Transformquelle. Kein DXF.

### 3.5 Barrierefreiheit & Bewegung (umgesetzt)
Sichtbare Fokuszustände; Status nie nur farblich; `prefers-reduced-motion` schaltet Übergänge ab; Print-Stylesheet vorhanden.

═══════════════════════════════════════════════════════════════════════════

<a id="4"></a>
## 4. Aktueller Implementierungsstand (das Herz dieser Version)

### 4.1 Engine (`solver.js`, VERSION `0.8.0-engine`) — validiert
Alle R0–R13-Funktionen sind reine, einzeln getestete Funktionen; `computeJoint` orchestriert sie. Neu/erweitert gegenüber 0.7.0:
- **R11 vollständig:** `threadStripGeom`, `threadStripRatio`, `c3Factor`, `c2Factor`, `minEngagementVDI` (exportiert); R11-Block in `computeJoint` liefert `R.engagement` (m_min, m_zu, m_eff,vorh, S_A, R_S, Ast, C, C1, F_mS, τ_B,M, τ_B,S).
- **R9 SV/SG:** `enduranceLimitSV`/`enduranceLimitSG`; SG rechnet F_Sm/F_0,2min, Rückfall SV bei Bereichsverletzung; `R.fatigue` trägt `{finish, sigma_a, sigma_A, sigma_ASV, S_D, F_Sm, F02, sgRatio}`.
- Konstanten: `RM_MAX_FACTOR = 1,2`; `BOLT_TAU_RATIO = 0,62`; `THREAD_CONST.c_D1 = 1,08253`.

**Validierungsreferenzen (in den Tests):**
- **Primär:** Hochschule Anhalt (S. Voigt), Hydraulikzylinder ISO 4762 **M12×60, 10.9**, DSV — Engine trifft δ_S, δ_P (≈0,06 %), D_A,Gr, Φ_K, F_Z, F_Mmax u. a.
- **Sekundär/Anker:** VDI-2230-**Anhang-B**-Beispiele über die frei veröffentlichte Ruoss-Kritik (B1: R_S≈0,985; **B3 M20×1,5: R_S=2,0, C2=1,16**). C3 = VDI Gl. 202 wortgleich.

**Bewusst getrackte Annahmen / offene Norm-Punkte:**
- Kegelwinkel-Geltungsgrenzen (β_L, y) als Richtwerte markiert.
- C1 = 1 (Annahme s/d ≥ 1,9). τ_B,S/R_m,S = 0,62 (in der Norm teils 0,65, z. B. B3-Bolzen — konservativ 0,62 gewählt).
- Magnesium-Werte (τ/Rm, p_G) sind Schätzwerte (kein VDI-Beleg), sichtbar gekennzeichnet.
- **Exzentrische Last** (σ_b) noch nicht verdrahtet (`operatingStress` akzeptiert σ_b bereits). Flansch-Torsion ist **noch kein eigener Lastfall**, die dafür nötigen Momentfelder (`M_Ymax`, `q_M`, `r_a`) und der R12-Momentterm sind aber bereits vorhanden und getestet — der eigene Lastfall (M_T, z, r → F_Q intern) ist der nächste Ausbauschritt.

### 4.2 Eingabe-Validierung (`validate.js`)
`FIELDS`: **46 Felder** mit dreisprachigem `label`/`help`, Typ/Einheit/Auswahlwerten, harten Grenzen (min/max) und typischem Bereich (warnMin/warnMax), `advanced`/`diagram`/`dependsOn`. Feldtyp **`bool`** (Checkbox) mit Code `BOOL_INVALID`; Felder `threadFinish`, `r11`, `matGroupM`, `Rm_M`, `m_vorh` (Gruppe Nachweise), `rmCustom`, **`plateMat`**, `epCustom`, `pgCustom` (Werkstoff-Auswahl + „eigener Wert"); **`M_Ymax`, `q_M`, `r_a`** (R12-Drehmoment, Gruppe Belastung, advanced). `enumValues('matGroupM'|'plateMat')` = Schlüssel von `TAU_RATIO`. Bedingte R11-Crossvalidation als **Warnung** (`R11_INCOMPLETE`); **Momentfeld-Crossvalidation** als harter Fehler (`MY_NEEDS_QM`/`MY_NEEDS_RA`) bzw. Warnung (`MY_WITHOUT_FQ`). `validateInput` liefert `{ok, errors, warnings}`; jede Meldung trägt einen stabilen Code (UI übersetzt).

### 4.3 Dreisprachigkeit DE/EN/PT — vollständig
Übersetzt: Bedienoberfläche, Gruppentitel, Feldbeschriftungen, **ausführliche Hilfe/Info**, Auswahl-Hinweise, Prüfmeldungen (per Code), Engine-Hinweise (per Code, inkl. Parameter wie k_τ, ratio) **und der gesamte Rechenweg inkl. Formel-/Werte-Beschriftungen** (`LT`-Helfer; Formelzeichen neutral). Sprachwechsel baut das Formular neu auf (Werte bleiben, auch Checkbox-Zustände). `translate="no"` + `notranslate`-Meta verhindern das DOM-Zerwürfnis.

### 4.4 Beispiele (10, in `daten.js` → `listPresets()`)
Hydraulikzylinder M12 (validiert) · **Einschraubung M12 in Grauguss — R11 + SG-Nachweis** (Demo der neuen Features, nutzt `plateMat: gjl`) · Durchsteck M16 · Einschraubung M10 (ESV) · Querkraft M12 (Reibschluss) · Wechsellast M12 · Kombiniert M16 (axial+Querkraft) · Aluminium M10 · Flansch M20 · **Flansch M16 (Querkraft + Drehmoment um Schraubenachse — R12 mit M_Ymax)**. Deckt statisch/schwellend/wechselnd, Querkraft, Moment, kombiniert, Stahl/Alu/Grauguss und DSV/ESV ab. Illustrative Beispiele tragen „(nicht normvalidiert)".

### 4.5 Rechenweg (`rechenweg.js`) — selbstprüfend, vollständig dreisprachig
`build(R, inp, opts)` erzeugt geordnete Schritte (Kern-Kette R3–R8/R13, bedingt R9/R10/**R11**/R12). Jeder nachrechenbare Schritt wird **unabhängig aus seiner Formel neu berechnet** und gegen den Engine-Wert geprüft; ✓ = „gegen Engine geprüft". Für das Grauguss-Beispiel z. B. 28 Schritte, davon 7 R11- und 3 SG-Schritte. Tiefe Norm-Physik (Scherquerschnitt in m_min) wird als Engine-Wert angezeigt statt dupliziert. Alle Beschriftungen via `LT` dreisprachig.

### 4.6 Verspannungsschaubild (`schaubild.js`)
`build(R, inp, opts)` liefert ein Live-SVG des Verspannungsdreiecks; Zahlenwerte in der HTML-Legende (`sb-vals`), dreisprachiger Titel/Chips, dezente Füllung + Gitternetz. Rein additiv (zeichnet nur geprüfte Werte, keine Engine-Änderung).

### 4.7 Testabsicherung (`test_solver.js`, DEV-ONLY)
`node test_solver.js`. **2.209.690 Assertions, 0 Fehler.** Enthält: Geometrie-Beweis (berechnete vs. tabellierte A_S), Invarianten, Festigkeitslogik, Fehlerbehandlung, Hunderttausende Property-Zufallsfälle, End-to-End gegen das Anhalt-Beispiel, Durchlauf aller 10 Beispiele; **R11/SV-SG-Block** (41+ Assertions inkl. unabhängiger m_min-Nachrechnung, Ast-Logik, SG-Grenzen); **R10-Doppelnachweis** (Montage+Betrieb, S_P = min, Annahme-Hinweis bei ungünstigem Betrieb); **R12-Momentblock** (M_Ymax über computeJoint + Validierung + Preset); **δ_P-Duplikat-Guard** (Sektion 16: ~4000 Zufallsgeometrien über alle 3 Kegelmodelle × DSV/ESV, δ_P Engine == Rechenweg — schlägt an, sobald nur eine Seite driftet; deckt zugleich den tanPhi-Clamp ab); **Werkstoff-Datenintegrität** (ratio/E/pG/grade/src plausibel, belegte Einzelwerte, B3-Anker R_S=2,0/C2=1,16); **Rechenweg-Selbstprüfung über alle Presets × DE/EN/PT** (jeder Schritt gegen die Engine, R11/SG/R10/R12-Schritte vorhanden). Regel: Tests werden erweitert, nie gelockert.

### 4.8 Bug-Report-Durchgang v4.1.0 — was geprüft und behoben wurde
Eine externe `Fehler.md` (aus einer älteren Version) wurde Punkt für Punkt am aktuellen Code neu geprüft, in einer bereinigten `Bug.md` konsolidiert und vollständig abgearbeitet. Ergebnis:

**Behoben (Klasse A — echte Fehler):**
- **A1 R10 Betriebszustand** ergänzt (siehe 1.2/4.1): Montage **und** Betrieb, kleineres S_P maßgeblich. Hinweis `ASSUME_SP_OPERATING`. Rechenweg zeigt beide Pressungen, UI zeigt p_max Montage/Betrieb. **Norm-Setzung:** Betriebskraft = F_Smax (größte Schraubenkraft, konservativ); falls die Norm/Referenz F_Vmax vorsieht, ist das eine Einzeiler-Änderung im R10-Block von `solver.js`.
- **A2 R12-Drehmoment** verdrahtet: Felder M_Ymax/q_M/r_a + Cross-Validation + Preset `flansch_torsion_m16`. Der Solver-Momentterm war vorhanden, aber ohne Eingabefelder (Dead-Code) — jetzt nutzbar.
- **A3** Versionsanzeige Footer/Info auf v0.8.0 korrigiert (war fälschlich v0.7.0).
- **A4** Print-Disclaimer: `.app-footer` war im `@media print` ausgeblendet → Haftungsausschluss + Normzeile fehlten im Ausdruck/PDF. Jetzt im Druck sichtbar formatiert. **Wichtig für das nächste Ziel (Ausgabe/Bericht).**
- **A5** R11-Chip im Step-Strip leuchtet jetzt (konditional bei aktivem Nachweis).
- **A6** Veralteten „~0,9·d"-Resttext in EN/PT (`PENDING_R11`) korrigiert.

**Behoben (Klasse B — Robustheit):**
- **B1 tanPhi-Clamp** `TANPHI_MIN = 0,05` in `coneAngle` (Single Source) + identischer Clamp im Rechenweg-Duplikat → kein NaN/Infinity bei absurder Geometrie (l_K/d_w → 0). Greift bei realen Eingaben nie; Hinweis `TANPHI_CLAMPED`, wenn er anschlägt.
- **B2 δ_P-Duplikat-Guard** als Test (Sektion 16). Der Verformungskegel ist in `solver.js` und `rechenweg.js` bewusst doppelt codiert (didaktischer Wert des nachgerechneten Rechenwegs) — der Guard erzwingt Gleichheit. **Bissigkeit verifiziert:** eine Drift von 0,013→0,014 an einer Seite löst 1787 Fehlschläge aus.
- **B3** Fragwürdige Kopplung `r11.dependsOn = 'connection'` entfernt; `updateDependencies` prüft Enum-Treiber jetzt über „nicht-leer" statt `Number()≠0` (beseitigt den NaN-Trick generell).

**Behoben (Klasse C — Härtung/A11y):**
- **C1** Keine `innerHTML`-Wertinjektion mehr in den Ergebnistabellen (`row()`/`eRow()` bauen Zellen per `textContent`/`createElement`, Einheit sentinel-getrennt).
- **C2** Null-sichere Event-Bindung in `init()` (`on(id,ev,fn)`-Helper) — fehlende IDs brechen die App nicht mehr ab.
- **C3** Modal-Focus-Trap (`openModal()`): Fokus auf Close-Button, Tab bleibt im Dialog, Rückgabe beim Schließen.

**Bewusst NICHT gemacht (kein Bug / Leitplanken-Konflikt):**
- **Auto-Save aller Eingaben in `localStorage`** — kollidiert mit Privacy-first/DSGVO (0.5). Nur `theme`/`lang` werden gespeichert. Falls je gewünscht, ausschließlich als bewusstes Opt-in.
- **Syntax-„Showstopper" der alten Fehler.md** (`v ar`, `& &` usw.) — im echten Code nicht vorhanden (Artefakt der alten Analyse).

Referenz-Dateien dieses Durchgangs: `Bug.md` (vollständige Diagnose) und `Bug_erledigt.md` (Abarbeitungs-Tabelle) liegen im Projekt-Ordner.

<a id="5"></a>
## 5. Umsetzungs-Roadmap — erledigt & offen

**✅ Erledigt**
- Modulares, testbares Gerüst (8 UMD-Module + Dev-Harness); Offline-Regeln eingehalten.
- Engine R0–R13 (zentrisch) inkl. Verformungskegel; validiert (Anhalt/Ruoss).
- **Vollständiger R11-Nachweis** (Gewinde-Scherquerschnitte, R_S, C1/C2/C3, m_min, m_zu, S_A) — normbelegt, B3-Anker in der Suite.
- **SV/SG-Dauerfestigkeit** vollständig (Auto-Auswahl über Feld, Rückfall SV).
- **R10 Flächenpressung im Montage- UND Betriebszustand** (kleineres S_P maßgeblich) — v4.1.0.
- **R12 mit Drehmoment um die Schraubenachse** (Felder M_Ymax/q_M/r_a, Cross-Validation, Preset) — v4.1.0; Basis für den eigenen Flansch-Torsion-Lastfall.
- **Vereinheitlichte Werkstofftabelle** (τ/Rm, E, p_G) als single source of truth; τ- und p_G-Werte VDI-2230-belegt; Alu in Knet/Guss getrennt, 16MnCr5 ergänzt, Magnesium als Schätzwert markiert.
- **Werkstoff-Dropdowns mit „eigener Wert"-Haken** (`fillFromMaterial`) für Rm_M, E-Modul, p_G.
- Oberfläche (Profi-Look, Hell/Dunkel), Live-Prüfung, Ausgrauen (inkl. Checkbox), fünf Sicherheits-Kacheln inkl. S_A, R11-Ergebnistabelle, 10 Beispiele.
- **Dreisprachigkeit DE/EN/PT vollständig** inkl. **aller** Rechenweg-Formel-/Werte-Beschriftungen (`LT`).
- **Dokumentierter, selbstprüfender Rechenweg** inkl. R11-/SG-/R10-Doppel-/R12-Moment-Schritten; in die Testsuite aufgenommen (alle Presets × 3 Sprachen).
- **Verspannungsschaubild** als Live-SVG (dreisprachig, Werte in Legende).
- **Bug-Report-Durchgang v4.1.0** (A1–A6, B1–B3, C1–C3) vollständig abgearbeitet; Robustheit (tanPhi-Clamp, δ_P-Guard), Sicherheit (kein innerHTML mit Werten), A11y (Focus-Trap), Recht (Print-Disclaimer). Details in 4.8.

**▶️ Als Nächstes (bestätigte Reihenfolge — zu Sessionbeginn kurz bestätigen)**
1. **Ausgabe/Bericht:** Browser-Druck + **self-hosted jsPDF** (PDF), **RTF** (Word), **CSV** (Werte), Diagramm-PNG/SVG — bibliotheksfrei/offline. Bericht nimmt Schaubild + Rechenweg mit. **Haftungs-Disclaimer + Normzeile müssen im PDF/Ausdruck erscheinen** (Print-CSS ist dafür seit v4.1.0 vorbereitet, siehe 4.8/A4). Neues Modul `report.js` (9. Datei) + `jspdf.min.js` self-hosted.
2. **2D-Schnitt** der Verbindung als Live-SVG (zweite Visualisierungs-Stufe).
3. **Flansch-Torsion als eigener Lastfall** (Felder M_T, Schraubenzahl z, Lochkreisradius r → F_Q intern; eigenes Beispiel; eigene Validierung). **Vorarbeit erledigt:** die Momentfelder `M_Ymax`/`q_M`/`r_a` und der R12-Momentterm existieren bereits (v4.1.0) — hier wird der Lastfall benutzerfreundlich darübergelegt (aus M_T, z, r die interne Umfangskraft bilden).
4. **Inline-SVG-Skizzen** für Geometrie-Felder (l_K, d_w, d_h, D_A …) im ⓘ-Fenster (Slot vorhanden; Referenzgrafiken suchen → als Code-SVG nachzeichnen).
5. **Exzentrische Last** (σ_b; Ruoss B4/B5 als Referenz).
6. **Dehn-/Taillenschrauben** (A_0-Umschaltung).
7. **Build-/Obfuskierungs-Schritt**, `DT-ProfiSchraube_Pro.html`, Test/Pro-Gating; A7-Vordimensionierung.

**Prinzip „Tabellenwerte als Liste + Haken" weiterführen:** wo noch sinnvoll, weitere Tabellenfelder nach `fillFromMaterial` anbinden (z. B. E-Modul der Schraube E_S/E_M, falls gewünscht). Neue Auswahl immer im erlaubten Bereich, fehlerfrei, dreisprachig, mit Laien-Hilfe und im Rechenweg sichtbar.

**Benchmarks, die Entscheidungen ändern**
- Abweichung gegen Anhang-B > ±2 % → Nachgiebigkeits-/Kegelmodell prüfen, ggf. Originalnorm beschaffen.
- Bestätigter Markenkonflikt „Profischraube" → Umbenennung vor Markteintritt.
- Nachfrage nach Mehrschraubenverbindungen → Blatt 2 (FEM) als separates Modul.

═══════════════════════════════════════════════════════════════════════════

<a id="6"></a>
## 6. Changelog

**v4.1.0 (2026-07-03) — R10-Doppelnachweis, R12-Drehmoment verdrahtet, kompletter Bug-Report-Durchgang, Robustheit/A11y gehärtet**
- **R10 Flächenpressung jetzt Montage UND Betrieb** (p_max aus F_Mzul bzw. F_Smax; kleineres S_P maßgeblich; Ergebnisfelder `p_max_M/B`, `S_P_M/B`, `governing`; Hinweis `ASSUME_SP_OPERATING`). Rechenweg zeigt beide Pressungen, UI zeigt Montage/Betrieb.
- **R12-Drehmoment um die Schraubenachse** benutzbar gemacht: neue Felder `M_Ymax`/`q_M`/`r_a` (Gruppe Belastung, advanced, dreisprachig) + Cross-Validation (`MY_NEEDS_QM`/`MY_NEEDS_RA`/`MY_WITHOUT_FQ`); neues Preset `flansch_torsion_m16`. Der Solver-Momentterm war vorhanden, aber ohne Eingabefelder (Dead-Code).
- **Robustheit:** tanPhi-Clamp `TANPHI_MIN = 0,05` in `coneAngle` (Single Source) + identisch im Rechenweg-Duplikat (kein NaN/Infinity bei absurder Geometrie; Hinweis `TANPHI_CLAMPED`). Neuer **δ_P-Duplikat-Guard-Test** (Sektion 16, ~4000 Zufallsgeometrien über alle Kegelmodelle) — erzwingt Gleichheit von Engine und Rechenweg.
- **UI/Sicherheit/A11y:** kein `innerHTML` mit Werten mehr in den Ergebnistabellen (`textContent`/`createElement`); Null-sichere Event-Bindung in `init()`; Modal-Focus-Trap; `r11`-`dependsOn`-Kopplung entfernt und `updateDependencies` für Enum-Treiber gehärtet.
- **Recht/Anzeige:** Print-Disclaimer + Normzeile im Ausdruck/PDF sichtbar (`.app-footer` nicht mehr ausgeblendet); Versionsanzeige auf v0.8.0 korrigiert; R11-Chip im Step-Strip; veralteter „~0,9·d"-Text in EN/PT bereinigt.
- **Felder 43 → 46, Beispiele 9 → 10.** **Testsuite 2.201.547 → 2.209.690 Assertions** (0 Fehler): R10-Doppel-, R12-Moment- und δ_P-Guard-Block ergänzt. Grundlage: bereinigte `Bug.md` (Neuprüfung einer externen `Fehler.md`), vollständig abgearbeitet (A1–A6, B1–B3, C1–C3); Details in Abschnitt 4.8.

**v4.0.0 (2026-07-03) — Vollständiger R11/SG-Nachweis, vereinheitlichte Werkstofftabelle, durchgängig dreisprachiger Rechenweg**
- **Engine → `0.8.0-engine`.** **R11 Mindesteinschraubtiefe vollständig** (Gewinde-Scherquerschnitte, R_S, C1/C2/C3, m_min, m_zu 2P/3P, S_A) — löst die frühere Vereinfachung „m_erf ≈ 0,9·d" ab. **SV/SG-Dauerfestigkeit vollständig** (Auto-Auswahl `threadFinish`, F_Sm/F_0,2min, Rückfall SV).
- **Normbelege gesichert:** C3 = VDI Gl. 202 (wortgleich), C2(2,0)=1,16 und der Anker **B3 (M20×1,5, R_S=2,0)** über Ruoss; τ_B/R_m aller Werkstoffe über ing-hanke/schweizer-fn/Ruoss; p_G über VDI 2230 Tab. A9 (schweizer-fn). Frühere τ-Richtwerte korrigiert (Alu 0,70 → Knet 0,60 / Guss 0,52; Baustahl 0,80; GJL 1,15; 16MnCr5 0,85 neu). Magnesium als Schätzwert gekennzeichnet.
- **Vereinheitlichte Werkstofftabelle** `TAU_RATIO` (single source of truth): ratio + E-Modul + p_G + rmDefault/grade + src + label je Werkstoff (8 Gruppen).
- **UI-Muster „Auswahl-Liste + eigener-Wert-Haken"** (`fillFromMaterial`): Werkstoffgruppe→Rm_M, **Plattenwerkstoff→E_P & p_G**; gesperrt/vorbelegt mit Herkunftshinweis oder frei. Neue Gruppe **Nachweise**; **fünfte Sicherheits-Kachel S_A** + R11-Ergebnistabelle; Feldtyp `bool`; Ausgrauen reagiert auf Checkbox.
- **Rechenweg vollständig dreisprachig**: neue R11-/SG-Schritte + Übersetzung **aller** deutschen Formel-/Werte-Beschriftungen via neuem Helfer **`LT(de,en,pt)`** (Formelzeichen neutral).
- **Testsuite** auf **2.201.547 Assertions** erweitert (0 Fehler): R11/SV-SG-Block, Werkstoff-Datenintegrität + B3-Anker, **Rechenweg-Selbstprüfung über alle Presets × DE/EN/PT**.
- Architektur präzisiert: **8 flache Module** inkl. `schaubild.js`; Ladereihenfolge daten→validate→solver→rechenweg→schaubild→ui. Grauguss-Beispiel demonstriert R11+SG+Plattenwerkstoff.
- **Diagnose gelöst:** doppelter `grauguss_esv_m12`-Preset-Schlüssel in `daten.js` entfernt (letzter Schlüssel hatte den vollständigen überschrieben).

**v3.0.0 (2026-07-01)** — Von der Planung zur laufenden, testverifizierten Implementierung: Engine R0–R13 (zentrisch) validiert (Anhalt/Ruoss); zweistufige Validierung mit stabilen Codes; Profi-Look (Hell/Dunkel), Live-Prüfung, Ausgrauen, Pflichtfeld-Marker; 9 Beispiele; Dreisprachigkeit DE/EN/PT (Feldtexte, Hilfe, Meldungen, Engine-Hinweise) + `translate="no"`; dokumentierter, selbstprüfender Rechenweg (7. Datei) in die Suite aufgenommen (2.200.569 Assertions).

**v2.0 (2026-06-29)** — Datei-Architektur entschieden (modular entwickeln → eine gebündelte Offline-Datei → Obfuskierung; harte Offline-Regeln; jsPDF self-hosten). Profi-Look, Sprachumschalter DE/EN/PT, Ausgabe-Strategie (DXF gestrichen; PDF/RTF/CSV/PNG/SVG).

**v1.0 (2026-06-29)** — Konsolidierte Erstfassung: Technische Recherche, Arbeitsweise/Herkunft, Software-Architektur, UI/UX, Roadmap; Scope (Einmalkauf + eingeschränkte Testversion; DE/EN/PT; Dehnschrauben Phase 2).

═══════════════════════════════════════════════════════════════════════════
Ende des Masterplans · DT-ProfiSchraube v4.1.0
Grundlage für die weitere Implementierung. Alle Formeln/Tabellen basieren auf VDI 2230 Blatt 1 (2015) und frei veröffentlichten Sekundärquellen und sind vor Produktivnutzung gegen die Originalnorm zu validieren.
