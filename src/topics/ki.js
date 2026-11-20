'use strict';

/**
 * Themenbereich „Künstliche Intelligenz“.
 *
 * Fokus „Praxis“: Anwendungsfälle für KI im beruflichen Alltag und Möglichkeiten
 * für Softwareentwicklungsfirmen, ihre Effizienz zu steigern.
 *
 * Regeln: W(Muster, Gewicht, Themenfeld, { core, focus })
 *  - core:  eindeutiger KI-Begriff. Allgemeine Feeds brauchen mindestens einen
 *           Kernbegriff, damit z. B. „Mittelstand steigert Effizienz“ ohne KI-Bezug
 *           nicht im KI-Dashboard landet.
 *  - focus: zählt für den Praxis-Fokus (Arbeitsalltag / Softwareentwicklung).
 * Muster passen am Wortanfang (auch nach Bindestrich, z. B. „KI-Agent“),
 * Groß-/Kleinschreibung egal. Treffer im Titel zählen doppelt.
 */

const W = (pattern, weight, field, opts = {}) => ({ pattern, weight, field, ...opts });

const FIELDS = {
  _: null, // Basis-Begriffe, kein eigenes Themenfeld
  arbeit: 'KI im Arbeitsalltag',
  dev: 'Softwareentwicklung',
  modelle: 'Modelle & Anbieter',
  markt: 'Unternehmen & Markt',
  recht: 'Recht & Regulierung',
  sicherheit: 'Sicherheit & Risiken',
  gesellschaft: 'Arbeitsmarkt & Gesellschaft',
  forschung: 'Forschung',
};

const C = { core: true };
const F = { focus: true };

