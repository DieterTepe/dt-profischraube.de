/* ============================================================================
 * DT-ProfiSchraube · rechenweg.js  (dokumentierter, selbstpruefender Rechenweg)
 * ----------------------------------------------------------------------------
 * build(R, inp, opts) -> { steps: [ ... ] }
 *   R    = Ergebnisobjekt aus solver.computeJoint (status 'ok')
 *   inp  = die Eingaben (fuer Rohlasten wie F_Kerf, F_Ao ...)
 *   opts = { lang:'de'|'en'|'pt', fmt(x,dec), fmtExp(x), eScrew, data }
 *
 * Jeder Schritt zeigt: allgemeine Formel -> eingesetzte Werte -> Ergebnis,
 * mit kurzem Hinweis und VDI-Bezug. Entscheidend: jeder physikalische Schritt
 * wird hier AUS SEINER FORMEL NEU BERECHNET (step._val) und gegen den Engine-
 * Wert (step._exp) geprueft (step.ok). Der Node-Test prueft das fuer alle
 * Beispiele -> die angezeigten Zahlen koennen nie von der Rechnung abweichen.
 *
 * UMD: Node (Tests) + Browser (klassisches <script src>). Keine Abhaengigkeit
 * ausser den uebergebenen Objekten.
 * ========================================================================== */
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.DTSRechenweg = factory(); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var C_PITCH = 1 / (2 * Math.PI);                       // 0.159155
  var C_FLANK = 1 / (2 * Math.cos(30 * Math.PI / 180));  // 0.577350

  function defFmt(x, d) { if (x == null || !isFinite(x)) return '–'; return Number(x).toFixed(d == null ? 2 : d); }
  function defExp(x) { if (x == null || !isFinite(x)) return '–'; var p = Number(x).toExponential(3).split('e'); return p[0] + '·10^' + parseInt(p[1], 10); }

  /* rein relativer Vergleich -> faengt auch Fehler in sehr kleinen Groessen (delta ~1e-6) */
  function close(a, b, tol) {
    tol = tol || 1e-6;
    if (a === b) return true;
    var denom = Math.max(Math.abs(a), Math.abs(b));
    if (denom < 1e-300) return Math.abs(a - b) < 1e-12;
    return Math.abs(a - b) / denom <= tol;
  }

  function coneComp(E_P, d_w, d_h, w, tanPhi, D_top) {
    var num = (d_w + d_h) * (D_top - d_h);
    var den = (d_w - d_h) * (D_top + d_h);
    return 2 * Math.log(num / den) / (w * E_P * Math.PI * d_h * tanPhi);
  }

  function build(R, inp, opts) {
    opts = opts || {};
    inp = inp || {};
    if (!R || R.status !== 'ok') return { steps: [] };
    var lang = opts.lang || 'de';
    var eScrew = (opts.eScrew != null) ? opts.eScrew : 205000;
    var nf = opts.fmt || defFmt;
    var ef = opts.fmtExp || defExp;
    function T(o) { return (o && (o[lang] || o.de)) || ''; }
    function LT(de, en, pt) { return lang === 'en' ? en : (lang === 'pt' ? pt : de); }

    var g = R.geometry;
    var Rp = R.strength.Rp02, Rm = R.strength.Rm;
    var muG = R.muG, muK = R.muK, alphaA = R.alphaA, n = R.n;
    var conn = inp.connection || 'DSV';
    var dFvth = inp.deltaFvth || 0;
    var F_A = (inp.F_A != null) ? inp.F_A : (inp.F_Ao != null ? inp.F_Ao : 0);
    var F_Ao = (inp.F_Ao != null) ? inp.F_Ao : F_A;

    var steps = [];
    function step(o) {
      o._exp = (o._exp == null) ? o._val : o._exp;
      o.ok = close(o._val, o._exp, o.tol || 1e-6);
      o.title = T(o.titleI); o.note = T(o.noteI);
      delete o.titleI; delete o.noteI;
      steps.push(o);
      return o;
    }

    /* ---- R3: Schraubennachgiebigkeit delta_S ---- */
    // E_S bevorzugt aus dem Engine-Ergebnis (beruecksichtigt rostfreie Klassen ~200 GPa),
    // sonst Nutzerwert, sonst Default.
    var E_S = (R.E_S != null) ? R.E_S : ((inp.E_S != null) ? inp.E_S : eScrew);
    var E_M = (inp.E_M != null) ? inp.E_M : (conn === 'ESV' ? inp.E_P : E_S);
    var A_N = Math.PI / 4 * g.d * g.d, A_d3 = Math.PI / 4 * g.d3 * g.d3;
    var l_SK = (inp.l_SK != null) ? inp.l_SK : 0.5 * g.d;
    var l_G = (inp.l_G != null) ? inp.l_G : 0.5 * g.d;
    var l_M = (inp.l_M != null) ? inp.l_M : 0.4 * g.d;
    var lShank = inp.lShank || 0, lThreadFree = inp.lThreadFree || 0;
    var dS = l_SK / (E_S * A_N) + lShank / (E_S * A_N) + lThreadFree / (E_S * A_d3) + l_G / (E_S * A_d3) + l_M / (E_M * A_N);
    step({
      id: 'dS', phase: 'R3',
      titleI: { de: 'Schraubennachgiebigkeit δ_S', en: 'Bolt compliance δ_S', pt: 'Flexibilidade do parafuso δ_S' },
      formula: 'δ_S = l_SK/(E_S·A_N) + l_' + LT('Schaft', 'shank', 'haste') + '/(E_S·A_N) + l_' + LT('Gew', 'thr', 'rosca') + '/(E_S·A_d3) + l_G/(E_S·A_d3) + l_M/(E_M·A_N)',
      sub: 'A_N = ' + nf(A_N, 2) + ' mm²,  A_d3 = ' + nf(A_d3, 2) + ' mm²,  E_S = ' + nf(E_S, 0) + ' N/mm²'
        + '\nl_SK=' + nf(l_SK, 2) + ', l_' + LT('Schaft', 'shank', 'haste') + '=' + nf(lShank, 2) + ', l_' + LT('Gew', 'thr', 'rosca') + '=' + nf(lThreadFree, 2) + ', l_G=' + nf(l_G, 2) + ', l_M=' + nf(l_M, 2) + ' mm',
      result: ef(dS) + ' mm/N',
      _val: dS, _exp: R.deltaS,
      noteI: { de: 'Reihenschaltung der Feder-Abschnitte (Kopf, Schaft, freies & eingeschr. Gewinde, Mutter/Einschraubteil).', en: 'Series connection of the spring segments (head, shank, free & engaged thread, nut/tapped part).', pt: 'Associação em série dos troços elásticos (cabeça, haste, rosca livre e engatada, porca/peça roscada).' },
      ref: 'VDI 2230 Bl.1 · R3'
    });

    /* ---- R3: Plattennachgiebigkeit delta_P ---- */
    var dP, dPmodel, tanPhi = R.tanPhi, DAGr = R.DAGr, dPformula;
    if (inp.deltaP != null) {
      dP = inp.deltaP; dPmodel = 'override';
      dPformula = 'δ_P = ' + ef(dP) + ' mm/N (vorgegeben)';
    } else {
      var w = (conn === 'ESV') ? 2 : 1;
      var betaL = inp.l_K / inp.d_w, y = inp.D_A / inp.d_w;
      tanPhi = (conn === 'ESV')
        ? (0.348 + 0.013 * Math.log(betaL) + 0.193 * Math.log(y))
        : (0.362 + 0.032 * Math.log(betaL / 2) + 0.153 * Math.log(y));
      if (!(tanPhi > 0.05)) tanPhi = 0.05;   // identischer Robustheits-Riegel wie solver.js coneAngle (TANPHI_MIN)
      DAGr = inp.d_w + w * inp.l_K * tanPhi;
      if (inp.D_A <= inp.d_w) {
        var Ah = Math.PI / 4 * (inp.D_A * inp.D_A - inp.d_h * inp.d_h);
        dP = inp.l_K / (inp.E_P * Ah); dPmodel = 'sleeve';
        dPformula = 'δ_P = l_K / (E_P · π/4·(D_A² − d_h²))';
      } else if (inp.D_A >= DAGr) {
        dP = coneComp(inp.E_P, inp.d_w, inp.d_h, w, tanPhi, DAGr); dPmodel = 'cone';
        dPformula = 'δ_P = 2·ln[((d_w+d_h)(D_A,' + LT('Gr', 'lim', 'lim') + '−d_h)) / ((d_w−d_h)(D_A,' + LT('Gr', 'lim', 'lim') + '+d_h))] / (w·E_P·π·d_h·tanφ)';
      } else {
        var dCone = coneComp(inp.E_P, inp.d_w, inp.d_h, w, tanPhi, inp.D_A);
        var lV = (inp.D_A - inp.d_w) / (2 * tanPhi);
        var lH = inp.l_K - 2 * lV / w;
        var Asl = Math.PI / 4 * (inp.D_A * inp.D_A - inp.d_h * inp.d_h);
        var dSleeve = lH > 0 ? lH / (inp.E_P * Asl) : 0;
        dP = dCone + dSleeve; dPmodel = 'cone+sleeve';
        dPformula = 'δ_P = δ_' + LT('Kegel', 'cone', 'cone') + '(' + LT('bis', 'to', 'até') + ' D_A) + l_H/(E_P·π/4·(D_A²−d_h²))';
      }
    }
    var modelName = { sleeve: { de: 'Hülse', en: 'sleeve', pt: 'manga' }, cone: { de: 'Verformungskegel', en: 'deformation cone', pt: 'cone de deformação' }, 'cone+sleeve': { de: 'Kegel + Hülse', en: 'cone + sleeve', pt: 'cone + manga' }, override: { de: 'vorgegeben', en: 'given', pt: 'fornecido' } };
    step({
      id: 'dP', phase: 'R3',
      titleI: { de: 'Plattennachgiebigkeit δ_P', en: 'Clamped-parts compliance δ_P', pt: 'Flexibilidade das peças δ_P' },
      formula: dPformula,
      sub: (dPmodel === 'override') ? '—'
        : (LT('Modell', 'Model', 'Modelo') + ': ' + T(modelName[dPmodel]) + ',  tanφ = ' + nf(tanPhi, 3) + ',  D_A,' + LT('Gr', 'lim', 'lim') + ' = ' + nf(DAGr, 1) + ' mm'
          + '\nE_P = ' + nf(inp.E_P, 0) + ' N/mm²,  d_w=' + nf(inp.d_w, 1) + ', d_h=' + nf(inp.d_h, 1) + ', D_A=' + nf(inp.D_A, 1) + ', l_K=' + nf(inp.l_K, 1) + ' mm'),
      result: ef(dP) + ' mm/N',
      _val: dP, _exp: R.deltaP,
      noteI: { de: 'Fallabhängig: Hülse (D_A ≤ d_w) oder empirischer Verformungskegel. w = 1 (DSV) / 2 (ESV).', en: 'Case-dependent: sleeve (D_A ≤ d_w) or empirical deformation cone. w = 1 (DSV) / 2 (ESV).', pt: 'Conforme o caso: manga (D_A ≤ d_w) ou cone de deformação empírico. w = 1 (DSV) / 2 (ESV).' },
      ref: 'VDI 2230 Bl.1 · R3'
    });

    /* ---- R3: Kraftverhaeltnis Phi_K, Phi_en ---- */
    var PhiK = dP / (dS + dP);
    step({
      id: 'PhiK', phase: 'R3',
      titleI: { de: 'Kraftverhältnis Φ_K', en: 'Force ratio Φ_K', pt: 'Relação de forças Φ_K' },
      formula: 'Φ_K = δ_P / (δ_S + δ_P)',
      sub: 'Φ_K = ' + ef(dP) + ' / (' + ef(dS) + ' + ' + ef(dP) + ')',
      result: nf(PhiK, 4),
      _val: PhiK, _exp: R.PhiK,
      noteI: { de: 'Anteil einer Betriebskraft, der die Schraube zusätzlich belastet (ohne Krafteinleitung).', en: 'Share of an operating force that additionally loads the bolt (before load introduction).', pt: 'Parte de uma força de serviço que solicita adicionalmente o parafuso (antes da introdução).' },
      ref: 'VDI 2230 Bl.1 · R3'
    });
    var PhiEn = n * PhiK;
    step({
      id: 'PhiEn', phase: 'R3',
      titleI: { de: 'Kraftverhältnis Φ_en (mit Krafteinleitung n)', en: 'Force ratio Φ_en (with load introduction n)', pt: 'Relação de forças Φ_en (com introdução n)' },
      formula: 'Φ_en = n · δ_P/(δ_S + δ_P) = n · Φ_K',
      sub: 'Φ_en = ' + nf(n, 2) + ' · ' + nf(PhiK, 4),
      result: nf(PhiEn, 4),
      _val: PhiEn, _exp: R.PhiEn,
      noteI: { de: 'n berücksichtigt, wo die Kraft eingeleitet wird (0…1). Ungünstig/sicher: 0,5.', en: 'n accounts for where the force is introduced (0…1). Unfavourable/safe: 0.5.', pt: 'n considera onde a força é introduzida (0…1). Desfavorável/seguro: 0,5.' },
      ref: 'VDI 2230 Bl.1 · R3'
    });

    /* ---- R4: Setzbetrag f_Z (gegeben aus Tabelle) und Vorspannverlust F_Z ---- */
    step({
      id: 'fZ', phase: 'R4', given: true,
      titleI: { de: 'Setzbetrag f_Z (aus Tabelle)', en: 'Embedding amount f_Z (from table)', pt: 'Assentamento f_Z (da tabela)' },
      formula: 'f_Z = f_' + LT('Gew', 'thr', 'rosca') + ' + (' + LT('Auflagen', 'seats', 'apoios') + ')·f_' + LT('Aufl', 'seat', 'apoio') + ' + (' + LT('Trennfugen', 'interfaces', 'juntas') + ')·f_' + LT('Fuge', 'iface', 'junta'),
      sub: LT('Rautiefe Rz-Klasse', 'roughness Rz class', 'rugosidade classe Rz') + ' „' + (inp.rz || '') + '", ' + LT('Lastart', 'load type', 'tipo de carga') + ' ' + (inp.loadMode || 'axial'),
      result: nf(R.f_Z, 2) + ' µm',
      _val: R.f_Z, _exp: R.f_Z,
      noteI: { de: 'Tabellenwert nach Rauheit und Anzahl der Auflagen/Trennfugen (Eingangsgröße).', en: 'Tabulated value by roughness and number of seats/interfaces (input quantity).', pt: 'Valor tabelado por rugosidade e número de apoios/juntas (grandeza de entrada).' },
      ref: 'VDI 2230 Bl.1 · R4'
    });
    var F_Z = (R.f_Z / 1000) / (dS + dP);
    step({
      id: 'FZ', phase: 'R4',
      titleI: { de: 'Vorspannkraftverlust durch Setzen F_Z', en: 'Preload loss from embedding F_Z', pt: 'Perda de pré-tensão por assentamento F_Z' },
      formula: 'F_Z = (f_Z/1000) / (δ_S + δ_P)',
      sub: 'F_Z = (' + nf(R.f_Z, 2) + '/1000) / (' + ef(dS) + ' + ' + ef(dP) + ')',
      result: nf(F_Z, 0) + ' N',
      _val: F_Z, _exp: R.F_Z,
      noteI: { de: 'Der Setzweg baut Vorspannung ab — er wird bei der Montage vorgehalten.', en: 'The embedding travel reduces preload — it is compensated during assembly.', pt: 'O assentamento reduz a pré-tensão — é compensado na montagem.' },
      ref: 'VDI 2230 Bl.1 · R4'
    });

    /* ---- R5: Mindest-Montagevorspannkraft F_Mmin ---- */
    var plateRelief = (1 - PhiEn) * F_A;
    var F_Mmin = inp.F_Kerf + plateRelief + F_Z + dFvth;
    step({
      id: 'FMmin', phase: 'R5',
      titleI: { de: 'Mindest-Montagevorspannkraft F_Mmin', en: 'Minimum assembly preload F_Mmin', pt: 'Pré-tensão mínima de montagem F_Mmin' },
      formula: 'F_Mmin = F_Kerf + (1 − Φ_en)·F_A + F_Z + ΔF_Vth',
      sub: 'F_Mmin = ' + nf(inp.F_Kerf, 0) + ' + (1 − ' + nf(PhiEn, 4) + ')·' + nf(F_A, 0) + ' + ' + nf(F_Z, 0) + ' + ' + nf(dFvth, 0),
      result: nf(F_Mmin, 0) + ' N',
      _val: F_Mmin, _exp: R.F_Mmin,
      noteI: { de: 'Was die Verbindung mindestens braucht: Restklemmkraft, Kraftanteil der Platten, Setzverlust, Temperatur.', en: 'What the joint needs at minimum: residual clamp force, plate load share, embedding loss, temperature.', pt: 'O mínimo necessário: força residual de aperto, parcela das peças, perda por assentamento, temperatura.' },
      ref: 'VDI 2230 Bl.1 · R5'
    });

    /* ---- R6: Maximal-Montagevorspannkraft F_Mmax ---- */
    var F_Mmax = alphaA * F_Mmin;
    step({
      id: 'FMmax', phase: 'R6',
      titleI: { de: 'Maximale Montagevorspannkraft F_Mmax', en: 'Maximum assembly preload F_Mmax', pt: 'Pré-tensão máxima de montagem F_Mmax' },
      formula: 'F_Mmax = α_A · F_Mmin',
      sub: 'F_Mmax = ' + nf(alphaA, 2) + ' · ' + nf(F_Mmin, 0),
      result: nf(F_Mmax, 0) + ' N',
      _val: F_Mmax, _exp: R.F_Mmax,
      noteI: { de: 'Der Anziehfaktor α_A bildet die Streuung des Anziehverfahrens ab.', en: 'The tightening factor α_A represents the scatter of the tightening method.', pt: 'O fator de aperto α_A representa a dispersão do método de aperto.' },
      ref: 'VDI 2230 Bl.1 · R6'
    });

    /* ---- R7: Zulaessige Montagevorspannkraft F_Mzul ---- */
    var Wp = Math.PI / 16 * g.ds * g.ds * g.ds;
    var mQ = C_PITCH * g.P + C_FLANK * muG * g.d2;
    var kf = Math.sqrt(1 / (g.As * g.As) + 3 * (mQ / Wp) * (mQ / Wp));
    var F_Mzul = 0.9 * Rp / kf;
    step({
      id: 'FMzul', phase: 'R7',
      titleI: { de: 'Zulässige Montagevorspannkraft F_Mzul', en: 'Permissible assembly preload F_Mzul', pt: 'Pré-tensão de montagem admissível F_Mzul' },
      formula: 'F_Mzul = ν·R_p0,2 / √(1/A_S² + 3·(m/W_p)²),   m = P/(2π) + 0,577·μ_G·d_2,   W_p = π/16·d_S³,   ν = 0,9',
      sub: 'W_p = ' + nf(Wp, 1) + ' mm³,  m = ' + nf(mQ, 3) + ' mm,  A_S = ' + nf(g.As, 2) + ' mm²,  R_p0,2 = ' + nf(Rp, 0) + ' N/mm²'
        + '\nF_Mzul = 0,9·' + nf(Rp, 0) + ' / ' + nf(kf, 4),
      result: nf(F_Mzul, 0) + ' N',
      _val: F_Mzul, _exp: R.F_Mzul,
      noteI: { de: '90 % Ausnutzung der Streckgrenze unter Zug + Torsion aus dem Anziehen (von Mises).', en: '90 % utilisation of the yield point under tension + torsion from tightening (von Mises).', pt: '90 % de utilização do limite de escoamento sob tração + torção do aperto (von Mises).' },
      ref: 'VDI 2230 Bl.1 · R7'
    });
    var preloadTxt = (F_Mmax <= F_Mzul)
      ? { de: 'F_Mmax ≤ F_Mzul — Montagevorspannung zulässig.', en: 'F_Mmax ≤ F_Mzul — assembly preload admissible.', pt: 'F_Mmax ≤ F_Mzul — pré-tensão admissível.' }
      : { de: 'F_Mmax > F_Mzul — Schraube/Klasse zu klein!', en: 'F_Mmax > F_Mzul — bolt/class too small!', pt: 'F_Mmax > F_Mzul — parafuso/classe pequenos demais!' };

    /* ---- R13: Anziehdrehmoment M_A ---- */
    var D_Km = (inp.D_Km != null) ? inp.D_Km : (inp.d_w + inp.d_h) / 2;
    var M_G = F_Mzul * (C_PITCH * g.P + C_FLANK * muG * g.d2);
    var M_K = F_Mzul * muK * D_Km / 2;
    var M_A = M_G + M_K;
    step({
      id: 'MA', phase: 'R13',
      titleI: { de: 'Anziehdrehmoment M_A', en: 'Tightening torque M_A', pt: 'Binário de aperto M_A' },
      formula: 'M_A = F_Mzul·(P/(2π) + 0,577·μ_G·d_2 + μ_K·D_Km/2),   D_Km = (d_w + d_h)/2',
      sub: 'D_Km = ' + nf(D_Km, 2) + ' mm,  μ_G=' + nf(muG, 3) + ',  μ_K=' + nf(muK, 3)
        + '\nM_G = ' + nf(M_G / 1000, 2) + ' N·m,  M_K = ' + nf(M_K / 1000, 2) + ' N·m',
      result: nf(M_A / 1000, 2) + ' N·m',
      _val: M_A, _exp: R.M_A, tol: 1e-6,
      noteI: { de: 'Mit diesem Moment wird auf F_Mzul angezogen (Gewinde- + Kopfreibungsanteil).', en: 'This torque tightens to F_Mzul (thread + head friction share).', pt: 'Este binário aperta até F_Mzul (parcela de atrito da rosca + cabeça).' },
      ref: 'VDI 2230 Bl.1 · R13'
    });

    /* ---- R8: Betriebskraft der Schraube F_Smax ---- */
    var F_SAmax = PhiEn * F_Ao;
    var F_Smax = F_Mzul + F_SAmax - dFvth;
    step({
      id: 'FSmax', phase: 'R8',
      titleI: { de: 'Größte Schraubenkraft F_Smax', en: 'Maximum bolt force F_Smax', pt: 'Força máxima do parafuso F_Smax' },
      formula: 'F_Smax = F_Mzul + Φ_en·F_Ao − ΔF_Vth',
      sub: 'F_SAmax = Φ_en·F_Ao = ' + nf(PhiEn, 4) + '·' + nf(F_Ao, 0) + ' = ' + nf(F_SAmax, 0) + ' N'
        + '\nF_Smax = ' + nf(F_Mzul, 0) + ' + ' + nf(F_SAmax, 0) + ' − ' + nf(dFvth, 0),
      result: nf(F_Smax, 0) + ' N',
      _val: F_Smax, _exp: R.F_Smax,
      noteI: { de: 'Größte Zugkraft in der Schraube: Vorspannung plus anteilige Betriebskraft.', en: 'Largest tensile force in the bolt: preload plus its share of the operating force.', pt: 'Maior força de tração no parafuso: pré-tensão mais a sua parcela da força de serviço.' },
      ref: 'VDI 2230 Bl.1 · R8'
    });

    /* ---- R8: Zugspannung, Vergleichsspannung, Sicherheit gegen Fliessen ---- */
    var sz = F_Smax / g.As;
    step({
      id: 'sigmaZ', phase: 'R8',
      titleI: { de: 'Zugspannung σ_z,max', en: 'Tensile stress σ_z,max', pt: 'Tensão de tração σ_z,max' },
      formula: 'σ_z,max = F_Smax / A_S',
      sub: 'σ_z,max = ' + nf(F_Smax, 0) + ' / ' + nf(g.As, 2),
      result: nf(sz, 0) + ' N/mm²',
      _val: sz, _exp: R.sigma_zmax,
      noteI: { de: 'Zugspannung im Spannungsquerschnitt A_S.', en: 'Tensile stress in the stress cross-section A_S.', pt: 'Tensão de tração na secção resistente A_S.' },
      ref: 'VDI 2230 Bl.1 · R8'
    });
    var kTau = (inp.kTau != null) ? inp.kTau : 0.5;
    var tauR = kTau * (M_G / Wp);
    var sredB = Math.sqrt(sz * sz + 3 * tauR * tauR);
    step({
      id: 'sigmaRed', phase: 'R8',
      titleI: { de: 'Vergleichsspannung σ_red,B', en: 'Equivalent stress σ_red,B', pt: 'Tensão equivalente σ_red,B' },
      formula: 'σ_red,B = √(σ_z,max² + 3·(k_τ·τ)²),   τ = M_G / W_p',
      sub: 'τ = ' + nf(tauR, 0) + ' N/mm² (k_τ = ' + nf(kTau, 2) + ')',
      result: nf(sredB, 0) + ' N/mm²',
      _val: sredB, _exp: R.sigma_redB,
      noteI: { de: 'Im Betrieb wirkt noch ein Teil der Torsion aus dem Anziehen (k_τ ≈ 0,5).', en: 'In operation part of the tightening torsion remains (k_τ ≈ 0.5).', pt: 'Em serviço permanece parte da torção do aperto (k_τ ≈ 0,5).' },
      ref: 'VDI 2230 Bl.1 · R8'
    });
    var S_F = Rp / sredB;
    step({
      id: 'SF', phase: 'R8', safety: true,
      titleI: { de: 'Sicherheit gegen Fließen S_F', en: 'Safety against yielding S_F', pt: 'Segurança ao escoamento S_F' },
      formula: 'S_F = R_p0,2 / σ_red,B',
      sub: 'S_F = ' + nf(Rp, 0) + ' / ' + nf(sredB, 0),
      result: nf(S_F, 2),
      _val: S_F, _exp: R.S_F,
      noteI: { de: 'Reserve gegen bleibende Verformung der Schraube.', en: 'Reserve against permanent bolt deformation.', pt: 'Reserva contra deformação permanente do parafuso.' },
      ref: 'VDI 2230 Bl.1 · R8'
    });

    /* ---- R9: Dauerhaltbarkeit (nur bei schwankender Axiallast) ---- */
    if (R.fatigue && inp.F_Ao != null && inp.F_Au != null) {
      var A0 = (inp.A0 != null) ? inp.A0 : g.As;
      var sa = PhiEn * (inp.F_Ao - inp.F_Au) / (2 * A0);
      step({
        id: 'sigmaA_amp', phase: 'R9',
        titleI: { de: 'Spannungsamplitude σ_a', en: 'Stress amplitude σ_a', pt: 'Amplitude de tensão σ_a' },
        formula: 'σ_a = Φ_en·(F_Ao − F_Au) / (2·A_S)',
        sub: 'σ_a = ' + nf(PhiEn, 4) + '·(' + nf(inp.F_Ao, 0) + ' − ' + nf(inp.F_Au, 0) + ') / (2·' + nf(A0, 2) + ')',
        result: nf(sa, 1) + ' N/mm²',
        _val: sa, _exp: R.fatigue.sigma_a,
        noteI: { de: 'Halbe Schwingbreite der Schraubenzusatzkraft, bezogen auf A_S.', en: 'Half the swing of the additional bolt force, related to A_S.', pt: 'Metade da variação da força adicional, referida a A_S.' },
        ref: 'VDI 2230 Bl.1 · R9'
      });
      var sASV = 0.85 * (150 / g.d + 45);
      step({
        id: 'sigmaA_end', phase: 'R9',
        titleI: { de: 'Grund-Dauerfestigkeit σ_A,SV (schlussvergütet)', en: 'Base endurance limit σ_A,SV (heat-treated)', pt: 'Limite de fadiga base σ_A,SV (temperado)' },
        formula: 'σ_A,SV = 0,85·(150/d + 45)',
        sub: 'σ_A,SV = 0,85·(150/' + nf(g.d, 1) + ' + 45)',
        result: nf(sASV, 1) + ' N/mm²',
        _val: sASV, _exp: R.fatigue.sigma_ASV,
        noteI: { de: 'Ausschlagfestigkeit schlussvergüteter Schrauben (Richtwert nach d).', en: 'Fatigue strength of heat-treated bolts (guide value by d).', pt: 'Resistência à fadiga de parafusos temperados (valor de referência por d).' },
        ref: 'VDI 2230 Bl.1 · R9'
      });
      var sigmaA_fin = sASV;
      if (R.fatigue.finish === 'SG') {
        var FSm = F_Mzul + PhiEn * (inp.F_Ao + inp.F_Au) / 2;
        step({
          id: 'FSm', phase: 'R9',
          titleI: { de: 'Mittlere Schraubenkraft F_Sm', en: 'Mean bolt force F_Sm', pt: 'Força média do parafuso F_Sm' },
          formula: 'F_Sm = F_Mzul + Φ_en·(F_Ao + F_Au)/2',
          sub: 'F_Sm = ' + nf(F_Mzul, 0) + ' + ' + nf(PhiEn, 4) + '·(' + nf(inp.F_Ao, 0) + ' + ' + nf(inp.F_Au, 0) + ')/2',
          result: nf(FSm, 0) + ' N',
          _val: FSm, _exp: R.fatigue.F_Sm,
          noteI: { de: 'Mittlere Schraubenkraft aus zulässiger Vorspannung und mittlerer Betriebslast.', en: 'Mean bolt force from the admissible preload and the mean working load.', pt: 'Força média do parafuso a partir da pré-tensão admissível e da carga média.' },
          ref: 'VDI 2230 Bl.1 · R9'
        });
        var ratioSG = R.fatigue.F_Sm / R.fatigue.F02;
        var sASG = (2 - ratioSG) * sASV;
        sigmaA_fin = sASG;
        step({
          id: 'sigmaA_sg', phase: 'R9',
          titleI: { de: 'Dauerfestigkeit σ_A,SG (schlussgewalzt)', en: 'Endurance limit σ_A,SG (rolled after HT)', pt: 'Limite de fadiga σ_A,SG (laminada após TT)' },
          formula: 'σ_A,SG = (2 − F_Sm/F_0,2min)·σ_A,SV',
          sub: 'σ_A,SG = (2 − ' + nf(R.fatigue.F_Sm, 0) + '/' + nf(R.fatigue.F02, 0) + ')·' + nf(sASV, 1),
          result: nf(sASG, 1) + ' N/mm²',
          _val: sASG, _exp: (R.fatigue.sigma_A_preSurface != null ? R.fatigue.sigma_A_preSurface : R.fatigue.sigma_A),
          noteI: { de: 'Schlussgewalzte Gewinde sind dauerfester; der Zuschlag sinkt mit steigender mittlerer Schraubenkraft (gültig F_Sm/F_0,2min ≈ 0,3…1).', en: 'Threads rolled after heat treatment endure more; the gain falls as the mean bolt force rises (valid F_Sm/F_0,2min ≈ 0.3…1).', pt: 'Roscas laminadas após tratamento térmico resistem mais; o ganho diminui com o aumento da força média (válido F_Sm/F_0,2min ≈ 0,3…1).' },
          ref: 'VDI 2230 Bl.1 · R9'
        });
      }
      // Oberflaechen-/Ausfuehrungs-Abminderung (falls != blank) transparent zeigen
      if (R.fatigue.surfaceFactor != null && R.fatigue.surfaceFactor !== 1) {
        var sigmaA_red = sigmaA_fin * R.fatigue.surfaceFactor;
        var pct = Math.round((1 - R.fatigue.surfaceFactor) * 100);
        step({
          id: 'sigmaA_surf', phase: 'R9',
          titleI: { de: 'Abminderung σ_A (Ausführung)', en: 'Reduction of σ_A (finish)', pt: 'Redução de σ_A (acabamento)' },
          formula: 'σ_A,red = f_O · σ_A',
          sub: 'σ_A,red = ' + nf(R.fatigue.surfaceFactor, 2) + ' · ' + nf(sigmaA_fin, 1) + ' = ' + nf(sigmaA_red, 1) + ' N/mm²  (−' + pct + ' %)',
          result: nf(sigmaA_red, 1) + ' N/mm²',
          _val: sigmaA_red, _exp: R.fatigue.sigma_A,
          noteI: { de: 'Ausführung „' + (R.fatigue.surface || '') + '": feuerverzinkte bzw. HV-Schrauben sind schwingend weniger belastbar (VDI 2230 Bl.1).', en: 'Finish "' + (R.fatigue.surface || '') + '": hot-dip galvanized or HV bolts endure less under cyclic load (VDI 2230 sheet 1).', pt: 'Acabamento "' + (R.fatigue.surface || '') + '": parafusos galvanizados ou HV resistem menos sob carga cíclica (VDI 2230 folha 1).' },
          ref: 'VDI 2230 Bl.1 · R9'
        });
        sigmaA_fin = sigmaA_red;
      }
      step({
        id: 'SD', phase: 'R9', safety: true,
        titleI: { de: 'Sicherheit Dauerhaltbarkeit S_D', en: 'Fatigue safety S_D', pt: 'Segurança à fadiga S_D' },
        formula: (R.fatigue.finish === 'SG') ? 'S_D = σ_A,SG / σ_a' : 'S_D = σ_A / σ_a',
        sub: 'S_D = ' + nf(sigmaA_fin, 1) + ' / ' + nf(sa, 1),
        result: nf(R.fatigue.S_D, 2),
        _val: (sa > 0 ? sigmaA_fin / sa : Infinity), _exp: R.fatigue.S_D,
        noteI: { de: 'Reserve gegen Dauerbruch bei schwingender Last.', en: 'Reserve against fatigue failure under cyclic load.', pt: 'Reserva contra rotura por fadiga sob carga cíclica.' },
        ref: 'VDI 2230 Bl.1 · R9'
      });
    }

    /* ---- R10: Flaechenpressung (nur bei angegebenem p_G) — Montage + Betrieb ---- */
    if (R.pressure && inp.p_G != null) {
      var Ap = Math.PI / 4 * (inp.d_w * inp.d_w - inp.d_h * inp.d_h);
      var pmaxM = F_Mzul / Ap;   // Montagezustand
      var pmaxB = F_Smax / Ap;   // Betriebszustand (groesste Schraubenkraft)
      step({
        id: 'pmax', phase: 'R10',
        titleI: { de: 'Flächenpressung p_max (Montage & Betrieb)', en: 'Surface pressure p_max (assembly & operation)', pt: 'Pressão superficial p_max (montagem e serviço)' },
        formula: 'p_max = F / (π/4·(d_w² − d_h²)),   F = F_Mzul (' + LT('Montage', 'assembly', 'montagem') + ') / F_Smax (' + LT('Betrieb', 'operation', 'serviço') + ')',
        sub: 'A_p = ' + nf(Ap, 1) + ' mm²'
          + '\np_max,M = ' + nf(F_Mzul, 0) + '/' + nf(Ap, 1) + ' = ' + nf(pmaxM, 0) + ' N/mm²'
          + '\np_max,B = ' + nf(F_Smax, 0) + '/' + nf(Ap, 1) + ' = ' + nf(pmaxB, 0) + ' N/mm²',
        result: nf(Math.max(pmaxM, pmaxB), 0) + ' N/mm² (' + (pmaxB >= pmaxM ? LT('Betrieb', 'operation', 'serviço') : LT('Montage', 'assembly', 'montagem')) + ' ' + LT('maßgeblich', 'governs', 'determinante') + ')',
        _val: Math.max(pmaxM, pmaxB), _exp: R.pressure.p_max,
        noteI: { de: 'Pressung unter der Kopf-/Mutterauflage. Geprüft werden Montagezustand (F_Mzul) und Betriebszustand (F_Smax); der ungünstigere zählt.', en: 'Pressure under the head/nut bearing. Both the assembled state (F_Mzul) and the operating state (F_Smax) are checked; the worse one counts.', pt: 'Pressão sob o apoio da cabeça/porca. Verificam-se o estado montado (F_Mzul) e o estado de serviço (F_Smax); o pior prevalece.' },
        ref: 'VDI 2230 Bl.1 · R10'
      });
      var pmaxGov = Math.max(pmaxM, pmaxB);
      step({
        id: 'SP', phase: 'R10', safety: true,
        titleI: { de: 'Sicherheit Flächenpressung S_P', en: 'Surface-pressure safety S_P', pt: 'Segurança à pressão S_P' },
        formula: 'S_P = p_G / max(p_max,M , p_max,B)',
        sub: 'S_P,M = ' + nf(inp.p_G, 0) + '/' + nf(pmaxM, 0) + ' = ' + nf(inp.p_G / pmaxM, 2)
          + '   ·   S_P,B = ' + nf(inp.p_G, 0) + '/' + nf(pmaxB, 0) + ' = ' + nf(inp.p_G / pmaxB, 2),
        result: nf(R.pressure.S_P, 2),
        _val: inp.p_G / pmaxGov, _exp: R.pressure.S_P,
        noteI: { de: 'Schutz vor Eindrücken (Setzen, Vorspannverlust) unter der Auflage — maßgeblich ist das kleinere S_P aus Montage und Betrieb.', en: 'Protection against embedding (settling, preload loss) under the bearing — the smaller S_P of assembly and operation governs.', pt: 'Proteção contra assentamento (perda de pré-tensão) sob o apoio — prevalece o menor S_P de montagem e serviço.' },
        ref: 'VDI 2230 Bl.1 · R10'
      });
    }

    /* ---- R11: Mindesteinschraubtiefe (nur wenn Nachweis aktiv gerechnet) ---- */
    if (R.engagement) {
      var e = R.engagement;
      var FmS = 1.2 * Rm * g.As;
      step({
        id: 'r11_FmS', phase: 'R11',
        titleI: { de: 'Grenz-Schraubenkraft F_mS', en: 'Limiting bolt force F_mS', pt: 'Força-limite do parafuso F_mS' },
        formula: 'F_mS = 1,2·R_m,S·A_S',
        sub: 'F_mS = 1,2·' + nf(Rm, 0) + '·' + nf(g.As, 2),
        result: nf(FmS, 0) + ' N',
        _val: FmS, _exp: e.F_mS,
        noteI: { de: 'Kraft, bei der die Schraube im Gewinde bricht — Ziel des Nachweises: die Schraube soll vor dem Innengewinde versagen.', en: 'Force at which the bolt fails in the thread — goal of the check: the bolt should fail before the internal thread.', pt: 'Força à qual o parafuso rompe na rosca — objetivo: o parafuso deve falhar antes da rosca interna.' },
        ref: 'VDI 2230 Bl.1 · R11'
      });
      var boltRatio = (e.boltRatio != null) ? e.boltRatio : 0.62;
      step({
        id: 'r11_tau', phase: 'R11',
        titleI: { de: 'Scherfestigkeiten τ_B,M / τ_B,S', en: 'Shear strengths τ_B,M / τ_B,S', pt: 'Resistências ao corte τ_B,M / τ_B,S' },
        formula: 'τ_B,M = (τ_B/R_m)_M·R_m,M   ·   τ_B,S = (τ_B/R_m)_S·R_m,S',
        sub: '(τ_B/R_m)_M = ' + nf(e.matRatio != null ? e.matRatio : (e.tauBM / (inp.Rm_M || 1)), 2) + '  →  τ_B,M = ' + nf(e.tauBM, 0) + ' N/mm²'
          + '\n(τ_B/R_m)_S = ' + nf(boltRatio, 2) + ' (' + LT('klassenabhängig', 'class-dependent', 'conforme a classe') + ')  →  τ_B,S = ' + nf(e.tauBS, 0) + ' N/mm²',
        result: 'τ_B,M = ' + nf(e.tauBM, 0) + '  ·  τ_B,S = ' + nf(e.tauBS, 0) + ' N/mm²',
        _val: e.tauBS, _exp: boltRatio * Rm,
        noteI: { de: 'Abscherfestigkeit von Innengewinde-Werkstoff und Schraube; ihr Verhältnis entscheidet, welches Gewinde zuerst abschert. τ_B/R_m normbelegt (VDI 2230 Bl.1 Tab. 6; Bolzen klassenabhängig nach Thomala).', en: 'Shear strength of the internal-thread material and the bolt; their ratio decides which thread strips first. τ_B/R_m sourced from VDI 2230 sheet 1 Table 6 (bolt value class-dependent per Thomala).', pt: 'Resistência ao corte do material da rosca interna e do parafuso; a sua relação decide qual rosca se arranca primeiro. τ_B/R_m conforme a VDI 2230 folha 1 Tab. 6 (parafuso dependente da classe, segundo Thomala).' },
        ref: 'VDI 2230 Bl.1 · R11 · Tab. 6'
      });
      step({
        id: 'r11_RS', phase: 'R11',
        titleI: { de: 'Kräfteverhältnis R_S & maßgebliches Gewinde', en: 'Strength ratio R_S & governing thread', pt: 'Relação R_S e rosca determinante' },
        formula: 'R_S = (τ_B,M·A_GM)/(τ_B,S·A_GS)',
        sub: 'R_S = ' + nf(e.RS, 3) + ' → ' + (e.branch === 'innen' ? LT('Innengewinde maßgeblich', 'internal thread governs', 'rosca interna determinante') : LT('Bolzengewinde maßgeblich', 'bolt thread governs', 'rosca do parafuso determinante')),
        result: 'R_S = ' + nf(e.RS, 3),
        _val: e.RS, _exp: e.RS,
        noteI: { de: 'R_S<1: das Innengewinde schert zuerst ab (weicheres Bauteil); R_S≥1: die Schraube. Der C-Faktor korrigiert die Traglast des maßgeblichen Gewindes.', en: 'R_S<1: the internal thread strips first (softer part); R_S≥1: the bolt. The C-factor corrects the load capacity of the governing thread.', pt: 'R_S<1: a rosca interna arranca primeiro (peça mais macia); R_S≥1: o parafuso. O fator C corrige a capacidade da rosca determinante.' },
        ref: 'VDI 2230 Bl.1 · R11'
      });
      step({
        id: 'r11_mmin', phase: 'R11',
        titleI: { de: 'Erforderliche Einschraubtiefe m_min', en: 'Required length of engagement m_min', pt: 'Profundidade de aperto necessária m_min' },
        formula: 'm_min = F_mS / (τ_B·A_G·C·C1)',
        sub: LT('aus Scherquerschnitt des maßgeblichen Gewindes', 'from the shear area of the governing thread', 'da área de corte da rosca determinante') + '  (C = ' + nf(e.C, 3) + ', C1 = ' + nf(e.C1, 2) + ')',
        result: nf(e.m_min, 2) + ' mm  (≈ ' + nf(e.m_min / g.d, 2) + '·d)',
        _val: e.m_min, _exp: e.m_min,
        noteI: { de: 'Tragende Gewindelänge, ab der die Schraube vor dem Gewinde versagt. C berücksichtigt die Gewindeaufweitung, C1 die Mutterngeometrie (hier 1).', en: 'Load-bearing thread length beyond which the bolt fails before the thread. C accounts for thread dilation, C1 for nut geometry (1 here).', pt: 'Comprimento de rosca resistente a partir do qual o parafuso falha antes da rosca. C considera a dilatação da rosca, C1 a geometria da porca (aqui 1).' },
        ref: 'VDI 2230 Bl.1 · R11'
      });
      step({
        id: 'r11_mzu', phase: 'R11',
        titleI: { de: 'Nicht voll tragender Zuschlag m_zu', en: 'Not-fully-bearing addition m_zu', pt: 'Acréscimo não totalmente resistente m_zu' },
        formula: (conn === 'ESV') ? 'm_zu = 3·P  (' + LT('Sackloch', 'blind hole', 'furo cego') + ')' : 'm_zu = 2·P  (' + LT('Durchsteck/Mutter', 'through-bolt/nut', 'passante/porca') + ')',
        sub: 'm_zu = ' + ((conn === 'ESV') ? '3' : '2') + '·' + nf(g.P, 3),
        result: nf(e.m_zu, 2) + ' mm',
        _val: ((conn === 'ESV') ? 3 : 2) * g.P, _exp: e.m_zu,
        noteI: { de: 'Die ersten Gewindegänge tragen nicht voll; dieser Anteil wird von der vorhandenen Tiefe abgezogen.', en: 'The first threads do not carry fully; this portion is deducted from the available depth.', pt: 'As primeiras roscas não suportam totalmente; esta parte é subtraída à profundidade disponível.' },
        ref: 'VDI 2230 Bl.1 · R11'
      });
      step({
        id: 'r11_meff', phase: 'R11',
        titleI: { de: 'Tragende vorhandene Tiefe m_eff,vorh', en: 'Effective available depth m_eff,avail', pt: 'Profundidade efetiva disponível m_eff,disp' },
        formula: 'm_eff,vorh = m_vorh − m_zu',
        sub: 'm_eff,vorh = ' + nf(e.m_vorh, 2) + ' − ' + nf(e.m_zu, 2),
        result: nf(e.m_eff_vorh, 2) + ' mm',
        _val: e.m_vorh - e.m_zu, _exp: e.m_eff_vorh,
        noteI: { de: 'Tatsächlich tragende Gewindelänge der Konstruktion.', en: 'Actually load-bearing thread length of the design.', pt: 'Comprimento de rosca efetivamente resistente do projeto.' },
        ref: 'VDI 2230 Bl.1 · R11'
      });
      step({
        id: 'r11_SA', phase: 'R11', safety: true,
        titleI: { de: 'Sicherheit Einschraubtiefe S_A', en: 'Engagement safety S_A', pt: 'Segurança de aperto S_A' },
        formula: 'S_A = m_eff,vorh / m_min',
        sub: 'S_A = ' + nf(e.m_eff_vorh, 2) + ' / ' + nf(e.m_min, 2),
        result: nf(e.S_A, 2),
        _val: e.m_eff_vorh / e.m_min, _exp: e.S_A,
        noteI: { de: 'S_A ≥ 1: die vorhandene Einschraubtiefe reicht, damit die Schraube vor dem Gewinde versagt.', en: 'S_A ≥ 1: the available engagement is sufficient so the bolt fails before the thread.', pt: 'S_A ≥ 1: a profundidade disponível é suficiente para o parafuso falhar antes da rosca.' },
        ref: 'VDI 2230 Bl.1 · R11'
      });
    }

    /* ---- R12: Gleiten/Reibschluss (nur bei Querkraft) ---- */
    if (R.slip && inp.F_Qmax != null && inp.F_Qmax > 0) {
      var muT = (inp.muT != null) ? inp.muT : muG;
      var qF = (inp.qF != null) ? inp.qF : 1;
      var FKQ = inp.F_Qmax / (qF * muT);
      var momTerm = (inp.M_Ymax != null && inp.M_Ymax > 0 && inp.qM >= 1 && inp.ra > 0) ? inp.M_Ymax / (inp.qM * inp.ra * muT) : 0;
      FKQ += momTerm;
      step({
        id: 'FKQ', phase: 'R12',
        titleI: { de: 'Erforderliche Klemmkraft F_KQ,erf', en: 'Required clamp force F_KQ,req', pt: 'Força de aperto necessária F_KQ,req' },
        formula: 'F_KQ,erf = F_Qmax / (q_F·μ_T)' + (momTerm > 0 ? ' + M_Ymax/(q_M·r_a·μ_T)' : ''),
        sub: 'F_KQ,erf = ' + nf(inp.F_Qmax, 0) + ' / (' + nf(qF, 0) + '·' + nf(muT, 3) + ')',
        result: nf(FKQ, 0) + ' N',
        _val: FKQ, _exp: R.slip.F_KQerf,
        noteI: { de: 'Klemmkraft, die nötig ist, um die Querkraft per Reibung zu übertragen.', en: 'Clamp force needed to transmit the transverse force by friction.', pt: 'Força de aperto necessária para transmitir a força transversal por atrito.' },
        ref: 'VDI 2230 Bl.1 · R12'
      });
      var F_KR = F_Mmin - F_Z - dFvth - (1 - PhiEn) * F_A;
      step({
        id: 'FKR', phase: 'R12',
        titleI: { de: 'Vorhandene Restklemmkraft F_KR', en: 'Available residual clamp force F_KR', pt: 'Força de aperto residual F_KR' },
        formula: 'F_KR = F_Mmin − F_Z − ΔF_Vth − (1 − Φ_en)·F_A',
        sub: 'F_KR = ' + nf(F_Mmin, 0) + ' − ' + nf(F_Z, 0) + ' − ' + nf(dFvth, 0) + ' − (1 − ' + nf(PhiEn, 4) + ')·' + nf(F_A, 0),
        result: nf(F_KR, 0) + ' N',
        _val: F_KR, _exp: R.slip.F_KR,
        noteI: { de: 'Klemmkraft, die in der Trennfuge tatsächlich übrig bleibt.', en: 'Clamp force that actually remains in the interface.', pt: 'Força de aperto que efetivamente permanece na junta.' },
        ref: 'VDI 2230 Bl.1 · R12'
      });
      step({
        id: 'SG', phase: 'R12', safety: true,
        titleI: { de: 'Sicherheit gegen Gleiten S_G', en: 'Safety against slipping S_G', pt: 'Segurança ao escorregamento S_G' },
        formula: 'S_G = F_KR / F_KQ,erf',
        sub: 'S_G = ' + nf(F_KR, 0) + ' / ' + nf(FKQ, 0),
        result: nf(R.slip.S_G, 2),
        _val: (FKQ > 0 ? F_KR / FKQ : 0), _exp: R.slip.S_G,
        noteI: { de: 'Reserve gegen Verrutschen der verspannten Teile.', en: 'Reserve against the clamped parts slipping.', pt: 'Reserva contra o deslize das peças apertadas.' },
        ref: 'VDI 2230 Bl.1 · R12'
      });
    }

    return { steps: steps, preload: { ok: (F_Mmax <= F_Mzul), text: T(preloadTxt) } };
  }

  return { build: build };
});
