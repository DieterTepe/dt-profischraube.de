/* ============================================================================
 * DT-ProfiSchraube · ui.js
 * Bindeglied zwischen Engine (daten/validate/solver) und Oberflaeche.
 * - Formular wird vollstaendig aus dem FIELDS-Schema erzeugt
 * - Auswahllisten aus fieldOptions, Hilfe-Overlay aus fieldHelp
 * - Live-Pruefung ueber validateInput (Fehler blockieren, Warnungen weisen hin)
 * - "Beispiel laden" aus listPresets, Berechnen ueber computeJoint
 * - Bedien-Oberflaeche DE/EN/PT; Hell/Dunkel; alles offline (globale Objekte)
 * Feldbeschriftungen/Hilfe sind aktuell deutsch (aus dem Schema) — die
 * Mehrsprachigkeit der Feldtexte ist der naechste i18n-Schritt.
 * ========================================================================== */
(function () {
  'use strict';

  var DATA = window.DTSData, VALID = window.DTSValidate, SOLVER = window.DTSSolver;
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
      vizSoon: 'Verspannungsschaubild & Querschnitt', vizSoon2: 'Die maßstäbliche Live-Zeichnung folgt im nächsten Schritt.',
      resultIdle: 'Werte eingeben und „Berechnen" wählen.',
      footNote: 'Engine v0.7.0 · Berechnung ohne Gewähr, vor Produktivnutzung gegen die Originalnorm prüfen.',
      grp_Schraube: 'Schraube & Werkstoff', grp_Anziehen: 'Reibung & Anziehen', grp_Geometrie: 'Verbindung & Geometrie',
      grp_Belastung: 'Belastung', grp_Setzen: 'Setzen & Trennflächen',
      statusOk: 'Berechnung vollständig.', statusInvalid: 'Eingaben unvollständig oder ungültig — bitte korrigieren.',
      kvCaption: 'Weitere Kennwerte', recommended: 'empfohlen', nb: 'n. b.', customOpt: '— eigene Eingabe —',
      tagWarn: 'Grenze', tagAssume: 'Annahme', tagPending: 'offen',
      sub_F: 'Fließen (Streckgrenze)', sub_D: 'Dauerhaltbarkeit', sub_P: 'Flächenpressung', sub_G: 'Gleiten/Reibschluss',
      na_D: 'keine Wechsel-/Schwelllast (F_Ao/F_Au)', na_P: 'keine Grenzpressung p_G angegeben', na_G: 'keine Querkraft (F_Q) — kein Gleitnachweis nötig',
      thrNote: 'Ampel sind Richtwerte (grün ≥ 1,2 · gelb ≥ 1,0 · rot < 1,0). Die erforderliche Sicherheit hängt vom Anwendungsfall ab.',
      preloadOk: 'F_Mmax ≤ F_Mzul (Montagevorspannung zulässig)', preloadBad: 'F_Mmax > F_Mzul — Schraube/Klasse zu klein',
      options: 'Auswahlmöglichkeiten', close: 'Schließen', fieldsDe: 'Feldtexte derzeit nur auf Deutsch.'
    },
    en: {
      tagline: 'Bolted joint to VDI 2230 Part 1', loadExample: 'Load example',
      calc: 'Calculate', reset: 'Clear', showAdvanced: 'Show advanced fields',
      inputTitle: 'Input', resultTitle: 'Result', vizTitle: 'Visualisation',
      vizSoon: 'Joint diagram & cross-section', vizSoon2: 'The scaled live drawing follows in the next step.',
      resultIdle: 'Enter values and choose “Calculate”.',
      footNote: 'Engine v0.7.0 · No warranty; verify against the original standard before production use.',
      grp_Schraube: 'Bolt & material', grp_Anziehen: 'Friction & tightening', grp_Geometrie: 'Joint & geometry',
      grp_Belastung: 'Loading', grp_Setzen: 'Embedding & interfaces',
      statusOk: 'Calculation complete.', statusInvalid: 'Input incomplete or invalid — please correct.',
      kvCaption: 'Further values', recommended: 'recommended', nb: 'n/a', customOpt: '— custom input —',
      tagWarn: 'limit', tagAssume: 'assumption', tagPending: 'open',
      sub_F: 'Yield', sub_D: 'Fatigue', sub_P: 'Surface pressure', sub_G: 'Slipping/friction grip',
      na_D: 'no fluctuating load (F_Ao/F_Au)', na_P: 'no limit pressure p_G given', na_G: 'no transverse force (F_Q) — no slip check needed',
      thrNote: 'Indicator colours are guide values (green ≥ 1.2 · amber ≥ 1.0 · red < 1.0). Required safety depends on the application.',
      preloadOk: 'F_Mmax ≤ F_Mzul (assembly preload admissible)', preloadBad: 'F_Mmax > F_Mzul — bolt/class too small',
      options: 'Options', close: 'Close', fieldsDe: 'Field texts are German for now.'
    },
    pt: {
      tagline: 'União aparafusada conforme VDI 2230 Parte 1', loadExample: 'Carregar exemplo',
      calc: 'Calcular', reset: 'Limpar', showAdvanced: 'Mostrar campos avançados',
      inputTitle: 'Entrada', resultTitle: 'Resultado', vizTitle: 'Visualização',
      vizSoon: 'Diagrama de aperto e secção', vizSoon2: 'O desenho à escala segue no próximo passo.',
      resultIdle: 'Introduza valores e escolha “Calcular”.',
      footNote: 'Engine v0.7.0 · Sem garantia; verifique com a norma original antes de uso produtivo.',
      grp_Schraube: 'Parafuso e material', grp_Anziehen: 'Atrito e aperto', grp_Geometrie: 'União e geometria',
      grp_Belastung: 'Carregamento', grp_Setzen: 'Assentamento e interfaces',
      statusOk: 'Cálculo completo.', statusInvalid: 'Entrada incompleta ou inválida — corrija.',
      kvCaption: 'Outros valores', recommended: 'recomendado', nb: 'n/d', customOpt: '— entrada própria —',
      tagWarn: 'limite', tagAssume: 'suposição', tagPending: 'pendente',
      sub_F: 'Escoamento', sub_D: 'Fadiga', sub_P: 'Pressão superficial', sub_G: 'Escorregamento/atrito',
      na_D: 'sem carga alternada (F_Ao/F_Au)', na_P: 'sem pressão limite p_G', na_G: 'sem força transversal (F_Q) — sem verificação de escorregamento',
      thrNote: 'As cores são valores indicativos (verde ≥ 1,2 · amarelo ≥ 1,0 · vermelho < 1,0). A segurança exigida depende da aplicação.',
      preloadOk: 'F_Mmax ≤ F_Mzul (pré-tensão de montagem admissível)', preloadBad: 'F_Mmax > F_Mzul — parafuso/classe pequenos demais',
      options: 'Opções', close: 'Fechar', fieldsDe: 'Os textos dos campos estão em alemão por agora.'
    }
  };
  var GROUP_ORDER = ['Schraube', 'Anziehen', 'Geometrie', 'Belastung', 'Setzen'];
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

  var fieldEls = {};   // key -> input/select Element
  var fieldRows = {};  // key -> .field Element
  var lastResult = null;

  /* --------------------------------------------------------- Formular bauen */
  function buildForm() {
    var host = $('formHost'); host.innerHTML = '';
    GROUP_ORDER.forEach(function (grp, gi) {
      var keysInGroup = Object.keys(FIELDS).filter(function (k) { return FIELDS[k].group === grp; });
      if (!keysInGroup.length) return;
      var det = el('details', 'form-group'); if (gi < 3) det.open = true;
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

    var lab = el('label', 'field-label');
    lab.setAttribute('for', 'f_' + key);
    lab.appendChild(document.createTextNode(f.label + ' '));
    if (f.unit) { var u = el('span', 'unit', '[' + f.unit + ']'); lab.appendChild(u); }
    var hb = el('button', 'help-btn', 'i'); hb.type = 'button';
    hb.setAttribute('aria-label', 'Hilfe: ' + f.label);
    hb.addEventListener('click', function (ev) { ev.preventDefault(); openHelp(key); });
    lab.appendChild(hb);
    row.appendChild(lab);

    var ctrl;
    if (f.type === 'enum') {
      ctrl = el('select'); ctrl.id = 'f_' + key;
      var opts = VALID.fieldOptions(f.enumOf);
      if (!f.required) { ctrl.appendChild(new Option('—', '')); }
      opts.forEach(function (o) {
        var label = o.value + (o.recommended ? ' · ' + t('recommended') : '');
        var op = new Option(label, o.value);
        if (o.recommended) op.selected = true;
        ctrl.appendChild(op);
      });
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
    if (f.type === 'enum') {
      var rec = VALID.fieldOptions(f.enumOf).filter(function (o) { return o.recommended; })[0];
      if (rec) { var r = el('div', 'field-rec', '★ ' + t('recommended') + ': ' + rec.value); row.appendChild(r); }
    }
    return row;
  }

  /* ----------------------------------------------------------- Hilfe-Overlay */
  function openHelp(key) {
    var f = FIELDS[key];
    $('modalTitle').textContent = f.label + (f.unit ? '  [' + f.unit + ']' : '');
    var body = $('modalBody'); body.innerHTML = '';
    body.appendChild(el('p', null, VALID.fieldHelp(key)));

    var range = '';
    if (f.type === 'number') {
      if (f.min != null || f.max != null) range += 'Zulässig: ' + (f.min != null ? '≥ ' + f.min : '') + (f.min != null && f.max != null ? '  ·  ' : '') + (f.max != null ? '≤ ' + f.max : '');
      if (f.warnMin != null || f.warnMax != null) range += (range ? '\n' : '') + 'Üblich: ' + (f.warnMin != null ? f.warnMin : '') + (f.warnMax != null ? '…' + f.warnMax : '') + (f.unit ? ' ' + f.unit : '');
    }
    if (range) { var rd = el('div', 'modal-range'); rd.style.whiteSpace = 'pre-line'; rd.textContent = range; body.appendChild(rd); }

    if (f.type === 'enum') {
      body.appendChild(el('div', null, t('options'))).style.cssText = 'font-size:12px;color:var(--faint);text-transform:uppercase;letter-spacing:.08em;margin:4px 0';
      var ul = el('ul', 'opt-list');
      VALID.fieldOptions(f.enumOf).forEach(function (o) {
        var li = el('li');
        var b = el('b', null, o.value); li.appendChild(b);
        if (o.note) li.appendChild(document.createTextNode('  ' + o.note));
        if (o.recommended) li.appendChild(el('span', 'rec', '★ ' + t('recommended')));
        ul.appendChild(li);
      });
      body.appendChild(ul);
    }
    body.appendChild(el('div', 'modal-diagram-slot')); // spaeter: SVG-Skizze
    $('modal').classList.add('open');
  }
  function closeModal() { $('modal').classList.remove('open'); }

  function openInfo() {
    $('modalTitle').textContent = 'DT-ProfiSchraube';
    var b = $('modalBody'); b.innerHTML = '';
    b.appendChild(el('p', null, t('tagline') + '.'));
    b.appendChild(el('p', null, t('footNote')));
    b.appendChild(el('p', null, t('thrNote')));
    if (lang !== 'de') b.appendChild(el('p', null, t('fieldsDe')));
    $('modal').classList.add('open');
  }

  /* ----------------------------------------------------- Eingaben einsammeln */
  function collectInputs() {
    var inp = {};
    Object.keys(FIELDS).forEach(function (key) {
      var f = FIELDS[key], elx = fieldEls[key]; if (!elx) return;
      if (elx.disabled) return;
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
  function applyMessages(items) {
    items.forEach(function (it) {
      var r = fieldRows[it.field]; if (!r) return;
      var isErr = it.severity === 'error';
      if (isErr) r.classList.add('has-error'); else if (!r.classList.contains('has-error')) r.classList.add('has-warning');
      var m = r.querySelector('.field-msg'); if (!m) return;
      if (m.textContent && m.className.indexOf('error') >= 0) return; // Fehler hat Vorrang
      m.textContent = it.text; m.className = 'field-msg ' + (isErr ? 'error' : 'warning');
    });
  }
  function updateDependencies() {
    Object.keys(FIELDS).forEach(function (key) {
      var dep = FIELDS[key].dependsOn; if (!dep) return;
      var drv = fieldEls[dep], row = fieldRows[key], ctrl = fieldEls[key];
      if (!drv || !row || !ctrl) return;
      var dv = drv.value;
      var active = (dv !== '' && dv != null && Number(dv) !== 0);
      row.classList.toggle('is-disabled', !active);
      ctrl.disabled = !active;
    });
  }
  function clearNeedsInput() {
    Object.keys(fieldRows).forEach(function (k) { var b = fieldRows[k].querySelector('.help-btn'); if (b) b.classList.remove('needs-input'); });
  }
  function markNeedsInput(errors) {
    var codes = { REQUIRED: 1, FRICTION_MISSING: 1, TIGHTENING_MISSING: 1, NOT_A_NUMBER: 1 };
    errors.forEach(function (e) {
      if (!codes[e.code]) return;
      var r = fieldRows[e.field]; if (!r) return;
      var b = r.querySelector('.help-btn'); if (b) b.classList.add('needs-input');
    });
  }
  function liveValidate() {
    updateDependencies();
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
    var R = SOLVER.computeJoint(collectInputs());
    var host = $('resultHost');
    clearFieldStates();
    if (R.status === 'invalid') {
      applyMessages(R.errors); applyMessages(R.warnings || []);
      host.innerHTML = '';
      host.appendChild(banner('bad', t('statusInvalid')));
      var ul = el('div', 'notes');
      R.errors.forEach(function (e) { ul.appendChild(noteLine('warning', t('tagWarn'), e.text)); });
      host.appendChild(ul);
      setSteps(false);
      lastResult = null;
      return;
    }
    applyMessages(R.warnings || []);
    lastResult = R;
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
    host.appendChild(grid);

    var thr = el('div', 'note-line assume'); thr.style.marginTop = '10px';
    thr.appendChild(el('span', 'tag', '!')); thr.appendChild(el('span', null, t('thrNote')));
    host.appendChild(thr);

    // Kennwerte-Tabelle
    var tbl = el('table', 'kv-table');
    var cap = el('caption', null, t('kvCaption')); tbl.appendChild(cap);
    function row(k, vHtml) { var tr = el('tr'); tr.appendChild(el('td', 'k', k)); var td = el('td', 'v'); td.innerHTML = vHtml; tr.appendChild(td); tbl.appendChild(tr); }
    function unit(u) { return ' <span class="u">' + u + '</span>'; }
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
    row('σ_z,max', fmt(R.sigma_zmax, 0) + unit('N/mm²'));
    row('σ_red,B', fmt(R.sigma_redB, 0) + unit('N/mm²'));
    host.appendChild(tbl);

    // Hinweise: Vorspannungs-Check, Warnungen, Annahmen, Offene Punkte
    var notes = el('div', 'notes');
    notes.appendChild(noteLine(R.preloadOK ? 'assume' : 'warning', R.preloadOK ? '✓' : t('tagWarn'), R.preloadOK ? t('preloadOk') : t('preloadBad')));
    (R.warnings || []).forEach(function (w) { notes.appendChild(noteLine('warning', t('tagWarn'), w.text)); });
    (R.notes && R.notes.assumptions || []).forEach(function (a) { notes.appendChild(noteLine('assume', t('tagAssume'), a)); });
    (R.notes && R.notes.pending || []).forEach(function (p) { notes.appendChild(noteLine('assume', t('tagPending'), p)); });
    host.appendChild(notes);

    setSteps(true);
  }

  /* ------------------------------------------------------------- Step-Strip */
  function buildSteps() {
    var s = $('stepStrip'); s.innerHTML = '';
    for (var i = 0; i <= 13; i++) { var c = el('span', 'step-chip', 'R' + i); c.id = 'step-R' + i; s.appendChild(c); }
  }
  var DONE_STEPS = ['R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'R12', 'R13'];
  function setSteps(on) {
    for (var i = 0; i <= 13; i++) { var c = $('step-R' + i); if (c) c.classList.remove('on'); }
    if (on) DONE_STEPS.forEach(function (r) { var c = $('step-' + r); if (c) c.classList.add('on'); });
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
    Object.keys(fieldEls).forEach(function (k) { fieldEls[k].value = ''; });
    Object.keys(p.input).forEach(function (k) { if (fieldEls[k] != null) fieldEls[k].value = p.input[k]; });
    liveValidate();
    compute();
  }
  function markCustomPreset() { $('presetSel').value = ''; }
  function resetForm() {
    Object.keys(fieldEls).forEach(function (k) {
      var f = FIELDS[k];
      if (f.type === 'enum') { var rec = VALID.fieldOptions(f.enumOf).filter(function (o) { return o.recommended; })[0]; fieldEls[k].value = rec ? rec.value : ''; }
      else fieldEls[k].value = '';
    });
    $('presetSel').value = '';
    $('resultHost').innerHTML = ''; $('resultHost').appendChild(banner('idle', t('resultIdle')));
    setSteps(false); lastResult = null;
    liveValidate();
  }

  /* ----------------------------------------------------------- Sprache/Theme */
  function applyLang() {
    document.documentElement.lang = lang;
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) { var key = nodes[i].getAttribute('data-i18n'); nodes[i].textContent = t(key); }
    // Presetliste (customOpt) + Empfehlungs-Suffix neu, ohne Auswahl zu verlieren
    var cur = $('presetSel').value; fillPresetSelect(); $('presetSel').value = cur;
    var btns = document.querySelectorAll('#langSwitch .lang-btn');
    for (var j = 0; j < btns.length; j++) btns[j].classList.toggle('active', btns[j].getAttribute('data-lang') === lang);
    if (lastResult) renderResults(lastResult); else { var h = $('resultHost'); if (h.querySelector('.status-banner.idle')) { h.innerHTML = ''; h.appendChild(banner('idle', t('resultIdle'))); } }
  }
  function setLang(l) { lang = l; localStorage.setItem('dts-lang', l); applyLang(); }

  function applyTheme(theme) { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('dts-theme', theme); }

  /* --------------------------------------------------------------- Init/Wire */
  function init() {
    var theme = localStorage.getItem('dts-theme') || 'dark';
    applyTheme(theme);

    buildSteps();
    buildForm();
    fillPresetSelect();
    applyLang();

    $('langSwitch').addEventListener('click', function (e) { var b = e.target.closest('.lang-btn'); if (b) setLang(b.getAttribute('data-lang')); });
    $('themeBtn').addEventListener('click', function () { applyTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'); });
    $('infoBtn').addEventListener('click', openInfo);
    $('modalClose').addEventListener('click', closeModal);
    $('modal').addEventListener('click', function (e) { if (e.target === $('modal')) closeModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
    $('calcBtn').addEventListener('click', compute);
    $('resetBtn').addEventListener('click', resetForm);
    $('advToggle').addEventListener('change', function () { document.body.classList.toggle('show-adv', this.checked); });
    $('presetSel').addEventListener('change', function () { if (this.value) loadPreset(this.value); });

    // Startbeispiel laden (validiertes M12-Beispiel), damit sofort etwas Sinnvolles steht
    var list = SOLVER.listPresets();
    if (list.length) { $('presetSel').value = list[0].id; loadPreset(list[0].id); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
