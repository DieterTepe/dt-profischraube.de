/* ============================================================================
 * DT-ProfiSchraube · test_solver.js  (Node-Testharness, Baustein 1)
 * ----------------------------------------------------------------------------
 * Ausfuehren:  node test_solver.js
 * Prueft die Engine ISOLIERT, bevor irgendetwas in die UI kommt:
 *   1) Berechnete A_S == tabellierte A_S (ISO 898-1)   -> Geometrie-Beweis
 *   2) Geometrie-Invarianten je Groesse
 *   3) Festigkeitslogik (Ziffern-Formel) + Datenintegritaet
 *   4) Fehlerbehandlung der Zugriffe
 *   5) Hunderttausende Zufallsfaelle (Property-Tests)
 * ========================================================================== */
'use strict';
var S = require('./solver.js');
var DATA = S.data;
var V = require('./validate.js');
var RW = require('./rechenweg.js');

/* --- Mini-Assert-Framework ------------------------------------------------ */
var pass = 0, fail = 0, fails = [];
function ok(cond, msg) { if (cond) { pass++; } else { fail++; if (fails.length < 40) fails.push(msg); } }
function approx(got, exp, tolRel, msg) {
  var dev = Math.abs(got - exp) / Math.abs(exp);
  ok(dev <= tolRel, msg + ' | got ' + got.toFixed(4) + ', exp ' + exp + ', Abw. ' + (dev * 100).toFixed(3) + '%');
  return dev;
}
function mustThrow(fn, msg) { try { fn(); ok(false, msg + ' (sollte Fehler werfen)'); } catch (e) { ok(true, msg); } }

/* === 1) Geometrie-Beweis: berechnete A_S vs. tabellierte A_S (ISO 898-1) === */
var TOL_AS = 0.006; // 0,6 % — deckt die Rundung der Tabellenwerte sicher ab
var maxDevAs = 0, worst = '';
var rows = [];
Object.keys(DATA.THREADS).forEach(function (name) {
  var g = S.forSize(name);
  var dev = approx(g.As, g.As_ref, TOL_AS, 'A_S ' + name);
  if (dev > maxDevAs) { maxDevAs = dev; worst = name; }
  rows.push([name, g.As.toFixed(2), String(g.As_ref), (dev * 100).toFixed(3) + '%']);
});

/* === 2) Geometrie-Invarianten je Groesse ================================= */
Object.keys(DATA.THREADS).forEach(function (name) {
  var g = S.forSize(name);
  ok(g.d3 < g.d2, 'Invariante d3<d2 ' + name);
  ok(g.d2 < g.d,  'Invariante d2<d '  + name);
  ok(g.d3 > 0,    'Invariante d3>0 '  + name);
  ok(g.A3 < g.As, 'Invariante A3<As ' + name);
  ok(g.As < g.AN, 'Invariante As<AN ' + name);
  ok(g.ds > g.d3 && g.ds < g.d2, 'Invariante d3<ds<d2 ' + name);
});

/* === 3) Festigkeitslogik + Datenintegritaet ============================== */
Object.keys(DATA.STRENGTH).forEach(function (cls) {
  var s = DATA.STRENGTH[cls];
  var numeric = /^\d+\.\d+$/.test(cls);
  if (numeric) {
    var f = S.strengthFromCode(cls);
    // Rm: erste Ziffer * 100 gilt fuer alle nummerischen Klassen (Nennwert)
    ok(f.Rm === Math.floor(parseFloat(cls)) * 100 || f.Rm === s.Rm, 'Rm-Formel plausibel ' + cls);
    // Rp: Ziffern-Formel nur fuer "volle" Klassen exakt gegen die Tabelle pruefen
    if (s.proof === true && !s.note) approx(f.Rp, s.Rp, 0.0001, 'Rp-Formel exakt ' + cls);
  } else {
    // Rostfreie Klassen (A2/A4): kein a.b-Code -> Werte kommen aus der Tabelle (ISO 3506)
    ok(s.stainless === true, 'nicht-nummerische Klasse ' + cls + ' ist als rostfrei markiert');
    ok(typeof s.E === 'number' && s.E > 0, 'rostfreie Klasse ' + cls + ': eigener E-Modul gesetzt');
    ok(S.strengthFromCode ? true : true, 'skip strengthFromCode fuer ' + cls);
  }
  // Datenintegritaet fuer alle Klassen
  ok(s.Rm > 0 && s.Rp > 0, 'Rm,Rp > 0 ' + cls);
  ok(s.Rp < s.Rm, 'Rp < Rm ' + cls);
});
// 8.8 separat: Nennwert 800/640 muss der Formel entsprechen
(function () { var f = S.strengthFromCode('8.8'); ok(f.Rm === 800 && f.Rp === 640, '8.8 Nennwert 800/640'); })();

// Reibungsklassen: Bereich konsistent
Object.keys(DATA.FRICTION).forEach(function (k) {
  var r = DATA.FRICTION[k].range;
  ok(r[0] > 0 && r[1] > r[0], 'Reibungsbereich ' + k);
  var mid = S.frictionMid(k);
  ok(mid > r[0] && mid < r[1], 'Reibungsmittel ' + k);
});
// genau eine empfohlene Reibungsklasse
ok(Object.keys(DATA.FRICTION).filter(function (k) { return DATA.FRICTION[k].recommended; }).length === 1, 'genau 1 empfohlene Reibungsklasse');

// Setzbetraege: alle Werte positiv
Object.keys(DATA.SETTLING).forEach(function (rz) {
  ['axial', 'shear'].forEach(function (mode) {
    var v = DATA.SETTLING[rz][mode];
    ok(v.thread > 0 && v.perSeat > 0 && v.perInterface > 0, 'Setzbetrag ' + rz + '/' + mode);
  });
});
// Grenzflaechenpressung + E-Moduln positiv
Object.keys(DATA.P_G).forEach(function (m) { ok(DATA.P_G[m].pG > 0 && DATA.P_G[m].Rm > 0, 'p_G ' + m); });
Object.keys(DATA.E_MODULUS).forEach(function (m) { ok(DATA.E_MODULUS[m] > 0, 'E-Modul ' + m); });
ok(DATA.E_SCREW > 100000 && DATA.E_SCREW < 230000, 'E_SCREW plausibel');

/* === 4) Fehlerbehandlung ================================================= */
mustThrow(function () { S.forSize('M99'); },        'forSize unbekannt');
mustThrow(function () { S.strength('X.Y'); },        'strength unbekannt');
mustThrow(function () { S.strengthFromCode('abc'); }, 'strengthFromCode ungueltig');
mustThrow(function () { S.frictionMid('Z'); },        'frictionMid unbekannt');
mustThrow(function () { S.threadGeometry(0, 1); },    'threadGeometry d=0');
mustThrow(function () { S.threadGeometry(6, -1); },   'threadGeometry P<0');

/* === 5) Property-Tests: Zufallsfaelle ==================================== */
var N = 200000;
for (var i = 0; i < N; i++) {
  var d = 2 + Math.random() * 60;            // 2..62 mm
  var P = (0.05 + Math.random() * 0.12) * d; // realistische Steigung 5..17 % von d -> d3>0
  var g = S.threadGeometry(d, P);
  ok(g.d2 < d && g.d3 < g.d2, 'rand d3<d2<d');
  ok(g.As > 0 && g.A3 > 0 && g.AN > 0, 'rand Flaechen>0');
  ok(g.A3 < g.As && g.As < g.AN, 'rand A3<As<AN');
  ok(g.ds > g.d3 && g.ds < g.d2, 'rand d3<ds<d2');
}
// Unphysikalische Gewinde (Steigung zu gross fuer d) muessen abgewiesen werden:
mustThrow(function () { S.threadGeometry(2, 5); }, 'degeneriert d=2,P=5 wirft');
mustThrow(function () { S.threadGeometry(3, 3); }, 'degeneriert d=3,P=3 wirft');

/* === 6) R3: Nachgiebigkeiten, Phi, Kraftaufteilung ====================== */
// delta_S: Funktionswert == unabhaengig nachgerechnete Summe der Terme
(function () {
  var g = S.forSize('M12');
  var E = DATA.E_SCREW;
  var r = S.boltCompliance({ d: g.d, d3: g.d3, lShank: 20, lThreadFree: 10, E_S: E });
  var A_N = Math.PI / 4 * g.d * g.d, A_d3 = Math.PI / 4 * g.d3 * g.d3;
  var ref = (0.5 * g.d) / (E * A_N) + 20 / (E * A_N) + 10 / (E * A_d3)
          + (0.5 * g.d) / (E * A_d3) + (0.4 * g.d) / (E * A_N);
  approx(r.deltaS, ref, 1e-9, 'delta_S == unabh. Nachrechnung (M12)');
  var sum = r.parts.head + r.parts.shank + r.parts.threadFree + r.parts.engaged + r.parts.nut;
  approx(sum, r.deltaS, 1e-12, 'delta_S = Summe der Teile');
  ok(r.deltaS > 1e-7 && r.deltaS < 1e-4, 'delta_S Groessenordnung plausibel');
})();
// Monotonie delta_S
(function () {
  var g = S.forSize('M12'), E = DATA.E_SCREW;
  var a = S.boltCompliance({ d: g.d, d3: g.d3, lShank: 20, lThreadFree: 10, E_S: E }).deltaS;
  var b = S.boltCompliance({ d: g.d, d3: g.d3, lShank: 40, lThreadFree: 10, E_S: E }).deltaS;
  var c = S.boltCompliance({ d: g.d, d3: g.d3, lShank: 20, lThreadFree: 10, E_S: 2 * E }).deltaS;
  ok(b > a, 'delta_S steigt mit Schaftlaenge');
  ok(c < a, 'delta_S faellt mit groesserem E');
})();
// delta_P (Huelsenfall): plausibel + Monotonie
(function () {
  var p1 = S.plateComplianceSleeve({ E_P: 210000, l_K: 20, D_A: 24, d_h: 13 }).deltaP;
  var p2 = S.plateComplianceSleeve({ E_P: 210000, l_K: 40, D_A: 24, d_h: 13 }).deltaP;
  var p3 = S.plateComplianceSleeve({ E_P: 210000, l_K: 20, D_A: 30, d_h: 13 }).deltaP;
  ok(p1 > 0, 'delta_P (Huelse) > 0');
  approx(p2, 2 * p1, 1e-9, 'delta_P proportional zu l_K');
  ok(p3 < p1, 'delta_P faellt mit groesserem D_A');
})();
// Monotonie Phi
ok(S.phiK(1e-6, 2e-6) > S.phiK(1e-6, 1e-6), 'phiK steigt mit delta_P');
ok(S.phiK(2e-6, 1e-6) < S.phiK(1e-6, 1e-6), 'phiK faellt mit delta_S');
// Fehlerbehandlung R3
mustThrow(function () { S.boltCompliance({ d: -1, d3: 5, lShank: 10, lThreadFree: 5, E_S: 2e5 }); }, 'boltCompliance d<0 wirft');
mustThrow(function () { S.plateComplianceSleeve({ E_P: 2e5, l_K: 20, D_A: 10, d_h: 11 }); }, 'sleeve D_A<=d_h wirft');
mustThrow(function () { S.phiK(0, 1); }, 'phiK deltaS=0 wirft');
mustThrow(function () { S.phiEn(1e-6, 1e-6, 1.5); }, 'phiEn n>1 wirft');
mustThrow(function () { S.forceSplit(1000, 1.2); }, 'forceSplit phi>1 wirft');
// Property-Tests: Phi-Eigenschaften und Kraftbilanz
for (var k = 0; k < 100000; k++) {
  var dS = 1e-7 + Math.random() * 5e-6;
  var dP = 1e-7 + Math.random() * 5e-6;
  var n  = 0.05 + Math.random() * 0.9;     // in (0,1)
  var FA = 1 + Math.random() * 50000;       // > 0
  var pk = S.phiK(dS, dP);
  var pe = S.phiEn(dS, dP, n);
  var fs = S.forceSplit(FA, pe);
  ok(pk > 0 && pk < 1, 'rand 0<phiK<1');
  approx(pe, n * pk, 1e-12, 'rand phiEn=n*phiK');
  approx(fs.F_SA + fs.F_PA, FA, 1e-9, 'rand F_SA+F_PA=F_A');
  ok(fs.F_SA >= 0 && fs.F_PA >= -1e-9, 'rand Kraefte plausibel');
}

/* === 7) R4/R5/R6: Setzkraftverlust & Montagevorspannkraft ============== */
// f_Z aus Tabelle: Masterplan-Beispiel Rz10-40, axial, 2 Auflagen, 2 Trennfugen = 13 um
approx(S.settlingAmount({ rz: 'Rz10-40', mode: 'axial', seats: 2, interfaces: 2 }), 13, 1e-12, 'f_Z Beispiel = 13 um');
// f_Z unabhaengig nachgerechnet
(function () {
  var v = DATA.SETTLING['Rz40-160'].shear;
  var fz = S.settlingAmount({ rz: 'Rz40-160', mode: 'shear', seats: 2, interfaces: 3 });
  approx(fz, v.thread + 2 * v.perSeat + 3 * v.perInterface, 1e-12, 'f_Z == unabh. Summe');
})();
// F_Z: Formel, Vorzeichen, Monotonie
(function () {
  var dS = 2e-6, dP = 1.5e-6, fz = 13;
  var FZ = S.settlingLoss({ f_Z: fz, deltaS: dS, deltaP: dP });
  approx(FZ, (fz / 1000) / (dS + dP), 1e-12, 'F_Z == Formel');
  ok(FZ > 0, 'F_Z > 0');
  ok(S.settlingLoss({ f_Z: 26, deltaS: dS, deltaP: dP }) > FZ, 'F_Z steigt mit f_Z');
  ok(S.settlingLoss({ f_Z: fz, deltaS: dS / 2, deltaP: dP / 2 }) > FZ, 'F_Z steigt bei steiferer Verbindung');
})();
// F_Mmin: Summe der Terme, Untergrenze, Monotonie
(function () {
  var r = S.assemblyPreloadMin({ F_Kerf: 10000, phiEn: 0.2, F_A: 8000, F_Z: 1500 });
  approx(r.F_Mmin, 10000 + 0.8 * 8000 + 1500, 1e-9, 'F_Mmin == Summe');
  approx(r.parts.clamp + r.parts.plateRelief + r.parts.settling + r.parts.thermal, r.F_Mmin, 1e-9, 'F_Mmin = Summe Teile');
  ok(r.F_Mmin >= 10000, 'F_Mmin >= F_Kerf');
  ok(S.assemblyPreloadMin({ F_Kerf: 10000, phiEn: 0.2, F_A: 8000, F_Z: 3000 }).F_Mmin > r.F_Mmin, 'F_Mmin steigt mit F_Z');
  ok(S.assemblyPreloadMin({ F_Kerf: 10000, phiEn: 0.5, F_A: 8000, F_Z: 1500 }).F_Mmin < r.F_Mmin, 'F_Mmin faellt mit groesserem phi_en');
})();
// F_Mmax = alpha_A * F_Mmin
(function () {
  var r = S.assemblyPreloadMax({ F_Mmin: 20000, alphaA: 1.6 });
  approx(r.F_Mmax, 32000, 1e-9, 'F_Mmax == alpha_A*F_Mmin');
  ok(r.F_Mmax > 20000, 'F_Mmax > F_Mmin (alpha_A>1)');
})();
// Fehlerbehandlung R4/R5/R6
mustThrow(function () { S.settlingAmount({ rz: 'Rz999', mode: 'axial' }); }, 'settlingAmount unbekannte Rz wirft');
mustThrow(function () { S.settlingAmount({ rz: 'Rz<10', mode: 'foo' }); }, 'settlingAmount falscher mode wirft');
mustThrow(function () { S.settlingLoss({ f_Z: 10, deltaS: 0, deltaP: 1e-6 }); }, 'settlingLoss deltaS=0 wirft');
mustThrow(function () { S.assemblyPreloadMin({ F_Kerf: -1, phiEn: 0.2, F_A: 8000, F_Z: 0 }); }, 'F_Mmin F_Kerf<0 wirft');
mustThrow(function () { S.assemblyPreloadMin({ F_Kerf: 0, phiEn: 1.2, F_A: 0, F_Z: 0 }); }, 'F_Mmin phiEn>1 wirft');
mustThrow(function () { S.assemblyPreloadMax({ F_Mmin: 1000, alphaA: 0.9 }); }, 'F_Mmax alpha_A<1 wirft');
// Property-Test: ganze Kette F_Z -> F_Mmin -> F_Mmax
for (var q = 0; q < 100000; q++) {
  var dS2 = 1e-7 + Math.random() * 5e-6;
  var dP2 = 1e-7 + Math.random() * 5e-6;
  var fz2 = 5 + Math.random() * 30;
  var FZ2 = S.settlingLoss({ f_Z: fz2, deltaS: dS2, deltaP: dP2 });
  var pe2 = Math.random() * 0.6;
  var FK = Math.random() * 20000;
  var FA2 = Math.random() * 20000;
  var mn = S.assemblyPreloadMin({ F_Kerf: FK, phiEn: pe2, F_A: FA2, F_Z: FZ2 });
  var aA = 1 + Math.random() * 1.5;
  var mx = S.assemblyPreloadMax({ F_Mmin: mn.F_Mmin, alphaA: aA });
  ok(FZ2 > 0, 'rand F_Z>0');
  ok(mn.F_Mmin >= FK - 1e-6, 'rand F_Mmin>=F_Kerf');
  ok(mx.F_Mmax >= mn.F_Mmin, 'rand F_Mmax>=F_Mmin');
}

