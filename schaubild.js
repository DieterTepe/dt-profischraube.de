/* ============================================================================
 * DT-ProfiSchraube · schaubild.js  (Verspannungsschaubild, live gezeichnet)
 * ----------------------------------------------------------------------------
 * build(R, inp, opts) -> SVG-String (oder '' wenn nicht rechenbar)
 *   R    = Ergebnisobjekt aus solver.computeJoint (status 'ok')
 *   inp  = Eingaben (fuer F_Ao)
 *   opts = { lang:'de'|'en'|'pt', fmt(x,dec) }
 *
 * Zeichnet das klassische Kraft-Verformungs-Diagramm aus BEREITS GEPRUEFTEN
 * Werten: die Federkennlinien von Schraube (Steigung 1/δ_S) und Platten
 * (1/δ_P) bilden das Verspannungsdreieck mit der Montagevorspannkraft F_Mzul
 * an der Spitze; markiert werden der Setzverlust F_Z (Restklemmkraft F_V) und
 * die Aufteilung der Betriebskraft F_Ao in Schraubenzusatzkraft F_SA und
 * Plattenentlastung F_PA. Reines SVG mit CSS-Klassen -> folgt Hell/Dunkel.
 *
 * Rein zeichnend, keine eigene Physik: alle Zahlen stammen aus R. UMD.
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
    bolt: { de: 'Schraube (δ_S)', en: 'bolt (δ_S)', pt: 'parafuso (δ_S)' },
    plate: { de: 'Platten (δ_P)', en: 'parts (δ_P)', pt: 'peças (δ_P)' },
    title: { de: 'Verspannungsschaubild', en: 'Joint diagram', pt: 'Diagrama de aperto' }
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

    // Datenbereich (x in µm, y in N)
    var f_SM = F_M * dS * 1000;      // Schraubenlaengung bei F_M
    var f_PM = F_M * dP * 1000;      // Plattenstauchung bei F_M
    var xmax = f_SM + f_PM;
    var ymax = (F_M + Math.max(F_SA, 0)) * 1.15;
    if (!(xmax > 0) || !(ymax > 0)) return '';

    // Geometrie (viewBox)
    var W = 680, H = 440, mL = 66, mR = 138, mT = 42, mB = 48;
    var x0 = mL, x1 = W - mR, y0 = mT, y1 = H - mB, pw = x1 - x0, ph = y1 - y0;
    function X(xd) { return x0 + (xd / xmax) * pw; }
    function Y(F) { return y1 - (F / ymax) * ph; }
    function r2(n) { return Math.round(n * 100) / 100; }

    var P = []; // svg-Teile
    function line(a, b, c, d, cls, extra) { P.push('<line x1="' + r2(a) + '" y1="' + r2(b) + '" x2="' + r2(c) + '" y2="' + r2(d) + '" class="' + cls + '"' + (extra || '') + '/>'); }
    function txt(x, y, s, cls, anchor) { P.push('<text x="' + r2(x) + '" y="' + r2(y) + '" class="' + cls + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + esc(s) + '</text>'); }
    function dot(x, y, cls) { P.push('<circle cx="' + r2(x) + '" cy="' + r2(y) + '" r="3.4" class="' + cls + '"/>'); }

    // --- Achsen ---
    line(x0, y0, x0, y1, 'sb-axis');            // y
    line(x0, y1, x1 + 6, y1, 'sb-axis');        // x
    txt(x0 - 8, y1 + 30, T(TXT.xaxis), 'sb-axlabel', 'start');
    P.push('<text transform="translate(' + r2(x0 - 46) + ',' + r2((y0 + y1) / 2) + ') rotate(-90)" class="sb-axlabel" text-anchor="middle">' + esc(T(TXT.yaxis)) + '</text>');

    var apexX = X(f_SM), apexY = Y(F_M);

    // --- Verspannungsdreieck: Schraubenlinie + Plattenlinie ---
    line(X(0), Y(0), apexX, apexY, 'sb-bolt');                 // Schraube (0,0)->(f_SM,F_M)
    line(apexX, apexY, X(xmax), Y(0), 'sb-plate');             // Platten  (f_SM,F_M)->(xmax,0)
    dot(apexX, apexY, 'sb-apex');

    // --- F_M und F_V (Restklemmkraft) als gestrichelte Horizontale + F_Z-Klammer ---
    line(x0, apexY, apexX, apexY, 'sb-dash');
    txt(x0 - 6, apexY - 5, 'F_M,zul = ' + nf(F_M, 0) + ' N', 'sb-val', 'end');
    if (F_Z > 0) {
      var yV = Y(F_V);
      line(x0, yV, X(f_SM * 0.62), yV, 'sb-dash');
      txt(x0 - 6, yV + 13, 'F_V = ' + nf(F_V, 0) + ' N', 'sb-val2', 'end');
      // F_Z-Klammer zwischen F_M und F_V an der y-Achse
      var xz = x0 + 10;
      line(xz, apexY, xz, yV, 'sb-fz');
      line(xz - 3, apexY, xz + 3, apexY, 'sb-fz');
      line(xz - 3, yV, xz + 3, yV, 'sb-fz');
      txt(xz + 7, (apexY + yV) / 2 + 3, 'F_Z ' + nf(F_Z, 0) + ' N', 'sb-fzlabel', 'start');
    }

    // --- Aufteilung der Betriebskraft am Scheitel (nur wenn F_Ao > 0) ---
    if (F_Ao > 0 && (F_SA > 0 || F_PA > 0)) {
      var bx = apexX + Math.max(18, pw * 0.06);         // Klammer rechts neben Scheitel
      var yTop = Y(F_M + F_SA), yBot = Y(F_M - F_PA);
      line(apexX, apexY, bx, apexY, 'sb-dash');
      // F_SA (Schraube gewinnt) nach oben
      line(bx, apexY, bx, yTop, 'sb-fsa');
      line(bx - 3, yTop, bx + 3, yTop, 'sb-fsa');
      txt(bx + 6, yTop + 4, 'F_SA ' + nf(F_SA, 0) + ' N', 'sb-fsalabel', 'start');
      // F_PA (Platten verlieren) nach unten
      line(bx, apexY, bx, yBot, 'sb-fpa');
      line(bx - 3, yBot, bx + 3, yBot, 'sb-fpa');
      txt(bx + 6, yBot + 4, 'F_PA ' + nf(F_PA, 0) + ' N', 'sb-fpalabel', 'start');
      // F_A gesamt (Spanne) ganz rechts
      var gx = bx + 2;
      txt(gx + 6, apexY - 2, 'F_A ' + nf(F_Ao, 0) + ' N', 'sb-val2', 'start');
    }

    // --- Nullpunkt & x-Marken ---
    txt(x0 - 6, y1 + 14, '0', 'sb-tick', 'end');
    txt(apexX, y1 + 14, nf(f_SM, 0), 'sb-tick', 'middle');
    txt(X(xmax), y1 + 14, nf(xmax, 0), 'sb-tick', 'middle');

    // --- Legende oben rechts ---
    var lgX = x1 - 4, lgY = y0 - 8;
    P.push('<line x1="' + r2(lgX - 116) + '" y1="' + r2(lgY) + '" x2="' + r2(lgX - 96) + '" y2="' + r2(lgY) + '" class="sb-bolt"/>');
    txt(lgX - 92, lgY + 4, T(TXT.bolt), 'sb-legend', 'start');
    P.push('<line x1="' + r2(lgX - 116) + '" y1="' + r2(lgY + 16) + '" x2="' + r2(lgX - 96) + '" y2="' + r2(lgY + 16) + '" class="sb-plate"/>');
    txt(lgX - 92, lgY + 20, T(TXT.plate), 'sb-legend', 'start');

    var svg =
      '<svg class="schaubild" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + esc(T(TXT.title)) + '" xmlns="http://www.w3.org/2000/svg">' +
      P.join('') +
      '</svg>';
    return svg;
  }

  return { build: build };
});
