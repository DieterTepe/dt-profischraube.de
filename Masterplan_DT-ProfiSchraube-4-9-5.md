# 🔩 DT-ProfiSchraube — Masterplan

## Schraubenberechnung nach VDI 2230 Blatt 1 — dreisprachig (DE/EN/PT), offline, mit vollständigem selbstprüfendem Rechenweg

═══════════════════════════════════════════════════════════════════════════
Version : 4.9.5
Stand   : 2026-07-07
Status  : **v4.9.5 real getestet & bestätigt (Handy + GitHub, 2026-07-07).** Engine
          validiert; komplette dokumentfähige Ausgabe (Druck→PDF, RTF, CSV,
          Schaubild-PNG + Wasserzeichen), Test/Voll-Gating, Registrierung/Lizenznehmer
          und Info-/Impressum-Overlay stehen. Alles über die feste `DT_EDITION`-Kennung,
          ein Satz Module. **Testbasis: 2.211.500 Assertions, 0 Fehler.**
          **► NÄCHSTER SCHRITT: 2D-Schnitt der Verbindung als Live-SVG (Abschnitt 5.2).**
Produkt : modular entwickelt (**8 flache Dateien** + Dev-Harness) → Auslieferung als
          EINE gebündelte Offline-Datei (Handy/Tablet/PC).
Modell  : Einmalkauf (Vollversion) + eingeschränkte kostenlose Testversion (ohne Ausgabe).
Sprachen: DE · EN · PT — **vollständig** (Bedienung, Feldtexte, Hilfe, Meldungen,
          Engine-Hinweise, Rechenweg inkl. aller Formel-/Werte-Beschriftungen).
          Norm-Symbole bleiben sprachneutral.
GitHub  : live https://dietertepe.github.io/dt-profischraube.de/
          Schwester https://dietertepe.github.io/dt-profidreieck-web/
Archiv  : **Die vollständige Historie liegt in Git** (Commits + alle früheren
          Masterplan-Stände). `Masterplan_DT-ProfiSchraube-4-9-4.md` ist der letzte
          ausführliche Stand mit komplettem Changelog und allen Detailprotokollen.
          Dieser Plan ist bewusst schlank und nach vorn gerichtet.
═══════════════════════════════════════════════════════════════════════════

---

## 0. Zuerst lesen — Wiederanknüpfen & Arbeitsweise

### 0.1 Was gebaut wird
Ein offline, dreisprachiges **Profi-Werkzeug** für Schraubenverbindungen nach VDI 2230
Blatt 1 mit vollständig nachvollziehbarem, selbstprüfendem Rechenweg. Einmalkauf-Vollversion
plus kostenlose Testversion ohne Ausgabe. Zielgerät ist das Handy.

### 0.2 Wiederanknüpf-Punkt — Stand & nächste Aufgabe
**Fertig & testverifiziert (2.211.500 Assertions, 0 Fehler):** Engine R0–R13 (zentrisch)
inkl. vollständigem **R11** (Mindesteinschraubtiefe) und **SV/SG-Dauerfestigkeit**; R10
Montage- **und** Betriebszustand; Eingabe-Validierung; Oberfläche; Dreisprachigkeit;
selbstprüfender Rechenweg; Verspannungsschaubild; Ingenieur-Workstation (Speichern/Laden
`.dt`, Thermik-Assistent, Flansch-Assistent, Dehn-/Taillenschrauben); Code-Audit (v4.8.1);
komplette **Ausgabe/Bericht** (Druck→PDF, RTF, CSV, Schaubild-PNG + Wasserzeichen);
**Test/Voll-Gating**; **Registrierung/Lizenznehmer**; **Info-/Impressum-Overlay**.
Einzeiler mit Versionen siehe 5.1; Details in Git/Changelog.

**► ALLERERSTE AUFGABE IM NÄCHSTEN CHAT:** Grün-Basislinie bestätigen
(`node test_solver.js` → **2.211.500, 0 Fehler**), dann **2D-Schnitt der Verbindung als
Live-SVG** bauen (5.2) — kein Engine-Eingriff, reine Darstellung, bewährter Baustein-Rhythmus.

**Regressions-Pflicht vor/nach jedem Baustein:** alle 15 Presets × 3 Sprachen (Solver +
Rechenweg + Schaubild, kein NaN) **und** volle Testsuite (2.211.500, 0 Fehler).

### 0.3 Recovery nach Absturz
1. **Projekt-Ordner ist die Wahrheit** (Dieter pflegt die aktuellen Dateien dort).
   Projektdateien nach `/home/claude/dt/` kopieren, dort arbeiten. Der Container wird
   zwischen Sessions zurückgesetzt → **nach jeder Änderung ausliefern**.
2. **Grün-Basislinie:** `node test_solver.js` → **2.211.500 (oder mehr), 0 Fehler**.
   Erst dann weiterbauen.
3. Diesen Masterplan + Wiederanknüpf-Punkt (0.2) lesen, nächstes Ziel bestätigen, dann coden.