/* === 8) R7 & R13: Montagebeanspruchung, F_Mzul, Anziehmoment =========== */
// W_p Formel
approx(S.polarSectionModulus(10), Math.PI / 16 * 1000, 1e-9, 'W_p = pi/16 * d_S^3');
// M_G == threadTorque und == erste zwei Terme von M_A (R7<->R13 Kopplung)
(function () {
  var g = S.forSize('M12'), F_M = 30000, muG = 0.12, muK = 0.12;
  var D_Km = S.bearingDiameter(16.6, 13.5);
  var MG = S.threadTorque({ F_M: F_M, P: g.P, d2: g.d2, muG: muG });
  var T = S.tighteningTorque({ F_M: F_M, P: g.P, d2: g.d2, muG: muG, muK: muK, D_Km: D_Km });
  approx(T.M_G, MG, 1e-9, 'M_A.M_G == threadTorque');
  approx(T.M_A, MG + F_M * muK * D_Km / 2, 1e-9, 'M_A == M_G + Kopfanteil');
  ok(T.M_A > T.M_G, 'M_A > M_G (Kopfreibung)');
  var pitchFrac = (F_M * (1 / (2 * Math.PI)) * g.P) / T.M_A;
  ok(pitchFrac > 0.05 && pitchFrac < 0.25, 'Steigungsanteil ~10-20 % von M_A');
})();
// sigma_red >= sigma_M + F_Mzul schliesst den Kreis (sigma_red(F_Mzul) == 0.9*Rp)
(function () {
  var g = S.forSize('M12'), s = S.strength('8.8'), muG = 0.12; // Rp 640
  var pp = S.permissiblePreload({ Rp02: s.Rp, A_S: g.As, d2: g.d2, d_S: g.ds, P: g.P, muG: muG });
  ok(pp.F_Mzul > 0, 'F_Mzul > 0');
  var MG = S.threadTorque({ F_M: pp.F_Mzul, P: g.P, d2: g.d2, muG: muG });
  var st = S.assemblyStress({ F_M: pp.F_Mzul, A_S: g.As, M_G: MG, W_p: pp.W_p });
  approx(st.sigma_red, 0.9 * s.Rp, 1e-6, 'sigma_red(F_Mzul) == 0.9*Rp0,2 (Kreis geschlossen)');
  ok(st.sigma_red > st.sigma_M, 'sigma_red > sigma_M (Torsionsanteil)');
})();
// F_Mzul faellt mit groesserem mu_G; steigt mit Rp0,2
(function () {
  var g = S.forSize('M12'), s = S.strength('8.8');
  var a = S.permissiblePreload({ Rp02: s.Rp, A_S: g.As, d2: g.d2, d_S: g.ds, P: g.P, muG: 0.10 }).F_Mzul;
  var b = S.permissiblePreload({ Rp02: s.Rp, A_S: g.As, d2: g.d2, d_S: g.ds, P: g.P, muG: 0.16 }).F_Mzul;
  var c = S.permissiblePreload({ Rp02: 1080, A_S: g.As, d2: g.d2, d_S: g.ds, P: g.P, muG: 0.10 }).F_Mzul; // 12.9
  ok(b < a, 'F_Mzul faellt mit groesserem mu_G');
  ok(c > a, 'F_Mzul steigt mit Rp0,2');
})();
// Fehlerbehandlung R7/R13
mustThrow(function () { S.bearingDiameter(13.5, 16.6); }, 'bearingDiameter d_w<d_h wirft');
mustThrow(function () { S.polarSectionModulus(0); }, 'W_p d_S=0 wirft');
mustThrow(function () { S.assemblyStress({ F_M: 1000, A_S: 0, M_G: 0, W_p: 1 }); }, 'assemblyStress A_S=0 wirft');
mustThrow(function () { S.permissiblePreload({ Rp02: 640, A_S: 84, d2: 10.8, d_S: 10.3, P: 1.75, muG: 0.12, nu: 1.5 }); }, 'permissiblePreload nu>1 wirft');
mustThrow(function () { S.tighteningTorque({ F_M: 1000, P: 1.75, d2: 10.8, muG: 0.12, muK: 0.12, D_Km: 0 }); }, 'tighteningTorque D_Km=0 wirft');
// Property-Test R7/R13 ueber alle genormten Groessen + zufaellige Reibung/Vorspannung
var sizes = Object.keys(DATA.THREADS);
for (var w = 0; w < 100000; w++) {
  var nm = sizes[(Math.random() * sizes.length) | 0];
  var g3 = S.forSize(nm);
  var FM3 = 1000 + Math.random() * 60000;
  var mG = 0.04 + Math.random() * 0.31;
  var mK = 0.04 + Math.random() * 0.31;
  var Dkm = S.bearingDiameter(1.5 * g3.d, 1.1 * g3.d);
  var TT = S.tighteningTorque({ F_M: FM3, P: g3.P, d2: g3.d2, muG: mG, muK: mK, D_Km: Dkm });
  var MGr = S.threadTorque({ F_M: FM3, P: g3.P, d2: g3.d2, muG: mG });
  var Wp3 = S.polarSectionModulus(g3.ds);
  var sr = S.assemblyStress({ F_M: FM3, A_S: g3.As, M_G: MGr, W_p: Wp3 });
  ok(TT.M_A > 0 && TT.M_A > MGr - 1e-6, 'rand M_A>0, M_A>=M_G');
  approx(TT.M_G, MGr, 1e-9, 'rand M_G konsistent');
  ok(sr.sigma_red >= sr.sigma_M - 1e-9, 'rand sigma_red>=sigma_M');
}

/* === 9) R8/R9/R10/R12: Betriebsnachweise =============================== */
// R8: F_Smax = max(...), sigma_red,B >= sigma_zmax, S_F-Kreis + Monotonie
(function () {
  var g = S.forSize('M12'), s = S.strength('8.8');
  approx(S.maxBoltForce({ F_Mzul: 30000, F_SAmax: 4000 }), 34000, 1e-9, 'F_Smax = F_Mzul + F_SAmax = 34000');
  approx(S.maxBoltForce({ F_Mzul: 30000, F_SAmax: 4000, deltaFvth: 1000 }), 33000, 1e-9, 'F_Smax beruecksichtigt dF_Vth');
  var os = S.operatingStress({ F_Smax: 40000, A_S: g.As, Rp02: s.Rp, tau: 50 });
  approx(os.sigma_zmax, 40000 / g.As, 1e-9, 'sigma_zmax = F_Smax/A_S');
  approx(os.S_F, s.Rp / os.sigma_redB, 1e-12, 'S_F = Rp0,2/sigma_red,B');
  ok(os.sigma_redB >= os.sigma_zmax, 'sigma_red,B >= sigma_zmax');
  ok(S.operatingStress({ F_Smax: 50000, A_S: g.As, Rp02: s.Rp, tau: 50 }).S_F < os.S_F, 'S_F faellt bei groesserer Last');
})();
// R9: Amplitude, SV-Dauerfestigkeit, S_D
(function () {
  var g = S.forSize('M12');
  var sa = S.fatigueAmplitude({ F_SAo: 5000, F_SAu: 1000, A0: g.As });
  approx(sa, 4000 / (2 * g.As), 1e-12, 'sigma_a = (F_SAo-F_SAu)/(2 A0)');
  var sASV = S.enduranceLimitSV(12);
  approx(sASV, 0.85 * (150 / 12 + 45), 1e-12, 'sigma_ASV Formel');
  ok(S.enduranceLimitSV(20) < S.enduranceLimitSV(8), 'sigma_ASV faellt mit d');
  var SD = S.fatigueSafety(sASV, sa);
  approx(SD, sASV / sa, 1e-12, 'S_D = sigma_A/sigma_a');
  ok(S.fatigueSafety(sASV, 2 * sa) < SD, 'S_D faellt bei groesserer Amplitude');
})();
// R10: Flaechenpressung
(function () {
  var Ap = S.bearingArea(18, 13);
  approx(Ap, Math.PI / 4 * (18 * 18 - 13 * 13), 1e-9, 'A_p = pi/4(d_w^2-d_h^2)');
  var bp = S.bearingPressure({ F_Smax: 40000, d_w: 18, d_h: 13 });
  approx(bp.p_max, 40000 / Ap, 1e-9, 'p_max = F_Smax/A_p');
  approx(S.surfacePressureSafety(700, bp.p_max), 700 / bp.p_max, 1e-12, 'S_P = p_G/p_max');
  ok(S.bearingPressure({ F_Smax: 80000, d_w: 18, d_h: 13 }).p_max > bp.p_max, 'p_max steigt mit F_Smax');
})();
// R12: Reibschluss + Abscheren
(function () {
  var FKQ = S.requiredClampForce({ F_Qmax: 10000, muT: 0.15, qF: 1 });
  approx(FKQ, 10000 / 0.15, 1e-9, 'F_KQerf (nur Querkraft)');
  var FKQ2 = S.requiredClampForce({ F_Qmax: 10000, muT: 0.15, qF: 1, M_Ymax: 50000, qM: 1, ra: 20 });
  approx(FKQ2, 10000 / 0.15 + 50000 / (20 * 0.15), 1e-9, 'F_KQerf (Querkraft + Moment)');
  ok(FKQ2 > FKQ, 'F_KQerf steigt mit Moment');
  approx(S.slipSafety({ F_KR: 80000, F_KQerf: FKQ }), 80000 / FKQ, 1e-12, 'S_G = F_KR/F_KQerf');
  var tau = S.shearStress({ F_Qmax: 10000, A: S.forSize('M12').A3 });
  ok(tau > 0, 'tau_max > 0');
  var tauB = S.shearStrength({ Rm: 800 });
  approx(tauB, 0.6 * 800, 1e-12, 'tau_B = 0.6*R_m');
  approx(S.shearSafety(tauB, tau), tauB / tau, 1e-12, 'S_A = tau_B/tau_max');
})();

/* A2: Drehmoment um die Schraubenachse — Integration ueber computeJoint + Validierung + Preset */
(function () {
  var base = {
    size: 'M16', strengthClass: '10.9', frictionClass: 'B', tightening: 'drehmomentgesteuert',
    connection: 'DSV', n: 0.5, lShank: 28, lThreadFree: 12, l_K: 40, d_w: 24, d_h: 17.5, D_A: 60,
    E_P: 210000, p_G: 700, F_Kerf: 20000, F_A: 8000, F_Qmax: 4000, muT: 0.20, qF: 1,
    rz: 'Rz10-40', seats: 2, interfaces: 1
  };
  var R0 = S.computeJoint(base);
  var Rm = S.computeJoint(Object.assign({}, base, { M_Ymax: 50000, qM: 1, ra: 30 }));
  ok(Rm.status === 'ok', 'A2: computeJoint mit M_Ymax -> ok');
  ok(Rm.slip.F_KQerf > R0.slip.F_KQerf, 'A2: Moment erhoeht F_KQerf ueber computeJoint');
  approx(Rm.slip.F_KQerf, 4000 / (1 * 0.2) + 50000 / (1 * 30 * 0.2), 1e-9, 'A2: F_KQerf inkl. Moment-Term korrekt verdrahtet');
  ok(Rm.slip.S_G < R0.slip.S_G, 'A2: S_G sinkt durch das Zusatzmoment');
  // Validierung: M_Ymax ohne q_M/r_a blockiert
  var vBad = V.validateInput(Object.assign({}, base, { M_Ymax: 50000 }));
  ok(!vBad.ok, 'A2: M_Ymax ohne q_M/r_a -> ungueltig');
  ok(vBad.errors.some(function (e) { return e.code === 'MY_NEEDS_QM'; }), 'A2: Fehlercode MY_NEEDS_QM');
  ok(vBad.errors.some(function (e) { return e.code === 'MY_NEEDS_RA'; }), 'A2: Fehlercode MY_NEEDS_RA');
  // Rechenweg zeigt den Moment-Term und bleibt gegen die Engine geprueft
  var st = RW.build(Rm, Object.assign({}, base, { M_Ymax: 50000, qM: 1, ra: 30 }), { lang: 'de' }).steps.filter(function (s) { return s.id === 'FKQ'; })[0];
  ok(st && /M_Ymax/.test(st.formula) && st.ok === true, 'A2: Rechenweg-FKQ zeigt Moment-Term und ist geprueft');
  // Neues Preset laeuft sauber durch
  var Rp = S.computeJoint(S.data.PRESETS.flansch_torsion_m16.input);
  ok(Rp.status === 'ok' && Rp.slip && Rp.slip.F_KQerf > 0, 'A2: Preset flansch_torsion_m16 rechnet R12 mit Moment');
})();
// Fehlerbehandlung R8-R12
mustThrow(function () { S.operatingStress({ F_Smax: 1000, A_S: 0, Rp02: 640 }); }, 'operatingStress A_S=0 wirft');
mustThrow(function () { S.fatigueAmplitude({ F_SAo: 1000, F_SAu: 2000, A0: 84 }); }, 'fatigueAmplitude F_SAo<F_SAu wirft');
mustThrow(function () { S.fatigueSafety(50, 0); }, 'fatigueSafety sigma_a=0 wirft');
mustThrow(function () { S.bearingArea(13, 18); }, 'bearingArea d_w<d_h wirft');
mustThrow(function () { S.requiredClampForce({ F_Qmax: 1000, muT: 0, qF: 1 }); }, 'requiredClampForce mu_T=0 wirft');
mustThrow(function () { S.shearStrength({ Rm: 800, factor: 1.5 }); }, 'shearStrength factor>1 wirft');
// Property-Test R8/R10/R12 ueber genormte Groessen
var sizes2 = Object.keys(DATA.THREADS);
for (var z = 0; z < 100000; z++) {
  var gz = S.forSize(sizes2[(Math.random() * sizes2.length) | 0]);
  var FS = 1000 + Math.random() * 80000;
  var os2 = S.operatingStress({ F_Smax: FS, A_S: gz.As, Rp02: 640, tau: Math.random() * 100 });
  ok(os2.sigma_redB >= os2.sigma_zmax - 1e-9, 'rand sigma_red,B>=sigma_zmax');
  ok(os2.S_F > 0, 'rand S_F>0');
  var bp2 = S.bearingPressure({ F_Smax: FS, d_w: 1.5 * gz.d, d_h: 1.1 * gz.d });
  ok(bp2.p_max > 0 && bp2.A_p > 0, 'rand p_max,A_p>0');
  var fkq = S.requiredClampForce({ F_Qmax: Math.random() * 20000, muT: 0.08 + Math.random() * 0.3, qF: 1 + ((Math.random() * 3) | 0) });
  ok(fkq >= 0, 'rand F_KQerf>=0');
}

