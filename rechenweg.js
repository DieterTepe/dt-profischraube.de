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
    var E_S = (inp.E_S != null) ? inp.E_S : eScrew;
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
      formula: 'δ_S = l_SK/(E_S·A_N) + l_Schaft/(E_S·A_N) + l_Gew/(E_S·A_d3) + l_G/(E_S·A_d3) + l_M/(E_M·A_N)',
      sub: 'A_N = ' + nf(A_N, 2) + ' mm²,  A_d3 = ' + nf(A_d3, 2) + ' mm²,  E_S = ' + nf(E_S, 0) + ' N/mm²'
        + '\nl_SK=' + nf(l_SK, 2) + ', l_Schaft=' + nf(lShank, 2) + ', l_Gew=' + nf(lThreadFree, 2) + ', l_G=' + nf(l_G, 2) + ', l_M=' + nf(l_M, 2) + ' mm',
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
      DAGr = inp.d_w + w * inp.l_K * tanPhi;
      if (inp.D_A <= inp.d_w) {
        var Ah = Math.PI / 4 * (inp.D_A * inp.D_A - inp.d_h * inp.d_h);
        dP = inp.l_K / (inp.E_P * Ah); dPmodel = 'sleeve';
        dPformula = 'δ_P = l_K / (E_P · π/4·(D_A² − d_h²))';
      } else if (inp.D_A >= DAGr) {
        dP = coneComp(inp.E_P, inp.d_w, inp.d_h, w, tanPhi, DAGr); dPmodel = 'cone';
        dPformula = 'δ_P = 2·ln[((d_w+d_h)(D_A,Gr−d_h)) / ((d_w−d_h)(D_A,Gr+d_h))] / (w·E_P·π·d_h·tanφ)';
      } else {
        var dCone = coneComp(inp.E_P, inp.d_w, inp.d_h, w, tanPhi, inp.D_A);
        var lV = (inp.D_A - inp.d_w) / (2 * tanPhi);
        var lH = inp.l_K - 2 * lV / w;
        var Asl = Math.PI / 4 * (inp.D_A * inp.D_A - inp.d_h * inp.d_h);
        var dSleeve = lH > 0 ? lH / (inp.E_P * Asl) : 0;
        dP = dCone + dSleeve; dPmodel = 'cone+sleeve';
        dPformula = 'δ_P = δ_Kegel(bis D_A) + l_H/(E_P·π/4·(D_A²−d_h²))';
      }
    }
    var modelName = { sleeve: { de: 'Hülse', en: 'sleeve', pt: 'manga' }, cone: { de: 'Verformungskegel', en: 'deformation cone', pt: 'cone de deformação' }, 'cone+sleeve': { de: 'Kegel + Hülse', en: 'cone + sleeve', pt: 'cone + manga' }, override: { de: 'vorgegeben', en: 'given', pt: 'fornecido' } };
    step({
      id: 'dP', phase: 'R3',
      titleI: { de: 'Plattennachgiebigkeit δ_P', en: 'Clamped-parts compliance δ_P', pt: 'Flexibilidade das peças δ_P' },
      formula: dPformula,
      sub: (dPmodel === 'override') ? '—'
        : ('Modell: ' + T(modelName[dPmodel]) + ',  tanφ = ' + nf(tanPhi, 3) + ',  D_A,Gr = ' + nf(DAGr, 1) + ' mm'
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
      formula: 'f_Z = f_Gewinde + (Auflagen)·f_Auflage + (Trennfugen)·f_Fuge',
      sub: 'Rautiefe Rz-Klasse „' + (inp.rz || '') + '", Lastart ' + (inp.loadMode || 'axial'),
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
        titleI: { de: 'Dauerfestigkeit σ_A,SV (schlussvergütet)', en: 'Endurance limit σ_A,SV (heat-treated)', pt: 'Limite de fadiga σ_A,SV (temperado)' },
        formula: 'σ_A,SV = 0,85·(150/d + 45)',
        sub: 'σ_A,SV = 0,85·(150/' + nf(g.d, 1) + ' + 45)',
        result: nf(sASV, 1) + ' N/mm²',
        _val: sASV, _exp: R.fatigue.sigma_A,
        noteI: { de: 'Ausschlagfestigkeit für schlussvergütete Schrauben (Richtwert nach d).', en: 'Fatigue strength for heat-treated bolts (guide value by d).', pt: 'Resistência à fadiga para parafusos temperados (valor de referência por d).' },
        ref: 'VDI 2230 Bl.1 · R9'
      });
      step({
        id: 'SD', phase: 'R9', safety: true,
        titleI: { de: 'Sicherheit Dauerhaltbarkeit S_D', en: 'Fatigue safety S_D', pt: 'Segurança à fadiga S_D' },
        formula: 'S_D = σ_A,SV / σ_a',
        sub: 'S_D = ' + nf(sASV, 1) + ' / ' + nf(sa, 1),
        result: nf(R.fatigue.S_D, 2),
        _val: (sa > 0 ? sASV / sa : Infinity), _exp: R.fatigue.S_D,
        noteI: { de: 'Reserve gegen Dauerbruch bei schwingender Last.', en: 'Reserve against fatigue failure under cyclic load.', pt: 'Reserva contra rotura por fadiga sob carga cíclica.' },
        ref: 'VDI 2230 Bl.1 · R9'
      });
    }

    /* ---- R10: Flaechenpressung (nur bei angegebenem p_G) ---- */
    if (R.pressure && inp.p_G != null) {
      var Ap = Math.PI / 4 * (inp.d_w * inp.d_w - inp.d_h * inp.d_h);
      var pmax = F_Mzul / Ap;
      step({
        id: 'pmax', phase: 'R10',
        titleI: { de: 'Flächenpressung p_max', en: 'Surface pressure p_max', pt: 'Pressão superficial p_max' },
        formula: 'p_max = F_Mzul / (π/4·(d_w² − d_h²))',
        sub: 'A_p = ' + nf(Ap, 1) + ' mm²,  p_max = ' + nf(F_Mzul, 0) + ' / ' + nf(Ap, 1),
        result: nf(pmax, 0) + ' N/mm²',
        _val: pmax, _exp: R.pressure.p_max,
        noteI: { de: 'Pressung unter der Kopf-/Mutterauflage im Montagezustand (F_Mzul).', en: 'Pressure under the head/nut bearing in the assembled state (F_Mzul).', pt: 'Pressão sob o apoio da cabeça/porca no estado montado (F_Mzul).' },
        ref: 'VDI 2230 Bl.1 · R10'
      });
      step({
        id: 'SP', phase: 'R10', safety: true,
        titleI: { de: 'Sicherheit Flächenpressung S_P', en: 'Surface-pressure safety S_P', pt: 'Segurança à pressão S_P' },
        formula: 'S_P = p_G / p_max',
        sub: 'S_P = ' + nf(inp.p_G, 0) + ' / ' + nf(pmax, 0),
        result: nf(R.pressure.S_P, 2),
        _val: inp.p_G / pmax, _exp: R.pressure.S_P,
        noteI: { de: 'Schutz vor Eindrücken (Setzen, Vorspannverlust) unter der Auflage.', en: 'Protection against embedding (settling, preload loss) under the bearing.', pt: 'Proteção contra assentamento (perda de pré-tensão) sob o apoio.' },
        ref: 'VDI 2230 Bl.1 · R10'
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