### 0.4 Standard-Arbeitsablauf je Aufgabe
Plan in Worten (Deutsch) kurz abstimmen → Datei für Datei (minimale Diffs) →
`node test_solver.js` **grün** → geänderte Dateien nach `/mnt/user-data/outputs/` →
`present_files` → **knappe deutsche Zusammenfassung**, welche Dateien zu überschreiben sind.
Dieter prüft am Handy und bestätigt vor dem nächsten Schritt.

### 0.5 Arbeitsprinzipien (nicht verhandelbar)
- **Korrektheit vor Umfang.** Jede Formel/jeder Fall wird **vor** der Integration im
  Node-Harness verifiziert. Tests werden **erweitert, nie gelockert** — ein rot werdender
  Test ist Lernsignal, nie Anlass, die Schwelle zu senken.
- **Post-hoc-Rechenweg, strikt getrennt.** `rechenweg.js` rechnet jeden nachrechenbaren
  Wert **unabhängig** neu und prüft ihn gegen den Solver (✓ = „gegen Engine geprüft").
  Tiefe Norm-Physik (z. B. Gewinde-Scherquerschnitt in m_min) wird als Engine-Wert
  angezeigt statt dupliziert — **kein Formel-Duplikat über Module** (single source of truth).
- **Erst besprechen, dann coden.**
- **Physikalische Konstanten nicht runden** (C_PITCH = 1/(2π), nicht 0,16; τ/Rm exakt aus
  der Norm). Offene Norm-Punkte **explizit** als Annahme tracken, nichts still annehmen.
  Unbelegte Werte (z. B. Magnesium) tragen sichtbar „Schätzwert".
- **Immer dreisprachig (DE/EN/PT)** — neue Formel-Beschriftungen via `LT(de,en,pt)`,
  Formelzeichen bleiben neutral.
- **Ausgiebige Laien-ⓘ** (nicht nur Fachbegriffe); **immer vollständige Rechenwege** in der Ausgabe.
- **Tabellenwerte als Auswahl-Liste + „eigener Wert"-Haken**, wo sinnvoll (Muster
  `fillFromMaterial`, 2.2); Auswahl immer im erlaubten Bereich & fehlerfrei.
- **Privacy-first/DSGVO hart:** kein CDN, keine Google Fonts, keine Fremd-Skripte; alle
  Assets self-hosted (falls je eine Bibliothek wie jsPDF nötig würde — aktuell nicht geplant).
- **Obfuskierung immer zuletzt**, nach dem Bündeln. Lesbare Master-Module bleiben lokal.
- **Zusammenarbeit auf Deutsch; Dieter arbeitet ausschließlich am Handy.**

### 0.6 Technische Leitplanken (Projektstruktur)
- **Ein Ordner, keine Unterordner**, relative Pfade (keine absoluten URLs → sonst
  Internet-Abhängigkeit + Datenabfluss).
- **Startdatei trägt den Programmnamen, nie `index`** — `DT-ProfiSchraube_Test.html` /
  `_Pro.html`. `index.html` ist ausschließlich die Landingpage.
- **Offline hart:** CSS via `<link>`, JS via klassische `<script src>` in
  Abhängigkeitsreihenfolge, Daten als **JS-Globals (UMD)**. **Kein** `fetch`/JSON,
  **kein** ES-`import` (brechen über `file://`).
- **`<html lang="de" translate="no">` + notranslate-Meta** sind Pflicht (sonst zerlegt die
  Browser-Auto-Übersetzung das DOM und bricht u. a. den Sprachumschalter).
- **Modular entwickeln → eine Datei ausliefern** (Build inlinet alle Module, danach Obfuskierung).
- **Test vs. Pro:** Engine **byte-identisch**; Pro schaltet Ausgabe/Export frei.

### 0.7 Scope-Entscheidungen
- **Zentrische Schaftschrauben** umgesetzt; **exzentrisch** strukturell vorbereitet
  (`operatingStress` akzeptiert σ_b), Verdrahtung offen (5.2).
- **Dehn-/Taillenschrauben (DIN 2510)** umgesetzt: A_0 selektiv in R7/R8/R9, δ_S mit
  Taillenglied; R11 bleibt A_S.
- **Mehrschraubenverbindungen / Blatt 2 (FEM):** später optional, separates Modul.
- **Kein jsPDF** (Druck→PDF + RTF decken „PDF"/„Word" ab). **Kein rotierendes
  Schraubensymbol** (verworfen). **Keine Schlüsselprüfung** bei der Registrierung
  (Personalisierung, kein Kopierschutz).

---

## 1. Normfundament — Kurzreferenz (zum Nachschlagen ohne Code)

> VDI-2230-Normtext ist geschützt; Formeln/Werte stammen aus seriösen frei veröffentlichten
> Sekundärquellen, eigenständig implementiert. **Vor Produktivnutzung Originalnorm
> validieren.** Vollständige Datentabellen liegen in `daten.js`.

