# 🔍 Prüfbericht DT-ProfiSchraube v4.8.0 — Vollständiger Code-Audit

Stand: 2026-07-05 · Basis: Masterplan 4-8-1, Abschnitt 0.2 „ALLERERSTE AUFGABE"
Grün-Basislinie bestätigt: **2.211.104 Assertions, 0 Fehler** (node test_solver.js)

## ⏳ FORTSCHRITT (Wiederanknüpf-Anker bei Chat-Unterbrechung)

| Schritt | Status |
|---|---|
| 1. Recovery + Grün-Basislinie | ✅ erledigt |
| 2a. solver.js | ✅ erledigt (2 Befunde gefixt) |
| 2b. daten.js | ✅ erledigt |
| 2c. validate.js | ✅ erledigt (1 i18n-Fix) |
| 2d. rechenweg.js | ✅ erledigt |
| 2e. ui.js | ✅ erledigt (1 Versions-Fix) |
| 2f. schaubild.js | ✅ erledigt |
| 2g. DT-ProfiSchraube_Test.html | ✅ erledigt (Versionsanzeige) |
| 2h. style.css | ✅ erledigt |
| 2i. test_solver.js | ✅ erledigt |
| 3. Dynamische Checks (15 Presets × 3 Sprachen, Rechenweg-Selbstprüfung, .dt-Round-Trip) | ✅ erledigt |
| 4. Gesamtbewertung + Fixes | ✅ erledigt |

**Audit vollständig. Suite: 2.211.116 Assertions, 0 Fehler.**

## Schweregrade
- 🔴 kritisch (falsches Ergebnis / Absturz) — sofort fixen
- 🟠 mittel (fehlerhaft unter Randbedingungen / Inkonsistenz) — sofort fixen
- 🟡 kosmetisch — Backlog
- 📝 kein Bug, aber Notiz

## Befunde

### Masterplan selbst (beim Lesen aufgefallen)
- 🟡 M-1: Fußzeile sagt noch „v4.7.0", Status-Block enthält doppelte Zeile „Implementierung läuft". → beim nächsten Masterplan-Update glattziehen.

### 2a. solver.js (860 Zeilen, komplett gelesen + dynamisch nachgerechnet)

- 🟠 **S-1 (GEFIXT): FIX_SG-Querkraft-Zielwert ignorierte den M_Ymax-Term.**
  `improvementHints`, alt: `fqZul = F_Qmax*S_G/1,2`. Diese Inversion ist nur ohne
  Drehmoment um die Schraubenachse exakt; mit M_Ymax > 0 bleibt der konstante Term
  t2 = M_Ymax/(q_M·r_a·µ_T) im F_KQerf stehen. **Nachgerechnet:** Zielwert lieferte
  S_G = 0,138 statt 1,2 (nicht-konservativ!). **Fix:** `fqZul = (F_KR/1,2 − t2)·q_F·µ_T`,
  bei ≤ 0 auf 0 geklemmt; ohne M_Ymax algebraisch identisch zur alten Form (bestehende
  Tests bit-identisch grün). Der µ_T-Zielwert war auch mit M_Ymax exakt (beide Terme ~1/µ_T).
  **Tests erweitert:** Inversion mit M_Ymax (mu- und fq-Ziel → S_G = 1,2 nachgerechnet).

