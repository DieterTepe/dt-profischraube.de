/* ============================================================================
 * DT-ProfiSchraube · validate.js  (Eingabeschema + Pruefung)
 * ----------------------------------------------------------------------------
 * Zentrale Quelle fuer:
 *   - FIELDS:        Feldschema (Typ, Einheit, Auswahlwerte, harte Grenzen,
 *                    typischer Bereich, laienverstaendliche Hilfe, diagram-Haken)
 *   - enumValues:    erlaubte Werte eines Auswahlfeldes (aus den Datentabellen)
 *   - fieldOptions:  Auswahl-Optionen mit Label/Hinweis fuer die UI
 *   - validateInput: zweistufige Pruefung -> { ok, errors[], warnings[] }
 *
 * Zweistufig:
 *   ERRORS   = harte Fehler  -> Berechnung waere sinnlos, computeJoint rechnet nicht
 *   WARNINGS = Grenzbereich  -> Berechnung laeuft, Ergebnis nur weniger sicher
 *
 * Jede Meldung: { field, severity, code, text, range }. Der "code" ist stabil
 * (fuer spaetere Uebersetzung DE/EN/PT via i18n).
 *
 * HINWEIS: Die exakten Geltungsgrenzen der empirischen Kegelwinkelformel
 * (betaL, y) stehen in der Originalnorm. Hier vernuenftige Richtwerte, als
 * solche gekennzeichnet, spaeter gegen VDI 2230 Bl.1 scharf zu stellen.
 *
 * UMD: laeuft in Node (Tests) UND im Browser (klassisches <script src>).
 * ========================================================================== */
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(require('./daten.js')); }
  else { root.DTSValidate = factory(root.DTSData); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (DATA) {
  'use strict';

  function keys(o) { return o ? Object.keys(o) : []; }
  function num(x) { return typeof x === 'number' && isFinite(x); }

  /* Erlaubte Werte eines Auswahlfeldes — direkt aus den Datentabellen,
   * damit Schema und Daten nie auseinanderlaufen. */
  function enumValues(name) {
    switch (name) {
      case 'size':          return keys(DATA.THREADS);
      case 'strengthClass': return keys(DATA.STRENGTH);
      case 'frictionClass': return keys(DATA.FRICTION);
      case 'tightening':    return keys(DATA.TIGHTENING);
      case 'rz':            return keys(DATA.SETTLING);
      case 'connection':    return ['DSV', 'ESV'];
      case 'loadMode':      return ['axial', 'shear'];
      default:              return [];
    }
  }

  /* Auswahl-Optionen mit Label und erklaerendem Hinweis (fuer Dropdowns). */
  function fieldOptions(name) {
    var vals = enumValues(name), out = [];
    for (var i = 0; i < vals.length; i++) {
      var v = vals[i], note = '', rec = false, F;
      if (name === 'frictionClass' && (F = DATA.FRICTION[v])) {
        note = 'mu ' + F.range[0] + '..' + F.range[1] + ' — ' + F.note; rec = !!F.recommended;
      } else if (name === 'tightening' && (F = DATA.TIGHTENING[v])) {
        note = 'alpha_A ' + F.range[0] + '..' + F.range[1] + ' — ' + F.note; rec = !!F.recommended;
      } else if (name === 'strengthClass' && (F = DATA.STRENGTH[v])) {
        note = 'Rm ' + F.Rm + ' / Rp0,2 ' + F.Rp + ' N/mm^2';
      } else if (name === 'connection') {
        note = (v === 'DSV') ? 'Durchsteckschraube mit Mutter' : 'Einschraubverbindung (Sacklochgewinde)';
      } else if (name === 'loadMode') {
        note = (v === 'axial') ? 'vorwiegend axiale Belastung' : 'vorwiegend Quer-/Schublast';
      } else if (name === 'rz' && DATA.SETTLING[v]) {
        note = 'Rautiefe der Trennflaechen';
      }
      out.push({ value: v, label: v, note: note, recommended: rec });
    }
    return out;
  }

  /* ------------------------------------------------------------------ Schema
   * type:     'enum' (Auswahl) | 'number'
   * enumOf:   Name der Auswahlliste (siehe enumValues)
   * unit:     Einheit (Anzeige)
   * required: Pflichtfeld
   * min/max:  HARTE Grenzen -> Fehler
   * warnMin/warnMax: typischer Bereich -> Warnung ausserhalb
   * step/decimals: UI-Hinweise
   * advanced: unter "Erweitert" einklappbar
   * diagram:  Haken fuer spaetere Overlay-Skizze (welche Groesse ist gemeint)
   * help:     laienverstaendlich, mit Bereichsangabe */
  var FIELDS = {
    /* --- Schraube & Werkstoff --- */
    size: {
      label: 'Gewindegroesse', group: 'Schraube', type: 'enum', enumOf: 'size', required: true,
      diagram: 'gewinde',
      help: 'Metrisches ISO-Regelgewinde, z. B. M12. Bestimmt Nenndurchmesser, Steigung und alle Querschnitte automatisch. Bei Unsicherheit: Durchmesser des Gewindes messen (Aussenmass) und die naechstkleinere Groesse waehlen.'
    },
    strengthClass: {
      label: 'Festigkeitsklasse', group: 'Schraube', type: 'enum', enumOf: 'strengthClass', required: true,
      diagram: 'kopf',
      help: 'Werkstofffestigkeit der Schraube, meist auf dem Kopf eingepraegt (z. B. 8.8, 10.9, 12.9). Erste Zahl x100 = Zugfestigkeit, beide Zahlen geben die Streckgrenze. VDI 2230 ist fuer hochfeste Schrauben 8.8 bis 12.9 gedacht; hoehere Klasse erlaubt mehr Vorspannung.'
    },
    E_S: {
      label: 'E-Modul Schraube', group: 'Schraube', type: 'number', unit: 'N/mm^2',
      min: 50000, max: 250000, warnMin: 195000, warnMax: 215000, advanced: true, diagram: null,
      help: 'Elastizitaetsmodul des Schraubenwerkstoffs. Fuer Stahlschrauben rund 205 000 N/mm^2 (Standard, wird automatisch verwendet). Nur aendern, wenn ein anderer Werkstoff vorliegt.'
    },

    /* --- Reibung & Anziehen --- */
    frictionClass: {
      label: 'Reibungsklasse', group: 'Anziehen', type: 'enum', enumOf: 'frictionClass', diagram: 'reibung',
      help: 'Reibung in Gewinde und Kopfauflage, abhaengig von Oberflaeche und Schmierung. Niedrige Reibung bringt bei gleichem Drehmoment mehr Vorspannung, streut aber staerker. Startempfehlung: Klasse B (leicht geoelt). Alternativ direkt mu_G/mu_K angeben.'
    },
    muG: {
      label: 'Gewindereibwert mu_G', group: 'Anziehen', type: 'number', unit: '-',
      min: 0.01, max: 0.6, warnMin: 0.04, warnMax: 0.30, decimals: 3, diagram: 'reibung',
      help: 'Reibungszahl im Gewinde. Typisch 0,10-0,14 (Stahl/Stahl, leicht geoelt). Sehr niedrige Werte (<0,08) nur bei guter Schmierung oder Festschmierstoff. Ueberschreibt die Reibungsklasse, wenn gesetzt.'
    },
    muK: {
      label: 'Kopfreibwert mu_K', group: 'Anziehen', type: 'number', unit: '-',
      min: 0.01, max: 0.6, warnMin: 0.04, warnMax: 0.30, decimals: 3, diagram: 'reibung',
      help: 'Reibungszahl unter dem Schraubenkopf bzw. der Mutter. Meist aehnlich wie mu_G. Geht nur in das Anziehdrehmoment ein, nicht in die Schraubenbeanspruchung.'
    },
    tightening: {
      label: 'Anziehverfahren', group: 'Anziehen', type: 'enum', enumOf: 'tightening', diagram: 'anziehen',
      help: 'Wie wird angezogen? Bestimmt den Anziehfaktor alpha_A (Streuung der Vorspannkraft). Drehmomentschluessel = mittlere Streuung. Drehwinkel-/streckgrenzgesteuert = geringe Streuung. Schlagschrauber = hohe Streuung. Alternativ alpha_A direkt angeben.'
    },
    alphaA: {
      label: 'Anziehfaktor alpha_A', group: 'Anziehen', type: 'number', unit: '-',
      min: 1.0, max: 4.0, warnMax: 2.5, decimals: 2, advanced: true, diagram: 'anziehen',
      help: 'Verhaeltnis maximale/minimale Montagevorspannkraft (Streuung). 1,0 = ideal ohne Streuung (theoretisch). Drehmomentgesteuert ca. 1,4-1,6, Schlagschrauber bis 2,5 und mehr. Ueberschreibt das Anziehverfahren, wenn gesetzt.'
    },

    /* --- Verbindung & Geometrie --- */
    connection: {
      label: 'Verbindungsart', group: 'Geometrie', type: 'enum', enumOf: 'connection', diagram: 'verbindung',
      help: 'DSV = Durchsteckschraube mit Mutter (Schraube geht durch alle Teile). ESV = Einschraubverbindung, die Schraube greift in ein Sacklochgewinde im untersten Teil. Beeinflusst den Verformungskegel und die Nachgiebigkeit.'
    },
    l_K: {
      label: 'Klemmlaenge l_K', group: 'Geometrie', type: 'number', unit: 'mm', required: true,
      min: 0.1, max: 2000, diagram: 'klemmlaenge',
      help: 'Gesamte Dicke der verspannten Teile zwischen Kopfauflage und Mutter bzw. Einschraubebene. Das ist die Strecke, die beim Anziehen zusammengedrueckt wird.'
    },
    d_w: {
      label: 'Kopfauflage d_w', group: 'Geometrie', type: 'number', unit: 'mm', required: true,
      min: 0.1, max: 500, diagram: 'kopfauflage',
      help: 'Wirksamer Auflagedurchmesser unter dem Schraubenkopf (aussen). Naeherung: Schluesselweite des Kopfes. Fuer Sechskant rund 1,4-1,8 * Gewindedurchmesser. Muss groesser sein als die Bohrung d_h.'
    },
    d_h: {
      label: 'Bohrung d_h', group: 'Geometrie', type: 'number', unit: 'mm', required: true,
      min: 0.1, max: 500, diagram: 'bohrung',
      help: 'Durchmesser des Durchgangslochs in den verspannten Teilen. Ueblich etwa 1,05-1,15 * Gewindedurchmesser (Spiel). Muss kleiner als die Kopfauflage d_w und kleiner als der Aussendurchmesser D_A sein.'
    },
    D_A: {
      label: 'Aussendurchmesser D_A', group: 'Geometrie', type: 'number', unit: 'mm', required: true,
      min: 0.1, max: 3000, diagram: 'aussen',
      help: 'Aussendurchmesser des verspannten Materials um die Schraube herum (bzw. Ersatzdurchmesser bei Mehrschraubenverbindungen). Ist D_A kleiner/gleich d_w, wird mit einer Huelse gerechnet, sonst mit dem Verformungskegel.'
    },
    E_P: {
      label: 'E-Modul verspannte Teile', group: 'Geometrie', type: 'number', unit: 'N/mm^2', required: true,
      min: 10000, max: 250000, warnMin: 40000, warnMax: 215000, diagram: null,
      help: 'Elastizitaetsmodul des verspannten Werkstoffs. Stahl ca. 210 000, Aluminium ca. 70 000, Grauguss ca. 110 000 N/mm^2. Bestimmt, wie stark sich die Teile zusammendruecken lassen.'
    },
    lShank: {
      label: 'Schaftlaenge (glatt) l_Schaft', group: 'Geometrie', type: 'number', unit: 'mm', required: true,
      min: 0, max: 2000, advanced: true, diagram: 'schaft',
      help: 'Laenge des glatten (ungeschnittenen) Schraubenschafts innerhalb der Klemmlaenge. Bei voll gewindeten Schrauben 0. Schaft + freies Gewinde ergeben zusammen ungefaehr die Klemmlaenge.'
    },
    lThreadFree: {
      label: 'freies Gewinde l_Gew', group: 'Geometrie', type: 'number', unit: 'mm', required: true,
      min: 0, max: 2000, advanced: true, diagram: 'schaft',
      help: 'Laenge des freiliegenden Gewindes innerhalb der Klemmlaenge (nicht eingeschraubt, nicht im Schaft). Traegt im duenneren Kernquerschnitt zur Nachgiebigkeit bei.'
    },
    l_SK: {
      label: 'Ersatzlaenge Kopf l_SK', group: 'Geometrie', type: 'number', unit: 'mm',
      min: 0, max: 200, advanced: true, diagram: 'kopf',
      help: 'Ersatzlaenge fuer die Nachgiebigkeit des Schraubenkopfes. Richtwert 0,5 * d bei Sechskant, 0,4 * d bei Innensechskant. Wird automatisch gesetzt, wenn leer.'
    },
    l_G: {
      label: 'Ersatzlaenge eingeschr. Gewinde l_G', group: 'Geometrie', type: 'number', unit: 'mm',
      min: 0, max: 200, advanced: true, diagram: null,
      help: 'Ersatzlaenge fuer das tragende eingeschraubte Gewinde. Richtwert 0,5 * d. Wird automatisch gesetzt, wenn leer.'
    },
    l_M: {
      label: 'Ersatzlaenge Mutter/Einschraubteil l_M', group: 'Geometrie', type: 'number', unit: 'mm',
      min: 0, max: 200, advanced: true, diagram: null,
      help: 'Ersatzlaenge fuer Mutter (DSV, Richtwert 0,4 * d) bzw. Einschraubteil (ESV, Richtwert 0,33 * d). Wird automatisch gesetzt, wenn leer.'
    },

    /* --- Belastung --- */
    F_Kerf: {
      label: 'erforderliche Klemmkraft F_Kerf', group: 'Belastung', type: 'number', unit: 'N', required: true,
      min: 0, max: 1e8, diagram: 'klemmkraft',
      help: 'Mindest-Restklemmkraft, die in der Trennfuge erhalten bleiben muss — z. B. zum Abdichten, gegen Abheben oder fuer den Reibschluss bei Querkraft. Bestimmt mit, wie hoch vorgespannt werden muss.'
    },
    F_A: {
      label: 'axiale Betriebskraft F_A', group: 'Belastung', type: 'number', unit: 'N',
      min: 0, max: 1e8, diagram: 'axiallast',
      help: 'In Schraubenrichtung wirkende Betriebskraft (Zug), die die Verbindung auseinanderziehen will. Bei schwellender Last hier die Oberlast oder F_Ao/F_Au angeben.'
    },
    F_Ao: {
      label: 'Axiallast Oberwert F_Ao', group: 'Belastung', type: 'number', unit: 'N',
      min: 0, max: 1e8, diagram: 'axiallast',
      help: 'Groesster Wert der schwankenden Axialkraft (fuer den Dauerfestigkeitsnachweis). Bei reiner Schwellast ist F_Au = 0.'
    },
    F_Au: {
      label: 'Axiallast Unterwert F_Au', group: 'Belastung', type: 'number', unit: 'N',
      max: 1e8, diagram: 'axiallast',
      help: 'Kleinster Wert der schwankenden Axialkraft. 0 bei reiner Schwellast. Negative Werte (Wechsellast) sind moeglich, muessen aber kleiner als F_Ao sein.'
    },
    F_Qmax: {
      label: 'Querkraft F_Qmax', group: 'Belastung', type: 'number', unit: 'N',
      min: 0, max: 1e8, diagram: 'querkraft',
      help: 'Quer zur Schraubenachse wirkende Kraft, die ueber Reibung in der Trennfuge uebertragen wird. Erfordert ausreichende Klemmkraft (Gleitnachweis).'
    },
    muT: {
      label: 'Reibwert Trennfuge mu_T', group: 'Belastung', type: 'number', unit: '-',
      min: 0.01, max: 0.8, warnMin: 0.05, warnMax: 0.30, decimals: 3, diagram: 'querkraft',
      help: 'Haftreibungszahl zwischen den verspannten Teilen (nur fuer Querkraft/Gleitnachweis). Trocken Stahl/Stahl ca. 0,1-0,2; geoelt weniger. Konservativ klein waehlen.'
    },
    qF: {
      label: 'Zahl der Trennfugen q_F', group: 'Belastung', type: 'number', unit: '-',
      min: 1, max: 20, warnMax: 10, decimals: 0, advanced: true, diagram: null,
      help: 'Anzahl der kraftuebertragenden Trennfugen fuer die Querkraft. Bei zwei verspannten Teilen meist 1.'
    },
    n: {
      label: 'Krafteinleitungsfaktor n', group: 'Belastung', type: 'number', unit: '-',
      min: 0, max: 1, decimals: 2, diagram: 'krafteinleitung',
      help: 'Gibt an, wie weit innerhalb der Klemmteile die Betriebskraft eingeleitet wird (0 = direkt an der Trennfuge, 1 = unter Kopf/Mutter). Unguenstig und sicher: 0,5. Genauere Werte nach VDI 2230 Bild/Tabelle.'
    },
    p_G: {
      label: 'Grenzflaechenpressung p_G', group: 'Belastung', type: 'number', unit: 'N/mm^2',
      min: 1, max: 5000, diagram: 'pressung',
      help: 'Zulaessige Flaechenpressung des verspannten Werkstoffs unter Kopf/Mutter. Wird ueberschritten, gibt das Material nach (Setzen, Vorspannverlust). Werte je Werkstoff aus Tabelle waehlen.'
    },
    deltaFvth: {
      label: 'thermischer Vorspannverlust dF_Vth', group: 'Belastung', type: 'number', unit: 'N',
      max: 1e8, advanced: true, diagram: null,
      help: 'Vorspannkraftaenderung durch Temperatur (unterschiedliche Waermedehnung von Schraube und Teilen). 0, wenn ohne Temperatureinfluss gerechnet wird.'
    },
    kTau: {
      label: 'Torsions-Restfaktor k_tau', group: 'Belastung', type: 'number', unit: '-',
      min: 0, max: 1, decimals: 2, advanced: true, diagram: null,
      help: 'Anteil der Torsionsspannung, der im Betrieb noch wirkt (beim Anziehen 1, baut sich teilweise ab). Ueblich 0,5 fuer den Betriebsnachweis.'
    },

    /* --- Setzen / Trennflaechen --- */
    rz: {
      label: 'Rautiefe Rz (Trennflaechen)', group: 'Setzen', type: 'enum', enumOf: 'rz', required: true, diagram: 'rauheit',
      help: 'Rauheit der aufeinanderliegenden Flaechen (Gewinde, Kopf-/Mutterauflage, Trennfugen). Rauere Flaechen setzen sich staerker und verlieren mehr Vorspannung. Im Zweifel mittlere Stufe (Rz10-40).'
    },
    loadMode: {
      label: 'Lastart fuer Setzen', group: 'Setzen', type: 'enum', enumOf: 'loadMode', diagram: null,
      help: 'Axial = vorwiegend Zug/Druck laengs der Schraube; Schub = vorwiegend Querbelastung. Beeinflusst die angesetzten Setzbetraege.'
    },
    seats: {
      label: 'Zahl der Auflagen (Kopf/Mutter)', group: 'Setzen', type: 'number', unit: '-', required: true,
      min: 1, max: 10, decimals: 0, diagram: null,
      help: 'Anzahl der Kopf- und Mutternauflageflaechen, die sich setzen koennen. Bei einer normalen Verschraubung meist 2 (Kopf und Mutter) bzw. 1 bei Einschraubverbindung.'
    },
    interfaces: {
      label: 'Zahl der inneren Trennfugen', group: 'Setzen', type: 'number', unit: '-', required: true,
      min: 0, max: 20, decimals: 0, diagram: null,
      help: 'Anzahl der Beruehrungsflaechen zwischen den verspannten Teilen (ohne Kopf/Mutter). Bei zwei Teilen 1.'
    }
  };

  function fieldHelp(name) { return (FIELDS[name] && FIELDS[name].help) || ''; }

  /* ----------------------------------------------------------- Pruefung ---- */
  function validateInput(inp) {
    inp = inp || {};
    var errors = [], warnings = [];
    function err(field, code, text, range) { errors.push({ field: field, severity: 'error', code: code, text: text, range: range || null }); }
    function warn(field, code, text, range) { warnings.push({ field: field, severity: 'warning', code: code, text: text, range: range || null }); }
    function present(v) { return v !== undefined && v !== null && v !== ''; }

    /* 1) Generische Feldpruefung nach Schema */
    for (var key in FIELDS) {
      if (!FIELDS.hasOwnProperty(key)) continue;
      var f = FIELDS[key], v = inp[key];
      if (!present(v)) {
        if (f.required) err(key, 'REQUIRED', f.label + ' fehlt (Pflichtfeld).');
        continue;
      }
      if (f.type === 'enum') {
        var opts = enumValues(f.enumOf);
        if (opts.indexOf(v) < 0) err(key, 'ENUM_INVALID', f.label + ': "' + v + '" ist nicht zulaessig. Erlaubt: ' + opts.join(', ') + '.', opts);
        continue;
      }
      // number
      if (!num(v)) { err(key, 'NOT_A_NUMBER', f.label + ' muss eine Zahl sein (eingegeben: "' + v + '").'); continue; }
      var u = f.unit ? (' ' + f.unit) : '';
      var inHard = true;
      if (f.min != null && v < f.min) { err(key, 'BELOW_MIN', f.label + ' = ' + v + u + ' ist zu klein. Zulaessig: >= ' + f.min + '.', [f.min, (f.max != null ? f.max : null)]); inHard = false; }
      if (f.max != null && v > f.max) { err(key, 'ABOVE_MAX', f.label + ' = ' + v + u + ' ist zu gross. Zulaessig: <= ' + f.max + '.', [(f.min != null ? f.min : null), f.max]); inHard = false; }
      if (inHard) {
        if (f.warnMin != null && v < f.warnMin) warn(key, 'BELOW_TYPICAL', f.label + ' = ' + v + u + ' liegt unter dem ueblichen Bereich (' + f.warnMin + (f.warnMax != null ? '..' + f.warnMax : '') + '). Bitte pruefen.', [f.warnMin, (f.warnMax != null ? f.warnMax : null)]);
        else if (f.warnMax != null && v > f.warnMax) warn(key, 'ABOVE_TYPICAL', f.label + ' = ' + v + u + ' liegt ueber dem ueblichen Bereich (' + (f.warnMin != null ? f.warnMin + '..' : '') + f.warnMax + '). Bitte pruefen.', [(f.warnMin != null ? f.warnMin : null), f.warnMax]);
      }
    }

    /* 2) Entweder-oder: Reibung und Anziehfaktor */
    if (!present(inp.frictionClass) && !num(inp.muG)) err('frictionClass', 'FRICTION_MISSING', 'Reibung fehlt: entweder eine Reibungsklasse waehlen oder den Gewindereibwert mu_G angeben.');
    if (!present(inp.tightening) && !num(inp.alphaA)) err('tightening', 'TIGHTENING_MISSING', 'Anziehverfahren fehlt: entweder ein Verfahren waehlen oder den Anziehfaktor alpha_A angeben.');

    /* 3) Geometrie-Querbeziehungen (harte Fehler) */
    if (num(inp.d_w) && num(inp.d_h) && inp.d_h >= inp.d_w) err('d_h', 'D_H_GE_D_W', 'Bohrung d_h = ' + inp.d_h + ' mm ist groesser/gleich der Kopfauflage d_w = ' + inp.d_w + ' mm. d_h muss kleiner als d_w sein (ueblich d_h ~ 1,05..1,15 * d).');
    if (num(inp.D_A) && num(inp.d_h) && inp.D_A <= inp.d_h) err('D_A', 'DA_LE_D_H', 'Aussendurchmesser D_A = ' + inp.D_A + ' mm ist kleiner/gleich der Bohrung d_h = ' + inp.d_h + ' mm. D_A muss groesser als d_h sein.');
    if (num(inp.d) && num(inp.P)) {
      var d3 = inp.d - DATA.THREAD_CONST.c_d3 * inp.P;
      if (d3 <= 0) err('P', 'PITCH_TOO_LARGE', 'Steigung P = ' + inp.P + ' mm ist zu gross fuer d = ' + inp.d + ' mm (Kerndurchmesser waere <= 0).');
    }
    if (num(inp.F_Ao) && num(inp.F_Au) && inp.F_Ao < inp.F_Au) err('F_Au', 'FAO_LT_FAU', 'Oberlast F_Ao = ' + inp.F_Ao + ' N ist kleiner als die Unterlast F_Au = ' + inp.F_Au + ' N. F_Ao muss >= F_Au sein.');

    /* size-bezogene Plausibilitaet (Warnungen, fangen Tippfehler ab) */
    var dNom = (inp.size && DATA.THREADS[inp.size]) ? DATA.THREADS[inp.size].d : (num(inp.d) ? inp.d : null);
    if (dNom) {
      if (num(inp.d_h) && inp.d_h < dNom) warn('d_h', 'D_H_LT_D', 'Bohrung d_h = ' + inp.d_h + ' mm ist kleiner als der Gewindedurchmesser d = ' + dNom + ' mm. Ueblich ist ein Durchgangsloch d_h ~ 1,05..1,15 * d.');
      if (num(inp.d_w)) { var rw = inp.d_w / dNom; if (rw < 1.3 || rw > 2.1) warn('d_w', 'D_W_RATIO', 'Verhaeltnis Kopfauflage/Gewinde d_w/d = ' + rw.toFixed(2) + ' ist untypisch (ueblich ~1,4..1,8). Bitte d_w pruefen.', [1.3, 2.1]); }
    }

    /* 4) Geltungsbereich der empirischen Kegelwinkelformel (Warnungen) */
    if (num(inp.l_K) && num(inp.d_w) && inp.d_w > 0) {
      var betaL = inp.l_K / inp.d_w;
      if (betaL > 8 || betaL < 0.3) warn('l_K', 'CONE_BETAL_RANGE', 'Verhaeltnis l_K/d_w = ' + betaL.toFixed(2) + ' liegt ausserhalb des abgesicherten Bereichs der empirischen Kegelwinkelformel (Richtwert ~0,3..8). Das Ergebnis fuer delta_P ist dort eine Extrapolation.', [0.3, 8]);
    }
    if (num(inp.D_A) && num(inp.d_w) && inp.d_w > 0 && inp.D_A > inp.d_w) {
      var y = inp.D_A / inp.d_w;
      if (y > 8) warn('D_A', 'CONE_Y_RANGE', 'Verhaeltnis D_A/d_w = ' + y.toFixed(2) + ' ist sehr gross; die empirische Kegelwinkelformel ist dort nicht mehr abgesichert (Richtwert <= ~8). delta_P wird extrapoliert.', [1, 8]);
    }

    /* 5) Festigkeitsklasse ausserhalb VDI-Hauptgeltungsbereich (Warnung) */
    if (present(inp.strengthClass) && enumValues('strengthClass').indexOf(inp.strengthClass) >= 0 &&
        ['8.8', '9.8', '10.9', '12.9'].indexOf(inp.strengthClass) < 0) {
      warn('strengthClass', 'STRENGTH_SCOPE', 'Festigkeitsklasse ' + inp.strengthClass + ' liegt ausserhalb des Hauptgeltungsbereichs der VDI 2230 (8.8 bis 12.9). Die Nachweise sind fuer hochfeste Schrauben formuliert.');
    }

    return { ok: errors.length === 0, errors: errors, warnings: warnings };
  }

  return {
    FIELDS: FIELDS,
    enumValues: enumValues,
    fieldOptions: fieldOptions,
    fieldHelp: fieldHelp,
    validateInput: validateInput
  };
});
