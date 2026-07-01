/* ============================================================================
 * DT-ProfiSchraube · solver.js  (Engine-Kern)
 * ----------------------------------------------------------------------------
 * Baustein 1: Gewindegeometrie (DIN 13) + Datenzugriffe.
 * Reine Funktionen -> im Node-Testharness vollstaendig pruefbar, bevor irgend-
 * etwas in die UI kommt. KEIN ES-import (Browser laedt daten.js per <script>).
 *
 * Folgebausteine (spaeter, je einzeln getestet): R3 Nachgiebigkeiten/Kraftverh.,
 * R4 Setzen/Temperatur, R5/R6 Montagevorspannkraft, R7-R13 Nachweise.
 * ========================================================================== */
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(require('./daten.js'), require('./validate.js')); }
  else { root.DTSSolver = factory(root.DTSData, root.DTSValidate); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (DATA, VALID) {
  'use strict';

  var C = DATA.THREAD_CONST;
  var validateInput = (VALID && VALID.validateInput) ? VALID.validateInput : null;

  /* Reine Gewindegeometrie nach DIN 13 / ISO 898-1.
   * Eingabe: d [mm], P [mm].  Rueckgabe: alle abgeleiteten Groessen [mm, mm^2].
   *   d2 = d - 0.64952*P        (Flankendurchmesser)
   *   d3 = d - 1.22687*P        (Kerndurchmesser Bolzen)
   *   ds = (d2 + d3)/2          (Spannungsdurchmesser)
   *   As = pi/4 * ds^2          (Spannungsquerschnitt)
   *   A3 = pi/4 * d3^2          (Kernquerschnitt)
   *   AN = pi/4 * d^2           (Nennquerschnitt) */
  function threadGeometry(d, P) {
    if (!(d > 0) || !(P > 0)) throw new Error('threadGeometry: d und P muessen > 0 sein');
    var d2 = d - C.c_d2 * P;
    var d3 = d - C.c_d3 * P;
    if (!(d3 > 0)) throw new Error('threadGeometry: unphysikalisches Gewinde (d3<=0; Steigung P zu gross fuer d)');
    var ds = (d2 + d3) / 2;
    var As = Math.PI / 4 * ds * ds;
    var A3 = Math.PI / 4 * d3 * d3;
    var AN = Math.PI / 4 * d * d;
    return { d: d, P: P, d2: d2, d3: d3, ds: ds, As: As, A3: A3, AN: AN };
  }

  /* Geometrie fuer eine genormte Groesse (z. B. "M12"). */
  function forSize(name) {
    var t = DATA.THREADS[name];
    if (!t) throw new Error('Unbekannte Gewindegroesse: ' + name);
    var g = threadGeometry(t.d, t.P);
    g.name = name;
    g.As_ref = t.As_ref;
    return g;
  }

  /* Festigkeitskennwerte einer Klasse (z. B. "8.8"). */
  function strength(cls) {
    var s = DATA.STRENGTH[cls];
    if (!s) throw new Error('Unbekannte Festigkeitsklasse: ' + cls);
    return s;
  }

  /* Nennwerte aus der Klassenbezeichnung (Ziffern-Formel).
   * Nur fuer "volle" Klassen exakt; bei 4.8/5.8/6.8 weicht die Norm ab. */
  function strengthFromCode(code) {
    var m = /^(\d+)\.(\d+)$/.exec(String(code));
    if (!m) throw new Error('Ungueltige Festigkeitsklasse: ' + code);
    var a = parseInt(m[1], 10), b = parseInt(m[2], 10);
    return { Rm: a * 100, Rp: a * b * 10 };
  }

  /* Mittlere Reibungszahl einer Klasse (arithmetisches Mittel des Bereichs). */
  function frictionMid(cls) {
    var f = DATA.FRICTION[cls];
    if (!f) throw new Error('Unbekannte Reibungsklasse: ' + cls);
    return (f.range[0] + f.range[1]) / 2;
  }

  /* ===== R3: Nachgiebigkeiten & Kraftverhaeltnis ==========================
   * Reines Federmodell (delta = l/(E*A), Reihenschaltung) — physikalisch
   * eindeutig und vollstaendig testbar.
   * Ersatzlaengen (Kopf 0.5d, eingeschr. Gewinde 0.5d, Mutter 0.4d fuer DSV)
   * sind dokumentierte VDI-Richtwerte, gebuendelt in SUBLEN -> bei der Norm-
   * Validierung zentral pruefbar (validate-Flag).
   * NOCH NICHT enthalten: der Verformungskegel fuer delta_P (empirischer
   * Kegelwinkel tan(phi), ESV/DSV, Fallunterscheidung) — dessen Konstanten
   * sind erst gegen die Originalnorm/SR1 zu fixieren. Enthalten ist nur der
   * eindeutige Huelsenfall (D_A <= d_w). */

  var SUBLEN = {
    headFactor: 0.5, engagedThreadFactor: 0.5, nutFactor: 0.4, validate: true,
    note: 'Ersatzlaengen l_SK/l_G/l_M als Vielfache von d (DSV); gegen VDI 2230 pruefen'
  };

  function area(dia) { return Math.PI / 4 * dia * dia; }

  /* Schraubennachgiebigkeit delta_S [mm/N] (Durchsteckverbindung mit Mutter).
   * cfg: { d, d3, lShank, lThreadFree, E_S, [E_M], [l_SK], [l_G], [l_M] } */
  function boltCompliance(cfg) {
    if (!(cfg.d > 0) || !(cfg.d3 > 0) || !(cfg.E_S > 0)) throw new Error('boltCompliance: d, d3, E_S muessen > 0 sein');
    if (!(cfg.lShank >= 0) || !(cfg.lThreadFree >= 0)) throw new Error('boltCompliance: Laengen muessen >= 0 sein');
    var E_S = cfg.E_S, E_M = cfg.E_M || cfg.E_S;
    var A_N = area(cfg.d), A_d3 = area(cfg.d3);
    var l_SK = (cfg.l_SK != null) ? cfg.l_SK : SUBLEN.headFactor * cfg.d;
    var l_G  = (cfg.l_G  != null) ? cfg.l_G  : SUBLEN.engagedThreadFactor * cfg.d;
    var l_M  = (cfg.l_M  != null) ? cfg.l_M  : SUBLEN.nutFactor * cfg.d;
    var dHead   = l_SK / (E_S * A_N);
    var dShank  = cfg.lShank / (E_S * A_N);
    var dThread = cfg.lThreadFree / (E_S * A_d3);
    var dG      = l_G / (E_S * A_d3);
    var dM      = l_M / (E_M * A_N);
    var dS = dHead + dShank + dThread + dG + dM;
    return { deltaS: dS, parts: { head: dHead, shank: dShank, threadFree: dThread, engaged: dG, nut: dM } };
  }

  /* Plattennachgiebigkeit — NUR Huelsenfall (D_A <= d_w):
   * delta_P = l_K / (E_P * A_huelse),  A_huelse = pi/4 * (D_A^2 - d_h^2).
   * Verformungskegel (D_A > d_w) folgt nach Norm-Validierung. */
  function plateComplianceSleeve(cfg) {
    if (!(cfg.E_P > 0) || !(cfg.l_K > 0)) throw new Error('plateComplianceSleeve: E_P, l_K muessen > 0 sein');
    if (!(cfg.D_A > cfg.d_h)) throw new Error('plateComplianceSleeve: D_A muss > d_h sein');
    var A = Math.PI / 4 * (cfg.D_A * cfg.D_A - cfg.d_h * cfg.d_h);
    return { deltaP: cfg.l_K / (cfg.E_P * A), A_sleeve: A, model: 'sleeve' };
  }

  /* Kraftverhaeltnis und Kraftaufteilung (R3-Kern). */
  function phiK(deltaS, deltaP) {
    if (!(deltaS > 0) || !(deltaP > 0)) throw new Error('phiK: Nachgiebigkeiten muessen > 0 sein');
    return deltaP / (deltaS + deltaP);
  }
  function phiEn(deltaS, deltaP, n) {
    if (!(n >= 0 && n <= 1)) throw new Error('phiEn: Krafteinleitungsfaktor n muss in [0,1] liegen');
    return n * phiK(deltaS, deltaP);
  }
  function forceSplit(F_A, phi) {
    if (!(phi >= 0 && phi <= 1)) throw new Error('forceSplit: phi muss in [0,1] liegen');
    return { F_SA: phi * F_A, F_PA: (1 - phi) * F_A };
  }

  /* ===== R4: Setzkraftverlust ============================================
   * f_Z [um] aus der Setzbetragstabelle (Gewinde + Auflagen + Trennfugen),
   * F_Z [N] = (f_Z/1000) / (delta_S + delta_P).  Eindeutige Physik, voll testbar.
   * THERMISCHER Anteil dF'_Vth NICHT enthalten (Vorzeichen + E(T) heikel ->
   * wie der Verformungskegel erst nach Norm-Validierung). assemblyPreloadMin
   * nimmt ihn als optionalen Eingang deltaFvth (Standard 0). */
  function settlingAmount(cfg) {
    var t = DATA.SETTLING[cfg.rz];
    if (!t) throw new Error('Unbekannte Rautiefenklasse: ' + cfg.rz);
    var mode = cfg.mode || 'axial';
    if (mode !== 'axial' && mode !== 'shear') throw new Error('settlingAmount: mode muss "axial" oder "shear" sein');
    var seats = (cfg.seats != null) ? cfg.seats : 2;               // Kopf + Mutter
    var interfaces = (cfg.interfaces != null) ? cfg.interfaces : 1; // innere Trennfugen
    if (!(seats >= 0) || !(interfaces >= 0)) throw new Error('settlingAmount: seats/interfaces muessen >= 0 sein');
    var v = t[mode];
    return v.thread + seats * v.perSeat + interfaces * v.perInterface; // [um]
  }

  function settlingLoss(cfg) {
    if (!(cfg.f_Z >= 0)) throw new Error('settlingLoss: f_Z muss >= 0 sein');
    if (!(cfg.deltaS > 0) || !(cfg.deltaP > 0)) throw new Error('settlingLoss: Nachgiebigkeiten muessen > 0 sein');
    return (cfg.f_Z / 1000) / (cfg.deltaS + cfg.deltaP); // um->mm; mm/(mm/N)=N
  }

  /* ===== R5: Mindestmontagevorspannkraft =================================
   * F_Mmin = F_Kerf + (1 - phi_en)*F_A + F_Z + dF'_Vth   (dF'_Vth optional, Std. 0) */
  function assemblyPreloadMin(cfg) {
    if (!(cfg.F_Kerf >= 0) || !(cfg.F_A >= 0) || !(cfg.F_Z >= 0)) throw new Error('assemblyPreloadMin: F_Kerf, F_A, F_Z muessen >= 0 sein');
    if (!(cfg.phiEn >= 0 && cfg.phiEn <= 1)) throw new Error('assemblyPreloadMin: phiEn muss in [0,1] liegen');
    var dVth = (cfg.deltaFvth != null) ? cfg.deltaFvth : 0;
    var plateRelief = (1 - cfg.phiEn) * cfg.F_A;
    var FMmin = cfg.F_Kerf + plateRelief + cfg.F_Z + dVth;
    return { F_Mmin: FMmin, parts: { clamp: cfg.F_Kerf, plateRelief: plateRelief, settling: cfg.F_Z, thermal: dVth } };
  }

  /* ===== R6: Maximalmontagevorspannkraft ================================= */
  function assemblyPreloadMax(cfg) {
    if (!(cfg.F_Mmin >= 0)) throw new Error('assemblyPreloadMax: F_Mmin muss >= 0 sein');
    if (!(cfg.alphaA >= 1)) throw new Error('assemblyPreloadMax: Anziehfaktor alpha_A muss >= 1 sein');
    return { F_Mmax: cfg.alphaA * cfg.F_Mmin };
  }

  /* ===== R7: Montagebeanspruchung & zulaessige Montagevorspannkraft =======
   * Torsion aus dem Gewindemoment M_G; von-Mises sigma_red = sqrt(s^2 + 3 t^2).
   * F_Mzul aus 90 %-Ausnutzung der Mindeststreckgrenze (nu = 0.9).
   * Konstanten physikalisch hergeleitet: C_PITCH = 1/(2pi), C_FLANK = 1/(2 cos30).
   * (Die oft zitierten 0,16 / 0,58 sind deren Rundung.) */
  var C_PITCH = 1 / (2 * Math.PI);                       // 0.159155 (Steigungsanteil)
  var C_FLANK = 1 / (2 * Math.cos(30 * Math.PI / 180));  // 0.577350 (Gewindereibung)

  function bearingDiameter(d_w, d_h) {
    if (!(d_w > 0) || !(d_h > 0) || !(d_w > d_h)) throw new Error('bearingDiameter: 0 < d_h < d_w noetig');
    return (d_w + d_h) / 2; // D_Km
  }

  function polarSectionModulus(d_S) {
    if (!(d_S > 0)) throw new Error('polarSectionModulus: d_S > 0 noetig');
    return Math.PI / 16 * d_S * d_S * d_S; // W_p
  }

  /* Gewindemoment M_G [N*mm] = F_M*(P/(2pi) + C_FLANK*mu_G*d2). */
  function threadTorque(cfg) {
    if (!(cfg.F_M >= 0) || !(cfg.P > 0) || !(cfg.d2 > 0) || !(cfg.muG >= 0)) throw new Error('threadTorque: ungueltige Eingaben');
    return cfg.F_M * (C_PITCH * cfg.P + C_FLANK * cfg.muG * cfg.d2);
  }

  /* Montagebeanspruchung: sigma_M = F_M/A_S, tau = M_G/W_p, sigma_red. */
  function assemblyStress(cfg) {
    if (!(cfg.F_M >= 0) || !(cfg.A_S > 0) || !(cfg.W_p > 0)) throw new Error('assemblyStress: ungueltige Eingaben');
    var sigma = cfg.F_M / cfg.A_S;
    var tau = cfg.M_G / cfg.W_p;
    return { sigma_M: sigma, tau: tau, sigma_red: Math.sqrt(sigma * sigma + 3 * tau * tau) };
  }

  /* Zulaessige Montagevorspannkraft F_Mzul bei sigma_red = nu*Rp0,2 (nu Std. 0.9).
   * Geschlossene Form: sigma_red = F_M*k -> F_Mzul = nu*Rp0,2 / k.
   * cfg: { Rp02, A_S, d2, d_S, P, muG, [nu] } */
  function permissiblePreload(cfg) {
    if (!(cfg.Rp02 > 0) || !(cfg.A_S > 0) || !(cfg.d2 > 0) || !(cfg.d_S > 0) || !(cfg.P > 0) || !(cfg.muG >= 0)) throw new Error('permissiblePreload: ungueltige Eingaben');
    var nu = (cfg.nu != null) ? cfg.nu : 0.9;
    if (!(nu > 0 && nu <= 1)) throw new Error('permissiblePreload: nu muss in (0,1] liegen');
    var Wp = polarSectionModulus(cfg.d_S);
    var m = C_PITCH * cfg.P + C_FLANK * cfg.muG * cfg.d2;             // M_G = F_M * m
    var k = Math.sqrt(1 / (cfg.A_S * cfg.A_S) + 3 * (m / Wp) * (m / Wp)); // sigma_red = F_M * k
    return { F_Mzul: nu * cfg.Rp02 / k, nu: nu, W_p: Wp };
  }

  /* ===== R13: Anziehdrehmoment ===========================================
   * M_A = M_G + F_M*mu_K*D_Km/2 = F_M*(P/(2pi) + C_FLANK*mu_G*d2 + mu_K*D_Km/2). */
  function tighteningTorque(cfg) {
    if (!(cfg.F_M >= 0) || !(cfg.P > 0) || !(cfg.d2 > 0) || !(cfg.muG >= 0) || !(cfg.muK >= 0) || !(cfg.D_Km > 0)) throw new Error('tighteningTorque: ungueltige Eingaben');
    var M_G = cfg.F_M * (C_PITCH * cfg.P + C_FLANK * cfg.muG * cfg.d2);
    var M_K = cfg.F_M * cfg.muK * cfg.D_Km / 2;
    return { M_A: M_G + M_K, M_G: M_G, M_K: M_K };
  }

  /* ===== R8: Betriebsbeanspruchung & Sicherheit gegen Fliessen ===========
   * F_Smax = F_Mzul + F_SAmax - dF'_Vth  (Summe, validiert am Anhalt-Beispiel: 61.8 kN)
   * sigma_zmax = F_Smax/A_S (+ optional sigma_b fuer exzentrisch)
   * sigma_red,B = sqrt(sigma_zmax^2 + 3*(k_tau*tau)^2);  S_F = R_p0,2 / sigma_red,B
   * tau = Montage-Torsionsspannung; im Betrieb k_tau ~ 0.5 -> als Eingang. */
  function maxBoltForce(cfg) {
    if (!(cfg.F_Mzul >= 0) || !(cfg.F_SAmax >= 0)) throw new Error('maxBoltForce: F_Mzul, F_SAmax muessen >= 0 sein');
    var dVth = (cfg.deltaFvth != null) ? cfg.deltaFvth : 0;
    return cfg.F_Mzul + cfg.F_SAmax - dVth;
  }
  function operatingStress(cfg) {
    if (!(cfg.F_Smax >= 0) || !(cfg.A_S > 0) || !(cfg.Rp02 > 0)) throw new Error('operatingStress: F_Smax, A_S, Rp02 ungueltig');
    var tau = (cfg.tau != null) ? cfg.tau : 0;
    var sb = (cfg.sigma_b != null) ? cfg.sigma_b : 0;
    if (!(tau >= 0)) throw new Error('operatingStress: tau muss >= 0 sein');
    var sz = cfg.F_Smax / cfg.A_S + sb;
    var sred = Math.sqrt(sz * sz + 3 * tau * tau);
    return { sigma_zmax: sz, sigma_redB: sred, S_F: cfg.Rp02 / sred };
  }

  /* ===== R9: Schwingbeanspruchung (Dauerhaltbarkeit) =====================
   * sigma_a = (F_SAo - F_SAu)/(2*A0)   (A0 = A_S; bei Dehnschrauben A_0)
   * SV (schlussverguetet): sigma_ASV = 0.85*(150/d + 45) [N/mm^2] -> validate.
   * SG (schlussgerollt, hoeher/vorspannungsabhaengig) NOCH NICHT enthalten.
   * S_D = sigma_A / sigma_a */
  function fatigueAmplitude(cfg) {
    if (!(cfg.A0 > 0)) throw new Error('fatigueAmplitude: A0 > 0 noetig');
    if (!(cfg.F_SAo >= cfg.F_SAu)) throw new Error('fatigueAmplitude: F_SAo muss >= F_SAu sein');
    return (cfg.F_SAo - cfg.F_SAu) / (2 * cfg.A0);
  }
  function enduranceLimitSV(d) {
    if (!(d > 0)) throw new Error('enduranceLimitSV: d > 0 noetig');
    return 0.85 * (150 / d + 45); // schlussverguetet (validate gg. Norm)
  }
  function fatigueSafety(sigmaA, sigmaa) {
    if (!(sigmaA > 0)) throw new Error('fatigueSafety: sigma_A > 0 noetig');
    if (!(sigmaa > 0)) throw new Error('fatigueSafety: sigma_a > 0 noetig (keine Wechsellast -> Nachweis entfaellt)');
    return sigmaA / sigmaa;
  }

  /* ===== R10: Flaechenpressung ===========================================
   * A_p = pi/4*(d_w^2 - d_h^2);  p_max = F_Smax/A_p;  S_P = p_G/p_max */
  function bearingArea(d_w, d_h) {
    if (!(d_w > 0) || !(d_h > 0) || !(d_w > d_h)) throw new Error('bearingArea: 0 < d_h < d_w noetig');
    return Math.PI / 4 * (d_w * d_w - d_h * d_h);
  }
  function bearingPressure(cfg) {
    if (!(cfg.F_Smax >= 0)) throw new Error('bearingPressure: F_Smax >= 0 noetig');
    var Ap = bearingArea(cfg.d_w, cfg.d_h);
    return { p_max: cfg.F_Smax / Ap, A_p: Ap };
  }
  function surfacePressureSafety(pG, pMax) {
    if (!(pG > 0) || !(pMax > 0)) throw new Error('surfacePressureSafety: p_G, p_max > 0 noetig');
    return pG / pMax;
  }

  /* ===== R12: Gleiten & Abscheren ========================================
   * Reibschluss: F_KQerf = F_Qmax/(q_F*mu_T) + M_Ymax/(q_M*r_a*mu_T); S_G = F_KR/F_KQerf
   * Abscheren: tau_max = F_Qmax/A; tau_B = factor*R_m (factor ~0.6, validate); S_A = tau_B/tau_max */
  function requiredClampForce(cfg) {
    if (!(cfg.F_Qmax >= 0) || !(cfg.muT > 0) || !(cfg.qF >= 1)) throw new Error('requiredClampForce: F_Qmax>=0, mu_T>0, q_F>=1 noetig');
    var t1 = cfg.F_Qmax / (cfg.qF * cfg.muT);
    var t2 = 0;
    if (cfg.M_Ymax != null && cfg.M_Ymax > 0) {
      if (!(cfg.qM >= 1) || !(cfg.ra > 0)) throw new Error('requiredClampForce: bei M_Ymax sind q_M>=1 und r_a>0 noetig');
      t2 = cfg.M_Ymax / (cfg.qM * cfg.ra * cfg.muT);
    }
    return t1 + t2;
  }
  function slipSafety(cfg) {
    if (!(cfg.F_KR >= 0) || !(cfg.F_KQerf > 0)) throw new Error('slipSafety: F_KR>=0, F_KQerf>0 noetig');
    return cfg.F_KR / cfg.F_KQerf;
  }
  function shearStress(cfg) {
    if (!(cfg.F_Qmax >= 0) || !(cfg.A > 0)) throw new Error('shearStress: F_Qmax>=0, A>0 noetig');
    return cfg.F_Qmax / cfg.A;
  }
  function shearStrength(cfg) {
    if (!(cfg.Rm > 0)) throw new Error('shearStrength: R_m > 0 noetig');
    var k = (cfg.factor != null) ? cfg.factor : 0.6; // tau_B ~ 0.6*R_m (validate gg. Norm/Klasse)
    if (!(k > 0 && k <= 1)) throw new Error('shearStrength: factor in (0,1] noetig');
    return k * cfg.Rm;
  }
  function shearSafety(tauB, tauMax) {
    if (!(tauB > 0) || !(tauMax > 0)) throw new Error('shearSafety: tau_B, tau_max > 0 noetig');
    return tauB / tauMax;
  }

  /* ===== R3-Ergaenzung: Plattennachgiebigkeit mit Verformungskegel =======
   * VALIDIERT am VDI-2230-Beispiel (Hochschule Anhalt): delta_P = 0,3546e-6.
   * Kegelwinkel tan(phi): empirisch nach VDI 2230 (ESV/DSV).
   * Verbindungskoeffizient w = 1 (DSV) / 2 (ESV) -- NICHT die Kegelzahl!
   * Grenzdurchmesser D_A,Gr = d_w + w*l_K*tan(phi). */
  function connectionCoeff(mode) {
    if (mode === 'DSV') return 1;
    if (mode === 'ESV') return 2;
    throw new Error('connectionCoeff: mode muss "DSV" oder "ESV" sein');
  }
  function coneAngle(mode, betaL, y) {
    if (!(betaL > 0) || !(y > 0)) throw new Error('coneAngle: betaL, y muessen > 0 sein');
    if (mode === 'ESV') return 0.348 + 0.013 * Math.log(betaL) + 0.193 * Math.log(y);
    if (mode === 'DSV') return 0.362 + 0.032 * Math.log(betaL / 2) + 0.153 * Math.log(y);
    throw new Error('coneAngle: mode muss "DSV" oder "ESV" sein');
  }
  function limitDiameter(d_w, w, l_K, tanPhi) {
    return d_w + w * l_K * tanPhi; // D_A,Gr
  }
  /* Nachgiebigkeit eines Verformungskegels bis zum Durchmesser D_top. */
  function coneCompliance(E_P, d_w, d_h, w, tanPhi, D_top) {
    if (!(E_P > 0) || !(d_w > d_h) || !(d_h > 0) || !(tanPhi > 0)) throw new Error('coneCompliance: ungueltige Eingaben');
    var num = (d_w + d_h) * (D_top - d_h);
    var den = (d_w - d_h) * (D_top + d_h);
    return 2 * Math.log(num / den) / (w * E_P * Math.PI * d_h * tanPhi);
  }
  /* Vollstaendige Plattennachgiebigkeit delta_P mit Fallunterscheidung.
   * cfg: { E_P, d_w, d_h, D_A, l_K, connection }  (connection 'DSV'|'ESV')
   *  - D_A <= d_w            : reine Huelse
   *  - D_A >= D_A,Gr         : Vollkegel (validiert)
   *  - d_w < D_A < D_A,Gr    : Kegel + Huelse (Struktur nach VDI; separat validieren) */
  function plateCompliance(cfg) {
    if (!(cfg.E_P > 0) || !(cfg.d_w > 0) || !(cfg.d_h > 0) || !(cfg.l_K > 0)) throw new Error('plateCompliance: E_P, d_w, d_h, l_K > 0 noetig');
    if (!(cfg.d_w > cfg.d_h)) throw new Error('plateCompliance: d_w muss > d_h sein');
    if (!(cfg.D_A > cfg.d_h)) throw new Error('plateCompliance: D_A muss > d_h sein');
    var mode = cfg.connection || 'DSV';
    var w = connectionCoeff(mode);
    var betaL = cfg.l_K / cfg.d_w;
    var y = cfg.D_A / cfg.d_w;
    var tanPhi = coneAngle(mode, betaL, y);
    var DAGr = limitDiameter(cfg.d_w, w, cfg.l_K, tanPhi);
    if (cfg.D_A <= cfg.d_w) {
      var Ah = Math.PI / 4 * (cfg.D_A * cfg.D_A - cfg.d_h * cfg.d_h);
      return { deltaP: cfg.l_K / (cfg.E_P * Ah), model: 'sleeve', tanPhi: tanPhi, DAGr: DAGr };
    }
    if (cfg.D_A >= DAGr) {
      return { deltaP: coneCompliance(cfg.E_P, cfg.d_w, cfg.d_h, w, tanPhi, DAGr), model: 'cone', tanPhi: tanPhi, DAGr: DAGr };
    }
    var dCone = coneCompliance(cfg.E_P, cfg.d_w, cfg.d_h, w, tanPhi, cfg.D_A);
    var lV = (cfg.D_A - cfg.d_w) / (2 * tanPhi);
    var lH = cfg.l_K - 2 * lV / w;
    var As = Math.PI / 4 * (cfg.D_A * cfg.D_A - cfg.d_h * cfg.d_h);
    var dSleeve = lH > 0 ? lH / (cfg.E_P * As) : 0;
    return { deltaP: dCone + dSleeve, model: 'cone+sleeve', tanPhi: tanPhi, DAGr: DAGr, lV: lV, lH: lH };
  }

  /* ===== R9-Ergaenzung: Dauerfestigkeit schlussgerollt (SG) ===============
   * sigma_A,SG = (2 - F_Sm/F_0.2min) * sigma_A,SV   (gueltig 0.3 <= F_Sm/F_0.2min < 1)
   * F_0.2min = R_p0,2 * A_S (Streckgrenzkraft); F_Sm = (F_SAo-F_SAu)/2 + F_Mzul.
   * Quelle/validiert: Anhalt-Beispiel (Smith-Diagramm-Naeherung). */
  function enduranceLimitSG(cfg) {
    if (!(cfg.d > 0) || !(cfg.F_Sm >= 0) || !(cfg.F02min > 0)) throw new Error('enduranceLimitSG: d>0, F_Sm>=0, F02min>0 noetig');
    var ratio = cfg.F_Sm / cfg.F02min;
    var sASV = enduranceLimitSV(cfg.d);
    var valid = (ratio >= 0.3 && ratio < 1);
    return { sigma_A_SG: (2 - ratio) * sASV, ratio: ratio, valid: valid };
  }

  /* ===== R11: Mindesteinschraubtiefe (vereinfacht) =======================
   * Vereinfachte Regel m_erf = factor * d (factor aus VDI-Diagramm nach d/P und
   * Werkstoffpaarung; im Anhalt-Beispiel 0.9). Vorhandene Tiefe:
   * m_vorh = l_S - l_K - (d - d3)/2.  Voll-Tragfaehigkeitsnachweis (Scherflaechen)
   * separat -> validate. */
  function minEngagementRequired(d, factor) {
    if (!(d > 0)) throw new Error('minEngagementRequired: d > 0 noetig');
    var f = (factor != null) ? factor : 0.9; // validate gg. VDI-Diagramm
    if (!(f > 0)) throw new Error('minEngagementRequired: factor > 0 noetig');
    return f * d;
  }
  function engagementAvailable(cfg) {
    if (!(cfg.l_S > 0) || !(cfg.l_K >= 0) || !(cfg.d > 0) || !(cfg.d3 > 0)) throw new Error('engagementAvailable: ungueltige Eingaben');
    return cfg.l_S - cfg.l_K - (cfg.d - cfg.d3) / 2;
  }

  /* ===== Orchestrator: kompletter Durchlauf R3 -> R13 ====================
   * Verkettet die oben EINZELN validierten Funktionen. delta_P jetzt inkl.
   * Verformungskegel (plateCompliance). Verschaltungs-Konventionen (F_KR, k_tau,
   * alpha_A-Wahl, n, dF_Vth) stehen im Ergebnis unter notes.assumptions, Offenes
   * unter notes.pending. Liefert status 'ok'. */
  function computeJoint(inp) {
    var notes = { assumptions: [], pending: [] };
    // Eingabevalidierung: harte Fehler blockieren die Rechnung (status 'invalid').
    var vr = validateInput ? validateInput(inp) : { ok: true, errors: [], warnings: [] };
    if (!vr.ok) {
      return { status: 'invalid', errors: vr.errors, warnings: vr.warnings, notes: notes };
    }
    var g = inp.size ? forSize(inp.size) : threadGeometry(inp.d, inp.P);
    var s = strength(inp.strengthClass);
    var Rp = s.Rp, Rm = s.Rm;

    var muG = (inp.muG != null) ? inp.muG : frictionMid(inp.frictionClass);
    var muK = (inp.muK != null) ? inp.muK : muG;
    var alphaA;
    if (inp.alphaA != null) { alphaA = inp.alphaA; }
    else {
      var tcl = DATA.TIGHTENING[inp.tightening];
      if (!tcl) throw new Error('computeJoint: unbekanntes Anziehverfahren "' + inp.tightening + '"');
      alphaA = tcl.range[1];
      notes.assumptions.push({ code: 'ASSUME_ALPHA_FROM_METHOD', method: inp.tightening, alphaA: alphaA, text: 'alpha_A = oberer Bereichswert von "' + inp.tightening + '" (' + alphaA + ')' });
    }

    var conn = inp.connection || 'DSV';
    if (inp.connection == null) notes.assumptions.push({ code: 'ASSUME_CONN_DSV', text: 'Verbindungsart = DSV angenommen' });
    // E_M (Ersatzteil Mutter/Einschraubteil): DSV -> Mutter aus Stahl (E_S);
    // ESV -> eingeschraubtes Teil = verspanntes Material (E_P).
    var E_M_eff = (inp.E_M != null) ? inp.E_M : (conn === 'ESV' ? inp.E_P : (inp.E_S || DATA.E_SCREW));
    var deltaS = boltCompliance({ d: g.d, d3: g.d3, lShank: inp.lShank, lThreadFree: inp.lThreadFree, E_S: (inp.E_S || DATA.E_SCREW), E_M: E_M_eff, l_SK: inp.l_SK, l_G: inp.l_G, l_M: inp.l_M }).deltaS;

    var deltaP, deltaPmodel, tanPhi = null, DAGr = null;
    if (inp.deltaP != null) {
      deltaP = inp.deltaP; deltaPmodel = 'override';
    } else {
      var pc = plateCompliance({ E_P: inp.E_P, d_w: inp.d_w, d_h: inp.d_h, D_A: inp.D_A, l_K: inp.l_K, connection: conn });
      deltaP = pc.deltaP; deltaPmodel = pc.model; tanPhi = pc.tanPhi; DAGr = pc.DAGr;
      if (pc.model === 'cone+sleeve') notes.pending.push({ code: 'PENDING_DP_CONE_SLEEVE', text: 'delta_P Kegel+Huelse (mittlerer Fall) — Struktur nach VDI, separat validieren' });
    }

    var n = (inp.n != null) ? inp.n : 0.5;
    if (inp.n == null) notes.assumptions.push({ code: 'ASSUME_N_DEFAULT', n: n, text: 'Krafteinleitungsfaktor n = 0.5 (unguenstig) angenommen' });
    var PhiK = phiK(deltaS, deltaP);
    var PhiEn = phiEn(deltaS, deltaP, n);
    var F_A = (inp.F_A != null) ? inp.F_A : (inp.F_Ao != null ? inp.F_Ao : 0);
    if (inp.F_A == null && inp.F_Ao != null) notes.assumptions.push({ code: 'ASSUME_FA_FROM_FAO', text: 'Betriebskraft F_A = F_Ao (Oberlast) fuer die Vorspannkraftkette' });
    var split = forceSplit(F_A, PhiEn);

    var f_Z = settlingAmount({ rz: inp.rz, mode: inp.loadMode || 'axial', seats: inp.seats, interfaces: inp.interfaces });
    var F_Z = settlingLoss({ f_Z: f_Z, deltaS: deltaS, deltaP: deltaP });
    var deltaFvth = inp.deltaFvth || 0;
    if (inp.deltaFvth == null) notes.assumptions.push({ code: 'ASSUME_DFVTH_ZERO', text: 'thermischer Anteil dF_Vth = 0 (kein Temperatureinfluss)' });

    var F_Mmin = assemblyPreloadMin({ F_Kerf: inp.F_Kerf, phiEn: PhiEn, F_A: F_A, F_Z: F_Z, deltaFvth: deltaFvth }).F_Mmin;
    var F_Mmax = assemblyPreloadMax({ F_Mmin: F_Mmin, alphaA: alphaA }).F_Mmax;

    var pp = permissiblePreload({ Rp02: Rp, A_S: g.As, d2: g.d2, d_S: g.ds, P: g.P, muG: muG });
    var F_Mzul = pp.F_Mzul;
    var preloadOK = F_Mmax <= F_Mzul;

    var D_Km = (inp.D_Km != null) ? inp.D_Km : bearingDiameter(inp.d_w, inp.d_h);
    var torque = tighteningTorque({ F_M: F_Mzul, P: g.P, d2: g.d2, muG: muG, muK: muK, D_Km: D_Km });

    var F_Ao = (inp.F_Ao != null) ? inp.F_Ao : F_A;
    var F_SAmax = PhiEn * F_Ao;
    var F_Smax = maxBoltForce({ F_Mzul: F_Mzul, F_SAmax: F_SAmax, deltaFvth: deltaFvth });
    var F_Vmax = F_Mzul - F_Z - deltaFvth; // fuer Flaechenpressung Betriebszustand
    var kTau = (inp.kTau != null) ? inp.kTau : 0.5;
    notes.assumptions.push({ code: 'ASSUME_KTAU', kTau: kTau, text: 'Torsions-Restfaktor k_tau = ' + kTau + ' im Betrieb' });
    var tauResidual = kTau * (threadTorque({ F_M: F_Mzul, P: g.P, d2: g.d2, muG: muG }) / pp.W_p);
    var os = operatingStress({ F_Smax: F_Smax, A_S: g.As, Rp02: Rp, tau: tauResidual });

    var fatigue = null;
    if (inp.F_Ao != null && inp.F_Au != null) {
      var sa = fatigueAmplitude({ F_SAo: PhiEn * inp.F_Ao, F_SAu: PhiEn * inp.F_Au, A0: (inp.A0 || g.As) });
      var sA = enduranceLimitSV(g.d);
      notes.pending.push({ code: 'PENDING_FATIGUE_SV', text: 'Dauerfestigkeit nur SV (schlussverguetet); SG separat (Norm noetig)' });
      fatigue = { sigma_a: sa, sigma_A: sA, S_D: (sa > 0 ? fatigueSafety(sA, sa) : Infinity) };
    }

    var pressure = null;
    if (inp.p_G != null) {
      var bp = bearingPressure({ F_Smax: F_Mzul, d_w: inp.d_w, d_h: inp.d_h }); // Montagezustand: F_Mzul/A_p
      pressure = { p_max: bp.p_max, A_p: bp.A_p, S_P: surfacePressureSafety(inp.p_G, bp.p_max) };
    }

    var slip = null;
    if (inp.F_Qmax != null && inp.F_Qmax > 0) {
      var qF = (inp.qF != null) ? inp.qF : 1;
      var FKQ = requiredClampForce({ F_Qmax: inp.F_Qmax, muT: (inp.muT || muG), qF: qF, M_Ymax: inp.M_Ymax, qM: inp.qM, ra: inp.ra });
      notes.assumptions.push({ code: 'ASSUME_FKR_FORMULA', text: 'Restklemmkraft F_KR = F_Mmin - F_Z - dF_Vth - (1-Phi_en)*F_A' });
      var F_KR = F_Mmin - F_Z - deltaFvth - (1 - PhiEn) * F_A;
      slip = { F_KQerf: FKQ, F_KR: F_KR, S_G: (F_KR > 0 && FKQ > 0 ? slipSafety({ F_KR: F_KR, F_KQerf: FKQ }) : 0) };
    }

    notes.pending.push({ code: 'PENDING_R11', text: 'R11 Mindesteinschraubtiefe — empirische Faktoren, Norm/SR1 noetig' });

    return {
      status: 'ok', notes: notes, warnings: vr.warnings,
      geometry: g, strength: { Rm: Rm, Rp02: Rp }, muG: muG, muK: muK, alphaA: alphaA, n: n,
      deltaS: deltaS, deltaP: deltaP, deltaP_model: deltaPmodel, tanPhi: tanPhi, DAGr: DAGr, PhiK: PhiK, PhiEn: PhiEn,
      F_SA: split.F_SA, F_PA: split.F_PA, f_Z: f_Z, F_Z: F_Z,
      F_Mmin: F_Mmin, F_Mmax: F_Mmax, F_Mzul: F_Mzul, preloadOK: preloadOK,
      M_A: torque.M_A, M_G: torque.M_G, M_K: torque.M_K,
      F_Vmax: F_Vmax, F_Smax: F_Smax, sigma_zmax: os.sigma_zmax, sigma_redB: os.sigma_redB, S_F: os.S_F,
      fatigue: fatigue, pressure: pressure, slip: slip
    };
  }

  /* Liste der Voreinstellungen fuer die Eingabemaske: id, Label, validiert?, Eingaben. */
  function listPresets() {
    var P = DATA.PRESETS || {};
    return Object.keys(P).map(function (id) {
      return { id: id, label: P[id].label, validated: !!P[id].ref, input: P[id].input };
    });
  }

  return {
    VERSION: '0.7.0-engine',
    data: DATA,
    SUBLEN: SUBLEN,
    threadGeometry: threadGeometry,
    forSize: forSize,
    strength: strength,
    strengthFromCode: strengthFromCode,
    frictionMid: frictionMid,
    boltCompliance: boltCompliance,
    plateComplianceSleeve: plateComplianceSleeve,
    connectionCoeff: connectionCoeff,
    coneAngle: coneAngle,
    limitDiameter: limitDiameter,
    coneCompliance: coneCompliance,
    plateCompliance: plateCompliance,
    phiK: phiK,
    phiEn: phiEn,
    forceSplit: forceSplit,
    settlingAmount: settlingAmount,
    settlingLoss: settlingLoss,
    assemblyPreloadMin: assemblyPreloadMin,
    assemblyPreloadMax: assemblyPreloadMax,
    bearingDiameter: bearingDiameter,
    polarSectionModulus: polarSectionModulus,
    threadTorque: threadTorque,
    assemblyStress: assemblyStress,
    permissiblePreload: permissiblePreload,
    tighteningTorque: tighteningTorque,
    maxBoltForce: maxBoltForce,
    operatingStress: operatingStress,
    fatigueAmplitude: fatigueAmplitude,
    enduranceLimitSV: enduranceLimitSV,
    enduranceLimitSG: enduranceLimitSG,
    fatigueSafety: fatigueSafety,
    bearingArea: bearingArea,
    bearingPressure: bearingPressure,
    surfacePressureSafety: surfacePressureSafety,
    requiredClampForce: requiredClampForce,
    slipSafety: slipSafety,
    shearStress: shearStress,
    shearStrength: shearStrength,
    shearSafety: shearSafety,
    minEngagementRequired: minEngagementRequired,
    engagementAvailable: engagementAvailable,
    listPresets: listPresets,
    computeJoint: computeJoint
  };
});