### 1.1 Schritte R0–R13 (Ausgabe 2015)
| Schritt | Bezeichnung | Größe(n) | Umsetzung |
|---|---|---|---|
| R0 | Nenndurchmesser/Vordimensionierung | d, G | ✅ Geometrie (A7-Vordim. offen) |
| R1 | Anziehfaktor | α_A | ✅ (Verfahren/Direktwert) |
| R2 | Mindestklemmkraft | F_Kerf | ✅ |
| R3 | Kraftverhältnis / Nachgiebigkeiten | δ_S, δ_P, Φ_K, Φ_en | ✅ inkl. Verformungskegel (Fallunterscheidung) |
| R4 | Vorspannkraftänderungen | F_Z, ΔF′_Vth | ✅ (F_Z aus Setztabelle) |
| R5 | Mindestmontagevorspannkraft | F_Mmin | ✅ |
| R6 | Maximalmontagevorspannkraft | F_Mmax | ✅ |
| R7 | Montagebeanspruchung | σ_red,M, F_Mzul | ✅ (90 % Ausnutzung, ν=0,9) |
| R8 | Betriebsbeanspruchung | σ_red,B, S_F | ✅ |
| R9 | Schwingbeanspruchung | σ_a, σ_A, S_D | ✅ **SV und SG** + Oberflächen-Abminderung |
| R10 | Flächenpressung | p_max, S_P | ✅ Montage **und** Betrieb (kleineres S_P maßgeblich) |
| R11 | Mindesteinschraubtiefe | m_min, S_A | ✅ (Scherquerschnitte, R_S, C1/C2/C3) |
| R12 | Gleiten, Abscheren | S_G, τ_max | ✅ Reibschluss (+ Abscher-Funktionen) |
| R13 | Anziehdrehmoment | M_A | ✅ |

Drei Blöcke: R0–R2 (Vorgaben) · R3–R6 (Verspannungsdreieck/Kräfte) · R7–R13 (Nachweise).

### 1.2 Kernformeln (wie in der Engine implementiert)
- **Nachgiebigkeit Schraube** (Reihenschaltung): δ_S = Σ l_i/(E·A_i) über Kopf (0,5·d),
  Schaft, **Taille L_0/(E·A_0) bei Dehnschraube** (zusätzliches Glied; `lShank` =
  nicht-taillierter Anteil), freies Gewinde, eingeschr. Gewinde (0,5·d),
  Mutter/Einschraubteil (0,4·d).
- **Nachgiebigkeit Platten** — Fallunterscheidung: Hülse (D_A ≤ d_w); Vollkegel
  (D_A ≥ D_A,Gr); Kegel + Hülse (dazwischen). Kegelwinkel empirisch:
  DSV `tanφ = 0,362 + 0,032·ln(β_L/2) + 0,153·ln(y)`, ESV `0,348 + 0,013·ln(β_L) + 0,193·ln(y)`,
  β_L = l_K/d_w, y = D_A/d_w. Verbindungskoeffizient w = 1 (DSV)/2 (ESV).
  D_A,Gr = d_w + w·l_K·tanφ.
- **Kraftverhältnis:** Φ_K = δ_P/(δ_S+δ_P); Φ_en = n·Φ_K.
- **Setzen:** F_Z = (f_Z/1000)/(δ_S+δ_P).
- **F_Mmin** = F_Kerf + (1−Φ_en)·F_A + F_Z + ΔF′_Vth; **F_Mmax** = α_A·F_Mmin.
- **F_Mzul** = ν·R_p0,2/√(1/A_S² + 3·(m/W_p)²), m = P/(2π)+0,577·μ_G·d_2,
  W_p = π/16·d_S³, ν = 0,9. **Dehnschraube mit maßgeblicher Taille (A_0 < A_S): A_0 statt
  A_S und W_p = π/16·d_0³** (Taille ist auch beim Anziehen der schwächste Querschnitt).
  (0,16/0,58 sind Rundungen von C_PITCH=1/(2π), C_FLANK=1/(2cos30°) — **in der Engine unrundiert**.)
- **M_A** = F_Mzul·(P/(2π) + 0,577·μ_G·d_2 + μ_K·D_Km/2), D_Km = (d_w+d_h)/2.
- **F_Smax** = F_Mzul + Φ_en·F_Ao − ΔF′_Vth. σ_z,max = F_Smax/A_S **(A_0 bei Dehnschraube)**;
  σ_red,B = √(σ_z,max² + 3·(k_τ·τ)²), τ = M_G/W_p; S_F = R_p0,2/σ_red,B.
- **R9 (Schwingbeanspruchung):** σ_a = Φ_en·(F_Ao−F_Au)/(2·A_S) [A_0 bei Dehnschraube];
  **σ_A,SV = 0,85·(150/d + 45)** (schlussvergütet); **σ_A,SG = (2 − F_Sm/F_0,2min)·σ_A,SV**
  (schlussgewalzt), gültig F_Sm/F_0,2min ≈ 0,3…1, sonst konservativ SV;
  **Oberflächen-/Ausführungs-Abminderung** σ_A,red = f_O·σ_A mit f_O = 1,0 (blank) /
  0,70 (feuerverzinkt) / 0,80 (HV-Garnitur); S_D = σ_A,red/σ_a.
  F_Sm = F_Mzul + Φ_en·(F_Ao+F_Au)/2, F_0,2min = R_p0,2·A_S **(A_0 bei Dehnschraube)**.
  Bei rostfreien Schrauben ist σ_A nur Näherung (`PENDING_FATIGUE_STAINLESS`).
