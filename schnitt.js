/* ============================================================================
 * DT-ProfiSchraube · schnitt.js  (2D-Längsschnitt der Verbindung, live gezeichnet)
 * ----------------------------------------------------------------------------
 * ÜBERNAHME-MODUL der Labor-Phase (Masterplan 5.2). Wandert nach Abnahme in
 * schaubild.js / die App. Die Wegwerf-Hülle ist Schnitt_Labor.html.
 *
 * build(geo, opts) -> HTML-String: SVG-Schnitt + Werteliste (oder '')
 *   geo  = { d, P?, l_K, d_h, d_w, D_A, joint:'DSV'|'ESV', tanphi? }
 *          (reine Darstellungsgrößen in mm; tanphi im Labor vom Regler,
 *           in der App später aus dem Engine-Ergebnis)
 *   opts = { lang:'de'|'en'|'pt', fmt(x,dec), showCone, showSplit,
 *            breakLong, idPrefix }
 * bind(containerEl)    -> delegierter Tipp-/Tastatur-Handler für die Chips
 *                         (einmal pro Container; übersteht re-render)
 * refresh(containerEl) -> wendet nach einem re-render die zuletzt aktiven
 *                         Chips wieder auf das neue SVG an
 *
 * Gestaltungsprinzip (Merksatz wie beim Verspannungsschaubild): Im SVG stehen
 * NUR kurze Formel-Symbole — alle ZAHLENWERTE stehen in der HTML-Legende
 * unter der Zeichnung. Die Chips der Legende sind antippbar und blenden die
 * zugehörige Maß-/Hervorhebungs-Gruppe im SVG ein/aus.
 *
 * Rein zeichnend, KEINE Physik: alle Maße kommen von außen. Farben/Schrift
 * ausschließlich über Design-Tokens (CSS-Variablen der App) direkt am
 * SVG-Element -> folgt bei der Integration automatisch Hell/Dunkel, ohne
 * dass style.css für die Zeichnung erweitert werden muss. Die Legende nutzt
 * die bereits vorhandenen .sb-vals/.sb-chip-Klassen der App.
 * Norm-Look: Schraube/Mutter ungeschnitten, Platten geschnitten mit
 * gegenläufiger 45°-Schraffur, Mittellinie strichpunktiert, Gewinde
 * vereinfacht (dicke Außen-, dünne Kernlinie), optional Verformungskegel
 * gestrichelt (wird an D_A sichtbar abgeschnitten), optional Trennfuge bei
 * l_K/2, optional Bruchlinien-Verkürzung bei langen schlanken Schrauben.
 * UMD (Node-Test + Browser).
 * ========================================================================== */
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.DTSSchnitt = factory(); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var VERSION = '0.1.0';

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function defFmt(x, d) { if (x == null || !isFinite(x)) return '–'; return Number(x).toFixed(d == null ? 0 : d); }
  function n2(x) { return Math.round(x * 100) / 100; } // kompakte SVG-Koordinaten

  /* --------------------------------------------------------- Sprachtexte -- */
  var TXT = {
    title:  { de: 'Schnittdarstellung der Verbindung', en: 'Sectional view of the joint', pt: 'Vista em corte da união' },
    n_typ:  { de: 'Verbindungstyp', en: 'joint type', pt: 'tipo de união' },
    v_dsv:  { de: 'DSV (Durchsteck, mit Mutter)', en: 'bolted joint (through, with nut)', pt: 'união passante (com porca)' },
    v_esv:  { de: 'ESV (Einschraub, Sackloch)', en: 'tapped-thread joint (blind hole)', pt: 'união roscada (furo cego)' },
    n_d:    { de: 'Gewinde-Nenndurchmesser', en: 'nominal thread diameter', pt: 'diâmetro nominal da rosca' },
    n_lK:   { de: 'Klemmlänge', en: 'clamp length', pt: 'comprimento de aperto' },
    n_dh:   { de: 'Durchgangsloch', en: 'clearance hole', pt: 'furo de passagem' },
    n_dw:   { de: 'Kopfauflage-Durchmesser', en: 'head bearing diameter', pt: 'diâmetro de apoio da cabeça' },
    n_DA:   { de: 'Außen-Ø der verspannten Teile', en: 'outer Ø of clamped parts', pt: 'Ø externo das peças apertadas' },
    n_phi:  { de: 'Kegelwinkel (Verformungskegel)', en: 'cone angle (deformation cone)', pt: 'ângulo do cone (cone de deformação)' },
    hint:   { de: 'Chips antippen: Maß in der Zeichnung zeigen/verbergen.',
              en: 'Tap a chip to show/hide the dimension in the drawing.',
              pt: 'Toque num chip para mostrar/ocultar a cota no desenho.' }
  };

  /* --------------------------------------------- Darstellungs-Konstanten -- */
  var C = {
    VW: 460,            // viewBox-Breite (px-artig, Striche bleiben konstant)
    padL: 14, padR: 96, // rechts Platz für l_K-Maß + Leader-Symbole
    padT: 26, padB: 30,
    headK: 0.68,        // Kopfhöhe  k  = 0.68·d   (Sechskant, Darstellung)
    nutM:  0.85,        // Mutternhöhe m = 0.85·d
    hexE:  1.24,        // Eckenmaß  e  = 1.24·d_w (Ansicht über Eck)
    core:  0.80,        // Gewinde-Kernlinie d3 ≈ 0.80·d (dünn)
    d1:    0.82,        // Kernloch Innengewinde D1 ≈ 0.82·d
    over:  2.0,         // Gewindeüberstand DSV  = 2·P
    engage:1.25,        // Einschraubtiefe ESV (Darstellung) = 1.25·d
    rest:  2.0,         // Restgewinde im Sackloch = 2·P
    chamf: 0.12,        // Endfase 45° = 0.12·d
    slender: 6,         // Bruchlinie ab l_K/d > 6
    dispSl: 5.0,        // dargestellte Klemmlänge bei Bruch ≈ 5·d
    /* Strichstärken (px) */
    wBody: 2.2, wBolt: 2.4, wThin: 1.1, wHatch: 0.7,
    wCone: 1.6, wDim: 1.1, wCenter: 1.1, wHl: 4.6
  };

  /* Stil-Kürzel — ausschließlich Design-Tokens der App */
  function stBolt()   { return 'stroke:var(--accent);stroke-width:' + C.wBolt + ';fill:none;stroke-linecap:round;stroke-linejoin:round'; }
  function stBoltTh() { return 'stroke:var(--accent);stroke-width:' + C.wThin + ';fill:none;opacity:.85'; }
  function stBody()   { return 'stroke:var(--fg);stroke-width:' + C.wBody + ';fill:none;stroke-linejoin:round'; }
  function stThin()   { return 'stroke:var(--fg);stroke-width:' + C.wThin + ';fill:none'; }
  function stCone()   { return 'stroke:var(--muted);stroke-width:' + C.wCone + ';fill:none;stroke-dasharray:6 4.5;stroke-linecap:round'; }
  function stCenter() { return 'stroke:var(--faint);stroke-width:' + C.wCenter + ';fill:none;stroke-dasharray:13 4 2.5 4'; }
  function stBreak()  { return 'stroke:var(--fg);stroke-width:1.2;fill:none;stroke-linejoin:round;opacity:.9'; }
  function stDim()    { return 'stroke:var(--fg);stroke-width:' + C.wDim + ';fill:none'; }
  function stHl()     { return 'stroke:var(--accent);stroke-width:' + C.wHl + ';fill:none;opacity:.5;stroke-linecap:round'; }
  function stSym()    { return 'fill:var(--fg);font-family:var(--font-num);font-size:12.5px;font-weight:700'; }

  /* ------------------------------------------------------------- build() -- */
  function build(geo, opts) {
    geo = geo || {}; opts = opts || {};
    var lang = opts.lang || 'de';
    var nf = opts.fmt || defFmt;
    function T(o) { return o[lang] || o.de; }
    var pf = (opts.idPrefix || 'sx') + '-';

    var d = +geo.d, lK = +geo.l_K, dh = +geo.d_h, dw = +geo.d_w, DA = +geo.D_A;
    var joint = (geo.joint === 'ESV') ? 'ESV' : 'DSV';
    var P = (+geo.P > 0) ? +geo.P : 0.13 * d;
    var tanphi = (+geo.tanphi > 0) ? +geo.tanphi : 0;
    if (!(d > 0) || !(lK > 0) || !(dh > 0) || !(dw > 0) || !(DA > 0)) return '';

    var showCone  = (opts.showCone  !== false) && tanphi > 0;
    var showSplit = (opts.showSplit !== false);
    var breakLong = (opts.breakLong !== false);

    /* ---- abgeleitete Darstellungsmaße (mm) ---- */
    var k  = C.headK * d;
    var e  = Math.max(C.hexE * dw, 1.35 * d);
    var m  = C.nutM * d;
    var ov = C.over * P;
    var mE = C.engage * d;
    var d3 = C.core * d, D1 = C.d1 * d;
    var ch = C.chamf * d;

    /* Gewindebeginn (frei sichtbares Gewinde, b ≈ 2d+6 von unten) */
    var b = 2 * d + 6;
    var yBoltEnd = (joint === 'DSV') ? lK + m + ov : lK + mE;
    var gewStart = Math.max(yBoltEnd - b, 0.25 * lK);
    if (gewStart > lK - 0.05 * d) gewStart = Math.max(0.25 * lK, lK - d); // etwas Gewinde vor der Klemmfuge sichtbar

    /* ---- Bruchzone (lange schlanke Schraube) ---- */
    var slender = breakLong && (lK / d > C.slender);
    var y1 = 0, y2 = 0, gap = 0, dispLK = lK;
    if (slender) {
      dispLK = C.dispSl * d;
      gap = 0.45 * d;                                 // Bildlücke (mm-Äquivalent)
      var keep = dispLK - gap;
      y1 = 0.60 * keep;                               // oben sichtbar 0..y1
      y2 = lK - (keep - y1);                          // unten sichtbar y2..lK
    }
    function Yd(y) {                                   // Bruch-Verkürzung
      if (!slender) return y;
      if (y <= y1) return y;
      if (y >= y2) return y - (y2 - y1) + gap;
      return y1 + gap * (y - y1) / (y2 - y1);          // (innerhalb: nur f. Clip)
    }
    var inCut = function (y) { return slender && y > y1 && y < y2; };

    /* ---- Maßstab & Pixel-Transform ---- */
    var wMM = Math.max(DA, e);
    var s = (C.VW - C.padL - C.padR) / wMM;
    var yTopMM = -k;
    var yBotMM;                                        // unterster mm-Wert (vor Yd)
    var gkTop = lK, gkSpTip = 0, gkRest = 0, gkBot = 0;
    if (joint === 'DSV') {
      yBotMM = lK + m + ov;
    } else {
      gkRest  = lK + mE + C.rest * P;                  // Ende Restgewinde
      gkSpTip = gkRest + 0.30 * D1;                    // 118°-Spitze
      gkBot   = gkSpTip + 0.55 * d;                    // Freihand-Unterkante
      yBotMM  = gkBot;
    }
    var cx = C.padL + (wMM / 2) * s;
    function X(x) { return n2(cx + x * s); }
    function Y(y) { return n2(C.padT + (Yd(y) - yTopMM) * s); }
    var VH = Math.ceil(Y(yBotMM) + C.padB);

    var out = [];
    function tag(name, attrs, style, extra) {
      var t = '<' + name;
      for (var a in attrs) t += ' ' + a + '="' + attrs[a] + '"';
      if (style) t += ' style="' + style + '"';
      if (extra) t += ' ' + extra;
      return t + '/>';
    }
    function line(x1, y1mm, x2, y2mm, style, extra) {
      out.push(tag('line', { x1: X(x1), y1: Y(y1mm), x2: X(x2), y2: Y(y2mm) }, style, extra));
    }
    /* vertikale Körperkante — an der Bruchzone automatisch geteilt */
    function vline(x, ya, yb, style) {
      if (!slender || yb <= y1 || ya >= y2) { line(x, ya, x, yb, style); return; }
      if (ya < y1) line(x, ya, x, Math.min(yb, y1), style);
      if (yb > y2) line(x, Math.max(ya, y2), x, yb, style);
    }
    /* schräge Linie — an der Bruchzone geteilt (linear interpoliert) */
    function sline(xa, ya, xb, yb, style, extra) {
      function xi(y) { return xa + (xb - xa) * (y - ya) / (yb - ya); }
      var lo = Math.min(ya, yb), hi = Math.max(ya, yb);
      if (!slender || hi <= y1 || lo >= y2) { line(xa, ya, xb, yb, style, extra); return; }
      if (lo < y1) line(xi(lo), lo, xi(Math.min(hi, y1)), Math.min(hi, y1), style, extra);
      if (hi > y2) line(xi(Math.max(lo, y2)), Math.max(lo, y2), xi(hi), hi, style, extra);
    }

    /* ================================================================ SVG */
    var svgOpen = '<svg viewBox="0 0 ' + C.VW + ' ' + VH + '" role="img" aria-label="' +
      esc(T(TXT.title)) + '" style="width:100%;height:auto;display:block">';

    /* ---- defs: Schraffuren + Maßpfeile ---- */
    var defs = '<defs>' +
      '<pattern id="' + pf + 'h45" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
        '<line x1="0" y1="0" x2="0" y2="5" style="stroke:var(--muted);stroke-width:' + C.wHatch + ';opacity:.75"/></pattern>' +
      '<pattern id="' + pf + 'h135" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(135)">' +
        '<line x1="0" y1="0" x2="0" y2="5" style="stroke:var(--muted);stroke-width:' + C.wHatch + ';opacity:.75"/></pattern>' +
      '<marker id="' + pf + 'ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">' +
        '<path d="M0,1.4 L10,5 L0,8.6 Z" style="fill:var(--fg)"/></marker>' +
      '<clipPath id="' + pf + 'cp">' +
        (slender
          ? '<rect x="' + X(-DA / 2) + '" y="' + Y(0) + '" width="' + n2(DA * s) + '" height="' + n2((Yd(y1)) * s) + '"/>' +
            '<rect x="' + X(-DA / 2) + '" y="' + Y(y2) + '" width="' + n2(DA * s) + '" height="' + n2((lK - y2) * s) + '"/>'
          : '<rect x="' + X(-DA / 2) + '" y="' + Y(0) + '" width="' + n2(DA * s) + '" height="' + n2(lK * s) + '"/>') +
      '</clipPath></defs>';

    /* ---- Platten: Flächen (Soft-Füllung + Schraffur) ---- */
    function plateRect(ya, yb, hole) {
      var p = 'M' + X(-DA / 2) + ',' + Y(ya) + ' H' + X(DA / 2) + ' V' + Y(yb) + ' H' + X(-DA / 2) + ' Z';
      if (hole) p += ' M' + X(-hole / 2) + ',' + Y(ya) + ' H' + X(hole / 2) + ' V' + Y(yb) + ' H' + X(-hole / 2) + ' Z';
      return p;
    }
    function fillPath(pathD, patId) {
      out.push('<path d="' + pathD + '" fill-rule="evenodd" style="fill:var(--brass);opacity:.05"/>');
      out.push('<path d="' + pathD + '" fill-rule="evenodd" fill="url(#' + pf + patId + ')" stroke="none"/>');
    }
    /* sichtbare Klemm-Segmente (Fuge + Bruch berücksichtigt) */
    var segs = [];                                    // {ya,yb,pat}
    var split = showSplit ? lK / 2 : null;
    if (split != null && slender && split > y1 && split < y2) split = null; // Fuge liegt im Bruch
    var basePat = ['h45', 'h135'];
    var rawSegs = (split != null) ? [[0, split, 0], [split, lK, 1]] : [[0, lK, 0]];
    rawSegs.forEach(function (sgm) {
      var a = sgm[0], bb = sgm[1], pi = sgm[2];
      if (!slender || bb <= y1 || a >= y2) { segs.push({ ya: a, yb: bb, pat: basePat[pi] }); return; }
      if (a < y1) segs.push({ ya: a, yb: Math.min(bb, y1), pat: basePat[pi] });
      if (bb > y2) segs.push({ ya: Math.max(a, y2), yb: bb, pat: basePat[pi] });
    });
    segs.forEach(function (sg) { fillPath(plateRect(sg.ya, sg.yb, dh), sg.pat); });

    /* ---- ESV-Grundkörper (Fläche mit Gewindeloch, Freihand unten) ---- */
    var frBot = '';
    if (joint === 'ESV') {
      var zz = [], nz = 9, amp = 0.16 * d;
      for (var i = 0; i <= nz; i++) {
        var xx = -DA / 2 + (DA * i) / nz;
        var yy = gkBot + ((i % 2 === 0) ? -amp : amp) * (i === 0 || i === nz ? 0 : 1);
        zz.push((i ? 'L' : 'M') + X(xx) + ',' + Y(yy));
      }
      frBot = zz.join(' ');
      var inner =
        ' M' + X(-d / 2) + ',' + Y(gkTop) + ' V' + Y(lK + mE) +
        ' H' + X(-D1 / 2) + ' V' + Y(gkRest) +
        ' L' + X(0) + ',' + Y(gkSpTip) +
        ' L' + X(D1 / 2) + ',' + Y(gkRest) + ' V' + Y(lK + mE) +
        ' H' + X(d / 2) + ' V' + Y(gkTop) + ' Z';
      var outerGk = 'M' + X(-DA / 2) + ',' + Y(gkTop) + ' H' + X(DA / 2) + ' V' + Y(gkBot) +
        ' H' + X(-DA / 2) + ' Z' + inner;
      var gkPat = (split != null) ? 'h45' : 'h135';   // gegenläufig zur angrenzenden Platte
      fillPath(outerGk, gkPat);
    }

    /* ---- Platten-Konturen (dick) ---- */
    segs.forEach(function (sg) {
      vline(-DA / 2, sg.ya, sg.yb, stBody());
      vline(DA / 2, sg.ya, sg.yb, stBody());
      vline(-dh / 2, sg.ya, sg.yb, stBody());
      vline(dh / 2, sg.ya, sg.yb, stBody());
    });
    line(-DA / 2, 0, -dh / 2, 0, stBody()); line(dh / 2, 0, DA / 2, 0, stBody());       // Oberkante
    if (joint === 'DSV') { line(-DA / 2, lK, -dh / 2, lK, stBody()); line(dh / 2, lK, DA / 2, lK, stBody()); }
    if (split != null) { line(-DA / 2, split, -dh / 2, split, stBody()); line(dh / 2, split, DA / 2, split, stBody()); }

    if (joint === 'ESV') {
      line(-DA / 2, gkTop, -d / 2, gkTop, stBody()); line(d / 2, gkTop, DA / 2, gkTop, stBody()); // Fügefläche
      vline(-DA / 2, gkTop, gkBot, stBody()); vline(DA / 2, gkTop, gkBot, stBody());
      out.push('<path d="' + frBot + '" style="' + stBreak() + '"/>');                  // Freihand-Unterkante
      /* Sackloch: Kernloch (dick) + Spitze + Restgewinde (dünn) */
      vline(-D1 / 2, lK + mE, gkRest, stBody()); vline(D1 / 2, lK + mE, gkRest, stBody());
      line(-D1 / 2, gkRest, 0, gkSpTip, stBody()); line(D1 / 2, gkRest, 0, gkSpTip, stBody());
      vline(-d / 2, lK + mE, gkRest, stThin()); vline(d / 2, lK + mE, gkRest, stThin());
      line(-D1 / 2, lK + mE, -d / 2, lK + mE, stThin()); line(D1 / 2, lK + mE, d / 2, lK + mE, stThin());
    }

    /* ---- Bruchlinien (Freihand quer, über Platten + Schraube) ---- */
    if (slender) {
      var bw = Math.max(DA, e) / 2 + 0.06 * wMM;
      [y1, y2].forEach(function (yc) {
        var zz2 = [], nzz = 11, am2 = 0.12 * d;
        for (var j = 0; j <= nzz; j++) {
          var xx2 = -bw + (2 * bw * j) / nzz;
          var yy2 = yc + ((j % 2 === 0) ? -am2 : am2) * (j === 0 || j === nzz ? 0 : 1);
          zz2.push((j ? 'L' : 'M') + X(xx2) + ',' + Y(yy2));
        }
        out.push('<path d="' + zz2.join(' ') + '" style="' + stBreak() + '"/>');
      });
    }

    /* ---- Verformungskegel (gestrichelt, auf Klemmpaket geclippt) ---- */
    if (showCone) {
      out.push('<g clip-path="url(#' + pf + 'cp)">');
      var half = tanphi;
      if (joint === 'DSV') {
        var xm = dw / 2 + half * (lK / 2);
        sline(-dw / 2, 0, -xm, lK / 2, stCone()); sline(dw / 2, 0, xm, lK / 2, stCone());
        sline(-dw / 2, lK, -xm, lK / 2, stCone()); sline(dw / 2, lK, xm, lK / 2, stCone());
      } else {
        var xb2 = dw / 2 + half * lK;
        sline(-dw / 2, 0, -xb2, lK, stCone()); sline(dw / 2, 0, xb2, lK, stCone());
      }
      out.push('</g>');
    }

    /* ---- Schraube: Gewinde/Schaft ---- */
    function boltFillSeg(ya, yb) {
      out.push('<rect x="' + X(-d / 2) + '" y="' + Y(ya) + '" width="' + n2(d * s) +
        '" height="' + n2((Yd(yb) - Yd(ya)) * s) + '" style="fill:var(--accent);opacity:.07"/>');
    }
    var fillTo = (joint === 'DSV') ? lK : lK + mE - ch;
    if (slender) { boltFillSeg(0, y1); boltFillSeg(y2, fillTo); } else { boltFillSeg(0, fillTo); }

    var shTo = lK;                                     // sichtbarer Bolzen bis Fuge/Mutter
    vline(-d / 2, 0, Math.min(gewStart, shTo), stBolt());
    vline(d / 2, 0, Math.min(gewStart, shTo), stBolt());
    if (gewStart < shTo) {                             // Gewinde sichtbar in der Klemmzone
      vline(-d / 2, gewStart, shTo, stBolt()); vline(d / 2, gewStart, shTo, stBolt());
      vline(-d3 / 2, gewStart, shTo, stBoltTh()); vline(d3 / 2, gewStart, shTo, stBoltTh());
      line(-d / 2, gewStart, d / 2, gewStart, stBolt());          // Gewindegrenze
    }

    if (joint === 'DSV') {
      /* Überstand unter der Mutter: Gewinde + Endfase */
      var yA = lK + m, yE = lK + m + ov;
      vline(-d / 2, yA, yE - ch, stBolt()); vline(d / 2, yA, yE - ch, stBolt());
      vline(-d3 / 2, yA, yE - ch, stBoltTh()); vline(d3 / 2, yA, yE - ch, stBoltTh());
      out.push('<path d="M' + X(-d / 2) + ',' + Y(yE - ch) + ' L' + X(-d / 2 + ch) + ',' + Y(yE) +
        ' H' + X(d / 2 - ch) + ' L' + X(d / 2) + ',' + Y(yE - ch) + '" style="' + stBolt() + '"/>');
    } else {
      /* ESV: Schraube im Sackloch bis Endfase */
      var yE2 = lK + mE;
      vline(-d / 2, lK, yE2 - ch, stBolt()); vline(d / 2, lK, yE2 - ch, stBolt());
      vline(-d3 / 2, Math.max(gewStart, lK), yE2 - ch, stBoltTh());
      vline(d3 / 2, Math.max(gewStart, lK), yE2 - ch, stBoltTh());
      out.push('<path d="M' + X(-d / 2) + ',' + Y(yE2 - ch) + ' L' + X(-d / 2 + ch) + ',' + Y(yE2) +
        ' H' + X(d / 2 - ch) + ' L' + X(d / 2) + ',' + Y(yE2 - ch) +
        '" style="' + stBolt() + '"/>');
    }

    /* ---- Sechskant-Silhouette (Kopf / Mutter), Ansicht über Eck ---- */
    function hexBody(yTop, h, arcsDown) {
      var f = 0.16 * h, fx = 0.55 * f;
      var yB = yTop + h;
      var pA = arcsDown ? yB : yTop;                   // gefaste Kante (von der Auflage weg)
      var d0 = 'M' + X(-e / 2) + ',' + Y(arcsDown ? yTop : yTop + f) +
        (arcsDown ? (' V' + Y(yB - f) + ' L' + X(-e / 2 + fx) + ',' + Y(yB) + ' H' + X(e / 2 - fx) +
                     ' L' + X(e / 2) + ',' + Y(yB - f) + ' V' + Y(yTop) + ' Z')
                  : (' L' + X(-e / 2 + fx) + ',' + Y(yTop) + ' H' + X(e / 2 - fx) +
                     ' L' + X(e / 2) + ',' + Y(yTop + f) + ' V' + Y(yB) + ' H' + X(-e / 2) + ' Z'));
      out.push('<path d="' + d0 + '" style="fill:var(--accent);opacity:.07"/>');
      out.push('<path d="' + d0 + '" style="' + stBolt() + '"/>');
      /* Fasenbögen (Norm-Look): Mittelbogen + zwei Eckbögen, dünn.
         Die Bögen hängen von der gefasten Kante ins Körperinnere durch. */
      var xm = 0.27 * e, dip = 0.85 * f;
      var inward = arcsDown ? -1 : 1;                  // Richtung Körperinneres (mm, y n. unten)
      var bulge = pA + inward * dip;
      out.push('<path d="M' + X(-xm) + ',' + Y(pA) + ' Q ' + X(0) + ',' + Y(bulge) +
        ' ' + X(xm) + ',' + Y(pA) + '" style="' + stBoltTh() + '"/>');
      var yEdge = pA + inward * f;                     // Fasen-Eckpunkt an der Seitenkante
      var side = function (sx) {
        var x0 = sx * (e / 2), x1 = sx * xm;
        var p = 'M' + X(x0) + ',' + Y(yEdge) + ' Q ' + X((x0 + x1) / 2) + ',' +
          Y(pA + inward * 0.12 * f) + ' ' + X(x1) + ',' + Y(pA);
        out.push('<path d="' + p + '" style="' + stBoltTh() + '"/>');
      };
      side(-1); side(1);
    }
    hexBody(-k, k, false);                             // Kopf: Fase oben
    if (joint === 'DSV') hexBody(lK, m, true);         // Mutter: Fase unten

    /* ---- Mittellinie (strichpunktiert, über alles hinaus) ---- */
    line(0, yTopMM - 6 / s, 0, yBotMM + 6 / s, stCenter());

    /* ================================================= Maß-Overlays (Chips) */
    function grp(key, inner) {
      out.push('<g data-sx-dim="' + key + '" style="display:none">' + inner + '</g>');
    }
    function pl(x1, y1p, x2, y2p, style, extra) {
      return tag('line', { x1: n2(x1), y1: n2(y1p), x2: n2(x2), y2: n2(y2p) }, style, extra);
    }
    function sym(x, y, t, anchor) {
      return '<text x="' + n2(x) + '" y="' + n2(y) + '" text-anchor="' + (anchor || 'start') +
        '" style="' + stSym() + '">' + esc(t) + '</text>';
    }
    var ar = 'marker-start="url(#' + pf + 'ar)" marker-end="url(#' + pf + 'ar)"';

    /* l_K — vertikales Maß rechts */
    (function () {
      var xr = X(DA / 2) + 20, xh = X(DA / 2) + 4;
      var g = pl(xh, Y(0), xr + 6, Y(0), stDim()) + pl(xh, Y(lK), xr + 6, Y(lK), stDim()) +
        pl(xr, Y(0), xr, Y(lK), stDim(), ar) + sym(xr + 9, (Y(0) + Y(lK)) / 2 + 4, 'l_K');
      grp('lK', g);
    })();

    /* D_A — horizontales Maß unten */
    (function () {
      var yb = Y(yBotMM) + 18, yh = Y((joint === 'DSV') ? lK : gkBot) + 3;
      var g = pl(X(-DA / 2), yh, X(-DA / 2), yb + 5, stDim()) + pl(X(DA / 2), yh, X(DA / 2), yb + 5, stDim()) +
        pl(X(-DA / 2), yb, X(DA / 2), yb, stDim(), ar) + sym(cx, yb - 5, 'D_A', 'middle');
      grp('DA', g);
    })();

    /* d_h — Lochkanten-Highlight + Leader */
    (function () {
      var g = '';
      segs.forEach(function (sg) {
        g += pl(X(-dh / 2), Y(sg.ya), X(-dh / 2), Y(sg.yb), stHl()) +
             pl(X(dh / 2), Y(sg.ya), X(dh / 2), Y(sg.yb), stHl());
      });
      var yl = segs.length ? (segs[0].ya + segs[0].yb) / 2 : lK / 4;
      var lx = X(DA / 2) + 44;
      g += pl(X(dh / 2), Y(yl), lx - 4, Y(yl) - 12, stDim()) +
        '<circle cx="' + X(dh / 2) + '" cy="' + Y(yl) + '" r="2.1" style="fill:var(--fg)"/>' +
        sym(lx, Y(yl) - 8, 'd_h');
      grp('dh', g);
    })();

    /* d — Gewinde-Highlight + Leader (am Überstand bzw. im Sichtbereich) */
    (function () {
      var ya0, yb0;
      if (joint === 'DSV') { ya0 = lK + m; yb0 = lK + m + ov - ch; }
      else { ya0 = Math.min(gewStart, lK - 0.02 * d); yb0 = lK; }
      var g = pl(X(-d / 2), Y(ya0), X(-d / 2), Y(yb0), stHl()) +
              pl(X(d / 2), Y(ya0), X(d / 2), Y(yb0), stHl());
      var ym = (ya0 + yb0) / 2, lx2 = X(DA / 2) + 44;
      g += pl(X(d / 2), Y(ym), lx2 - 4, Y(ym) + 2, stDim()) +
        '<circle cx="' + X(d / 2) + '" cy="' + Y(ym) + '" r="2.1" style="fill:var(--fg)"/>' +
        sym(lx2, Y(ym) + 6, 'd');
      grp('d', g);
    })();

    /* d_w — Auflagepunkte am Kopf + Leader */
    (function () {
      var g = pl(X(-dw / 2), Y(0) - 7, X(-dw / 2), Y(0) - 1, stHl()) +
              pl(X(dw / 2), Y(0) - 7, X(dw / 2), Y(0) - 1, stHl());
      var lx3 = X(DA / 2) + 44, ly = Y(0) - 14;
      g += pl(X(dw / 2), Y(0) - 4, lx3 - 4, ly, stDim()) +
        '<circle cx="' + X(dw / 2) + '" cy="' + n2(Y(0) - 4) + '" r="2.1" style="fill:var(--fg)"/>' +
        sym(lx3, ly + 4, 'd_w');
      grp('dw', g);
    })();

    /* φ — Kegel-Highlight + Winkelbogen am Fußpunkt */
    if (showCone) (function () {
      var g = '<g clip-path="url(#' + pf + 'cp)">';
      function hl(xa, ya, xb, yb) { g += pl(X(xa), Y(ya), X(xb), Y(yb), stHl()); }
      if (joint === 'DSV') {
        var xm2 = dw / 2 + tanphi * (lK / 2);
        hl(dw / 2, 0, xm2, lK / 2); hl(-dw / 2, 0, -xm2, lK / 2);
        hl(dw / 2, lK, xm2, lK / 2); hl(-dw / 2, lK, -xm2, lK / 2);
      } else {
        var xb3 = dw / 2 + tanphi * lK;
        hl(dw / 2, 0, xb3, lK); hl(-dw / 2, 0, -xb3, lK);
      }
      g += '</g>';
      var phi = Math.atan(tanphi), r = 22;
      var x0 = X(dw / 2), y0 = Y(0);
      var xe = x0 + Math.sin(phi) * r, ye = y0 + Math.cos(phi) * r;
      g += pl(x0, y0, x0, y0 + r + 4, stDim());
      g += '<path d="M' + n2(x0) + ',' + n2(y0 + r) + ' A' + r + ',' + r + ' 0 0 0 ' +
        n2(xe) + ',' + n2(ye) + '" style="' + stDim() + '"/>' +
        sym(x0 + 8, y0 + r + 14, 'φ');
      grp('phi', g);
    })();

    var svg = svgOpen + defs + out.join('') + '</svg>';

    /* ================================================= Legende (antippbar) */
    function item(chip, symTxt, nameKey, valTxt, dimKey) {
      var act = dimKey ? ' data-sx-chip="' + dimKey + '" role="button" tabindex="0" aria-pressed="false"' +
        ' style="cursor:pointer;border-radius:8px;padding:2px 6px;margin:-2px -6px"' : '';
      return '<div class="sb-val-item"' + act + '><span class="sb-chip ' + chip + '"></span>' +
        '<span class="sb-vsym">' + esc(symTxt) + '</span>' +
        '<span class="sb-vname">' + esc(T(TXT[nameKey])) + '</span>' +
        '<span class="sb-vnum">' + esc(valTxt) + '</span></div>';
    }
    var mm = '\u00A0mm';
    var rows = [];
    rows.push(item('sb-c-mix', joint, 'n_typ', T(joint === 'DSV' ? TXT.v_dsv : TXT.v_esv), null));
    rows.push(item('sb-c-accent', 'd', 'n_d', nf(d, 1) + mm, 'd'));
    rows.push(item('sb-c-accent', 'd_w', 'n_dw', nf(dw, 1) + mm, 'dw'));
    rows.push(item('sb-c-brass', 'd_h', 'n_dh', nf(dh, 1) + mm, 'dh'));
    rows.push(item('sb-c-brass', 'l_K', 'n_lK', nf(lK, 1) + mm, 'lK'));
    rows.push(item('sb-c-brass', 'D_A', 'n_DA', nf(DA, 1) + mm, 'DA'));
    if (showCone) {
      var deg = Math.atan(tanphi) * 180 / Math.PI;
      rows.push(item('sb-c-faint', 'φ', 'n_phi', nf(deg, 1) + '° (tan ' + nf(tanphi, 3) + ')', 'phi'));
    }
    var legend = '<div class="sb-vals" data-sx-legend="1">' + rows.join('') + '</div>' +
      '<div style="margin-top:6px;font-size:12px;color:var(--faint)">' + esc(T(TXT.hint)) + '</div>';

    return '<div data-sx-root="1">' + svg + legend + '</div>';
  }

  /* ------------------------------------------ Interaktivität (Chips) ------ */
  function setDim(container, key, on) {
    var nodes = container.querySelectorAll('[data-sx-dim="' + key + '"]');
    for (var i = 0; i < nodes.length; i++) nodes[i].style.display = on ? '' : 'none';
    var chips = container.querySelectorAll('[data-sx-chip="' + key + '"]');
    for (var j = 0; j < chips.length; j++) {
      chips[j].style.background = on ? 'var(--accent-soft)' : '';
      chips[j].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }
  function toggle(container, key) {
    var act = container.__sxActive || (container.__sxActive = {});
    act[key] = !act[key];
    setDim(container, key, act[key]);
  }
  function bind(container) {
    if (!container || container.__sxBound) return;
    container.__sxBound = true;
    container.addEventListener('click', function (ev) {
      var c = ev.target && ev.target.closest ? ev.target.closest('[data-sx-chip]') : null;
      if (c && container.contains(c)) toggle(container, c.getAttribute('data-sx-chip'));
    });
    container.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      var c = ev.target && ev.target.closest ? ev.target.closest('[data-sx-chip]') : null;
      if (c && container.contains(c)) { ev.preventDefault(); toggle(container, c.getAttribute('data-sx-chip')); }
    });
  }
  function refresh(container) {
    if (!container || !container.__sxActive) return;
    var act = container.__sxActive;
    for (var k in act) if (act[k]) setDim(container, k, true);
  }

  return { build: build, bind: bind, refresh: refresh, VERSION: VERSION };
});
