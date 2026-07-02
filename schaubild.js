/* ============================================================================
 * DT-ProfiSchraube · schaubild.js  (Verspannungsschaubild, live gezeichnet)
 * ----------------------------------------------------------------------------
 * build(R, inp, opts) -> HTML-String: SVG-Diagramm + Werteliste (oder '')
 *   R    = Ergebnisobjekt aus solver.computeJoint (status 'ok')
 *   inp  = Eingaben (fuer F_Ao)
 *   opts = { lang:'de'|'en'|'pt', fmt(x,dec) }
 *
 * Gestaltungsprinzip (bewusst): Im Diagramm stehen NUR kurze Symbole
 * (F_M, F_V, F_Z, F_SA, F_PA, F_A) — die Zahlenwerte stehen in einer
 * kompakten, dreisprachigen Werteliste UNTER dem Diagramm (HTML). So sind
 * Ueberlappungen prinzipiell ausgeschlossen und die Werte bleiben auf dem
 * Handy gut lesbar. Bitte keine Zahlen zurueck in die Zeichnung verlegen.
 *
 * Rein zeichnend, keine eigene Physik: alle Zahlen stammen aus R (deltaS,
 * deltaP, F_Mzul, F_Z, PhiEn) und inp (F_Ao). Farben/Schrift via CSS-Klassen
 * -> folgt automatisch Hell/Dunkel. UMD (Node-Test + Browser).
 * ========================================================================== */
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.DTSSchaubild = factory(); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function defFmt(x, d) { if (x == null || !isFinite(x)) return '–'; return Number(x).toFixed(d == null ? 0 : d); }

  var TXT = {
    xaxis: { de: 'Verformung f [µm]', en: 'deformation f [µm]', pt: 'deformação f [µm]' },
    yaxis: { de: 'Kraft F [N]', en: 'force F [N]', pt: 'força F [N]' },
    bolt:  { de: 'Schraube (δ_S)', en: 'bolt (δ_S)', pt: 'parafuso (δ_S)' },
    plate: { de: 'Platten (δ_P)', en: 'parts (δ_P)', pt: 'peças (δ_P)' },
    title: { de: 'Verspannungsschaubild', en: 'Joint diagram', pt: 'Diagrama de aperto' },
    n_FM:  { de: 'Montagevorspannkraft (zulässig)', en: 'assembly preload (permissible)', pt: 'pré-tensão de montagem (admissível)' },
    n_FZ:  { de: 'Vorspannverlust durch Setzen', en: 'preload loss from embedding', pt: 'perda de pré-tensão por assentamento' },
    n_FV:  { de: 'Vorspannkraft nach Setzen', en: 'preload after embedding', pt: 'pré-tensão após assentamento' },
    n_FA:  { de: 'axiale Betriebskraft', en: 'axial working force', pt: 'força axial de serviço' },
    n_FSA: { de: 'Schraubenzusatzkraft', en: 'additional bolt force', pt: 'força adicional no parafuso' },
    n_FPA: { de: 'Entlastung der Platten', en: 'relief of the clamped parts', pt: 'alívio das peças apertadas' }
  };

  function build(R, inp, opts) {
    opts = opts || {}; inp = inp || {};
    if (!R || R.status !== 'ok') return '';
    var lang = opts.lang || 'de';
    var nf = opts.fmt || defFmt;
    function T(o) { return o[lang] || o.de; }

    var dS = R.deltaS, dP = R.deltaP;
    var F_M = R.F_Mzul, F_Z = R.F_Z || 0;
    var Phi = R.PhiEn;
    var F_Ao = (inp.F_Ao != null) ? inp.F_Ao : (inp.F_A != null ? inp.F_A : 0);
    if (!(dS > 0) || !(dP > 0) || !(F_M > 0)) return '';
    var F_SA = Phi * F_Ao, F_PA = (1 - Phi) * F_Ao;
    var F_V = F_M - F_Z;
    var hasFA = F_Ao > 0;

    /* Datenbereich (x in µm, y in N) */
    var f_SM = F_M * dS * 1000;      // Schraubenlaengung bei F_M
    var f_PM = F_M * dP * 1000;      // Plattenstauchung bei F_M
    var xmax = f_SM + f_PM;
    var ymax = (F_M + Math.max(F_SA, 0)) * 1.15;
    if (!(xmax > 0) || !(ymax > 0)) return '';

    /* Geometrie (viewBox) — grosszuegige Raender, groessere Schrift */
    var W = 680, H = 470, mL = 58, mR = 148, mT = 58, mB = 56;
    var x0 = mL, x1 = W - mR, y0 = mT, y1 = H - mB, pw = x1 - x0, ph = y1 - y0;
    function X(xd) { return x0 + (xd / xmax) * pw; }
    function Y(F) { return y1 - (F / ymax) * ph; }
    function r2(n) { return Math.round(n * 100) / 100; }

    var P = [];
    function line(a, b, c, d, cls) { P.push('<line x1="' + r2(a) + '" y1="' + r2(b) + '" x2="' + r2(c) + '" y2="' + r2(d) + '" class="' + cls + '"/>'); }
    function poly(pts, cls) { P.push('<polygon points="' + pts.map(function (p) { return r2(p[0]) + ',' + r2(p[1]); }).join(' ') + '" class="' + cls + '"/>'); }
    function txt(x, y, s, cls, anchor) { P.push('<text x="' + r2(x) + '" y="' + r2(y) + '" class="' + cls + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + esc(s) + '</text>'); }
    function dot(x, y, cls) { P.push('<circle cx="' + r2(x) + '" cy="' + r2(y) + '" r="4.4" class="' + cls + '"/>'); }

    var apexX = X(f_SM), apexY = Y(F_M);

    /* --- feine Gitterlinien (hinter allem) --- */
    for (var gi = 1; gi <= 4; gi++) {
      var gy = y1 - (gi / 4) * ph;
      line(x0, gy, x1, gy, 'sb-grid');
    }

    /* --- dezent gefuelltes Verspannungsdreieck --- */
    poly([[X(0), Y(0)], [apexX, apexY], [apexX, Y(0)]], 'sb-fill-bolt');
    poly([[apexX, apexY], [X(xmax), Y(0)], [apexX, Y(0)]], 'sb-fill-plate');

    /* --- Achsen --- */
    line(x0, y0 - 6, x0, y1, 'sb-axis');
    line(x0, y1, x1 + 8, y1, 'sb-axis');
    txt(x0, y1 + 38, T(TXT.xaxis), 'sb-axlabel', 'start');
    P.push('<text transform="translate(' + r2(x0 - 38) + ',' + r2((y0 + y1) / 2) + ') rotate(-90)" class="sb-axlabel" text-anchor="middle">' + esc(T(TXT.yaxis)) + '</text>');

    /* --- Hilfslinien: F_M, F_V (gestrichelt) + Scheitel-Lot --- */
    line(x0, apexY, apexX, apexY, 'sb-dash');
    line(apexX, apexY, apexX, y1, 'sb-dash');
    txt(x0 + 8, apexY - 9, 'F_M', 'sb-sym', 'start');
    if (F_Z > 0) {
      var yV = Y(F_V);
      line(x0, yV, X(f_SM * 0.62), yV, 'sb-dash');
      txt(x0 + 8, yV + 19, 'F_V', 'sb-sym sb-sym-muted', 'start');
      /* F_Z-Klammer zwischen F_M und F_V, rechts der Symbole */
      var xz = x0 + 92;
      line(xz, apexY, xz, yV, 'sb-fz');
      line(xz - 4, apexY, xz + 4, apexY, 'sb-fz');
      line(xz - 4, yV, xz + 4, yV, 'sb-fz');
      txt(xz + 9, (apexY + yV) / 2 + 5, 'F_Z', 'sb-sym sb-sym-warn', 'start');
    }

    /* --- Kennlinien + Scheitel --- */
    line(X(0), Y(0), apexX, apexY, 'sb-bolt');
    line(apexX, apexY, X(xmax), Y(0), 'sb-plate');
    dot(apexX, apexY, 'sb-apex');

    /* --- Aufteilung der Betriebskraft (nur wenn F_A > 0) --- */
    if (hasFA && (F_SA > 0 || F_PA > 0)) {
      var bx = apexX + Math.max(26, pw * 0.055);
      var bx2 = bx + 28;
      var yTop = Y(F_M + F_SA), yBot = Y(F_M - F_PA);
      line(apexX, apexY, bx2, apexY, 'sb-dash');
      /* Split-Linie: F_SA nach oben (Schraube), F_PA nach unten (Platten) */
      line(bx, yTop, bx, yBot, 'sb-splitbase');
      line(bx, apexY, bx, yTop, 'sb-fsa');
      line(bx - 4, yTop, bx + 4, yTop, 'sb-fsa');
      line(bx, apexY, bx, yBot, 'sb-fpa');
      line(bx - 4, yBot, bx + 4, yBot, 'sb-fpa');
      txt(bx, yTop - 10, 'F_SA', 'sb-sym sb-sym-accent', 'middle');
      txt(bx, yBot + 21, 'F_PA', 'sb-sym sb-sym-brass', 'middle');
      /* Gesamtspanne F_A daneben */
      line(bx2, yTop, bx2, yBot, 'sb-fa');
      line(bx2 - 4, yTop, bx2 + 4, yTop, 'sb-fa');
      line(bx2 - 4, yBot, bx2 + 4, yBot, 'sb-fa');
      txt(bx2 + 9, (yTop + yBot) / 2 + 5, 'F_A', 'sb-sym', 'start');
    }

    /* --- x-Ticks (kurz, kollisionssicher) --- */
    txt(x0, y1 + 20, '0', 'sb-tick', 'middle');
    var xe = X(xmax);
    txt(xe, y1 + 20, nf(xmax, 0), 'sb-tick', 'middle');
    if (xe - apexX >= 40) txt(apexX, y1 + 20, nf(f_SM, 0), 'sb-tick', 'middle');

    /* --- Linien-Legende oben (im freien Kopfband) --- */
    var lgY1 = 22, lgY2 = 42, lgX = x1 + 8;
    P.push('<line x1="' + r2(lgX - 132) + '" y1="' + r2(lgY1) + '" x2="' + r2(lgX - 108) + '" y2="' + r2(lgY1) + '" class="sb-bolt"/>');
    txt(lgX - 102, lgY1 + 5, T(TXT.bolt), 'sb-legend', 'start');
    P.push('<line x1="' + r2(lgX - 132) + '" y1="' + r2(lgY2) + '" x2="' + r2(lgX - 108) + '" y2="' + r2(lgY2) + '" class="sb-plate"/>');
    txt(lgX - 102, lgY2 + 5, T(TXT.plate), 'sb-legend', 'start');

    var svg =
      '<svg class="schaubild" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + esc(T(TXT.title)) + '" xmlns="http://www.w3.org/2000/svg">' +
      P.join('') +
      '</svg>';

    /* --- Werteliste unter dem Diagramm (HTML) --- */
    function item(chip, sym, nameKey, val) {
      return '<div class="sb-val-item"><span class="sb-chip ' + chip + '"></span>' +
        '<span class="sb-vsym">' + esc(sym) + '</span>' +
        '<span class="sb-vname">' + esc(T(TXT[nameKey])) + '</span>' +
        '<span class="sb-vnum">' + esc(nf(val, 0)) + ' N</span></div>';
    }
    var rows = [];
    rows.push(item('sb-c-fg', 'F_M,zul', 'n_FM', F_M));
    if (F_Z > 0) {
      rows.push(item('sb-c-warn', 'F_Z', 'n_FZ', F_Z));
      rows.push(item('sb-c-faint', 'F_V', 'n_FV', F_V));
    }
    if (hasFA) {
      rows.push(item('sb-c-mix', 'F_A', 'n_FA', F_Ao));
      rows.push(item('sb-c-accent', 'F_SA', 'n_FSA', F_SA));
      rows.push(item('sb-c-brass', 'F_PA', 'n_FPA', F_PA));
    }
    var legend = '<div class="sb-vals">' + rows.join('') + '</div>';

    return svg + legend;
  }

  return { build: build };
});
