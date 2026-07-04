/* ============================================================================
 * DT-ProfiSchraube · daten.js  (Engine-Datenbasis)
 * ----------------------------------------------------------------------------
 * Reine Referenzdaten als JS-Objekte (KEIN JSON, KEIN fetch, KEIN ES-import) —
 * lauffaehig in Node (Tests) UND im Browser (klassisches <script src>).
 *
 * Quellen: DIN 13 (Geometrie), ISO 898-1 (A_S / Festigkeitsklassen),
 *          VDI 2230 Bl.1 (Reibung A5, Setzbetraege, Grenzflaechenpressung).
 * HINWEIS: Werte aus Sekundaerquellen zusammengetragen. Vor Produktivnutzung
 *          gegen die Originalnorm (VDI 2230 Bl.1:2015-11 / ISO 898-1) validieren.
 *          Mit "validate:false" markierte Eintraege sind ausdruecklich zu pruefen.
 * ========================================================================== */
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.DTSData = factory(); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* Metrisches ISO-Regelgewinde (DIN 13).
   * d      = Nenndurchmesser [mm]
   * P      = Steigung [mm]
   * As_ref = tabellierter Spannungsquerschnitt nach ISO 898-1 [mm^2]
   *          (dient als unabhaengige VALIDIERUNGSREFERENZ fuer die Geometrie) */
  var THREADS = {
    'M3':   { d: 3,    P: 0.5,  As_ref: 5.03 },
    'M3.5': { d: 3.5,  P: 0.6,  As_ref: 6.78 },
    'M4':   { d: 4,    P: 0.7,  As_ref: 8.78 },
    'M5':   { d: 5,    P: 0.8,  As_ref: 14.2 },
    'M6':   { d: 6,    P: 1.0,  As_ref: 20.1 },
    'M7':   { d: 7,    P: 1.0,  As_ref: 28.9 },
    'M8':   { d: 8,    P: 1.25, As_ref: 36.6 },
    'M10':  { d: 10,   P: 1.5,  As_ref: 58.0 },
    'M12':  { d: 12,   P: 1.75, As_ref: 84.3 },
    'M14':  { d: 14,   P: 2.0,  As_ref: 115  },
    'M16':  { d: 16,   P: 2.0,  As_ref: 157  },
    'M20':  { d: 20,   P: 2.5,  As_ref: 245  },
    'M24':  { d: 24,   P: 3.0,  As_ref: 353  },
    'M30':  { d: 30,   P: 3.5,  As_ref: 561  },
    'M36':  { d: 36,   P: 4.0,  As_ref: 817  },
    'M39':  { d: 39,   P: 4.0,  As_ref: 976  }
  };

  /* Festigkeitsklassen nach ISO 898-1.
   * Rm    = Mindestzugfestigkeit [N/mm^2]
   * Rp    = Streckgrenze R_p0,2 / R_eL  bzw.  Pruefspannung R_pf [N/mm^2]
   * proof = false  -> Rp ist Pruefspannung (Klassen 4.8/5.8/6.8, Sonderfaelle)
   *                   Diese weichen von der Ziffern-Formel ab -> validate:false.
   * Ziffern-Formel (nur fuer "volle" Klassen exakt):
   *   Rm = Ziffer1 * 100 ;  Rp = Ziffer1 * Ziffer2 * 10 */
  var STRENGTH = {
    '4.6':  { Rm: 400,  Rp: 240,  proof: true  },
    '4.8':  { Rm: 420,  Rp: 340,  proof: false, validate: true },
    '5.6':  { Rm: 500,  Rp: 300,  proof: true  },
    '5.8':  { Rm: 520,  Rp: 420,  proof: false, validate: true },
    '6.8':  { Rm: 600,  Rp: 480,  proof: false, validate: true },
    '8.8':  { Rm: 800,  Rp: 640,  proof: true,  note: '>M16: Rm 830 / Rp 660' },
    '9.8':  { Rm: 900,  Rp: 720,  proof: true  },
    '10.9': { Rm: 1000, Rp: 900,  proof: true  },
    '12.9': { Rm: 1200, Rp: 1080, proof: true  },
    '14.9': { Rm: 1400, Rp: 1260, proof: true  },
    /* Rostfreie/austenitische Schrauben nach ISO 3506-1 (A2/A4). Ausserhalb des
     * VDI-2230-Kernbereichs (8.8..12.9) -> validate:true (Warnung, kein Fehler).
     * stainless:true steuert E-Modul (~200 GPa) und die austenitische Scherzahl (0,80).
     * Rp = Rp0,2 nach ISO 3506-1. */
    'A2-70': { Rm: 700, Rp: 450, proof: false, validate: true, stainless: true, E: 200000, note: 'rostfrei A2 (z. B. X5CrNi18-10), ISO 3506-1' },
    'A4-70': { Rm: 700, Rp: 450, proof: false, validate: true, stainless: true, E: 200000, note: 'rostfrei A4 (z. B. X5CrNiMo17-12-2), ISO 3506-1' },
    'A4-80': { Rm: 800, Rp: 600, proof: false, validate: true, stainless: true, E: 200000, note: 'rostfrei A4 (z. B. X5CrNiMo17-12-2), ISO 3506-1' }
  };

  /* Reibungszahlklassen A-E (mu fuer Gewinde mu_G und Kopfauflage mu_K identisch).
   * range = [min, max] aus Sekundaerquellen (VDI 2230 Tab. A5).
   * Klassen F/G aus der Originalnorm nachzutragen (hier bewusst nicht enthalten). */
  var FRICTION = {
    'A': { range: [0.04, 0.10], note: 'blank/phosphatiert/galvanisch; Festschmierstoffe (MoS2/Grafit/PTFE)' },
    'B': { range: [0.08, 0.16], note: 'galv. Zn/Zn-Fe/Zn-Ni; Wachse/Oele/Fette', recommended: true },
    'C': { range: [0.14, 0.24], note: 'feuerverzinkt; organische Beschichtung' },
    'D': { range: [0.20, 0.35], note: 'Klebstoff; feuerverzinkt + Schmierstoff/Wachs' },
    'E': { range: [0.29, 0.45], note: 'Al/Mg mit Festschmierstoffen/Pasten (> 0,29)', validate: true }
  };

  /* Anziehfaktor alpha_A = F_Mmax / F_Mmin  (VDI 2230 Tab. A8), Richtbereiche. */
  var TIGHTENING = {
    'streckgrenzgesteuert': { range: [1.0, 1.2], note: 'streckgrenz-/ueberelastisch gesteuert' },
    'drehwinkelgesteuert':  { range: [1.1, 1.3], note: 'drehwinkelgesteuert' },
    'drehmomentgesteuert':  { range: [1.4, 1.6], note: 'drehmomentgesteuert (bis 2,5 bei groesserer Streuung)', recommended: true },
    'schlagschrauber':      { range: [2.5, 4.0], note: 'Schlagschrauber, ungeregelt' }
  };

  /* Setzbetraege f_Z [um] nach Rautiefe Rz und Lastart.
   * thread       = im Gewinde
   * perSeat      = je Kopf-/Mutternauflage
   * perInterface = je innere Trennfuge */
  var SETTLING = {
    'Rz<10':    { axial: { thread: 3, perSeat: 2.5, perInterface: 1.5 }, shear: { thread: 3, perSeat: 3.0, perInterface: 2.0 } },
    'Rz10-40':  { axial: { thread: 3, perSeat: 3.0, perInterface: 2.0 }, shear: { thread: 3, perSeat: 4.5, perInterface: 2.5 } },
    'Rz40-160': { axial: { thread: 3, perSeat: 4.0, perInterface: 3.0 }, shear: { thread: 3, perSeat: 6.5, perInterface: 3.5 } }
  };

  /* Grenzflaechenpressung p_G [N/mm^2] (VDI 2230 Ausg. 1986, Auswahl).
   * Ausgabe 2015 (Tab. A9) teils hoeher -> spaeter beide Datensaetze referenzierbar. */
  var P_G = {
    'S235 (St37)':     { Rm: 370,  pG: 260 },
    'St50':            { Rm: 500,  pG: 420 },
    'C45':             { Rm: 800,  pG: 700 },
    '42CrMo4':         { Rm: 1000, pG: 850 },
    '30CrNiMo8':       { Rm: 1200, pG: 750 },
    'X5CrNiMo18-10':   { Rm: 600,  pG: 210 },
    'Titan unlegiert': { Rm: 460,  pG: 300 },
    'GJL-25 (GG25)':   { Rm: 250,  pG: 800 },
    'GJS-35.5':        { Rm: 350,  pG: 480 },
    'AlZnMgCu0,5':     { Rm: 450,  pG: 370 },
    'GD-MgAl9':        { Rm: 300,  pG: 220 }
  };

  /* E-Moduln [N/mm^2]. E_SCREW = Standard fuer Schraubenstahl (VDI 2230). */
  var E_SCREW = 205000;
  var E_MODULUS = {
    'Stahl':   210000,
    'GJL':     110000,
    'GJS':     170000,
    'Al-Leg.':  70000,
    'Mg-Leg.':  45000,
    'Titan':   110000
  };

  /* DIN-13-Profilkonstanten (fuer Geometrieformeln in solver.js). */
  var THREAD_CONST = {
    c_d2: 0.64952,   // d2 = d - c_d2 * P
    c_d3: 1.22687,   // d3 = d - c_d3 * P  (Kerndurchmesser Bolzen)
    c_D1: 1.08253    // D1 = d - c_D1 * P  (Kerndurchmesser Mutter/Innengewinde, ISO)
  };

  /* ===== R11: Scherfestigkeitsverhaeltnisse tau_B / R_m ====================
   * Verhaeltnis Scherfestigkeit zu Zugfestigkeit je Innengewinde-/Mutter-
   * Werkstoffgruppe. Dient der Bildung des Tragkraftverhaeltnisses R_S (welches
   * Gewinde zuerst abschert) und der erforderlichen Mindesteinschraubtiefe.
   * Struktur der Mindesteinschraubtiefe nach VDI 2230 Bl.1 (Alexander/Ruoss).
   *
   * QUELLENBELEG (2026-07, Websuche-Abgleich):
   *  - Primaerquelle: VDI 2230 Blatt 1:2015-11, Tabelle 6 / Bild 36
   *    ("Anhaltswerte fuer Scherfestigkeitsverhaeltnisse verschiedener Werkstoff-
   *    sorten", Fall Innengewinde kritisch). Dort als BEREICHE angegeben:
   *      Baustahl 0,80..0,85 · Verguetungsstahl 0,65..0,85 · Einsatzstahl 0,85..1,0
   *      Stahlguss 0,80 · Austenit (loesungsgeglueht) 0,80 · Austenit F90/60 0,65..0,75.
   *    -> Wir waehlen bewusst den UNTEREN (konservativen) Rand jedes Bereichs.
   *  - Gusseisen/Aluminium: Lork/Hanke (ing-hanke.de), publiziert "nach VDI 2230-1:2015":
   *      GJS 0,90 · GJL 1,15 · Alu-Knet 0,60 · Alu-Guss 0,52 (Werte im Quellentitel gefuehrt).
   *  - Herleitung der Verhaeltnisse: Thomala (Konstruktion 47/1995); Zug- + zweischnittige
   *    Scherversuche; Abnahme des Verhaeltnisses mit steigender Zugfestigkeit (TU Clausthal,
   *    Stromberg/Kluegel/Lohrengel 2020, peer-reviewt).
   * Alle acht Werte sind damit normbelegt. Magnesium bleibt Schaetzwert (kein VDI-Beleg).
   * VDI-Norm ist geschuetzt -> Werte belegt/paraphrasiert, NICHT aus der Norm kopiert.
   *
   * Feld `vdiRange` (optional): der in VDI 2230-1 Tab. 6 angegebene Bereich; fehlt bei
   * Werten, die nur ueber Lork/Hanke als Einzelwert belegt sind. Kein Austenit (bewusst
   * weggelassen, da Sonderfall; Werte waeren 0,80 bzw. 0,65..0,75). */
  /* Vereinheitlichte Werkstofftabelle (single source of truth).
   *  - ratio = Scherfestigkeitsverhaeltnis tau_B/R_m (R11).
   *  - E  = Elastizitaetsmodul (N/mm^2).
   *  - pG = Grenzflaechenpressung (N/mm^2), VDI 2230 Tab. A9 (via schweizer-fn); Mg: Decker/Ettenmayer.
   *  - rmDefault/grade = konservative, editierbare UI-Vorbelegungen (kein Norm-Anspruch). */
  var TAU_RATIO = {
    stahl:     { ratio: 0.65, vdiRange: [0.65, 0.85], E: 210000, pG: 630, rmDefault: 600, grade: 'C45 vergütet',  src: 'VDI 2230-1:2015, Tab. 6 (Verguetungsstahl 0,65..0,85; unterer Rand)', label: { de: 'Stahl (verguetet/gehaertet)', en: 'steel (quenched & tempered)', pt: 'aço (temperado e revenido)' } },
    stahl_bau: { ratio: 0.80, vdiRange: [0.80, 0.85], E: 210000, pG: 450, rmDefault: 360, grade: 'S235',          src: 'VDI 2230-1:2015, Tab. 6 (Baustahl 0,80..0,85; unterer Rand)', label: { de: 'Bau-/Automatenstahl', en: 'structural/free-cutting steel', pt: 'aço estrutural/de corte livre' } },
    einsatz:   { ratio: 0.85, vdiRange: [0.85, 1.00], E: 210000, pG: 900, rmDefault: 800, grade: '16MnCr5',       src: 'VDI 2230-1:2015, Tab. 6 (Einsatzstahl 0,85..1,0; unterer Rand) / Anh. B3', label: { de: 'Einsatzstahl (z. B. 16MnCr5)', en: 'case-hardening steel (e.g. 16MnCr5)', pt: 'aço de cementação (p. ex. 16MnCr5)' } },
    austenit:  { ratio: 0.80, vdiRange: [0.80, 0.80], E: 200000, pG: 210, rmDefault: 500, grade: 'X5CrNiMo17-12-2 (A4)', src: 'VDI 2230-1:2015, Tab. 6 (Austenit lösungsgeglüht 0,80)', label: { de: 'Rostfrei/Austenit (A2/A4)', en: 'stainless/austenitic (A2/A4)', pt: 'inoxidável/austenítico (A2/A4)' } },
    gjs:       { ratio: 0.90, E: 175000, pG: 600, rmDefault: 400, grade: 'GJS-400',       src: 'VDI 2230-1:2015 via Lork/Hanke (GJS 0,90)',           label: { de: 'Sphaeroguss GJS', en: 'nodular cast iron GJS', pt: 'ferro fundido nodular GJS' } },
    gjl:       { ratio: 1.15, E: 110000, pG: 850, rmDefault: 250, grade: 'GJL-250',       src: 'VDI 2230-1:2015 via Lork/Hanke (GJL 1,15)',           label: { de: 'Grauguss GJL', en: 'grey cast iron GJL', pt: 'ferro fundido cinzento GJL' } },
    alu_knet:  { ratio: 0.60, E: 70000,  pG: 230, rmDefault: 260, grade: 'EN AW-6082',    src: 'VDI 2230-1:2015 via Lork/Hanke (Alu-Knet 0,60)',      label: { de: 'Aluminium-Knetlegierung', en: 'wrought aluminium alloy', pt: 'liga de alumínio forjado' } },
    alu_guss:  { ratio: 0.52, E: 70000,  pG: 220, rmDefault: 200, grade: 'AlSi-Guss',     src: 'VDI 2230-1:2015 via Lork/Hanke (Alu-Guss 0,52)',      label: { de: 'Aluminium-Gusslegierung', en: 'cast aluminium alloy', pt: 'liga de alumínio fundido' } },
    mg_guss:   { ratio: 0.55, E: 45000,  pG: 140, rmDefault: 150, grade: 'AZ91',          src: 'Schätzwert (kein VDI-Beleg)', label: { de: 'Magnesium-Legierung', en: 'magnesium alloy', pt: 'liga de magnésio' } }
  };
  /* Bolzen-Scherfestigkeitsverhaeltnis tau_B,S / R_m,S der Schraube (Stahl), klassenabhaengig.
   * VDI 2230 Bl.1 nutzt nach Thomala eine mit der Zugfestigkeit fallende Reihe:
   *   Klassen 4.6/5.6/6.8 ~ 0,70 · 8.8 = 0,65 · 10.9 = 0,62 · 12.9 = 0,60
   * (TU Clausthal 2020, Tab. 1; B3-Beispiel nutzt fuer 8.8-Bolzen 0,65). Der Solver waehlt
   * ueber die Festigkeitsklasse automatisch (keine Nutzereingabe). Fallback = BOLT_TAU_RATIO. */
  var BOLT_TAU_BY_CLASS = {
    '4.6': 0.70, '4.8': 0.70, '5.6': 0.70, '5.8': 0.70, '6.8': 0.70,
    '8.8': 0.65, '9.8': 0.63, '10.9': 0.62, '12.9': 0.60, '14.9': 0.60,
    'A2-70': 0.80, 'A4-70': 0.80, 'A4-80': 0.80   // Austenit loesungsgeglueht, VDI 2230-1 Tab. 6
  };
  var BOLT_TAU_RATIO = 0.62;   // Default/Fallback (10.9); bestaetigt VDI 2230 Bl.1 Anh. B1/B5 (Ruoss)

  /* ===== Dauerfestigkeits-Abminderung nach Oberflaeche/Ausfuehrung ===========
   * Faktor auf sigma_A (SV und SG). VDI 2230 Bl.1: HV-Garnituren ca. 20 % geringer;
   * feuerverzinkt ca. 30 % (Geometrie ~10 % + Verzinkung ~20 %). "blank" = Maschinenbau,
   * keine Abminderung. Reine Auswahl -> Faktor wird angewandt, kein Zahlwert noetig. */
  var SURFACE_FATIGUE = {
    blank:    { factor: 1.00, label: { de: 'blank / Maschinenbau (keine Abminderung)', en: 'plain / machine bolt (no reduction)', pt: 'liso / parafuso de máquina (sem redução)' } },
    verzinkt: { factor: 0.70, label: { de: 'feuerverzinkt (−30 %: Geometrie + Zink)', en: 'hot-dip galvanized (−30%: geometry + zinc)', pt: 'galvanizado a quente (−30%: geometria + zinco)' } },
    hv:       { factor: 0.80, label: { de: 'HV-Garnitur Stahlbau (−20 %)', en: 'HV structural set (−20%)', pt: 'conjunto HV (estrutural) (−20%)' } }
  };

  /* Validierte Beispielrechnung -> Voreinstellung / Beispiel im Tool.
   * Quelle: Hochschule Anhalt, S. Voigt, "Schraubenverbindungen: Tragfaehigkeits-
   * nachweis nach VDI 2230" (Uebung Maschinenelemente). Hydraulikzylinder mit
   * verschraubtem Kolben. Die ref-Werte dienen der End-to-End-Validierung (<= ~2 %). */
  var PRESETS = {
    'hydraulikzylinder': {
      label: 'Hydraulikzylinder (M12, VDI-2230-Beispiel)',
      quelle: 'Hochschule Anhalt / S. Voigt, Uebung Maschinenelemente',
      input: {
        size: 'M12', strengthClass: '10.9', frictionClass: 'A',
        muG: 0.10, muK: 0.10, tightening: 'drehmomentgesteuert', alphaA: 1.7,
        connection: 'DSV', n: 0.3, E_S: 210000,
        lShank: 20.5, lThreadFree: 21.5, l_SK: 4.8, l_M: 3.96,
        l_K: 42, d_w: 21.11, d_h: 13.5, D_A: 80, E_P: 210000, p_G: 900,
        F_Kerf: 1000, F_Ao: 24900, F_Au: 0, rz: 'Rz10-40', seats: 1, interfaces: 1
      },
      ref: {
        deltaS: 2.95e-6, deltaP: 0.3546e-6, tanPhi: 0.566, DAGr: 44.9,
        PhiK: 0.11, PhiEn: 0.033, f_Z: 8, F_Z: 2475,
        F_Mmin: 27600, F_Mmax: 46900, F_Mzul_tab_109: 61000,
        M_G_at_61kN: 55260, W_p: 218, F_Smax: 61800,
        sigma_zmax: 733, sigma_redB: 766, Rp02_used: 940,
        F_SAa: 410, sigma_a: 5.3, A3: 76.2, sigma_A_SV: 48.9, A_p: 90, p_G: 900
      }
    },

    /* Illustrative Testeingaben (NICHT normvalidiert) — nur zum Vorbefuellen
     * der Eingabemaske, decken verschiedene Konfigurationen ab. */
    'grauguss_esv_m12': {
      label: 'Einschraubung M12 in Grauguss — R11 + SG-Nachweis',
      quelle: 'illustratives Beispiel (nicht normvalidiert; tau-Richtwerte)',
      illustrativ: true,
      input: {
        size: 'M12', strengthClass: '10.9', frictionClass: 'A', muG: 0.10, muK: 0.10,
        tightening: 'drehmomentgesteuert', connection: 'ESV', n: 0.5,
        lShank: 15, lThreadFree: 18, l_SK: 4.8, l_M: 3.96,
        l_K: 30, d_w: 18, d_h: 13.5, D_A: 50, plateMat: 'gjl', E_P: 110000, p_G: 850,
        F_Kerf: 8000, F_Ao: 8000, F_Au: 2000, rz: 'Rz10-40', seats: 1, interfaces: 1,
        threadFinish: 'SG', r11: true, matGroupM: 'gjl', Rm_M: 250, m_vorh: 22
      }
    },
    'durchsteck_m16': {
      label: 'Durchsteckverbindung M16 8.8 (statisch axial)',
      quelle: 'illustratives Testbeispiel (nicht normvalidiert)',
      illustrativ: true,
      input: {
        size: 'M16', strengthClass: '8.8', frictionClass: 'B',
        tightening: 'drehmomentgesteuert', connection: 'DSV', n: 0.5,
        lShank: 25, lThreadFree: 15,
        l_K: 40, d_w: 24, d_h: 17.5, D_A: 55, E_P: 210000, p_G: 600,
        F_Kerf: 10000, F_A: 15000, rz: 'Rz10-40', seats: 2, interfaces: 1
      }
    },
    'einschraub_m10': {
      label: 'Einschraubverbindung M10 10.9 (Sacklochgewinde, ESV)',
      quelle: 'illustratives Testbeispiel (nicht normvalidiert)',
      illustrativ: true,
      input: {
        size: 'M10', strengthClass: '10.9', frictionClass: 'A', muG: 0.10, muK: 0.10,
        tightening: 'drehmomentgesteuert', connection: 'ESV', n: 0.5,
        lShank: 12, lThreadFree: 8, l_SK: 4.0, l_M: 3.3,
        l_K: 20, d_w: 16, d_h: 11, D_A: 40, E_P: 210000, p_G: 900,
        F_Kerf: 5000, F_A: 8000, rz: 'Rz10-40', seats: 1, interfaces: 1
      }
    },
    'querkraft_m12': {
      label: 'Querkraftverbindung M12 8.8 (Reibschluss)',
      quelle: 'illustratives Testbeispiel (nicht normvalidiert)',
      illustrativ: true,
      input: {
        size: 'M12', strengthClass: '8.8', frictionClass: 'B',
        tightening: 'drehmomentgesteuert', connection: 'DSV', n: 0.5,
        lShank: 18, lThreadFree: 12,
        l_K: 30, d_w: 18, d_h: 13.5, D_A: 45, E_P: 210000, p_G: 600,
        F_Kerf: 15000, F_A: 1000, F_Qmax: 2500, muT: 0.20, qF: 1,
        rz: 'Rz10-40', seats: 2, interfaces: 1
      }
    },
    'axial_wechsel_m12': {
      label: 'Wechsellast M12 10.9 (Dauerfestigkeit, F_Au < 0)',
      quelle: 'illustratives Testbeispiel (nicht normvalidiert)',
      illustrativ: true,
      input: {
        size: 'M12', strengthClass: '10.9', frictionClass: 'B',
        tightening: 'drehmomentgesteuert', connection: 'DSV', n: 0.5,
        lShank: 18, lThreadFree: 12,
        l_K: 30, d_w: 18, d_h: 13.5, D_A: 50, E_P: 210000, p_G: 700,
        F_Kerf: 8000, F_Ao: 8000, F_Au: -4000, rz: 'Rz10-40', seats: 2, interfaces: 1
      }
    },
    'kombiniert_m16': {
      label: 'Kombiniert M16 10.9 (axial + Querkraft)',
      quelle: 'illustratives Testbeispiel (nicht normvalidiert)',
      illustrativ: true,
      input: {
        size: 'M16', strengthClass: '10.9', frictionClass: 'B',
        tightening: 'drehmomentgesteuert', connection: 'DSV', n: 0.5,
        lShank: 28, lThreadFree: 12,
        l_K: 40, d_w: 24, d_h: 17.5, D_A: 60, E_P: 210000, p_G: 700,
        F_Kerf: 24000, F_A: 12000, F_Qmax: 4000, muT: 0.20, qF: 1,
        rz: 'Rz10-40', seats: 2, interfaces: 1
      }
    },
    'aluminium_m10': {
      label: 'Aluminium-Bauteile M10 8.8 (mit Flachscheibe)',
      quelle: 'illustratives Testbeispiel (nicht normvalidiert)',
      illustrativ: true,
      input: {
        size: 'M10', strengthClass: '8.8', frictionClass: 'B',
        tightening: 'drehmomentgesteuert', connection: 'DSV', n: 0.5,
        lShank: 14, lThreadFree: 8,
        l_K: 22, d_w: 18, d_h: 11, D_A: 45, E_P: 70000, p_G: 230,
        F_Kerf: 5000, F_A: 4000, rz: 'Rz10-40', seats: 2, interfaces: 1
      }
    },
    'flansch_m20': {
      label: 'Flansch M20 10.9 (hohe Axiallast)',
      quelle: 'illustratives Testbeispiel (nicht normvalidiert)',
      illustrativ: true,
      input: {
        size: 'M20', strengthClass: '10.9', frictionClass: 'B',
        tightening: 'drehmomentgesteuert', connection: 'DSV', n: 0.5,
        lShank: 35, lThreadFree: 15,
        l_K: 50, d_w: 30, d_h: 22, D_A: 70, E_P: 210000, p_G: 850,
        F_Kerf: 30000, F_A: 40000, rz: 'Rz10-40', seats: 2, interfaces: 1
      }
    },
    'flansch_torsion_m16': {
      label: 'Flansch M16 10.9 (Querkraft + Drehmoment um Schraubenachse)',
      quelle: 'illustratives Testbeispiel (nicht normvalidiert; R12 mit M_Ymax)',
      illustrativ: true,
      input: {
        size: 'M16', strengthClass: '10.9', frictionClass: 'B',
        tightening: 'drehmomentgesteuert', connection: 'DSV', n: 0.5,
        lShank: 28, lThreadFree: 12,
        l_K: 40, d_w: 24, d_h: 17.5, D_A: 60, E_P: 210000, p_G: 700,
        F_Kerf: 20000, F_A: 8000, F_Qmax: 4000, muT: 0.20, qF: 1,
        M_Ymax: 50000, qM: 1, ra: 30,
        rz: 'Rz10-40', seats: 2, interfaces: 1
      }
    },
    'rostfrei_a4_m10': {
      label: 'Rostfrei M10 A4-80 in Austenit (Einschraubung, R11)',
      quelle: 'illustratives Testbeispiel (nicht normvalidiert; rostfrei/Austenit, σ_A nur Näherung)',
      illustrativ: true,
      input: {
        size: 'M10', strengthClass: 'A4-80', frictionClass: 'C',
        tightening: 'drehmomentgesteuert', connection: 'ESV', n: 0.5,
        lShank: 12, lThreadFree: 15, l_SK: 4, l_M: 3.3,
        l_K: 24, d_w: 20, d_h: 11, D_A: 40, plateMat: 'austenit', E_P: 200000, p_G: 210,
        F_Kerf: 6000, F_Ao: 5000, F_Au: 1000, F_Qmax: 800, muT: 0.20, qF: 1,
        rz: 'Rz10-40', seats: 1, interfaces: 1,
        r11: true, matGroupM: 'austenit', Rm_M: 500, m_vorh: 15
      }
    },
    'schwing_sg_m12': {
      label: 'Schwinglast M12 10.9 schlussgewalzt (SG, feuerverzinkt)',
      quelle: 'illustratives Testbeispiel (nicht normvalidiert; SG-Dauerfestigkeit + Oberflächen-Abminderung)',
      illustrativ: true,
      input: {
        size: 'M12', strengthClass: '10.9', frictionClass: 'B',
        tightening: 'drehmomentgesteuert', connection: 'DSV', n: 0.5,
        lShank: 20, lThreadFree: 15,
        l_K: 35, d_w: 18, d_h: 13.5, D_A: 50, E_P: 210000, p_G: 700,
        F_Kerf: 12000, F_Ao: 9000, F_Au: 2000, rz: 'Rz10-40', seats: 2, interfaces: 1,
        threadFinish: 'SG', surfaceFinish: 'verzinkt'
      }
    }
  };

  var meta = {
    schema: '0.1.0',
    norm: 'VDI 2230 Blatt 1:2015-11',
    hinweis: 'Werte aus Sekundaerquellen; vor Produktivnutzung gegen Originalnorm validieren.'
  };

  return {
    THREADS: THREADS,
    STRENGTH: STRENGTH,
    FRICTION: FRICTION,
    TIGHTENING: TIGHTENING,
    SETTLING: SETTLING,
    P_G: P_G,
    E_SCREW: E_SCREW,
    E_MODULUS: E_MODULUS,
    THREAD_CONST: THREAD_CONST,
    TAU_RATIO: TAU_RATIO,
    BOLT_TAU_RATIO: BOLT_TAU_RATIO,
    BOLT_TAU_BY_CLASS: BOLT_TAU_BY_CLASS,
    SURFACE_FATIGUE: SURFACE_FATIGUE,
    PRESETS: PRESETS,
    meta: meta
  };
});
