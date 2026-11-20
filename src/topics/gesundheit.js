'use strict';

/**
 * Themenbereich „Gesundheit & GKV“: alle Meldungen mit Bezug zur Gesundheitsbranche,
 * Fokus auf die gesetzliche Krankenversicherung (GKV).
 *
 * Regeln: W(Muster, Gewicht, Themenfeld, { focus }) – Muster passt am Wortanfang,
 * Groß-/Kleinschreibung egal. Treffer im Titel zählen doppelt.
 */

const W = (pattern, weight, field, opts = {}) => ({ pattern, weight, field, ...opts });

const FIELDS = {
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
  W('gkv', 4, 'gkv', { focus: true }),
  W('gesetzliche[nr]? krankenversicherung', 5, 'gkv', { focus: true }),
  W('gesetzlich versichert', 4, 'gkv', { focus: true }),
  W('krankenkasse', 4, 'gkv', { focus: true }),
  W('krankenversicherung', 3, 'gkv', { focus: true }),
  W('kassenpatient', 3, 'gkv', { focus: true }),
  W('kassenbeitr', 4, 'finanzen', { focus: true }),
  W('zusatzbeitr', 5, 'finanzen', { focus: true }),
  W('beitragssatz', 3, 'finanzen', { focus: true }),
  W('beitragsbemessungsgrenze', 4, 'finanzen', { focus: true }),
  W('beitragserhöhung', 2, 'finanzen', { focus: true }),
  W('versicherungspflichtgrenze', 4, 'finanzen', { focus: true }),
  W('gesundheitsfonds', 5, 'finanzen', { focus: true }),
  W('schätzerkreis', 5, 'finanzen', { focus: true }),
  W('risikostrukturausgleich', 5, 'finanzen', { focus: true }),
  W('morbi-rsa', 5, 'finanzen', { focus: true }),
  W('sozialabgaben', 2, 'finanzen', { focus: true }),
  W('sozialbeitr', 2, 'finanzen', { focus: true }),
  W('bundeszuschuss', 2, 'finanzen', { focus: true }),
  W('gkv-spitzenverband', 5, 'gkv', { focus: true }),
  W('spitzenverband der krankenkassen', 5, 'gkv', { focus: true }),
  W('aok(?![\\p{L}])', 4, 'gkv', { focus: true }),
  W('techniker krankenkasse', 5, 'gkv', { focus: true }),
  W('barmer', 4, 'gkv', { focus: true }),
  W('dak(-gesundheit)?(?![\\p{L}])', 4, 'gkv', { focus: true }),
  W('ikk(?![\\p{L}])', 3, 'gkv', { focus: true }),
  W('bkk(?![\\p{L}])', 3, 'gkv', { focus: true }),
  W('kkh(?![\\p{L}])', 3, 'gkv', { focus: true }),
  W('hkk(?![\\p{L}])', 3, 'gkv', { focus: true }),
  W('vdek', 4, 'gkv', { focus: true }),
  W('ersatzkasse', 4, 'gkv', { focus: true }),
  W('bundesamt für soziale sicherung', 4, 'gkv', { focus: true }),
  W('medizinische[nr]? dienst', 3, 'gkv', { focus: true }),
  W('leistungskatalog', 3, 'gkv', { focus: true }),
  W('gemeinsame[nr]? bundesausschuss', 4, 'gkv', { focus: true }),
  W('g-ba(?![\\p{L}])', 4, 'gkv', { focus: true }),
  W('kassenärztlich', 4, 'praxis', { focus: true }),
  W('kbv(?![\\p{L}])', 3, 'praxis', { focus: true }),
  W('kassenzahnärzt', 4, 'praxis', { focus: true }),
  W('privatversichert', 2, 'gkv'),
  W('private[nr]? krankenversicherung', 2, 'gkv'),
  W('pkv(?![\\p{L}])', 2, 'gkv'),
  W('bürgerversicherung', 4, 'gkv', { focus: true }),
  W('pflegeversicherung', 4, 'pflege', { focus: true }),
  W('pflegekasse', 4, 'pflege', { focus: true }),

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
  W('kinderkrankentag', 4, 'arbeit', { focus: true }),
  W('krankengeld', 4, 'arbeit', { focus: true }),
  W('arbeitsunfähig', 3, 'arbeit'),
];