const RULES = [
  // --- Kernbegriffe KI -------------------------------------------------------------
  W('ki(?![\\p{L}])', 4, '_', C),
  W('künstliche[nr]? intelligenz', 5, '_', C),
  W('artificial intelligence', 5, '_', C),
  W('ai(?![\\p{L}])(?=[- ](act|agent|tool|modell|model|assistent|chip|startup|start-up))', 3, '_', C),
  W('generative[nr]? ki', 2, '_', C),
  W('genai', 4, '_', C),
  W('machine learning', 4, '_', C),
  W('maschinelle[ns]? lernen', 4, '_', C),
  W('deep learning', 4, '_', C),
  W('neuronale[ns]? netz', 4, '_', C),
  W('chatbot', 3, '_', C),
  W('sprachmodell', 4, 'modelle', C),
  W('llms?(?![\\p{L}])', 4, 'modelle', C),
  W('large language model', 4, 'modelle', C),
  W('prompt', 3, 'arbeit', C),
  W('agentic', 4, 'dev', C),
  W('ki-agent', 3, 'arbeit', C),

  // --- Modelle & Anbieter --------------------------------------------------------------
  W('openai', 5, 'modelle', C),
  W('chatgpt', 5, 'modelle', C),
  W('gpt(?![\\p{L}])', 4, 'modelle', C),
  W('anthropic', 5, 'modelle', C),
  W('(?<!-)claude(?![\\p{L}])', 4, 'modelle', C),
  W('gemini(?![\\p{L}])', 3, 'modelle', C),
  W('deepmind', 4, 'modelle', C),
  W('mistral(?! ?wind)', 3, 'modelle', C),
  W('deepseek', 5, 'modelle', C),
  W('aleph alpha', 5, 'modelle', C),
  W('perplexity', 4, 'modelle', C),
  W('hugging face', 4, 'modelle', C),
  W('meta ai', 4, 'modelle', C),
  W('grok(?![\\p{L}])', 3, 'modelle', C),
  W('xai(?![\\p{L}])', 3, 'modelle', C),
  W('copilot', 4, 'arbeit', C),
  W('midjourney', 4, 'modelle', C),
  W('stable diffusion', 4, 'modelle', C),
  W('reasoning', 2, 'modelle'),
  W('multimodal', 3, 'modelle'),
  W('benchmark', 2, 'modelle'),
  W('open-source-modell', 3, 'modelle'),

  // --- KI im Arbeitsalltag (Fokus) -------------------------------------------------------
  W('arbeitsalltag', 4, 'arbeit', F),
  W('berufsalltag', 4, 'arbeit', F),
  W('büroalltag', 4, 'arbeit', F),
  W('arbeitsplatz', 3, 'arbeit', F),
  W('am arbeitsplatz', 1, 'arbeit', F),
  W('produktivität', 3, 'arbeit', F),
  W('produktiver', 3, 'arbeit', F),
  W('effizien', 3, 'arbeit', F),
  W('zeitersparnis', 4, 'arbeit', F),
  W('zeit sparen', 3, 'arbeit', F),
  W('anwendungsf', 4, 'arbeit', F),
  W('use cases?(?![\\p{L}])', 4, 'arbeit', F),
  W('praxisbeispiel', 4, 'arbeit', F),
  W('praxistest', 3, 'arbeit', F),
  W('praxis', 2, 'arbeit', F),
  W('einsatz von ki', 3, 'arbeit', F),
  W('ki-einsatz', 3, 'arbeit', F),
  W('so nutzen', 4, 'arbeit', F),
  W('anleitung', 3, 'arbeit', F),
  W('leitfaden', 3, 'arbeit', F),
  W('tipps', 2, 'arbeit', F),
  W('tools?(?![\\p{L}])', 2, 'arbeit', F),
  W('assistent', 2, 'arbeit', F),
  W('agent(en)?(?![\\p{L}])', 2, 'arbeit', F),
  W('microsoft 365', 3, 'arbeit', F),
  W('workflow', 3, 'arbeit', F),
  W('automatisier', 3, 'arbeit', F),
  W('prozess', 2, 'arbeit', F),
  W('kundenservice', 3, 'arbeit', F),
  W('kundendienst', 2, 'arbeit', F),
  W('verwaltung', 2, 'arbeit', F),
  W('mittelstand', 3, 'arbeit', F),
  W('kmu(?![\\p{L}])', 3, 'arbeit', F),
  W('mitarbeit', 2, 'arbeit', F),
  W('weiterbildung', 3, 'arbeit', F),
  W('schulung', 3, 'arbeit', F),
  W('kompetenz', 2, 'arbeit', F),
  W('meeting', 2, 'arbeit', F),
  W('übersetz', 2, 'arbeit', F),
  W('deepl', 3, 'arbeit', F),
  W('wissensmanagement', 4, 'arbeit', F),
  W('dokumentation', 2, 'arbeit', F),

  // --- Softwareentwicklung (Fokus) -------------------------------------------------------
  W('softwareentwicklung', 5, 'dev', F),
  W('software-entwicklung', 5, 'dev', F),
  W('software-engineering', 4, 'dev', F),
  W('entwickler', 3, 'dev', F),
  W('developer', 3, 'dev', F),
  W('programmier', 4, 'dev', F),
  W('coding', 4, 'dev', F),
  W('vibe[- ]coding', 5, 'dev', F),
  W('code(?![\\p{L}])', 2, 'dev', F),
  W('quellcode', 3, 'dev', F),
  W('codebas', 3, 'dev', F),
  W('github', 3, 'dev', F),
  W('gitlab', 3, 'dev', F),
  W('claude code', 4, 'dev', F),
  W('codex', 4, 'dev', F),
  W('cursor(?![\\p{L}])', 2, 'dev', F),
  W('windsurf', 2, 'dev', F),
  W('jetbrains', 3, 'dev', F),
  W('visual studio', 3, 'dev', F),
  W('ide(?![\\p{L}])', 2, 'dev', F),
  W('code[- ]review', 4, 'dev', F),
  W('pull request', 4, 'dev', F),
  W('devops', 4, 'dev', F),
  W('testautomatisierung', 4, 'dev', F),
  W('softwaretest', 3, 'dev', F),
  W('unit[- ]tests?', 3, 'dev', F),
  W('refactoring', 4, 'dev', F),
  W('legacy', 2, 'dev', F),
  W('low-code', 3, 'dev', F),
  W('no-code', 3, 'dev', F),
  W('softwareh', 3, 'dev', F),
  W('softwarefirm', 3, 'dev', F),
  W('softwareunternehmen', 3, 'dev', F),
  W('it-dienstleister', 3, 'dev', F),
  W('entwicklungsteam', 4, 'dev', F),
  W('api(?![\\p{L}])', 2, 'dev', F),
  W('sdk(?![\\p{L}])', 2, 'dev', F),
  W('mcp(?![\\p{L}])', 3, 'dev', F),
  W('model context protocol', 4, 'dev', F),
  W('python', 3, 'dev', F),
  W('typescript', 3, 'dev', F),
  W('java(?![\\p{L}])', 2, 'dev', F),
  W('open source', 2, 'dev'),

  // --- Unternehmen & Markt ------------------------------------------------------------------
  W('nvidia', 2, 'markt'),
  W('microsoft', 2, 'markt'),
  W('google', 1, 'markt'),
  W('amazon', 1, 'markt'),
  W('aws(?![\\p{L}])', 2, 'markt'),
  W('sap(?![\\p{L}])', 2, 'markt'),
  W('salesforce', 2, 'markt'),
  W('start-?ups?(?![\\p{L}])', 2, 'markt'),
  W('finanzierungsrunde', 3, 'markt'),
  W('investition', 2, 'markt'),
  W('rechenzentr', 2, 'markt'),
  W('chips?(?![\\p{L}])', 2, 'markt'),
  W('cloud', 2, 'markt'),
  W('gigafactory', 3, 'markt'),

  // --- Recht & Regulierung ---------------------------------------------------------------------
  W('ai act', 5, 'recht', C),
  W('ki-verordnung', 3, 'recht'),
  W('regulierung', 3, 'recht'),
  W('datenschutz', 3, 'recht'),
  W('dsgvo', 3, 'recht'),
  W('urheberrecht', 3, 'recht'),
  W('haftung', 2, 'recht'),
  W('compliance', 3, 'recht'),
  W('digitalminist', 3, 'recht'),
  W('wildberger', 3, 'recht'),
  W('souverän', 3, 'recht'),
  W('eu-kommission', 2, 'recht'),
  W('bundesnetzagentur', 3, 'recht'),

  // --- Sicherheit & Risiken ------------------------------------------------------------------------
  W('deepfake', 4, 'sicherheit', C),
  W('desinformation', 3, 'sicherheit'),
  W('halluzin', 3, 'sicherheit'),
  W('prompt injection', 5, 'sicherheit', C),
  W('cyber', 2, 'sicherheit'),
  W('sicherheitslücke', 3, 'sicherheit'),
  W('phishing', 2, 'sicherheit'),
  W('missbrauch', 2, 'sicherheit'),
  W('bsi(?![\\p{L}])', 3, 'sicherheit'),

  // --- Arbeitsmarkt & Gesellschaft ---------------------------------------------------------------------
  W('arbeitsmarkt', 3, 'gesellschaft'),
  W('arbeitsplätze', 3, 'gesellschaft'),
  W('jobs?(?![\\p{L}])', 2, 'gesellschaft'),
  W('stellenabbau', 3, 'gesellschaft'),
  W('fachkräfte', 2, 'gesellschaft'),
  W('umfrage', 2, 'gesellschaft'),
  W('bitkom', 3, 'gesellschaft'),
  W('ethik', 3, 'gesellschaft'),
  W('schule', 2, 'gesellschaft'),
  W('bildung', 2, 'gesellschaft'),
  W('energieverbrauch', 2, 'gesellschaft'),

  // --- Forschung -------------------------------------------------------------------------------------
  W('forschung', 2, 'forschung'),
  W('forscher', 2, 'forschung'),
  W('studie', 2, 'forschung'),
  W('dfki', 4, 'forschung', C),
  W('fraunhofer', 2, 'forschung'),
  W('agi(?![\\p{L}])', 3, 'forschung', C),
  W('superintelligenz', 4, 'forschung', C),
  W('roboter', 2, 'forschung'),
  W('humanoid', 3, 'forschung'),
];