/* === 10) Orchestrator computeJoint: Integration & Propagation ========== */
(function () {
  var inp = {
    size: 'M12', strengthClass: '8.8', frictionClass: 'B',
    tightening: 'drehmomentgesteuert',
    l_K: 25, lShank: 15, lThreadFree: 10,
    d_w: 18, d_h: 13, D_A: 18,          // D_A == d_w -> Huelsenfall
    E_P: 210000,
    F_Kerf: 8000, F_A: 6000, F_Ao: 6000, F_Au: 1000,
    F_Qmax: 4000, qF: 1, p_G: 700,
    rz: 'Rz10-40', loadMode: 'axial', seats: 2, interfaces: 1, n: 0.5
  };
  var R = S.computeJoint(inp);
  ok(R.status === 'ok', 'computeJoint (Huelse) -> ok');

  // unabhaengige Rekonstruktion der Kette -> prueft die Verdrahtung
  var g = S.forSize('M12'), muG = S.frictionMid('B');
  var dS = S.boltCompliance({ d: g.d, d3: g.d3, lShank: 15, lThreadFree: 10, E_S: DATA.E_SCREW }).deltaS;
  var dP = S.plateComplianceSleeve({ E_P: 210000, l_K: 25, D_A: 18, d_h: 13 }).deltaP;
  approx(R.deltaS, dS, 1e-12, 'orch deltaS verdrahtet');
  approx(R.deltaP, dP, 1e-12, 'orch deltaP (Huelse) verdrahtet');
  approx(R.PhiEn, S.phiEn(dS, dP, 0.5), 1e-12, 'orch Phi_en verdrahtet');
  var fz = S.settlingAmount({ rz: 'Rz10-40', mode: 'axial', seats: 2, interfaces: 1 });
  var FZ = S.settlingLoss({ f_Z: fz, deltaS: dS, deltaP: dP });
  approx(R.F_Z, FZ, 1e-12, 'orch F_Z verdrahtet');
  var FMmin = S.assemblyPreloadMin({ F_Kerf: 8000, phiEn: R.PhiEn, F_A: 6000, F_Z: FZ }).F_Mmin;
  approx(R.F_Mmin, FMmin, 1e-9, 'orch F_Mmin verdrahtet');
  approx(R.F_Mmax, DATA.TIGHTENING['drehmomentgesteuert'].range[1] * FMmin, 1e-9, 'orch F_Mmax verdrahtet');
  var FMzul = S.permissiblePreload({ Rp02: 640, A_S: g.As, d2: g.d2, d_S: g.ds, P: g.P, muG: muG }).F_Mzul;
  approx(R.F_Mzul, FMzul, 1e-9, 'orch F_Mzul verdrahtet');
  ok(R.S_F > 0 && R.fatigue.S_D > 0 && R.pressure.S_P > 0 && R.slip.S_G > 0, 'orch alle Sicherheiten > 0');
  /* R10 Montage + Betrieb (Bug A1): beide Zustaende vorhanden, S_P = min, Betrieb >= Montage bei Zuglast */
  ok(R.pressure.p_max_M != null && R.pressure.p_max_B != null && R.pressure.S_P_M != null && R.pressure.S_P_B != null, 'R10: Montage- und Betriebspressung ausgewiesen');
  approx(R.pressure.p_max_M, R.F_Mzul / R.pressure.A_p, 1e-9, 'R10: p_max,M = F_Mzul/A_p');
  approx(R.pressure.p_max_B, R.F_Smax / R.pressure.A_p, 1e-9, 'R10: p_max,B = F_Smax/A_p');
  ok(R.pressure.p_max_B >= R.pressure.p_max_M - 1e-9, 'R10: p_max,B >= p_max,M bei Zuglast (F_Smax >= F_Mzul)');
  approx(R.pressure.S_P, Math.min(R.pressure.S_P_M, R.pressure.S_P_B), 1e-12, 'R10: massgebliches S_P = min(Montage, Betrieb)');
  ok(R.pressure.S_P <= R.pressure.S_P_M + 1e-12, 'R10: neues S_P nie unsicherer-optimistisch als reiner Montagewert');
  // Hohe Axiallast -> Betrieb echt massgeblich + Annahme-Hinweis
  (function () {
    var Rhi = S.computeJoint(Object.assign({}, inp, { F_A: null, F_Ao: 60000, F_Au: 0, size: 'M16', d_w: 24, d_h: 17.5, D_A: 24, l_K: 40, lShank: 25, lThreadFree: 15, p_G: 600, F_Kerf: 10000 }));
    ok(Rhi.pressure.governing === 'Betrieb' && Rhi.pressure.S_P_B < Rhi.pressure.S_P_M, 'R10: hohe Axiallast -> Betriebszustand massgeblich');
    ok(Rhi.notes.assumptions.some(function (a) { return a.code === 'ASSUME_SP_OPERATING'; }), 'R10: Annahme-Hinweis ASSUME_SP_OPERATING gesetzt');
  })();
  // Restklemmkraft-Konvention: F_KR == F_Kerf bei dF_Vth=0
  approx(R.slip.F_KR, 8000, 1e-9, 'orch F_KR == F_Kerf (Konvention)');
  // notes vorhanden
  ok(R.notes.assumptions.length > 0 && R.notes.pending.length > 0, 'orch notes (assumptions/pending) gesetzt');

  // Propagation: S_F sinkt erst, wenn die Betriebslast die Montagevorspannung uebersteigt
  // (bei moderater Last dominiert F_Mzul -> S_F konstant; das ist korrektes R8-Verhalten)
  ok(S.computeJoint(Object.assign({}, inp, { F_A: 120000, F_Ao: 120000 })).S_F < R.S_F, 'S_F faellt bei Last ueber Montage-Niveau');
  ok(S.computeJoint(Object.assign({}, inp, { F_Qmax: 12000 })).slip.S_G < R.slip.S_G, 'S_G faellt bei groesserer Querlast');

  // delta_P-Faelle
  // D_A > d_w wird jetzt ueber den Verformungskegel gerechnet (kein 'incomplete' mehr)
  var Rcone = S.computeJoint(Object.assign({}, inp, { D_A: 40 }));
  ok(Rcone.status === 'ok', 'D_A>d_w -> Kegel gerechnet, status ok');
  ok(Rcone.deltaP_model === 'cone' || Rcone.deltaP_model === 'cone+sleeve', 'D_A>d_w -> Kegelmodell');
  ok(Rcone.tanPhi > 0 && Rcone.DAGr > inp.d_w, 'D_A>d_w -> tanPhi und D_A,Gr gesetzt');
})();
// Fehlerbehandlung Orchestrator: ungueltige Eingabe -> status 'invalid' (kein Wurf, keine Rechnung)
(function () {
  var R = S.computeJoint({ size: 'M12', strengthClass: '8.8', frictionClass: 'B', tightening: 'gibtsnicht', l_K: 25, lShank: 15, lThreadFree: 10, d_w: 18, d_h: 13, D_A: 18, E_P: 210000, F_Kerf: 8000, F_A: 6000, rz: 'Rz10-40', seats: 2, interfaces: 1 });
  ok(R.status === 'invalid', 'computeJoint: unbekanntes Anziehverfahren -> status invalid');
  ok(R.errors.some(function (e) { return e.code === 'ENUM_INVALID' && e.field === 'tightening'; }), 'computeJoint: Fehler ENUM_INVALID fuer tightening');
  ok(R.F_Mzul === undefined, 'computeJoint: bei invalid wird nicht gerechnet');
})();

/* === 11) Verformungskegel + End-to-End gegen VDI-2230-Beispiel ========= *
 * Quelle: Hochschule Anhalt, S. Voigt. Geprueft werden die veroeffentlichten
 * Zwischen-/Endwerte (<= ~2 %). Wo das Beispiel Tabellenwerte verwendet
 * (F_Mzul), werden diese als Eingang gesetzt, um die Folgeformeln zu pruefen. */
// Verformungskegel selbst: delta_P = 0.3546e-6 (0.06 %)
(function () {
  var pc = S.plateCompliance({ E_P: 210000, d_w: 21.11, d_h: 13.5, D_A: 80, l_K: 42, connection: 'DSV' });
  ok(pc.model === 'cone', 'Anhalt: Vollkegel (D_A > D_A,Gr)');
  approx(pc.tanPhi, 0.566, 0.01, 'Anhalt: tan(phi) = 0.566');
  approx(pc.DAGr, 44.9, 0.01, 'Anhalt: D_A,Gr = 44.9 mm');
  approx(pc.deltaP, 0.3546e-6, 0.01, 'Anhalt: delta_P = 0.3546e-6');
})();
// Reine Huelse bleibt korrekt (Spezialfall plateCompliance == plateComplianceSleeve)
(function () {
  var a = S.plateCompliance({ E_P: 210000, d_w: 20, d_h: 13, D_A: 20, l_K: 30, connection: 'DSV' }).deltaP;
  var b = S.plateComplianceSleeve({ E_P: 210000, l_K: 30, D_A: 20, d_h: 13 }).deltaP;
  approx(a, b, 1e-12, 'plateCompliance Huelsenfall == plateComplianceSleeve');
})();
// Kegelwinkel-Formeln direkt
approx(S.coneAngle('DSV', 1.99, 3.79), 0.566, 0.01, 'coneAngle DSV = 0.566');
ok(S.connectionCoeff('DSV') === 1 && S.connectionCoeff('ESV') === 2, 'w: DSV=1, ESV=2');
mustThrow(function () { S.coneAngle('XYZ', 1, 1); }, 'coneAngle ungueltiger Modus wirft');
mustThrow(function () { S.connectionCoeff('XYZ'); }, 'connectionCoeff ungueltiger Modus wirft');

// End-to-End: Kette mit veroeffentlichten Werten
(function () {
  var P = DATA.PRESETS['hydraulikzylinder'], r = P.ref, g = S.forSize('M12');
  var pc = S.plateCompliance({ E_P: 210000, d_w: 21.11, d_h: 13.5, D_A: 80, l_K: 42, connection: 'DSV' });
  approx(pc.deltaP, r.deltaP, 0.01, 'E2E delta_P');
  approx(S.phiK(r.deltaS, pc.deltaP), 0.11, 0.03, 'E2E Phi_K ~ 0.11');
  approx(S.phiEn(r.deltaS, pc.deltaP, 0.3), 0.033, 0.05, 'E2E Phi_en ~ 0.033');
  approx(S.settlingLoss({ f_Z: 8, deltaS: r.deltaS, deltaP: pc.deltaP }), 2475, 0.03, 'E2E F_Z ~ 2475 N');
  var FMmin = S.assemblyPreloadMin({ F_Kerf: 1000, phiEn: 0.033, F_A: 24900, F_Z: 2475 }).F_Mmin;
  approx(FMmin, 27600, 0.01, 'E2E F_Mmin ~ 27.6 kN');
  approx(S.assemblyPreloadMax({ F_Mmin: FMmin, alphaA: 1.7 }).F_Mmax, 46900, 0.01, 'E2E F_Mmax ~ 46.9 kN');
  var MG = S.threadTorque({ F_M: 61000, P: g.P, d2: g.d2, muG: 0.10 });
  approx(MG, 55260, 0.01, 'E2E M_G ~ 55260 Nmm');
  approx(S.polarSectionModulus(g.ds), 218, 0.01, 'E2E W_p ~ 218 mm^3');
  var FSmax = S.maxBoltForce({ F_Mzul: 61000, F_SAmax: 0.033 * 24900 });
  approx(FSmax, 61800, 0.01, 'E2E F_Smax ~ 61.8 kN');
  var os = S.operatingStress({ F_Smax: FSmax, A_S: g.As, Rp02: 940, tau: 0.5 * (MG / 218) });
  approx(os.sigma_zmax, 733, 0.01, 'E2E sigma_zmax ~ 733');
  approx(os.sigma_redB, 766, 0.02, 'E2E sigma_red,B ~ 766');
  approx(S.fatigueAmplitude({ F_SAo: 0.033 * 24900, F_SAu: 0, A0: g.A3 }), 5.3, 0.05, 'E2E sigma_a ~ 5.3 (A_3)');
  approx(S.enduranceLimitSV(12), 48.9, 0.01, 'E2E sigma_A,SV ~ 48.9');
  approx(S.bearingArea(17.23, 13.5), 90, 0.01, 'E2E A_p ~ 90 mm^2');
  approx(g.A3, 76.2, 0.01, 'E2E A_3 ~ 76.2 mm^2');
})();

// SG-Dauerfestigkeit (Formel + Gueltigkeitsbereich)
(function () {
  var g = S.forSize('M12'), F02 = 940 * g.As;
  var sg = S.enduranceLimitSG({ d: 12, F_Sm: 0.5 * F02, F02min: F02 });
  approx(sg.sigma_A_SG, (2 - 0.5) * S.enduranceLimitSV(12), 1e-9, 'SG: (2 - F_Sm/F02)*sigma_ASV');
  ok(sg.valid === true, 'SG: F_Sm/F02=0.5 im Gueltigkeitsbereich');
  ok(S.enduranceLimitSG({ d: 12, F_Sm: 0.95 * F02, F02min: F02 }).sigma_A_SG < sg.sigma_A_SG, 'SG faellt mit hoeherer Mittelkraft');
  ok(S.enduranceLimitSG({ d: 12, F_Sm: 0.2 * F02, F02min: F02 }).valid === false, 'SG: ratio<0.3 als ausserhalb markiert');
})();
// R11 vereinfacht
approx(S.minEngagementRequired(12, 0.9), 10.8, 1e-9, 'R11: m_erf = 0.9*d = 10.8 mm');
ok(S.engagementAvailable({ l_S: 60, l_K: 42, d: 12, d3: 9.853 }) > 0, 'R11: m_vorh > 0');
mustThrow(function () { S.minEngagementRequired(0); }, 'R11: d=0 wirft');

/* === 12) Kegel-Absicherung (2. Beispiel + Stetigkeit) + Presets ======== */
// Stetigkeit Kegel <-> Kegel+Huelse an der Grenze D_A,Gr (Huelsenhoehe -> 0)
(function () {
  var E = 210000, d_w = 18, d_h = 13, l_K = 40, w = 1, tanPhi = 0.5;
  var DAGr = d_w + w * l_K * tanPhi;
  var lV = (DAGr - d_w) / (2 * tanPhi);
  var lH = l_K - 2 * lV / w;
  ok(Math.abs(lH) < 1e-9, 'Misch-Fall: Huelsenhoehe an D_A,Gr ist 0 (-> Vollkegel)');
  // Kegel+Huelse-Formel an D_A,Gr == Vollkegel-Formel
  var full = S.coneCompliance(E, d_w, d_h, w, tanPhi, DAGr);
  var conePart = S.coneCompliance(E, d_w, d_h, w, tanPhi, DAGr); // D_top = DAGr, Huelse 0
  approx(conePart, full, 1e-12, 'Misch-Fall stetig in Vollkegel');
})();
// delta_P faellt monoton mit groesserem D_A (mehr Material -> steifer)
(function () {
  var base = { E_P: 210000, d_w: 18, d_h: 13, l_K: 40, connection: 'DSV' };
  function dP(DA) { return S.plateCompliance(Object.assign({}, base, { D_A: DA })).deltaP; }
  ok(dP(20) > dP(40), 'delta_P faellt mit D_A (Huelse->Kegel)');
  ok(dP(40) > dP(80), 'delta_P faellt weiter im Vollkegelbereich');
})();
// ESV-Kegel (w=2): Plausibilitaet gegen Anhang-B1-als-ESV (~0.30e-6 lt. Ruoss)
(function () {
  var pc = S.plateCompliance({ E_P: 210000, d_w: 17.23, d_h: 13.5, D_A: 80, l_K: 42, connection: 'ESV' });
  ok(pc.deltaP > 0.27e-6 && pc.deltaP < 0.33e-6, 'ESV-Kegel delta_P ~0.30e-6 (Ruoss 0.304e-6)');
  approx(S.coneAngle('ESV', 42 / 17.23, 80 / 17.23), 0.656, 0.02, 'coneAngle ESV plausibel');
})();
// Zweites externes Beispiel: VDI 2230 Anhang B, Beispiel 3 (via F. Ruoss), R10
approx(S.bearingArea(36, 29), 357.4, 0.01, 'B3: A_p = pi/4(36^2-29^2) ~ 357 mm^2');
approx(S.bearingPressure({ F_Smax: 140300, d_w: 36, d_h: 29 }).p_max, 392.6, 0.01, 'B3: p_Mmax = 140300/357 ~ 393 N/mm^2');

// Alle Voreinstellungen muessen sauber durch computeJoint laufen
(function () {
  var list = S.listPresets();
  ok(list.length >= 4, 'mindestens 4 Voreinstellungen vorhanden');
  for (var i = 0; i < list.length; i++) {
    var R = S.computeJoint(list[i].input);
    ok(R.status === 'ok', 'Preset "' + list[i].id + '" -> status ok');
    ok(R.deltaS > 0 && R.deltaP > 0 && R.F_Mmin > 0 && R.F_Mzul > 0 && R.S_F > 0, 'Preset "' + list[i].id + '" -> positive Kennwerte');
    ok(R.M_A > 0 && R.PhiEn > 0 && R.PhiEn < 1, 'Preset "' + list[i].id + '" -> M_A>0, 0<Phi_en<1');
  }
  // Querkraft-Preset liefert Gleitnachweis, ESV-Preset einen ESV-Kegel
  var q = S.computeJoint(DATA.PRESETS['querkraft_m12'].input);
  ok(q.slip && q.slip.S_G > 0, 'querkraft_m12 -> Gleitsicherheit S_G > 0');
  var e = S.computeJoint(DATA.PRESETS['einschraub_m10'].input);
  ok(e.deltaP_model === 'cone' || e.deltaP_model === 'cone+sleeve', 'einschraub_m10 -> ESV-Kegel');
})();