// Häufige Fehltreffer (z. B. "Pflege" im Sinne von Denkmalpflege).
const NEGATIVE = [
  /(?<![\p{L}])(denkmalpflege|landschaftspflege|beziehungspflege|körperpflege|rasenpflege|autopflege|brauchtumspflege)/giu,
  /(?<![\p{L}])(bundesliga|champions league|transfermarkt)/giu,
  // Blaulicht-Meldungen, die nur zufällig „Krankenhaus“/„Klinik“ erwähnen
  /(?<![\p{L}])(polizei|verkehrsunfall|unfall|raser|feuerwehr|brand|festgenommen|messerangriff|schüsse)(?![\p{L}])/giu,
];

const SUMMARY_PROMPT = `Du bist Analyst:in für Gesundheitspolitik in Deutschland mit Schwerpunkt gesetzliche Krankenversicherung (GKV).
Du erhältst mehrere Pressemeldungen deutscher Medien zum selben Thema (Titel, Medium, Datum, Teaser).
Aufgabe:
1. Formuliere eine prägnante, neutrale Überschrift (max. 90 Zeichen).
2. Fasse den Kern der Meldungen sachlich in 2–4 Sätzen zusammen. Nenne konkrete Zahlen, Akteure und Termine, sofern in den Meldungen enthalten. Erfinde nichts; wenn Medien sich widersprechen, benenne das.
3. Bewerte in 1–2 Sätzen die Relevanz für die GKV (Finanzen, Versicherte, Leistungen, Krankenkassen, Selbstverwaltung). Wenn kein erkennbarer GKV-Bezug besteht, schreibe "Kein direkter GKV-Bezug.".
Antworte ausschließlich mit JSON: {"titel": "...", "zusammenfassung": "...", "fokus": "..."}`;

const BRIEFING_PROMPT = `Du bist Referent:in für Gesundheitspolitik mit Fokus GKV. Erstelle aus den folgenden Themengruppen
(nach Präsenz in der Presse sortiert) ein kurzes Lagebild auf Deutsch:
- 1 Einleitungssatz zur Gesamtlage,
- danach 3–6 Stichpunkte mit den wichtigsten Entwicklungen (GKV-Themen zuerst),
- zum Schluss 1–2 Punkte, die man im Blick behalten sollte.
Nur Fakten aus den Meldungen verwenden, nichts erfinden. Antworte als JSON:
{"einleitung": "...", "punkte": ["..."], "ausblick": ["..."]}`;

module.exports = {
  id: 'gesundheit',
  label: 'Gesundheit & GKV',
  short: 'Gesundheit',
  description: 'Meldungen mit Bezug zur Gesundheitsbranche, Schwerpunkt gesetzliche Krankenversicherung',
  categories: ['leitmedien', 'wirtschaft', 'regional', 'fach', 'institutionen'],
  focus: {
    id: 'gkv',
    badge: 'GKV',
    filterLabel: 'Nur GKV-Themen',
    kpiLabel: 'mit GKV-Bezug',
    titleLabel: 'GKV-Themen',
    noteLabel: 'GKV-Relevanz',
    minScore: 4,
  },
  thresholds: { topicFeed: 2, general: 6 },
  requireCore: false,
  fields: FIELDS,
  rules: RULES,
  negative: NEGATIVE,
  googleTerms: [
    'Krankenkasse', 'Krankenkassen', 'Krankenversicherung', 'GKV', 'Zusatzbeitrag',
    'Gesundheit', 'Krankenhaus', 'Klinik', 'Pflege', 'Arzt', 'Apotheke', 'Medikamente',
  ],
  clusterStopwords: [],
  splitCompounds: false,
  clusterSynonyms: [],
  searchPlaceholder: 'Suchen, z. B. Zusatzbeitrag, ePA, Klinik …',
  prompts: { summary: SUMMARY_PROMPT, briefing: BRIEFING_PROMPT, briefingFocusTag: 'GKV' },
  outlookLabel: 'Im Blick behalten',
};