// Fehltreffer: Sport, Wetter u. Ä.
const NEGATIVE = [
  /(?<![\p{L}])(bundesliga|champions league|transfermarkt|tabellenführ|torjäger)/giu,
];

const SUMMARY_PROMPT = `Du bist Analyst:in für den praktischen Einsatz von Künstlicher Intelligenz in Unternehmen,
mit Blick auf zwei Zielgruppen: (a) Beschäftigte, die KI im beruflichen Alltag nutzen wollen, und
(b) Softwareentwicklungsfirmen, die mit KI ihre Effizienz steigern wollen.
Du erhältst mehrere Pressemeldungen deutscher Medien zum selben Thema (Titel, Medium, Datum, Teaser).
Aufgabe:
1. Formuliere eine prägnante, neutrale Überschrift (max. 90 Zeichen).
2. Fasse den Kern der Meldungen sachlich in 2–4 Sätzen zusammen. Nenne konkrete Produkte, Zahlen, Unternehmen und Termine, sofern in den Meldungen enthalten. Erfinde nichts; wenn Medien sich widersprechen, benenne das.
3. Beschreibe in 1–2 Sätzen den Praxisnutzen: Welche konkreten Anwendungsfälle im Berufsalltag oder welche Effizienzpotenziale für die Softwareentwicklung ergeben sich daraus? Wenn kein erkennbarer Praxisbezug besteht, schreibe "Kein direkter Praxisbezug.".
Antworte ausschließlich mit JSON: {"titel": "...", "zusammenfassung": "...", "fokus": "..."}`;