- **R10:** A_p = π/4·(d_w²−d_h²). Zwei Zustände: p_max,M = F_Mzul/A_p (Montage) und
  p_max,B = F_Smax/A_p (Betrieb). S_P = p_G/max(p_max,M, p_max,B) — das **kleinere** S_P
  beider Zustände ist maßgeblich (bei Zuglast ist der Betrieb ungünstiger).
- **R11 (Mindesteinschraubtiefe):**
  - Scherquerschnitte je mm Eingriff: A_GM = π·d/P·(P/2 + (d−d_2)·tan30°) (Mutter, schert am
    Bolzen-Außen-Ø d); A_GS = π·D_1/P·(P/2 + (d_2−D_1)·tan30°) (Bolzen, schert am
    Mutter-Kern-Ø D_1). d_2 = d − 0,64952·P, D_1 = d − 1,08253·P.
  - Kräfteverhältnis **R_S = (τ_B,M·A_GM)/(τ_B,S·A_GS)**; R_S<1 → Innengewinde schert zuerst
    (Ast „innen"), R_S≥1 → Bolzengewinde (Ast „bolzen").
  - **C3 = 0,728 + 1,769·R_S − 2,896·R_S² + 1,296·R_S³** (Innengewinde, R_S<1; = VDI Gl. 202).
    **C2 = 5,594 − 13,682·R_S + 14,107·R_S² − 6,057·R_S³ + 0,9353·R_S⁴** (Bolzengewinde, R_S≥1;
    C2(2,0)=1,1668 ≈ Ruoss 1,16). C1 = 1 (Annahme s/d ≥ 1,9).
  - m_min = F_mS / (τ_B,schwächer · A_G,schwächer · C · C1) mit **F_mS = 1,2·R_m,S·A_S**
    (RM_MAX_FACTOR = 1,2). Bolzen-Verhältnis **τ_B,S/R_m,S = 0,62** (klassenabhängig, s. u.).
  - Zuschlag **m_zu = 2·P** (Durchsteck/Mutter) bzw. **3·P** (ESV/Sackloch).
    m_eff,vorh = m_vorh − m_zu; **S_A = m_eff,vorh / m_min**.
- **R12:** F_KQ,erf = F_Qmax/(q_F·μ_T) [+ M_Ymax/(q_M·r_a·μ_T)];
  F_KR = F_Mmin − F_Z − ΔF′_Vth − (1−Φ_en)·F_A; S_G = F_KR/F_KQ,erf.

### 1.3 Werkstofftabelle (`daten.js` → `TAU_RATIO`, single source of truth)
Je Werkstoff: `ratio` (τ_B/R_m), `E` (N/mm²), `pG` (N/mm²), `rmDefault`/`grade`
(konservative, editierbare UI-Vorbelegung), `src`, `label{de,en,pt}`.

| Schlüssel | Werkstoff | τ_B/R_m | E | p_G | rmDefault/grade | Quelle |
|---|---|---|---|---|---|---|
| stahl | Stahl vergütet/gehärtet | 0,65 | 210000 | 630 | 600 / C45 vergütet | VDI 2230:2015 |
| stahl_bau | Bau-/Automatenstahl | 0,80 | 210000 | 450 | 360 / S235 | VDI 2230:2015 |
| einsatz | Einsatzstahl (16MnCr5) | 0,85 | 210000 | 900 | 800 / 16MnCr5 | VDI 2230 Anh. B3 |
| gjs | Sphäroguss GJS | 0,90 | 175000 | 600 | 400 / GJS-400 | VDI 2230:2015 |
| gjl | Grauguss GJL | 1,15 | 110000 | 850 | 250 / GJL-250 | VDI 2230:2015 |
| alu_knet | Aluminium-Knet | 0,60 | 70000 | 230 | 260 / EN AW-6082 | VDI 2230:2015 |
| alu_guss | Aluminium-Guss | 0,52 | 70000 | 220 | 200 / AlSi-Guss | VDI 2230:2015 |
| mg_guss | Magnesium-Leg. | 0,55 | 45000 | 140 | 150 / AZ91 | **Schätzwert** (kein VDI-Beleg) |

Zusätzlich **austenit** (rostfrei, τ/Rm 0,80, normbelegt, seit v4.2.0). **Belege:**
τ_B/R_m aus **VDI 2230-1:2015 Tab. 6/Bild 36** (Stahl, unterer konservativer Rand) +
**Lork/Hanke** „nach VDI 2230-1:2015" (Guss/Alu), Herleitung nach Thomala; p_G aus **VDI
Tab. A9**. Bolzen-Scherzahl **klassenabhängig** (8.8 = 0,65 · 10.9 = 0,62 · 12.9 = 0,60 ·
niedrige Klassen ~0,70), Fallback 0,62. Rechen-Anker **B3 (M20×1,5): R_S = 2,0, C2 = 1,16**
(Ruoss); **C3 = VDI Gl. 202**. Basisdaten (Gewinde M3–M39 DIN 13/ISO 898-1, Klassen 4.6–14.9,
Reibungsklassen, α_A, Setzbeträge f_Z) ebenfalls in `daten.js`.