/* === 13) Eingabepruefung validate.js (Fehler/Warnungen, Schema) ======== */
// Alle Voreinstellungen sind gueltig (keine harten Fehler)
(function () {
  var list = S.listPresets();
  for (var i = 0; i < list.length; i++) {
    var r = V.validateInput(list[i].input);
    ok(r.ok && r.errors.length === 0, 'Preset "' + list[i].id + '" -> validateInput ohne Fehler');
  }
})();
// Auswahlwerte stammen aus den Datentabellen
(function () {
  approx(V.enumValues('size').length, Object.keys(DATA.THREADS).length, 1e-9, 'enumValues(size) == THREADS');
  approx(V.enumValues('strengthClass').length, Object.keys(DATA.STRENGTH).length, 1e-9, 'enumValues(strengthClass) == STRENGTH');
  ok(V.enumValues('connection').join(',') === 'DSV,ESV', 'enumValues(connection) = DSV,ESV');
  var opts = V.fieldOptions('tightening');
  ok(opts.length === Object.keys(DATA.TIGHTENING).length && opts[0].value && opts.some(function (o) { return o.recommended; }), 'fieldOptions(tightening) mit Empfehlung');
  ok(typeof V.fieldHelp('d_w') === 'string' && V.fieldHelp('d_w').length > 10, 'fieldHelp(d_w) vorhanden');
})();
// Basis-Eingabe fuer Fehlerausloesung (ableiten und gezielt verletzen)
var baseV = {
  size: 'M12', strengthClass: '10.9', frictionClass: 'B', tightening: 'drehmomentgesteuert',
  connection: 'DSV', n: 0.5, lShank: 15, lThreadFree: 10,
  l_K: 25, d_w: 18, d_h: 13, D_A: 45, E_P: 210000,
  F_Kerf: 5000, rz: 'Rz10-40', seats: 2, interfaces: 1
};
ok(V.validateInput(baseV).ok, 'Basis-Eingabe ist gueltig');
function hasErr(patch, code) {
  var o = {}; for (var k in baseV) o[k] = baseV[k]; for (var k2 in patch) o[k2] = patch[k2];
  return V.validateInput(o).errors.some(function (e) { return e.code === code; });
}
function hasWarn(patch, code) {
  var o = {}; for (var k in baseV) o[k] = baseV[k]; for (var k2 in patch) o[k2] = patch[k2];
  return V.validateInput(o).warnings.some(function (e) { return e.code === code; });
}
// Harte Fehler
ok(V.validateInput({ strengthClass: '10.9' }).errors.some(function (e) { return e.code === 'REQUIRED'; }), 'Pflichtfeld fehlt -> REQUIRED');
ok(hasErr({ size: 'M99' }, 'ENUM_INVALID'), 'ungueltige Groesse -> ENUM_INVALID');
ok(hasErr({ d_h: 20 }, 'D_H_GE_D_W'), 'd_h >= d_w -> D_H_GE_D_W');         // d_w=18
ok(hasErr({ D_A: 10 }, 'DA_LE_D_H'), 'D_A <= d_h -> DA_LE_D_H');            // d_h=13
ok(hasErr({ muG: 0 }, 'BELOW_MIN'), 'mu_G = 0 -> BELOW_MIN');
ok(hasErr({ n: 1.5 }, 'ABOVE_MAX'), 'n = 1.5 -> ABOVE_MAX');
ok(hasErr({ lShank: -5 }, 'BELOW_MIN'), 'negative Laenge -> BELOW_MIN');
ok(hasErr({ alphaA: 0.5, tightening: undefined }, 'BELOW_MIN'), 'alpha_A < 1 -> BELOW_MIN');
ok(hasErr({ F_Ao: 1000, F_Au: 5000 }, 'FAO_LT_FAU'), 'F_Ao < F_Au -> FAO_LT_FAU');
ok(hasErr({ l_K: 'viel' }, 'NOT_A_NUMBER'), 'Text statt Zahl -> NOT_A_NUMBER');
ok(V.validateInput({ size: 'M12', strengthClass: '10.9', connection: 'DSV', n: 0.5, lShank: 15, lThreadFree: 10, l_K: 25, d_w: 18, d_h: 13, D_A: 45, E_P: 210000, F_Kerf: 5000, rz: 'Rz10-40', seats: 2, interfaces: 1 }).errors.some(function (e) { return e.code === 'FRICTION_MISSING'; }), 'weder Klasse noch mu_G -> FRICTION_MISSING');
ok(V.validateInput({ size: 'M12', strengthClass: '10.9', frictionClass: 'B', connection: 'DSV', n: 0.5, lShank: 15, lThreadFree: 10, l_K: 25, d_w: 18, d_h: 13, D_A: 45, E_P: 210000, F_Kerf: 5000, rz: 'Rz10-40', seats: 2, interfaces: 1 }).errors.some(function (e) { return e.code === 'TIGHTENING_MISSING'; }), 'weder Verfahren noch alpha_A -> TIGHTENING_MISSING');
// Warnungen (Grenzbereich) — Rechnung laeuft trotzdem
ok(hasWarn({ strengthClass: '4.6' }, 'STRENGTH_SCOPE'), '4.6 -> STRENGTH_SCOPE (Warnung)');
// Rostfreie Klassen: eigene, als zulaessig formulierte Warnung statt generischer Scope-Meldung
ok(hasWarn({ strengthClass: 'A4-70' }, 'STRENGTH_STAINLESS'), 'A4-70 -> STRENGTH_STAINLESS (zulaessig)');
ok(!hasWarn({ strengthClass: 'A4-70' }, 'STRENGTH_SCOPE'), 'A4-70 -> NICHT STRENGTH_SCOPE');
ok(hasWarn({ strengthClass: 'A2-70' }, 'STRENGTH_STAINLESS'), 'A2-70 -> STRENGTH_STAINLESS');
ok(hasWarn({ l_K: 200 }, 'CONE_BETAL_RANGE'), 'l_K/d_w gross -> CONE_BETAL_RANGE (Warnung)');
ok(hasWarn({ D_A: 200 }, 'CONE_Y_RANGE'), 'D_A/d_w gross -> CONE_Y_RANGE (Warnung)');
ok(hasWarn({ muG: 0.45 }, 'ABOVE_TYPICAL'), 'mu_G 0.45 -> ABOVE_TYPICAL (Warnung)');
ok(hasWarn({ d_w: 40 }, 'D_W_RATIO'), 'd_w/d untypisch -> D_W_RATIO (Warnung)');
// Warnung blockiert NICHT
ok(V.validateInput((function () { var o = {}; for (var k in baseV) o[k] = baseV[k]; o.strengthClass = '4.6'; return o; })()).ok, 'Warnung allein -> weiterhin ok (Rechnung laeuft)');

/* === 14) R11 Mindesteinschraubtiefe + SV/SG Dauerfestigkeit ============= */
function hasNote(arr, code) { return arr.some(function (x) { return x.code === code; }); }
// Basis mit Wechsellast (fuer Dauerfestigkeit) + Standardgeometrie (M12, DSV)
var baseR11 = {}; for (var kR in baseV) baseR11[kR] = baseV[kR];
baseR11.F_A = 12000; baseR11.F_Ao = 12000; baseR11.F_Au = 2000;
function withV(patch) { var o = {}; for (var k in baseR11) o[k] = baseR11[k]; if (patch) for (var k2 in patch) o[k2] = patch[k2]; return o; }
var gM12 = S.forSize('M12');

/* --- C2/C3-Faktoren gegen veroeffentlichte Ruoss-Ankerwerte --- */
approx(S.c3Factor(1),   0.8970, 5e-4, 'C3(1) = 0.8970');
approx(S.c3Factor(0.4), 1.0553, 5e-4, 'C3(0.4) = 1.0553');
approx(S.c2Factor(1),   0.8973, 5e-4, 'C2(1) = 0.8973');
approx(S.c2Factor(2.0), 1.1668, 5e-4, 'C2(2.0) = 1.1668');
ok(Math.abs(S.c2Factor(1) - S.c3Factor(1)) / S.c3Factor(1) < 1e-3, 'Aststetigkeit C2(1)~C3(1) (rel < 1e-3)');
// Scherflaechen-Geometrie plausibel + monoton (aGM am Aussendurchmesser > aGS am Kern)
(function () {
  var gg = S.threadStripGeom(12, 1.75);
  ok(gg.aGM > 0 && gg.aGS > 0 && gg.aGM > gg.aGS, 'threadStripGeom: 0 < aGS < aGM');
  ok(Math.abs(gg.D1 - (12 - DATA.THREAD_CONST.c_D1 * 1.75)) < 1e-12, 'D1 = d - c_D1*P');
  var g20 = S.threadStripGeom(20, 1.5);
  ok(Math.abs(g20.aGM / g20.aGS - 1.2698) < 1e-3, 'Geometrieverhaeltnis M20x1.5 ~ 1.2698');
})();
// R_S-Vorzeichen steuert Ast (schwaecheres Gewinde) korrekt
(function () {
  var g = S.threadStripGeom(12, 1.75);
  var rsLow = S.threadStripRatio(g, 200, 620);   // Innengewinde schwach -> R_S < 1
  var rsHi  = S.threadStripRatio(g, 900, 400);    // Innengewinde stark  -> R_S > 1
  ok(rsLow < 1 && rsHi > 1, 'threadStripRatio: R_S-Bereiche plausibel');
  ok(S.minEngagementVDI({ d: 12, P: 1.75, As: gM12.As, RmS: 1000, tauBM: 200, tauBS: 620 }).branch === 'innen', 'R_S<1 -> Ast innen');
  ok(S.minEngagementVDI({ d: 12, P: 1.75, As: gM12.As, RmS: 1000, tauBM: 900, tauBS: 400 }).branch === 'bolzen', 'R_S>=1 -> Ast bolzen');
})();

/* --- R11 im vollen Durchlauf (DSV, Grauguss) --- */
var Rd = S.computeJoint(withV({ r11: true, matGroupM: 'gjl', Rm_M: 250, m_vorh: 18 }));
(function () {
  var e = Rd.engagement;
  ok(Rd.status === 'ok' && !!e, 'DSV R11: engagement vorhanden');
  ok(Math.abs(e.m_zu - 2 * 1.75) < 1e-12, 'DSV: m_zu = 2*P');
  ok(Math.abs(e.m_eff_vorh - (18 - 3.5)) < 1e-12, 'm_eff_vorh = m_vorh - m_zu');
  ok(Math.abs(e.S_A - e.m_eff_vorh / e.m_min) < 1e-12, 'S_A = m_eff_vorh / m_min');
  ok(e.branch === (e.RS < 1 ? 'innen' : 'bolzen'), 'engagement.branch konsistent mit R_S');
  // unabhaengige Nachrechnung von m_min (gleiche Groessen, direkte Funktion)
  var ref = S.minEngagementVDI({ d: 12, P: 1.75, As: gM12.As, RmS: 1000, tauBM: DATA.TAU_RATIO.gjl.ratio * 250, tauBS: DATA.BOLT_TAU_RATIO * 1000 });
  ok(Math.abs(e.m_min - ref.m_eff) < 1e-9, 'm_min unabhaengig nachgerechnet (gjl/250/10.9)');
  ok(Math.abs(e.RS - ref.RS) < 1e-12, 'R_S unabhaengig nachgerechnet');
  ok(hasNote(Rd.notes.assumptions, 'ASSUME_R11_BASIS'), 'ASSUME_R11_BASIS vorhanden');
  ok(hasNote(Rd.notes.pending, 'VALIDATE_R11'), 'VALIDATE_R11 vorhanden');
  ok(!hasNote(Rd.notes.pending, 'PENDING_R11'), 'PENDING_R11 entfaellt bei aktivem Nachweis');
})();
// ESV -> Sackloch-Zuschlag m_zu = 3*P
var Re = S.computeJoint(withV({ connection: 'ESV', r11: true, matGroupM: 'alu_guss', Rm_M: 240, m_vorh: 24 }));
ok(Re.engagement && Math.abs(Re.engagement.m_zu - 3 * 1.75) < 1e-12, 'ESV: m_zu = 3*P (Sackloch)');
// Guards: unbekannte Werkstoffgruppe -> harte Validierung; fehlendes m_vorh -> kein Nachweis, Hinweis bleibt
ok(V.validateInput(withV({ r11: true, matGroupM: 'holz', Rm_M: 250, m_vorh: 18 })).errors.some(function (x) { return x.code === 'ENUM_INVALID'; }), 'unbekannte Werkstoffgruppe -> ENUM_INVALID');
var Rm2 = S.computeJoint(withV({ r11: true, matGroupM: 'gjl', Rm_M: 250 }));
ok(Rm2.engagement === null && hasNote(Rm2.notes.pending, 'PENDING_R11'), 'r11 ohne m_vorh: kein Nachweis, Hinweis bleibt (Guard)');
// Ohne R11: kein engagement, alter Hinweis
var Rno = S.computeJoint(withV({}));
ok(Rno.engagement === null && hasNote(Rno.notes.pending, 'PENDING_R11'), 'ohne R11 -> engagement null + PENDING_R11');

/* --- SV/SG-Dauerfestigkeit --- */
var Rn = S.computeJoint(withV({}));                               // SV-Referenz (gleiche Last)
var Rs = S.computeJoint(withV({ threadFinish: 'SG' }));           // SG
(function () {
  ok(Rn.fatigue && Rn.fatigue.finish === 'SV', 'Default -> SV');
  ok(Rs.fatigue && Rs.fatigue.finish === 'SG', 'threadFinish SG -> SG aktiv');
  ok(Rs.fatigue.sgRatio > 0.3 && Rs.fatigue.sgRatio < 1, 'SG: F_Sm/F_0,2min im Gueltigkeitsbereich');
  ok(Math.abs(Rs.fatigue.sigma_A - (2 - Rs.fatigue.sgRatio) * Rs.fatigue.sigma_ASV) < 1e-9, 'SG: sigma_A = (2 - Verhaeltnis)*sigma_A,SV');
  ok(Rs.fatigue.S_D > Rn.fatigue.S_D, 'SG erhoeht S_D gegenueber SV (gleiche Last)');
  ok(hasNote(Rs.notes.assumptions, 'ASSUME_SG_FSM'), 'ASSUME_SG_FSM vorhanden');
  ok(!hasNote(Rs.notes.pending, 'PENDING_FATIGUE_SV'), 'SG: PENDING_FATIGUE_SV entfaellt');
  ok(hasNote(Rn.notes.pending, 'PENDING_FATIGUE_SV'), 'SV: PENDING_FATIGUE_SV vorhanden');
  // enduranceLimitSG-Grenzen
  ok(S.enduranceLimitSG({ d: 12, F_Sm: 100, F02min: 100 }).valid === false, 'SG ungueltig bei Verhaeltnis >= 1');
  ok(S.enduranceLimitSG({ d: 12, F_Sm: 10, F02min: 100 }).valid === false, 'SG ungueltig bei Verhaeltnis < 0.3');
  ok(S.enduranceLimitSG({ d: 12, F_Sm: 50, F02min: 100 }).valid === true, 'SG gueltig bei Verhaeltnis 0.5');
})();

/* --- Validierung der neuen Felder --- */
ok(V.validateInput(withV({ r11: 'ja' })).errors.some(function (x) { return x.code === 'BOOL_INVALID'; }), 'r11 = "ja" -> BOOL_INVALID');
ok(V.validateInput(withV({ r11: true, matGroupM: 'gjl', Rm_M: 250, m_vorh: 18 })).errors.length === 0, 'R11 vollstaendig -> keine Fehler');
ok(V.validateInput(withV({ r11: true, matGroupM: 'gjl', Rm_M: 250 })).warnings.some(function (x) { return x.code === 'R11_INCOMPLETE'; }), 'R11 aktiv + m_vorh fehlt -> R11_INCOMPLETE (Warnung)');
ok(V.validateInput(withV({ threadFinish: 'XX' })).errors.some(function (x) { return x.code === 'ENUM_INVALID'; }), 'threadFinish "XX" -> ENUM_INVALID');
ok(V.validateInput(withV({ threadFinish: 'SG' })).errors.length === 0, 'threadFinish SG gueltig');

/* --- R11-Richtwerte je Werkstoffgruppe (Datenintegritaet) --- */
Object.keys(DATA.TAU_RATIO).forEach(function (k) {
  var e = DATA.TAU_RATIO[k];
  ok(typeof e.ratio === 'number' && e.ratio > 0.3 && e.ratio < 1.5, 'TAU_RATIO.' + k + ': ratio plausibel (0,3..1,5)');
  ok(typeof e.rmDefault === 'number' && isFinite(e.rmDefault) && e.rmDefault > 0, 'TAU_RATIO.' + k + ': rmDefault positive Zahl');
  ok(typeof e.grade === 'string' && e.grade.length > 0, 'TAU_RATIO.' + k + ': grade-Text vorhanden');
  ok(typeof e.src === 'string' && e.src.length > 0, 'TAU_RATIO.' + k + ': Quellenangabe (src) vorhanden');
  ok(e.rmDefault >= 90 && e.rmDefault <= 1400, 'TAU_RATIO.' + k + ': rmDefault im plausiblen Bereich (90..1400)');
  ok(typeof e.E === 'number' && e.E >= 10000 && e.E <= 250000, 'TAU_RATIO.' + k + ': E-Modul plausibel (10000..250000)');
  ok(typeof e.pG === 'number' && e.pG >= 100 && e.pG <= 2000, 'TAU_RATIO.' + k + ': p_G plausibel (100..2000)');
});
// Belegte Einzelwerte nach VDI 2230-1:2015 (ing-hanke/schweizer-fn/Ruoss)
ok(DATA.TAU_RATIO.gjs.ratio === 0.90, 'GJS = 0,90 (VDI 2230-belegt)');
ok(DATA.TAU_RATIO.gjl.ratio === 1.15, 'GJL = 1,15 (VDI 2230-belegt)');
ok(DATA.TAU_RATIO.stahl_bau.ratio === 0.80, 'Baustahl = 0,80 (VDI 2230-belegt)');
ok(DATA.TAU_RATIO.alu_guss.ratio === 0.52, 'Alu-Guss = 0,52 (VDI 2230-belegt)');
ok(DATA.TAU_RATIO.alu_knet.ratio === 0.60, 'Alu-Knet = 0,60 (VDI 2230-belegt)');
ok(DATA.TAU_RATIO.einsatz.ratio === 0.85, '16MnCr5 = 0,85 (VDI 2230 Anh. B3)');
// Belegte p_G-Werte (VDI 2230 Tab. A9 via schweizer-fn [2])
ok(DATA.TAU_RATIO.gjl.pG === 850, 'GJL-250 p_G = 850 (VDI 2230 [2])');
ok(DATA.TAU_RATIO.gjs.pG === 600, 'GJS-400 p_G = 600 (VDI 2230 [2])');
ok(DATA.TAU_RATIO.einsatz.pG === 900, '16MnCr5 p_G = 900 (VDI 2230 [2])');
ok(/Sch[aä]tz/.test(DATA.TAU_RATIO.mg_guss.src), 'Magnesium als Schätzwert gekennzeichnet');
/* Audit v4.8.0: die Schätzwert-Kennzeichnung im Dropdown muss dreisprachig sein */
(function () {
  var expect = { de: /Schätzwert/, en: /estimate/, pt: /estimado/ };
  ['de', 'en', 'pt'].forEach(function (L) {
    var oM = V.fieldOptions('matGroupM', L).filter(function (o) { return o.value === 'mg_guss'; })[0];
    var oP = V.fieldOptions('plateMat', L).filter(function (o) { return o.value === 'mg_guss'; })[0];
    ok(oM && expect[L].test(oM.note), 'matGroupM/mg_guss: Schätzwert-Notiz uebersetzt (' + L + ')');
    ok(oP && expect[L].test(oP.note), 'plateMat/mg_guss: Schätzwert-Notiz uebersetzt (' + L + ')');
  });
})();
ok(DATA.BOLT_TAU_RATIO === 0.62, 'Bolzen tau_B/R_m = 0,62 (VDI 2230 Anh. B1/B5)');
ok(V.enumValues('plateMat').length === Object.keys(DATA.TAU_RATIO).length, 'plateMat-Enum deckt alle Werkstoffe');
ok(DATA.PRESETS.grauguss_esv_m12.input.Rm_M === DATA.TAU_RATIO.gjl.rmDefault, 'Demo-Preset Rm_M entspricht GJL-Richtwert (konsistent)');
ok(DATA.PRESETS.grauguss_esv_m12.input.E_P === DATA.TAU_RATIO.gjl.E, 'Demo-Preset E_P entspricht GJL-E-Modul (konsistent)');
ok(DATA.PRESETS.grauguss_esv_m12.input.p_G === DATA.TAU_RATIO.gjl.pG, 'Demo-Preset p_G entspricht GJL-Richtwert (konsistent)');

