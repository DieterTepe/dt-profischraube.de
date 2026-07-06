/* ============================================================================
 * DT-ProfiSchraube · report.js  (Bericht-Export: RTF + CSV)
 * ----------------------------------------------------------------------------
 * Ausgabe/Bericht Schritt B (v4.9.1). Reine String-Erzeugung, keine Bibliothek,
 * voll offline und in Node testbar (UMD). Kein DOM.
 *
 *   REPORT.buildRTF(ctx) -> RTF-String  (öffnet in Word/LibreOffice)
 *   REPORT.buildCSV(ctx) -> CSV-String  (für Excel/Tabellenkalkulation)
 *   REPORT.buildModel(ctx) -> reines Datenmodell (Grundlage beider + testbar)
 *
 * ctx = {
 *   R,            // Ergebnisobjekt aus solver.computeJoint (status 'ok')
 *   input,        // Eingaben (collectInputs) — für die Eingaben-Tabelle
 *   lang,         // 'de' | 'en' | 'pt'
 *   label,        // Bezeichnung der Berechnung (frei)
 *   date,         // Date-Objekt (Berichtsdatum)
 *   engine,       // Engine-Version (SOLVER.VERSION)
 *   verdictLevel, // 'ok'|'warn'|'bad'  (aus ui.overallVerdict — EINZIGE Quelle)
 *   verdictText,  // fertige Ampel-Hauptzeile (aus dem UI, konsistent zum Schirm)
 *   safetyRows,   // [{ key, label, val, status }]  status: 'ok'|'warn'|'bad'|'nb'
 *   steps         // Rechenweg-Schritte (rechenweg.build(...).steps)
 * }
 *
 * Arbeitsteilung (bewusst, keine Duplikation):
 *   – Ampel-Logik + -Texte: ui.js (Schritt A) ist alleinige Quelle; hier nur Konsum.
 *   – Feld-Labels/Einheiten der Eingaben: validate.js FIELDS (single source).
 *   – Report-eigene Überschriften/Spaltenköpfe/Disclaimer/Kennwert-Labels: hier.
 *   – Bewusst OHNE Schaubild (kommt über Druck→PDF bzw. später PNG).
 * ==========================================================================*/
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(require('./validate.js')); }
  else { root.DTSReport = factory(root.DTSValidate); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (VALID) {
  'use strict';

  var VERSION = '1.0.0-report';

  /* ---- dreisprachige Report-Texte (report-spezifisch, im UI nicht vorhanden) */
  var T = {
    appTitle:  { de: 'DT-ProfiSchraube', en: 'DT-ProfiSchraube', pt: 'DT-ProfiSchraube' },
    subtitle:  { de: 'Berechnungsbericht — Schraubenverbindung nach VDI 2230', en: 'Calculation report — bolted joint per VDI 2230', pt: 'Relatório de cálculo — junção aparafusada conforme VDI 2230' },
    norm:      { de: 'Norm: VDI 2230 Blatt 1', en: 'Standard: VDI 2230 Part 1', pt: 'Norma: VDI 2230 Parte 1' },
    labelCap:  { de: 'Bezeichnung', en: 'Designation', pt: 'Designação' },
    dateCap:   { de: 'Datum', en: 'Date', pt: 'Data' },
    engineCap: { de: 'Rechenkern', en: 'Engine', pt: 'Motor de cálculo' },
    secVerdict:{ de: 'Gesamtergebnis', en: 'Overall result', pt: 'Resultado geral' },
    secSafety: { de: 'Sicherheiten', en: 'Safety factors', pt: 'Fatores de segurança' },
    secInput:  { de: 'Eingaben', en: 'Inputs', pt: 'Dados de entrada' },
    secKeyval: { de: 'Kennwerte', en: 'Key values', pt: 'Valores característicos' },
    secWeg:    { de: 'Rechenweg', en: 'Calculation steps', pt: 'Memória de cálculo' },
    colCheck:  { de: 'Nachweis', en: 'Verification', pt: 'Verificação' },
    colValue:  { de: 'Wert', en: 'Value', pt: 'Valor' },
    colStatus: { de: 'Status', en: 'Status', pt: 'Estado' },
    colQty:    { de: 'Größe', en: 'Quantity', pt: 'Grandeza' },
    colUnit:   { de: 'Einheit', en: 'Unit', pt: 'Unidade' },
    stOk:      { de: 'erfüllt', en: 'met', pt: 'cumprido' },
    stWarn:    { de: 'knapp', en: 'marginal', pt: 'no limite' },
    stBad:     { de: 'nicht erfüllt', en: 'not met', pt: 'não cumprido' },
    stNb:      { de: 'nicht geführt', en: 'not performed', pt: 'não realizado' },
    disclaimer:{ de: 'Berechnung ohne Gewähr. Vor Produktivnutzung gegen die Originalnorm VDI 2230 prüfen. Dieses Dokument ersetzt keine fachtechnische Prüfung.',
                 en: 'Calculation without warranty. Verify against the original VDI 2230 standard before production use. This document does not replace expert review.',
                 pt: 'Cálculo sem garantia. Verifique com a norma original VDI 2230 antes de uso produtivo. Este documento não substitui uma análise técnica.' }
  };

  /* ---- Kernkennwerte für Kennwerte-Tabelle + CSV (report-spezifische Auswahl) */
  var KV = [
    { key: 'F_Mzul', get: function (R) { return R.F_Mzul; }, unit: 'N',   dec: 0, label: { de: 'Montagevorspannkraft F_Mzul (zulässig)', en: 'Assembly preload F_Mzul (permissible)', pt: 'Pré-tensão de montagem F_Mzul (admissível)' } },
    { key: 'F_Mmin', get: function (R) { return R.F_Mmin; }, unit: 'N',   dec: 0, label: { de: 'Montagevorspannkraft F_Mmin (min.)', en: 'Assembly preload F_Mmin (min.)', pt: 'Pré-tensão de montagem F_Mmin (mín.)' } },
    { key: 'F_Mmax', get: function (R) { return R.F_Mmax; }, unit: 'N',   dec: 0, label: { de: 'Montagevorspannkraft F_Mmax (max.)', en: 'Assembly preload F_Mmax (max.)', pt: 'Pré-tensão de montagem F_Mmax (máx.)' } },
    { key: 'M_A',    get: function (R) { return R.M_A; },    unit: 'Nmm', dec: 0, label: { de: 'Anziehdrehmoment M_A', en: 'Tightening torque M_A', pt: 'Torque de aperto M_A' } },
    { key: 'F_Smax', get: function (R) { return R.F_Smax; }, unit: 'N',   dec: 0, label: { de: 'maximale Schraubenkraft F_Smax', en: 'Maximum bolt force F_Smax', pt: 'Força máxima do parafuso F_Smax' } },
    { key: 'F_Z',    get: function (R) { return R.F_Z; },    unit: 'N',   dec: 0, label: { de: 'Vorspannkraftverlust F_Z (Setzen)', en: 'Preload loss F_Z (embedding)', pt: 'Perda de pré-tensão F_Z (assentamento)' } },
    { key: 'F_SA',   get: function (R) { return R.F_SA; },   unit: 'N',   dec: 0, label: { de: 'Schraubenzusatzkraft F_SA', en: 'Additional bolt force F_SA', pt: 'Força adicional no parafuso F_SA' } },
    { key: 'F_PA',   get: function (R) { return R.F_PA; },   unit: 'N',   dec: 0, label: { de: 'Plattenentlastung F_PA', en: 'Plate relief F_PA', pt: 'Alívio das peças F_PA' } },
    { key: 'PhiK',   get: function (R) { return R.PhiK; },   unit: '-',   dec: 4, label: { de: 'Kraftverhältnis Φ_K', en: 'Force ratio Φ_K', pt: 'Relação de forças Φ_K' } },
    { key: 'PhiEn',  get: function (R) { return R.PhiEn; },  unit: '-',   dec: 4, label: { de: 'Kraftverhältnis Φ_en', en: 'Force ratio Φ_en', pt: 'Relação de forças Φ_en' } }
  ];

  function pick(o, lang) { return (o && (o[lang] || o.de)) || ''; }

  /* ---- Testversion-Wasserzeichen (reine, testbare Logik; Zeichnen macht das UI) */
  var WATERMARK = {
    de: 'DT-ProfiSchraube – Testversion – nicht für Produktivnutzung',
    en: 'DT-ProfiSchraube – Test version – not for production use',
    pt: 'DT-ProfiSchraube – Versão de teste – não usar em produção'
  };
  function watermarkText(lang) { return pick(WATERMARK, lang); }
  // Wasserzeichen NUR in der Testversion. Fehlt/anders die Kennung → keine Marke
  // (sichere Voreinstellung: eine versehentlich unmarkierte Vollversion ist harmlos,
  //  eine versehentlich markierte Vollversion wäre peinlich).
  function shouldWatermark(edition) { return edition === 'test'; }

  /* Zahlenformat: EN mit Dezimalpunkt, DE/PT mit Dezimalkomma. */
  function num(x, lang, dec) {
    if (x == null || typeof x !== 'number' || !isFinite(x)) return '';
    var s = Number(x).toFixed(dec == null ? 2 : dec);
    if (lang !== 'en') s = s.replace('.', ',');
    return s;
  }

  /* Feld-Label + Einheit aus validate.FIELDS (single source). Fällt auf den
   * Schlüssel zurück, falls VALID/Feld fehlt (autarke Node-Tests). */
  function fieldMeta(key, lang) {
    var F = VALID && VALID.FIELDS && VALID.FIELDS[key];
    if (!F) return { label: key, unit: '' };
    return { label: pick(F.label, lang) || key, unit: F.unit || '' };
  }

  /* Enum-Wert lesbar machen (Dropdown-Label statt Rohwert), sonst Rohwert. */
  function inputDisplay(key, val, lang) {
    if (val == null) return '';
    var F = VALID && VALID.FIELDS && VALID.FIELDS[key];
    if (F && F.type === 'enum' && VALID.fieldOptions) {
      try {
        var opts = VALID.fieldOptions(key, lang);
        for (var i = 0; i < opts.length; i++) if (opts[i].value === val) return opts[i].label;
      } catch (e) { /* Fallback unten */ }
    }
    if (typeof val === 'boolean') return val ? '✓' : '–';
    if (typeof val === 'number') return num(val, lang, (Math.abs(val) >= 100 || val === Math.round(val)) ? 0 : 3);
    return String(val);
  }

  /* ---- reines Datenmodell (Grundlage für RTF + CSV; unabhängig testbar) ---- */
  function buildModel(ctx) {
    var lang = ctx.lang || 'de';
    var R = ctx.R || {};
    var input = ctx.input || {};
    var d = ctx.date instanceof Date ? ctx.date : new Date();

    // Datum lesbar (ISO-nah, sprachunabhängig eindeutig): YYYY-MM-DD HH:MM
    function p2(n) { return (n < 10 ? '0' : '') + n; }
    var dateStr = d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) +
      ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes());

    var header = {
      title: pick(T.appTitle, lang),
      subtitle: pick(T.subtitle, lang),
      norm: pick(T.norm, lang),
      label: ctx.label || '',
      date: dateStr,
      engine: ctx.engine || ''
    };

    // Sicherheiten (Labels/Status kommen aus ctx.safetyRows — UI ist die Quelle)
    var safeties = (ctx.safetyRows || []).map(function (r) {
      return { key: r.key, label: r.label || r.key, val: r.val, status: r.status };
    });

    // Eingaben: nur gesetzte Felder, in FIELDS-Reihenfolge sofern verfügbar
    var order = (VALID && VALID.FIELDS) ? Object.keys(VALID.FIELDS) : Object.keys(input);
    var seen = {};
    var inputs = [];
    order.forEach(function (k) {
      if (!(k in input) || input[k] == null || input[k] === '') return;
      seen[k] = true;
      var m = fieldMeta(k, lang);
      inputs.push({ key: k, label: m.label, val: inputDisplay(k, input[k], lang), unit: m.unit });
    });
    // etwaige Eingaben ohne FIELDS-Eintrag anhängen
    Object.keys(input).forEach(function (k) {
      if (seen[k] || input[k] == null || input[k] === '') return;
      inputs.push({ key: k, label: k, val: inputDisplay(k, input[k], lang), unit: '' });
    });

    // Kennwerte
    var keyvals = [];
    KV.forEach(function (kv) {
      var v = kv.get(R);
      if (v == null || typeof v !== 'number' || !isFinite(v)) return;
      keyvals.push({ key: kv.key, label: pick(kv.label, lang), val: num(v, lang, kv.dec), raw: v, unit: kv.unit, dec: kv.dec });
    });

    // Rechenweg (eingerückte Absätze): Titel + Formel + eingesetzte Werte + Ergebnis
    var steps = (ctx.steps || []).map(function (s) {
      return {
        phase: s.phase || '', title: s.title || '', formula: s.formula || '',
        sub: s.sub || '', result: s.result != null ? String(s.result) : '', ref: s.ref || ''
      };
    });

    return {
      lang: lang, header: header,
      verdict: { level: ctx.verdictLevel || 'ok', text: ctx.verdictText || '' },
      safeties: safeties, inputs: inputs, keyvals: keyvals, steps: steps,
      disclaimer: pick(T.disclaimer, lang)
    };
  }

  function statusText(st, lang) {
    return pick(st === 'ok' ? T.stOk : st === 'warn' ? T.stWarn : st === 'bad' ? T.stBad : T.stNb, lang);
  }

  /* ======================= CSV ============================================= */
  /* DE/PT: Trenner ';' + Dezimalkomma · EN: Trenner ',' + Dezimalpunkt.
   * Der gekoppelte Trenner verhindert Kollision mit dem Dezimalzeichen. */
  function csvSep(lang) { return lang === 'en' ? ',' : ';'; }
  function csvCell(s, sep) {
    s = (s == null) ? '' : String(s);
    if (s.indexOf(sep) >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function buildCSV(ctx) {
    var m = buildModel(ctx);
    var lang = m.lang, sep = csvSep(lang);
    var lines = [];
    function row() { var a = Array.prototype.slice.call(arguments); lines.push(a.map(function (c) { return csvCell(c, sep); }).join(sep)); }

    row(pick(T.labelCap, lang), m.header.label);
    row(pick(T.dateCap, lang), m.header.date);
    row(pick(T.engineCap, lang), m.header.engine);
    row(pick(T.norm, lang));
    row('');
    row(pick(T.secVerdict, lang), m.verdict.text);
    row('');
    // Sicherheiten
    row(pick(T.secSafety, lang));
    row(pick(T.colCheck, lang), pick(T.colValue, lang), pick(T.colStatus, lang));
    m.safeties.forEach(function (s) {
      row(s.key + ' ' + s.label, (s.status === 'nb' ? '' : num(s.val, lang, 2)), statusText(s.status, lang));
    });
    row('');
    // Kennwerte
    row(pick(T.secKeyval, lang));
    row(pick(T.colQty, lang), pick(T.colValue, lang), pick(T.colUnit, lang));
    m.keyvals.forEach(function (k) { row(k.label, k.val, k.unit); });

    return lines.join('\r\n') + '\r\n';
  }

  /* ======================= RTF ============================================= */
  /* RTF-Escaping inkl. Unicode (\uN? — deckt Umlaute/PT-Akzente/µ/Φ/… ab). */
  function rtfEsc(s) {
    s = (s == null) ? '' : String(s);
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s[i], c = s.charCodeAt(i);
      if (ch === '\\' || ch === '{' || ch === '}') out += '\\' + ch;
      else if (ch === '\n') out += '\\par ';
      else if (c > 127) out += '\\u' + c + '?';
      else out += ch;
    }
    return out;
  }
  function rtfPar(s, extra) { return '\\pard' + (extra || '') + '\\sa60 ' + rtfEsc(s) + '\\par\n'; }
  function rtfHeading(s) { return '\\pard\\sb180\\sa80\\b\\fs28 ' + rtfEsc(s) + '\\b0\\fs22\\par\n'; }

  // Einfache RTF-Tabelle aus rows (Array von Zell-Arrays); widths in twips (kumulativ).
  function rtfTable(rows, widths, headerFirst) {
    var out = '';
    for (var r = 0; r < rows.length; r++) {
      out += '\\trowd\\trgaph80';
      var acc = 0;
      for (var c = 0; c < widths.length; c++) { acc += widths[c]; out += '\\cellx' + acc; }
      var bold = (headerFirst && r === 0);
      for (var c2 = 0; c2 < rows[r].length; c2++) {
        out += '\\pard\\intbl' + (bold ? '\\b ' : ' ') + rtfEsc(rows[r][c2]) + (bold ? '\\b0' : '') + '\\cell';
      }
      out += '\\row\n';
    }
    return out + '\\pard\\sa60\n';
  }

  function buildRTF(ctx) {
    var m = buildModel(ctx);
    var lang = m.lang;
    var out = '{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0 Segoe UI;}{\\f1 Consolas;}}\n';
    out += '\\viewkind4\\uc1\\f0\\fs22\n';

    // Kopf
    out += '\\pard\\sa40\\b\\fs36 ' + rtfEsc(m.header.title) + '\\b0\\fs22\\par\n';
    out += rtfPar(m.header.subtitle);
    out += rtfPar(m.header.norm);
    if (m.header.label) out += rtfPar(pick(T.labelCap, lang) + ': ' + m.header.label);
    out += rtfPar(pick(T.dateCap, lang) + ': ' + m.header.date + '    ' + pick(T.engineCap, lang) + ': ' + m.header.engine);

    // Gesamtergebnis (Ampel-Hauptzeile aus dem UI, hervorgehoben)
    out += rtfHeading(pick(T.secVerdict, lang));
    out += '\\pard\\sa80\\b\\fs24 ' + rtfEsc(m.verdict.text) + '\\b0\\fs22\\par\n';

    // Sicherheiten-Tabelle
    out += rtfHeading(pick(T.secSafety, lang));
    var sRows = [[pick(T.colCheck, lang), pick(T.colValue, lang), pick(T.colStatus, lang)]];
    m.safeties.forEach(function (s) {
      sRows.push([s.key + '  ' + s.label, (s.status === 'nb' ? '—' : num(s.val, lang, 2)), statusText(s.status, lang)]);
    });
    out += rtfTable(sRows, [5200, 1600, 2000], true);

    // Eingaben-Tabelle
    out += rtfHeading(pick(T.secInput, lang));
    var iRows = [[pick(T.colQty, lang), pick(T.colValue, lang), pick(T.colUnit, lang)]];
    m.inputs.forEach(function (it) { iRows.push([it.label, it.val, it.unit]); });
    out += rtfTable(iRows, [5200, 2200, 1400], true);

    // Kennwerte-Tabelle
    out += rtfHeading(pick(T.secKeyval, lang));
    var kRows = [[pick(T.colQty, lang), pick(T.colValue, lang), pick(T.colUnit, lang)]];
    m.keyvals.forEach(function (k) { kRows.push([k.label, k.val, k.unit]); });
    out += rtfTable(kRows, [5200, 2200, 1400], true);

    // Rechenweg (eingerückte Absätze)
    out += rtfHeading(pick(T.secWeg, lang));
    m.steps.forEach(function (st) {
      var head = (st.phase ? st.phase + ' · ' : '') + st.title;
      out += '\\pard\\sb80\\sa20\\b ' + rtfEsc(head) + '\\b0\\par\n';
      if (st.formula) out += '\\pard\\li360\\sa20\\f1 ' + rtfEsc(st.formula) + '\\f0\\par\n';
      if (st.sub) out += '\\pard\\li360\\sa20\\f1 ' + rtfEsc(st.sub) + '\\f0\\par\n';
      if (st.result) out += '\\pard\\li360\\sa40\\b = ' + rtfEsc(st.result) + '\\b0' + (st.ref ? '\\i    (' + rtfEsc(st.ref) + ')\\i0' : '') + '\\par\n';
    });

    // Haftungsausschluss
    out += rtfHeading('');
    out += '\\pard\\sb120\\brdrt\\brdrs\\brdrw10\\brsp80\\fs18 ' + rtfEsc(m.disclaimer) + '\\fs22\\par\n';

    out += '}';
    return out;
  }

  return { VERSION: VERSION, buildModel: buildModel, buildRTF: buildRTF, buildCSV: buildCSV, watermarkText: watermarkText, shouldWatermark: shouldWatermark };
});
