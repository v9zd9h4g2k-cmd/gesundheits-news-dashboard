'use strict';

/**
 * Relevanzbewertung: Hat ein Artikel Bezug zur Gesundheitsbranche,
 * speziell zur gesetzlichen Krankenversicherung (GKV)?
 *
 * Jede Regel: Wortanfang-Muster (Groß-/Kleinschreibung egal), Gewicht, Themenfeld.
 * Treffer im Titel zählen doppelt.
 */

const W = (pattern, weight, topic, opts = {}) => ({ pattern, weight, topic, ...opts });

const TOPICS = {
  gkv: 'GKV & Kassen',
  finanzen: 'Finanzen & Beiträge',
  politik: 'Gesundheitspolitik',
  klinik: 'Krankenhaus',
  praxis: 'Ärzte & Praxen',
  pflege: 'Pflege',
  pharma: 'Arzneimittel & Apotheke',
  digital: 'Digitalisierung',
  medizin: 'Medizin & Forschung',
  arbeit: 'Arbeit & Krankenstand',
};

const RULES = [
  // --- GKV (Kernfokus) ---------------------------------------------------------
  W('gkv', 4, 'gkv', { gkv: true }),
  W('gesetzliche[nr]? krankenversicherung', 5, 'gkv', { gkv: true }),
  W('gesetzlich versichert', 4, 'gkv', { gkv: true }),
  W('krankenkasse', 4, 'gkv', { gkv: true }),
  W('krankenversicherung', 3, 'gkv', { gkv: true }),
  W('kassenpatient', 3, 'gkv', { gkv: true }),
  W('kassenbeitr', 4, 'finanzen', { gkv: true }),
  W('zusatzbeitr', 5, 'finanzen', { gkv: true }),
  W('beitragssatz', 3, 'finanzen', { gkv: true }),
  W('beitragsbemessungsgrenze', 4, 'finanzen', { gkv: true }),
  W('beitragserhöhung', 2, 'finanzen', { gkv: true }),
  W('versicherungspflichtgrenze', 4, 'finanzen', { gkv: true }),
  W('gesundheitsfonds', 5, 'finanzen', { gkv: true }),
  W('schätzerkreis', 5, 'finanzen', { gkv: true }),
  W('risikostrukturausgleich', 5, 'finanzen', { gkv: true }),
  W('morbi-rsa', 5, 'finanzen', { gkv: true }),
  W('sozialabgaben', 2, 'finanzen', { gkv: true }),
  W('sozialbeitr', 2, 'finanzen', { gkv: true }),
  W('bundeszuschuss', 2, 'finanzen', { gkv: true }),
  W('gkv-spitzenverband', 5, 'gkv', { gkv: true }),
  W('spitzenverband der krankenkassen', 5, 'gkv', { gkv: true }),
  W('aok(?![\\p{L}])', 4, 'gkv', { gkv: true }),
  W('techniker krankenkasse', 5, 'gkv', { gkv: true }),
  W('barmer', 4, 'gkv', { gkv: true }),
  W('dak(-gesundheit)?(?![\\p{L}])', 4, 'gkv', { gkv: true }),
  W('ikk(?![\\p{L}])', 3, 'gkv', { gkv: true }),
  W('bkk(?![\\p{L}])', 3, 'gkv', { gkv: true }),
  W('kkh(?![\\p{L}])', 3, 'gkv', { gkv: true }),
  W('hkk(?![\\p{L}])', 3, 'gkv', { gkv: true }),
  W('vdek', 4, 'gkv', { gkv: true }),
  W('ersatzkasse', 4, 'gkv', { gkv: true }),
  W('bundesamt für soziale sicherung', 4, 'gkv', { gkv: true }),
  W('medizinische[nr]? dienst', 3, 'gkv', { gkv: true }),
  W('leistungskatalog', 3, 'gkv', { gkv: true }),
  W('gemeinsame[nr]? bundesausschuss', 4, 'gkv', { gkv: true }),
  W('g-ba(?![\\p{L}])', 4, 'gkv', { gkv: true }),
  W('kassenärztlich', 4, 'praxis', { gkv: true }),
  W('kbv(?![\\p{L}])', 3, 'praxis', { gkv: true }),
  W('kassenzahnärzt', 4, 'praxis', { gkv: true }),
  W('privatversichert', 2, 'gkv'),
  W('private[nr]? krankenversicherung', 2, 'gkv'),
  W('pkv(?![\\p{L}])', 2, 'gkv'),
  W('bürgerversicherung', 4, 'gkv', { gkv: true }),
  W('pflegeversicherung', 4, 'pflege', { gkv: true }),
  W('pflegekasse', 4, 'pflege', { gkv: true }),

  // --- Gesundheitspolitik --------------------------------------------------------
  W('gesundheitsminister', 4, 'politik'),
  W('gesundheitsministerium', 4, 'politik'),
  W('gesundheitspolit', 4, 'politik'),
  W('gesundheitswesen', 4, 'politik'),
  W('gesundheitssystem', 4, 'politik'),
  W('gesundheitsreform', 4, 'politik'),
  W('warken', 3, 'politik'),
  W('lauterbach', 2, 'politik'),
  W('sparpaket', 1, 'politik'),
  W('gesundheitsausschuss', 4, 'politik'),
  W('primärarzt', 4, 'praxis'),
  W('notfallreform', 4, 'politik'),
  W('rettungsdienst', 3, 'politik'),
  W('patientensteuerung', 4, 'politik'),
  W('versorgungsgesetz', 4, 'politik'),
  W('präventionsgesetz', 4, 'politik'),

  // --- Krankenhaus -----------------------------------------------------------------
  W('krankenhaus', 3, 'klinik'),
  W('krankenhäuser', 3, 'klinik'),
  W('klinik', 2, 'klinik'),
  W('uniklinik', 3, 'klinik'),
  W('krankenhausreform', 5, 'klinik'),
  W('klinikreform', 5, 'klinik'),
  W('transformationsfonds', 4, 'klinik'),
  W('fallpauschale', 4, 'klinik'),
  W('vorhaltepauschale', 4, 'klinik'),
  W('notaufnahme', 3, 'klinik'),
  W('dkg(?![\\p{L}])', 2, 'klinik'),

  // --- Ärzte & Praxen --------------------------------------------------------------
  W('ärzt', 2, 'praxis'),
  W('arzt', 2, 'praxis'),
  W('hausärzt', 3, 'praxis'),
  W('fachärzt', 3, 'praxis'),
  W('arztpraxis', 3, 'praxis'),
  W('praxen', 2, 'praxis'),
  W('facharzttermin', 4, 'praxis'),
  W('termin(service|vergabe)', 3, 'praxis'),
  W('zahnarzt', 3, 'praxis'),
  W('psychotherap', 3, 'praxis'),
  W('bundesärztekammer', 4, 'praxis'),
  W('marburger bund', 4, 'praxis'),

  // --- Pflege ----------------------------------------------------------------------
  W('pflege', 2, 'pflege'),
  W('pflegekr', 3, 'pflege'),
  W('pflegeheim', 3, 'pflege'),
  W('pflegebedürftig', 3, 'pflege'),
  W('pflegegrad', 4, 'pflege'),
  W('eigenanteil', 2, 'pflege'),

  // --- Arzneimittel & Apotheke -----------------------------------------------------
  W('apothek', 3, 'pharma'),
  W('arzneimittel', 3, 'pharma'),
  W('medikament', 3, 'pharma'),
  W('lieferengp', 3, 'pharma'),
  W('pharma', 2, 'pharma'),
  W('arzneimittelpreis', 4, 'pharma'),
  W('amnog(?![\\p{L}])', 5, 'pharma'),
  W('rezeptpflicht', 3, 'pharma'),
  W('bfarm(?![\\p{L}])', 4, 'pharma'),
  W('impfstoff', 3, 'pharma'),
  W('abda(?![\\p{L}])', 3, 'pharma'),

  // --- Digitalisierung -------------------------------------------------------------
  W('epa(?![\\p{L}])', 3, 'digital'),
  W('elektronische[nr]? patientenakte', 5, 'digital'),
  W('e-rezept', 5, 'digital'),
  W('gematik', 5, 'digital'),
  W('telematikinfrastruktur', 5, 'digital'),
  W('digitale[nr]? gesundheitsanwendung', 5, 'digital'),
  W('diga(?![\\p{L}])', 4, 'digital'),
  W('telemedizin', 4, 'digital'),
  W('gesundheitsdaten', 4, 'digital'),

  // --- Medizin & Forschung -----------------------------------------------------------
  W('patient', 2, 'medizin'),
  W('gesundheit', 2, 'medizin'),
  W('medizin', 2, 'medizin'),
  W('therapie', 2, 'medizin'),
  W('krebs', 2, 'medizin'),
  W('impf', 2, 'medizin'),
  W('infektion', 2, 'medizin'),
  W('virus', 1, 'medizin'),
  W('corona', 1, 'medizin'),
  W('grippe', 2, 'medizin'),
  W('diabetes', 2, 'medizin'),
  W('prävention', 2, 'medizin'),
  W('vorsorge', 2, 'medizin'),
  W('robert koch-institut', 3, 'medizin'),
  W('rki(?![\\p{L}])', 3, 'medizin'),
  W('stiko(?![\\p{L}])', 4, 'medizin'),
  W('organspende', 4, 'medizin'),

  // --- Arbeit & Krankenstand ---------------------------------------------------------
  W('krankenstand', 4, 'arbeit'),
  W('krankmeldung', 4, 'arbeit'),
  W('krankschreibung', 4, 'arbeit'),
  W('lohnfortzahlung', 4, 'arbeit'),
  W('karenztag', 4, 'arbeit'),
  W('kinderkrankentag', 4, 'arbeit', { gkv: true }),
  W('krankengeld', 4, 'arbeit', { gkv: true }),
  W('arbeitsunfähig', 3, 'arbeit'),
];