- 🟡 **S-2 (GEFIXT): S_G = 0 (F_Kerf = 0 + Querkraft) erzeugte µ_T-Ziel = Infinity.**
  F_Kerf hat min: 0 (gültig); F_KR = F_Kerf identisch (per Konstruktion) → S_G = 0 →
  `muT·(1,2/0) = Infinity` im Hinweis („µ_T ≥ Infinity" in der UI). **Fix:** mu = null
  bei S_G ≤ 0; `hintText` in ui.js entfernt dann die eingeklammerte µ_T-Klausel
  (sprachneutraler Regex, greift in DE/EN/PT); fq = 0 bleibt (mathematisch korrekt:
  ohne Restklemmkraft ist keine Querkraft übertragbar; erster Hebel im Text ist ohnehin
  „Klemmkraft erhöhen"). **Tests erweitert:** Randfall F_Kerf = 0 → mu = null, fq = 0,
  kein Infinity/NaN, kein Absturz.

- 🟡 **S-3 (GEFIXT, nur Kommentar): F_Vmax-Kommentar irreführend.** Z. 636 sagte „fuer
  Flaechenpressung Betriebszustand", aber R10-Betrieb nutzt (konservativer, korrekt)
  F_Smax. F_Vmax wird nur als Info exportiert. Kommentar präzisiert, keine Logikänderung.

- 📝 **S-4 (Notiz, kein Bug):** computeJoint enthält rohe `throw` für Thermik/Taper/Flansch-
  Pflichtfelder — alle durch Cross-Validation in validate.js (Regeln 8/9/10) abgedeckt,
  die vorher `status:'invalid'` liefert. Throws sind reine Backstops. OK.
- 📝 **S-5 (Notiz):** F_KR = F_Mmin − F_Z − ΔF_Vth,loss − (1−Φen)·F_A ist per Konstruktion
  identisch F_Kerf (VDI-Logik: Mindestvorspannung so gewählt, dass Restklemmkraft =
  Bedarf). Konsistent, dokumentiert im ASSUME_FKR_FORMULA-Hinweis. OK.
- 📝 **S-6 (Notiz):** µ_T-Zielwert kann rechnerisch > warnMax/max (0,8) liegen und wäre
  dann als alleiniger Hebel unphysikalisch — der Hinweistext nennt aber immer mehrere
  Hebel und die Kopplungs-Pflicht zur Nachprüfung. Backlog: optional kennzeichnen,
  wenn µ-Ziel > 0,3 (warnMax). Kein Fix nötig.
- ✅ Geprüft und in Ordnung: A_0-Selektion (δ_S-Zusatzglied, R7 mit W_p aus d_0, R8/R9
  über A_sig; R11 strikt A_S), Shallow-Copy des Flansch-Assistenten (Original unberührt),
  Thermik-Vorzeichenlogik (deltaFvthLoss für F_Mmin/F_KR, signiert in F_Smax/F_Vmax),
  R10-Doppelnachweis (Montage F_Mzul / Betrieb F_Smax, min-S_P), tanPhi-Clamp,
  SG-Rückfall SV, Oberflächenfaktor, klassenabhängige Bolzen-Scherzahl, C2/C3-Polynome
  (B3-Anker), Engine-Version 0.9.0, alle Exporte konsistent.

**Geänderte Dateien durch 2a:** `solver.js` (FIX_SG + Kommentar), `ui.js` (hintText-Klausel),
`test_solver.js` (+6 Assertions).

### 2b. daten.js (440 Zeilen)
- ✅ Alle 16 Gewinde, 13 Festigkeitsklassen, TAU_RATIO (9 Werkstoffe mit ratio/E/pG/alpha/src),
  BOLT_TAU_BY_CLASS, BOLT_ALPHA, SURFACE_FATIGUE, 15 Presets geprüft. Keine NaN-Quellen,
  Enums konsistent mit validate.enumValues.
- 📝 **D-1 (Notiz, kein Bug):** `P_G` (alte 1986er Tabelle) und `E_MODULUS` werden nirgends
  mehr verwendet (single source ist TAU_RATIO). Toter, aber harmloser Datenblock. Backlog:
  entfernen oder als „nur Referenz" kommentieren. Kein Fix jetzt (kein Risiko, spart nichts Kritisches).
- 📝 **D-2 (Notiz):** dehnschraube_m16 setzt `d0Custom: true` explizit — korrekt, damit der
  Preset-Wert d_0 = 12,2 nicht vom UI-Richtwert überschrieben wird. Konsistent.

### 2c. validate.js (791 Zeilen, Schema automatisiert geprüft)
- 🟡 **V-1 (GEFIXT): Schätzwert-Kennzeichnung im Dropdown nur deutsch.** In `fieldOptions`
  waren die Zusätze „Schätzwert (kein Norm-Beleg)" / „p_G Schätzwert" (matGroupM/plateMat,
  Werkstoff mg_guss) hart deutsch, auch bei lang=en/pt. **Fix:** über `pick({de,en,pt})`
  dreisprachig. **Tests erweitert:** Notiz-Übersetzung für mg_guss in allen 3 Sprachen.
- ✅ Automatische Schema-Prüfung: 61 Felder, alle label/help in DE/EN/PT vorhanden, alle
  dependsOn-Ziele existieren, alle Enums nicht-leer, min≤max, warnMin/warnMax innerhalb der
  harten Grenzen. Cross-Validation (Regeln 1–10) deckt Thermik/Flansch/Dehn/M_Ymax-Pflichtfelder
  ab → Solver-throws sind reine Backstops (siehe S-4). dT erlaubt negativ (−273…1000). Sauber.

### 2d. rechenweg.js (Selbstprüfung dynamisch)
- ✅ tanPhi-Clamp-Duplikat (0,05) stimmt mit solver TANPHI_MIN überein. Neue Schritte R0a
  (Taille A_0), R4b (Thermik), R12a (Flansch-Umfangskraft) vorhanden und selbstprüfend.
  δ_S-Taillenglied, R7/R8/R9-Umschaltung A_0↔A_S, F_KR-Formel mit max(0;ΔF_Vth) korrekt.
  **Jeder Schritt aller 15 Presets × DE/EN/PT: `ok===true`, Titel übersetzt** (Selbstprüfung
  gegen Engine bestanden, kein Formel-Duplikat außer dem bewussten tanPhi-Riegel).

### 2e. ui.js (1008 Zeilen)
- 🟠 **U-1 (GEFIXT): Footer-Versionsanzeige „v0.8.0" bei Engine 0.9.0.** i18n-Strings (DE/EN/PT)
  und HTML-Footer zeigten die alte Engine-Version. **Fix:** Strings tragen jetzt Platzhalter
  `{v}`, der i18n-Applier und das Info-Panel ersetzen ihn aus `SOLVER.VERSION`
  (`v0.9.0`) — **driftsicher** für künftige Versionssprünge. HTML-Vorabtext auf v0.9.0 gesetzt.
- ✅ collectInputs überspringt nur `disabled` (nicht `readOnly`) → gesperrte Assistenten-/
  Materialfelder gehen korrekt in die Rechnung; deaktivierte dependsOn-Felder werden übersprungen.
  Assistenten-Werte (ΔF_Vth, F_Qmax) werden nach compute ins gesperrte Feld geschrieben, beim
  Neurechnen aber von der Assistenten-Logik überschrieben → keine Doppelzählung. Alle 58 Engine-/
  Validierungs-Codes haben EN/PT-Übersetzungen. Kein `innerHTML` mit dynamischen Werten
  (nur statische Strings/`''`/SVG aus schaubild). Kein fetch/import/CDN. Focus-Trap, Null-sichere
  Bindung vorhanden.

### 2f. schaubild.js (181 Zeilen)
- ✅ Rein zeichnend, `esc()` schützt Texte, Guards (Z. 53/63) liefern `''` bei unphysikalischer
  Geometrie, defFmt fängt null/non-finite mit „–". Zahlen nur in HTML-Legende, nicht in der
  Zeichnung (Merksatz eingehalten). Kein NaN im Output über alle Presets × 3 Sprachen.

### 2g. DT-ProfiSchraube_Test.html
- ✅ `<html lang="de" translate="no">` + `notranslate`-Meta, CSS via `<link>`, JS via klassische
  `<script src>` in korrekter Reihenfolge (daten→validate→solver→rechenweg→schaubild→ui), keine
  absoluten URLs, kein fetch/import. Footer-Version via U-1 korrigiert.

### 2h. style.css
- ✅ Keine externen Ressourcen (kein @import/@font-face/url(http)/googleapis). `@media print`
  hält `.app-footer` (Haftungs-Disclaimer + Normzeile) sichtbar und blendet Bedien-Chrome aus.

### 2i. test_solver.js (nach Erweiterung ~2,211 Mio Assertions)
- ✅ 32 Sektionen, 391 Aufrufe echter Engine-/Modul-Funktionen. Die vereinzelten `Math.PI/4`
  u. ä. im Test sind **unabhängige Handnachrechnungen** zur Kreuzprüfung gegen die Engine
  (gewollte Testphilosophie), keine Duplikate der Produktionslogik. Tests nur erweitert, nie gelockert.

---

## ✅ Gesamtbewertung

**Der Code der v4.8.0 ist über die vier Bausteine hinweg solide und konsistent.** Kein
kritischer (🔴) Befund. Gefunden und **sofort behoben**: 2 mittlere (🟠) und 3 kosmetische (🟡)
Punkte; alle mit Test-Erweiterung abgesichert (nie gelockert):

| # | Grad | Datei | Kurz | Status |
|---|---|---|---|---|
| S-1 | 🟠 | solver.js | FIX_SG-Querkraftziel ignorierte M_Ymax-Term (nicht-konservativ) | gefixt + Test |
| U-1 | 🟠 | ui.js/html | Versionsanzeige v0.8.0 statt v0.9.0 | gefixt (driftsicher) |
| S-2 | 🟡 | solver/ui | S_G=0 → µ_T-Ziel Infinity im Hinweis | gefixt + Test |
| S-3 | 🟡 | solver.js | irreführender F_Vmax-Kommentar | gefixt |
| V-1 | 🟡 | validate.js | Schätzwert-Notiz im Dropdown nur deutsch | gefixt + Test |

**Backlog (kein Handlungsdruck):** D-1 tote Tabellen P_G/E_MODULUS entfernen; S-6 µ_T-Zielwert
optional als „unphysikalisch > 0,3" kennzeichnen; M-1 Masterplan-Fußzeile/Doppelzeile glätten.

**Verifikation:** Grün-Basislinie 2.211.104 → nach Fixes+Tests **2.211.116 Assertions, 0 Fehler**.
15 Presets × 3 Sprachen (Solver+Rechenweg+Schaubild) ohne NaN; Rechenweg-Selbstprüfung je Schritt
bestanden; .dt-Round-Trip aller 15 Presets bit-identisch; Fehlerpfade abgefangen.

**Empfehlung:** Audit bestanden. Freigabe für das nächste Ziel (Ausgabe/Bericht: Browser-Druck +
self-hosted jsPDF, RTF, CSV, Diagramm-PNG/SVG).

**Geänderte Dateien im Audit:** `solver.js`, `ui.js`, `validate.js`, `DT-ProfiSchraube_Test.html`,
`test_solver.js`. Unverändert: `daten.js`, `rechenweg.js`, `schaubild.js`, `style.css`.
