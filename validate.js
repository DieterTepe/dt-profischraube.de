/* ============================================================================
 * DT-ProfiSchraube · validate.js  (Eingabeschema + Pruefung)
 * ----------------------------------------------------------------------------
 *   - FIELDS:        Feldschema; label/help dreisprachig {de,en,pt}
 *   - enumValues:    erlaubte Werte eines Auswahlfeldes (aus den Datentabellen)
 *   - fieldOptions:  Auswahl-Optionen mit Label/Hinweis (sprachabhaengig)
 *   - fieldHelp:     Hilfetext (sprachabhaengig)
 *   - validateInput: zweistufige Pruefung -> { ok, errors[], warnings[] }
 *
 * ERRORS = harte Fehler (computeJoint rechnet nicht); WARNINGS = Grenzbereich.
 * Jede Meldung { field, severity, code, text, range } – "code" ist stabil; die
 * UI uebersetzt die Meldung anhand des Codes (text ist deutscher Rueckfall).
 * UMD: Node (Tests) + Browser (klassisches <script src>).
 * ========================================================================== */
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(require('./daten.js')); }
  else { root.DTSValidate = factory(root.DTSData); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (DATA) {
  'use strict';

  function keys(o) { return o ? Object.keys(o) : []; }
  function num(x) { return typeof x === 'number' && isFinite(x); }

  function enumValues(name) {
    switch (name) {
      case 'size':          return keys(DATA.THREADS);
      case 'strengthClass': return keys(DATA.STRENGTH);
      case 'frictionClass': return keys(DATA.FRICTION);
      case 'tightening':    return keys(DATA.TIGHTENING);
      case 'rz':            return keys(DATA.SETTLING);
      case 'connection':    return ['DSV', 'ESV'];
      case 'loadMode':      return ['axial', 'shear'];
      case 'threadFinish':  return ['SV', 'SG'];
      case 'surfaceFinish': return keys(DATA.SURFACE_FATIGUE);
      case 'matGroupM':     return keys(DATA.TAU_RATIO);
      case 'plateMat':      return keys(DATA.TAU_RATIO);
      default:              return [];
    }
  }

  /* Auswahl-Optionen mit sprachabhaengigem Hinweis (fuer Dropdowns/Hilfe). */
  function fieldOptions(name, lang) {
    lang = lang || 'de';
    function pick(o) { return o[lang] || o.de; }
    var CONN = {
      DSV: { de: 'Durchsteckschraube mit Mutter', en: 'through-bolt with nut', pt: 'parafuso passante com porca' },
      ESV: { de: 'Einschraubverbindung (Sacklochgewinde)', en: 'tapped-thread joint (blind hole)', pt: 'união roscada (furo cego)' }
    };
    var LM = {
      axial: { de: 'vorwiegend axiale Belastung', en: 'mainly axial load', pt: 'carga predominantemente axial' },
      shear: { de: 'vorwiegend Quer-/Schublast', en: 'mainly transverse/shear load', pt: 'carga predominantemente transversal' }
    };
    var RZ = { de: 'Rautiefe der Trennflächen', en: 'surface roughness of interfaces', pt: 'rugosidade das superfícies de contacto' };
    var TF = {
      SV: { de: 'schlussvergütet (vor Wärmebehandlung gerollt)', en: 'heat-treated after rolling (SV)', pt: 'temperada após laminagem (SV)' },
      SG: { de: 'schlussgewalzt (nach Wärmebehandlung gerollt)', en: 'rolled after heat treatment (SG)', pt: 'laminada após tratamento térmico (SG)' }
    };
    var vals = enumValues(name), out = [];
    for (var i = 0; i < vals.length; i++) {
      var v = vals[i], note = '', rec = false, F;
      if (name === 'frictionClass' && (F = DATA.FRICTION[v])) { note = 'μG/μK ≈ ' + F.range[0] + '..' + F.range[1]; rec = !!F.recommended; }
      else if (name === 'tightening' && (F = DATA.TIGHTENING[v])) { note = 'αA ' + F.range[0] + '..' + F.range[1]; rec = !!F.recommended; }
      else if (name === 'strengthClass' && (F = DATA.STRENGTH[v])) { note = 'Rm ' + F.Rm + ' / Rp0,2 ' + F.Rp + ' N/mm²' + (F.stainless ? ' · ' + (lang === 'en' ? 'stainless (ISO 3506)' : lang === 'pt' ? 'inoxidável (ISO 3506)' : 'rostfrei (ISO 3506)') : ''); }
      else if (name === 'connection') { note = pick(CONN[v]); }
      else if (name === 'loadMode') { note = pick(LM[v]); }
      else if (name === 'threadFinish') { note = pick(TF[v]); rec = (v === 'SV'); }
      else if (name === 'surfaceFinish' && (F = DATA.SURFACE_FATIGUE[v])) { note = pick(F.label); rec = (v === 'blank'); }
      else if (name === 'matGroupM' && (F = DATA.TAU_RATIO[v])) { note = pick(F.label) + ' · τB/Rm ' + F.ratio + (F.src && /Sch[aä]tz/.test(F.src) ? ' · Schätzwert (kein Norm-Beleg)' : ''); }
      else if (name === 'plateMat' && (F = DATA.TAU_RATIO[v])) { note = pick(F.label) + ' · E ' + F.E + ' · p_G ' + F.pG + ' N/mm²' + (F.src && /Sch[aä]tz/.test(F.src) ? ' · p_G Schätzwert' : ''); }
      else if (name === 'rz' && DATA.SETTLING[v]) { note = pick(RZ); }
      out.push({ value: v, label: v, note: note, recommended: rec });
    }
    return out;
  }

  /* ------------------------------------------------------------------ Schema
   * label/help: { de, en, pt }. Uebrige Felder wie gehabt. */
  var FIELDS = {
    /* --- Schraube & Werkstoff --- */
    size: {
      label: { de: 'Gewindegroesse', en: 'Thread size', pt: 'Tamanho da rosca' },
      group: 'Schraube', type: 'enum', enumOf: 'size', required: true, diagram: 'gewinde',
      help: {
        de: 'Metrisches ISO-Regelgewinde, z. B. M12. Bestimmt Nenndurchmesser, Steigung und alle Querschnitte automatisch. Bei Unsicherheit: Durchmesser des Gewindes messen (Aussenmass) und die naechstkleinere Groesse waehlen.',
        en: 'Metric ISO coarse thread, e.g. M12. Sets nominal diameter, pitch and all cross-sections automatically. If unsure, measure the thread outer diameter and pick the next smaller size.',
        pt: 'Rosca métrica ISO de passo normal, p. ex. M12. Define automaticamente o diâmetro nominal, o passo e todas as secções. Em caso de dúvida, meça o diâmetro exterior da rosca e escolha o tamanho imediatamente inferior.'
      }
    },
    strengthClass: {
      label: { de: 'Festigkeitsklasse', en: 'Property class', pt: 'Classe de resistência' },
      group: 'Schraube', type: 'enum', enumOf: 'strengthClass', required: true, diagram: 'kopf',
      help: {
        de: 'Werkstofffestigkeit der Schraube, meist auf dem Kopf eingepraegt (z. B. 8.8, 10.9, 12.9). Erste Zahl x100 = Zugfestigkeit, beide Zahlen geben die Streckgrenze. VDI 2230 ist fuer hochfeste Schrauben 8.8 bis 12.9 gedacht; hoehere Klasse erlaubt mehr Vorspannung.',
        en: 'Strength grade of the bolt, usually stamped on the head (e.g. 8.8, 10.9, 12.9). First number ×100 = tensile strength; both numbers give the yield point. VDI 2230 targets high-strength bolts 8.8 to 12.9; a higher class allows more preload.',
        pt: 'Classe de resistência do parafuso, normalmente gravada na cabeça (p. ex. 8.8, 10.9, 12.9). O primeiro número ×100 = resistência à tração; os dois números dão o limite de escoamento. A VDI 2230 destina-se a parafusos de alta resistência 8.8 a 12.9; uma classe superior permite maior pré-tensão.'
      }
    },
    E_S: {
      label: { de: 'E-Modul Schraube', en: 'Young\u2019s modulus, bolt', pt: 'Módulo de elasticidade, parafuso' },
      group: 'Schraube', type: 'number', unit: 'N/mm^2', min: 50000, max: 250000, warnMin: 195000, warnMax: 215000, advanced: true, diagram: null,
      help: {
        de: 'Elastizitaetsmodul des Schraubenwerkstoffs. Fuer Stahlschrauben rund 205 000 N/mm^2 (Standard, wird automatisch verwendet). Nur aendern, wenn ein anderer Werkstoff vorliegt.',
        en: 'Elastic modulus of the bolt material. For steel bolts about 205,000 N/mm² (default, used automatically). Change only for a different material.',
        pt: 'Módulo de elasticidade do material do parafuso. Para parafusos de aço cerca de 205 000 N/mm² (predefinição, usada automaticamente). Altere apenas para outro material.'
      }
    },

    /* --- Reibung & Anziehen --- */
    frictionClass: {
      label: { de: 'Reibungsklasse', en: 'Friction class', pt: 'Classe de atrito' },
      group: 'Anziehen', type: 'enum', enumOf: 'frictionClass', diagram: 'reibung',
      help: {
        de: 'Reibung in Gewinde und Kopfauflage, abhaengig von Oberflaeche und Schmierung. Niedrige Reibung bringt bei gleichem Drehmoment mehr Vorspannung, streut aber staerker. Startempfehlung: Klasse B (leicht geoelt). Alternativ direkt mu_G/mu_K angeben.',
        en: 'Friction in the thread and under the head, depending on surface and lubrication. Lower friction gives more preload for the same torque but scatters more. Starting recommendation: class B (lightly oiled). Alternatively enter μ_G/μ_K directly.',
        pt: 'Atrito na rosca e sob a cabeça, conforme a superfície e a lubrificação. Menor atrito dá mais pré-tensão para o mesmo binário, mas com maior dispersão. Recomendação inicial: classe B (ligeiramente lubrificado). Em alternativa, indique μ_G/μ_K diretamente.'
      }
    },
    muG: {
      label: { de: 'Gewindereibwert mu_G', en: 'Thread friction μ_G', pt: 'Atrito da rosca μ_G' },
      group: 'Anziehen', type: 'number', unit: '-', min: 0.01, max: 0.6, warnMin: 0.04, warnMax: 0.30, decimals: 3, diagram: 'reibung',
      help: {
        de: 'Reibungszahl im Gewinde. Typisch 0,10-0,14 (Stahl/Stahl, leicht geoelt). Sehr niedrige Werte (<0,08) nur bei guter Schmierung oder Festschmierstoff. Ueberschreibt die Reibungsklasse, wenn gesetzt.',
        en: 'Friction coefficient in the thread. Typically 0.10–0.14 (steel/steel, lightly oiled). Very low values (<0.08) only with good lubrication or solid lubricant. Overrides the friction class when set.',
        pt: 'Coeficiente de atrito na rosca. Tipicamente 0,10–0,14 (aço/aço, ligeiramente lubrificado). Valores muito baixos (<0,08) apenas com boa lubrificação ou lubrificante sólido. Substitui a classe de atrito quando definido.'
      }
    },
    muK: {
      label: { de: 'Kopfreibwert mu_K', en: 'Head friction μ_K', pt: 'Atrito da cabeça μ_K' },
      group: 'Anziehen', type: 'number', unit: '-', min: 0.01, max: 0.6, warnMin: 0.04, warnMax: 0.30, decimals: 3, diagram: 'reibung',
      help: {
        de: 'Reibungszahl unter dem Schraubenkopf bzw. der Mutter. Meist aehnlich wie mu_G. Geht nur in das Anziehdrehmoment ein, nicht in die Schraubenbeanspruchung.',
        en: 'Friction coefficient under the bolt head or nut. Usually similar to μ_G. Affects only the tightening torque, not the bolt stress.',
        pt: 'Coeficiente de atrito sob a cabeça ou porca. Normalmente semelhante a μ_G. Afeta apenas o binário de aperto, não a tensão do parafuso.'
      }
    },
    tightening: {
      label: { de: 'Anziehverfahren', en: 'Tightening method', pt: 'Método de aperto' },
      group: 'Anziehen', type: 'enum', enumOf: 'tightening', diagram: 'anziehen',
      help: {
        de: 'Wie wird angezogen? Bestimmt den Anziehfaktor alpha_A (Streuung der Vorspannkraft). Drehmomentschluessel = mittlere Streuung. Drehwinkel-/streckgrenzgesteuert = geringe Streuung. Schlagschrauber = hohe Streuung. Alternativ alpha_A direkt angeben.',
        en: 'How the bolt is tightened. Sets the tightening factor α_A (scatter of the preload). Torque wrench = medium scatter; angle-/yield-controlled = low scatter; impact wrench = high scatter. Alternatively enter α_A directly.',
        pt: 'Como o parafuso é apertado. Define o fator de aperto α_A (dispersão da pré-tensão). Chave dinamométrica = dispersão média; controlado por ângulo/escoamento = dispersão baixa; chave de impacto = dispersão alta. Em alternativa, indique α_A diretamente.'
      }
    },
    alphaA: {
      label: { de: 'Anziehfaktor alpha_A', en: 'Tightening factor α_A', pt: 'Fator de aperto α_A' },
      group: 'Anziehen', type: 'number', unit: '-', min: 1.0, max: 4.0, warnMax: 2.5, decimals: 2, advanced: true, diagram: 'anziehen',
      help: {
        de: 'Verhaeltnis maximale/minimale Montagevorspannkraft (Streuung). 1,0 = ideal ohne Streuung (theoretisch). Drehmomentgesteuert ca. 1,4-1,6, Schlagschrauber bis 2,5 und mehr. Ueberschreibt das Anziehverfahren, wenn gesetzt.',
        en: 'Ratio of maximum to minimum assembly preload (scatter). 1.0 = ideal, no scatter (theoretical). Torque-controlled approx. 1.4–1.6, impact wrench up to 2.5 and more. Overrides the tightening method when set.',
        pt: 'Relação entre a pré-tensão de montagem máxima e mínima (dispersão). 1,0 = ideal, sem dispersão (teórico). Controlado por binário aprox. 1,4–1,6, chave de impacto até 2,5 e mais. Substitui o método de aperto quando definido.'
      }
    },

    /* --- Verbindung & Geometrie --- */
    connection: {
      label: { de: 'Verbindungsart', en: 'Joint type', pt: 'Tipo de união' },
      group: 'Geometrie', type: 'enum', enumOf: 'connection', diagram: 'verbindung',
      help: {
        de: 'DSV = Durchsteckschraube mit Mutter (Schraube geht durch alle Teile). ESV = Einschraubverbindung, die Schraube greift in ein Sacklochgewinde im untersten Teil. Beeinflusst den Verformungskegel und die Nachgiebigkeit.',
        en: 'DSV = through-bolt with nut (bolt passes through all parts). ESV = tapped-thread joint, the bolt engages a blind-hole thread in the lowest part. Affects the deformation cone and the compliance.',
        pt: 'DSV = parafuso passante com porca (atravessa todas as peças). ESV = união roscada, o parafuso engata numa rosca de furo cego na peça inferior. Afeta o cone de deformação e a flexibilidade.'
      }
    },
    l_K: {
      label: { de: 'Klemmlaenge l_K', en: 'Clamp length l_K', pt: 'Comprimento de aperto l_K' },
      group: 'Geometrie', type: 'number', unit: 'mm', required: true, min: 0.1, max: 2000, diagram: 'klemmlaenge',
      help: {
        de: 'Gesamte Dicke der verspannten Teile zwischen Kopfauflage und Mutter bzw. Einschraubebene. Das ist die Strecke, die beim Anziehen zusammengedrueckt wird.',
        en: 'Total thickness of the clamped parts between the head bearing and the nut or engagement plane. This is the length compressed during tightening.',
        pt: 'Espessura total das peças apertadas entre o apoio da cabeça e a porca ou plano de engate. É o comprimento comprimido durante o aperto.'
      }
    },
    d_w: {
      label: { de: 'Kopfauflage d_w', en: 'Head bearing dia. d_w', pt: 'Apoio da cabeça d_w' },
      group: 'Geometrie', type: 'number', unit: 'mm', required: true, min: 0.1, max: 500, diagram: 'kopfauflage',
      help: {
        de: 'Wirksamer Auflagedurchmesser unter dem Schraubenkopf (aussen). Naeherung: Schluesselweite des Kopfes. Fuer Sechskant rund 1,4-1,8 * Gewindedurchmesser. Muss groesser sein als die Bohrung d_h.',
        en: 'Effective bearing diameter under the bolt head (outer). Approximation: the head width across flats. For hex about 1.4–1.8 × thread diameter. Must be larger than the hole d_h.',
        pt: 'Diâmetro efetivo de apoio sob a cabeça (exterior). Aproximação: a largura entre faces da cabeça. Para sextavado cerca de 1,4–1,8 × diâmetro da rosca. Deve ser maior do que o furo d_h.'
      }
    },
    d_h: {
      label: { de: 'Bohrung d_h', en: 'Hole dia. d_h', pt: 'Furo d_h' },
      group: 'Geometrie', type: 'number', unit: 'mm', required: true, min: 0.1, max: 500, diagram: 'bohrung',
      help: {
        de: 'Durchmesser des Durchgangslochs in den verspannten Teilen. Ueblich etwa 1,05-1,15 * Gewindedurchmesser (Spiel). Muss kleiner als die Kopfauflage d_w und kleiner als der Aussendurchmesser D_A sein.',
        en: 'Diameter of the clearance hole in the clamped parts. Usually about 1.05–1.15 × thread diameter (clearance). Must be smaller than the head bearing d_w and smaller than the outer diameter D_A.',
        pt: 'Diâmetro do furo passante nas peças apertadas. Normalmente cerca de 1,05–1,15 × diâmetro da rosca (folga). Deve ser menor do que o apoio da cabeça d_w e do que o diâmetro exterior D_A.'
      }
    },
    D_A: {
      label: { de: 'Aussendurchmesser D_A', en: 'Outer diameter D_A', pt: 'Diâmetro exterior D_A' },
      group: 'Geometrie', type: 'number', unit: 'mm', required: true, min: 0.1, max: 3000, diagram: 'aussen',
      help: {
        de: 'Aussendurchmesser des verspannten Materials um die Schraube herum (bzw. Ersatzdurchmesser bei Mehrschraubenverbindungen). Ist D_A kleiner/gleich d_w, wird mit einer Huelse gerechnet, sonst mit dem Verformungskegel.',
        en: 'Outer diameter of the clamped material around the bolt (or a substitute diameter for multi-bolt joints). If D_A ≤ d_w, a sleeve is used, otherwise the deformation cone.',
        pt: 'Diâmetro exterior do material apertado em torno do parafuso (ou diâmetro substituto em uniões multiparafuso). Se D_A ≤ d_w, usa-se uma manga, caso contrário o cone de deformação.'
      }
    },
    plateMat: {
      label: { de: 'Plattenwerkstoff (E-Modul, p_G)', en: 'Clamped-part material (E, p_G)', pt: 'Material das peças (E, p_G)' },
      group: 'Geometrie', type: 'enum', enumOf: 'plateMat', diagram: null,
      help: {
        de: 'Werkstoff der verspannten Platten. Wird hier ein Werkstoff gewaehlt, belegt das Programm E-Modul und Grenzflaechenpressung p_G automatisch mit belegten Richtwerten (VDI 2230 Tab. A9 bzw. Standardkennwerte) und sperrt die Felder. Zum Abweichen den jeweiligen Haken "selbst eingeben" setzen. Bei Einschraubverbindungen ist das meist derselbe Werkstoff wie das Innengewinde. Optional — ohne Auswahl gibst du E-Modul und p_G frei ein.',
        en: 'Material of the clamped plates. If a material is chosen, the program pre-fills the elastic modulus and the limiting surface pressure p_G with sourced guide values (VDI 2230 table A9 or standard properties) and locks the fields. To deviate, tick the respective "enter manually" box. In tapped-thread joints this is usually the same material as the internal thread. Optional — without a selection you enter E and p_G yourself.',
        pt: 'Material das peças apertadas. Se escolher um material, o programa preenche o módulo de elasticidade e a pressão limite p_G com valores de referência (VDI 2230 tabela A9 ou propriedades padrão) e bloqueia os campos. Para desviar, marque a caixa "introduzir manualmente" respetiva. Em juntas roscadas é geralmente o mesmo material da rosca interna. Opcional — sem seleção, introduz E e p_G manualmente.'
      }
    },
    E_P: {
      label: { de: 'E-Modul verspannte Teile', en: 'Young\u2019s modulus, clamped parts', pt: 'Módulo de elasticidade, peças apertadas' },
      group: 'Geometrie', type: 'number', unit: 'N/mm^2', required: true, min: 10000, max: 250000, warnMin: 40000, warnMax: 215000, diagram: null,
      help: {
        de: 'Elastizitaetsmodul des verspannten Werkstoffs. Stahl ca. 210 000, Aluminium ca. 70 000, Grauguss ca. 110 000 N/mm^2. Bestimmt, wie stark sich die Teile zusammendruecken lassen.',
        en: 'Elastic modulus of the clamped material. Steel approx. 210,000, aluminium approx. 70,000, grey cast iron approx. 110,000 N/mm². Determines how much the parts compress.',
        pt: 'Módulo de elasticidade do material apertado. Aço aprox. 210 000, alumínio aprox. 70 000, ferro fundido cinzento aprox. 110 000 N/mm². Determina quanto as peças se comprimem.'
      }
    },
    epCustom: {
      label: { de: 'E-Modul selbst eingeben', en: 'Enter E-modulus manually', pt: 'Introduzir módulo E manualmente' },
      group: 'Geometrie', type: 'bool', diagram: null, dependsOn: 'plateMat',
      help: {
        de: 'Ohne Haken uebernimmt das E-Modul-Feld den Richtwert des gewaehlten Plattenwerkstoffs und ist gesperrt. Setze den Haken, um einen eigenen E-Modul einzugeben.',
        en: 'Without the tick, the E-modulus field takes the guide value of the selected plate material and is locked. Tick it to enter your own modulus.',
        pt: 'Sem o visto, o campo do módulo E assume o valor de referência do material selecionado e fica bloqueado. Marque para introduzir o seu próprio módulo.'
      }
    },
    lShank: {
      label: { de: 'Schaftlaenge (glatt) l_Schaft', en: 'Shank length (plain) l_shank', pt: 'Comprimento da haste (lisa) l_haste' },
      group: 'Geometrie', type: 'number', unit: 'mm', required: true, min: 0, max: 2000, advanced: true, diagram: 'schaft',
      help: {
        de: 'Laenge des glatten (ungeschnittenen) Schraubenschafts innerhalb der Klemmlaenge. Bei voll gewindeten Schrauben 0. Schaft + freies Gewinde ergeben zusammen ungefaehr die Klemmlaenge.',
        en: 'Length of the plain (unthreaded) bolt shank within the clamp length. 0 for fully threaded bolts. Shank plus free thread together roughly equal the clamp length.',
        pt: 'Comprimento da haste lisa (sem rosca) dentro do comprimento de aperto. 0 para parafusos totalmente roscados. Haste mais rosca livre somam aproximadamente o comprimento de aperto.'
      }
    },
    lThreadFree: {
      label: { de: 'freies Gewinde l_Gew', en: 'Free thread l_thread', pt: 'Rosca livre l_rosca' },
      group: 'Geometrie', type: 'number', unit: 'mm', required: true, min: 0, max: 2000, advanced: true, diagram: 'schaft',
      help: {
        de: 'Laenge des freiliegenden Gewindes innerhalb der Klemmlaenge (nicht eingeschraubt, nicht im Schaft). Traegt im duenneren Kernquerschnitt zur Nachgiebigkeit bei.',
        en: 'Length of the exposed thread within the clamp length (not engaged, not in the shank). Contributes to compliance via the thinner core cross-section.',
        pt: 'Comprimento da rosca exposta dentro do comprimento de aperto (não engatada, não na haste). Contribui para a flexibilidade através da secção do núcleo, mais fina.'
      }
    },
    l_SK: {
      label: { de: 'Ersatzlaenge Kopf l_SK', en: 'Equiv. length head l_SK', pt: 'Comprimento equiv. cabeça l_SK' },
      group: 'Geometrie', type: 'number', unit: 'mm', min: 0, max: 200, advanced: true, diagram: 'kopf',
      help: {
        de: 'Ersatzlaenge fuer die Nachgiebigkeit des Schraubenkopfes. Richtwert 0,5 * d bei Sechskant, 0,4 * d bei Innensechskant. Wird automatisch gesetzt, wenn leer.',
        en: 'Substitute length for the compliance of the bolt head. Guide value 0.5 × d for hex, 0.4 × d for socket head. Set automatically if left empty.',
        pt: 'Comprimento substituto para a flexibilidade da cabeça. Valor de referência 0,5 × d para sextavado, 0,4 × d para sextavado interior. Definido automaticamente se vazio.'
      }
    },
    l_G: {
      label: { de: 'Ersatzlaenge eingeschr. Gewinde l_G', en: 'Equiv. length engaged thread l_G', pt: 'Comprimento equiv. rosca engatada l_G' },
      group: 'Geometrie', type: 'number', unit: 'mm', min: 0, max: 200, advanced: true, diagram: null,
      help: {
        de: 'Ersatzlaenge fuer das tragende eingeschraubte Gewinde. Richtwert 0,5 * d. Wird automatisch gesetzt, wenn leer.',
        en: 'Substitute length for the load-bearing engaged thread. Guide value 0.5 × d. Set automatically if left empty.',
        pt: 'Comprimento substituto para a rosca engatada que suporta carga. Valor de referência 0,5 × d. Definido automaticamente se vazio.'
      }
    },
    l_M: {
      label: { de: 'Ersatzlaenge Mutter/Einschraubteil l_M', en: 'Equiv. length nut/tapped part l_M', pt: 'Comprimento equiv. porca/peça roscada l_M' },
      group: 'Geometrie', type: 'number', unit: 'mm', min: 0, max: 200, advanced: true, diagram: null,
      help: {
        de: 'Ersatzlaenge fuer Mutter (DSV, Richtwert 0,4 * d) bzw. Einschraubteil (ESV, Richtwert 0,33 * d). Wird automatisch gesetzt, wenn leer.',
        en: 'Substitute length for the nut (DSV, guide 0.4 × d) or the tapped part (ESV, guide 0.33 × d). Set automatically if left empty.',
        pt: 'Comprimento substituto para a porca (DSV, ref. 0,4 × d) ou para a peça roscada (ESV, ref. 0,33 × d). Definido automaticamente se vazio.'
      }
    },

    /* --- Belastung --- */
    F_Kerf: {
      label: { de: 'erforderliche Klemmkraft F_Kerf', en: 'Required clamp force F_Kerf', pt: 'Força de aperto necessária F_Kerf' },
      group: 'Belastung', type: 'number', unit: 'N', required: true, min: 0, max: 1e8, diagram: 'klemmkraft',
      help: {
        de: 'Mindest-Restklemmkraft, die in der Trennfuge erhalten bleiben muss — z. B. zum Abdichten, gegen Abheben oder fuer den Reibschluss bei Querkraft. Bestimmt mit, wie hoch vorgespannt werden muss.',
        en: 'Minimum residual clamp force that must remain in the interface — e.g. for sealing, against lift-off, or for friction grip under transverse load. Co-determines how high the preload must be.',
        pt: 'Força de aperto residual mínima que deve permanecer na junta — p. ex. para vedação, contra o descolamento, ou para o atrito sob carga transversal. Co-determina o nível de pré-tensão necessário.'
      }
    },
    F_A: {
      label: { de: 'axiale Betriebskraft F_A', en: 'Axial working force F_A', pt: 'Força axial de serviço F_A' },
      group: 'Belastung', type: 'number', unit: 'N', min: 0, max: 1e8, diagram: 'axiallast',
      help: {
        de: 'In Schraubenrichtung wirkende Betriebskraft (Zug), die die Verbindung auseinanderziehen will. Bei schwellender Last hier die Oberlast oder F_Ao/F_Au angeben.',
        en: 'Operating force acting along the bolt axis (tension) that tries to pull the joint apart. For fluctuating load enter the upper value here, or use F_Ao/F_Au.',
        pt: 'Força de serviço ao longo do eixo do parafuso (tração) que tende a separar a união. Para carga variável, indique aqui o valor superior, ou use F_Ao/F_Au.'
      }
    },
    F_Ao: {
      label: { de: 'Axiallast Oberwert F_Ao', en: 'Axial load, upper F_Ao', pt: 'Carga axial superior F_Ao' },
      group: 'Belastung', type: 'number', unit: 'N', min: 0, max: 1e8, diagram: 'axiallast',
      help: {
        de: 'Groesster Wert der schwankenden Axialkraft (fuer den Dauerfestigkeitsnachweis). Bei reiner Schwellast ist F_Au = 0.',
        en: 'Largest value of the fluctuating axial force (for the fatigue check). For pure pulsating load F_Au = 0.',
        pt: 'Maior valor da força axial variável (para a verificação à fadiga). Para carga pulsante pura, F_Au = 0.'
      }
    },
    F_Au: {
      label: { de: 'Axiallast Unterwert F_Au', en: 'Axial load, lower F_Au', pt: 'Carga axial inferior F_Au' },
      group: 'Belastung', type: 'number', unit: 'N', max: 1e8, diagram: 'axiallast', dependsOn: 'F_Ao',
      help: {
        de: 'Kleinster Wert der schwankenden Axialkraft. 0 bei reiner Schwellast. Negative Werte (Wechsellast) sind moeglich, muessen aber kleiner als F_Ao sein.',
        en: 'Smallest value of the fluctuating axial force. 0 for pure pulsating load. Negative values (alternating load) are allowed but must be smaller than F_Ao.',
        pt: 'Menor valor da força axial variável. 0 para carga pulsante pura. Valores negativos (carga alternada) são permitidos, mas devem ser menores do que F_Ao.'
      }
    },
    F_Qmax: {
      label: { de: 'Querkraft F_Qmax', en: 'Transverse force F_Qmax', pt: 'Força transversal F_Qmax' },
      group: 'Belastung', type: 'number', unit: 'N', min: 0, max: 1e8, diagram: 'querkraft',
      help: {
        de: 'Quer zur Schraubenachse wirkende Kraft, die ueber Reibung in der Trennfuge uebertragen wird. Erfordert ausreichende Klemmkraft (Gleitnachweis).',
        en: 'Force perpendicular to the bolt axis, transmitted by friction in the interface. Requires sufficient clamp force (slip check).',
        pt: 'Força perpendicular ao eixo do parafuso, transmitida por atrito na junta. Requer força de aperto suficiente (verificação ao escorregamento).'
      }
    },
    muT: {
      label: { de: 'Reibwert Trennfuge mu_T', en: 'Interface friction μ_T', pt: 'Atrito da junta μ_T' },
      group: 'Belastung', type: 'number', unit: '-', min: 0.01, max: 0.8, warnMin: 0.05, warnMax: 0.30, decimals: 3, diagram: 'querkraft', dependsOn: 'F_Qmax',
      help: {
        de: 'Haftreibungszahl zwischen den verspannten Teilen (nur fuer Querkraft/Gleitnachweis). Trocken Stahl/Stahl ca. 0,1-0,2; geoelt weniger. Konservativ klein waehlen.',
        en: 'Static friction coefficient between the clamped parts (transverse/slip check only). Dry steel/steel approx. 0.1–0.2; oiled less. Choose conservatively small.',
        pt: 'Coeficiente de atrito estático entre as peças apertadas (apenas verificação transversal/escorregamento). Aço/aço seco aprox. 0,1–0,2; lubrificado menos. Escolha conservadora (pequeno).'
      }
    },
    qF: {
      label: { de: 'Zahl der Trennfugen q_F', en: 'Number of interfaces q_F', pt: 'Número de juntas q_F' },
      group: 'Belastung', type: 'number', unit: '-', min: 1, max: 20, warnMax: 10, decimals: 0, advanced: true, diagram: null, dependsOn: 'F_Qmax',
      help: {
        de: 'Anzahl der kraftuebertragenden Trennfugen fuer die Querkraft. Bei zwei verspannten Teilen meist 1.',
        en: 'Number of force-transmitting interfaces for the transverse force. Usually 1 for two clamped parts.',
        pt: 'Número de juntas que transmitem força para a força transversal. Normalmente 1 para duas peças apertadas.'
      }
    },
    M_Ymax: {
      label: { de: 'Drehmoment um Schraubenachse M_Ymax', en: 'Torque about bolt axis M_Ymax', pt: 'Momento em torno do eixo M_Ymax' },
      group: 'Belastung', type: 'number', unit: 'N·mm', min: 0, max: 1e9, advanced: true, diagram: 'querkraft', dependsOn: 'F_Qmax',
      help: {
        de: 'Zusaetzliches Drehmoment um die Schraubenachse, das ueber Reibung in der Trennfuge uebertragen werden muss (z. B. bei Flanschverbindungen). Erhoeht die erforderliche Klemmkraft. 0 oder leer, wenn kein Moment wirkt. Nur zusammen mit einer Querkraft F_Qmax und den Feldern q_M und r_a wirksam.',
        en: 'Additional torque about the bolt axis that must be transmitted by friction in the interface (e.g. flange joints). Increases the required clamp force. 0 or empty if no torque acts. Only effective together with a transverse force F_Qmax and the fields q_M and r_a.',
        pt: 'Momento adicional em torno do eixo do parafuso que deve ser transmitido por atrito na junta (p. ex. uniões de flange). Aumenta a força de aperto necessária. 0 ou vazio se não atuar momento. Só é eficaz com uma força transversal F_Qmax e os campos q_M e r_a.'
      }
    },
    qM: {
      label: { de: 'Zahl der Trennfugen (Moment) q_M', en: 'Number of interfaces (torque) q_M', pt: 'Número de juntas (momento) q_M' },
      group: 'Belastung', type: 'number', unit: '-', min: 1, max: 20, warnMax: 10, decimals: 0, advanced: true, diagram: null, dependsOn: 'M_Ymax',
      help: {
        de: 'Anzahl der kraftuebertragenden Trennfugen fuer das Drehmoment M_Ymax. Meist gleich q_F. Nur noetig, wenn ein Moment M_Ymax angegeben ist.',
        en: 'Number of force-transmitting interfaces for the torque M_Ymax. Usually equal to q_F. Only needed if a torque M_Ymax is given.',
        pt: 'Número de juntas que transmitem força para o momento M_Ymax. Normalmente igual a q_F. Só necessário se for indicado um momento M_Ymax.'
      }
    },
    ra: {
      label: { de: 'Wirkradius Moment r_a', en: 'Effective radius of torque r_a', pt: 'Raio efetivo do momento r_a' },
      group: 'Belastung', type: 'number', unit: 'mm', min: 0.1, max: 5000, advanced: true, diagram: null, dependsOn: 'M_Ymax',
      help: {
        de: 'Wirksamer Radius, an dem das Drehmoment M_Ymax in Umfangskraft umgesetzt wird (z. B. Lochkreisradius der Schraube). Nur noetig, wenn ein Moment M_Ymax angegeben ist. Ein groesserer Radius verringert die erforderliche Zusatz-Klemmkraft.',
        en: 'Effective radius at which the torque M_Ymax is converted into a circumferential force (e.g. the bolt-circle radius). Only needed if a torque M_Ymax is given. A larger radius reduces the required additional clamp force.',
        pt: 'Raio efetivo em que o momento M_Ymax é convertido em força circunferencial (p. ex. o raio do círculo de furos). Só necessário se for indicado um momento M_Ymax. Um raio maior reduz a força de aperto adicional necessária.'
      }
    },
    n: {
      label: { de: 'Krafteinleitungsfaktor n', en: 'Load-introduction factor n', pt: 'Fator de introdução de carga n' },
      group: 'Belastung', type: 'number', unit: '-', min: 0, max: 1, decimals: 2, diagram: 'krafteinleitung',
      help: {
        de: 'Gibt an, wie weit innerhalb der Klemmteile die Betriebskraft eingeleitet wird (0 = direkt an der Trennfuge, 1 = unter Kopf/Mutter). Unguenstig und sicher: 0,5. Genauere Werte nach VDI 2230 Bild/Tabelle.',
        en: 'Indicates how far inside the clamped parts the operating force is introduced (0 = directly at the interface, 1 = under head/nut). Unfavourable and safe: 0.5. More accurate values per VDI 2230 figure/table.',
        pt: 'Indica a que profundidade nas peças apertadas a força de serviço é introduzida (0 = diretamente na junta, 1 = sob a cabeça/porca). Desfavorável e seguro: 0,5. Valores mais exatos conforme figura/tabela da VDI 2230.'
      }
    },
    p_G: {
      label: { de: 'Grenzflaechenpressung p_G', en: 'Limit surface pressure p_G', pt: 'Pressão superficial limite p_G' },
      group: 'Belastung', type: 'number', unit: 'N/mm^2', min: 1, max: 5000, diagram: 'pressung',
      help: {
        de: 'Zulaessige Flaechenpressung des verspannten Werkstoffs unter Kopf/Mutter. Wird ueberschritten, gibt das Material nach (Setzen, Vorspannverlust). Werte je Werkstoff aus Tabelle waehlen.',
        en: 'Permissible surface pressure of the clamped material under head/nut. If exceeded, the material yields (embedding, preload loss). Choose values per material from a table.',
        pt: 'Pressão superficial admissível do material apertado sob a cabeça/porca. Se excedida, o material cede (assentamento, perda de pré-tensão). Escolha valores por material a partir de uma tabela.'
      }
    },
    pgCustom: {
      label: { de: 'p_G selbst eingeben', en: 'Enter p_G manually', pt: 'Introduzir p_G manualmente' },
      group: 'Belastung', type: 'bool', diagram: null, dependsOn: 'plateMat',
      help: {
        de: 'Ohne Haken uebernimmt das p_G-Feld die Grenzflaechenpressung des gewaehlten Plattenwerkstoffs (VDI 2230 Tab. A9) und ist gesperrt. Setze den Haken, um einen eigenen Wert einzugeben.',
        en: 'Without the tick, the p_G field takes the limiting surface pressure of the selected plate material (VDI 2230 table A9) and is locked. Tick it to enter your own value.',
        pt: 'Sem o visto, o campo p_G assume a pressão limite do material selecionado (VDI 2230 tabela A9) e fica bloqueado. Marque para introduzir o seu próprio valor.'
      }
    },
    deltaFvth: {
      label: { de: 'thermischer Vorspannverlust dF_Vth', en: 'Thermal preload change ΔF_Vth', pt: 'Variação térmica da pré-tensão ΔF_Vth' },
      group: 'Belastung', type: 'number', unit: 'N', max: 1e8, advanced: true, diagram: null,
      help: {
        de: 'Vorspannkraftaenderung durch Temperatur (unterschiedliche Waermedehnung von Schraube und Teilen). 0, wenn ohne Temperatureinfluss gerechnet wird.',
        en: 'Change in preload due to temperature (different thermal expansion of bolt and parts). 0 if calculating without temperature influence.',
        pt: 'Variação da pré-tensão devido à temperatura (dilatação térmica diferente do parafuso e das peças). 0 se calcular sem influência da temperatura.'
      }
    },
    kTau: {
      label: { de: 'Torsions-Restfaktor k_tau', en: 'Residual torsion factor k_τ', pt: 'Fator de torção residual k_τ' },
      group: 'Belastung', type: 'number', unit: '-', min: 0, max: 1, decimals: 2, advanced: true, diagram: null,
      help: {
        de: 'Anteil der Torsionsspannung, der im Betrieb noch wirkt (beim Anziehen 1, baut sich teilweise ab). Ueblich 0,5 fuer den Betriebsnachweis.',
        en: 'Fraction of the torsional stress still acting in operation (1 during tightening, partly relaxes). Usually 0.5 for the operating check.',
        pt: 'Fração da tensão de torção ainda atuante em serviço (1 durante o aperto, relaxa parcialmente). Normalmente 0,5 para a verificação em serviço.'
      }
    },

    /* --- Setzen / Trennflaechen --- */
    rz: {
      label: { de: 'Rautiefe Rz (Trennflaechen)', en: 'Roughness Rz (interfaces)', pt: 'Rugosidade Rz (juntas)' },
      group: 'Setzen', type: 'enum', enumOf: 'rz', required: true, diagram: 'rauheit',
      help: {
        de: 'Rauheit der aufeinanderliegenden Flaechen (Gewinde, Kopf-/Mutterauflage, Trennfugen). Rauere Flaechen setzen sich staerker und verlieren mehr Vorspannung. Im Zweifel mittlere Stufe (Rz10-40).',
        en: 'Roughness of the mating surfaces (thread, head/nut bearing, interfaces). Rougher surfaces embed more and lose more preload. When in doubt, the medium step (Rz10-40).',
        pt: 'Rugosidade das superfícies de contacto (rosca, apoio da cabeça/porca, juntas). Superfícies mais rugosas assentam mais e perdem mais pré-tensão. Em caso de dúvida, o nível médio (Rz10-40).'
      }
    },
    loadMode: {
      label: { de: 'Lastart fuer Setzen', en: 'Load type for embedding', pt: 'Tipo de carga para assentamento' },
      group: 'Setzen', type: 'enum', enumOf: 'loadMode', diagram: null,
      help: {
        de: 'Axial = vorwiegend Zug/Druck laengs der Schraube; Schub = vorwiegend Querbelastung. Beeinflusst die angesetzten Setzbetraege.',
        en: 'Axial = mainly tension/compression along the bolt; shear = mainly transverse load. Affects the assumed embedding amounts.',
        pt: 'Axial = principalmente tração/compressão ao longo do parafuso; corte = principalmente carga transversal. Afeta os valores de assentamento assumidos.'
      }
    },
    seats: {
      label: { de: 'Zahl der Auflagen (Kopf/Mutter)', en: 'Number of seats (head/nut)', pt: 'Número de apoios (cabeça/porca)' },
      group: 'Setzen', type: 'number', unit: '-', required: true, min: 1, max: 10, decimals: 0, diagram: null,
      help: {
        de: 'Anzahl der Kopf- und Mutternauflageflaechen, die sich setzen koennen. Bei einer normalen Verschraubung meist 2 (Kopf und Mutter) bzw. 1 bei Einschraubverbindung.',
        en: 'Number of head and nut bearing surfaces that can embed. Usually 2 for a normal bolted joint (head and nut), or 1 for a tapped-thread joint.',
        pt: 'Número de superfícies de apoio da cabeça e da porca que podem assentar. Normalmente 2 numa união normal (cabeça e porca), ou 1 numa união roscada.'
      }
    },
    interfaces: {
      label: { de: 'Zahl der inneren Trennfugen', en: 'Number of inner interfaces', pt: 'Número de juntas internas' },
      group: 'Setzen', type: 'number', unit: '-', required: true, min: 0, max: 20, decimals: 0, diagram: null,
      help: {
        de: 'Anzahl der Beruehrungsflaechen zwischen den verspannten Teilen (ohne Kopf/Mutter). Bei zwei Teilen 1.',
        en: 'Number of contact surfaces between the clamped parts (excluding head/nut). 1 for two parts.',
        pt: 'Número de superfícies de contacto entre as peças apertadas (excluindo cabeça/porca). 1 para duas peças.'
      }
    },

    /* --- Nachweise / Optionen --- */
    threadFinish: {
      label: { de: 'Gewindeherstellung (Dauerfestigkeit)', en: 'Thread manufacture (fatigue)', pt: 'Fabrico da rosca (fadiga)' },
      group: 'Nachweise', type: 'enum', enumOf: 'threadFinish', diagram: null,
      help: {
        de: 'SV = schlussverguetet (Gewinde vor der Waermebehandlung gerollt/geschnitten): niedrigere, vorspannungsunabhaengige Dauerhaltbarkeit sigma_A,SV. SG = schlussgewalzt (Gewinde nach der Waermebehandlung gerollt): hoehere, von der mittleren Schraubenkraft abhaengige Dauerhaltbarkeit sigma_A,SG. Im Zweifel SV (konservativ).',
        en: 'SV = rolled/cut before heat treatment: lower, preload-independent endurance limit sigma_A,SV. SG = rolled after heat treatment: higher endurance limit sigma_A,SG that depends on the mean bolt force. When in doubt, SV (conservative).',
        pt: 'SV = laminada/cortada antes do tratamento térmico: limite de fadiga mais baixo e independente da pré-tensão. SG = laminada após o tratamento térmico: limite de fadiga mais alto, dependente da força média do parafuso. Em caso de dúvida, SV (conservador).'
      }
    },
    surfaceFinish: {
      label: { de: 'Oberfläche/Ausführung (Dauerfestigkeit)', en: 'Surface/type (fatigue)', pt: 'Superfície/tipo (fadiga)' },
      group: 'Nachweise', type: 'enum', enumOf: 'surfaceFinish', diagram: null, dependsOn: 'threadFinish',
      help: {
        de: 'Wie ist die Schraube ausgeführt? Das beeinflusst NUR die Dauerhaltbarkeit bei schwingender Last. "blank" = normale Maschinenbauschraube (keine Abminderung). "feuerverzinkt" = durch die Zinkschicht und Kerbwirkung rund 30 % geringere Dauerfestigkeit. "HV-Garnitur" = hochfeste Stahlbau-Garnitur, rund 20 % geringer. Im Zweifel "blank". (Quelle: VDI 2230 Bl.1.)',
        en: 'How is the bolt finished? This affects ONLY the fatigue strength under alternating load. "plain" = normal machine bolt (no reduction). "hot-dip galvanized" = about 30% lower fatigue strength due to the zinc layer and notch effect. "HV set" = high-strength structural set, about 20% lower. When in doubt, "plain". (Source: VDI 2230 sheet 1.)',
        pt: 'Como é o acabamento do parafuso? Afeta APENAS a resistência à fadiga sob carga alternada. "liso" = parafuso de máquina normal (sem redução). "galvanizado a quente" = cerca de 30% menos resistência à fadiga devido à camada de zinco e ao efeito de entalhe. "conjunto HV" = conjunto estrutural de alta resistência, cerca de 20% menos. Em caso de dúvida, "liso". (Fonte: VDI 2230 folha 1.)'
      }
    },
    r11: {
      label: { de: 'Mindesteinschraubtiefe R11 pruefen', en: 'Check minimum engagement (R11)', pt: 'Verificar profundidade mínima (R11)' },
      group: 'Nachweise', type: 'bool', diagram: null,
      help: {
        de: 'Vollstaendiger R11-Nachweis nach VDI 2230 Bl.1: prueft ueber die Gewinde-Scherquerschnitte, dass eher die Schraube bricht als das Innengewinde ausreisst. Aktivieren und Werkstoffgruppe, R_m des Innengewindes sowie die vorhandene Einschraubtiefe m_vorh angeben. Ohne Aktivierung erscheint nur ein Richtwert-Hinweis.',
        en: 'Full R11 verification per VDI 2230 sheet 1: via the thread shear areas it checks that the bolt fails before the internal thread strips. Enable it and provide the material group, the internal thread R_m and the available length of engagement m_vorh. Without it only a rule-of-thumb note is shown.',
        pt: 'Verificação R11 completa segundo a VDI 2230 folha 1: através das áreas de corte da rosca confirma que o parafuso rompe antes de a rosca interna se arrancar. Ative e indique o grupo de material, o R_m da rosca interna e a profundidade de aperto disponível m_vorh. Sem ativação surge apenas uma nota indicativa.'
      }
    },
    matGroupM: {
      label: { de: 'Werkstoffgruppe Innengewinde', en: 'Material group of internal thread', pt: 'Grupo de material da rosca interna' },
      group: 'Nachweise', type: 'enum', enumOf: 'matGroupM', diagram: null, dependsOn: 'r11',
      help: {
        de: 'Werkstoff des Bauteils, in das die Schraube greift (bzw. der Mutter). Entscheidend ist, wie fest der Werkstoff gegen Abscheren ist: das Verhaeltnis von Scherfestigkeit zu Zugfestigkeit (tau_B/R_m). Ein weicher Werkstoff (Guss, Aluminium) laesst das Innengewinde eher ausreissen als die Schraube bricht — dann braucht es mehr Einschraubtiefe. Die hinterlegten Verhaeltnisse stammen aus VDI 2230 Blatt 1:2015 (Stahl 0,65 · Baustahl 0,80 · Einsatzstahl/16MnCr5 0,85 · Sphaeroguss GJS 0,90 · Grauguss GJL 1,15 · Alu-Knet 0,60 · Alu-Guss 0,52). Aluminium ist bewusst in Knet- und Gusslegierung getrennt, weil sich beide deutlich unterscheiden. Magnesium steht nicht in der VDI-Tabelle und ist als konservativer Schaetzwert gekennzeichnet. Nur fuer den R11-Nachweis noetig.',
        en: 'Material of the part the bolt engages (or of the nut). What matters is its resistance to shearing: the ratio of shear to tensile strength (tau_B/R_m). A soft material (cast iron, aluminium) lets the internal thread strip before the bolt breaks — then more engagement is needed. The stored ratios are from VDI 2230 sheet 1:2015 (steel 0.65 · structural steel 0.80 · case-hardening/16MnCr5 0.85 · nodular iron GJS 0.90 · grey iron GJL 1.15 · wrought Al 0.60 · cast Al 0.52). Aluminium is deliberately split into wrought and cast alloy because they differ markedly. Magnesium is not in the VDI table and is flagged as a conservative estimate. Needed only for the R11 verification.',
        pt: 'Material da peça em que o parafuso engata (ou da porca). O que importa é a sua resistência ao corte: a relação entre resistência ao corte e à tração (tau_B/R_m). Um material macio (ferro fundido, alumínio) faz a rosca interna arrancar antes de o parafuso romper — então é preciso mais profundidade de aperto. As relações guardadas provêm da VDI 2230 folha 1:2015 (aço 0,65 · aço estrutural 0,80 · aço de cementação/16MnCr5 0,85 · ferro nodular GJS 0,90 · ferro cinzento GJL 1,15 · Al forjado 0,60 · Al fundido 0,52). O alumínio está separado em liga forjada e fundida por diferirem bastante. O magnésio não consta da tabela VDI e está assinalado como estimativa conservadora. Necessário apenas para a verificação R11.'
      }
    },
    rmCustom: {
      label: { de: 'R_m selbst eingeben (statt Richtwert)', en: 'Enter R_m manually (instead of guide value)', pt: 'Introduzir R_m manualmente (em vez do valor indicativo)' },
      group: 'Nachweise', type: 'bool', diagram: null, dependsOn: 'r11',
      help: {
        de: 'Ohne Haken wird R_m automatisch als konservativer Richtwert der gewaehlten Werkstoffgruppe vorbelegt und gesperrt. Setze den Haken, um den tatsaechlichen R_m deines Werkstoffs (Datenblatt) selbst einzugeben.',
        en: 'Without the tick, R_m is pre-filled with a conservative guide value for the selected material group and locked. Tick it to enter the actual R_m of your material (datasheet).',
        pt: 'Sem o visto, R_m e preenchido com um valor indicativo conservador do grupo de material selecionado e bloqueado. Marque para introduzir o R_m real do seu material (folha de dados).'
      }
    },
    Rm_M: {
      label: { de: 'R_m Innengewinde-Werkstoff', en: 'R_m of internal-thread material', pt: 'R_m do material da rosca interna' },
      group: 'Nachweise', type: 'number', unit: 'N/mm^2', min: 30, max: 2000, warnMin: 90, warnMax: 1400, decimals: 0, diagram: null, dependsOn: 'r11',
      help: {
        de: 'Zugfestigkeit R_m des Innengewinde-/Mutterwerkstoffs. Richtwerte: Grauguss GJL ~150..350, Sphaeroguss GJS ~400..700, Aluminium-Legierungen ~150..400, Stahl je nach Sorte. Nur fuer den R11-Nachweis.',
        en: 'Tensile strength R_m of the internal-thread/nut material. Typical: grey iron GJL ~150..350, nodular iron GJS ~400..700, aluminium alloys ~150..400, steel depending on grade. Only for the R11 verification.',
        pt: 'Resistência à tração R_m do material da rosca interna/porca. Valores típicos: ferro cinzento GJL ~150..350, ferro nodular GJS ~400..700, ligas de alumínio ~150..400, aço conforme a classe. Apenas para a verificação R11.'
      }
    },
    m_vorh: {
      label: { de: 'Vorhandene Einschraubtiefe m_vorh', en: 'Available length of engagement m_vorh', pt: 'Profundidade de aperto disponível m_vorh' },
      group: 'Nachweise', type: 'number', unit: 'mm', min: 0.1, max: 500, decimals: 1, diagram: null, dependsOn: 'r11',
      help: {
        de: 'Konstruktiv vorhandene Gesamt-Einschraubtiefe (Nennlaenge des Gewindeeingriffs). Der Nachweis zieht davon den nicht voll tragenden Anteil m_zu ab (~2*P bei Durchsteck/Mutter, ~3*P bei Sackloch) und vergleicht die tragende Tiefe m_eff,vorh mit der erforderlichen m_min.',
        en: 'Total length of engagement provided by the design (nominal thread overlap). The check subtracts the not-fully-loaded portion m_zu (~2*P for through-bolt/nut, ~3*P for a blind hole) and compares the effective depth m_eff,avail with the required m_min.',
        pt: 'Profundidade total de aperto prevista no projeto (sobreposição nominal da rosca). A verificação subtrai a parte não totalmente carregada m_zu (~2*P para passante/porca, ~3*P para furo cego) e compara a profundidade efetiva m_eff,disp com a exigida m_min.'
      }
    }
  };

  function fieldHelp(name, lang) { var f = FIELDS[name]; if (!f) return ''; lang = lang || 'de'; return (f.help && (f.help[lang] || f.help.de)) || ''; }

  /* ----------------------------------------------------------- Pruefung ---- */
  function validateInput(inp) {
    inp = inp || {};
    var errors = [], warnings = [];
    function err(field, code, text, range) { errors.push({ field: field, severity: 'error', code: code, text: text, range: range || null }); }
    function warn(field, code, text, range) { warnings.push({ field: field, severity: 'warning', code: code, text: text, range: range || null }); }
    function present(v) { return v !== undefined && v !== null && v !== ''; }

    /* 1) Generische Feldpruefung nach Schema */
    for (var key in FIELDS) {
      if (!FIELDS.hasOwnProperty(key)) continue;
      var f = FIELDS[key], v = inp[key];
      var lab = (f.label && f.label.de) || key;
      if (!present(v)) {
        if (f.required) err(key, 'REQUIRED', lab + ' fehlt (Pflichtfeld).');
        continue;
      }
      if (f.type === 'enum') {
        var opts = enumValues(f.enumOf);
        if (opts.indexOf(v) < 0) err(key, 'ENUM_INVALID', lab + ': "' + v + '" ist nicht zulaessig. Erlaubt: ' + opts.join(', ') + '.', opts);
        continue;
      }
      if (f.type === 'bool') {
        if (v !== true && v !== false) err(key, 'BOOL_INVALID', lab + ' muss true oder false sein (eingegeben: "' + v + '").');
        continue;
      }
      if (!num(v)) { err(key, 'NOT_A_NUMBER', lab + ' muss eine Zahl sein (eingegeben: "' + v + '").'); continue; }
      var u = f.unit ? (' ' + f.unit) : '';
      var inHard = true;
      if (f.min != null && v < f.min) { err(key, 'BELOW_MIN', lab + ' = ' + v + u + ' ist zu klein. Zulaessig: >= ' + f.min + '.', [f.min, (f.max != null ? f.max : null)]); inHard = false; }
      if (f.max != null && v > f.max) { err(key, 'ABOVE_MAX', lab + ' = ' + v + u + ' ist zu gross. Zulaessig: <= ' + f.max + '.', [(f.min != null ? f.min : null), f.max]); inHard = false; }
      if (inHard) {
        if (f.warnMin != null && v < f.warnMin) warn(key, 'BELOW_TYPICAL', lab + ' = ' + v + u + ' liegt unter dem ueblichen Bereich (' + f.warnMin + (f.warnMax != null ? '..' + f.warnMax : '') + '). Bitte pruefen.', [f.warnMin, (f.warnMax != null ? f.warnMax : null)]);
        else if (f.warnMax != null && v > f.warnMax) warn(key, 'ABOVE_TYPICAL', lab + ' = ' + v + u + ' liegt ueber dem ueblichen Bereich (' + (f.warnMin != null ? f.warnMin + '..' : '') + f.warnMax + '). Bitte pruefen.', [(f.warnMin != null ? f.warnMin : null), f.warnMax]);
      }
    }

    /* 2) Entweder-oder: Reibung und Anziehfaktor */
    if (!present(inp.frictionClass) && !num(inp.muG)) err('frictionClass', 'FRICTION_MISSING', 'Reibung fehlt: entweder eine Reibungsklasse waehlen oder den Gewindereibwert mu_G angeben.');
    if (!present(inp.tightening) && !num(inp.alphaA)) err('tightening', 'TIGHTENING_MISSING', 'Anziehverfahren fehlt: entweder ein Verfahren waehlen oder den Anziehfaktor alpha_A angeben.');

    /* 3) Geometrie-Querbeziehungen (harte Fehler) */
    if (num(inp.d_w) && num(inp.d_h) && inp.d_h >= inp.d_w) err('d_h', 'D_H_GE_D_W', 'Bohrung d_h = ' + inp.d_h + ' mm ist groesser/gleich der Kopfauflage d_w = ' + inp.d_w + ' mm. d_h muss kleiner als d_w sein (ueblich d_h ~ 1,05..1,15 * d).');
    if (num(inp.D_A) && num(inp.d_h) && inp.D_A <= inp.d_h) err('D_A', 'DA_LE_D_H', 'Aussendurchmesser D_A = ' + inp.D_A + ' mm ist kleiner/gleich der Bohrung d_h = ' + inp.d_h + ' mm. D_A muss groesser als d_h sein.');
    if (num(inp.d) && num(inp.P)) {
      var d3 = inp.d - DATA.THREAD_CONST.c_d3 * inp.P;
      if (d3 <= 0) err('P', 'PITCH_TOO_LARGE', 'Steigung P = ' + inp.P + ' mm ist zu gross fuer d = ' + inp.d + ' mm (Kerndurchmesser waere <= 0).');
    }
    if (num(inp.F_Ao) && num(inp.F_Au) && inp.F_Ao < inp.F_Au) err('F_Au', 'FAO_LT_FAU', 'Oberlast F_Ao = ' + inp.F_Ao + ' N ist kleiner als die Unterlast F_Au = ' + inp.F_Au + ' N. F_Ao muss >= F_Au sein.');

    /* size-bezogene Plausibilitaet (Warnungen) */
    var dNom = (inp.size && DATA.THREADS[inp.size]) ? DATA.THREADS[inp.size].d : (num(inp.d) ? inp.d : null);
    if (dNom) {
      if (num(inp.d_h) && inp.d_h < dNom) warn('d_h', 'D_H_LT_D', 'Bohrung d_h = ' + inp.d_h + ' mm ist kleiner als der Gewindedurchmesser d = ' + dNom + ' mm. Ueblich ist ein Durchgangsloch d_h ~ 1,05..1,15 * d.');
      if (num(inp.d_w)) { var rw = inp.d_w / dNom; if (rw < 1.3 || rw > 2.1) warn('d_w', 'D_W_RATIO', 'Verhaeltnis Kopfauflage/Gewinde d_w/d = ' + rw.toFixed(2) + ' ist untypisch (ueblich ~1,4..1,8). Bitte d_w pruefen.', [1.3, 2.1]); }
    }

    /* 4) Geltungsbereich der empirischen Kegelwinkelformel (Warnungen) */
    if (num(inp.l_K) && num(inp.d_w) && inp.d_w > 0) {
      var betaL = inp.l_K / inp.d_w;
      if (betaL > 8 || betaL < 0.3) warn('l_K', 'CONE_BETAL_RANGE', 'Verhaeltnis l_K/d_w = ' + betaL.toFixed(2) + ' liegt ausserhalb des abgesicherten Bereichs der empirischen Kegelwinkelformel (Richtwert ~0,3..8). Das Ergebnis fuer delta_P ist dort eine Extrapolation.', [0.3, 8]);
    }
    if (num(inp.D_A) && num(inp.d_w) && inp.d_w > 0 && inp.D_A > inp.d_w) {
      var y = inp.D_A / inp.d_w;
      if (y > 8) warn('D_A', 'CONE_Y_RANGE', 'Verhaeltnis D_A/d_w = ' + y.toFixed(2) + ' ist sehr gross; die empirische Kegelwinkelformel ist dort nicht mehr abgesichert (Richtwert <= ~8). delta_P wird extrapoliert.', [1, 8]);
    }

    /* 5) Festigkeitsklasse ausserhalb VDI-Hauptgeltungsbereich (Warnung, blockiert nicht).
     *    Rostfreie/austenitische Klassen (A2/A4) sind bewusst unterstuetzt -> eigene, klar
     *    als zulaessig formulierte Meldung. Niedrige Stahlklassen -> generischer Scope-Hinweis. */
    if (present(inp.strengthClass) && enumValues('strengthClass').indexOf(inp.strengthClass) >= 0 &&
        ['8.8', '9.8', '10.9', '12.9'].indexOf(inp.strengthClass) < 0) {
      var scls = DATA.STRENGTH[inp.strengthClass];
      if (scls && scls.stainless) {
        warn('strengthClass', 'STRENGTH_STAINLESS', 'Rostfreie/austenitische Schraube ' + inp.strengthClass + ' (ISO 3506) — zulaessig und wird vollstaendig gerechnet. Hinweis: VDI 2230 ist primaer fuer hochfesten Stahl (8.8..12.9) formuliert; der Dauerfestigkeitswert sigma_A gilt hier nur als Naeherung, und rostfreie Schrauben neigen zum Fressen (Reibung/Vorspannung sorgfaeltig waehlen).');
      } else {
        warn('strengthClass', 'STRENGTH_SCOPE', 'Festigkeitsklasse ' + inp.strengthClass + ' liegt ausserhalb des Hauptgeltungsbereichs der VDI 2230 (8.8 bis 12.9). Die Nachweise sind fuer hochfeste Schrauben formuliert.');
      }
    }

    /* 6) R11 aktiviert -> Zusatzfelder anmahnen (Warnung, blockiert nicht;
     *    die Engine faellt ohne vollstaendige Angaben auf den Hinweistext zurueck). */
    if (inp.r11 === true) {
      var miss = [];
      if (!present(inp.matGroupM)) miss.push('Werkstoffgruppe des Innengewindes');
      if (!num(inp.Rm_M)) miss.push('R_m des Innengewinde-Werkstoffs');
      if (!num(inp.m_vorh)) miss.push('vorhandene Einschraubtiefe m_vorh');
      if (miss.length) warn('r11', 'R11_INCOMPLETE', 'Fuer den vollstaendigen R11-Nachweis fehlt noch: ' + miss.join(', ') + '. Solange nur der Richtwert-Hinweis erscheint.');
    }

    /* 7) Drehmoment um die Schraubenachse (R12): braucht q_M und r_a, sonst rechnet der Solver nicht. */
    if (num(inp.M_Ymax) && inp.M_Ymax > 0) {
      if (!num(inp.qM) || inp.qM < 1) err('qM', 'MY_NEEDS_QM', 'Bei einem Drehmoment M_Ymax muss die Zahl der Trennfugen q_M (>= 1) angegeben werden.');
      if (!num(inp.ra) || inp.ra <= 0) err('ra', 'MY_NEEDS_RA', 'Bei einem Drehmoment M_Ymax muss der Wirkradius r_a (> 0) angegeben werden.');
      if (!num(inp.F_Qmax) || inp.F_Qmax <= 0) warn('M_Ymax', 'MY_WITHOUT_FQ', 'Ein Drehmoment M_Ymax wirkt im Gleitnachweis nur zusammen mit einer Querkraft F_Qmax. Ohne F_Qmax bleibt es unberuecksichtigt.');
    }

    return { ok: errors.length === 0, errors: errors, warnings: warnings };
  }

  return {
    FIELDS: FIELDS,
    enumValues: enumValues,
    fieldOptions: fieldOptions,
    fieldHelp: fieldHelp,
    validateInput: validateInput
  };
});