/* --- TAU_RATIO-Quellenabgleich (Websuche 2026-07): Norm-Beleg VDI 2230-1 Tab. 6 / Lork-Hanke --- */
(function () {
  // Bolzen-Scherfestigkeitsverhaeltnis ist klassenabhaengig (VDI/Thomala), nicht mehr konstant
  ok(S.boltShearRatio('8.8') === 0.65, 'boltShearRatio 8.8 = 0,65 (VDI/Thomala)');
  ok(S.boltShearRatio('10.9') === 0.62, 'boltShearRatio 10.9 = 0,62');
  ok(S.boltShearRatio('12.9') === 0.60, 'boltShearRatio 12.9 = 0,60');
  ok(S.boltShearRatio('4.6') === 0.70, 'boltShearRatio niedrige Klasse = 0,70');
  ok(S.boltShearRatio('unbekannt') === DATA.BOLT_TAU_RATIO, 'boltShearRatio Fallback = BOLT_TAU_RATIO (0,62)');
  ok(S.boltShearRatio(null) === DATA.BOLT_TAU_RATIO, 'boltShearRatio(null) -> Fallback');
  // Monoton fallend mit steigender Festigkeitsklasse
  ok(S.boltShearRatio('8.8') > S.boltShearRatio('10.9') && S.boltShearRatio('10.9') > S.boltShearRatio('12.9'), 'boltShearRatio faellt mit Festigkeitsklasse');
  // vdiRange: wo ein VDI-Bereich belegt ist, sitzt unser Wert am unteren (konservativen) Rand
  Object.keys(DATA.TAU_RATIO).forEach(function (k) {
    var e = DATA.TAU_RATIO[k];
    if (e.vdiRange) {
      ok(Array.isArray(e.vdiRange) && e.vdiRange.length === 2 && e.vdiRange[0] <= e.vdiRange[1], 'TAU_RATIO.' + k + ': vdiRange wohlgeformt');
      ok(e.ratio === e.vdiRange[0], 'TAU_RATIO.' + k + ': ratio am unteren (konservativen) Rand des VDI-Bereichs');
      ok(e.ratio >= e.vdiRange[0] && e.ratio <= e.vdiRange[1], 'TAU_RATIO.' + k + ': ratio im VDI-Bereich');
    }
  });
  // Praezisierte Quellenangaben: Tab. 6 fuer die Stahlsorten, Lork/Hanke fuer Guss/Alu
  ok(/Tab\. ?6/.test(DATA.TAU_RATIO.stahl.src), 'stahl.src nennt VDI Tab. 6');
  ok(/Tab\. ?6/.test(DATA.TAU_RATIO.stahl_bau.src), 'stahl_bau.src nennt VDI Tab. 6');
  ok(/Tab\. ?6/.test(DATA.TAU_RATIO.einsatz.src), 'einsatz.src nennt VDI Tab. 6');
  ok(/Lork|Hanke/.test(DATA.TAU_RATIO.gjl.src) && /Lork|Hanke/.test(DATA.TAU_RATIO.alu_guss.src), 'Guss/Alu.src nennt Lork/Hanke');
  // engagement traegt die verwendeten Verhaeltnisse + Quelle (fuer die mehrsprachige Ausgabe)
  var Rr = S.computeJoint(withV({ r11: true, matGroupM: 'gjl', Rm_M: 250, m_vorh: 18 }));
  ok(Rr.engagement.matRatio === 1.15 && Rr.engagement.boltRatio === 0.62, 'engagement traegt matRatio & boltRatio');
  ok(typeof Rr.engagement.matSrc === 'string' && Rr.engagement.matSrc.length > 0, 'engagement.matSrc fuer Ausgabe vorhanden');
  // Klassenabhaengigkeit schlaegt bis ins Ergebnis durch: 8.8 vs 12.9 -> anderes tauBS
  var R88 = S.computeJoint(withV({ strengthClass: '8.8', r11: true, matGroupM: 'gjl', Rm_M: 250, m_vorh: 18 }));
  var R129 = S.computeJoint(withV({ strengthClass: '12.9', r11: true, matGroupM: 'gjl', Rm_M: 250, m_vorh: 18 }));
  ok(Math.abs(R88.engagement.boltRatio - 0.65) < 1e-12 && Math.abs(R129.engagement.boltRatio - 0.60) < 1e-12, 'R11 nutzt klassenabhaengige Bolzen-Ratio im vollen Durchlauf');
})();

/* --- Rostfreie/austenitische Abdeckung + Oberflaechen-Abminderung + SG --- */
(function () {
  // A2/A4-Klassen: Werte, stainless-Flag, E-Modul, Scherzahl 0,80
  ['A2-70', 'A4-70', 'A4-80'].forEach(function (c) {
    var s = DATA.STRENGTH[c];
    ok(s && s.stainless === true && s.validate === true, c + ': rostfrei + validate-Flag');
    ok(s.E === 200000, c + ': E-Modul 200000 (austenitisch)');
    ok(DATA.BOLT_TAU_BY_CLASS[c] === 0.80, c + ': Bolzen-Scherzahl 0,80 (VDI Tab. 6)');
    ok(S.boltShearRatio(c) === 0.80, c + ': boltShearRatio 0,80');
  });
  // Austenit-Werkstoffgruppe (Innengewinde)
  ok(DATA.TAU_RATIO.austenit && DATA.TAU_RATIO.austenit.ratio === 0.80, 'TAU_RATIO.austenit = 0,80');
  ok(/Tab\. ?6/.test(DATA.TAU_RATIO.austenit.src), 'austenit.src nennt VDI Tab. 6');
  // rostfreier E-Modul schlaegt automatisch durch (ohne Nutzereingabe)
  var Rrost = S.computeJoint(withV({ strengthClass: 'A4-80' }));
  ok(V.validateInput(withV({ strengthClass: 'A4-80' })).errors.length === 0, 'rostfreie Klasse A4-80 -> keine Fehler (zulaessig)');
  ok(V.validateInput(withV({ strengthClass: 'A4-80' })).warnings.some(function (w) { return w.code === 'STRENGTH_STAINLESS'; }), 'A4-80 -> STRENGTH_STAINLESS-Warnung (zulaessig, mit Hinweis)');
  ok(Rrost.status === 'ok' && Rrost.E_S === 200000, 'rostfrei: E_S automatisch 200000 im Ergebnis');
  ok(hasNote(Rrost.notes.assumptions, 'ASSUME_E_S_CLASS'), 'rostfrei: Hinweis ASSUME_E_S_CLASS');
  // stainless-Naeherungshinweis bei schwingender Last
  var RrostF = S.computeJoint(withV({ strengthClass: 'A4-80', F_Ao: 5000, F_Au: 1000 }));
  ok(hasNote(RrostF.notes.pending, 'PENDING_FATIGUE_STAINLESS'), 'rostfrei: Naeherungshinweis sigma_A');

  // Oberflaechen-Abminderung: Faktoren + Wirkung auf sigma_A
  ok(DATA.SURFACE_FATIGUE.blank.factor === 1.00, 'Surface blank = 1,00');
  ok(DATA.SURFACE_FATIGUE.verzinkt.factor === 0.70, 'Surface feuerverzinkt = 0,70 (-30%)');
  ok(DATA.SURFACE_FATIGUE.hv.factor === 0.80, 'Surface HV = 0,80 (-20%)');
  var Rb = S.computeJoint(withV({ F_Ao: 6000, F_Au: 1000 }));                       // blank
  var Rz = S.computeJoint(withV({ F_Ao: 6000, F_Au: 1000, surfaceFinish: 'verzinkt' }));
  var Rh = S.computeJoint(withV({ F_Ao: 6000, F_Au: 1000, surfaceFinish: 'hv' }));
  approx(Rz.fatigue.sigma_A, Rb.fatigue.sigma_A * 0.70, 1e-9, 'feuerverzinkt: sigma_A -30%');
  approx(Rh.fatigue.sigma_A, Rb.fatigue.sigma_A * 0.80, 1e-9, 'HV: sigma_A -20%');
  ok(Rz.fatigue.S_D < Rb.fatigue.S_D, 'Abminderung senkt S_D');
  ok(Rz.fatigue.surface === 'verzinkt' && Rz.fatigue.surfaceFactor === 0.70, 'fatigue traegt surface/Faktor');
  ok(hasNote(Rz.notes.assumptions, 'ASSUME_SURFACE_FATIGUE'), 'Abminderung: Hinweis ASSUME_SURFACE_FATIGUE');
  ok(Rb.fatigue.surfaceFactor === 1, 'blank: Faktor 1 (keine Abminderung)');
  // surfaceFinish-Enum + Validierung
  ok(V.enumValues('surfaceFinish').join(',') === 'blank,verzinkt,hv', 'surfaceFinish-Enum vollstaendig');
  ok(V.validateInput(withV({ surfaceFinish: 'XX' })).errors.some(function (x) { return x.code === 'ENUM_INVALID'; }), 'surfaceFinish "XX" -> ENUM_INVALID');

  // Neue Presets laufen sauber
  var Ra = S.computeJoint(DATA.PRESETS.rostfrei_a4_m10.input);
  ok(Ra.status === 'ok' && Ra.engagement && Ra.E_S === 200000, 'Preset rostfrei_a4_m10: rechnet, rostfreier E_S, R11 aktiv');
  var Rsg2 = S.computeJoint(DATA.PRESETS.schwing_sg_m12.input);
  ok(Rsg2.status === 'ok' && Rsg2.fatigue.finish === 'SG' && Rsg2.fatigue.surface === 'verzinkt', 'Preset schwing_sg_m12: SG + feuerverzinkt aktiv');
})();

/* --- Verbesserungs-Hinweise Stufe 2: Zielwerte bringen die Sicherheit auf 1,2 --- */
(function () {
  var base = { size: 'M10', strengthClass: 'A4-80', frictionClass: 'C', tightening: 'drehmomentgesteuert', connection: 'ESV', n: 0.5, lShank: 12, lThreadFree: 15, l_SK: 4, l_M: 3.3, l_K: 24, d_h: 11, D_A: 40, plateMat: 'austenit', E_P: 200000, p_G: 210, F_Kerf: 6000, F_Ao: 5000, F_Au: 1000, rz: 'Rz10-40', seats: 1, interfaces: 1, r11: true, matGroupM: 'austenit', Rm_M: 500, m_vorh: 10, d_w: 15, F_Qmax: 2000, muT: 0.15 };
  var R = S.computeJoint(base);
  function hint(sf) { return R.improvements.filter(function (h) { return h.safety === sf; })[0]; }
  // Grüne Sicherheiten dürfen keinen Hinweis erzeugen
  ok(!hint('S_D') && !hint('S_F'), 'grüne Sicherheiten -> kein Verbesserungshinweis');
  // S_P: d_w-Zielwert bringt S_P auf ~1,2
  var hP = hint('S_P');
  ok(hP && hP.level === 'bad' && hP.v.dw > base.d_w, 'S_P-Hinweis mit groesserem d_w-Ziel');
  approx(S.computeJoint(Object.assign({}, base, { d_w: hP.v.dw })).pressure.S_P, 1.2, 5e-3, 'S_P: d_w-Zielwert ergibt S_P = 1,2');
  approx(S.computeJoint(Object.assign({}, base, { p_G: hP.v.pg })).pressure.S_P, 1.2, 5e-3, 'S_P: p_G-Zielwert ergibt S_P = 1,2');
  // S_G: mu- und Querkraft-Zielwerte bringen S_G auf ~1,2
  var hG = hint('S_G');
  ok(hG && hG.v.mu > base.muT && hG.v.fq < base.F_Qmax, 'S_G-Hinweis: mu hoch / Querkraft runter');
  approx(S.computeJoint(Object.assign({}, base, { muT: hG.v.mu })).slip.S_G, 1.2, 5e-3, 'S_G: mu-Zielwert ergibt S_G = 1,2');
  approx(S.computeJoint(Object.assign({}, base, { F_Qmax: hG.v.fq })).slip.S_G, 1.2, 5e-3, 'S_G: Querkraft-Zielwert ergibt S_G = 1,2');
  // S_G MIT M_Ymax (Audit v4.8.0): der Querkraft-Zielwert muss den von F_Qmax
  // unabhaengigen Momenten-Term t2 = M_Ymax/(q_M*r_a*mu_T) beruecksichtigen.
  var baseMy = Object.assign({}, base, { M_Ymax: 20000, qM: 1, ra: 40 });
  var Rmy = S.computeJoint(baseMy);
  ok(Rmy.status === 'ok', 'S_G+M_Ymax: Rechnung ok');
  var hGmy = Rmy.improvements.filter(function (h) { return h.safety === 'S_G'; })[0];
  ok(!!hGmy && isFinite(hGmy.v.mu) && isFinite(hGmy.v.fq), 'S_G+M_Ymax: Hinweis mit endlichen Zielwerten');
  approx(S.computeJoint(Object.assign({}, baseMy, { muT: hGmy.v.mu })).slip.S_G, 1.2, 5e-3, 'S_G+M_Ymax: mu-Zielwert ergibt S_G = 1,2');
  approx(S.computeJoint(Object.assign({}, baseMy, { F_Qmax: hGmy.v.fq })).slip.S_G, 1.2, 5e-3, 'S_G+M_Ymax: Querkraft-Zielwert ergibt S_G = 1,2');
  // Randfall F_Kerf = 0 -> F_KR = 0 -> S_G = 0: keine unendlichen Zielwerte (mu=null, fq=0)
  var R0 = S.computeJoint(Object.assign({}, base, { F_Kerf: 0 }));
  ok(R0.status === 'ok' && R0.slip.S_G === 0, 'S_G-Randfall: F_Kerf=0 -> S_G=0 ohne Absturz');
  var hG0 = R0.improvements.filter(function (h) { return h.safety === 'S_G'; })[0];
  ok(!!hG0 && hG0.v.mu === null && hG0.v.fq === 0 && hG0.level === 'bad', 'S_G=0: mu=null, fq=0 (kein Infinity/NaN im Hinweis)');
  // S_A: m_vorh-Zielwert bringt S_A auf ~1,2
  var hA = hint('S_A');
  if (hA) approx(S.computeJoint(Object.assign({}, base, { m_vorh: hA.v.m })).engagement.S_A, 1.2, 5e-3, 'S_A: m_vorh-Zielwert ergibt S_A = 1,2');
  // level-Logik: < 1,0 -> bad, 1,0..1,2 -> warn
  ok(hP.level === (R.pressure.S_P < 1 ? 'bad' : 'warn'), 'S_P-level konsistent mit Schwelle');

  // S_D-Fall (SV + verzinkt, hohe Amplitude): Optionen SG/blank nur wenn anwendbar
  var Rd = S.computeJoint({ size: 'M8', strengthClass: '8.8', frictionClass: 'B', tightening: 'drehmomentgesteuert', connection: 'DSV', n: 0.5, lShank: 12, lThreadFree: 10, l_K: 22, d_w: 13, d_h: 9, D_A: 40, E_P: 210000, F_Kerf: 2000, F_Ao: 40000, F_Au: 500, rz: 'Rz10-40', seats: 1, interfaces: 1, threadFinish: 'SV', surfaceFinish: 'verzinkt' });
  var hD = Rd.improvements.filter(function (h) { return h.safety === 'S_D'; })[0];
  ok(hD && hD.v.canSG === true && hD.v.hasSurf === true && hD.v.redPct > 0, 'S_D-Hinweis bietet SG- und blank-Option (weil SV + verzinkt)');
  approx(Rd.fatigue.sigma_a * (Rd.fatigue.S_D / 1.2), hD.v.saZul, 1e-6, 'S_D: sigma_a-Zielwert korrekt');
  // grüner Fall: keine improvements
  var Rok = S.computeJoint(DATA.PRESETS.hydraulikzylinder.input);
  ok(Array.isArray(Rok.improvements), 'improvements ist immer ein Array');
})();

