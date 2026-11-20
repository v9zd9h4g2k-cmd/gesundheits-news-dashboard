'use strict';

/**
 * Generische Relevanzbewertung: Passt ein Artikel zu einem Themenbereich,
 * und betrifft er dessen Fokus (z. B. GKV bzw. KI-Praxis)?
 * Die Regeln stehen in src/topics/<thema>.js.
 */

const compiled = new Map();

function compile(topic) {
  if (compiled.has(topic.id)) return compiled.get(topic.id);
  const rules = topic.rules.map((r) => ({
    ...r,
    // Wortanfang: kein Buchstabe/Ziffer davor (Unicode-sicher, \b kennt keine Umlaute).
    re: new RegExp(`(?<![\\p{L}\\p{N}])${r.pattern}`, 'giu'),
  }));
  compiled.set(topic.id, rules);
  return rules;
}

function countMatches(re, text) {
  re.lastIndex = 0;
  const m = text.match(re);
  return m ? m.length : 0;
}

/**
 * @param {{title?:string, description?:string}} article
 * @param {object} topic  Themen-Definition
 * @param {{topicFeed?:boolean}} opts  stammt der Artikel aus einer Fach-Rubrik des Themas?
 * @returns {{score:number, focusScore:number, topics:string[], relevant:boolean, focus:boolean}}
 *          `topics` = Themenfelder (Schlüssel aus topic.fields)
 */
function scoreArticle({ title = '', description = '' }, topic, { topicFeed = false } = {}) {
  const t = title.toLowerCase();
  const d = (description || '').toLowerCase();
  let score = 0;
  let focusScore = 0;
  let coreScore = 0;
  const fieldScore = {};

  for (const r of compile(topic)) {
    const n = countMatches(r.re, t) * 2 + Math.min(countMatches(r.re, d), 3);
    if (!n) continue;
    const s = r.weight * n;
    score += s;
    if (r.focus) focusScore += s;
    if (r.core) coreScore += s;
    if (topic.fields[r.field]) fieldScore[r.field] = (fieldScore[r.field] || 0) + s;
  }
  for (const neg of topic.negative || []) score -= 3 * (countMatches(neg, t) + countMatches(neg, d));

  const { topicFeed: feedMin, general } = topic.thresholds;
  const relevant = topicFeed
    ? score >= feedMin
    : score >= general && (!topic.requireCore || coreScore > 0);

  const topics = Object.entries(fieldScore)
    .sort((a, b) => b[1] - a[1])
    .filter(([, v], i) => i === 0 || v >= 4)
    .slice(0, 3)
    .map(([k]) => k);

  return {
    score,
    focusScore,
    topics,
    relevant,
    focus: relevant && focusScore >= topic.focus.minScore,
  };
}

module.exports = { scoreArticle };
