/* ============================================================================
 * DT-ProfiSchraube · ui.js
 * Bindeglied zwischen Engine (daten/validate/solver) und Oberflaeche.
 * - Formular wird vollstaendig aus dem FIELDS-Schema erzeugt
 * - Auswahllisten aus fieldOptions, Hilfe-Overlay aus fieldHelp
 * - Live-Pruefung ueber validateInput (Fehler blockieren, Warnungen weisen hin)
 * - "Beispiel laden" aus listPresets, Berechnen ueber computeJoint
 * - Bedien-Oberflaeche DE/EN/PT; Hell/Dunkel; alles offline (globale Objekte)
 * Feldbeschriftungen, Hilfe, Auswahl-Hinweise und Pruefmeldungen sind
 * dreisprachig (DE/EN/PT); ein Sprachwechsel baut das Formular neu auf.
 * ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------ .dt-Dateiformat (rein) */
  /* Speichern/Laden von Berechnungen (Baustein 1, v4.4-Serie):
   * NUR Eingaben + Kopf als JSON — Ergebnisse werden beim Laden frisch
   * gerechnet (robust gegen Versionswechsel). Reine Funktionen ohne DOM,
   * damit test_solver.js den echten Round-Trip prueft (kein Duplikat). */
  var DT_APP = 'DT-ProfiSchraube';
  function dtSerialize(input, label, version) {
    return JSON.stringify({
      app: DT_APP,
      version: String(version || ''),
      created: new Date().toISOString(),
      label: String(label || ''),
      input: input
    }, null, 2);
  }
  function dtParse(text) {
    var obj;
    try { obj = JSON.parse(String(text)); }
    catch (e) { return { ok: false, code: 'DT_PARSE' }; }
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, code: 'DT_FORMAT' };
    if (obj.app !== DT_APP) return { ok: false, code: 'DT_FORMAT' };
    if (!obj.input || typeof obj.input !== 'object' || Array.isArray(obj.input)) return { ok: false, code: 'DT_FORMAT' };
    return { ok: true, payload: obj };
  }
  function dtFileName(label, date) {
    var d = (date instanceof Date) ? date : new Date();
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var iso = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    var add = String(label || '').trim().replace(/[^\wäöüÄÖÜß.-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
    return 'Berechnung_' + iso + (add ? '_' + add : '') + '.dt';
  }
  /* Node (Testharness): nur die reinen Helfer exportieren, kein DOM-Code. */
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { dtSerialize: dtSerialize, dtParse: dtParse, dtFileName: dtFileName, DT_APP: DT_APP };
  }
  if (typeof window === 'undefined') return;

  var DATA = window.DTSData, VALID = window.DTSValidate, SOLVER = window.DTSSolver;
  var RECHENWEG = window.DTSRechenweg || null;
  var SCHAUBILD = window.DTSSchaubild || null;
  if (!DATA || !VALID || !SOLVER) {
    document.getElementById('resultHost').innerHTML =
      '<div class="status-banner bad">Module nicht geladen (daten.js / validate.js / solver.js).</div>';
    return;
  }

  var FIELDS = VALID.FIELDS;

  /* ----------------------------------------------------------- i18n (Chrome) */
  var STR = {
    de: {
      tagline: 'Schraubenverbindung nach VDI 2230 Blatt 1', loadExample: 'Beispiel laden',
      calc: 'Berechnen', reset: 'Leeren', showAdvanced: 'Erweiterte Felder anzeigen',
      inputTitle: 'Eingabe', resultTitle: 'Ergebnis', vizTitle: 'Visualisierung',
      vizSoon: 'Verspannungsschaubild & Querschnitt', vizSoon2: 'Wird nach der Berechnung angezeigt.',
      resultIdle: 'Werte eingeben und „Berechnen" wählen.',
      footNote: 'Engine v0.8.0 · Berechnung ohne Gewähr, vor Produktivnutzung gegen die Originalnorm prüfen.',
      grp_Schraube: 'Schraube & Werkstoff', grp_Anziehen: 'Reibung & Anziehen', grp_Geometrie: 'Verbindung & Geometrie',
      grp_Belastung: 'Belastung', grp_Setzen: 'Setzen & Trennflächen', grp_Nachweise: 'Nachweise & Optionen',
      statusOk: 'Berechnung vollständig.', statusInvalid: 'Eingaben unvollständig oder ungültig — bitte korrigieren.',
      kvCaption: 'Weitere Kennwerte', kvEngage: 'R11 – Mindesteinschraubtiefe', recommended: 'empfohlen', nb: 'n. b.', customOpt: '— eigene Eingabe —', rmHintPrefix: 'Richtwert', rmHintCustom: 'eigener Wert',
      tagWarn: 'Grenze', tagAssume: 'Annahme', tagPending: 'offen', tagFix: 'Tipp',
      improveTitle: 'So wird die Ampel grün (Zielwert S ≥ 1,2):', improveCoupling: 'Danach die übrigen Nachweise erneut prüfen — die Sicherheiten hängen zusammen.',
      sub_F: 'Fließen (Streckgrenze)', sub_D: 'Dauerhaltbarkeit', sub_P: 'Flächenpressung', sub_G: 'Gleiten/Reibschluss', sub_A: 'Einschraubtiefe (R11)',
      na_D: 'keine Wechsel-/Schwelllast (F_Ao/F_Au)', na_P: 'keine Grenzpressung p_G angegeben', na_G: 'keine Querkraft (F_Q) — kein Gleitnachweis nötig', na_A: '„R11 prüfen" nicht aktiviert',
      thrNote: 'Ampel sind Richtwerte (grün ≥ 1,2 · gelb ≥ 1,0 · rot < 1,0). Die erforderliche Sicherheit hängt vom Anwendungsfall ab.',
      preloadOk: 'F_Mmax ≤ F_Mzul (Montagevorspannung zulässig)', preloadBad: 'F_Mmax > F_Mzul — Schraube/Klasse zu klein',
      options: 'Auswahlmöglichkeiten', allowed: 'Zulässig', usual: 'Üblich', close: 'Schließen', fieldsDe: 'Feldtexte derzeit nur auf Deutsch.', rechenwegTitle: 'Rechenweg', rwHint: 'Jeder Schritt: allgemeine Formel, eingesetzte Werte, Ergebnis.', rwVerified: 'gegen Engine geprüft',
      saveCalc: 'Speichern (.dt)', loadCalc: 'Laden (.dt)', dtLabelPh: 'Bezeichnung (optional)',
      dtSaved: 'Gespeichert als {name}', dtLoaded: 'Berechnung geladen — Ergebnis neu gerechnet.',
      dtLoadedVer: 'Datei aus Version {v} geladen — Eingaben übernommen, Ergebnis neu gerechnet. Bitte Werte kurz prüfen.',
      dtErrParse: 'Datei konnte nicht gelesen werden (kein gültiges JSON).', dtErrFormat: 'Keine gültige DT-ProfiSchraube-Datei (.dt).',
      thermalProv: 'aus Thermik-Assistent (ΔT)'
    },
    en: {
      tagline: 'Bolted joint to VDI 2230 Part 1', loadExample: 'Load example',
      calc: 'Calculate', reset: 'Clear', showAdvanced: 'Show advanced fields',
      inputTitle: 'Input', resultTitle: 'Result', vizTitle: 'Visualisation',
      vizSoon: 'Joint diagram & cross-section', vizSoon2: 'Shown after the calculation.',
      resultIdle: 'Enter values and choose “Calculate”.',
      footNote: 'Engine v0.8.0 · No warranty; verify against the original standard before production use.',
      grp_Schraube: 'Bolt & material', grp_Anziehen: 'Friction & tightening', grp_Geometrie: 'Joint & geometry',
      grp_Belastung: 'Loading', grp_Setzen: 'Embedding & interfaces', grp_Nachweise: 'Verifications & options',
      statusOk: 'Calculation complete.', statusInvalid: 'Input incomplete or invalid — please correct.',
      kvCaption: 'Further values', kvEngage: 'R11 – minimum length of engagement', recommended: 'recommended', nb: 'n/a', customOpt: '— custom input —', rmHintPrefix: 'Guide value', rmHintCustom: 'custom value',
      tagWarn: 'limit', tagAssume: 'assumption', tagPending: 'open', tagFix: 'tip',
      improveTitle: 'How to turn the indicator green (target S ≥ 1.2):', improveCoupling: 'Then re-check the other verifications — the safety factors are coupled.',
      sub_F: 'Yield', sub_D: 'Fatigue', sub_P: 'Surface pressure', sub_G: 'Slipping/friction grip', sub_A: 'Engagement (R11)',
      na_D: 'no fluctuating load (F_Ao/F_Au)', na_P: 'no limit pressure p_G given', na_G: 'no transverse force (F_Q) — no slip check needed', na_A: '“Check R11” not enabled',
      thrNote: 'Indicator colours are guide values (green ≥ 1.2 · amber ≥ 1.0 · red < 1.0). Required safety depends on the application.',
      preloadOk: 'F_Mmax ≤ F_Mzul (assembly preload admissible)', preloadBad: 'F_Mmax > F_Mzul — bolt/class too small',
      options: 'Options', allowed: 'Allowed', usual: 'Typical', close: 'Close', fieldsDe: 'Field texts are German for now.', rechenwegTitle: 'Calculation path', rwHint: 'Each step: general formula, inserted values, result.', rwVerified: 'checked against engine',
      saveCalc: 'Save (.dt)', loadCalc: 'Load (.dt)', dtLabelPh: 'Label (optional)',
      dtSaved: 'Saved as {name}', dtLoaded: 'Calculation loaded — result recomputed.',
      dtLoadedVer: 'File from version {v} loaded — inputs applied, result recomputed. Please review the values.',
      dtErrParse: 'File could not be read (not valid JSON).', dtErrFormat: 'Not a valid DT-ProfiSchraube file (.dt).',
      thermalProv: 'from thermal assistant (ΔT)'
    },
    pt: {
      tagline: 'União aparafusada conforme VDI 2230 Parte 1', loadExample: 'Carregar exemplo',
      calc: 'Calcular', reset: 'Limpar', showAdvanced: 'Mostrar campos avançados',
      inputTitle: 'Entrada', resultTitle: 'Resultado', vizTitle: 'Visualização',
      vizSoon: 'Diagrama de aperto e secção', vizSoon2: 'Apresentado após o cálculo.',
      resultIdle: 'Introduza valores e escolha “Calcular”.',
      footNote: 'Engine v0.8.0 · Sem garantia; verifique com a norma original antes de uso produtivo.',
      grp_Schraube: 'Parafuso e material', grp_Anziehen: 'Atrito e aperto', grp_Geometrie: 'União e geometria',
      grp_Belastung: 'Carregamento', grp_Setzen: 'Assentamento e interfaces', grp_Nachweise: 'Verificações e opções',
      statusOk: 'Cálculo completo.', statusInvalid: 'Entrada incompleta ou inválida — corrija.',
      kvCaption: 'Outros valores', kvEngage: 'R11 – profundidade mínima de aperto', recommended: 'recomendado', nb: 'n/d', customOpt: '— entrada própria —', rmHintPrefix: 'Valor indicativo', rmHintCustom: 'valor próprio',
      tagWarn: 'limite', tagAssume: 'suposição', tagPending: 'pendente', tagFix: 'dica',
      improveTitle: 'Como tornar o indicador verde (alvo S ≥ 1,2):', improveCoupling: 'Depois, reavalie as outras verificações — os fatores de segurança estão acoplados.',
      sub_F: 'Escoamento', sub_D: 'Fadiga', sub_P: 'Pressão superficial', sub_G: 'Escorregamento/atrito', sub_A: 'Aperto (R11)',
      na_D: 'sem carga alternada (F_Ao/F_Au)', na_P: 'sem pressão limite p_G', na_G: 'sem força transversal (F_Q) — sem verificação de escorregamento', na_A: '“Verificar R11” não ativado',
      thrNote: 'As cores são valores indicativos (verde ≥ 1,2 · amarelo ≥ 1,0 · vermelho < 1,0). A segurança exigida depende da aplicação.',
      preloadOk: 'F_Mmax ≤ F_Mzul (pré-tensão de montagem admissível)', preloadBad: 'F_Mmax > F_Mzul — parafuso/classe pequenos demais',
      options: 'Opções', allowed: 'Permitido', usual: 'Habitual', close: 'Fechar', fieldsDe: 'Os textos dos campos estão em alemão por agora.', rechenwegTitle: 'Percurso de cálculo', rwHint: 'Cada passo: fórmula geral, valores inseridos, resultado.', rwVerified: 'verificado com o motor',
      saveCalc: 'Guardar (.dt)', loadCalc: 'Carregar (.dt)', dtLabelPh: 'Designação (opcional)',
      dtSaved: 'Guardado como {name}', dtLoaded: 'Cálculo carregado — resultado recalculado.',
      dtLoadedVer: 'Ficheiro da versão {v} carregado — entradas aplicadas, resultado recalculado. Verifique os valores.',
      dtErrParse: 'Não foi possível ler o ficheiro (JSON inválido).', dtErrFormat: 'Ficheiro DT-ProfiSchraube (.dt) inválido.',
      thermalProv: 'do assistente térmico (ΔT)'
    }
  };
  var GROUP_ORDER = ['Schraube', 'Anziehen', 'Geometrie', 'Belastung', 'Setzen', 'Nachweise'];
  var lang = localStorage.getItem('dts-lang') || 'de';
  function t(k) { return (STR[lang] && STR[lang][k]) || STR.de[k] || k; }
  function locale() { return lang === 'en' ? 'en-US' : (lang === 'pt' ? 'pt-PT' : 'de-DE'); }

  /* --------------------------------------------------------------- Formatter */
  var SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  function sup(n) { return String(n).split('').map(function (c) { return SUP[c] || c; }).join(''); }
  function fmt(x, dec) {
    if (x == null || !isFinite(x)) return '–';
    return Number(x).toLocaleString(locale(), { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function fmtExp(x) {
    if (x == null || !isFinite(x)) return '–';
    var parts = Number(x).toExponential(3).split('e');
    var m = Number(parts[0]).toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 3 });
    return m + '·10' + sup(parseInt(parts[1], 10));
  }

  /* ------------------------------------------------------------- DOM-Helfer */
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function $(id) { return document.getElementById(id); }
  function L(f) { return (f && f.label && (f.label[lang] || f.label.de)) || ''; }
  function H(key) { var f = FIELDS[key]; return (f && f.help && (f.help[lang] || f.help.de)) || ''; }

  var fieldEls = {};   // key -> input/select Element
  var fieldRows = {};  // key -> .field Element
  var lastResult = null;
  var lastInputs = null;

  /* --------------------------------------------------------- Formular bauen */
  function buildForm() {
    var host = $('formHost'); host.innerHTML = '';
    GROUP_ORDER.forEach(function (grp, gi) {
      var keysInGroup = Object.keys(FIELDS).filter(function (k) { return FIELDS[k].group === grp; });
      if (!keysInGroup.length) return;
      var det = el('details', 'form-group'); if (gi < 3 || grp === 'Nachweise') det.open = true;
      var sum = el('summary');
      sum.appendChild(el('span', 'grp-num', 'R' + gi));
      var title = el('span', null); title.setAttribute('data-i18n', 'grp_' + grp); title.textContent = t('grp_' + grp);
      sum.appendChild(title);
      sum.appendChild(el('span', 'chev', '›'));
      det.appendChild(sum);

      var wrap = el('div', 'group-fields');
      keysInGroup.forEach(function (key) { wrap.appendChild(buildField(key)); });
      det.appendChild(wrap);
      host.appendChild(det);
    });
  }

  function buildField(key) {
    var f = FIELDS[key];
    var row = el('div', 'field' + (f.advanced ? ' adv' : ''));
    fieldRows[key] = row;

    var head = el('div', 'field-label');
    var lab = el('label');
    lab.setAttribute('for', 'f_' + key);
    lab.appendChild(document.createTextNode(L(f) + ' '));
    if (f.unit) { var u = el('span', 'unit', '[' + f.unit + ']'); lab.appendChild(u); }
    head.appendChild(lab);
    var hb = el('button', 'help-btn', 'i'); hb.type = 'button';
    hb.setAttribute('aria-label', (lang === 'de' ? 'Hilfe: ' : 'Help: ') + L(f));
    hb.addEventListener('click', function (ev) { ev.preventDefault(); ev.stopPropagation(); openHelp(key); });
    head.appendChild(hb);
    row.appendChild(head);

    var ctrl;
    if (f.type === 'enum') {
      ctrl = el('select'); ctrl.id = 'f_' + key;
      var opts = VALID.fieldOptions(f.enumOf, lang);
      if (!f.required) { ctrl.appendChild(new Option('—', '')); }
      opts.forEach(function (o) {
        var label = o.value + (o.recommended ? ' · ' + t('recommended') : '');
        var op = new Option(label, o.value);
        if (o.recommended) op.selected = true;
        ctrl.appendChild(op);
      });
    } else if (f.type === 'bool') {
      ctrl = el('input'); ctrl.id = 'f_' + key; ctrl.type = 'checkbox'; ctrl.className = 'chk';
    } else {
      ctrl = el('input'); ctrl.id = 'f_' + key; ctrl.type = 'number'; ctrl.className = 'num';
      ctrl.setAttribute('inputmode', 'decimal');
      if (f.decimals != null) ctrl.step = f.decimals === 0 ? '1' : String(Math.pow(10, -f.decimals));
      if (f.min != null) ctrl.min = f.min;
      var ph = []; if (f.warnMin != null || f.warnMax != null) ph.push('typ. ' + (f.warnMin != null ? f.warnMin : '') + (f.warnMax != null ? '…' + f.warnMax : ''));
      if (f.unit) ph.push(f.unit);
      ctrl.placeholder = ph.join('  ');
    }
    ctrl.addEventListener('input', function () { markCustomPreset(); liveValidate(); });
    ctrl.addEventListener('change', function () { liveValidate(); });
    fieldEls[key] = ctrl;
    row.appendChild(ctrl);

    row.appendChild(el('div', 'field-msg')); // Platz fuer Meldung
    if (f.type === 'number') { row.appendChild(el('div', 'field-hint')); } // dynamischer Hinweis (z. B. Richtwert)
    if (f.type === 'enum') {
      var rec = VALID.fieldOptions(f.enumOf, lang).filter(function (o) { return o.recommended; })[0];
      if (rec) { var r = el('div', 'field-rec', '★ ' + t('recommended') + ': ' + rec.value); row.appendChild(r); }
    }
    return row;
  }

  /* ----------------------------------------------------------- Hilfe-Overlay */
  function openHelp(key) {
    var f = FIELDS[key];
    $('modalTitle').textContent = L(f) + (f.unit ? '  [' + f.unit + ']' : '');
    var body = $('modalBody'); body.innerHTML = '';
    body.appendChild(el('p', null, H(key)));

    var range = '';
    if (f.type === 'number') {
      if (f.min != null || f.max != null) range += t('allowed') + ': ' + (f.min != null ? '≥ ' + f.min : '') + (f.min != null && f.max != null ? '  ·  ' : '') + (f.max != null ? '≤ ' + f.max : '');
      if (f.warnMin != null || f.warnMax != null) range += (range ? '\n' : '') + t('usual') + ': ' + (f.warnMin != null ? f.warnMin : '') + (f.warnMax != null ? '…' + f.warnMax : '') + (f.unit ? ' ' + f.unit : '');
    }
    if (range) { var rd = el('div', 'modal-range'); rd.style.whiteSpace = 'pre-line'; rd.textContent = range; body.appendChild(rd); }

    if (f.type === 'enum') {
      body.appendChild(el('div', null, t('options'))).style.cssText = 'font-size:12px;color:var(--faint);text-transform:uppercase;letter-spacing:.08em;margin:4px 0';
      var ul = el('ul', 'opt-list');
      VALID.fieldOptions(f.enumOf, lang).forEach(function (o) {
        var li = el('li');
        var b = el('b', null, o.value); li.appendChild(b);
        if (o.note) li.appendChild(document.createTextNode('  ' + o.note));
        if (o.recommended) li.appendChild(el('span', 'rec', '★ ' + t('recommended')));
        ul.appendChild(li);
      });
      body.appendChild(ul);
    }
    body.appendChild(el('div', 'modal-diagram-slot')); // spaeter: SVG-Skizze
    openModal();
  }
  /* Focus-Trap: Fokus beim Oeffnen in das Modal setzen, mit Tab im Modal halten,
   * beim Schliessen zum ausloesenden Element zurueckgeben (A11y, Bug C3). */
  var lastFocused = null;
  function focusable(container) {
    return Array.prototype.slice.call(container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(function (e) { return e.offsetParent !== null; });
  }
  function onModalKeydown(e) {
    if (e.key !== 'Tab') return;
    var m = $('modal'); if (!m || !m.classList.contains('open')) return;
    var items = focusable(m); if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function openModal() {
    lastFocused = (document.activeElement && document.activeElement.focus) ? document.activeElement : null;
    var m = $('modal'); if (!m) return;
    m.classList.add('open');
    m.addEventListener('keydown', onModalKeydown);
    var cb = $('modalClose'); if (cb) cb.focus();
  }
  function closeModal() {
    var m = $('modal'); if (!m) return;
    m.classList.remove('open');
    m.removeEventListener('keydown', onModalKeydown);
    if (lastFocused && lastFocused.focus) { lastFocused.focus(); lastFocused = null; }
  }

  function openInfo() {
    $('modalTitle').textContent = 'DT-ProfiSchraube';
    var b = $('modalBody'); b.innerHTML = '';
    b.appendChild(el('p', null, t('tagline') + '.'));
    b.appendChild(el('p', null, t('footNote')));
    b.appendChild(el('p', null, t('thrNote')));
    openModal();
  }

  /* ----------------------------------------------------- Eingaben einsammeln */
  /* Feldwert lesen/setzen/leeren — behandelt Checkbox (bool) getrennt vom Rest */
  function ctrlGet(key) { var c = fieldEls[key], f = FIELDS[key]; if (!c) return ''; return (f && f.type === 'bool') ? c.checked : c.value; }
  function ctrlSet(key, v) { var c = fieldEls[key], f = FIELDS[key]; if (!c) return; if (f && f.type === 'bool') c.checked = (v === true || v === 'true' || v === 1 || v === '1'); else c.value = (v == null ? '' : v); }
  function ctrlClear(key) { var c = fieldEls[key], f = FIELDS[key]; if (!c) return; if (f && f.type === 'bool') c.checked = false; else c.value = ''; }

  function collectInputs() {
    var inp = {};
    Object.keys(FIELDS).forEach(function (key) {
      var f = FIELDS[key], elx = fieldEls[key]; if (!elx) return;
      if (elx.disabled) return;
      if (f.type === 'bool') { inp[key] = elx.checked; return; }
      var v = elx.value;
      if (v === '' || v == null) return;
      inp[key] = (f.type === 'number') ? Number(v) : v;
    });
    return inp;
  }

  /* ------------------------------------------------------------ Live-Pruefung */
  function clearFieldStates() {
    Object.keys(fieldRows).forEach(function (k) {
      var r = fieldRows[k]; r.classList.remove('has-error', 'has-warning');
      var m = r.querySelector('.field-msg'); if (m) { m.textContent = ''; m.className = 'field-msg'; }
    });
  }
  /* Pruefmeldungen je Code (EN/PT); DE nutzt den ausfuehrlichen Text aus validate.js.
   * Platzhalter: {label}=Feldname (lokalisiert), {a}/{b}=Bereich, {opts}=erlaubte Werte. */
  var MSG = {
    BOOL_INVALID: { en: '{label} must be true or false.', pt: '{label} deve ser verdadeiro ou falso.' },
    R11_INCOMPLETE: { en: 'For the full R11 check, the internal-thread material group, its R_m and the available engagement m_vorh are still needed. Until then only the rule-of-thumb note is shown.', pt: 'Para a verificação R11 completa faltam ainda o grupo de material da rosca interna, o seu R_m e a profundidade de aperto disponível m_vorh. Até lá surge apenas a nota indicativa.' },
    THERMAL_DT_MISSING: { en: 'The thermal assistant is active but the temperature change ΔT is missing. Heating positive, cooling negative (e.g. assembly 20 °C, operation −20 °C → ΔT = −40 K).', pt: 'O assistente térmico está ativo mas falta a variação de temperatura ΔT. Aquecimento positivo, arrefecimento negativo (p. ex. montagem 20 °C, serviço −20 °C → ΔT = −40 K).' },
    THERMAL_ALPHA_P_MISSING: { en: 'The thermal assistant is active but α_P of the clamped parts is missing. Either choose a plate material (fills α_P automatically) or enter α_P directly (in 10⁻⁶/K, e.g. aluminium ~23).', pt: 'O assistente térmico está ativo mas falta α_P das peças apertadas. Escolha um material das peças (preenche α_P automaticamente) ou introduza α_P diretamente (em 10⁻⁶/K, p. ex. alumínio ~23).' },
    THERMAL_DT_ZERO: { en: 'ΔT = 0: the thermal assistant yields ΔF_Vth = 0 (no temperature influence).', pt: 'ΔT = 0: o assistente térmico resulta em ΔF_Vth = 0 (sem influência da temperatura).' },
    REQUIRED: { en: '{label} is required.', pt: '{label} é obrigatório.' },
    ENUM_INVALID: { en: '{label}: invalid value. Allowed: {opts}.', pt: '{label}: valor inválido. Permitido: {opts}.' },
    NOT_A_NUMBER: { en: '{label} must be a number.', pt: '{label} deve ser um número.' },
    BELOW_MIN: { en: '{label} too small (allowed ≥ {a}).', pt: '{label} demasiado pequeno (permitido ≥ {a}).' },
    ABOVE_MAX: { en: '{label} too large (allowed ≤ {b}).', pt: '{label} demasiado grande (permitido ≤ {b}).' },
    BELOW_TYPICAL: { en: '{label} below the usual range ({a}…{b}). Please check.', pt: '{label} abaixo do intervalo habitual ({a}…{b}). Verifique.' },
    ABOVE_TYPICAL: { en: '{label} above the usual range ({a}…{b}). Please check.', pt: '{label} acima do intervalo habitual ({a}…{b}). Verifique.' },
    D_H_GE_D_W: { en: 'Hole d_h ≥ head bearing d_w. d_h must be smaller than d_w (usual d_h ≈ 1.05–1.15·d).', pt: 'Furo d_h ≥ apoio da cabeça d_w. d_h deve ser menor que d_w (habitual d_h ≈ 1,05–1,15·d).' },
    DA_LE_D_H: { en: 'Outer diameter D_A ≤ hole d_h. D_A must be larger than d_h.', pt: 'Diâmetro exterior D_A ≤ furo d_h. D_A deve ser maior que d_h.' },
    PITCH_TOO_LARGE: { en: 'Pitch P is too large for d (core diameter would be ≤ 0).', pt: 'Passo P demasiado grande para d (diâmetro do núcleo seria ≤ 0).' },
    FAO_LT_FAU: { en: 'Upper load F_Ao is smaller than lower load F_Au. F_Ao must be ≥ F_Au.', pt: 'Carga superior F_Ao menor que carga inferior F_Au. F_Ao deve ser ≥ F_Au.' },
    FRICTION_MISSING: { en: 'Friction missing: choose a friction class or enter μ_G.', pt: 'Atrito em falta: escolha uma classe de atrito ou indique μ_G.' },
    TIGHTENING_MISSING: { en: 'Tightening method missing: choose a method or enter α_A.', pt: 'Método de aperto em falta: escolha um método ou indique α_A.' },
    D_H_LT_D: { en: 'Hole d_h is smaller than the thread diameter d (usual clearance hole d_h ≈ 1.05–1.15·d).', pt: 'Furo d_h menor que o diâmetro da rosca d (furo de folga habitual d_h ≈ 1,05–1,15·d).' },
    D_W_RATIO: { en: 'Head/thread ratio d_w/d is unusual (usual ≈ 1.4–1.8). Please check d_w.', pt: 'Relação cabeça/rosca d_w/d incomum (habitual ≈ 1,4–1,8). Verifique d_w.' },
    CONE_BETAL_RANGE: { en: 'l_K/d_w is outside the validated range of the empirical cone formula (≈ 0.3–8); δ_P is extrapolated there.', pt: 'l_K/d_w fora do intervalo validado da fórmula empírica do cone (≈ 0,3–8); δ_P é extrapolado.' },
    CONE_Y_RANGE: { en: 'D_A/d_w is very large; the empirical cone formula is no longer validated (guide ≤ ≈ 8); δ_P is extrapolated.', pt: 'D_A/d_w muito grande; a fórmula empírica do cone deixa de ser validada (ref. ≤ ≈ 8); δ_P é extrapolado.' },
    STRENGTH_SCOPE: { en: 'Property class is outside the main scope of VDI 2230 (8.8 to 12.9). The checks target high-strength bolts.', pt: 'Classe de resistência fora do âmbito principal da VDI 2230 (8.8 a 12.9). As verificações destinam-se a parafusos de alta resistência.' },
    STRENGTH_STAINLESS: { en: 'Stainless/austenitic bolt (ISO 3506) — permitted and fully computed. Note: VDI 2230 targets high-strength steel (8.8..12.9); here the fatigue value σ_A is only an approximation, and stainless bolts tend to gall (choose friction/preload carefully).', pt: 'Parafuso inoxidável/austenítico (ISO 3506) — permitido e totalmente calculado. Nota: a VDI 2230 destina-se a aço de alta resistência (8.8..12.9); aqui o valor de fadiga σ_A é apenas uma aproximação e os parafusos inoxidáveis tendem a gripar (escolha o atrito/pré-tensão com cuidado).' },
    MY_NEEDS_QM: { en: 'With a torque M_Ymax the number of interfaces q_M (≥ 1) must be given.', pt: 'Com um momento M_Ymax deve indicar-se o número de juntas q_M (≥ 1).' },
    MY_NEEDS_RA: { en: 'With a torque M_Ymax the effective radius r_a (> 0) must be given.', pt: 'Com um momento M_Ymax deve indicar-se o raio efetivo r_a (> 0).' },
    MY_WITHOUT_FQ: { en: 'A torque M_Ymax only acts in the slip check together with a transverse force F_Qmax. Without F_Qmax it is ignored.', pt: 'Um momento M_Ymax só atua na verificação de escorregamento com uma força transversal F_Qmax. Sem F_Qmax é ignorado.' }
  };
  function msgText(item) {
    if (lang === 'de') return item.text;
    var m = MSG[item.code]; if (!m || !m[lang]) return item.text;
    var f = FIELDS[item.field], label = f ? (f.label[lang] || f.label.de) : item.field;
    var r = item.range || [];
    return m[lang]
      .replace('{label}', label)
      .replace('{a}', r[0] != null ? r[0] : '')
      .replace('{b}', r[1] != null ? r[1] : '')
      .replace('{opts}', (r || []).join(', '));
  }

  /* Engine-Hinweise (Annahmen/Offene Punkte) je Code (EN/PT); DE nutzt item.text. */
  var NOTE = {
    ASSUME_SG_FSM: { en: 'SG (rolled after heat treatment): F_Sm = F_Mzul + Φ_en·(F_Ao+F_Au)/2 for σ_A,SG.', pt: 'SG (laminada após tratamento térmico): F_Sm = F_Mzul + Φ_en·(F_Ao+F_Au)/2 para σ_A,SG.' },
    SG_OUT_OF_RANGE: { en: 'SG not applicable (F_Sm/F_0,2min = {ratio}, outside ~0.3..1) — computed conservatively with SV.', pt: 'SG não aplicável (F_Sm/F_0,2min = {ratio}, fora de ~0,3..1) — calculado de forma conservadora com SV.' },
    ASSUME_R11_BASIS: { en: 'R11 basis: F_mS = 1.2·R_m,S·A_S; C1 = 1 (s/d ≥ 1.9); τ_B,S is class-dependent (per Thomala/VDI), τ_B,M from the material group (VDI 2230-1 Table 6).', pt: 'Base R11: F_mS = 1,2·R_m,S·A_S; C1 = 1 (s/d ≥ 1,9); τ_B,S dependente da classe (segundo Thomala/VDI), τ_B,M do grupo de material (VDI 2230-1 Tab. 6).' },
    VALIDATE_R11: { en: 'R11 minimum engagement: structure per VDI 2230 sheet 1 (Alexander/Ruoss). Shear-strength ratios are sourced (VDI 2230-1 Table 6 / Figure 36; cast iron & aluminium via Lork/Hanke). Intended as a design tool — verify against the original standard before production use.', pt: 'Profundidade mínima R11: estrutura segundo a VDI 2230 folha 1 (Alexander/Ruoss). As relações de resistência ao corte têm fonte (VDI 2230-1 Tab. 6 / Fig. 36; ferro fundido e alumínio via Lork/Hanke). Concebido como ferramenta de projeto — verifique com a norma original antes de uso produtivo.' },
    ASSUME_ALPHA_FROM_METHOD: { en: 'α_A = upper range value of "{method}" ({alphaA})', pt: 'α_A = valor superior do intervalo de "{method}" ({alphaA})' },
    ASSUME_CONN_DSV: { en: 'Joint type assumed as DSV (through-bolt with nut).', pt: 'Tipo de união assumido como DSV (parafuso passante com porca).' },
    ASSUME_N_DEFAULT: { en: 'Load-introduction factor n = {n} (unfavourable/safe) assumed.', pt: 'Fator de introdução de carga n = {n} (desfavorável/seguro) assumido.' },
    ASSUME_FA_FROM_FAO: { en: 'Working force F_A = F_Ao (upper load) for the preload chain.', pt: 'Força de serviço F_A = F_Ao (carga superior) para a cadeia de pré-tensão.' },
    ASSUME_DFVTH_ZERO: { en: 'Thermal part ΔF_Vth = 0 (no temperature influence).', pt: 'Parte térmica ΔF_Vth = 0 (sem influência da temperatura).' },
    ASSUME_KTAU: { en: 'Residual torsion factor k_τ = {kTau} in operation.', pt: 'Fator de torção residual k_τ = {kTau} em serviço.' },
    ASSUME_SP_OPERATING: { en: 'R10: operating state governs (p_max from F_Smax > F_Mzul); S_P = min(assembly, operation).', pt: 'R10: estado de serviço determinante (p_max de F_Smax > F_Mzul); S_P = mín(montagem, serviço).' },
    ASSUME_FKR_FORMULA: { en: 'Residual clamp force F_KR = F_Mmin − F_Z − max(0; ΔF_Vth) − (1−Φ_en)·F_A (preload gain not credited).', pt: 'Força de aperto residual F_KR = F_Mmin − F_Z − max(0; ΔF_Vth) − (1−Φ_en)·F_A (ganho de pré-tensão não creditado).' },
    ASSUME_THERMAL_APPROX: { en: 'Thermal (VDI approximation): ΔF_Vth = l_K·(α_S − α_P)·ΔT/(δ_S + δ_P). Temperature dependence of the elastic moduli NOT included.', pt: 'Térmico (aproximação VDI): ΔF_Vth = l_K·(α_S − α_P)·ΔT/(δ_S + δ_P). Dependência dos módulos E com a temperatura NÃO incluída.' },
    ASSUME_ALPHA_S_CLASS: { en: 'α_S taken from the property class (guide value 20–100 °C: bolt steel ~11.5, austenitic ~16, in 10⁻⁶/K).', pt: 'α_S obtido da classe de resistência (valor indicativo 20–100 °C: aço ~11,5, austenítico ~16, em 10⁻⁶/K).' },
    ASSUME_ALPHA_P_MAT: { en: 'α_P taken from the plate material (guide value 20–100 °C, in 10⁻⁶/K).', pt: 'α_P obtido do material das peças (valor indicativo 20–100 °C, em 10⁻⁶/K).' },
    HINT_DFVTH_GAIN: { en: 'ΔF_Vth is a preload GAIN (hot state). Not credited for F_Mmin/F_KR (cold state governs); in F_Smax/F_Vmax it increases bolt force and surface pressure.', pt: 'ΔF_Vth é um GANHO de pré-tensão (estado quente). Não creditado em F_Mmin/F_KR (estado frio determinante); em F_Smax/F_Vmax aumenta a força do parafuso e a pressão superficial.' },
    PENDING_DP_CONE_SLEEVE: { en: 'δ_P cone+sleeve (intermediate case) — structure per VDI, validate separately.', pt: 'δ_P cone+manga (caso intermédio) — estrutura conforme VDI, validar separadamente.' },
    TANPHI_CLAMPED: { en: 'Cone angle tan(φ) limited to its physical lower bound — the geometry (l_K/d_w) is far outside the empirical formula’s validity range. δ_P is not reliable here; check the geometry.', pt: 'Ângulo do cone tan(φ) limitado ao seu mínimo físico — a geometria (l_K/d_w) está muito fora do intervalo de validade da fórmula empírica. δ_P não é fiável aqui; verifique a geometria.' },
    PENDING_FATIGUE_SV: { en: 'Fatigue per SV (heat-treated after rolling, preload-independent). For threads rolled after heat treatment, choose SG.', pt: 'Fadiga segundo SV (temperada após laminagem, independente da pré-tensão). Para roscas laminadas após tratamento térmico, escolha SG.' },
    ASSUME_SURFACE_FATIGUE: { en: 'Fatigue strength reduced by factor {factor} (finish: {surface}, VDI 2230 sheet 1).', pt: 'Resistência à fadiga reduzida pelo fator {factor} (acabamento: {surface}, VDI 2230 folha 1).' },
    PENDING_FATIGUE_STAINLESS: { en: 'Stainless/austenitic bolt: the σ_A fatigue formula is calibrated for steel 8.8..12.9 and is only an approximation here — when in doubt use manufacturer data.', pt: 'Parafuso inoxidável/austenítico: a fórmula de fadiga σ_A é calibrada para aço 8.8..12.9 e é aqui apenas uma aproximação — em caso de dúvida, use dados do fabricante.' },
    ASSUME_E_S_CLASS: { en: 'Bolt Young’s modulus taken from the property class (e.g. stainless ≈ 200,000 N/mm²), not the standard steel value.', pt: 'Módulo de elasticidade do parafuso conforme a classe (p. ex. inoxidável ≈ 200 000 N/mm²), não o valor padrão do aço.' },
    PENDING_R11: { en: 'Minimum engagement depth (R11): the bolt should break before the thread strips. For the full check, enable “Check R11” and enter the internal-thread material group, its R_m and the available engagement m_vorh. Guide values without the check: steel ~1·d, cast iron ~1.4·d, aluminium ~2·d.', pt: 'Profundidade mínima de aperto (R11): o parafuso deve romper antes de a rosca se arrancar. Para a verificação completa, ative “Verificar R11” e indique o grupo de material da rosca interna, o seu R_m e a profundidade de aperto disponível m_vorh. Valores indicativos sem a verificação: aço ~1·d, ferro fundido ~1,4·d, alumínio ~2·d.' }
  };
  function noteText(item) {
    if (typeof item === 'string') return item;
    if (lang === 'de') return item.text;
    var tpl = NOTE[item.code] && NOTE[item.code][lang];
    if (!tpl) return item.text;
    return tpl
      .replace('{method}', item.method != null ? item.method : '')
      .replace('{alphaA}', item.alphaA != null ? item.alphaA : '')
      .replace('{kTau}', item.kTau != null ? item.kTau : '')
      .replace('{ratio}', item.ratio != null ? Number(item.ratio).toFixed(2) : '')
      .replace('{n}', item.n != null ? item.n : '');
  }

  /* Verbesserungs-Hinweise (Stufe 2): dreisprachige Templates je Code.
   * Platzhalter werden aus h.v gefuellt. {gov} ist selbst uebersetzt. */
  var HINT = {
    FIX_SP: {
      de: 'S_P (Flächenpressung): Auflagefläche vergrößern — Auflagedurchmesser d_w von {dwNow} auf mind. {dw} mm (z. B. Unterlegscheibe/Bundkopf), oder härteres Material (p_G ≥ {pg} N/mm²), oder Vorspannung senken. Maßgeblich: {gov}.',
      en: 'S_P (surface pressure): enlarge the bearing area — head diameter d_w from {dwNow} to at least {dw} mm (e.g. a washer/flanged head), or a harder material (p_G ≥ {pg} N/mm²), or lower the preload. Governing state: {gov}.',
      pt: 'S_P (pressão superficial): aumentar a área de apoio — diâmetro d_w de {dwNow} para pelo menos {dw} mm (p. ex. anilha/cabeça flangeada), ou material mais duro (p_G ≥ {pg} N/mm²), ou reduzir a pré-tensão. Determinante: {gov}.'
    },
    FIX_SA: {
      de: 'S_A (Einschraubtiefe): vorhandene Einschraubtiefe m_vorh von {mNow} auf mind. {m} mm erhöhen, oder einen festeren Innengewinde-Werkstoff (höheres τ_B/R_m) wählen.',
      en: 'S_A (engagement): increase the available length of engagement m_vorh from {mNow} to at least {m} mm, or choose a stronger internal-thread material (higher τ_B/R_m).',
      pt: 'S_A (profundidade de aperto): aumentar m_vorh de {mNow} para pelo menos {m} mm, ou escolher um material de rosca interna mais resistente (τ_B/R_m maior).'
    },
    FIX_SG: {
      de: 'S_G (Gleiten/Reibschluss): Klemmkraft/Vorspannung erhöhen, Reibung in der Trennfuge steigern (µ_T von {muNow} auf ≥ {mu}), mehr Schrauben, oder Querkraft auf ≤ {fq} N begrenzen (jetzt {fqNow} N).',
      en: 'S_G (slip/friction grip): raise the clamp force/preload, increase interface friction (µ_T from {muNow} to ≥ {mu}), add bolts, or limit the transverse force to ≤ {fq} N (now {fqNow} N).',
      pt: 'S_G (escorregamento/atrito): aumentar a força de aperto/pré-tensão, aumentar o atrito na junta (µ_T de {muNow} para ≥ {mu}), mais parafusos, ou limitar a força transversal a ≤ {fq} N (agora {fqNow} N).'
    },
    FIX_SD: {
      de: 'S_D (Dauerhaltbarkeit): Ausschlaglast um rund {redPct} % senken (σ_a ≤ {saZul} N/mm²) — kleinere Lastamplitude oder größere/nächstgrößere Schraube.{sg}{surf}',
      en: 'S_D (fatigue): lower the alternating load by about {redPct}% (σ_a ≤ {saZul} N/mm²) — smaller load amplitude or a larger bolt.{sg}{surf}',
      pt: 'S_D (fadiga): reduzir a carga alternada em cerca de {redPct}% (σ_a ≤ {saZul} N/mm²) — menor amplitude ou parafuso maior.{sg}{surf}'
    },
    FIX_SF: {
      de: 'S_F (Fließen bei Montage): Vorspannung/Anziehmoment um rund {redPct} % senken, oder eine festere Festigkeitsklasse wählen.',
      en: 'S_F (yield at assembly): lower the preload/tightening torque by about {redPct}%, or choose a higher property class.',
      pt: 'S_F (cedência na montagem): reduzir a pré-tensão/binário de aperto em cerca de {redPct}%, ou escolher uma classe de resistência superior.'
    }
  };
  function hintText(h) {
    var v = h.v || {};
    var govMap = { Montage: { de: 'Montage', en: 'assembly', pt: 'montagem' }, Betrieb: { de: 'Betrieb', en: 'operation', pt: 'serviço' } };
    var gov = govMap[v.gov] ? (govMap[v.gov][lang] || govMap[v.gov].de) : (v.gov || '');
    var sgOpt = '', surfOpt = '';
    if (h.code === 'FIX_SD') {
      if (v.canSG) sgOpt = (lang === 'en') ? ' Option: choose SG (rolled after heat treatment).' : (lang === 'pt') ? ' Opção: escolher SG (laminada após TT).' : ' Option: schlussgewalzt (SG) wählen.';
      if (v.hasSurf) surfOpt = (lang === 'en') ? ' Option: use a plain (non-galvanized/non-HV) bolt.' : (lang === 'pt') ? ' Opção: usar parafuso liso (sem galvanização/HV).' : ' Option: blanke Ausführung (statt feuerverzinkt/HV) wählen.';
    }
    var tpl = (HINT[h.code] && (HINT[h.code][lang] || HINT[h.code].de)) || '';
    return tpl
      .replace('{dwNow}', v.dwNow != null ? fmt(v.dwNow, 1) : '')
      .replace('{dw}', v.dw != null ? fmt(v.dw, 1) : '')
      .replace('{pg}', v.pg != null ? fmt(v.pg, 0) : '')
      .replace('{gov}', gov)
      .replace('{mNow}', v.mNow != null ? fmt(v.mNow, 1) : '')
      .replace('{m}', v.m != null ? fmt(v.m, 1) : '')
      .replace('{muNow}', v.muNow != null ? fmt(v.muNow, 2) : '')
      .replace('{mu}', v.mu != null ? fmt(v.mu, 2) : '')
      .replace('{fqNow}', v.fqNow != null ? fmt(v.fqNow, 0) : '')
      .replace('{fq}', v.fq != null ? fmt(v.fq, 0) : '')
      .replace('{redPct}', v.redPct != null ? v.redPct : '')
      .replace('{saZul}', v.saZul != null ? fmt(v.saZul, 1) : '')
      .replace('{sg}', sgOpt)
      .replace('{surf}', surfOpt);
  }

  function applyMessages(items) {
    items.forEach(function (it) {
      var r = fieldRows[it.field]; if (!r) return;
      var isErr = it.severity === 'error';
      if (isErr) r.classList.add('has-error'); else if (!r.classList.contains('has-error')) r.classList.add('has-warning');
      var m = r.querySelector('.field-msg'); if (!m) return;
      if (m.textContent && m.className.indexOf('error') >= 0) return; // Fehler hat Vorrang
      m.textContent = msgText(it); m.className = 'field-msg ' + (isErr ? 'error' : 'warning');
    });
  }
  function updateDependencies() {
    Object.keys(FIELDS).forEach(function (key) {
      var dep = FIELDS[key].dependsOn; if (!dep) return;
      var drv = fieldEls[dep], row = fieldRows[key], ctrl = fieldEls[key];
      if (!drv || !row || !ctrl) return;
      var depF = FIELDS[dep], active;
      if (depF && depF.type === 'bool') { active = drv.checked; }
      else if (depF && depF.type === 'enum') { var ev = drv.value; active = (ev !== '' && ev != null); }
      else { var dv = drv.value; active = (dv !== '' && dv != null && Number(dv) !== 0); }
      row.classList.toggle('is-disabled', !active);
      ctrl.disabled = !active;
    });
  }
  /* Zielfeld aus der Werkstofftabelle vorbelegen/sperren (oder per Haken freigeben).
   * srcKey = Werkstoff-Dropdown, tgtKey = Zahlenfeld, customKey = "eigener Wert"-Haken,
   * prop = Eigenschaft in DATA.TAU_RATIO (rmDefault | E | pG). */
  function fillFromMaterial(srcKey, tgtKey, customKey, prop, unit) {
    var src = fieldEls[srcKey], cust = fieldEls[customKey], tgt = fieldEls[tgtKey];
    var row = fieldRows[tgtKey]; if (!tgt || !row) return;
    var hintEl = row.querySelector('.field-hint');
    if (tgt.disabled) { tgt.readOnly = false; tgt.classList.remove('locked'); if (hintEl) hintEl.textContent = ''; return; }
    var mat = (src && src.value) ? DATA.TAU_RATIO[src.value] : null;
    var custom = !!(cust && cust.checked);
    if (!custom && mat && mat[prop] != null) {
      tgt.value = mat[prop];                    // Richtwert vorbelegen
      tgt.readOnly = true; tgt.classList.add('locked');
      if (hintEl) hintEl.textContent = t('rmHintPrefix') + ': ' + mat.grade + ' · ' + mat[prop] + (unit ? ' ' + unit : '');
    } else {
      tgt.readOnly = false; tgt.classList.remove('locked');
      if (hintEl) hintEl.textContent = custom ? ('✎ ' + t('rmHintCustom')) : '';
    }
  }
  function updateMaterialHints() {
    fillFromMaterial('matGroupM', 'Rm_M', 'rmCustom', 'rmDefault', 'N/mm²');
    fillFromMaterial('plateMat', 'E_P', 'epCustom', 'E', 'N/mm²');
    fillFromMaterial('plateMat', 'p_G', 'pgCustom', 'pG', 'N/mm²');
    fillFromMaterial('plateMat', 'alpha_P', 'apCustom', 'alpha', '10⁻⁶/K');
    fillAlphaS();
    updateThermalLock();
  }
  /* alpha_S aus der Festigkeitsklasse vorbelegen/sperren (Stahl ~11,5 · Austenit ~16),
   * gleiches Muster wie fillFromMaterial, Quelle ist aber STRENGTH + BOLT_ALPHA. */
  function fillAlphaS() {
    var src = fieldEls['strengthClass'], cust = fieldEls['asCustom'], tgt = fieldEls['alpha_S'];
    var row = fieldRows['alpha_S']; if (!tgt || !row) return;
    var hintEl = row.querySelector('.field-hint');
    if (tgt.disabled) { tgt.readOnly = false; tgt.classList.remove('locked'); if (hintEl) hintEl.textContent = ''; return; }
    var cls = (src && src.value) ? DATA.STRENGTH[src.value] : null;
    var custom = !!(cust && cust.checked);
    if (!custom && cls) {
      var a = cls.stainless ? DATA.BOLT_ALPHA.stainless : DATA.BOLT_ALPHA.steel;
      tgt.value = a; tgt.readOnly = true; tgt.classList.add('locked');
      if (hintEl) hintEl.textContent = t('rmHintPrefix') + ': ' + src.value + ' · ' + a + ' 10⁻⁶/K';
    } else {
      tgt.readOnly = false; tgt.classList.remove('locked');
      if (hintEl) hintEl.textContent = custom ? ('✎ ' + t('rmHintCustom')) : '';
    }
  }
  /* Assistenten ersetzen statt ergaenzen: ist der Thermik-Assistent aktiv, wird das
   * manuelle dF_Vth-Feld gesperrt + mit Provenienz beschriftet; der Wert wird nach
   * jeder Berechnung aus der Engine eingetragen (compute). */
  function updateThermalLock() {
    var assist = fieldEls['thermalAssist'], tgt = fieldEls['deltaFvth'];
    var row = fieldRows['deltaFvth']; if (!tgt || !row) return;
    var hintEl = row.querySelector('.field-hint');
    if (assist && assist.checked) {
      tgt.readOnly = true; tgt.classList.add('locked');
      if (hintEl) hintEl.textContent = t('rmHintPrefix') + ': ' + t('thermalProv');
    } else {
      tgt.readOnly = false; tgt.classList.remove('locked');
      if (hintEl) hintEl.textContent = '';
    }
  }
  function markNeedsInput(errors) {
    var codes = { REQUIRED: 1, FRICTION_MISSING: 1, TIGHTENING_MISSING: 1, NOT_A_NUMBER: 1 };
    errors.forEach(function (e) {
      if (!codes[e.code]) return;
      var r = fieldRows[e.field]; if (!r) return;
      var b = r.querySelector('.help-btn'); if (b) b.classList.add('needs-input');
    });
  }
  function clearNeedsInput() {
    Object.keys(fieldRows).forEach(function (k) { var b = fieldRows[k].querySelector('.help-btn'); if (b) b.classList.remove('needs-input'); });
  }
  function liveValidate() {
    updateDependencies();
    updateMaterialHints();
    var vr = VALID.validateInput(collectInputs());
    clearFieldStates();
    clearNeedsInput();
    applyMessages(vr.errors);
    applyMessages(vr.warnings);
    markNeedsInput(vr.errors);
    return vr;
  }

  /* ------------------------------------------------------------- Berechnung */
  function compute() {
    var inp = collectInputs();
    var R = SOLVER.computeJoint(inp);
    var host = $('resultHost');
    clearFieldStates();
    if (R.status === 'invalid') {
      applyMessages(R.errors); applyMessages(R.warnings || []);
      host.innerHTML = '';
      host.appendChild(banner('bad', t('statusInvalid')));
      var ul = el('div', 'notes');
      R.errors.forEach(function (e) { ul.appendChild(noteLine('warning', t('tagWarn'), msgText(e))); });
      host.appendChild(ul);
      setSteps(false);
      lastResult = null; lastInputs = null;
      resetViz();
      return;
    }
    applyMessages(R.warnings || []);
    lastInputs = inp;
    lastResult = R;
    /* Provenienz: bei aktivem Thermik-Assistenten den berechneten dF_Vth ins
     * gesperrte Feld eintragen, damit der Wert sichtbar (und in .dt gesichert) ist. */
    if (R.thermal && fieldEls['deltaFvth']) fieldEls['deltaFvth'].value = Math.round(R.deltaFvth);
    renderResults(R);
  }

  function banner(kind, text) { var b = el('div', 'status-banner ' + kind); b.appendChild(el('span', null, kind === 'ok' ? '✓' : (kind === 'bad' ? '✕' : 'i'))); b.appendChild(el('span', null, ' ' + text)); return b; }
  function noteLine(kind, tag, text) { var n = el('div', 'note-line ' + kind); n.appendChild(el('span', 'tag', tag)); n.appendChild(el('span', null, text)); return n; }

  function safetyClass(s) { if (s == null || !isFinite(s)) return 'na'; if (s >= 1.2) return 'ok'; if (s >= 1.0) return 'warn'; return 'bad'; }

  function safetyCard(symbol, subKey, val, reasonKey) {
    var cls = safetyClass(val);
    var c = el('div', 'safety-card ' + cls);
    var name = el('div', 'sc-name'); name.appendChild(el('b', null, symbol)); name.appendChild(el('span', 'sc-sub', t(subKey)));
    c.appendChild(name);
    c.appendChild(el('div', 'sc-val', cls === 'na' ? t('nb') : fmt(val, 2)));
    if (cls === 'na' && reasonKey) c.appendChild(el('div', 'sc-reason', t(reasonKey)));
    c.appendChild(el('div', 'sc-dot'));
    return c;
  }

  function renderResults(R) {
    var host = $('resultHost'); host.innerHTML = '';
    host.appendChild(banner('ok', t('statusOk')));

    // Sicherheiten
    var grid = el('div', 'safety-grid');
    grid.appendChild(safetyCard('S_F', 'sub_F', R.S_F));
    grid.appendChild(safetyCard('S_D', 'sub_D', R.fatigue ? R.fatigue.S_D : null, 'na_D'));
    grid.appendChild(safetyCard('S_P', 'sub_P', R.pressure ? R.pressure.S_P : null, 'na_P'));
    grid.appendChild(safetyCard('S_G', 'sub_G', R.slip ? R.slip.S_G : null, 'na_G'));
    grid.appendChild(safetyCard('S_A', 'sub_A', R.engagement ? R.engagement.S_A : null, 'na_A'));
    host.appendChild(grid);

    var thr = el('div', 'note-line assume'); thr.style.marginTop = '10px';
    thr.appendChild(el('span', 'tag', '!')); thr.appendChild(el('span', null, t('thrNote')));
    host.appendChild(thr);

    // Kennwerte-Tabelle
    var tbl = el('table', 'kv-table');
    var cap = el('caption', null, t('kvCaption')); tbl.appendChild(cap);
    // C1: keine innerHTML-Injektion — Wert als Text, Einheit als eigenes span.
    // unit() haengt die Einheit ueber einen Sentinel an, row()/eRow() splitten sie sicher auf.
    var USEP = '\u0001';
    function setCell(td, vStr) {
      var parts = String(vStr).split(USEP);
      td.appendChild(document.createTextNode(parts[0]));
      if (parts[1]) { var u = el('span', 'u', parts[1]); td.appendChild(document.createTextNode(' ')); td.appendChild(u); }
    }
    function row(k, vStr) { var tr = el('tr'); tr.appendChild(el('td', 'k', k)); var td = el('td', 'v'); setCell(td, vStr); tr.appendChild(td); tbl.appendChild(tr); }
    function unit(u) { return USEP + u; }
    row('δ_S', fmtExp(R.deltaS) + unit('mm/N'));
    row('δ_P (' + R.deltaP_model + ')', fmtExp(R.deltaP) + unit('mm/N'));
    if (R.tanPhi != null) row('tan φ', fmt(R.tanPhi, 3));
    if (R.DAGr != null) row('D_A,Gr', fmt(R.DAGr, 1) + unit('mm'));
    row('Φ_K', fmt(R.PhiK, 3));
    row('Φ_en', fmt(R.PhiEn, 3));
    row('F_Z', fmt(R.F_Z, 0) + unit('N'));
    row('F_Mmin', fmt(R.F_Mmin, 0) + unit('N'));
    row('F_Mmax', fmt(R.F_Mmax, 0) + unit('N'));
    row('F_Mzul', fmt(R.F_Mzul, 0) + unit('N'));
    row('M_A', fmt(R.M_A / 1000, 1) + unit('N·m'));
    row('F_Smax', fmt(R.F_Smax, 0) + unit('N'));
    // Schrauben-E-Modul nur zeigen, wenn er vom Stahl-Standard abweicht (z. B. rostfrei ~200 GPa)
    if (R.E_S != null && R.E_S !== 205000) row('E_S', fmt(R.E_S, 0) + unit('N/mm²'));
    row('σ_z,max', fmt(R.sigma_zmax, 0) + unit('N/mm²'));
    row('σ_red,B', fmt(R.sigma_redB, 0) + unit('N/mm²'));
    // Dauerfestigkeit: Ausschlagspannung + ertragbare Spannung immer zeigen, wenn Schwinglast gerechnet
    if (R.fatigue) {
      row('σ_a', fmt(R.fatigue.sigma_a, 1) + unit('N/mm²'));
      row('σ_A (' + R.fatigue.finish + ')', fmt(R.fatigue.sigma_A, 1) + unit('N/mm²'));
    }
    // SG-Dauerfestigkeit: mittlere Schraubenkraft-Verhaeltnis, falls aktiv
    if (R.fatigue && R.fatigue.finish === 'SG' && R.fatigue.sgRatio != null) {
      row('F_Sm/F_0,2min', fmt(R.fatigue.sgRatio, 3));
    }
    // Dauerfestigkeits-Ausführung / Oberflächen-Abminderung, falls wirksam
    if (R.fatigue && R.fatigue.surfaceFactor != null && R.fatigue.surfaceFactor !== 1) {
      var surfLbl = { blank: { de: 'blank', en: 'plain', pt: 'liso' }, verzinkt: { de: 'feuerverzinkt', en: 'hot-dip galv.', pt: 'galvanizado' }, hv: { de: 'HV-Garnitur', en: 'HV set', pt: 'conjunto HV' } };
      var sfL = surfLbl[R.fatigue.surface] || { de: R.fatigue.surface, en: R.fatigue.surface, pt: R.fatigue.surface };
      var afLbl = { de: 'Ausführung (σ_A-Faktor)', en: 'Finish (σ_A factor)', pt: 'Acabamento (fator σ_A)' };
      row(afLbl[lang] || afLbl.de, (sfL[lang] || sfL.de) + ' · ×' + fmt(R.fatigue.surfaceFactor, 2));
    }
    // R10: Montage- und Betriebspressung getrennt zeigen, wenn beide vorliegen
    if (R.pressure && R.pressure.p_max_M != null && R.pressure.p_max_B != null) {
      row('p_max (Montage)', fmt(R.pressure.p_max_M, 0) + unit('N/mm²'));
      row('p_max (Betrieb)', fmt(R.pressure.p_max_B, 0) + unit('N/mm²'));
    }
    // R12 Reibschluss: Kennwerte zeigen, wenn eine Querkraft vorliegt
    if (R.slip && R.slip.F_KQerf != null) {
      row('F_KQ,erf', fmt(R.slip.F_KQerf, 0) + unit('N'));
      if (R.slip.F_KR != null) row('F_KR', fmt(R.slip.F_KR, 0) + unit('N'));
    }
    host.appendChild(tbl);

    // R11 – Mindesteinschraubtiefe (nur wenn Nachweis aktiv gerechnet wurde)
    if (R.engagement) {
      var e = R.engagement;
      var brLab = {
        innen:  { de: 'Innengewinde (Mutter/Bauteil)', en: 'internal thread (nut/part)', pt: 'rosca interna (porca/peça)' },
        bolzen: { de: 'Schraubengewinde (Bolzen)', en: 'bolt thread', pt: 'rosca do parafuso' }
      };
      var eTbl = el('table', 'kv-table');
      eTbl.appendChild(el('caption', null, t('kvEngage')));
      function eRow(k, vStr) { var tr = el('tr'); tr.appendChild(el('td', 'k', k)); var td = el('td', 'v'); setCell(td, vStr); tr.appendChild(td); eTbl.appendChild(tr); }
      eRow('m_min (erf.)', fmt(e.m_min, 2) + unit('mm'));
      eRow('m_zu', fmt(e.m_zu, 2) + unit('mm'));
      eRow('m_vorh', fmt(e.m_vorh, 2) + unit('mm'));
      eRow('m_eff,vorh', fmt(e.m_eff_vorh, 2) + unit('mm'));
      eRow('S_A', fmt(e.S_A, 2));
      eRow('R_S', fmt(e.RS, 3));
      eRow('maßgeb. Gewinde', (brLab[e.branch] && (brLab[e.branch][lang] || brLab[e.branch].de)) || e.branch);
      // Scherfestigkeitsverhaeltnisse transparent ausweisen (normbelegt, dreisprachig)
      if (e.matRatio != null && e.boltRatio != null) {
        var ratioLbl = { de: 'τ_B/R_m (Bauteil · Bolzen)', en: 'τ_B/R_m (part · bolt)', pt: 'τ_B/R_m (peça · parafuso)' };
        eRow(ratioLbl[lang] || ratioLbl.de, fmt(e.matRatio, 2) + ' · ' + fmt(e.boltRatio, 2));
        if (e.matSrc) {
          var srcLbl = { de: 'Quelle τ_B/R_m', en: 'Source τ_B/R_m', pt: 'Fonte τ_B/R_m' };
          eRow(srcLbl[lang] || srcLbl.de, e.matSrc);
        }
      }
      host.appendChild(eTbl);
    }

    // Hinweise: Vorspannungs-Check, Warnungen, Annahmen, Offene Punkte
    var notes = el('div', 'notes');
    notes.appendChild(noteLine(R.preloadOK ? 'assume' : 'warning', R.preloadOK ? '✓' : t('tagWarn'), R.preloadOK ? t('preloadOk') : t('preloadBad')));
    // Verbesserungs-Hinweise (Stufe 2): gesammelt, wenn Sicherheiten gelb/rot sind
    if (R.improvements && R.improvements.length) {
      var fixBox = el('div', 'improve-box');
      fixBox.appendChild(el('div', 'improve-title', t('improveTitle')));
      R.improvements.forEach(function (h) {
        fixBox.appendChild(noteLine(h.level === 'bad' ? 'warning' : 'assume', t('tagFix'), hintText(h)));
      });
      fixBox.appendChild(el('div', 'improve-coupling', t('improveCoupling')));
      notes.appendChild(fixBox);
    }
    (R.warnings || []).forEach(function (w) { notes.appendChild(noteLine('warning', t('tagWarn'), msgText(w))); });
    (R.notes && R.notes.assumptions || []).forEach(function (a) { notes.appendChild(noteLine('assume', t('tagAssume'), noteText(a))); });
    (R.notes && R.notes.pending || []).forEach(function (p) { notes.appendChild(noteLine('assume', t('tagPending'), noteText(p))); });
    host.appendChild(notes);

    if (RECHENWEG) host.appendChild(buildRechenweg(R));

    renderViz(R);

    setSteps(true);
  }

  /* -------------------------------------------------------------- Rechenweg */
  function buildRechenweg(R) {
    var rw = RECHENWEG.build(R, lastInputs || collectInputs(), { lang: lang, fmt: fmt, fmtExp: fmtExp, eScrew: DATA.E_SCREW, data: DATA });
    var det = el('details', 'rechenweg');
    var sum = el('summary');
    sum.appendChild(el('span', 'rw-title', t('rechenwegTitle')));
    sum.appendChild(el('span', 'rw-hint', t('rwHint')));
    det.appendChild(sum);
    var body = el('div', 'rw-body');
    rw.steps.forEach(function (st) {
      var c = el('div', 'rw-step' + (st.safety ? ' is-safety' : ''));
      var head = el('div', 'rw-head');
      head.appendChild(el('span', 'rw-phase', st.phase));
      head.appendChild(el('span', 'rw-name', st.title));
      if (st.ok) { var v = el('span', 'rw-ok', '✓'); v.title = t('rwVerified'); head.appendChild(v); }
      c.appendChild(head);
      c.appendChild(el('div', 'rw-formula', st.formula));
      if (st.sub && st.sub !== '—') { var sb = el('div', 'rw-sub'); sb.textContent = st.sub; c.appendChild(sb); }
      var res = el('div', 'rw-res'); res.textContent = '= ' + st.result; c.appendChild(res);
      if (st.note) c.appendChild(el('div', 'rw-note', st.note));
      if (st.ref) c.appendChild(el('div', 'rw-ref', st.ref));
      body.appendChild(c);
    });
    det.appendChild(body);
    return det;
  }

  /* ---------------------------------------------------- Visualisierung/Viz */
  function vizPlaceholder() {
    return '<div class="viz-placeholder"><div class="big">' + t('vizSoon') + '</div><div>' + t('vizSoon2') + '</div></div>';
  }
  function renderViz(R) {
    var host = $('vizHost'); if (!host) return;
    var svg = SCHAUBILD ? SCHAUBILD.build(R, lastInputs || collectInputs(), { lang: lang, fmt: fmt }) : '';
    host.innerHTML = svg || vizPlaceholder();
  }
  function resetViz() {
    var host = $('vizHost'); if (host) host.innerHTML = vizPlaceholder();
  }

  /* ------------------------------------------------------------- Step-Strip */
  function buildSteps() {
    var s = $('stepStrip'); s.innerHTML = '';
    for (var i = 0; i <= 13; i++) { var c = el('span', 'step-chip', 'R' + i); c.id = 'step-R' + i; s.appendChild(c); }
  }
  var DONE_STEPS = ['R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'R12', 'R13'];
  function setSteps(on) {
    for (var i = 0; i <= 13; i++) { var c = $('step-R' + i); if (c) c.classList.remove('on'); }
    if (!on) return;
    DONE_STEPS.forEach(function (r) { var c = $('step-' + r); if (c) c.classList.add('on'); });
    // R11 nur aufleuchten lassen, wenn der Nachweis tatsaechlich gerechnet wurde (R.engagement vorhanden).
    if (lastResult && lastResult.engagement) { var c11 = $('step-R11'); if (c11) c11.classList.add('on'); }
  }

  /* ---------------------------------------------------------------- Presets */
  function fillPresetSelect() {
    var sel = $('presetSel'); sel.innerHTML = '';
    sel.appendChild(new Option(t('customOpt'), ''));
    SOLVER.listPresets().forEach(function (p) {
      sel.appendChild(new Option(p.label + (p.validated ? '  ✓' : ''), p.id));
    });
  }
  function loadPreset(id) {
    var list = SOLVER.listPresets(), p = null;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) p = list[i];
    if (!p) return;
    // Formular leeren, dann fuellen
    Object.keys(fieldEls).forEach(function (k) { ctrlClear(k); });
    Object.keys(p.input).forEach(function (k) { if (fieldEls[k] != null) ctrlSet(k, p.input[k]); });
    liveValidate();
    compute();
  }
  function markCustomPreset() { $('presetSel').value = ''; }
  function resetForm() {
    Object.keys(fieldEls).forEach(function (k) {
      var f = FIELDS[k];
      if (f.type === 'enum') { var rec = VALID.fieldOptions(f.enumOf, lang).filter(function (o) { return o.recommended; })[0]; ctrlSet(k, rec ? rec.value : ''); }
      else ctrlClear(k);
    });
    $('presetSel').value = '';
    $('resultHost').innerHTML = ''; $('resultHost').appendChild(banner('idle', t('resultIdle')));
    setSteps(false); lastResult = null;
    liveValidate();
  }

  /* -------------------------------------------------- Speichern/Laden (.dt) */
  var dtMsgTimer = null;
  function dtMsg(kind, text) {
    var el = $('dtMsg'); if (!el) return;
    el.textContent = text; el.className = 'dt-msg ' + kind;
    if (dtMsgTimer) clearTimeout(dtMsgTimer);
    dtMsgTimer = setTimeout(function () { el.textContent = ''; el.className = 'dt-msg'; }, 8000);
  }
  function saveDT() {
    var labelEl = $('dtLabel');
    var label = labelEl ? labelEl.value : '';
    var json = dtSerialize(collectInputs(), label, SOLVER.VERSION);
    var name = dtFileName(label, new Date());
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    dtMsg('ok', t('dtSaved').replace('{name}', name));
  }
  function loadDTText(text) {
    var res = dtParse(text);
    if (!res.ok) { dtMsg('err', t(res.code === 'DT_PARSE' ? 'dtErrParse' : 'dtErrFormat')); return; }
    var p = res.payload;
    /* Identisch zum Preset-Mechanismus: leeren, fuellen, pruefen, rechnen. */
    Object.keys(fieldEls).forEach(function (k) { ctrlClear(k); });
    Object.keys(p.input).forEach(function (k) { if (fieldEls[k] != null) ctrlSet(k, p.input[k]); });
    var labelEl = $('dtLabel'); if (labelEl) labelEl.value = p.label || '';
    markCustomPreset();
    liveValidate();
    compute();
    if (p.version && p.version !== SOLVER.VERSION) dtMsg('warn', t('dtLoadedVer').replace('{v}', p.version));
    else dtMsg('ok', t('dtLoaded'));
  }
  function loadDTFile(file) {
    var r = new FileReader();
    r.onload = function () { loadDTText(String(r.result)); };
    r.onerror = function () { dtMsg('err', t('dtErrParse')); };
    r.readAsText(file);
  }

  /* ----------------------------------------------------------- Sprache/Theme */
  function snapshotForm() { var s = {}; Object.keys(fieldEls).forEach(function (k) { s[k] = ctrlGet(k); }); return s; }
  function restoreForm(s) { Object.keys(fieldEls).forEach(function (k) { if (s[k] !== undefined && fieldEls[k]) ctrlSet(k, s[k]); }); }
  function applyLang() {
    document.documentElement.lang = lang;
    var hadForm = Object.keys(fieldEls).length > 0;
    var snap = hadForm ? snapshotForm() : null;
    if (hadForm) { buildForm(); restoreForm(snap); }   // Feldtexte/Optionen in neuer Sprache, Werte bleiben
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) { var key = nodes[i].getAttribute('data-i18n'); nodes[i].textContent = t(key); }
    var phs = document.querySelectorAll('[data-i18n-ph]');
    for (var q = 0; q < phs.length; q++) phs[q].setAttribute('placeholder', t(phs[q].getAttribute('data-i18n-ph')));
    // Presetliste (customOpt) + Empfehlungs-Suffix neu, ohne Auswahl zu verlieren
    var cur = $('presetSel').value; fillPresetSelect(); $('presetSel').value = cur;
    var btns = document.querySelectorAll('#langSwitch .lang-btn');
    for (var j = 0; j < btns.length; j++) btns[j].classList.toggle('active', btns[j].getAttribute('data-lang') === lang);
    updateDependencies();
    if (lastResult) renderResults(lastResult); else { var h = $('resultHost'); if (h.querySelector('.status-banner.idle')) { h.innerHTML = ''; h.appendChild(banner('idle', t('resultIdle'))); } resetViz(); }
    if (hadForm) liveValidate();
  }
  function setLang(l) { lang = l; localStorage.setItem('dts-lang', l); applyLang(); }

  function applyTheme(theme) { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('dts-theme', theme); }

  /* --------------------------------------------------------------- Init/Wire */
  function on(id, ev, fn) { var e = $(id); if (e) e.addEventListener(ev, fn); }
  function init() {
    var theme = localStorage.getItem('dts-theme') || 'dark';
    applyTheme(theme);

    buildSteps();
    buildForm();
    fillPresetSelect();
    applyLang();

    on('langSwitch', 'click', function (e) { var b = e.target.closest('.lang-btn'); if (b) setLang(b.getAttribute('data-lang')); });
    on('themeBtn', 'click', function () { applyTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'); });
    on('infoBtn', 'click', openInfo);
    on('modalClose', 'click', closeModal);
    on('modal', 'click', function (e) { if (e.target === $('modal')) closeModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
    on('calcBtn', 'click', compute);
    on('resetBtn', 'click', resetForm);
    on('advToggle', 'change', function () { document.body.classList.toggle('show-adv', this.checked); });
    on('presetSel', 'change', function () { if (this.value) loadPreset(this.value); });
    on('saveBtn', 'click', saveDT);
    on('loadBtn', 'click', function () { var f = $('dtFile'); if (f) f.click(); });
    on('dtFile', 'change', function () { if (this.files && this.files[0]) loadDTFile(this.files[0]); this.value = ''; });

    // Startbeispiel laden (validiertes M12-Beispiel), damit sofort etwas Sinnvolles steht
    var list = SOLVER.listPresets();
    if (list.length) { var sel = $('presetSel'); if (sel) { sel.value = list[0].id; loadPreset(list[0].id); } }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