**Naming-Caveat:** „Profischraube" ist im DACH-Raum als Holzbau-/Universalschraube belegt →
Verwechslungs-/SEO-Risiko; „DT-"-Präfix schafft Abstand. Marke (DPMA/EUIPO) und Domain vor
Festlegung prüfen. Produkt-Disclaimer Pflicht („ersetzt keine geprüfte Berechnung").

---

## 2. Architektur & Module

### 2.1 Modul-Landkarte (8 flache Dateien + Dev-Harness, ein Ordner)
```
DT-ProfiSchraube/  (keine Unterordner)
├── DT-ProfiSchraube_Test.html / _Pro.html → Gerüst; lädt Module relativ; translate="no".
│                                Unterschied Test↔Voll: NUR die window.DT_EDITION-Zeile.
├── style.css        → Design-Tokens (dark default + light), Layout, Rechenweg-,
│                      Schaubild- (sb-*), Feld-Hinweis-/gesperrt-/Checkbox-/Modal-Styles
├── daten.js   (DTSData)      → Norm-/Stoffdaten, TAU_RATIO (inkl. alpha) + BOLT_ALPHA,
│                                15 Beispiele (PRESETS)
├── validate.js (DTSValidate) → Feldschema (61 Felder, DE/EN/PT) + zweistufige Prüfung
├── solver.js  (DTSSolver)    → Rechenlogik R0–R13 + Orchestrator computeJoint
│                                (inkl. Thermik-Assistent ΔF_Vth aus ΔT +
│                                Flansch-Assistent F_Qmax aus M_T/z/r_LK). VERSION 0.9.0.
├── rechenweg.js (DTSRechenweg) → dokumentierter, SELBSTPRÜFENDER Rechenweg (post-hoc)
├── schaubild.js (DTSSchaubild) → Verspannungsschaubild (Live-SVG, dreisprachig)
├── report.js  (DTSReport)    → RTF-/CSV-Bericht + reine Gating-/Wasserzeichen-/Lizenz-
│                                Logik (UMD, Node-testbar; KEIN jsPDF)
├── ui.js                     → Formularaufbau, Live-Prüfung, Ergebnis, Rechenweg,
│                                Schaubild-/Bericht-Einbindung, i18n, Theme, .dt-Speichern/
│                                Laden, Info-/Impressum-Overlay, Registrierung/Long-Press
│                                (reine Helfer per UMD auch in Node testbar)
└── test_solver.js (DEV-ONLY) → Node-Testharness — wird NIE ausgeliefert
```
**Browser-Ladereihenfolge:** `daten → validate → solver → rechenweg → schaubild → report → ui`.
**UMD überall:** läuft in Node (Tests) und im Browser (globale Objekte). Keine externen
Abhängigkeiten. `ui.js`/`report.js`: reine Funktionen liegen vor dem `if (typeof window ===
'undefined') return;`-Guard, sind also in Node ladbar (kein Test-Duplikat).

### 2.2 Wiederkehrende Muster (unbedingt beibehalten)
- **`fillFromMaterial(srcKey, tgtKey, customKey, prop, unit)`** in `ui.js`: belegt ein
  Zahlenfeld aus der Werkstofftabelle vor und sperrt es (mit Herkunftshinweis), oder gibt es
  per „eigener Wert"-Haken frei. Aktuell: `matGroupM→Rm_M`, `plateMat→E_P`, `plateMat→p_G`.
  **Neue Tabellenfelder nach genau diesem Muster anbinden.** Gesperrte Felder sind `readOnly`
  (nicht `disabled`) → gehen weiter in die Rechnung ein; `collectInputs` überspringt nur
  `disabled`-Felder.
- **`LT(de, en, pt)`** in `rechenweg.js`: übersetzt Beschriftungen in Formel-/Werte-Strings;
  Formelzeichen bleiben neutral. **Jede neue Formel-Beschriftung über `LT`.**
- **Presets tragen Rohdaten für die Engine** (z. B. `E_P`, `p_G` explizit) **plus** optionale
  UI-Vorbelege (`plateMat`, `matGroupM`) — die Engine kennt die UI-Auswahlfelder nicht.
  Konsistenz per Test absichern.
- **`enumValues`/`fieldOptions`** lesen Enums direkt aus `DATA.TAU_RATIO` → kein Drift
  zwischen Daten und Auswahl.
- **Solver-Prinzip:** reine Funktionen, einzeln testbar; `computeJoint` **validiert zuerst**
  (harte Fehler ⇒ `status:'invalid'`, keine Rechnung). Bedingte Nachweise (R9 SG, R10-Betrieb,
  R11, R12) laufen nur bei ausreichenden Eingaben; Annahmen/offene Punkte stehen im Ergebnis
  unter `notes.assumptions`/`notes.pending` **als Codes** (UI übersetzt, DE-Text als Fallback).

### 2.3 Test/Voll-Gating (Editions-Prinzip)
Engine **byte-identisch**. Test- und Vollversion werden **erst beim finalen Bündeln zur
Single-File-HTML** als zwei Builds unterschieden — Unterschied ist **nur** die feste
`window.DT_EDITION`-Kennung. Module bleiben **gating-frei**; nur `'test'` schränkt ein, alles
andere = Voll (sichere Voreinstellung). **Test:** Rechnen + Rechenweg + Schaubild am Schirm
sichtbar, **Ausgaben gesperrt** (nur PNG erlaubt, mit Wasserzeichen), dezenter gelber
Hinweisbalken/Upsell — auch die Testdatei wird gebündelt+obfuskiert (sonst läge der Rechenkern
offen). **Voll:** Ausgabe frei; Lizenz nach Ehrlichkeitsprinzip (siehe 4, Registrierung).
Reine Logik `isFeatureAllowed`/`shouldWatermark`/`watermarkText` in `report.js`.
**Werkzeug bleibt bild-frei** (Optik ist live gezeichnetes SVG); schöne Grafik kommt als Hero
auf die Landingpage.

---

## 3. UI/UX-Leitregeln (Profi-Look)

> **Leitidee: Messinstrument, keine App.** Ruhig, technisch, Präzision sofort sichtbar.
> Vertrauen durch Zurückhaltung.

- **Farbe = Information:** Graphit-Basis (dunkel Standard); **Stahl-Cyan #34c3d4** für
  Interaktives/CAD-Linien; **Messing/Bernstein #caa04a** für Moment/Wärme; **Grün/Gelb/Rot
  nur für Nachweis-Ergebnisse** — immer Icon + Text. Design-Tokens als CSS-Variablen an einer
  Stelle; Hell/Dunkel per `data-theme`.
- **Rechenblatt-Layout:** Desktop mehrspaltig (Eingabe · Ergebnis · Visualisierung); Handy
  einspaltig als Akkordeon. Technische Typografie, **Tabellenziffern**, serifenbetonte
  Formelschrift im Rechenweg.
- **Eingabe:** zu jedem Feld ein **großer, rechtsbündiger ⓘ-Button** (Titel · Laien-Hilfe ·
  zulässiger/üblicher Bereich · Auswahl). **Auswählen statt Tippen** (Dropdowns aus den Daten,
  Standard „empfohlen"). **Werkstoff-Dropdowns mit „eigener Wert"-Haken** (Herkunftshinweis
  bei gesperrt). Nicht benötigte/abhängige Felder werden **ausgegraut** (`dependsOn`, auch auf
  Checkbox-Zustand). Fehlende Pflichtfelder pulsen orange am ⓘ; Live-Prüfung in Klartext,
  dreisprachig. 15 Beispiele zum Direkt-Laden.
- **Ergebnis:** Status-Banner + **fünf Sicherheits-Kacheln** (S_F/S_D/S_P/S_G/S_A, ampelfarbig,
  mit Grund-Text bei „n. b."), Kennwert-Tabelle (inkl. R11-Tabelle und p_max Montage/Betrieb),
  Hinweise. **Aufklappbarer Rechenweg**: pro Schritt Formel → eingesetzte Werte → Ergebnis,
  VDI-Bezug, „gegen Engine geprüft"; vollständig dreisprachig; mobil horizontal scrollbar.
- **Schaubild-Merksatz:** **Zahlenwerte gehören in die HTML-Legende unter dem SVG, nie in die
  Zeichnung.** 2D-Schnitt der Verbindung ist die nächste Visualisierungs-Stufe (5.2), gleiche
  Geometrie-/Transformquelle, kein DXF.
- **A11y & Bewegung:** sichtbare Fokuszustände; Status nie nur farblich; `prefers-reduced-motion`
  schaltet Übergänge ab; Print-Stylesheet vorhanden (Ampelfarben erzwungen, Disclaimer/Norm
  im Druck sichtbar).

---

## 4. Implementierungsstand (verdichtet)
- **Engine `solver.js` (VERSION 0.9.0) — validiert.** Alle R0–R13 reine, einzeln getestete
  Funktionen; `computeJoint` orchestriert. Konstanten: RM_MAX_FACTOR = 1,2; BOLT_TAU_RATIO =
  0,62 (klassenabhängig überschrieben); THREAD_CONST.c_D1 = 1,08253; TANPHI_MIN = 0,05 (Clamp).
  **Validierungsreferenzen (in den Tests):** primär Hochschule Anhalt (Voigt), Hydraulikzylinder
  ISO 4762 **M12×60 10.9 DSV** (trifft δ_S, δ_P ≈0,06 %, D_A,Gr, Φ_K, F_Z, F_Mmax …); Anker
  VDI-**Anhang-B** über Ruoss (B1: R_S≈0,985; **B3 M20×1,5: R_S=2,0, C2=1,16**), C3 = Gl. 202.
- **`validate.js`:** 61 Felder (DE/EN/PT), harte Grenzen + typischer Bereich, `dependsOn`/
  `dependsOnValue`, Feldtyp `bool`; Cross-Validationen (R11-Warnung, Moment-/Thermik-/Flansch-/
  Dehnschrauben-Felder) mit stabilen Codes (UI übersetzt).
- **`rechenweg.js`:** `build(R,inp,opts)` erzeugt geordnete Schritte; jeder nachrechenbare
  Schritt unabhängig aus seiner Formel geprüft (✓). Vollständig dreisprachig (`LT`).
- **`schaubild.js`:** Live-SVG des Verspannungsdreiecks, Zahlen in der Legende, rein additiv.
- **`report.js`:** reines Datenmodell → RTF + CSV (offline, kein jsPDF), Unicode-Escaping, CSV
  Trenner/Dezimal sprachgekoppelt; plus reine Gating-/Wasserzeichen-/Lizenz-Helfer.
- **15 Beispiele** decken statisch/schwellend/wechselnd, Querkraft, Moment, kombiniert,
  thermisch, Flansch-Drehmoment, Stahl/Alu/Grauguss/rostfrei, DSV/ESV, Dehnschraube ab.
- **Bewusst getrackte Annahmen / offene Norm-Punkte:** Kegelwinkel-Geltungsgrenzen (β_L, y) als
  Richtwerte; C1 = 1 (s/d ≥ 1,9); τ_B,M/R_m,M je Gruppe aus VDI Tab. 6 (unterer Rand);
  Magnesium = Schätzwert; **exzentrische Last (σ_b) noch nicht verdrahtet** (`operatingStress`
  akzeptiert σ_b bereits); Flansch-Torsion als eigener Lastfall (M_T,z,r → F_Q intern) noch offen
  (Momentfelder M_Ymax/q_M/r_a bereits vorhanden und getestet).
- **Testabsicherung `test_solver.js` (DEV-ONLY): 2.211.500 Assertions, 0 Fehler.** Geometrie-
  Beweis (A_S berechnet vs. tabelliert), Invarianten, Hunderttausende Property-Zufallsfälle,
  End-to-End gegen Anhalt, alle 15 Presets, R11/SV-SG, R10-Doppelnachweis, R12-Moment,
  δ_P-Duplikat-Guard (~4000 Zufallsgeometrien, Engine == Rechenweg — schlägt bei jeder Drift an),
  Werkstoff-Datenintegrität, Rechenweg-Selbstprüfung über alle Presets × DE/EN/PT, `.dt`-Round-
  Trip, Thermik/Flansch/Dehnschrauben, Ampel `overallVerdict`, Bericht/RTF/CSV, PNG-Wasserzeichen,
  Gating `isFeatureAllowed`, Registrierung (Sektion 25/26). **Regel: erweitern, nie lockern.**

---

## 5. Roadmap

### 5.1 Erledigt (Einzeiler — Details in Git)
✅ **v4.5.0** Speichern/Laden `.dt` · ✅ **v4.6.0** Thermik-Assistent (ΔT) · ✅ **v4.7.0**
Flansch-Assistent (M_T/z/r_LK → F_Qmax) · ✅ **v4.8.0** Dehn-/Taillenschrauben (DIN 2510,
A_0-Umschaltung) · ✅ **v4.8.1** Code-Audit (Prüfbericht im Projekt) · ✅ **v4.9.0–4.9.3**
Ausgabe/Bericht A/B/C (Ampel + Druck→PDF, RTF/CSV, Schaubild-PNG + Wasserzeichen, Test/Voll-
Gating) · ✅ **v4.9.4** Registrierung/Lizenznehmer (Personalisierung, kein Kopierschutz) ·
✅ **v4.9.5** Info-/Impressum-Overlay. **Alle vom Anwender am Handy real getestet & bestätigt.**

### 5.2 Offen (nach vorn)
1. **► NÄCHSTES: 2D-Schnitt der Verbindung als Live-SVG** — gleiche Geometrie-/Transformquelle
   wie das Schaubild, kein Engine-Eingriff, kein DXF.
2. **Inline-SVG-Skizzen** für Geometrie-Felder (Slot via `diagram`-Attribut vorhanden):
   Fokus-Feld hebt die passende Linie/Pfeil hervor. Bewusst später und getrennt.
3. **Exzentrische Last** (σ_b; Ruoss B4/B5) — **einziger echter Engine-Eingriff der Zukunftsliste**,
   eigener gründlicher Zyklus, viel später.
4. **Build-/Obfuskierungs-Schritt** + `DT-ProfiSchraube_Pro.html`/`_Test.html` (zwei Builds,
   siehe 2.3); A7-Vordimensionierung.
5. **Separate Hilfe-HTML im GitHub-Ordner** (strategisch bevorzugt): getrennt vom Tool, offline
   aus dem ⓘ-Overlay verlinkt; erklärt alle Funktionen/Kürzel schrittweise und **beherbergt
   Impressum + Rechtsbelehrung**. Hält das Tool schlank (Offline-Prinzip unberührt). *(Der
   ⓘ-Impressum-Link zeigt aktuell auf www.dt-profidreieck.de und wird dann hierher umgestellt.)*
6. **Erklärende Schaubild-Beschriftung** (ruhige Legende/Kurzerklärung statt Interaktivität).

### 5.3 Vorgemerkt & Verworfen
- **Vorgemerkt (kein Beschluss):** **Auto-Dimensionierung** „kleinste Größe/Klasse, bei der alle
  S ≥ 1,2" — reine Schleife über Gewinde × Klassen über die auditierte `computeJoint`, kein
  Engine-Eingriff, großer Laien-Nutzen. Vorab klären: welche Geometrie beim Größenwechsel
  konsistent mitgezogen wird.
- **Verworfen (mit Anwender abgewogen, damit es nicht wiederkehrt):** Wizard/Stepper (zerlegt das
  bewährte Formular, Regressionsrisiko) · Beispiel-Kacheln + Toggle-Verschiebung (Geschmack ohne
  Mehrwert) · `helpShort` (Pflegelast × 61 × 3) · Variantenrechnung/Parameter-Sweep · Projekt-/
  Bibliotheksverwaltung · interaktives Hover/Zoom im Schaubild (Spielzeug-Charakter). **Leitlinie:**
  übersichtlich & schlank bleiben, die stabile fehlerfreie Basis nicht durch riskante Integrationen
  gefährden; nur abgestimmter, deutlicher Mehrwert wird umgesetzt.
- **Benchmarks, die Entscheidungen ändern:** Abweichung gegen Anhang-B > ±2 % → Nachgiebigkeits-/
  Kegelmodell prüfen, ggf. Originalnorm beschaffen · bestätigter Markenkonflikt „Profischraube" →
  Umbenennung vor Markteintritt · Nachfrage nach Mehrschraubenverbindungen → Blatt 2 (FEM) als
  separates Modul.

---

## 6. Changelog (nur die letzten zwei Versionen — ältere Historie: Git)

**v4.9.5 (2026-07-07) — Info-Overlay um Impressum + Landingpage-Link erweitert.**
Das ⓘ-Overlay (oben rechts) zeigt jetzt zusätzlich einen Impressum-Block: „Entwickelt von:
Dieter Tepe", Anschrift „Mühlenstraße 2, 48477 Dreierwalde", „E-Mail: Dieter.Tepe@live.de"
(als `mailto:`) sowie die kursive Zeile „Vollständiges Impressum und Datenschutzerklärung online
unter:" mit Link **www.dt-profidreieck.de** (→ `https://www.dt-profidreieck.de/`, neuer Tab).
Der Link öffnet vorerst die Dreieck-Landingpage (bewusst so; wird später erweitert bzw. auf die
eigene Hilfe-/Impressum-HTML umgestellt, 5.2 Punkt 5). **Für Test- und Vollversion identisch**
(Titel „DT-ProfiSchraube" ohne Editions-Zusatz), dreisprachig (neue Labels `devBy`/`imprintLine`
in DE/EN/PT; Anschrift/E-Mail/URL sprachneutral). Nur `ui.js` (`openInfo` + Labels) und
`style.css` (Links sichtbar in Akzentfarbe, Impressum dezent) geändert; **HTML unangetastet**.
Basislinie unverändert **2.211.500** (Overlay ist DOM-Code hinter dem Node-Guard, nicht
unit-getestet). Vom Anwender am Handy real getestet & bestätigt.

**v4.9.4 (2026-07-07) — Registrierung/Lizenznehmer (Personalisierung gegen Weitergabe, KEIN
Kopierschutz).** Erst-Start-„Aktivierung"-Dialog **nur in der Vollversion** (`DT_EDITION !==
'test'`, nur solange nichts in `localStorage`): zwei Felder **Name + Lizenzschlüssel** (wie
Referenzbild `1000019652.jpg`; früheres Feldset Firma/E-Mail/„Passwort" bewusst auf zwei
reduziert). „Aktivieren" (erst aktiv, wenn beide gefüllt) speichert Name (`licenseeName`-
normalisiert) + Schlüssel (**keine Formatprüfung**) in `localStorage`; „Später"/Escape/Hintergrund
schließen ohne Speichern. **Grüner „Vollversion"-Balken entfernt**, stattdessen dezente Zeile
unter dem VDI-Untertitel („Vollversion" bzw. „Vollversion · lizenziert für [Name]"), dreisprachig,
auch im Druck. **Testversion behält den gelben „Testversion"-Balken.** Lizenznehmer zusätzlich im
**Kopf von RTF/CSV/Druck** (`ctx.licensee`) — der eigentliche Weitergabe-Hebel. **Versteckter
Reset:** 10 s Long-Press auf den Schriftzug „DT-ProfiSchraube" (Touch + Maus) löscht die
Lizenzdaten still. **Edition bleibt build-fest** — die Vollversion degradiert nie zur Testversion;
Registrierung steuert nur die Personalisierung. Node-Helfer `licenseeName`/`licenseePhrase`/
`licenseeField`/`editionLicenseeLine` in `report.js`; Tests **Sektion 25+26**; Suite
2.211.465 → **2.211.500**, 0 Fehler. Dateien: `report.js`, `ui.js`, `style.css`, beide HTML
(nur `DT_EDITION`-Zeile), `test_solver.js`. Vom Anwender am Handy real getestet & bestätigt.

*(Ältere Einträge v4.1.0–v4.9.3 und alle Detailprotokolle: Git-Commit-Historie bzw.
`Masterplan_DT-ProfiSchraube-4-9-4.md`.)*

═══════════════════════════════════════════════════════════════════════════
Ende des Masterplans · DT-ProfiSchraube v4.9.5
═══════════════════════════════════════════════════════════════════════════