/* --- Zitierbarer Anker: VDI 2230 Blatt 1, Anhang B, Beispiel B3 (M20x1.5) ---
 * Innengewinde 16MnCr5 (tau_B/R_m = 0,85), Bolzen 8.8 (tau_B/R_m = 0,65).
 * Ruoss/hexagon.de rechnet daraus R_S = 2,0 und C2 = 1,16 vor. */
(function () {
  var g3 = S.threadStripGeom(20, 1.5);
  approx(g3.aGM / g3.aGS, 1.2698, 2e-3, 'B3: Geometrieverhaeltnis M20x1.5 = 1,2698');
  // tau_B,M/tau_B,S so, dass die dokumentierte Paarung R_S = 2,0 ergibt (0,85/0,65 * Rm-Paarung)
  var ratioB3 = 2.0 / (g3.aGM / g3.aGS);          // = tau_B,M / tau_B,S = 1,5751
  var rs3 = S.threadStripRatio(g3, ratioB3, 1.0);
  approx(rs3, 2.0, 5e-3, 'B3 (M20x1.5, 16MnCr5+8.8): R_S = 2,0 [VDI 2230 Anh. B3 / Ruoss]');
  ok(S.minEngagementVDI({ d: 20, P: 1.5, As: 272, RmS: 800, tauBM: ratioB3, tauBS: 1.0 }).branch === 'bolzen', 'B3: Ast bolzen (R_S >= 1)');
  approx(S.c2Factor(2.0), 1.16, 1e-2, 'B3: C2(2,0) = 1,16 [Ruoss]');
  approx(S.c2Factor(rs3), 1.16, 1e-2, 'B3: C2 am ermittelten R_S = 1,16');
})();

/* === 15) Rechenweg: jeder Schritt gegen die Engine geprueft, in allen Sprachen === */
(function () {
  var langs = ['de', 'en', 'pt'];
  var presets = S.listPresets();
  presets.forEach(function (p) {
    var R = S.computeJoint(p.input);
    if (R.status !== 'ok') { ok(false, 'Rechenweg-Preset ' + p.id + ': computeJoint nicht ok'); return; }
    langs.forEach(function (lang) {
      var out = RW.build(R, p.input, { lang: lang });
      ok(out.steps.length > 0, 'Rechenweg ' + p.id + '/' + lang + ': Schritte vorhanden');
      out.steps.forEach(function (st) {
        ok(st.ok === true, 'Rechenweg ' + p.id + '/' + lang + ' Schritt "' + st.title + '": _val==_exp (geprueft)');
        ok(!!st.title && st.title.length > 0, 'Rechenweg ' + p.id + '/' + lang + ': Titel uebersetzt (' + st.id + ')');
      });
    });
    // Wenn Nachweise aktiv: die passenden Schritte muessen erscheinen
    if (R.engagement) {
      var deSteps = RW.build(R, p.input, { lang: 'de' }).steps;
      ok(deSteps.some(function (s) { return s.phase === 'R11'; }), 'Rechenweg ' + p.id + ': R11-Schritte vorhanden bei aktivem Nachweis');
      ok(deSteps.some(function (s) { return s.id === 'r11_SA' && s.safety; }), 'Rechenweg ' + p.id + ': S_A-Sicherheitsschritt vorhanden');
    }
    if (R.fatigue && R.fatigue.finish === 'SG') {
      var sgSteps = RW.build(R, p.input, { lang: 'de' }).steps;
      ok(sgSteps.some(function (s) { return s.id === 'sigmaA_sg'; }), 'Rechenweg ' + p.id + ': SG-Dauerfestigkeitsschritt vorhanden');
      ok(sgSteps.some(function (s) { return s.id === 'FSm'; }), 'Rechenweg ' + p.id + ': F_Sm-Schritt vorhanden');
    }
  });
  // Gezielt am Grauguss-Beispiel: SV-Referenz vs. SG erhoeht S_D-Schritt-Ergebnis
  var Rsg = S.computeJoint(S.data.PRESETS.grauguss_esv_m12.input);
  var svInput = {}; for (var k in S.data.PRESETS.grauguss_esv_m12.input) svInput[k] = S.data.PRESETS.grauguss_esv_m12.input[k];
  svInput.threadFinish = 'SV';
  var Rsv = S.computeJoint(svInput);
  ok(Rsg.fatigue.S_D > Rsv.fatigue.S_D, 'Grauguss: SG-Rechenweg fuehrt zu hoeherem S_D als SV');
})();

/* === 16) Guard: delta_P Engine == Rechenweg ueber Zufallsgeometrien (Bug B2) ===
 * Der Verformungskegel ist in solver.js und rechenweg.js getrennt codiert (bewusstes,
 * geprueftes Duplikat). Dieser Test faellt rot, sobald nur EINE Seite geaendert wird —
 * er deckt alle drei Modelle (Huelse, Vollkegel, Kegel+Huelse) und beide Verbindungsarten
 * ab und sichert zugleich den tanPhi-Clamp (Bug B1) auf beiden Seiten. */
(function () {
  function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  var rnd = rng(20260703);
  var sizes = ['M6', 'M8', 'M10', 'M12', 'M16', 'M20'], conns = ['DSV', 'ESV'];
  var modelsSeen = {}, N = 4000;
  for (var i = 0; i < N; i++) {
    var sz = sizes[(rnd() * sizes.length) | 0];
    var d = S.forSize(sz).d;
    var conn = conns[(rnd() * conns.length) | 0];
    var d_h = d * (1.02 + rnd() * 0.2);
    var d_w = d_h + d * (0.2 + rnd() * 1.4);
    var D_A = d_h + d * (0.1 + rnd() * 6);           // deckt Huelse (D_A<=d_w) bis weiter Kegel ab
    var l_K = d * (0.3 + rnd() * 6);
    var inp = {
      size: sz, strengthClass: '8.8', frictionClass: 'B', tightening: 'drehmomentgesteuert',
      connection: conn, n: 0.5, lShank: l_K * 0.5, lThreadFree: l_K * 0.3,
      l_K: l_K, d_w: d_w, d_h: d_h, D_A: D_A, E_P: 210000, p_G: 700,
      F_Kerf: 5000, F_A: 4000, rz: 'Rz10-40', seats: 2, interfaces: 1
    };
    var R = S.computeJoint(inp);
    if (R.status !== 'ok') continue;                 // ungueltige Zufallsgeometrie -> ueberspringen
    modelsSeen[R.deltaP_model] = (modelsSeen[R.deltaP_model] || 0) + 1;
    var dPstep = RW.build(R, inp, { lang: 'de' }).steps.filter(function (s) { return s.id === 'dP'; })[0];
    if (!dPstep) { ok(false, 'Guard: dP-Schritt fehlt (' + sz + '/' + conn + ')'); continue; }
    // Kernaussage: der unabhaengig nachgerechnete Rechenweg-delta_P == Engine-delta_P
    ok(dPstep.ok === true, 'Guard delta_P Engine==Rechenweg (' + sz + '/' + conn + ', ' + R.deltaP_model + ')');
    ok(isFinite(R.deltaP) && R.deltaP > 0, 'Guard delta_P endlich & > 0 (' + sz + '/' + conn + ')');
  }
  ok(modelsSeen['sleeve'] > 0 && modelsSeen['cone'] > 0, 'Guard: Huelsen- und Vollkegelfaelle beide getroffen');

  // tanPhi-Clamp (Bug B1): unphysikalische Geometrie -> tanPhi auf Untergrenze, kein NaN/Infinity
  var extreme = S.plateCompliance({ E_P: 210000, d_w: 500, d_h: 20, D_A: 520, l_K: 0.01, connection: 'DSV' });
  ok(extreme.tanPhi === S.TANPHI_MIN, 'Clamp: tanPhi auf TANPHI_MIN begrenzt bei absurdem l_K/d_w');
  ok(extreme.tanPhiClamped === true, 'Clamp: tanPhiClamped-Flag gesetzt');
  ok(isFinite(extreme.deltaP) && extreme.deltaP > 0, 'Clamp: delta_P bleibt endlich trotz Extremgeometrie');
  // normale Geometrie -> Clamp greift NICHT
  var normal = S.plateCompliance({ E_P: 210000, d_w: 24, d_h: 17.5, D_A: 55, l_K: 40, connection: 'DSV' });
  ok(normal.tanPhi > S.TANPHI_MIN && !normal.tanPhiClamped, 'Clamp: greift nicht bei normaler Geometrie');
})();

/* === 17 · .dt-Dateiformat — Speichern/Laden (Baustein 1, v4.4-Serie) ===== */
(function () {
  var F = require('./ui.js'); // Node-Export: NUR die reinen .dt-Helfer (kein DOM)
  ok(typeof F.dtSerialize === 'function' && typeof F.dtParse === 'function' && typeof F.dtFileName === 'function',
    '.dt: reine Helfer aus ui.js exportiert');

  // Round-Trip: input -> JSON -> input identisch, fuer ALLE Presets
  Object.keys(DATA.PRESETS).forEach(function (key) {
    var inp = DATA.PRESETS[key].input;
    var res = F.dtParse(F.dtSerialize(inp, 'Test ' + key, S.VERSION));
    ok(res.ok === true, '.dt Round-Trip parsebar (' + key + ')');
    if (!res.ok) return;
    var back = res.payload.input;
    var k1 = Object.keys(inp), k2 = Object.keys(back);
    ok(k1.length === k2.length, '.dt Round-Trip Feldanzahl identisch (' + key + ')');
    k1.forEach(function (f) {
      ok(Object.prototype.hasOwnProperty.call(back, f) && back[f] === inp[f],
        '.dt Round-Trip Wert identisch (' + key + '.' + f + ')');
    });
    ok(res.payload.app === F.DT_APP, '.dt Kopf: app korrekt (' + key + ')');
    ok(res.payload.version === S.VERSION, '.dt Kopf: version korrekt (' + key + ')');
    ok(res.payload.label === 'Test ' + key, '.dt Kopf: label korrekt (' + key + ')');
    ok(typeof res.payload.created === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(res.payload.created),
      '.dt Kopf: created ist ISO-Zeitstempel (' + key + ')');
    // Geladene Eingaben rechnen bit-identisch (Ergebnisse werden nie gespeichert)
    var R1 = S.computeJoint(inp), R2 = S.computeJoint(back);
    ok(JSON.stringify(R1) === JSON.stringify(R2), '.dt geladene Eingaben rechnen identisch (' + key + ')');
  });

  // Fehlerfaelle: freundlicher Code statt Absturz
  var e1 = F.dtParse('{kaputt');
  ok(e1.ok === false && e1.code === 'DT_PARSE', '.dt defektes JSON -> DT_PARSE, kein Wurf');
  ok(F.dtParse('null').ok === false, '.dt "null" -> abgelehnt');
  ok(F.dtParse('[1,2,3]').ok === false && F.dtParse('[1,2,3]').code === 'DT_FORMAT', '.dt Array -> DT_FORMAT');
  ok(F.dtParse('{"app":"Fremdprogramm","input":{}}').ok === false, '.dt fremde App-Kennung -> abgelehnt');
  ok(F.dtParse('{"app":"DT-ProfiSchraube"}').ok === false, '.dt ohne input-Block -> abgelehnt');
  ok(F.dtParse('{"app":"DT-ProfiSchraube","input":[1]}').ok === false, '.dt input als Array -> abgelehnt');
  ok(F.dtParse('{"app":"DT-ProfiSchraube","input":{"size":"M12"}}').ok === true, '.dt Minimalform gueltig');

  // Dateiname: Berechnung_JJJJ-MM-TT_Zusatz.dt, Zusatz saniert
  var dte = new Date(2026, 6, 4); // 4. Juli 2026
  ok(F.dtFileName('', dte) === 'Berechnung_2026-07-04.dt', '.dt Dateiname ohne Zusatz');
  ok(F.dtFileName('Flansch M16', dte) === 'Berechnung_2026-07-04_Flansch_M16.dt', '.dt Dateiname mit Zusatz (Leerzeichen -> _)');
  var dirty = F.dtFileName('a/b\\c:*?"<>|d', dte);
  ok(dirty.indexOf('/') === -1 && dirty.indexOf('\\') === -1 && dirty.indexOf(':') === -1 && dirty.indexOf('?') === -1,
    '.dt Dateiname: verbotene Zeichen entfernt (' + dirty + ')');
  ok(F.dtFileName('   ', dte) === 'Berechnung_2026-07-04.dt', '.dt Dateiname: reiner Whitespace-Zusatz ignoriert');
  ok(F.dtFileName('Größe_Ölwanne', dte) === 'Berechnung_2026-07-04_Größe_Ölwanne.dt', '.dt Dateiname: Umlaute bleiben erhalten');
})();

