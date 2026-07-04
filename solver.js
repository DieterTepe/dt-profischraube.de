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
  var RM_MAX_FACTOR = 1.2;   // R11: F_mS = RM_MAX_FACTOR * R_m,S * A_S (Bruchkraft-Basis, VDI-B3-Praezedenz)

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

  /* Bolzen-Scherfestigkeitsverhaeltnis tau_B,S/R_m,S, klassenabhaengig (R11).
   * VDI 2230 Bl.1 (nach Thomala): faellt mit steigender Zugfestigkeit
   * (8.8 = 0,65 · 10.9 = 0,62 · 12.9 = 0,60 · niedrige Klassen ~0,70).
   * Reine Rechengroesse -> aus der Festigkeitsklasse abgeleitet, keine Nutzereingabe.
   * Fallback: DATA.BOLT_TAU_RATIO (0,62) bei unbekannter Klasse. */
  function boltShearRatio(strengthClass) {
    var tbl = DATA.BOLT_TAU_BY_CLASS || {};
    var r = (strengthClass != null) ? tbl[strengthClass] : undefined;
    return (typeof r === 'number' && r > 0) ? r : DATA.BOLT_TAU_RATIO;
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
   * THERMISCHER Anteil dF'_Vth: seit v4.6 rechnet ihn der Thermik-Assistent in
   * computeJoint aus dT (VDI-Naeherung, E(T) konstant); assemblyPreloadMin nimmt
   * ihn weiterhin als optionalen Eingang deltaFvth (Standard 0, positiv = Verlust). */
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
   * SV (schlussverguetet): sigma_ASV = 0.85*(150/d + 45) [N/mm^2].
   * SG (schlussgewalzt) wird in computeJoint ueber enduranceLimitSG ergaenzt
   * (vorspannungsabhaengig). Oberflaechen-Abminderung (SURFACE_FATIGUE) wird dort angewandt.
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

  /* ===== Flansch-Assistent: Umfangskraft je Schraube ======================
   * Ein Drehmoment M_T [N*mm] um die Flanschachse wird von z Schrauben am
   * Lochkreisradius r_LK [mm] durch Umfangskraefte uebertragen. Bei gleichmaessiger
   * Aufteilung traegt jede Schraube F_Qmax = M_T/(z*r_LK). Reiner UX-Wrapper fuer
   * R12 — keine neue Physik. Als Node-Helfer exportiert und einzeln getestet. */
  function flangeShear(cfg) {
    if (!(cfg.M_T >= 0)) throw new Error('flangeShear: M_T muss >= 0 sein');
    if (!(cfg.z >= 1)) throw new Error('flangeShear: Schraubenzahl z muss >= 1 sein');
    if (!(cfg.r_LK > 0)) throw new Error('flangeShear: Lochkreisradius r_LK muss > 0 sein');
    return { F_Qmax: cfg.M_T / (cfg.z * cfg.r_LK), M_T: cfg.M_T, z: cfg.z, r_LK: cfg.r_LK };
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
  /* Physikalische Untergrenze fuer tan(phi). Die empirische Formel kann bei absurd
   * kleinem betaL = l_K/d_w (z. B. l_K=0,01 mm bei d_w=500 mm) rechnerisch <= 0 werden;
   * dann wuerde coneCompliance durch ~0 teilen -> Infinity/NaN (bricht SVG-Schaubild).
   * Der Clamp ist ein reiner Robustheits-Riegel fuer unphysikalische Eingaben und greift
   * bei jeder sinnvollen Geometrie nie (Minimum realer Faelle ~0,12). */
  var TANPHI_MIN = 0.05;
  function coneAngle(mode, betaL, y) {
    if (!(betaL > 0) || !(y > 0)) throw new Error('coneAngle: betaL, y muessen > 0 sein');
    var t;
    if (mode === 'ESV') t = 0.348 + 0.013 * Math.log(betaL) + 0.193 * Math.log(y);
    else if (mode === 'DSV') t = 0.362 + 0.032 * Math.log(betaL / 2) + 0.153 * Math.log(y);
    else throw new Error('coneAngle: mode muss "DSV" oder "ESV" sein');
    return (t > TANPHI_MIN) ? t : TANPHI_MIN;
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
    var tanPhiClamped = (tanPhi === TANPHI_MIN);   // Robustheits-Riegel hat gegriffen (unphysikalische Geometrie)
    var DAGr = limitDiameter(cfg.d_w, w, cfg.l_K, tanPhi);
    if (cfg.D_A <= cfg.d_w) {
      var Ah = Math.PI / 4 * (cfg.D_A * cfg.D_A - cfg.d_h * cfg.d_h);
      return { deltaP: cfg.l_K / (cfg.E_P * Ah), model: 'sleeve', tanPhi: tanPhi, DAGr: DAGr, tanPhiClamped: tanPhiClamped };
    }
    if (cfg.D_A >= DAGr) {
      return { deltaP: coneCompliance(cfg.E_P, cfg.d_w, cfg.d_h, w, tanPhi, DAGr), model: 'cone', tanPhi: tanPhi, DAGr: DAGr, tanPhiClamped: tanPhiClamped };
    }
    var dCone = coneCompliance(cfg.E_P, cfg.d_w, cfg.d_h, w, tanPhi, cfg.D_A);
    var lV = (cfg.D_A - cfg.d_w) / (2 * tanPhi);
    var lH = cfg.l_K - 2 * lV / w;
    var As = Math.PI / 4 * (cfg.D_A * cfg.D_A - cfg.d_h * cfg.d_h);
    var dSleeve = lH > 0 ? lH / (cfg.E_P * As) : 0;
    return { deltaP: dCone + dSleeve, model: 'cone+sleeve', tanPhi: tanPhi, DAGr: DAGr, lV: lV, lH: lH, tanPhiClamped: tanPhiClamped };
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

  /* ===== R11: Mindesteinschraubtiefe nach VDI 2230 Bl.1 (Scherquerschnitte) =
   * Voll-Tragfaehigkeitsnachweis (Alexander/Ruoss, hexagon.de). Grundgedanke:
   * Die tragende Einschraubtiefe muss so gross sein, dass eher die Schraube
   * bricht als das (schwaechere) Gewinde abschert. Ablauf:
   *   1) Scherflaechen je mm Einschraubtiefe: Muttern-Gewinde schert am Bolzen-
   *      Aussendurchmesser d, Schrauben-Gewinde am Mutter-Kerndurchmesser D1.
   *   2) Tragkraftverhaeltnis R_S = (tau_B,M*a_GM)/(tau_B,S*a_GS): R_S<1 -> das
   *      Innengewinde (Mutter) ist schwaecher und schert zuerst; R_S>=1 -> das
   *      Bolzengewinde. Je nach Fall Korrekturfaktor C3 (innen) bzw. C2 (bolzen).
   *   3) m_eff = F_mS / (tau_B,schwach * a_schwach * C1 * Cx), F_mS = 1,2*Rm*As.
   * C1 = 1 (Annahme s/d >= 1,9; Muttern-Aufweitung vernachlaessigt). Die C2/C3-
   * Polynome sind gegen veroeffentlichte Ruoss-Ankerwerte geprueft:
   *   C3(1)=0,8970  C3(0,4)=1,0553 | C2(1)=0,8973  C2(2,0)=1,1668
   * -> Stetigkeit beider Aeste bei R_S=1 (rel. Abweichung ~3e-4). */
  function threadStripGeom(d, P) {
    if (!(d > 0) || !(P > 0)) throw new Error('threadStripGeom: d,P > 0 noetig');
    var t30 = Math.tan(Math.PI / 6);               // tan 30 Grad (halber Flankenwinkel)
    var d2 = d - C.c_d2 * P;                        // Flankendurchmesser
    var D1 = d - C.c_D1 * P;                        // Kerndurchmesser Mutter/Innengewinde
    if (!(D1 > 0)) throw new Error('threadStripGeom: D1<=0 (Steigung P zu gross fuer d)');
    // Mutterngewinde schert am Bolzen-Aussendurchmesser d ab (je mm Tiefe):
    var aGM = Math.PI * d / P * (P / 2 + (d - d2) * t30);
    // Schraubengewinde schert am Mutter-Kerndurchmesser D1 ab (je mm Tiefe):
    var aGS = Math.PI * D1 / P * (P / 2 + (d2 - D1) * t30);
    return { d2: d2, D1: D1, aGM: aGM, aGS: aGS };
  }
  function threadStripRatio(geom, tauBM, tauBS) {
    if (!(tauBM > 0) || !(tauBS > 0)) throw new Error('threadStripRatio: tau_B > 0 noetig');
    return (tauBM * geom.aGM) / (tauBS * geom.aGS);
  }
  function c3Factor(RS) {   // Innengewinde (Mutter) schert ab; Gueltigkeit R_S <= 1
    return 0.728 + 1.769 * RS - 2.896 * RS * RS + 1.296 * RS * RS * RS;
  }
  function c2Factor(RS) {   // Bolzengewinde schert ab; Gueltigkeit R_S >= 1
    return 5.594 - 13.682 * RS + 14.107 * RS * RS - 6.057 * RS * RS * RS + 0.9353 * RS * RS * RS * RS;
  }
  function minEngagementVDI(cfg) {
    if (!(cfg.d > 0) || !(cfg.P > 0) || !(cfg.As > 0) || !(cfg.RmS > 0) || !(cfg.tauBM > 0) || !(cfg.tauBS > 0))
      throw new Error('minEngagementVDI: d,P,As,RmS,tauBM,tauBS > 0 noetig');
    var geom = threadStripGeom(cfg.d, cfg.P);
    var RS = threadStripRatio(geom, cfg.tauBM, cfg.tauBS);
    var F_mS = RM_MAX_FACTOR * cfg.RmS * cfg.As;   // Bruchkraft-Basis der Schraube
    var C1 = 1;                                     // s/d >= 1,9 angenommen
    var branch, Cx, m_eff;
    if (RS < 1) {                                   // Innengewinde (Mutter) schert zuerst
      branch = 'innen'; Cx = c3Factor(RS);
      m_eff = F_mS / (cfg.tauBM * geom.aGM * C1 * Cx);
    } else {                                        // Bolzengewinde schert zuerst
      branch = 'bolzen'; Cx = c2Factor(RS);
      m_eff = F_mS / (cfg.tauBS * geom.aGS * C1 * Cx);
    }
    return { m_eff: m_eff, RS: RS, branch: branch, C: Cx, C1: C1, F_mS: F_mS, geom: geom };
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
    /* Flansch-Assistent (Baustein 3, v4.4-Serie): reiner UX-Wrapper um R12.
     * Nutzer gibt Gesamt-Drehmoment M_T, Schraubenzahl z und Lochkreisradius r_LK;
     * die Umfangskraft je Schraube F_Qmax = M_T/(z*r_LK) wird berechnet und in die
     * bestehende, seit v4.1.0 getestete Querkraft-Kette (R12) eingespeist. KEINE
     * neue Physik. Aktiv ueberschreibt der Assistent ein evtl. manuelles F_Qmax
     * (die UI sperrt es ohnehin). inp wird flach kopiert, Original bleibt unberuehrt. */
    var flange = null;
    if (inp.flangeAssist === true) {
      var fs = flangeShear({ M_T: inp.M_T, z: inp.z_bolts, r_LK: inp.r_LK });
      inp = Object.assign({}, inp, { F_Qmax: fs.F_Qmax });
      flange = { M_T: fs.M_T, z: fs.z, r_LK: fs.r_LK, F_Qmax: fs.F_Qmax };
      notes.assumptions.push({ code: 'ASSUME_FLANGE_FQ', text: 'Flansch-Assistent: F_Qmax = M_T/(z*r_LK) = ' + Math.round(fs.F_Qmax) + ' N je Schraube (gleichmaessige Lastaufteilung auf ' + fs.z + ' Schrauben am Lochkreisradius ' + fs.r_LK + ' mm).' });
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
    // Schrauben-E-Modul: Nutzerwert > klassenspezifisch (rostfrei ~200 GPa) > Standard-Stahl.
    var E_S_eff = (inp.E_S != null) ? inp.E_S : (s.E || DATA.E_SCREW);
    if (inp.E_S == null && s.E && s.E !== DATA.E_SCREW) {
      notes.assumptions.push({ code: 'ASSUME_E_S_CLASS', text: 'E-Modul Schraube = ' + s.E + ' N/mm^2 (aus Festigkeitsklasse ' + inp.strengthClass + ', z. B. rostfrei); nicht der Standard-Stahlwert.' });
    }
    // E_M (Ersatzteil Mutter/Einschraubteil): DSV -> Mutter aus Stahl (E_S);
    // ESV -> eingeschraubtes Teil = verspanntes Material (E_P).
    var E_M_eff = (inp.E_M != null) ? inp.E_M : (conn === 'ESV' ? inp.E_P : E_S_eff);
    var deltaS = boltCompliance({ d: g.d, d3: g.d3, lShank: inp.lShank, lThreadFree: inp.lThreadFree, E_S: E_S_eff, E_M: E_M_eff, l_SK: inp.l_SK, l_G: inp.l_G, l_M: inp.l_M }).deltaS;

    var deltaP, deltaPmodel, tanPhi = null, DAGr = null;
    if (inp.deltaP != null) {
      deltaP = inp.deltaP; deltaPmodel = 'override';
    } else {
      var pc = plateCompliance({ E_P: inp.E_P, d_w: inp.d_w, d_h: inp.d_h, D_A: inp.D_A, l_K: inp.l_K, connection: conn });
      deltaP = pc.deltaP; deltaPmodel = pc.model; tanPhi = pc.tanPhi; DAGr = pc.DAGr;
      if (pc.model === 'cone+sleeve') notes.pending.push({ code: 'PENDING_DP_CONE_SLEEVE', text: 'delta_P Kegel+Huelse (mittlerer Fall) — Struktur nach VDI, separat validieren' });
      if (pc.tanPhiClamped) notes.pending.push({ code: 'TANPHI_CLAMPED', text: 'Kegelwinkel tan(phi) auf physikalische Untergrenze begrenzt — die Geometrie (l_K/d_w) liegt weit ausserhalb des Gueltigkeitsbereichs der empirischen Formel. delta_P ist hier nicht belastbar; Geometrie pruefen.' });
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
    /* Thermischer Anteil dF'_Vth: entweder ueber den Thermik-Assistenten aus dT
     * (VDI-Naeherung: dF_Vth = l_K*(alpha_S - alpha_P)*dT/(delta_S + delta_P),
     * alpha in 1e-6/K, positiv = Vorspannverlust; Temperaturabhaengigkeit der
     * E-Moduln NICHT enthalten) oder manuell als Eingang deltaFvth. */
    var deltaFvth, thermal = null;
    if (inp.thermalAssist === true) {
      var aS_u = (inp.alpha_S != null) ? inp.alpha_S : (s.stainless ? DATA.BOLT_ALPHA.stainless : DATA.BOLT_ALPHA.steel);
      var aP_u = (inp.alpha_P != null) ? inp.alpha_P
        : (inp.plateMat && DATA.TAU_RATIO[inp.plateMat] ? DATA.TAU_RATIO[inp.plateMat].alpha : null);
      if (aP_u == null || !isFinite(aP_u)) throw new Error('Thermik-Assistent: alpha_P fehlt (Plattenwerkstoff waehlen oder alpha_P angeben)');
      if (!isFinite(inp.dT)) throw new Error('Thermik-Assistent: dT fehlt');
      var dSum = deltaS + deltaP;
      deltaFvth = inp.l_K * (aS_u - aP_u) * 1e-6 * inp.dT / dSum;
      thermal = { dT: inp.dT, alpha_S: aS_u, alpha_P: aP_u, l_K: inp.l_K, dSum: dSum, deltaFvth: deltaFvth };
      if (inp.alpha_S == null) notes.assumptions.push({ code: 'ASSUME_ALPHA_S_CLASS', text: 'alpha_S = ' + aS_u + '*10^-6/K aus der Festigkeitsklasse (' + (s.stainless ? 'Austenit' : 'Schraubenstahl') + ', Richtwert 20..100 Grad C).' });
      if (inp.alpha_P == null) notes.assumptions.push({ code: 'ASSUME_ALPHA_P_MAT', text: 'alpha_P = ' + aP_u + '*10^-6/K aus dem Plattenwerkstoff (Richtwert 20..100 Grad C).' });
      notes.assumptions.push({ code: 'ASSUME_THERMAL_APPROX', text: 'Thermik (VDI-Naeherung): dF_Vth = l_K*(alpha_S - alpha_P)*dT/(delta_S + delta_P) = ' + Math.round(deltaFvth) + ' N. Temperaturabhaengigkeit der E-Moduln NICHT enthalten.' });
    } else {
      deltaFvth = inp.deltaFvth || 0;
      if (inp.deltaFvth == null) notes.assumptions.push({ code: 'ASSUME_DFVTH_ZERO', text: 'thermischer Anteil dF_Vth = 0 (kein Temperatureinfluss)' });
    }
    /* Konservativ: ein Vorspann-GEWINN (deltaFvth < 0, z. B. Alu-Teile bei Erwaermung)
     * wird fuer F_Mmin und die Restklemmkraft F_KR NICHT gutgeschrieben — der kalte
     * Zustand (dT = 0) bleibt dort massgeblich. In F_Smax und F_Vmax wirkt der
     * vorzeichenrichtige Wert: ein Gewinn ERHOEHT dort Schraubenkraft bzw.
     * Pressung und wird damit konservativ erfasst. */
    var deltaFvthLoss = Math.max(0, deltaFvth);
    if (deltaFvth < 0) notes.assumptions.push({ code: 'HINT_DFVTH_GAIN', text: 'dF_Vth = ' + Math.round(deltaFvth) + ' N ist ein Vorspann-GEWINN (Warmzustand). Fuer F_Mmin/F_KR nicht gutgeschrieben (kalter Zustand massgeblich); in F_Smax/F_Vmax erhoeht er Schraubenkraft bzw. Pressung.' });

    var F_Mmin = assemblyPreloadMin({ F_Kerf: inp.F_Kerf, phiEn: PhiEn, F_A: F_A, F_Z: F_Z, deltaFvth: deltaFvthLoss }).F_Mmin;
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
      var finish = (inp.threadFinish === 'SG') ? 'SG' : 'SV';
      var sASV = enduranceLimitSV(g.d);
      var sA = sASV, F_Sm = null, F02 = null, sgRatio = null;
      if (finish === 'SG') {
        F02 = Rp * g.As;                                         // Streckgrenzkraft F_0,2min
        F_Sm = F_Mzul + PhiEn * (inp.F_Ao + inp.F_Au) / 2;       // mittlere Schraubenkraft
        var sg = enduranceLimitSG({ d: g.d, F_Sm: F_Sm, F02min: F02 });
        sgRatio = sg.ratio;
        if (sg.valid) {
          sA = sg.sigma_A_SG;
          notes.assumptions.push({ code: 'ASSUME_SG_FSM', text: 'SG (schlussgewalzt): F_Sm = F_Mzul + Phi_en*(F_Ao+F_Au)/2 fuer sigma_A,SG' });
        } else {
          finish = 'SV';
          notes.pending.push({ code: 'SG_OUT_OF_RANGE', ratio: sg.ratio, text: 'SG nicht anwendbar (F_Sm/F_0,2min = ' + sg.ratio.toFixed(2) + ' ausserhalb ~0,3..1) — konservativ mit SV gerechnet' });
        }
      }
      if (finish === 'SV') notes.pending.push({ code: 'PENDING_FATIGUE_SV', text: 'Dauerfestigkeit nach SV (schlussverguetet, vorspannungsunabhaengig). Fuer schlussgewalzte Schrauben SG waehlen.' });
      // Oberflaechen-/Ausfuehrungs-Abminderung (VDI: HV -20 %, feuerverzinkt -30 %) auf sigma_A
      var surfKey = inp.surfaceFinish || 'blank';
      var surf = DATA.SURFACE_FATIGUE[surfKey] || DATA.SURFACE_FATIGUE.blank;
      var sA_beforeSurf = sA;
      sA = sA * surf.factor;
      if (surf.factor !== 1) {
        notes.assumptions.push({ code: 'ASSUME_SURFACE_FATIGUE', factor: surf.factor, surface: surfKey, text: 'Dauerfestigkeit mit Faktor ' + surf.factor + ' abgemindert (Ausfuehrung: ' + surfKey + ', VDI 2230 Bl.1).' });
      }
      // Rostfreie/austenitische Schrauben: sigma_A-Formel ist fuer 8.8..12.9 kalibriert -> Naeherung
      if (s.stainless) {
        notes.pending.push({ code: 'PENDING_FATIGUE_STAINLESS', text: 'Rostfreie/austenitische Schraube: die Dauerfestigkeitsformel (sigma_A) ist fuer Stahl 8.8..12.9 kalibriert und gilt hier nur als Naeherung — im Zweifel Herstellerangaben verwenden.' });
      }
      fatigue = { sigma_a: sa, sigma_A: sA, S_D: (sa > 0 ? fatigueSafety(sA, sa) : Infinity), finish: finish, sigma_ASV: sASV, F_Sm: F_Sm, F02: F02, sgRatio: sgRatio, surface: surfKey, surfaceFactor: surf.factor, sigma_A_preSurface: sA_beforeSurf };
    }

    var pressure = null;
    if (inp.p_G != null) {
      // R10 verlangt die Flaechenpressung im Montagezustand (F_Mzul) UND im Betriebszustand.
      // Massgebliche Betriebskraft ist die groesste Schraubenkraft F_Smax (Vorspannung + anteilige
      // Betriebslast); F_Smax >= F_Mzul, daher ist der Betriebsfall bei Zuglast der unguenstigere.
      // Ergebnis: das kleinere S_P beider Zustaende ist massgeblich.
      var bpM = bearingPressure({ F_Smax: F_Mzul, d_w: inp.d_w, d_h: inp.d_h });  // Montage: F_Mzul/A_p
      var bpB = bearingPressure({ F_Smax: F_Smax, d_w: inp.d_w, d_h: inp.d_h });  // Betrieb: F_Smax/A_p
      var S_P_M = surfacePressureSafety(inp.p_G, bpM.p_max);
      var S_P_B = surfacePressureSafety(inp.p_G, bpB.p_max);
      var betriebMassgeblich = S_P_B <= S_P_M;
      pressure = {
        p_max: Math.max(bpM.p_max, bpB.p_max), A_p: bpM.A_p,
        S_P: Math.min(S_P_M, S_P_B),
        p_max_M: bpM.p_max, p_max_B: bpB.p_max, S_P_M: S_P_M, S_P_B: S_P_B,
        governing: betriebMassgeblich ? 'Betrieb' : 'Montage'
      };
      if (betriebMassgeblich && S_P_B < S_P_M) {
        notes.assumptions.push({ code: 'ASSUME_SP_OPERATING', text: 'R10: Betriebszustand massgeblich (p_max aus F_Smax = ' + Math.round(F_Smax) + ' N > F_Mzul); S_P = min(Montage, Betrieb).' });
      }
    }

    var slip = null;
    if (inp.F_Qmax != null && inp.F_Qmax > 0) {
      var qF = (inp.qF != null) ? inp.qF : 1;
      var FKQ = requiredClampForce({ F_Qmax: inp.F_Qmax, muT: (inp.muT || muG), qF: qF, M_Ymax: inp.M_Ymax, qM: inp.qM, ra: inp.ra });
      notes.assumptions.push({ code: 'ASSUME_FKR_FORMULA', text: 'Restklemmkraft F_KR = F_Mmin - F_Z - max(0; dF_Vth) - (1-Phi_en)*F_A (Vorspanngewinn nicht gutgeschrieben)' });
      var F_KR = F_Mmin - F_Z - deltaFvthLoss - (1 - PhiEn) * F_A;
      slip = { F_KQerf: FKQ, F_KR: F_KR, S_G: (F_KR > 0 && FKQ > 0 ? slipSafety({ F_KR: F_KR, F_KQerf: FKQ }) : 0), muT: (inp.muT || muG), qF: qF, F_Qmax: inp.F_Qmax };
    }

    var engagement = null;
    var mgTau = (inp.matGroupM != null) ? DATA.TAU_RATIO[inp.matGroupM] : null;
    var r11Active = (inp.r11 === true) && !!mgTau && (inp.Rm_M > 0) && (inp.m_vorh > 0);
    if (r11Active) {
      var mzu = ((inp.connection === 'ESV') ? 3 : 2) * g.P;      // Sackloch ~3*P, Durchsteck/Mutter ~2*P
      var tauBM = mgTau.ratio * inp.Rm_M;
      var boltRatio = boltShearRatio(inp.strengthClass);         // klassenabhaengig (VDI/Thomala)
      var tauBS = boltRatio * Rm;
      var me = minEngagementVDI({ d: g.d, P: g.P, As: g.As, RmS: Rm, tauBM: tauBM, tauBS: tauBS });
      var m_eff_vorh = inp.m_vorh - mzu;
      var S_A = m_eff_vorh / me.m_eff;
      engagement = {
        m_min: me.m_eff, m_zu: mzu, m_vorh: inp.m_vorh, m_eff_vorh: m_eff_vorh, S_A: S_A,
        RS: me.RS, branch: me.branch, C: me.C, C1: me.C1, F_mS: me.F_mS,
        tauBM: tauBM, tauBS: tauBS, matRatio: mgTau.ratio, boltRatio: boltRatio,
        matSrc: mgTau.src, matGroupM: inp.matGroupM, Rm_M: inp.Rm_M, ok: S_A >= 1
      };
      notes.assumptions.push({ code: 'ASSUME_R11_BASIS', text: 'R11-Basis: F_mS = 1,2*R_m,S*A_S; C1 = 1 (s/d >= 1,9); tau_B,S klassenabhaengig (' + boltRatio.toFixed(2) + '*R_m,S); tau_B,M aus Werkstoffgruppe (' + mgTau.ratio + '*R_m,M).' });
      notes.pending.push({ code: 'VALIDATE_R11', text: 'R11-Mindesteinschraubtiefe: Struktur nach VDI 2230 Bl.1 (Alexander/Ruoss). Scherfestigkeitsverhaeltnisse normbelegt (VDI 2230 Bl.1 Tab. 6 / Bild 36; Guss/Alu via Lork-Hanke). Als Auslegungswerkzeug gedacht — vor Produktivnutzung gegen die Originalnorm pruefen.' });
    } else {
      notes.pending.push({ code: 'PENDING_R11', text: 'Mindesteinschraubtiefe (R11): Es soll eher die Schraube brechen als das Gewinde ausreissen. Fuer den vollstaendigen Nachweis "R11 pruefen" aktivieren und Werkstoffgruppe des Innengewindes, dessen R_m sowie die vorhandene Einschraubtiefe m_vorh angeben. Richtwerte ohne Nachweis: Stahl ~1*d, Guss ~1,4*d, Aluminium ~2*d.' });
    }

    var result = {
      status: 'ok', notes: notes, warnings: vr.warnings,
      geometry: g, strength: { Rm: Rm, Rp02: Rp }, muG: muG, muK: muK, alphaA: alphaA, n: n,
      deltaS: deltaS, deltaP: deltaP, deltaP_model: deltaPmodel, tanPhi: tanPhi, DAGr: DAGr, PhiK: PhiK, PhiEn: PhiEn,
      E_S: E_S_eff,
      F_SA: split.F_SA, F_PA: split.F_PA, f_Z: f_Z, F_Z: F_Z,
      deltaFvth: deltaFvth, deltaFvthLoss: deltaFvthLoss, thermal: thermal,
      F_Mmin: F_Mmin, F_Mmax: F_Mmax, F_Mzul: F_Mzul, preloadOK: preloadOK,
      M_A: torque.M_A, M_G: torque.M_G, M_K: torque.M_K,
      F_Vmax: F_Vmax, F_Smax: F_Smax, sigma_zmax: os.sigma_zmax, sigma_redB: os.sigma_redB, S_F: os.S_F,
      fatigue: fatigue, pressure: pressure, slip: slip, engagement: engagement, flange: flange
    };
    result.improvements = improvementHints(result, inp);
    return result;
  }

  /* ===== Verbesserungs-Hinweise (Stufe 2) ==================================
   * Fuer jede Sicherheit < 1,2 (gelb/rot) ein strukturierter Hinweis mit Hebeln
   * und — wo sauber invertierbar — einem konkreten Zielwert. Ampel-Grenze 1,2.
   * Rueckgabe: Array von { safety, level:'warn'|'bad', code, v:{...Zielwerte} }.
   * Die UI uebersetzt code + v dreisprachig. Kopplung: jeder Text traegt den
   * Zusatz, dass andere Nachweise danach erneut zu pruefen sind (siehe UI). */
  var SAFE_TARGET = 1.2;
  function improvementHints(R, inp) {
    var out = [];
    function lvl(s) { return s < 1.0 ? 'bad' : 'warn'; }
    function need(s) { return s != null && isFinite(s) && s < SAFE_TARGET; }

    // S_P Flaechenpressung: A_p um Faktor 1,2/S_P vergroessern -> d_w,erf
    if (R.pressure && need(R.pressure.S_P)) {
      var Ap = R.pressure.A_p;
      var ApErf = Ap * (SAFE_TARGET / R.pressure.S_P);
      var dwErf = Math.sqrt(ApErf * 4 / Math.PI + inp.d_h * inp.d_h);
      var pgErf = (inp.p_G || 0) * (SAFE_TARGET / R.pressure.S_P);
      out.push({ safety: 'S_P', level: lvl(R.pressure.S_P), code: 'FIX_SP', v: { dw: dwErf, dwNow: inp.d_w, pg: pgErf, gov: R.pressure.governing } });
    }
    // S_A Einschraubtiefe: m_vorh,erf = 1,2*m_min + m_zu
    if (R.engagement && need(R.engagement.S_A)) {
      var mErf = SAFE_TARGET * R.engagement.m_min + R.engagement.m_zu;
      out.push({ safety: 'S_A', level: lvl(R.engagement.S_A), code: 'FIX_SA', v: { m: mErf, mNow: R.engagement.m_vorh } });
    }
    // S_G Reibschluss: mu_T,erf = mu_T*1,2/S_G ; F_Qmax,zul = F_Qmax*S_G/1,2
    if (R.slip && need(R.slip.S_G)) {
      var muErf = R.slip.muT * (SAFE_TARGET / R.slip.S_G);
      var fqZul = R.slip.F_Qmax * (R.slip.S_G / SAFE_TARGET);
      out.push({ safety: 'S_G', level: lvl(R.slip.S_G), code: 'FIX_SG', v: { mu: muErf, muNow: R.slip.muT, fq: fqZul, fqNow: R.slip.F_Qmax } });
    }
    // S_D Dauerfestigkeit: Ausschlaglast um Faktor S_D/1,2 senken; SG/blank als Optionen
    if (R.fatigue && need(R.fatigue.S_D)) {
      var saZul = R.fatigue.sigma_a * (R.fatigue.S_D / SAFE_TARGET);
      out.push({ safety: 'S_D', level: lvl(R.fatigue.S_D), code: 'FIX_SD', v: {
        redPct: Math.round((1 - R.fatigue.S_D / SAFE_TARGET) * 100), saZul: saZul,
        canSG: (R.fatigue.finish === 'SV'), hasSurf: (R.fatigue.surfaceFactor != null && R.fatigue.surfaceFactor !== 1) } });
    }
    // S_F Fliessen (Montage): Vorspannung/Anziehmoment um Faktor S_F/1,2 senken
    if (need(R.S_F)) {
      out.push({ safety: 'S_F', level: lvl(R.S_F), code: 'FIX_SF', v: { redPct: Math.round((1 - R.S_F / SAFE_TARGET) * 100) } });
    }
    return out;
  }

  /* Liste der Voreinstellungen fuer die Eingabemaske: id, Label, validiert?, Eingaben. */
  function listPresets() {
    var P = DATA.PRESETS || {};
    return Object.keys(P).map(function (id) {
      return { id: id, label: P[id].label, validated: !!P[id].ref, input: P[id].input };
    });
  }

  return {
    VERSION: '0.8.0-engine',
    data: DATA,
    SUBLEN: SUBLEN,
    TANPHI_MIN: TANPHI_MIN,
    threadGeometry: threadGeometry,
    forSize: forSize,
    strength: strength,
    strengthFromCode: strengthFromCode,
    frictionMid: frictionMid,
    boltShearRatio: boltShearRatio,
    improvementHints: improvementHints,
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
    flangeShear: flangeShear,
    slipSafety: slipSafety,
    shearStress: shearStress,
    shearStrength: shearStrength,
    shearSafety: shearSafety,
    minEngagementRequired: minEngagementRequired,
    engagementAvailable: engagementAvailable,
    threadStripGeom: threadStripGeom,
    threadStripRatio: threadStripRatio,
    c3Factor: c3Factor,
    c2Factor: c2Factor,
    minEngagementVDI: minEngagementVDI,
    listPresets: listPresets,
    computeJoint: computeJoint
  };
});
