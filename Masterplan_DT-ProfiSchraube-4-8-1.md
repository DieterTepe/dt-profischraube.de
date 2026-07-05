# 🔩 DT-ProfiSchraube — Masterplan
## Schraubenberechnung nach VDI 2230 Blatt 1 mit vollständiger, dreisprachiger Rechenweg-Dokumentation

═══════════════════════════════════════════════════════════════════════════
Version : 4.8.1
Stand   : 2026-07-05
Status  : **v4.8.1 real getestet & bestätigt (Handy, 2026-07-05). Engine vollständig & testverifiziert.**
          **► Vollständiger Code-Audit über alle 8 Module + Testharness ABGESCHLOSSEN
          und bestanden; eigener Prüfbericht `Pruefbericht_DT-ProfiSchraube-4-8-0.md`
          liegt im Projekt. Kein kritischer Befund; 2 mittlere + 3 kosmetische Punkte
          gefunden und sofort gefixt (je mit Test-Erweiterung). Details Changelog v4.8.1.**
          **► Nächster Schritt: Ausgabe/Bericht (Browser-Druck + self-hosted jsPDF,
          RTF, CSV, Diagramm-PNG/SVG) — Punkt 1 der „Danach"-Liste in Abschnitt 5.**
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
          **Ingenieur-Workstation Baustein 1 fertig: Speichern/Laden als
          `.dt`-Datei** (nur Eingaben + Kopf, Laden rechnet frisch) — vom
          Anwender ausgiebig getestet und bestätigt.
          **Baustein 2 fertig: Thermik-Rechner** (ΔT statt manuellem ΔF_Vth;
          α_S aus Festigkeitsklasse, α_P aus Plattenwerkstoff; VDI-Näherung
          E(T)=konst.; Vorspann-Gewinn konservativ nicht gutgeschrieben) — vom
          Anwender ausgiebig getestet und bestätigt.
          **Baustein 3 fertig: Flansch-Assistent** (M_T/z/r_LK → F_Qmax je Schraube
          = M_T/(z·r_LK), speist R12; reiner UX-Wrapper, keine neue Physik) — vom
          Anwender ausgiebig getestet und bestätigt.
          **Baustein 4 fertig: Dehn-/Taillenschrauben (DIN 2510)** — einziger
          echter Kern-Eingriff der Serie: A_0 = π/4·d_0² ersetzt A_S selektiv
          in δ_S (Taillenglied), R7 (F_Mzul mit W_p aus d_0), R8 (σ_z,max) und
          R9 (σ_a, F_0,2min); Gewinde-/R11-Bezug bleibt A_S. Engine 0.9.0.
          **Testverifiziert: 2.211.104 Assertions, 0 Fehler.**
          Noch offen: **zuerst vollständiger Code-Audit + Prüfbericht**, dann
          **Testverifiziert: 2.211.116 Assertions, 0 Fehler** (nach Audit-Fixes).
          Noch offen: Ausgabe/Bericht (PDF/RTF/CSV/PNG), 2D-Schnitt,
          Flansch-Torsion als eigener Lastfall (Momentfelder M_Ymax/q_M/r_a
          sind bereits vorhanden), Inline-SVG-Skizzen, exzentrische Last,
          Build/Obfuskierung.
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
**Fertig und testverifiziert (2.211.116 Assertions, 0 Fehler):**
- Engine **`0.8.0-engine`**: R0–R13 zentrisch, inkl. **vollständigem R11-Nachweis** (Gewinde-Scherquerschnitte, R_S, C1/C2/C3, m_min, m_zu, S_A) und **SV/SG-Dauerfestigkeit** (Auto-Auswahl über Eingabefeld, Rückfall SV bei Bereichsverletzung), mit **Oberflächen-/Ausführungs-Abminderung** (blank/feuerverzinkt/HV).
- **Rostfreie/austenitische Verschraubungen** abgedeckt: Bolzen-Klassen A2-70/A4-70/A4-80 (ISO 3506, außerhalb VDI-Kern → Warnung), automatischer rostfreier E-Modul (~200 GPa), Bolzen-Scherzahl 0,80, Werkstoffgruppe `austenit` fürs Innengewinde (R11). σ_A für Austenit als Näherung gekennzeichnet.
- **R10 Flächenpressung im Montage- UND Betriebszustand** (p_max aus F_Mzul bzw. F_Smax; kleineres S_P ist maßgeblich; Ergebnis trägt `p_max_M/B`, `S_P_M/B`, `governing`; Hinweis `ASSUME_SP_OPERATING`).
- **R12 mit Drehmoment um die Schraubenachse** verdrahtet: Felder `M_Ymax`, `q_M`, `r_a` (Gruppe Belastung, advanced) + Cross-Validation (`MY_NEEDS_QM`/`MY_NEEDS_RA`/`MY_WITHOUT_FQ`). Basis für „Flansch-Torsion als eigener Lastfall".
- **Vereinheitlichte Werkstofftabelle** in `daten.js` (`TAU_RATIO`, 9 Werkstoffe inkl. Austenit/rostfrei): je Werkstoff `ratio` (τ_B/R_m), `E` (E-Modul), `pG` (Grenzflächenpressung), **`alpha` (Wärmeausdehnung 10⁻⁶/K, seit v4.6.0)**, `rmDefault`, `grade`, `src`, `label{de,en,pt}` — **normbelegt** (VDI 2230:2015 via ing-hanke/schweizer-fn/Ruoss). Schrauben-α separat in `BOLT_ALPHA` (Stahl 11,5 · Austenit 16).
- **Werkstoff-Dropdowns mit „eigener Wert"-Haken** (Muster `fillFromMaterial`): Werkstoffgruppe → `Rm_M`; **Plattenwerkstoff** → `E_P`, `p_G` **und** `alpha_P`; **Festigkeitsklasse** → `alpha_S` (via `fillAlphaS`). Ohne Haken vorbelegt & gesperrt (mit Herkunftshinweis), mit Haken frei editierbar.
- **Rechenweg vollständig dreisprachig** — auch alle deutschen Formel-/Werte-Beschriftungen sind über den Helfer `LT(de,en,pt)` übersetzt (Formelzeichen bleiben sprachneutral). R11-, SG-, R10-Doppel- und R12-Momentschritte sind enthalten und gegen die Engine geprüft.
- **Verspannungsschaubild** (`schaubild.js`) live gezeichnet, dreisprachig, dezent gefülltes Dreieck, Zahlenwerte in der HTML-Legende (`sb-vals`).
- **Robustheit/UI gehärtet** (Bug-Durchgang v4.1.0): tanPhi-Clamp gegen NaN, δ_P-Duplikat-Guard-Test, kein `innerHTML` mit Werten mehr, Null-sichere Event-Bindung, Modal-Focus-Trap, Print-Disclaimer sichtbar, R11 im Step-Strip, korrekte Versionsanzeige. **Vollständige Liste in Abschnitt 4.8.**
- **Verbesserungs-Hinweise (Stufe 2, v4.3.0):** bei jeder Sicherheit < 1,2 ein dreisprachiger Hinweis mit Hebeln + konkretem Zielwert („d_w auf mind. X mm", „m_vorh auf Y mm", „µ_T ≥ Z" …), gesammelt im Hinweisbereich; ehrlich zur Kopplung der Nachweise.
- **Speichern/Laden `.dt` (v4.5.0, Baustein 1 der Workstation):** Berechnung als `.dt`-Datei sichern (nur Eingaben + Kopf `{app, version, created, label, input}`) und später laden; das Laden trägt die Eingaben über dieselbe Fülllogik wie die Presets ein und rechnet **frisch** (robust gegen Versionswechsel). Subbar: Bezeichnungsfeld + Buttons „Speichern (.dt)"/„Laden (.dt)" + Statuszeile, dreisprachig. Fremde/defekte Dateien → freundliche Meldung, kein Absturz; ältere Version → gelber Hinweis. **Keine** Solver-Änderung.
- **Thermik-Rechner (v4.6.0, Baustein 2 der Workstation):** statt manuellem ΔF_Vth nur noch **ΔT** eingeben; ΔF_Vth = l_K·(α_S−α_P)·ΔT/(δ_S+δ_P). **α_S** aus der Festigkeitsklasse (Stahl 11,5 · A2/A4 16 via `BOLT_ALPHA`), **α_P** aus dem Plattenwerkstoff (alle 9 Werkstoffe in `TAU_RATIO` tragen jetzt `alpha`) — beide gesperrt mit „selbst eingeben"-Haken. Aktiver Assistent **sperrt + füllt** das manuelle `deltaFvth` (Provenienz). **Korrektheits-Entscheidung:** ein Vorspann-**Gewinn** (ΔF_Vth < 0) wird für F_Mmin und F_KR konservativ **nicht** gutgeschrieben (kalter Zustand maßgeblich, `deltaFvthLoss = max(0; ΔF_Vth)`), wirkt aber vorzeichenrichtig in F_Smax/F_Vmax (erhöht dort Kraft/Pressung); gilt auch für manuell eingegebene negative Werte. Näherung **E(T)=konstant** ehrlich ausgewiesen (`ASSUME_THERMAL_APPROX`). Neuer Rechenweg-Schritt **R4b** (dreisprachig, selbstprüfend). 13. Beispiel „Alu-Flansch M12 mit ΔT". **Vom Anwender ausgiebig getestet & bestätigt.**
- **Flansch-Assistent (v4.7.0, Baustein 3 der Workstation):** reiner UX-Wrapper um R12. Nutzer gibt **M_T** (Gesamt-Drehmoment), **z_bolts** (Schraubenzahl), **r_LK** (Lochkreisradius); der Helfer `flangeShear` bildet **F_Qmax = M_T/(z·r_LK)** je Schraube. Normalisierung ganz am Anfang von `computeJoint` (flache inp-Kopie, Original unberührt) → die gesamte seit v4.1.0 getestete R12-Kette läuft **byte-identisch** weiter. Aktiver Assistent **sperrt + füllt** das manuelle `F_Qmax` (Provenienz), Vorrang vor manueller Eingabe. Neuer Rechenweg-Schritt **R12a** „Umfangskraft je Schraube" (dreisprachig, selbstprüfend). 14. Beispiel „Getriebeflansch M16" (6000 N·m auf 8 Schrauben → F_Qmax 6250 N; zeigt bewusst S_G < 1 → demonstriert die Verbesserungs-Hinweise). **Keine** neue Physik. **Vom Anwender ausgiebig getestet & bestätigt.**

- **Dehn-/Taillenschrauben (v4.8.0, Baustein 4 der Workstation — einziger echter Kern-Eingriff):** neues Feld `boltType` (schaft/dehn) mit **d_0** (Taillendurchmesser) und **L_0** (Taillenlänge). **Selektive A_0-Ersetzung** (A_0 = π/4·d_0²): δ_S erhält ein **zusätzliches Reihenglied** L_0/(E_S·A_0) — Konvention: `lShank` bezeichnet weiterhin nur den NICHT-taillierten Schaftanteil (nichts wird still abgezogen); **R7** rechnet F_Mzul mit A_0 und W_p aus d_0 (die Taille ist auch beim **Anziehen** der schwächste Querschnitt — mit Dieter so entschieden), τ_residual/σ_red,B konsistent dazu; **R8** σ_z,max = F_Smax/A_0; **R9** σ_a und F_0,2min (SG) mit A_0. **Gewinde-/R11-Bezug bleibt A_S** (Test erzwingt Bit-Identität). Maßgeblicher Querschnitt als `A_sig` = min-Logik: ist A_0 ≥ A_S (keine echte Taille), fallen die Nachweise ehrlich auf A_S zurück (Hinweis `TAPER_NOT_GOVERNING`); fehlt d_0, greift der Richtwert **0,9·d_3** (`ASSUME_TAPER_D0`, `TAPER_D0_FACTOR` exportiert). UI: d_0 wird aus der Gewindegröße **vorbelegt + gesperrt** (`fillD0`, Provenienz „Richtwert 0,9·d_3 (DIN 2510)"), Haken `d0Custom` gibt es frei; `dependsOnValue: 'dehn'` (neues Schema-Attribut, generisch in `updateDependencies`) blendet d_0/d0Custom/L_0 nur bei Dehnschraube ein. Rechenweg: neuer selbstprüfender Schritt **„Taillenquerschnitt A_0"** + umgeschaltete R3/R7/R8/R9-Formeln. Ergebnis trägt `R.taper` {d_0, L_0, A_0, W_p0, governs}; Kennwert-Tabelle zeigt d_0/L_0/A_0. **15. Beispiel** „Dehnschraube M16 10.9" (d_0 12,2 · L_0 85; alles grün, S_D 10,44 — als Schaftschraube wäre S_D 9,58 und S_P 0,92 rot → Vorteil sichtbar). Engine-Version **0.9.0**.

**► CODE-AUDIT ABGESCHLOSSEN & BESTANDEN (v4.8.1, 2026-07-05).**
Der komplette Code (alle 8 Module + Testharness) wurde Datei für Datei statisch geprüft und
dynamisch über alle 15 Presets × 3 Sprachen durchgerechnet. **Kein kritischer Befund.** Gefunden
und sofort gefixt (je mit Test-Erweiterung, nie gelockert): **S-1** (🟠 FIX_SG-Querkraft-Zielwert
ignorierte den M_Ymax-Term → war nicht-konservativ, jetzt `(F_KR/1,2 − t2)·q_F·µ_T`); **U-1**
(🟠 Footer-Versionsanzeige „v0.8.0" statt 0.9.0 → jetzt driftsicher aus `SOLVER.VERSION`); **S-2**
(🟡 S_G=0 erzeugte µ_T-Ziel Infinity → auf null geklemmt, Klausel entfällt); **S-3** (🟡
irreführender F_Vmax-Kommentar); **V-1** (🟡 Schätzwert-Notiz im Dropdown nur deutsch → DE/EN/PT).
Vollständiger Bericht: `Pruefbericht_DT-ProfiSchraube-4-8-0.md` im Projekt-Ordner. Suite von
2.211.104 → **2.211.116 Assertions, 0 Fehler**. Vom Anwender real getestet & bestätigt.
**Backlog (kein Handlungsdruck):** D-1 tote Tabellen `P_G`/`E_MODULUS` in `daten.js` entfernen;
S-6 µ_T-Zielwert optional als „unphysikalisch > 0,3" kennzeichnen.

**► ALLERERSTE AUFGABE IM NÄCHSTEN CHAT: Ausgabe/Bericht (Browser-Druck + self-hosted jsPDF, RTF, CSV, Diagramm-PNG/SVG) — Punkt 1 der „Danach"-Liste in Abschnitt 5.**
Die v4.4-Serie „Ingenieur-Workstation" ist komplett: **(1) Speichern/Laden `.dt` ✅ (v4.5.0)** → **(2) Thermik-Rechner ✅ (v4.6.0)** → **(3) Flansch-Assistent ✅ (v4.7.0)** → **(4) Dehnschrauben ✅ (v4.8.0)**. Danach 2D-Schnitt, SVG-Skizzen, exzentrische Last, Build/Obfuskierung.
**Regressions-Pflicht vor/nach jedem Baustein:** alle 15 Presets × 3 Sprachen (Solver + Rechenweg + Schaubild, kein NaN) **und** volle Testsuite (aktuell 2.211.116, 0 Fehler).

**► ERLEDIGT (v4.1.1): `TAU_RATIO`-Quellenabgleich abgeschlossen.**
Alle acht Scherfestigkeitsverhältnisse τ_B/R_m sind jetzt normbelegt: **VDI 2230 Bl.1:2015, Tabelle 6 / Bild 36** (Stahlsorten, als Bereiche — wir nehmen konsequent den unteren, konservativen Rand) und **Lork/Hanke (ing-hanke.de)** „nach VDI 2230-1:2015" (Guss/Alu). Herleitung nach Thomala (TU Clausthal 2020, peer-reviewt). Die Bolzen-Scherzahl ist jetzt **klassenabhängig** (8.8 = 0,65 · 10.9 = 0,62 · 12.9 = 0,60 · niedrige Klassen ~0,70) statt konstant 0,62 — reine Rechengröße aus der Festigkeitsklasse, keine Nutzereingabe. Quellen stehen pro Werkstoff im `src`-Feld und werden in der R11-Ausgabe dreisprachig ausgewiesen. Test-Anker: `vdiRange` sichert, dass jeder Wert am unteren Norm-Rand sitzt. Magnesium bleibt bewusst Schätzwert (kein VDI-Beleg, sichtbar gekennzeichnet). **Austenit** ist seit v4.2.0 als 9. Werkstoffgruppe ergänzt (normbelegt 0,80) — siehe Changelog v4.2.0.

### 0.3 So knüpfen wir nach einem Absturz sauber an (Recovery-Protokoll)
1. **Dateien im Projekt-Ordner sind die Wahrheit.** Alle aktuellen Dateien liegen im Projekt-Ordner (Dieter pflegt sie dort). Zu Beginn: Projektdateien nach `/home/claude/dt/` kopieren und dort arbeiten (Container wird zwischen Sessions zurückgesetzt — im Container erzeugte Zwischenstände gehen verloren, deshalb nach jeder Änderung ausliefern).
2. **Grün-Basislinie herstellen:** `node test_solver.js` → muss **2.211.116 (oder mehr) Assertions, 0 Fehler** zeigen. Erst dann weiterbauen.
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
- **Dehn-/Taillenschrauben (DIN 2510)** = **umgesetzt (v4.8.0)**: Bezugsquerschnitt A_0 selektiv in R7/R8/R9, δ_S mit Taillenglied; R11 bleibt A_S.
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
| R9 | Schwingbeanspruchung | σ_a, σ_A, S_D | ✅ **SV und SG vollständig** (Feld `threadFinish`) + **Oberflächen-Abminderung** (blank/feuerverzinkt −30 %/HV −20 %, Feld `surfaceFinish`) |
| R10 | Flächenpressung | p_max, S_P | ✅ (Montage- **und** Betriebszustand: F_Mzul bzw. F_Smax; kleineres S_P maßgeblich; p_G aus Werkstofftabelle) |
| R11 | Mindesteinschraubtiefe | m_min, S_A | ✅ **vollständig** (Gewinde-Scherquerschnitte, R_S, C1/C2/C3) |
| R12 | Gleiten, Abscheren | S_G, τ_max | ✅ Reibschluss; Abschernachweis-Funktionen vorhanden |
| R13 | Anziehdrehmoment | M_A | ✅ |

Drei Blöcke: R0–R2 (Vorgaben), R3–R6 (Verspannungsdreieck/Kräfte), R7–R13 (Nachweise).

### 1.2 Kernformeln (wie in der Engine implementiert)
- **Nachgiebigkeit Schraube** (Reihenschaltung): δ_S = Σ l_i/(E·A_i) über Kopf (0,5·d), Schaft, **Taille L_0/(E·A_0) bei Dehnschraube (zusätzliches Glied; `lShank` = nicht-taillierter Anteil)**, freies Gewinde, eingeschr. Gewinde (0,5·d), Mutter/Einschraubteil (0,4·d).
- **Nachgiebigkeit Platten** — Fallunterscheidung: Hülse (D_A ≤ d_w); Vollkegel (D_A ≥ D_A,Gr); Kegel + Hülse (dazwischen). Kegelwinkel empirisch: DSV `tanφ = 0,362 + 0,032·ln(β_L/2) + 0,153·ln(y)`, ESV `0,348 + 0,013·ln(β_L) + 0,193·ln(y)`, β_L = l_K/d_w, y = D_A/d_w. Verbindungskoeffizient w = 1 (DSV)/2 (ESV). D_A,Gr = d_w + w·l_K·tanφ.
- **Kraftverhältnis:** Φ_K = δ_P/(δ_S+δ_P); Φ_en = n·Φ_K.
- **Setzen:** F_Z = (f_Z/1000)/(δ_S+δ_P).
- **F_Mmin** = F_Kerf + (1−Φ_en)·F_A + F_Z + ΔF′_Vth; **F_Mmax** = α_A·F_Mmin.
- **F_Mzul** = ν·R_p0,2/√(1/A_S² + 3·(m/W_p)²), m = P/(2π)+0,577·μ_G·d_2, W_p = π/16·d_S³, ν = 0,9. **Dehnschraube mit maßgeblicher Taille (A_0 < A_S): A_0 statt A_S und W_p = π/16·d_0³** (Taille ist auch beim Anziehen der schwächste Querschnitt). (0,16/0,58 sind Rundungen von C_PITCH=1/(2π), C_FLANK=1/(2cos30°) — **in der Engine unrundiert**.)
- **M_A** = F_Mzul·(P/(2π) + 0,577·μ_G·d_2 + μ_K·D_Km/2), D_Km = (d_w+d_h)/2.
- **F_Smax** = F_Mzul + Φ_en·F_Ao − ΔF′_Vth. σ_z,max = F_Smax/A_S **(A_0 bei Dehnschraube)**; σ_red,B = √(σ_z,max² + 3·(k_τ·τ)²), τ = M_G/W_p; S_F = R_p0,2/σ_red,B.
- **R9 (Schwingbeanspruchung):** σ_a = Φ_en·(F_Ao−F_Au)/(2·A_S) [A_0 bei Dehnschraube]; **σ_A,SV = 0,85·(150/d + 45)** (schlussvergütet); **σ_A,SG = (2 − F_Sm/F_0,2min)·σ_A,SV** (schlussgewalzt), gültig F_Sm/F_0,2min ≈ 0,3…1, sonst konservativ SV; **Oberflächen-/Ausführungs-Abminderung** σ_A,red = f_O·σ_A mit f_O = 1,0 (blank) / 0,70 (feuerverzinkt) / 0,80 (HV-Garnitur) nach VDI 2230 Bl.1; S_D = σ_A,red/σ_a. F_Sm = F_Mzul + Φ_en·(F_Ao+F_Au)/2, F_0,2min = R_p0,2·A_S **(A_0 bei Dehnschraube)**. Bei rostfreien Schrauben ist σ_A nur Näherung (Hinweis `PENDING_FATIGUE_STAINLESS`).
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
│                                 tabelle TAU_RATIO (inkl. alpha) + BOLT_ALPHA,
│                                 15 Beispiele (PRESETS)
├── validate.js     (DTSValidate)  → Feldschema (61 Felder, DE/EN/PT) + zweistufige Prüfung
├── solver.js       (DTSSolver)    → Rechenlogik R0–R13 + Orchestrator computeJoint
│                                 (inkl. Thermik-Assistent ΔF_Vth aus ΔT +
│                                 Flansch-Assistent F_Qmax aus M_T/z/r_LK)
├── rechenweg.js    (DTSRechenweg) → dokumentierter, SELBSTPRÜFENDER Rechenweg (post-hoc)
├── schaubild.js    (DTSSchaubild) → Verspannungsschaubild (Live-SVG, dreisprachig)
├── ui.js                          → Formularaufbau, Live-Prüfung, Ergebnis, Rechenweg,
│                                 Schaubild-Einbindung, i18n, Theme, .dt-Speichern/Laden
│                                 (reine dt-Helfer per UMD auch in Node testbar)
└── test_solver.js  (DEV-ONLY)     → Node-Testharness — wird NIE ausgeliefert
```
**Browser-Ladereihenfolge:** `daten → validate → solver → rechenweg → schaubild → ui`.
**UMD überall:** läuft in Node (Tests) und im Browser (globale Objekte). Keine externen Abhängigkeiten.

Noch anzulegen (Roadmap): `report.js` (Druck/PDF/RTF/CSV), self-hosted `jspdf.min.js`, 2D-Schnitt-Zeichnung, Build-/Obfuskierungs-Schritt, `DT-ProfiSchraube_Pro.html`.

### 2.2 Solver-Prinzipien
Reine Funktionen, einzeln testbar; `computeJoint` verkettet sie und **validiert zuerst** die Eingabe (harte Fehler ⇒ `status:'invalid'`, keine Rechnung). Bedingte Nachweise laufen nur bei ausreichenden Eingaben:
- **R11** aktiv, wenn `r11===true` **und** Werkstoffgruppe (`matGroupM`) **und** `Rm_M>0` **und** `m_vorh>0`; sonst `engagement=null` + Hinweis `PENDING_R11` (Richtwert Stahl~1·d, Guss~1,4·d, Alu~2·d). Ergebnis unter `R.engagement`.
- **R9 SG**, wenn `threadFinish==='SG'` und Wechsel-/Schwelllast vorhanden; Bereichsverletzung → Rückfall SV (`SG_OUT_OF_RANGE`). **Oberflächen-Abminderung** über `surfaceFinish` (blank/verzinkt/hv → Faktor auf σ_A, Hinweis `ASSUME_SURFACE_FATIGUE`). Rostfreie Klasse → E-Modul aus `STRENGTH.E` (`ASSUME_E_S_CLASS`) und σ_A-Näherungshinweis (`PENDING_FATIGUE_STAINLESS`).
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
- **Werkstoff-Dropdowns mit „eigener Wert"-Haken:** Werkstoffgruppe (Innengewinde) → `Rm_M`; **Plattenwerkstoff** → `E_P`, `p_G` und `alpha_P`; **Festigkeitsklasse** → `alpha_S`. Ohne Haken vorbelegt/gesperrt mit Herkunftshinweis („Richtwert: GJL-250 · 850 N/mm²"); mit Haken frei. Unbelegte Werte (Magnesium) sind im Dropdown als „Schätzwert" gekennzeichnet.
- **Gruppen:** Schraube · Anziehen · Geometrie · Belastung (inkl. Thermik- und Flansch-Assistent) · Setzen · **Nachweise** (Gewindeherstellung SV/SG, Checkbox „R11 prüfen", Werkstoffgruppe, R_m, m_vorh; standardmäßig aufgeklappt).
- **Nicht benötigte/abhängige Felder werden ausgegraut** (`dependsOn`, auch auf Checkbox-Zustand: R11-Zusatzfelder nur bei gesetztem Haken, Thermik-Felder nur bei aktivem Thermik-Assistenten, Flansch-Felder nur bei aktivem Flansch-Assistenten).
- **Fehlende Pflichtfelder** pulsen am ⓘ orange. **Live-Prüfung in Klartext**, dreisprachig.
- **15 Beispiele** zum Direkt-Laden (siehe 4.4).

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
- **R9 SV/SG:** `enduranceLimitSV`/`enduranceLimitSG`; SG rechnet F_Sm/F_0,2min, Rückfall SV bei Bereichsverletzung; Oberflächen-Faktor aus `SURFACE_FATIGUE`; `R.fatigue` trägt `{finish, sigma_a, sigma_A, sigma_ASV, sigma_A_preSurface, S_D, F_Sm, F02, sgRatio, surface, surfaceFactor}`. Rostfreier Schrauben-E-Modul in `R.E_S`.
- Konstanten: `RM_MAX_FACTOR = 1,2`; `BOLT_TAU_RATIO = 0,62`; `THREAD_CONST.c_D1 = 1,08253`.

**Validierungsreferenzen (in den Tests):**
- **Primär:** Hochschule Anhalt (S. Voigt), Hydraulikzylinder ISO 4762 **M12×60, 10.9**, DSV — Engine trifft δ_S, δ_P (≈0,06 %), D_A,Gr, Φ_K, F_Z, F_Mmax u. a.
- **Sekundär/Anker:** VDI-2230-**Anhang-B**-Beispiele über die frei veröffentlichte Ruoss-Kritik (B1: R_S≈0,985; **B3 M20×1,5: R_S=2,0, C2=1,16**). C3 = VDI Gl. 202 wortgleich.

**Bewusst getrackte Annahmen / offene Norm-Punkte:**
- Kegelwinkel-Geltungsgrenzen (β_L, y) als Richtwerte markiert.
- C1 = 1 (Annahme s/d ≥ 1,9). τ_B,S/R_m,S **klassenabhängig** (8.8 = 0,65 · 10.9 = 0,62 · 12.9 = 0,60 · niedrige Klassen ~0,70; VDI 2230-1 / Thomala) — aus der Festigkeitsklasse abgeleitet, Fallback 0,62. τ_B,M/R_m,M je Werkstoffgruppe aus VDI 2230-1 Tab. 6 (unterer Rand) bzw. Lork/Hanke.
- Magnesium-Werte (τ/Rm, p_G) sind Schätzwerte (kein VDI-Beleg), sichtbar gekennzeichnet.
- **Exzentrische Last** (σ_b) noch nicht verdrahtet (`operatingStress` akzeptiert σ_b bereits). Flansch-Torsion ist **noch kein eigener Lastfall**, die dafür nötigen Momentfelder (`M_Ymax`, `q_M`, `r_a`) und der R12-Momentterm sind aber bereits vorhanden und getestet — der eigene Lastfall (M_T, z, r → F_Q intern) ist der nächste Ausbauschritt.

### 4.2 Eingabe-Validierung (`validate.js`)
`FIELDS`: **61 Felder** (Zählung ab v4.8.0 korrigiert: v4.7.0 hatte tatsächlich 57, nicht 59) mit dreisprachigem `label`/`help`, Typ/Einheit/Auswahlwerten, harten Grenzen (min/max) und typischem Bereich (warnMin/warnMax), `advanced`/`diagram`/`dependsOn` (+ **`dependsOnValue`** seit v4.8.0: Abhängigkeit von einem konkreten Enum-Wert). Feldtyp **`bool`** (Checkbox) mit Code `BOOL_INVALID`; Felder `threadFinish`, **`surfaceFinish`** (Oberfläche/Ausführung, Dauerfestigkeits-Abminderung), `r11`, `matGroupM`, `Rm_M`, `m_vorh` (Gruppe Nachweise), `rmCustom`, **`plateMat`**, `epCustom`, `pgCustom` (Werkstoff-Auswahl + „eigener Wert"); **`M_Ymax`, `q_M`, `r_a`** (R12-Drehmoment, Gruppe Belastung, advanced); **`thermalAssist`, `dT`, `alpha_S`, `asCustom`, `alpha_P`, `apCustom`** (Thermik-Assistent v4.6.0, Gruppe Belastung, advanced); **`flangeAssist`, `M_T`, `z_bolts`, `r_LK`** (Flansch-Assistent v4.7.0, Gruppe Belastung, advanced); **`boltType`, `d_0`, `d0Custom`, `L_0`** (Dehnschraube v4.8.0, Gruppe Schraube; d_0/d0Custom/L_0 mit `dependsOnValue: 'dehn'`). `enumValues('matGroupM'|'plateMat')` = Schlüssel von `TAU_RATIO` (inkl. `austenit`); `enumValues('strengthClass')` inkl. rostfreier A2/A4; `enumValues('surfaceFinish')` = Schlüssel von `SURFACE_FATIGUE`. Bedingte R11-Crossvalidation als **Warnung** (`R11_INCOMPLETE`); **Momentfeld-Crossvalidation** als harter Fehler (`MY_NEEDS_QM`/`MY_NEEDS_RA`) bzw. Warnung (`MY_WITHOUT_FQ`); **Thermik-Crossvalidation** als harter Fehler (`THERMAL_DT_MISSING`/`THERMAL_ALPHA_P_MISSING`) bzw. Warnung (`THERMAL_DT_ZERO`); **Flansch-Crossvalidation** als harter Fehler (`FLANGE_MT_MISSING`/`FLANGE_Z_MISSING`/`FLANGE_R_MISSING`) bzw. Warnung (`FLANGE_MT_ZERO`); **Dehnschrauben-Crossvalidation** als harter Fehler (`TAPER_L0_MISSING`) bzw. Warnung (`TAPER_D0_LARGE`/`TAPER_L0_LONG`). `validateInput` liefert `{ok, errors, warnings}`; jede Meldung trägt einen stabilen Code (UI übersetzt).

### 4.3 Dreisprachigkeit DE/EN/PT — vollständig
Übersetzt: Bedienoberfläche, Gruppentitel, Feldbeschriftungen, **ausführliche Hilfe/Info**, Auswahl-Hinweise, Prüfmeldungen (per Code), Engine-Hinweise (per Code, inkl. Parameter wie k_τ, ratio) **und der gesamte Rechenweg inkl. Formel-/Werte-Beschriftungen** (`LT`-Helfer; Formelzeichen neutral). Sprachwechsel baut das Formular neu auf (Werte bleiben, auch Checkbox-Zustände). `translate="no"` + `notranslate`-Meta verhindern das DOM-Zerwürfnis.

### 4.4 Beispiele (14, in `daten.js` → `listPresets()`)
Hydraulikzylinder M12 (validiert) · **Einschraubung M12 in Grauguss — R11 + SG-Nachweis** (Demo der neuen Features, nutzt `plateMat: gjl`) · Durchsteck M16 · Einschraubung M10 (ESV) · Querkraft M12 (Reibschluss) · Wechsellast M12 · Kombiniert M16 (axial+Querkraft) · Aluminium M10 · Flansch M20 · **Flansch M16 (Querkraft + Drehmoment um Schraubenachse — R12 mit M_Ymax)** · **Rostfrei M10 A4-80 in Austenit** (Einschraubung, R11, rostfreier E-Modul) · **Schwinglast M12 10.9 schlussgewalzt (SG, feuerverzinkt)** (SG-Dauerfestigkeit + Oberflächen-Abminderung) · **Alu-Flansch M12 8.8 mit ΔT = −40 K** (Thermik-Assistent, ~4,0 kN Vorspannverlust) · **Getriebeflansch M16 10.9** (Flansch-Assistent: M_T = 6000 N·m auf 8 Schrauben, r_LK 120 mm → F_Qmax 6250 N; zeigt bewusst S_G < 1). Deckt statisch/schwellend/wechselnd, Querkraft, Moment, kombiniert, thermisch, Flansch-Drehmoment, Stahl/Alu/Grauguss/rostfrei und DSV/ESV ab. Illustrative Beispiele tragen „(nicht normvalidiert)".

### 4.5 Rechenweg (`rechenweg.js`) — selbstprüfend, vollständig dreisprachig
`build(R, inp, opts)` erzeugt geordnete Schritte (Kern-Kette R3–R8/R13, bedingt R9/R10/**R11**/R12). Jeder nachrechenbare Schritt wird **unabhängig aus seiner Formel neu berechnet** und gegen den Engine-Wert geprüft; ✓ = „gegen Engine geprüft". Für das Grauguss-Beispiel z. B. 28 Schritte, davon 7 R11- und 3 SG-Schritte. Tiefe Norm-Physik (Scherquerschnitt in m_min) wird als Engine-Wert angezeigt statt dupliziert. Alle Beschriftungen via `LT` dreisprachig.

### 4.6 Verspannungsschaubild (`schaubild.js`)
`build(R, inp, opts)` liefert ein Live-SVG des Verspannungsdreiecks; Zahlenwerte in der HTML-Legende (`sb-vals`), dreisprachiger Titel/Chips, dezente Füllung + Gitternetz. Rein additiv (zeichnet nur geprüfte Werte, keine Engine-Änderung).

### 4.7 Testabsicherung (`test_solver.js`, DEV-ONLY)
`node test_solver.js`. **2.211.116 Assertions, 0 Fehler.** Enthält: Geometrie-Beweis (berechnete vs. tabellierte A_S), Invarianten, Festigkeitslogik, Fehlerbehandlung, Hunderttausende Property-Zufallsfälle, End-to-End gegen das Anhalt-Beispiel, Durchlauf aller 15 Beispiele; **R11/SV-SG-Block** (41+ Assertions inkl. unabhängiger m_min-Nachrechnung, Ast-Logik, SG-Grenzen); **R10-Doppelnachweis** (Montage+Betrieb, S_P = min, Annahme-Hinweis bei ungünstigem Betrieb); **R12-Momentblock** (M_Ymax über computeJoint + Validierung + Preset); **δ_P-Duplikat-Guard** (Sektion 16: ~4000 Zufallsgeometrien über alle 3 Kegelmodelle × DSV/ESV, δ_P Engine == Rechenweg — schlägt an, sobald nur eine Seite driftet; deckt zugleich den tanPhi-Clamp ab); **Werkstoff-Datenintegrität** (ratio/E/pG/grade/src plausibel, belegte Einzelwerte, B3-Anker R_S=2,0/C2=1,16; **TAU_RATIO-Quellenabgleich**: klassenabhängige Bolzen-Ratio 8.8/10.9/12.9, `vdiRange` sitzt am unteren Norm-Rand, `src` nennt Tab. 6 bzw. Lork/Hanke, engagement trägt matRatio/boltRatio/matSrc); **Rechenweg-Selbstprüfung über alle Presets × DE/EN/PT** (jeder Schritt gegen die Engine, R11/SG/R10/R12-Schritte vorhanden); **`.dt`-Dateiformat (Sektion 17, v4.5.0):** Round-Trip input→JSON→input für alle Presets identisch (Feldanzahl + jeder Wert), Kopf-Felder korrekt, geladene Eingaben rechnen bit-identisch; Fehlerfälle (defektes JSON, fremde App-Kennung, fehlender/falscher input-Block → freundlicher Code statt Wurf); Dateinamens-Sanitierung (verbotene Zeichen entfernt, Umlaute erhalten, reiner Whitespace-Zusatz ignoriert). Die reinen `.dt`-Helfer sind per UMD-Guard aus `ui.js` in Node ladbar — **kein Test-Duplikat, echte Funktion geprüft**; **Thermik-Assistent (Sektion 18, v4.6.0):** alpha-Datenintegrität (TAU_RATIO + BOLT_ALPHA plausibel), ΔF_Vth == unabhängige Handrechnung, Vorzeichen (Abkühlung→Verlust, Erwärmung→Gewinn), additive/subtraktive Wirkung in F_Mmin bzw. F_Smax/F_Vmax gegen die Referenz ohne Assistent, **konservative Gewinn-Klemmung** (Gewinn nicht in F_Mmin/F_KR, aber in F_Smax/F_Vmax), α-Defaults aus Klasse/Plattenwerkstoff (auch Edelstahl→16), Override-Pfad, Assistent-Vorrang vor manuellem ΔF_Vth, Fehlercodes (`THERMAL_DT_MISSING`/`THERMAL_ALPHA_P_MISSING`), Rechenweg-Schritt R4b in DE/EN/PT und Konsistenz aller Schritte im Gewinnfall; **Flansch-Assistent (Sektion 19, v4.7.0):** `flangeShear` == Handrechnung (F_Qmax = M_T/(z·r_LK)), Wurf bei z=0/r_LK=0, **Kernaussage** „Assistent == manuelles F_Qmax" (bit-identischer slip-Block, identische Gesamtkette F_Mmin/F_Smax/S_F), r_LK-Hebel (doppelter Radius → halbe Umfangskraft → größeres S_G), Kombination mit M_Ymax, Assistent-Vorrang vor manuellem F_Qmax, `inp`-Unversehrtheit (computeJoint mutiert das Eingabeobjekt nicht), Fehlercodes (`FLANGE_MT_MISSING`/`FLANGE_Z_MISSING`/`FLANGE_R_MISSING`), Rechenweg-Schritt R12a in DE/EN/PT (ohne Assistent kein R12a, aber F_KQ,erf bleibt); **Dehnschrauben (Sektion 20, v4.8.0):** Taillenglied in `boltCompliance` == Handrechnung (inkl. Würfe l_0<0 / l_0>0 ohne d_0, l_0=0 wirkungslos), volle F_Mzul-von-Mises-Kette mit A_0/W_p(d_0) unabhängig nachgerechnet, σ_z,max/σ_a/F_0,2min(SG) im Taillenquerschnitt, δ_S-Differenz == L_0/(E_S·A_0), Φ_en sinkt, **S_D-Vorteil des Referenzbeispiels**, **R11 bit-identisch mit/ohne Taille** (Gewindebezug A_S), Fallback A_0 ≥ A_S rechnet nachweislich wie die Schaftschraube (+ Hinweis `TAPER_NOT_GOVERNING`), d_0-Richtwert 0,9·d_3 + `ASSUME_TAPER_D0`/`ASSUME_TAPER`, **Schaftschrauben-Regress bit-identisch** (boltType fehlt/'schaft', 11 Kerngrößen), `inp`-Unversehrtheit, Fehlercodes + `enumValues`/`fieldOptions`/Feldhilfen dreisprachig, `dependsOnValue`-Schema, Rechenweg-Schritt `taper` + umgeschaltete A_0-Formeln in DE/EN/PT (ohne Dehnschraube kein taper-Schritt, Fallback zeigt A_S). Regel: Tests werden erweitert, nie gelockert.

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

### 4.9 Verbesserungs-Hinweise (Stufe 2, v4.3.0)
`improvementHints(R, inp)` im Solver liefert `R.improvements` — pro Sicherheit unter der Ampel-Grenze 1,2 ein Objekt `{safety, level:'warn'|'bad', code, v:{Zielwerte}}`. Zielwerte sind geschlossene Inversionen auf S = 1,2:
- **S_P** (`FIX_SP`): A_p,erf = A_p·1,2/S_P → d_w,erf = √(A_p,erf·4/π + d_h²); alternativ p_G,erf; nennt maßgeblichen Zustand (Montage/Betrieb).
- **S_A** (`FIX_SA`): m_vorh,erf = 1,2·m_min + m_zu.
- **S_G** (`FIX_SG`): µ_T,erf = µ_T·1,2/S_G; F_Qmax,zul = F_Qmax·S_G/1,2.
- **S_D** (`FIX_SD`): σ_a,zul = σ_a·S_D/1,2 (Lastreduktion in %); SG-Option nur bei aktuell SV, blank-Option nur bei aktuell verzinkt/HV.
- **S_F** (`FIX_SF`): Vorspannungs-/Anziehmoment-Reduktion in %.

UI: dreisprachige `HINT`-Templates + `hintText()`; gesammelter **Verbesserungs-Block** (`.improve-box`) im Hinweisbereich mit Überschrift und Kopplungs-Zusatz. Gelb (1,0–1,2) und Rot (< 1,0) werden beide gezeigt. Ehrlichkeit: Zielwerte sind Richtungsvorschläge — die Sicherheiten sind gekoppelt (Vorspannung senken hilft S_F/S_P, schwächt S_G/S_D), daher der Hinweis, andere Nachweise erneut zu prüfen. Nicht umgesetzt (bewusst): Stufe 3 (iterativer Auto-Fix über alle Felder).

<a id="5"></a>
## 5. Umsetzungs-Roadmap — erledigt & offen

**✅ Erledigt**
- Modulares, testbares Gerüst (8 UMD-Module + Dev-Harness); Offline-Regeln eingehalten.
- Engine R0–R13 (zentrisch) inkl. Verformungskegel; validiert (Anhalt/Ruoss).
- **Vollständiger R11-Nachweis** (Gewinde-Scherquerschnitte, R_S, C1/C2/C3, m_min, m_zu, S_A) — normbelegt, B3-Anker in der Suite.
- **SV/SG-Dauerfestigkeit** vollständig (Auto-Auswahl über Feld, Rückfall SV) + **Oberflächen-/Ausführungs-Abminderung** (blank/feuerverzinkt/HV).
- **Rostfreie/austenitische Verschraubungen** (A2/A4-Klassen, austenitischer E-Modul + Scherzahl, Werkstoffgruppe Austenit).
- **R10 Flächenpressung im Montage- UND Betriebszustand** (kleineres S_P maßgeblich) — v4.1.0.
- **R12 mit Drehmoment um die Schraubenachse** (Felder M_Ymax/q_M/r_a, Cross-Validation, Preset) — v4.1.0; Basis für den eigenen Flansch-Torsion-Lastfall.
- **Vereinheitlichte Werkstofftabelle** (τ/Rm, E, p_G) als single source of truth; **alle τ_B/R_m-Werte normbelegt** (VDI 2230-1 Tab. 6 unterer Rand / Lork-Hanke); Bolzen-Scherzahl klassenabhängig; Alu in Knet/Guss getrennt, 16MnCr5 ergänzt, Magnesium als Schätzwert markiert.
- **Werkstoff-Dropdowns mit „eigener Wert"-Haken** (`fillFromMaterial`) für Rm_M, E-Modul, p_G.
- Oberfläche (Profi-Look, Hell/Dunkel), Live-Prüfung, Ausgrauen (inkl. Checkbox), fünf Sicherheits-Kacheln inkl. S_A, R11-Ergebnistabelle, 15 Beispiele.
- **Dreisprachigkeit DE/EN/PT vollständig** inkl. **aller** Rechenweg-Formel-/Werte-Beschriftungen (`LT`).
- **Dokumentierter, selbstprüfender Rechenweg** inkl. R11-/SG-/R10-Doppel-/R12-Moment-/R4b-Thermik-Schritten; in die Testsuite aufgenommen (alle Presets × 3 Sprachen).
- **Verspannungsschaubild** als Live-SVG (dreisprachig, Werte in Legende).
- **Bug-Report-Durchgang v4.1.0** (A1–A6, B1–B3, C1–C3) vollständig abgearbeitet; Robustheit (tanPhi-Clamp, δ_P-Guard), Sicherheit (kein innerHTML mit Werten), A11y (Focus-Trap), Recht (Print-Disclaimer). Details in 4.8.
- **Verbesserungs-Hinweise (Stufe 2)**: konkrete, dreisprachige Handlungsempfehlungen mit Zielwerten für jede nicht-grüne Sicherheit (S_P/S_A/S_G/S_D/S_F), gesammelt im Hinweisbereich.
- **Ingenieur-Workstation Baustein 1 — Speichern/Laden `.dt` (v4.5.0):** Berechnung als `.dt` sichern (nur Eingaben + Kopf) und laden (frisch gerechnet); Subbar-Bedienung + Statuszeile dreisprachig; robuste Fehlerbehandlung; reine Helfer per UMD in Node getestet (Sektion 17). Keine Solver-Änderung. **Vom Anwender ausgiebig getestet & bestätigt.**
- **Ingenieur-Workstation Baustein 2 — Thermik-Rechner (v4.6.0):** ΔT statt manuellem ΔF_Vth; ΔF_Vth = l_K·(α_S−α_P)·ΔT/(δ_S+δ_P); α_S aus Klasse (`BOLT_ALPHA`), α_P aus Plattenwerkstoff (`TAU_RATIO.alpha`), beide mit „selbst eingeben"-Haken; aktiver Assistent sperrt+füllt `deltaFvth`; Vorspann-Gewinn konservativ nur in F_Smax/F_Vmax, nicht in F_Mmin/F_KR; E(T)=konst. ehrlich ausgewiesen; Rechenweg-Schritt R4b; 13. Beispiel. Getestet (Sektion 18). **Vom Anwender ausgiebig getestet & bestätigt.**
- **Ingenieur-Workstation Baustein 3 — Flansch-Assistent (v4.7.0):** M_T/z_bolts/r_LK → F_Qmax = M_T/(z·r_LK) je Schraube (`flangeShear`), Normalisierung am Anfang von `computeJoint` (flache inp-Kopie), speist die unveränderte R12-Kette; aktiver Assistent sperrt+füllt `F_Qmax`; Rechenweg-Schritt R12a; 14. Beispiel „Getriebeflansch M16". Reiner Wrapper, keine neue Physik. Getestet (Sektion 19: Assistent == manuelles Äquivalent, bit-identisch). **Vom Anwender ausgiebig getestet & bestätigt.**

**▶️ Als Nächstes — Ausbau zur Ingenieur-Workstation (Baustein 4, letzter der v4.4-Serie)**

Verbindliche Design-Leitplanken für Baustein 4:
- **Übersichtlichkeit vor Funktionsfülle:** neue Felder erscheinen nur, wenn der Fall aktiv ist; sie werden farblich als „hier noch eingeben" markiert (bestehendes Pflichtfeld-Muster). Links beim Start **nur die erste Gruppe aufgeklappt**.
- **Auswahl + Haken:** wo immer möglich Auswahlmenüs; wo ein Zahlenwert gesetzt wird, Vorbelegung aus Tabelle + „eigener Wert"-Haken (Muster `fillFromMaterial`). Laien-Erklärungen im ⓘ-Bereich.
- **Assistenten ersetzen statt ergänzen:** ist ein Assistent aktiv, werden die manuellen Zielfelder gesperrt + automatisch gefüllt (Provenienz-Label); nur ein Weg gleichzeitig. Manueller Override bleibt möglich.
- **Dreisprachig** (DE/EN/PT) inkl. Rechenweg (Formel + Werte). **Ehrlichkeit** bei Näherungen (klar benannter Umfang, Hinweis-Codes).
- **Regressions-Pflicht:** VOR und NACH dem Baustein Lauf über alle 15 Presets × 3 Sprachen (Solver + Rechenweg + Schaubild, kein NaN) **und** volle Testsuite (aktuell 2.211.116, 0 Fehler). Tests werden erweitert, nie gelockert.

**1. Speichern & Laden als `.dt`-Datei ✅ ERLEDIGT (v4.5.0)** *(größter Alltagsnutzen, kein Physik-Risiko)*
- Umgesetzt: fertige Berechnung als Datei herunterladen und später laden; die Eingaben tragen sich automatisch ein (identisch zum Preset-Lademechanismus `loadPreset`).
- Format: **nur Eingaben + Kopf** (`{app, version, created, label, input:{…}}`) als JSON. Ergebnisse werden beim Laden frisch gerechnet (robust gegen Versionswechsel). Endung `.dt`, Dateiname `Berechnung_JJJJ-MM-TT_Zusatz.dt` (Zusatz per Bezeichnungsfeld, saniert). Reine Helfer `dtSerialize`/`dtParse`/`dtFileName` (per UMD-Guard auch in Node).
- Laden per **sichtbarem Button** (mobilrobust) über verstecktes `<input type=file>`; Datei via `FileReader` einlesen, `input` durch dieselbe Fülllogik wie Presets setzen (Preset-Auswahl springt auf „eigene Eingabe"), dann `liveValidate` + `compute`. Versionsabweichung → gelber Hinweis (kein harter Fehler). Dreisprachige Statuszeile.
- Dateien: `ui.js` (Export/Import + Subbar-Buttons + i18n), `DT-ProfiSchraube_Test.html` (Subbar-Elemente), `style.css` (`.dt-file`/`.dt-msg`); **keine** Solver-Änderung. Test (Sektion 17): Round-Trip für alle Presets identisch, bit-identische Neuberechnung, Fehlerfälle freundlich, Dateinamens-Sanitierung. Vom Anwender bestätigt.

**2. Thermik-Rechner (R4-Assistent) ✅ ERLEDIGT (v4.6.0)** *(mittel — verhindert Vorzeichenfehler)*
- Umgesetzt: statt manuellem `deltaFvth` nur noch **ΔT** eingeben; ΔF_Vth = l_K·(α_S−α_P)·ΔT/(δ_S+δ_P), gekoppelt über die Nachgiebigkeiten. α in 10⁻⁶/K.
- Physik (VDI-Näherung, Umfang klar benannt): Vorzeichen korrekt (Alu-Teile auf Stahlschraube → Abkühlung = Verlust, Erwärmung = Gewinn). **Vorspann-Gewinn (ΔF_Vth < 0) konservativ geklemmt**: `deltaFvthLoss = max(0; ΔF_Vth)` in F_Mmin/F_KR (kalter Zustand maßgeblich), voller signierter Wert in F_Smax/F_Vmax (erhöht dort Kraft/Pressung). Gilt auch für manuelle negative Werte. Temperaturabhängigkeit der E-Moduln NICHT enthalten (`ASSUME_THERMAL_APPROX`).
- Daten: `TAU_RATIO` je Werkstoff um **`alpha`** erweitert (Stahl/Austenit 11,5/16, GJL 10, GJS 12, Alu-Knet 23/Guss 21, Mg 26); Schraube separat in **`BOLT_ALPHA`** {steel:11.5, stainless:16}. α_S aus Festigkeitsklasse (`fillAlphaS`), α_P aus Plattenwerkstoff (`fillFromMaterial`), beide gesperrt + „selbst eingeben"-Haken.
- Bedienung: Bool „Thermik-Assistent" (advanced) → Felder ΔT, α_S, α_P (+ Haken `asCustom`/`apCustom`). Aktiv → `deltaFvth` gesperrt + nach `compute` aus der Engine gefüllt (Provenienz „aus Thermik-Assistent"). Assistent hat Vorrang vor manuellem `deltaFvth`.
- Dateien: `daten.js` (alpha + BOLT_ALPHA + Preset), `solver.js` (ΔF_Vth-Berechnung + Gewinn-Klemmung, greift in R4/R5/R8/R10/R12), `validate.js` (6 Felder + Crossvalidation), `rechenweg.js` (R4b-Schritt), `ui.js` (fillAlphaS/updateThermalLock + i18n). Beispiel „Alu-Flansch M12 mit ΔT". Test (Sektion 18): Vorzeichen/Betrag gegen Handrechnung, Gewinn-Klemmung, α-Vorbelegung, Override, Assistent-Vorrang, Fehlercodes, Rechenweg DE/EN/PT. **Vom Anwender bestätigt.**

**3. Flansch-Assistent (UX-Wrapper für R12) ✅ ERLEDIGT (v4.7.0)** *(klein — Physik steht schon)*
- Umgesetzt: Nutzer gibt **M_T** (Gesamtmoment), **z_bolts** (Schraubenzahl), **r_LK** (Lochkreisradius); Helfer `flangeShear` rechnet F_Qmax = M_T/(z·r_LK) und speist R12.
- Bedienung: Haken „Flansch-Assistent" (advanced) blendet M_T/z_bolts/r_LK ein; aktiv → das manuelle `F_Qmax` wird **gesperrt + automatisch gefüllt** (Provenienz „aus Flansch-Assistent"), Vorrang vor manueller Eingabe. Nur ein Weg aktiv.
- Physik: bereits vorhanden (R12 mit `M_Ymax`/`q_M`/`r_a`, seit v4.1.0 getestet) — reiner Wrapper. Umsetzung als **Normalisierung am Anfang von `computeJoint`**: bei aktivem Assistenten wird `inp` flach kopiert und `F_Qmax` gesetzt (Original unberührt) → die gesamte R12-Kette läuft byte-identisch. Keine Kernänderung.
- Dateien: `solver.js` (`flangeShear` + Normalisierung + `flange` im Result), `validate.js` (4 Felder + Crossvalidation), `rechenweg.js` (Zwischenschritt R12a „F_Qmax aus M_T/z/r_LK"), `ui.js` (`updateFlangeLock` + i18n), `daten.js` (Preset). Beispiel „Getriebeflansch M16". Test (Sektion 19): F_Q-Umrechnung, **Ergebnis identisch zum manuellen Äquivalent** (bit-identischer slip-Block), Sperr-/Füll-Logik, r_LK-Hebel, `inp`-Unversehrtheit, Fehlercodes, Rechenweg DE/EN/PT. **Vom Anwender bestätigt.**

**4. Dehn-/Taillenschrauben (A_0-Umschaltung) ✅ ERLEDIGT (v4.8.0)** *(einziger echter Kern-Eingriff der Serie)*
- Umgesetzt: Schraubentyp-Auswahl `boltType` (schaft/dehn, DIN 2510) mit **d_0** und **L_0**. A_0 = π/4·d_0² ersetzt A_S **selektiv** in δ_S (zusätzliches Taillenglied; `lShank` = nicht-taillierter Anteil), **R7** (F_Mzul mit W_p aus d_0 — Taille auch beim Anziehen maßgeblich, gemeinsam so entschieden), **R8** (σ_z,max) und **R9** (σ_a, F_0,2min bei SG) — **nicht** beim Gewinde-/R11-Bezug (Test erzwingt Bit-Identität).
- Ehrliche Ränder: A_0 ≥ A_S → Fallback auf A_S mit `TAPER_NOT_GOVERNING`; d_0 fehlt → Richtwert 0,9·d_3 (`ASSUME_TAPER_D0`); Scope-Hinweis `ASSUME_TAPER`.
- Bedienung: d_0 aus der Gewindegröße **vorbelegt + gesperrt** (`fillD0`, „Richtwert 0,9·d_3 (DIN 2510)"), Haken `d0Custom` gibt frei; `dependsOnValue: 'dehn'` blendet die Taillenfelder nur bei Dehnschraube ein; ausführliche Laien-ⓘ (warum Dehnschraube) dreisprachig; Kennwert-Tabelle zeigt d_0/L_0/A_0.
- Dateien: `solver.js` (Taillenblock + `A_sig`, `TAPER_D0_FACTOR`, Engine 0.9.0), `validate.js` (4 Felder + Crossvalidation), `rechenweg.js` (Schritt `taper` + A_0-Formeln), `ui.js` (`fillD0`, `dependsOnValue`, i18n, kv-Zeilen), `daten.js` (15. Beispiel), `test_solver.js` (Sektion 20). Referenzbeispiel zeigt den Vorteil (S_D 10,44 vs. 9,58 als Schaftschraube). **Vom Anwender am Handy real getestet & bestätigt (2026-07-05).**

**▶️ Danach (nach der v4.4-Serie)**
0. **Vollständiger Code-Audit + Prüfbericht (ALLERERSTE Aufgabe, siehe 0.2).** Komplette statische Durchsicht aller 8 Module + Testharness auf Fehler/Bugs/Regressionen/tote Pfade/i18n-Lücken, plus dynamische Checks (15 Presets × 3 Sprachen, Rechenweg-Selbstprüfung, Validierungspfade, `.dt`-Round-Trip). Ergebnis als `Pruefbericht_DT-ProfiSchraube-4-8-0.md` (nach Schweregrad, mit Datei/Zeile/Fix). Kritische/mittlere Funde sofort fixen (Test erweitern, nie lockern). Erst danach:
1. **Ausgabe/Bericht:** Browser-Druck + **self-hosted jsPDF** (PDF), **RTF**, **CSV**, Diagramm-PNG/SVG — offline. Bericht nimmt Schaubild + Rechenweg mit; Disclaimer + Normzeile im PDF (Print-CSS seit v4.1.0 vorbereitet). Neues `report.js` + `jspdf.min.js`. Das `.dt`-Format (Baustein 1) ist die Vorstufe/Ergänzung dazu.
2. **2D-Schnitt** der Verbindung als Live-SVG.
3. **Inline-SVG-Skizzen** für Geometrie-Felder im ⓘ-Fenster (Slot vorhanden).
4. **Exzentrische Last** (σ_b; Ruoss B4/B5).
5. **Build-/Obfuskierungs-Schritt**, `DT-ProfiSchraube_Pro.html`, Test/Pro-Gating; A7-Vordimensionierung.

**Prinzip „Tabellenwerte als Liste + Haken" weiterführen:** wo noch sinnvoll, weitere Tabellenfelder nach `fillFromMaterial` anbinden. Neue Auswahl immer im erlaubten Bereich, fehlerfrei, dreisprachig, mit Laien-Hilfe und im Rechenweg sichtbar.

**Benchmarks, die Entscheidungen ändern**
- Abweichung gegen Anhang-B > ±2 % → Nachgiebigkeits-/Kegelmodell prüfen, ggf. Originalnorm beschaffen.
- Bestätigter Markenkonflikt „Profischraube" → Umbenennung vor Markteintritt.
- Nachfrage nach Mehrschraubenverbindungen → Blatt 2 (FEM) als separates Modul.

═══════════════════════════════════════════════════════════════════════════

<a id="6"></a>
## 6. Changelog

**v4.8.1 (2026-07-05) — Vollständiger Code-Audit über alle 8 Module + Testharness (bestanden)**
- **Anlass:** die im Masterplan v4.8.0 festgelegte „ALLERERSTE AUFGABE" — nach den vier Bausteinen (v4.5.0–v4.8.0) der komplette Code Datei für Datei auf Fehler, Regressionen, tote Pfade und Inkonsistenzen prüfen, bevor ein neues Feature beginnt. Ergebnis als eigener Prüfbericht `Pruefbericht_DT-ProfiSchraube-4-8-0.md` im Projekt-Ordner (Befunde nach Schweregrad, je mit Datei, Diagnose, Fix).
- **Kein kritischer Befund.** Gefunden und **sofort gefixt** (je mit Test-Erweiterung, nie gelockert):
  - **S-1 (🟠 solver.js):** Der Verbesserungs-Hinweis FIX_SG bildete den zulässigen Querkraft-Zielwert als `F_Qmax·S_G/1,2` — das ist nur **ohne** Drehmoment um die Schraubenachse exakt. Mit `M_Ymax > 0` blieb der davon unabhängige Term `t2 = M_Ymax/(q_M·r_a·µ_T)` unberücksichtigt; der vorgeschlagene Wert lieferte nachgerechnet S_G ≈ 0,14 statt 1,2 (**nicht-konservativ**). Fix: `F_Qmax,zul = (F_KR/1,2 − t2)·q_F·µ_T`, bei ≤ 0 auf 0 geklemmt; ohne M_Ymax algebraisch identisch zur alten Form (bestehende Tests bit-identisch grün).
  - **U-1 (🟠 ui.js + HTML):** Footer/Info zeigten „Engine v0.8.0", tatsächlich läuft `0.9.0-engine`. Fix: i18n-Strings tragen den Platzhalter `{v}`, den der i18n-Applier und das Info-Panel aus `SOLVER.VERSION` füllen — **driftsicher** für künftige Versionssprünge.
  - **S-2 (🟡 solver.js/ui.js):** Bei `F_Kerf = 0` wird `F_KR = 0` → `S_G = 0`; der µ_T-Zielwert wurde dann `µ_T·(1,2/0) = Infinity` („µ_T ≥ Infinity"). Fix: `mu = null` bei S_G ≤ 0, `hintText` entfernt die eingeklammerte µ_T-Klausel (sprachneutral, DE/EN/PT); `fq = 0` bleibt korrekt.
  - **S-3 (🟡 solver.js):** irreführender Kommentar zu `F_Vmax` präzisiert (R10-Betrieb nutzt konservativ F_Smax; F_Vmax ist reine Ausgabegröße). Keine Logikänderung.
  - **V-1 (🟡 validate.js):** die Schätzwert-Kennzeichnung in den Werkstoff-Dropdowns (matGroupM/plateMat, Magnesium) war hart deutsch. Fix: über `pick({de,en,pt})` dreisprachig.
- **Dynamische Verifikation:** alle 15 Presets × 3 Sprachen (Solver + Rechenweg + Schaubild) ohne NaN/Infinity; Rechenweg-Selbstprüfung je Schritt `ok`; `.dt`-Round-Trip aller 15 Presets bit-identisch; Fehler-/Warnpfade der Validierung greifen. Automatische Schema-Prüfung: 61 Felder, label/help vollständig DE/EN/PT, alle `dependsOn`-Ziele existieren, Enums nicht-leer, Grenzen konsistent. Offline-Leitplanken bestätigt (kein fetch/CDN/import; CSS ohne externe Ressourcen; Print hält Disclaimer/Norm sichtbar).
- **Geänderte Dateien:** `solver.js`, `ui.js`, `validate.js`, `DT-ProfiSchraube_Test.html`, `test_solver.js`. Unverändert: `daten.js`, `rechenweg.js`, `schaubild.js`, `style.css`.
- **Backlog (kein Handlungsdruck, notiert):** **D-1** tote Referenztabellen `P_G`/`E_MODULUS` in `daten.js` (durch `TAU_RATIO` abgelöst) entfernen; **S-6** µ_T-Zielwert optional als „unphysikalisch (> 0,3)" kennzeichnen, wenn er als alleiniger Hebel über den warnMax läge.
- **Testsuite 2.211.104 → 2.211.116** (0 Fehler): +6 für die FIX_SG-Inversion mit M_Ymax und den F_KR=0-Randfall, +6 für die dreisprachige Schätzwert-Notiz. **Vom Anwender am Handy real getestet & bestätigt (2026-07-05).**

**v4.8.0 (2026-07-05) — Ingenieur-Workstation Baustein 4: Dehn-/Taillenschrauben (A_0-Umschaltung) — Serie komplett**
- **Neuer Schraubentyp:** Auswahl `boltType` (schaft/dehn). Bei Dehnschraube (DIN 2510) beschreiben **d_0** (Taillendurchmesser) und **L_0** (Taillenlänge) den verjüngten Schaftabschnitt.
- **Selektive A_0-Ersetzung (einziger echter Kern-Eingriff der Serie):** A_0 = π/4·d_0². **δ_S** erhält ein zusätzliches Reihenglied L_0/(E_S·A_0) in `boltCompliance` (Konvention: `lShank` = NICHT-taillierter Schaftanteil, nichts wird still abgezogen). **R7** rechnet F_Mzul im Taillenquerschnitt (A_0 + W_p = π/16·d_0³ — die Taille ist auch beim **Anziehen** der schwächste Querschnitt; Entscheidung gemeinsam mit dem Anwender), τ_residual/σ_red,B konsistent über `pp.W_p`. **R8:** σ_z,max = F_Smax/A_0. **R9:** σ_a = Φ_en·ΔF/(2·A_0), F_0,2min = R_p0,2·A_0 (SG). **Gewinde-/R11-Bezug bleibt A_S** — Testsektion 20 erzwingt Bit-Identität von F_mS/m_min mit/ohne Taille.
- **Ehrliche Ränder:** maßgeblicher Querschnitt `A_sig` — ist A_0 ≥ A_S (keine echte Taille), laufen die Nachweise nachweislich wie bei der Schaftschraube weiter (Hinweis `TAPER_NOT_GOVERNING`); fehlt d_0, greift der Richtwert **0,9·d_3** (`ASSUME_TAPER_D0`; Konstante `TAPER_D0_FACTOR` exportiert); Scope-Hinweis `ASSUME_TAPER`. Ergebnis trägt `R.taper` {d_0, L_0, A_0, W_p0, governs} und `R.A_sig`.
- **Bedienung** (Muster „Vorbelegung + Haken"): d_0 wird aus der Gewindegröße vorbelegt und gesperrt (`fillD0`, Provenienz „Richtwert: 0,9·d_3 (DIN 2510)"); Haken **`d0Custom`** gibt das Zeichnungsmaß frei. Neues generisches Schema-Attribut **`dependsOnValue`** (in `updateDependencies`): d_0/d0Custom/L_0 sind nur bei `boltType = 'dehn'` aktiv. Ausführliche Laien-ⓘ (wozu eine Dehnschraube gut ist; Warnung, nichts doppelt einzugeben) in DE/EN/PT. Kennwert-Tabelle zeigt d_0/L_0/A_0.
- **Rechenweg:** neuer selbstprüfender Schritt **„Dehnschraube: Taillenquerschnitt A_0"** (d_0 robust aus `R.taper`, wie F_Qmax in R12a); δ_S-/R7-/σ_z-/σ_a-Schritte schalten Formeln, eingesetzte Werte und Hinweise auf A_0/W_p(d_0) um, wenn die Taille maßgeblich ist — dreisprachig, jeder Schritt gegen die Engine geprüft.
- **15. Beispiel** „Dehnschraube M16 10.9" (d_0 = 12,2 mm mit `d0Custom`, L_0 = 85 mm, l_K = 100, Schwelllast 30 kN, n = 0,3): alles grün (S_F 1,29 · S_D 10,44 · S_P 1,29); dieselbe Verbindung als Schaftschraube hätte S_D 9,58 und S_P 0,92 (rot) → der Dehnschrauben-Vorteil ist im Beispiel sichtbar. Ehrlicher Befund: der S_D-Gewinn ist geometrieabhängig (weichere Schraube senkt Φ_en, kleineres A_0 erhöht σ_a) — lange Taille + steife Platten zeigen ihn.
- **Validierung:** 4 neue Felder (`boltType`, `d_0`, `d0Custom`, `L_0`) → **61 Felder** (Zählung korrigiert: v4.7.0 hatte tatsächlich 57, nicht 59); Crossvalidation `TAPER_L0_MISSING` (Fehler), `TAPER_D0_LARGE`/`TAPER_L0_LONG` (Warnungen); `enumValues('boltType')` + dreisprachige `fieldOptions`-Hinweise (Schaftschraube als Standard „empfohlen").
- **Engine-Version 0.8.0 → 0.9.0** (`.dt`-Dateien älterer Version laden weiter mit gelbem Hinweis). Dateien: `solver.js`, `validate.js`, `rechenweg.js`, `ui.js`, `daten.js`, `test_solver.js`. HTML/CSS unverändert.
- **Testsuite 2.210.860 → 2.211.104** (0 Fehler): neue **Sektion 20** — Taillenglied == Handrechnung (+ Fehlerwürfe), F_Mzul-von-Mises-Kette mit A_0/W_p(d_0) unabhängig nachgerechnet, σ_z/σ_a/F_0,2min im Taillenquerschnitt, δ_S-Differenz == L_0/(E_S·A_0), S_D-Vorteil, **R11 bit-identisch**, Fallback == Schaftschraube, d_0-Richtwert + Hinweise, **Schaftschrauben-Regress bit-identisch** (11 Kerngrößen), `inp`-Unversehrtheit, Fehlercodes + Feldhilfen dreisprachig, Rechenweg-Schritt `taper` und A_0-Formeln in DE/EN/PT. Regressions-Vor-/Nachlauf (15 Presets × 3 Sprachen, kein NaN) grün. **Vom Anwender am Handy real getestet & bestätigt (2026-07-05).**

**v4.7.0 (2026-07-05) — Ingenieur-Workstation Baustein 3: Flansch-Assistent (UX-Wrapper für R12)**
- **Neuer Flansch-Assistent:** statt die Querkraft je Schraube selbst auszurechnen, gibt der Nutzer das Gesamt-Drehmoment **M_T**, die Schraubenzahl **z_bolts** und den Lochkreisradius **r_LK** ein. Der reine Helfer **`flangeShear`** bildet **F_Qmax = M_T/(z·r_LK)** je Schraube (gleichmäßige Lastaufteilung).
- **Reiner Wrapper, keine neue Physik:** die Umrechnung passiert als **Normalisierung ganz am Anfang von `computeJoint`** — bei aktivem Assistenten wird `inp` flach kopiert und `F_Qmax` gesetzt (das übergebene Original bleibt unberührt), danach läuft die seit v4.1.0 getestete R12-Kette **byte-identisch** weiter. Ergebnis nachweislich identisch zum manuellen `F_Qmax` (Test: bit-identischer slip-Block).
- **Bedienung** (Muster wie gehabt): Haken „Flansch-Assistent" (advanced) blendet M_T/z_bolts/r_LK ein; aktiver Assistent **sperrt** das manuelle `F_Qmax` und **füllt** es nach `compute` aus der Engine (Provenienz „aus Flansch-Assistent", `updateFlangeLock`). Assistent hat Vorrang vor manuellem `F_Qmax`.
- **Rechenweg:** neuer selbstprüfender Schritt **R12a** „Umfangskraft je Schraube F_Qmax = M_T/(z·r_LK)" (dreisprachig), vor dem F_KQ,erf-Schritt; F_Qmax wird im Rechenweg robust aus dem Engine-Ergebnis bezogen. **14. Beispiel** „Getriebeflansch M16 10.9" (6000 N·m auf 8 Schrauben, r_LK 120 mm → F_Qmax 6250 N; zeigt bewusst S_G < 1 → demonstriert die Verbesserungs-Hinweise).
- **Validierung:** 4 neue Felder (`flangeAssist`, `M_T`, `z_bolts`, `r_LK`) → **59 Felder**; Crossvalidation `FLANGE_MT_MISSING`/`FLANGE_Z_MISSING`/`FLANGE_R_MISSING`/`FLANGE_MT_ZERO`.
- **Dateien:** `solver.js`, `validate.js`, `rechenweg.js`, `ui.js`, `daten.js`, `test_solver.js`. HTML/CSS unverändert.
- **Testsuite 2.210.672 → 2.210.860** (0 Fehler): neue **Sektion 19** — `flangeShear` == Handrechnung, Würfe bei z=0/r_LK=0, Kernaussage „Assistent == manuelles F_Qmax" (bit-identischer slip-Block + identische Gesamtkette), r_LK-Hebel, Kombination mit M_Ymax, Assistent-Vorrang, `inp`-Unversehrtheit, Fehlercodes, Rechenweg-Schritt R12a in DE/EN/PT. Regressions-Vor-/Nachlauf (14 Presets × 3 Sprachen, kein NaN) grün. **Vom Anwender ausgiebig getestet & bestätigt.**

**v4.6.0 (2026-07-04) — Ingenieur-Workstation Baustein 2: Thermik-Rechner (R4-Assistent)**
- **Neuer Thermik-Assistent:** statt manuellem ΔF_Vth nur noch **ΔT** eingeben. ΔF_Vth = l_K·(α_S−α_P)·ΔT/(δ_S+δ_P), berechnet in `computeJoint`. Positiv = Vorspannverlust.
- **α-Daten:** jeder der 9 Werkstoffe in `TAU_RATIO` trägt jetzt **`alpha`** [10⁻⁶/K] (Stahl/Austenit 11,5/16, GJL 10, GJS 12, Alu-Knet 23/Guss 21, Mg 26; Richtwerte 20–100 °C, editierbar). Schrauben-α separat in **`BOLT_ALPHA`** {steel:11.5, stainless:16}, Auswahl automatisch über die Festigkeitsklasse.
- **Bedienung** (Muster wie gehabt): Bool „Thermik-Assistent" (advanced) blendet ΔT, α_S, α_P ein; α_S aus Klasse (`fillAlphaS`), α_P aus Plattenwerkstoff (`fillFromMaterial`), beide gesperrt + „selbst eingeben"-Haken (`asCustom`/`apCustom`). Aktiver Assistent **sperrt** das manuelle `deltaFvth` und **füllt** es nach `compute` aus der Engine (Provenienz „aus Thermik-Assistent"). Assistent hat Vorrang vor manuellem `deltaFvth`.
- **Korrektheits-Entscheidung (konservativ):** ein Vorspann-**Gewinn** (ΔF_Vth < 0, z. B. Alu-Teile bei Erwärmung) wird für F_Mmin und die Restklemmkraft F_KR **nicht gutgeschrieben** (`deltaFvthLoss = max(0; ΔF_Vth)`; kalter Zustand bleibt maßgeblich), wirkt aber vorzeichenrichtig in F_Smax/F_Vmax (erhöht Schraubenkraft/Pressung). Gilt auch für manuell eingegebene negative Werte. Näherung **E(T) = konstant** ehrlich ausgewiesen (`ASSUME_THERMAL_APPROX`), Hinweis `HINT_DFVTH_GAIN` im Gewinnfall.
- **Rechenweg:** neuer selbstprüfender Schritt **R4b** (dreisprachig); F_Mmin- und F_KR-Schritt zeigen `max(0; ΔF_Vth)`. **13. Beispiel** „Alu-Flansch M12 8.8 mit ΔT = −40 K" (~4,0 kN Verlust, bleibt grün).
- **Validierung:** 6 neue Felder (`thermalAssist`, `dT`, `alpha_S`, `asCustom`, `alpha_P`, `apCustom`) → **53 Felder**; Crossvalidation `THERMAL_DT_MISSING`/`THERMAL_ALPHA_P_MISSING`/`THERMAL_DT_ZERO`.
- **Dateien:** `daten.js`, `validate.js`, `solver.js`, `rechenweg.js`, `ui.js`, `test_solver.js`. HTML/CSS unverändert.
- **Testsuite 2.210.483 → 2.210.672** (0 Fehler): neue **Sektion 18** — Handrechnung, beide Vorzeichenfälle, konservative Gewinn-Klemmung (F_Mmin/F_KR vs. F_Smax/F_Vmax gegen Referenz ohne Assistent), α-Defaults (auch Edelstahl→16), Override, Assistent-Vorrang, Fehlercodes, Rechenweg-Schritt R4b in DE/EN/PT. Regressions-Vor-/Nachlauf (13 Presets × 3 Sprachen, kein NaN) grün. **Vom Anwender ausgiebig getestet & bestätigt.**

**v4.5.0 (2026-07-04) — Ingenieur-Workstation Baustein 1: Speichern & Laden als `.dt`-Datei**
- **Neues `.dt`-Dateiformat** (nur Eingaben + Kopf `{app, version, created, label, input}` als JSON; Ergebnisse werden beim Laden **frisch** gerechnet → robust gegen Versionswechsel). Reine, DOM-freie Helfer `dtSerialize`/`dtParse`/`dtFileName` in `ui.js`, per **UMD-Guard auch in Node** — der Testharness prüft damit die **echte** Funktion, kein Duplikat.
- **Laden** = derselbe Mechanismus wie Presets (leeren → füllen → `liveValidate` → `compute`), Preset-Auswahl springt auf „eigene Eingabe". Ältere Datei-Version → **gelber Hinweis** statt Fehler. Fremde App-Kennung / defektes JSON / fehlender input-Block → freundliche Meldung, **kein Absturz**.
- **UI:** Subbar um Bezeichnungsfeld + Buttons „Speichern (.dt)"/„Laden (.dt)" + Statuszeile (grün/gelb/rot) erweitert; verstecktes `<input type=file>` für mobilrobustes Laden; Placeholder-i18n (`data-i18n-ph`). Alles **dreisprachig** (DE/EN/PT). Dateiname `Berechnung_JJJJ-MM-TT_Zusatz.dt`, Zusatz saniert (verbotene Zeichen raus, Umlaute bleiben).
- **Dateien:** `ui.js`, `DT-ProfiSchraube_Test.html`, `style.css`, `test_solver.js`. **Keine** Solver-/Daten-/Validate-/Rechenweg-/Schaubild-Änderung → Engine byte-identisch.
- **Testsuite 2.210.109 → 2.210.483** (0 Fehler): neue **Sektion 17** — Round-Trip aller 12 Presets (Feldanzahl + jeder Wert identisch), Kopf-Felder, bit-identische Neuberechnung, Fehlerfälle, Dateinamens-Sanitierung. Regressions-Vor- und -Nachlauf (12 Presets × 3 Sprachen, kein NaN) grün. **Vom Anwender ausgiebig getestet & bestätigt.**

**v4.4.0 (2026-07-03) — Roadmap „Ingenieur-Workstation" festgezurrt (Planung, noch kein Code)**
- Vier Bausteine gemeinsam beschlossen und in Abschnitt 5 als umsetzungsreife Arbeitspakete dokumentiert (Ziele, Dateien, Felder, Physik-Umfang, Tests): **(1) Speichern/Laden `.dt`, (2) Thermik-Rechner, (3) Flansch-Assistent, (4) Dehnschrauben** — in genau dieser Reihenfolge, je mit Auslieferung + Testlauf.
- Verbindliche Design-Leitplanken fixiert: Übersichtlichkeit vor Fülle (nur aktive Felder sichtbar, farblich markiert, links nur erste Gruppe offen), Auswahl + „eigener Wert"-Haken, Assistenten **ersetzen** manuelle Felder (Sperr-/Füll-Logik), dreisprachig inkl. Rechenweg, Ehrlichkeit bei Näherungen.
- **Regressions-Pflicht** als Regel verankert: vor und nach jedem Baustein Lauf über alle 12 Presets × 3 Sprachen + volle Testsuite. Code unverändert stabil (2.210.109 Assertions, 0 Fehler).

**v4.3.0 (2026-07-03) — Verbesserungs-Hinweise (Stufe 2): „So wird die Ampel grün"**
- Für jede Sicherheit unter 1,2 (gelb/rot) erzeugt der Solver einen **strukturierten Verbesserungs-Hinweis** mit Hebeln und — wo sauber invertierbar — einem **konkreten Zielwert**: S_P → erforderlicher Auflagedurchmesser d_w bzw. p_G; S_A → erforderliche Einschraubtiefe m_vorh; S_G → erforderliche Reibung µ_T bzw. zulässige Querkraft; S_D → nötige Lastreduktion (+ SG-/blank-Option, wenn anwendbar); S_F → nötige Vorspannungsreduktion. Alle Zielwerte sind geschlossene Formeln (Sicherheit → 1,2), per Test gegen die Nachrechnung verifiziert.
- Funktion `improvementHints(R, inp)` im Solver (exportiert), Ergebnis in `R.improvements` (`{safety, level, code, v}`). UI: dreisprachige `HINT`-Templates + `hintText()`, gesammelt in einem eigenen **Verbesserungs-Block** im Hinweisbereich (Überschrift + Kopplungs-Zusatz „andere Nachweise erneut prüfen"). Gelb und Rot werden beide gezeigt (Rot als Warnung, Gelb als Tipp). Eigenes CSS `.improve-box` (auch im Druck sichtbar).
- Ehrlich zur **Kopplung**: Hinweise sind Richtungsvorschläge mit Zielwert, kein „dann ist alles grün" — jeder Block trägt den Hinweis, die übrigen Nachweise danach erneut zu prüfen.
- `R.slip` trägt jetzt zusätzlich `muT`/`qF`/`F_Qmax` (für die S_G-Zielwerte). **Testsuite 2.210.074 → 2.210.109** (0 Fehler): Zielwert-Inversionen für S_P/S_G/S_A/S_D, level-Logik, Optionen nur wenn anwendbar, grüne Fälle ohne Hinweis.

**v4.2.0 (2026-07-03) — Rostfreie/austenitische Verschraubungen, Dauerfestigkeits-Abminderung nach Ausführung**
- **Rostfrei/Austenit:** Bolzen-Festigkeitsklassen **A2-70/A4-70/A4-80** (ISO 3506-1) in `STRENGTH` (mit `stainless`-Flag, eigenem E-Modul 200 GPa, `validate:true` → Warnung außerhalb VDI-Kern); Bolzen-Scherzahl **0,80** (VDI 2230-1 Tab. 6, Austenit) in `BOLT_TAU_BY_CLASS`; neue Werkstoffgruppe **`austenit`** (τ_B/R_m = 0,80) in `TAU_RATIO` fürs Innengewinde (R11). Rostfreier Schrauben-E-Modul greift automatisch (`ASSUME_E_S_CLASS`), σ_A-Formel als Näherung gekennzeichnet (`PENDING_FATIGUE_STAINLESS`).
- **Dauerfestigkeits-Abminderung nach Ausführung:** neues Auswahlfeld **`surfaceFinish`** (blank / feuerverzinkt −30 % / HV-Garnitur −20 %, VDI 2230 Bl.1) + Tabelle `SURFACE_FATIGUE`. Faktor wirkt auf σ_A (SV und SG), Hinweis `ASSUME_SURFACE_FATIGUE`; Rechenweg zeigt den Abminderungsschritt, UI die Ausführung — alles dreisprachig.
- **Zwei neue Beispiele:** `rostfrei_a4_m10` (A4-80 in Austenit, R11) und `schwing_sg_m12` (SG + feuerverzinkt).
- **Bereinigt:** veraltete SG-Kommentare im Solver; `PENDING_FATIGUE_SV`-Text auf „SG wählbar" umformuliert. R.E_S ins Ergebnis; Rechenweg nutzt den effektiven E-Modul.
- **Felder 46 → 47, Klassen +3 (A2/A4), Werkstoffgruppen 8 → 9, Beispiele 10 → 12.** **Testsuite 2.209.713 → 2.210.074** (0 Fehler): rostfreie Klassen/Werte, Oberflächen-Faktoren, σ_A-Abminderung, neue Presets, Enum-/Validierung.

**v4.1.1 (2026-07-03) — TAU_RATIO-Quellenabgleich abgeschlossen, klassenabhängige Bolzen-Scherzahl**
- **Alle acht τ_B/R_m-Werte normbelegt:** VDI 2230 Bl.1:2015 **Tab. 6 / Bild 36** (Stahlsorten, unterer/konservativer Rand der Norm-Bereiche) und **Lork/Hanke** „nach VDI 2230-1:2015" (GJS 0,90 · GJL 1,15 · Alu-Knet 0,60 · Alu-Guss 0,52). Herleitung nach Thomala (TU Clausthal 2020). `src`-Feld je Werkstoff präzisiert; neues optionales `vdiRange`.
- **Bolzen-Scherzahl klassenabhängig:** neuer Helper `boltShearRatio(strengthClass)` (8.8 = 0,65 · 10.9 = 0,62 · 12.9 = 0,60 · niedrige Klassen ~0,70; Fallback 0,62) + Tabelle `BOLT_TAU_BY_CLASS` in `daten.js`. R11 nutzt die klassenabhängige Ratio; reine Rechengröße, keine Nutzereingabe.
- **Ausgabe:** engagement trägt `matRatio`/`boltRatio`/`matSrc`; R11-Rechenweg-Schritt `r11_tau` zeigt die tatsächliche (nicht mehr fix 0,62) Ratio; R11-Ergebnistabelle weist τ_B/R_m (Bauteil · Bolzen) + Quelle **dreisprachig** aus. Hinweise `ASSUME_R11_BASIS`/`VALIDATE_R11` auf „normbelegt (Tab. 6)" umgestellt (DE/EN/PT).
- **Testsuite 2.209.690 → 2.209.713** (0 Fehler): klassenabhängige Ratio, `vdiRange`-Konsistenz, präzise Quellenstrings, Durchschlag ins Ergebnis. **Offener Caveat aus v4.1.0 damit geschlossen.**

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
Ende des Masterplans · DT-ProfiSchraube v4.8.1
Grundlage für die weitere Implementierung. Alle Formeln/Tabellen basieren auf VDI 2230 Blatt 1 (2015) und frei veröffentlichten Sekundärquellen und sind vor Produktivnutzung gegen die Originalnorm zu validieren.