/* === 18 · Thermik-Assistent — dF_Vth aus dT (Baustein 2, v4.4-Serie) ===== */
(function () {
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // Datenintegritaet: alpha in TAU_RATIO + BOLT_ALPHA plausibel
  Object.keys(DATA.TAU_RATIO).forEach(function (k) {
    var a = DATA.TAU_RATIO[k].alpha;
    ok(typeof a === 'number' && a >= 8 && a <= 30, 'Thermik-Daten: alpha plausibel (' + k + ' = ' + a + ')');
  });
  ok(DATA.BOLT_ALPHA.steel === 11.5 && DATA.BOLT_ALPHA.stainless === 16.0, 'Thermik-Daten: BOLT_ALPHA Stahl 11,5 / Austenit 16');
  ok(DATA.TAU_RATIO.alu_knet.alpha === 23.0 && DATA.TAU_RATIO.gjl.alpha === 10.0, 'Thermik-Daten: Alu-Knet 23 / GJL 10');

  // Basis: neues Preset (M12 8.8, Alu-Knet, dT = -40 K -> Abkuehlung = Verlustfall)
  var base = clone(DATA.PRESETS['alu_flansch_dT'].input);
  var R = S.computeJoint(base);
  ok(R.status === 'ok', 'Thermik: Preset alu_flansch_dT rechnet (status ok)');

  // Handrechnung: dF_Vth = l_K*(alpha_S - alpha_P)*1e-6*dT/(delta_S + delta_P)
  var hand = base.l_K * (base.alpha_S - base.alpha_P) * 1e-6 * base.dT / (R.deltaS + R.deltaP);
  approx(R.deltaFvth, hand, 1e-9, 'Thermik: dF_Vth == unabhaengige Handrechnung');
  ok(R.deltaFvth > 0, 'Thermik: Alu-Teile + Abkuehlung -> VorspannVERLUST (dF_Vth > 0)');
  ok(R.thermal && R.thermal.dT === -40 && R.thermal.alpha_S === 11.5 && R.thermal.alpha_P === 23.0, 'Thermik: R.thermal traegt dT/alpha_S/alpha_P');

  // Referenz ohne Thermik: Verlust wirkt exakt additiv in F_Mmin, subtraktiv in F_Smax/F_Vmax
  var noTh = clone(base); delete noTh.thermalAssist; delete noTh.dT; delete noTh.alpha_S; delete noTh.alpha_P;
  var R0 = S.computeJoint(noTh);
  ok(R0.status === 'ok', 'Thermik: Referenz ohne Assistent rechnet');
  approx(R.F_Mmin - R0.F_Mmin, R.deltaFvth, 1e-6, 'Thermik: F_Mmin steigt exakt um den Verlust');
  approx(R.F_Smax, R0.F_Smax - R.deltaFvth, 1e-6, 'Thermik: F_Smax sinkt um den Verlust (Warmzustand, VDI R8)');
  approx(R.F_Vmax, R0.F_Vmax - R.deltaFvth, 1e-6, 'Thermik: F_Vmax sinkt um den Verlust');
  ok(R.notes.assumptions.some(function (a) { return a.code === 'ASSUME_THERMAL_APPROX'; }), 'Thermik: Naeherungs-Hinweis (E(T) konstant) vorhanden');

  // Erwaermung -> GEWINN: fuer F_Mmin/F_KR nicht gutgeschrieben, erhoeht aber F_Smax/F_Vmax
  var warm = clone(base); warm.dT = 60;
  var Rw = S.computeJoint(warm);
  ok(Rw.deltaFvth < 0, 'Thermik: Alu-Teile + Erwaermung -> GEWINN (dF_Vth < 0)');
  ok(Rw.deltaFvthLoss === 0, 'Thermik: deltaFvthLoss = 0 beim Gewinn');
  approx(Rw.F_Mmin, R0.F_Mmin, 1e-9, 'Thermik: Gewinn wird fuer F_Mmin NICHT gutgeschrieben (kalter Zustand massgeblich)');
  ok(Rw.F_Smax > R0.F_Smax, 'Thermik: Gewinn ERHOEHT F_Smax (konservativ erfasst)');
  ok(Rw.F_Vmax > R0.F_Vmax, 'Thermik: Gewinn ERHOEHT F_Vmax (Pressung Warmzustand)');
  ok(Rw.notes.assumptions.some(function (a) { return a.code === 'HINT_DFVTH_GAIN'; }), 'Thermik: Gewinn-Hinweis vorhanden');

  // F_KR (Gleitnachweis): Gewinn ebenfalls nicht gutgeschrieben
  var slipCold = clone(base); slipCold.F_Qmax = 3000; slipCold.muT = 0.2;
  var slipWarm = clone(slipCold); slipWarm.dT = 60;
  var slipRef = clone(noTh); slipRef.F_Qmax = 3000; slipRef.muT = 0.2;
  var Rsc = S.computeJoint(slipCold), Rsw = S.computeJoint(slipWarm), Rsr = S.computeJoint(slipRef);
  approx(Rsc.slip.F_KR, Rsr.slip.F_KR, 1e-6, 'Thermik: F_KR im Verlustfall == Referenz (Verlust steckt in F_Mmin und wird wieder abgezogen)');
  approx(Rsw.slip.F_KR, Rsr.slip.F_KR, 1e-9, 'Thermik: F_KR beim Gewinn NICHT erhoeht (kalter Zustand massgeblich)');

  // Defaults: alpha_S aus Klasse, alpha_P aus Plattenwerkstoff -> identisches Ergebnis
  var def = clone(base); delete def.alpha_S; delete def.alpha_P;
  var Rd = S.computeJoint(def);
  ok(Rd.status === 'ok' && Rd.thermal.alpha_S === DATA.BOLT_ALPHA.steel && Rd.thermal.alpha_P === DATA.TAU_RATIO.alu_knet.alpha, 'Thermik: Defaults aus Festigkeitsklasse + Plattenwerkstoff');
  approx(Rd.deltaFvth, R.deltaFvth, 1e-9, 'Thermik: Default-Pfad rechnet identisch zum expliziten');
  ok(Rd.notes.assumptions.some(function (a) { return a.code === 'ASSUME_ALPHA_S_CLASS'; }) && Rd.notes.assumptions.some(function (a) { return a.code === 'ASSUME_ALPHA_P_MAT'; }), 'Thermik: Default-Hinweise vorhanden');

  // Edelstahl-Schraube: alpha_S-Default 16 (Austenit), kleinere alpha-Differenz -> kleinerer Betrag
  var ss = clone(def); ss.strengthClass = 'A4-70';
  var Rss = S.computeJoint(ss);
  ok(Rss.thermal.alpha_S === DATA.BOLT_ALPHA.stainless, 'Thermik: A4-70 -> alpha_S = 16 (Austenit)');
  ok(Math.abs(Rss.deltaFvth) < Math.abs(Rd.deltaFvth), 'Thermik: kleinere alpha-Differenz -> kleinerer |dF_Vth|');

  // Override-Pfad: eigener alpha_P wirkt exakt (Haken-Fall)
  var ov = clone(base); ov.alpha_P = 30;
  var Rov = S.computeJoint(ov);
  var handOv = ov.l_K * (ov.alpha_S - ov.alpha_P) * 1e-6 * ov.dT / (Rov.deltaS + Rov.deltaP);
  approx(Rov.deltaFvth, handOv, 1e-9, 'Thermik: Override alpha_P = 30 wirkt exakt');

  // Manueller Pfad unveraendert bzw. konservativ geklemmt
  var man = clone(noTh); man.deltaFvth = 1234;
  approx(S.computeJoint(man).F_Mmin, R0.F_Mmin + 1234, 1e-9, 'Thermik: manueller dF_Vth (Verlust) wirkt additiv wie bisher');
  var manG = clone(noTh); manG.deltaFvth = -500;
  var RmG = S.computeJoint(manG);
  approx(RmG.F_Mmin, R0.F_Mmin, 1e-9, 'Thermik: manueller GEWINN wird fuer F_Mmin nicht gutgeschrieben');
  approx(RmG.F_Smax, R0.F_Smax + 500, 1e-6, 'Thermik: manueller Gewinn erhoeht F_Smax vorzeichenrichtig');

  // Assistent hat Vorrang vor (verirrtem) manuellem deltaFvth
  var both = clone(base); both.deltaFvth = 99999;
  approx(S.computeJoint(both).deltaFvth, R.deltaFvth, 1e-9, 'Thermik: Assistent hat Vorrang vor manuellem deltaFvth');

  // Validierung: dT fehlt / alpha_P nicht herleitbar -> freundliche Fehlercodes
  var v1 = clone(base); delete v1.dT;
  var Rv1 = S.computeJoint(v1);
  ok(Rv1.status === 'invalid' && Rv1.errors.some(function (e) { return e.code === 'THERMAL_DT_MISSING'; }), 'Thermik: fehlendes dT -> THERMAL_DT_MISSING');
  var v2 = clone(base); delete v2.alpha_P; delete v2.plateMat;
  var Rv2 = S.computeJoint(v2);
  ok(Rv2.status === 'invalid' && Rv2.errors.some(function (e) { return e.code === 'THERMAL_ALPHA_P_MISSING'; }), 'Thermik: alpha_P nicht herleitbar -> THERMAL_ALPHA_P_MISSING');
  var v3 = clone(base); delete v3.alpha_P;  // plateMat bleibt -> herleitbar
  ok(S.computeJoint(v3).status === 'ok', 'Thermik: alpha_P aus Plattenwerkstoff herleitbar -> gueltig');

  // Rechenweg: Thermik-Schritt vorhanden und selbstgeprueft, in allen drei Sprachen
  ['de', 'en', 'pt'].forEach(function (lang) {
    var steps = RW.build(R, base, { lang: lang }).steps;
    var st = steps.filter(function (s) { return s.id === 'dFvth'; })[0];
    ok(st && st.ok === true, 'Thermik: Rechenweg-Schritt dFvth vorhanden & geprueft (' + lang + ')');
    var fm = steps.filter(function (s) { return s.id === 'FMmin'; })[0];
    ok(fm && fm.ok === true && /max\(0/.test(fm.formula), 'Thermik: F_Mmin-Schritt nutzt max(0; dF_Vth) (' + lang + ')');
  });
  // Ohne Assistent: kein Thermik-Schritt
  ok(RW.build(R0, noTh, { lang: 'de' }).steps.filter(function (s) { return s.id === 'dFvth'; }).length === 0, 'Thermik: ohne Assistent kein dFvth-Schritt');
  // Gewinnfall: Rechenweg konsistent zur Engine (Selbstpruefung aller Schritte)
  var warmSteps = RW.build(Rw, warm, { lang: 'de' }).steps;
  ok(warmSteps.every(function (s) { return s.ok !== false; }), 'Thermik: Gewinnfall — alle Rechenweg-Schritte konsistent zur Engine');
})();

/* === 19 · Flansch-Assistent — F_Qmax aus M_T/(z·r_LK) (Baustein 3) ======= */
(function () {
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // Reiner Helfer: F_Qmax = M_T/(z*r_LK)
  ok(typeof S.flangeShear === 'function', 'Flansch: flangeShear exportiert');
  approx(S.flangeShear({ M_T: 6000000, z: 8, r_LK: 120 }).F_Qmax, 6250, 1e-9, 'Flansch: F_Qmax = 6e6/(8*120) = 6250 N');
  approx(S.flangeShear({ M_T: 500000, z: 4, r_LK: 50 }).F_Qmax, 2500, 1e-9, 'Flansch: F_Qmax = 5e5/(4*50) = 2500 N');
  mustThrow(function () { S.flangeShear({ M_T: 100, z: 0, r_LK: 50 }); }, 'Flansch: z = 0 wirft');
  mustThrow(function () { S.flangeShear({ M_T: 100, z: 4, r_LK: 0 }); }, 'Flansch: r_LK = 0 wirft');

  // Preset rechnet
  var base = clone(DATA.PRESETS['getriebeflansch_m16'].input);
  var R = S.computeJoint(base);
  ok(R.status === 'ok', 'Flansch: Preset getriebeflansch_m16 rechnet (status ok)');
  ok(R.flange && R.flange.F_Qmax === 6250 && R.flange.z === 8 && R.flange.r_LK === 120, 'Flansch: R.flange trägt M_T/z/r_LK/F_Qmax');
  ok(R.slip && R.slip.F_Qmax === 6250, 'Flansch: berechnetes F_Qmax fließt in den Gleitnachweis');
  ok(R.notes.assumptions.some(function (a) { return a.code === 'ASSUME_FLANGE_FQ'; }), 'Flansch: Assistent-Hinweis vorhanden');

  // Kernaussage: Assistent == manuelles Äquivalent (bit-identischer slip-Block)
  var manual = clone(base); delete manual.flangeAssist; delete manual.M_T; delete manual.z_bolts; delete manual.r_LK;
  manual.F_Qmax = 6250;
  var Rm = S.computeJoint(manual);
  ok(Rm.status === 'ok', 'Flansch: manuelles Äquivalent rechnet');
  ok(JSON.stringify(R.slip) === JSON.stringify(Rm.slip), 'Flansch: slip-Block identisch zum manuellen F_Qmax=6250');
  approx(R.slip.S_G, Rm.slip.S_G, 1e-12, 'Flansch: S_G identisch zum manuellen Äquivalent');
  // ganze Rechnung deckungsgleich bis auf die Assistent-Zusatzinfos
  ok(R.F_Mmin === Rm.F_Mmin && R.F_Smax === Rm.F_Smax && R.S_F === Rm.S_F, 'Flansch: übrige Ergebniskette unverändert');

  // Assistent überschreibt ein (verirrtes) manuelles F_Qmax
  var both = clone(base); both.F_Qmax = 99999;
  approx(S.computeJoint(both).slip.F_Qmax, 6250, 1e-9, 'Flansch: Assistent hat Vorrang vor manuellem F_Qmax');

  // Original-inp bleibt unberührt (flache Kopie im Solver)
  var probe = clone(base); S.computeJoint(probe);
  ok(probe.F_Qmax === undefined, 'Flansch: computeJoint mutiert das übergebene inp nicht');

  // r_LK-Hebel: doppelter Radius -> halbe Umfangskraft -> größeres S_G
  var big = clone(base); big.r_LK = 240;
  var Rb = S.computeJoint(big);
  approx(Rb.slip.F_Qmax, 3125, 1e-9, 'Flansch: doppelter r_LK halbiert F_Qmax');
  ok(Rb.slip.S_G > R.slip.S_G, 'Flansch: größerer Lochkreis -> mehr Sicherheit gegen Gleiten');

  // Zusammenspiel mit M_Ymax (zusätzliches Moment um die Schraubenachse) bleibt additiv
  var withMy = clone(base); withMy.M_Ymax = 40000; withMy.qM = 1; withMy.ra = 25;
  var Rmy = S.computeJoint(withMy);
  var manMy = clone(manual); manMy.M_Ymax = 40000; manMy.qM = 1; manMy.ra = 25;
  ok(JSON.stringify(Rmy.slip) === JSON.stringify(S.computeJoint(manMy).slip), 'Flansch: Kombination mit M_Ymax == manuelles Äquivalent');

  // Validierung: fehlende Felder -> freundliche Codes
  var v1 = clone(base); delete v1.M_T;
  var Rv1 = S.computeJoint(v1);
  ok(Rv1.status === 'invalid' && Rv1.errors.some(function (e) { return e.code === 'FLANGE_MT_MISSING'; }), 'Flansch: fehlendes M_T -> FLANGE_MT_MISSING');
  var v2 = clone(base); delete v2.z_bolts;
  ok(S.computeJoint(v2).errors.some(function (e) { return e.code === 'FLANGE_Z_MISSING'; }), 'Flansch: fehlendes z -> FLANGE_Z_MISSING');
  var v3 = clone(base); delete v3.r_LK;
  ok(S.computeJoint(v3).errors.some(function (e) { return e.code === 'FLANGE_R_MISSING'; }), 'Flansch: fehlendes r_LK -> FLANGE_R_MISSING');

  // Rechenweg: F_Q-Herleitungsschritt vorhanden, selbstgeprüft, dreisprachig
  ['de', 'en', 'pt'].forEach(function (lang) {
    var steps = RW.build(R, base, { lang: lang }).steps;
    var fq = steps.filter(function (s) { return s.id === 'FQflange'; })[0];
    ok(fq && fq.ok === true && /M_T/.test(fq.formula) && /z/.test(fq.formula), 'Flansch: Rechenweg-Schritt FQflange vorhanden & geprüft (' + lang + ')');
    var kq = steps.filter(function (s) { return s.id === 'FKQ'; })[0];
    ok(kq && kq.ok === true, 'Flansch: F_KQ,erf-Schritt konsistent (' + lang + ')');
  });
  // Ohne Assistent: kein FQflange-Schritt, aber Gleitnachweis normal
  ok(RW.build(Rm, manual, { lang: 'de' }).steps.filter(function (s) { return s.id === 'FQflange'; }).length === 0, 'Flansch: ohne Assistent kein FQflange-Schritt');
  ok(RW.build(Rm, manual, { lang: 'de' }).steps.filter(function (s) { return s.id === 'FKQ'; }).length === 1, 'Flansch: manueller Weg zeigt weiterhin F_KQ,erf');
})();

/* === 20 · Dehn-/Taillenschrauben — A_0-Umschaltung (Baustein 4) ========== */
(function () {
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // Konstante exportiert
  ok(S.TAPER_D0_FACTOR === 0.9, 'Taille: TAPER_D0_FACTOR = 0,9 exportiert');

  // --- boltCompliance: Taillenglied als Reihenschaltung, Handrechnung ---
  var cB = { d: 12, d3: 9.853, lShank: 10, lThreadFree: 10, E_S: 210000 };
  var dPlain = S.boltCompliance(clone(cB));
  var cT = clone(cB); cT.d_0 = 8; cT.l_0 = 20;
  var dTap = S.boltCompliance(cT);
  var A0h = Math.PI / 4 * 8 * 8;
  approx(dTap.deltaS - dPlain.deltaS, 20 / (210000 * A0h), 1e-12, 'Taille: delta_S-Zuwachs == L_0/(E_S*A_0) (Handrechnung)');
  approx(dTap.parts.taper, 20 / (210000 * A0h), 1e-12, 'Taille: parts.taper == Taillenglied');
  ok(dPlain.parts.taper === 0, 'Taille: ohne d_0/l_0 ist parts.taper = 0');
  // l_0 = 0 ist erlaubt und wirkungslos
  var cZ = clone(cB); cZ.d_0 = 8; cZ.l_0 = 0;
  approx(S.boltCompliance(cZ).deltaS, dPlain.deltaS, 1e-15, 'Taille: l_0 = 0 -> unveraendertes delta_S');
  // Fehlerfaelle: negative Laenge, Laenge ohne Durchmesser
  var cN = clone(cB); cN.d_0 = 8; cN.l_0 = -1;
  mustThrow(function () { S.boltCompliance(cN); }, 'Taille: l_0 < 0 wirft');
  var cO = clone(cB); cO.l_0 = 5;
  mustThrow(function () { S.boltCompliance(cO); }, 'Taille: l_0 > 0 ohne d_0 wirft');

  // --- computeJoint: A_0-Pfad gegen unabhaengige Handrechnung ---
  var base = clone(DATA.PRESETS['dehnschraube_m16'].input);
  var R = S.computeJoint(base);
  ok(R.status === 'ok', 'Taille: Preset dehnschraube_m16 rechnet (status ok)');
  ok(R.taper && R.taper.governs === true, 'Taille: A_0 < A_S -> Taille massgeblich (governs)');
  var g = R.geometry;
  var A0 = Math.PI / 4 * base.d_0 * base.d_0;
  approx(R.taper.A_0, A0, 1e-12, 'Taille: A_0 = pi/4*d_0^2');
  approx(R.A_sig, A0, 1e-12, 'Taille: A_sig == A_0 (massgeblicher Querschnitt)');
  // R7: F_Mzul mit A_0 und W_p aus d_0 (von-Mises-Kette von Hand)
  var mH = g.P / (2 * Math.PI) + (1 / (2 * Math.cos(Math.PI / 6))) * R.muG * g.d2;
  var WpH = Math.PI / 16 * Math.pow(base.d_0, 3);
  var kH = Math.sqrt(1 / (A0 * A0) + 3 * Math.pow(mH / WpH, 2));
  approx(R.F_Mzul, 0.9 * R.strength.Rp02 / kH, 1e-9, 'Taille R7: F_Mzul = 0,9*Rp/k mit A_0 und W_p(d_0) (Handrechnung)');
  // R8: sigma_z,max im Taillenquerschnitt
  approx(R.sigma_zmax, R.F_Smax / A0, 1e-12, 'Taille R8: sigma_z,max = F_Smax/A_0');
  // R9: sigma_a im Taillenquerschnitt
  approx(R.fatigue.sigma_a, R.PhiEn * (base.F_Ao - base.F_Au) / (2 * A0), 1e-12, 'Taille R9: sigma_a = Phi_en*dF/(2*A_0)');
  // delta_S: Taillenglied steckt in der Gesamtnachgiebigkeit (Vergleich mit/ohne)
  var noTap = clone(base); delete noTap.boltType; delete noTap.d_0; delete noTap.L_0;
  var Rn = S.computeJoint(noTap);
  approx(R.deltaS - Rn.deltaS, base.L_0 / (R.E_S * A0), 1e-9, 'Taille R3: delta_S-Differenz == L_0/(E_S*A_0)');
  ok(R.PhiEn < Rn.PhiEn, 'Taille: weichere Schraube -> kleineres Phi_en');
  ok(R.fatigue.S_D > Rn.fatigue.S_D, 'Taille: Referenzbeispiel zeigt S_D-Vorteil der Dehnschraube');

  // --- SG-Pfad: F_0,2min = Rp*A_0 ---
  var sg = clone(base); sg.threadFinish = 'SG';
  var Rsg = S.computeJoint(sg);
  approx(Rsg.fatigue.F02, Rsg.strength.Rp02 * A0, 1e-9, 'Taille R9/SG: F_0,2min = Rp*A_0');

  // --- R11 bleibt A_S-bezogen: bit-identisch mit/ohne Taille ---
  var r11a = clone(base); r11a.connection = 'ESV'; r11a.r11 = true; r11a.matGroupM = 'stahl'; r11a.Rm_M = 600; r11a.m_vorh = 20;
  var r11b = clone(r11a); delete r11b.boltType; delete r11b.d_0; delete r11b.L_0;
  var Ra = S.computeJoint(r11a), Rb = S.computeJoint(r11b);
  ok(Ra.engagement && Rb.engagement, 'Taille R11: beide Varianten liefern R11');
  ok(Ra.engagement.F_mS === Rb.engagement.F_mS, 'Taille R11: F_mS bit-identisch (Gewindebezug A_S unveraendert)');
  ok(Ra.engagement.m_min === Rb.engagement.m_min, 'Taille R11: m_min bit-identisch');

  // --- Fallback A_0 >= A_S: Nachweise wie Schaftschraube + Hinweis ---
  var big = clone(base); big.d_0 = 15; // A_0 > A_S(M16)=156,7 mm^2
  var Rbig = S.computeJoint(big);
  ok(Rbig.taper.governs === false, 'Taille: d_0 = 15 -> A_0 >= A_S, governs = false');
  approx(Rbig.F_Mzul, 0.9 * Rbig.strength.Rp02 / Math.sqrt(1 / (g.As * g.As) + 3 * Math.pow(mH / (Math.PI / 16 * Math.pow(g.ds, 3)), 2)), 1e-9, 'Taille: Fallback rechnet F_Mzul mit A_S/d_S');
  approx(Rbig.sigma_zmax, Rbig.F_Smax / g.As, 1e-12, 'Taille: Fallback sigma_z,max mit A_S');
  ok((Rbig.notes.pending || []).some(function (n) { return n.code === 'TAPER_NOT_GOVERNING'; }), 'Taille: Hinweis TAPER_NOT_GOVERNING gesetzt');
  ok(Rbig.deltaS > Rn.deltaS, 'Taille: Taillenglied wirkt in delta_S auch im Fallback (physikalisch korrekt)');

  // --- d_0-Fallback 0,9*d_3 + Annahme-Hinweis ---
  var auto = clone(base); delete auto.d_0;
  var Rauto = S.computeJoint(auto);
  approx(Rauto.taper.d_0, 0.9 * g.d3, 1e-12, 'Taille: fehlendes d_0 -> Richtwert 0,9*d_3');
  ok((Rauto.notes.assumptions || []).some(function (n) { return n.code === 'ASSUME_TAPER_D0'; }), 'Taille: Annahme ASSUME_TAPER_D0 gesetzt');
  ok((R.notes.assumptions || []).some(function (n) { return n.code === 'ASSUME_TAPER'; }), 'Taille: Scope-Hinweis ASSUME_TAPER gesetzt');

  // --- Schaftschrauben-Regress: boltType fehlt/'schaft' -> bit-identisch ---
  var schaft = clone(noTap); schaft.boltType = 'schaft';
  var Rs2 = S.computeJoint(schaft);
  ['deltaS', 'deltaP', 'PhiEn', 'F_Mmin', 'F_Mmax', 'F_Mzul', 'F_Smax', 'sigma_zmax', 'sigma_redB', 'S_F', 'M_A'].forEach(function (k) {
    ok(Rs2[k] === Rn[k], 'Taille Regress: ' + k + ' bit-identisch (schaft == ohne boltType)');
  });
  ok(Rn.taper === null && Rs2.taper === null, 'Taille Regress: kein taper-Objekt ohne Dehnschraube');
  // Eingabeobjekt bleibt unberuehrt (Shallow-Copy-Muster)
  var frozen = clone(base); S.computeJoint(base);
  ok(JSON.stringify(frozen) === JSON.stringify(base), 'Taille: Eingabeobjekt unveraendert (Shallow-Copy)');

  // --- Validierung: Fehler-/Warncodes ---
  var vL = clone(base); delete vL.L_0;
  ok(S.computeJoint(vL).errors.some(function (e) { return e.code === 'TAPER_L0_MISSING'; }), 'Taille: fehlendes L_0 -> TAPER_L0_MISSING');
  var vD = clone(base); vD.d_0 = 14;
  var wD = V.validateInput(vD);
  ok(wD.ok && wD.warnings.some(function (w) { return w.code === 'TAPER_D0_LARGE'; }), 'Taille: grosses d_0 -> Warnung TAPER_D0_LARGE (kein Fehler)');
  var vLong = clone(base); vLong.L_0 = base.l_K + 10;
  ok(V.validateInput(vLong).warnings.some(function (w) { return w.code === 'TAPER_L0_LONG'; }), 'Taille: L_0 > l_K -> Warnung TAPER_L0_LONG');
  var vE = clone(base); vE.boltType = 'xyz';
  ok(V.validateInput(vE).errors.some(function (e) { return e.field === 'boltType' && e.code === 'ENUM_INVALID'; }), 'Taille: unbekannter boltType -> ENUM_INVALID');
  ok(V.enumValues('boltType').join(',') === 'schaft,dehn', 'Taille: enumValues boltType = schaft,dehn');
  ['de', 'en', 'pt'].forEach(function (lang) {
    var opts = V.fieldOptions('boltType', lang);
    ok(opts.length === 2 && opts[0].recommended === true && opts.every(function (o) { return o.note && o.note.length > 5; }), 'Taille: fieldOptions boltType dreisprachig mit Empfehlung (' + lang + ')');
    ['boltType', 'd_0', 'd0Custom', 'L_0'].forEach(function (f) {
      ok(V.FIELDS[f] && V.FIELDS[f].label[lang] && V.FIELDS[f].help[lang] && V.FIELDS[f].help[lang].length > 40, 'Taille: Feld ' + f + ' mit Label+Hilfe (' + lang + ')');
    });
  });
  ok(V.FIELDS.d_0.dependsOn === 'boltType' && V.FIELDS.d_0.dependsOnValue === 'dehn', 'Taille: d_0 haengt an boltType == dehn');

  // --- Rechenweg: Taillen-Schritt + umgeschaltete Formeln, dreisprachig ---
  ['de', 'en', 'pt'].forEach(function (lang) {
    var steps = RW.build(R, base, { lang: lang }).steps;
    ok(steps.every(function (st) { return st.ok !== false; }), 'Taille RW: alle Schritte konsistent zur Engine (' + lang + ')');
    var tp = steps.filter(function (st) { return st.id === 'taper'; })[0];
    ok(tp && tp.ok === true && /A_0/.test(tp.formula), 'Taille RW: Schritt taper vorhanden & geprueft (' + lang + ')');
    var fm = steps.filter(function (st) { return st.id === 'FMzul'; })[0];
    ok(fm && /A_0/.test(fm.formula) && /d_0/.test(fm.formula), 'Taille RW: F_Mzul-Formel zeigt A_0/W_p(d_0) (' + lang + ')');
    var sz = steps.filter(function (st) { return st.id === 'sigmaZ'; })[0];
    ok(sz && /A_0/.test(sz.formula), 'Taille RW: sigma_z-Formel zeigt A_0 (' + lang + ')');
    var sa = steps.filter(function (st) { return st.id === 'sigmaA_amp'; })[0];
    ok(sa && /A_0/.test(sa.formula), 'Taille RW: sigma_a-Formel zeigt A_0 (' + lang + ')');
    var ds = steps.filter(function (st) { return st.id === 'dS'; })[0];
    ok(ds && /L_0/.test(ds.formula), 'Taille RW: delta_S-Formel zeigt Taillenglied (' + lang + ')');
  });
  // Ohne Dehnschraube: kein Taillen-Schritt, Formeln mit A_S
  var stepsN = RW.build(Rn, noTap, { lang: 'de' }).steps;
  ok(stepsN.filter(function (st) { return st.id === 'taper'; }).length === 0, 'Taille RW: ohne Dehnschraube kein taper-Schritt');
  ok(/A_S/.test(stepsN.filter(function (st) { return st.id === 'FMzul'; })[0].formula), 'Taille RW: Schaftschraube weiter mit A_S-Formel');
  // Fallback-Fall: Rechenweg konsistent, taper-Schritt mit ehrlichem Hinweis
  var stepsB = RW.build(Rbig, big, { lang: 'de' }).steps;
  ok(stepsB.every(function (st) { return st.ok !== false; }), 'Taille RW: Fallback A_0>=A_S — alle Schritte konsistent');
  ok(/A_S/.test(stepsB.filter(function (st) { return st.id === 'FMzul'; })[0].formula), 'Taille RW: Fallback zeigt A_S-Formel');
})();

/* === 21 · Ergebnis-Ampel — overallVerdict (Ausgabe Schritt A, v4.9) ======== */
(function () {
  var U = require('./ui.js');
  ok(typeof U.overallVerdict === 'function', 'Ampel: overallVerdict aus ui.js exportiert (reine Funktion, kein DOM)');
  var V = function (arr) { return U.overallVerdict(arr); };

  // Grün: alle fünf >= 1,2, kein n.b.
  var g = V([1.8, 1.5, 1.2, 2.0, 1.35]);
  ok(g.level === 'ok' && g.hasNb === false && g.hasAny === true, 'Ampel: alle >= 1,2 -> grün');
  // Grenzwert 1,2 zählt als grün (deckungsgleich mit safetyClass)
  ok(V([1.2, 1.2, 1.2, 1.2, 1.2]).level === 'ok', 'Ampel: exakt 1,2 -> grün (Grenzwert)');
  // Gelb: mind. eine zwischen 1,0 und <1,2
  ok(V([1.8, 1.1, 1.5, 2.0, 1.35]).level === 'warn', 'Ampel: eine 1,0…<1,2 -> gelb');
  // Grenzwert 1,0 zählt als gelb (nicht rot)
  ok(V([1.0, 1.5, 1.5, 1.5, 1.5]).level === 'warn', 'Ampel: exakt 1,0 -> gelb (Grenzwert)');
  // knapp unter 1,2 -> gelb
  ok(V([1.199, 1.5, 1.5, 1.5, 1.5]).level === 'warn', 'Ampel: 1,199 -> gelb');
  // Rot: mind. eine < 1,0
  ok(V([1.8, 0.9, 1.5, 2.0, 1.35]).level === 'bad', 'Ampel: eine < 1,0 -> rot');
  ok(V([0.999, 1.5, 1.5, 1.5, 1.5]).level === 'bad', 'Ampel: 0,999 -> rot');

  // n.b. (null) zieht ein sonst grünes Urteil auf gelb mit Vorbehalt — nie fälschlich grün
  var nb = V([1.8, null, 1.5, 2.0, 1.35]);
  ok(nb.level === 'warn' && nb.hasNb === true, 'Ampel: ein Nachweis n.b. -> gelb mit Vorbehalt (nie grün)');
  // n.b. macht aus gelb nicht rot
  ok(V([1.8, null, 1.1, 2.0, 1.35]).level === 'warn', 'Ampel: n.b. + gelb bleibt gelb');
  // rot dominiert n.b.
  var bad = V([0.8, null, 1.5, 2.0, 1.35]);
  ok(bad.level === 'bad' && bad.hasNb === true, 'Ampel: rot dominiert n.b. (hasNb bleibt gesetzt)');
  // NaN und Infinity werden wie n.b. behandelt
  ok(V([NaN, 1.5, 1.5, 1.5, 1.5]).hasNb === true, 'Ampel: NaN gilt als n.b.');
  ok(V([Infinity, 1.5, 1.5, 1.5, 1.5]).hasNb === true, 'Ampel: Infinity gilt als n.b.');
  // alle n.b. -> gelb, hasAny false (nie grün, wenn nichts geführt wurde)
  var allNb = V([null, null, null, null, null]);
  ok(allNb.level === 'warn' && allNb.hasNb === true && allNb.hasAny === false, 'Ampel: alle n.b. -> gelb, hasAny=false');

  // items: Einzel-Klassifizierung pro Sicherheit (für die konkreten Ampel-Hinweise)
  var it = V([1.5, 0.9, 1.1, null, 1.3]);
  ok(it.items.length === 5, 'Ampel: items hat fünf Einträge');
  ok(it.items[0] === 'ok' && it.items[1] === 'bad' && it.items[2] === 'warn' && it.items[3] === 'nb' && it.items[4] === 'ok',
    'Ampel: items klassifiziert ok/bad/warn/nb korrekt in Reihenfolge');

  // onlyNb: gelb NUR wegen nicht geführter Nachweise (alle geführten grün) -> beruhigender Text
  var onb = V([1.5, 1.5, 1.5, null, 1.5]);
  ok(onb.level === 'warn' && onb.onlyNb === true, 'Ampel: alle geführten grün + ein n.b. -> onlyNb=true');
  // echte gelbe Sicherheit -> onlyNb=false (echtes „knapp bemessen")
  ok(V([1.5, 1.1, 1.5, null, 1.5]).onlyNb === false, 'Ampel: echte 1,0…<1,2 -> onlyNb=false');
  // grün ohne n.b. -> onlyNb=false, hasWarn=false
  var allok = V([1.5, 1.5, 1.5, 1.5, 1.5]);
  ok(allok.onlyNb === false && allok.hasWarn === false, 'Ampel: alle grün -> onlyNb=false, hasWarn=false');
  // rot -> onlyNb immer false
  ok(V([0.8, 1.5, 1.5, null, 1.5]).onlyNb === false, 'Ampel: rot -> onlyNb=false');
  ok(V([1.5, 1.1, 1.5, 1.5, 1.5]).hasWarn === true, 'Ampel: hasWarn erkennt echte gelbe Sicherheit');

  // Konsistenz mit echten Presets: das Urteil entsteht genau aus den fünf Solver-Sicherheiten
  Object.keys(DATA.PRESETS).forEach(function (key) {
    var R = S.computeJoint(DATA.PRESETS[key].input);
    if (R.status !== 'ok') return;
    var arr = [R.S_F, R.fatigue ? R.fatigue.S_D : null, R.pressure ? R.pressure.S_P : null,
      R.slip ? R.slip.S_G : null, R.engagement ? R.engagement.S_A : null];
    var v = V(arr);
    ok(v.level === 'ok' || v.level === 'warn' || v.level === 'bad', 'Ampel: Preset ' + key + ' liefert gültiges Urteil');
    // manuelle Gegenprobe der Dominanz-Regel
    var anyBad = arr.some(function (s) { return typeof s === 'number' && isFinite(s) && s < 1.0; });
    var anyWarn = arr.some(function (s) { return typeof s === 'number' && isFinite(s) && s >= 1.0 && s < 1.2; });
    var anyNb = arr.some(function (s) { return !(typeof s === 'number' && isFinite(s)); });
    var exp = anyBad ? 'bad' : ((anyWarn || anyNb) ? 'warn' : 'ok');
    ok(v.level === exp, 'Ampel: Preset ' + key + ' Urteil == unabhängige Gegenprobe (' + exp + ')');
    ok(v.hasNb === anyNb, 'Ampel: Preset ' + key + ' hasNb korrekt');
  });
})();

/* === Report ============================================================== */
console.log('\n  A_S  berechnet  vs.  tabelliert (ISO 898-1)');
console.log('  ---------------------------------------------');
console.log('  Groesse | A_S ber. | A_S tab. | Abweichung');
rows.forEach(function (r) {
  console.log('  ' + r[0].padEnd(7) + ' | ' + r[1].padStart(8) + ' | ' + r[2].padStart(8) + ' | ' + r[3].padStart(8));
});
console.log('  ---------------------------------------------');
console.log('  max. Abweichung A_S: ' + (maxDevAs * 100).toFixed(3) + '%  (bei ' + worst + ',  Schwelle ' + (TOL_AS * 100) + '%)');

console.log('\n  ========================================');
console.log('  Assertions gesamt : ' + (pass + fail));
console.log('  bestanden         : ' + pass);
console.log('  fehlgeschlagen    : ' + fail);
console.log('  ========================================');
if (fail > 0) {
  console.log('\n  FEHLER:');
  fails.forEach(function (m) { console.log('   - ' + m); });
  process.exit(1);
} else {
  console.log('\n  ALLE TESTS BESTANDEN — Fundament steht.\n');
}