const BRIEFING_PROMPT = `Du bist Referent:in für KI-Anwendungen in Unternehmen. Erstelle aus den folgenden Themengruppen
(nach Präsenz in der Presse sortiert) ein kurzes Lagebild auf Deutsch:
- 1 Einleitungssatz zur Gesamtlage,
- danach 3–6 Stichpunkte mit den wichtigsten Entwicklungen (Praxis-Themen – KI im Arbeitsalltag und in der Softwareentwicklung – zuerst),
- zum Schluss 1–3 konkrete Ideen, was man auf Basis der Meldungen im Berufsalltag oder im Entwicklungsteam ausprobieren könnte.
Nur Fakten aus den Meldungen verwenden, nichts erfinden. Antworte als JSON:
{"einleitung": "...", "punkte": ["..."], "ausblick": ["..."]}`;

module.exports = {
  id: 'ki',
  label: 'Künstliche Intelligenz',
  short: 'KI',
  description: 'Neuigkeiten zu KI, Schwerpunkt Anwendungsfälle im Berufsalltag und Effizienz in der Softwareentwicklung',
  categories: ['leitmedien', 'wirtschaft', 'regional', 'tech', 'ki-fach', 'dev', 'ki-institutionen'],
  focus: {
    id: 'praxis',
    badge: 'Praxis',
    filterLabel: 'Nur Praxis-Themen',
    kpiLabel: 'mit Praxisbezug',
    titleLabel: 'Praxis-Themen',
    noteLabel: 'Praxisnutzen',
    minScore: 6,
  },
  thresholds: { topicFeed: 2, general: 6 },
  requireCore: true,
  fields: FIELDS,
  rules: RULES,
  negative: NEGATIVE,
  googleTerms: [
    'KI', '"Künstliche Intelligenz"', 'ChatGPT', 'OpenAI', 'Copilot', 'Sprachmodell', 'KI-Agenten', '"generative KI"',
  ],
  // Für die Gruppierung: Wörter, die in fast jeder KI-Meldung stehen, tragen nichts bei
  clusterStopwords: ['ki', 'künstliche', 'künstlichen', 'intelligenz', 'tool', 'tools', 'unternehmen', 'nutzen', 'einsatz', 'neue', 'neues'],
  splitCompounds: true,
  clusterSynonyms: [
    [/\bai act\b/g, 'ki-verordnung'],
    [/\b(llms?|large language models?)\b/g, 'sprachmodell'],
    [/\bki-modell/g, 'sprachmodell'],
    [/\bcoding-agent/g, 'coding agent'],
  ],
  searchPlaceholder: 'Suchen, z. B. Copilot, Agenten, Softwareentwicklung …',
  prompts: { summary: SUMMARY_PROMPT, briefing: BRIEFING_PROMPT, briefingFocusTag: 'Praxis' },
  outlookLabel: 'Zum Ausprobieren',
};