// Wortanfang: kein Buchstabe davor (Unicode-sicher, \b kennt keine Umlaute).
const COMPILED = RULES.map((r) => ({
  ...r,
  re: new RegExp(`(?<![\\p{L}\\p{N}])${r.pattern}`, 'giu'),
}));

// Häufige Fehltreffer (z. B. "Pflege" im Sinne von Denkmalpflege).
const NEGATIVE = [
  /(?<![\p{L}])(denkmalpflege|landschaftspflege|beziehungspflege|körperpflege|rasenpflege|autopflege|brauchtumspflege)/giu,
  /(?<![\p{L}])(bundesliga|champions league|transfermarkt)/giu,
];

function countMatches(re, text) {
  re.lastIndex = 0;
  const m = text.match(re);
  return m ? m.length : 0;
}

/**
 * Bewertet einen Artikel.
 * @returns {{score:number, gkvScore:number, topics:string[], health:boolean, gkv:boolean}}
 */
function scoreArticle({ title = '', description = '' }, { healthFeed = false } = {}) {
  const t = title.toLowerCase();
  const d = description.toLowerCase();
  let score = 0;
  let gkvScore = 0;
  const topicScore = {};

  for (const r of COMPILED) {
    const n = countMatches(r.re, t) * 2 + Math.min(countMatches(r.re, d), 3);
    if (!n) continue;
    const s = r.weight * n;
    score += s;
    if (r.gkv) gkvScore += s;
    topicScore[r.topic] = (topicScore[r.topic] || 0) + s;
  }
  for (const neg of NEGATIVE) score -= 3 * (countMatches(neg, t) + countMatches(neg, d));

  const threshold = healthFeed ? 2 : 6;
  const topics = Object.entries(topicScore)
    .sort((a, b) => b[1] - a[1])
    .filter(([, v], i) => i === 0 || v >= 4)
    .slice(0, 3)
    .map(([k]) => k);

  return {
    score,
    gkvScore,
    topics,
    health: score >= threshold,
    gkv: gkvScore >= 6,
  };
}

module.exports = { scoreArticle, TOPICS };
