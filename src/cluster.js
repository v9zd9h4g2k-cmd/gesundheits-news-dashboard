'use strict';

/**
 * Themen-Clustering ähnlicher Meldungen (TF-IDF + Kosinus-Ähnlichkeit)
 * und extraktive Zusammenfassung als Fallback ohne KI.
 */

const STOPWORDS = new Set(`
aber alle allem allen aller alles als also am an ander andere anderem anderen anderer anderes anders auch auf aus bei beim bin bis bist
da dabei damit dann das dass dein deine dem den denn der deren des dessen dich die dies diese diesem diesen dieser dieses dir doch dort du durch
ein eine einem einen einer eines einig einige einigem einigen einiger einiges einmal er es etwas euch euer eure für gegen gewesen hab habe haben hat
hatte hatten hier hin hinter ich ihm ihn ihnen ihr ihre ihrem ihren ihrer ihres im in indem ins ist jede jedem jeden jeder jedes jene jenem jenen
jener jenes jetzt kann kein keine keinem keinen keiner keines können könnte machen man manche manchem manchen mancher manches mein meine mehr mit
muss musste nach nicht nichts noch nun nur ob oder ohne sehr sein seine seinem seinen seiner seines selbst sich sie sind so solche soll sollen sollte
sondern sonst über um und uns unser unsere unter viel vom von vor wann war waren warum was weil welche welchem welchen welcher welches wenn wer werde
werden wie wieder will wir wird wirst wo wollen wollte würde würden zu zum zur zwar zwischen neue neuen neuer neues mehr weniger heute gestern morgen
jahr jahre jahren legt legen plant planen fordert fordern rechnet rechnen empfiehlt berät beraten bleibt bleiben steigen steigt weiter sieht sehen geplant geplante soll sollen kommt kommen will wollen warnt warnen droht drohen könnte prozent millionen milliarden euro laut sagt sagte sagen erklärt erklärte berichtet wegen sowie bereits rund etwa derzeit künftig
seit schon immer einem ersten zwei drei vier fünf zehn woche wochen tag tage tagen uhr neu ab kommenden nächste nächsten soll sei seien
mehrere weitere weiteren dpa afp epd kna reuters mehr lesen hier artikel foto bild video podcast live ticker liveblog newsblog update
`.trim().split(/\s+/));

function normalize(word) {
  return word
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss');
}

function stem(word) {
  let w = normalize(word);
  const suffixes = ['ungen', 'ung', 'heiten', 'heit', 'keiten', 'keit', 'ern', 'em', 'en', 'er', 'es', 'e', 'n', 's'];
  for (const s of suffixes) {
    if (w.length - s.length >= 4 && w.endsWith(s)) {
      w = w.slice(0, -s.length);
      break;
    }
  }
  return w;
}

// Wortbestandteile, die in Komposita stecken (Krankenkassenbeiträge → kasse, beitrag)
const SUBWORDS = [
  'beitrag', 'kasse', 'versicher', 'klinik', 'krankenhaus', 'apothek', 'pflege', 'arzt', 'ärzt', 'reform',
  'finanz', 'defizit', 'patient', 'praxis', 'praxen', 'impf', 'arznei', 'medikament', 'lieferengp', 'digital',
  'krankenstand', 'krankschreib', 'krankmeld', 'eigenanteil', 'honorar', 'notfall', 'rettung', 'hausarzt', 'fonds',
];

/** Zerlegt Text in Stämme; merkt sich die häufigste Oberflächenform. */
function tokenize(text, surface) {
  const words = (text || '').toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}-]*[\p{L}\p{N}]|[\p{L}]{2,}/gu) || [];
  const out = [];
  for (const raw of words) {
    const w = raw.replace(/^-+|-+$/g, '');
    if (w.length < 3 || STOPWORDS.has(w) || /^\d+$/.test(w)) continue;
    const s = stem(w);
    out.push(s);
    if (w.length >= 9) {
      for (const sw of SUBWORDS) {
        if (w.includes(sw) && !w.startsWith(sw + (w.length > sw.length + 3 ? '' : '#'))) out.push(`~${normalize(sw)}`);
      }
    }
    if (surface) {
      const m = surface.get(s) || new Map();
      m.set(raw, (m.get(raw) || 0) + 1);
      surface.set(s, m);
    }
  }
  return out;
}

function norm(vec) {
  let sum = 0;
  for (const v of vec.values()) sum += v * v;
  const n = Math.sqrt(sum) || 1;
  for (const [k, v] of vec) vec.set(k, v / n);
  return vec;
}

function cosine(a, b) {
  if (a.size > b.size) [a, b] = [b, a];
  let dot = 0;
  for (const [k, v] of a) {
    const w = b.get(k);
    if (w) dot += v * w;
  }
  return dot;
}

function addInto(target, vec) {
  for (const [k, v] of vec) target.set(k, (target.get(k) || 0) + v);
}

function centroidOf(members) {
  const c = new Map();
  for (const m of members) addInto(c, m.vec);
  return norm(c);
}

/**
 * @param {Array} articles  – {id,title,description,sourceId,sourceName,date,...}
 * @param {{threshold?:number}} opts
 */
function clusterArticles(articles, { threshold = 0.25 } = {}) {
  const surface = new Map();
  const docs = articles.map((a) => {
    const titleTokens = tokenize(a.title, surface);
    const descTokens = tokenize(a.description, surface).slice(0, 80);
    return { a, titleTokens, descTokens };
  });

  // Dokumentfrequenz
  const df = new Map();
  for (const d of docs) {
    for (const t of new Set([...d.titleTokens, ...d.descTokens])) df.set(t, (df.get(t) || 0) + 1);
  }
  const N = docs.length || 1;
  const idf = (t) => Math.log(1 + N / (df.get(t) || 1));

  for (const d of docs) {
    const tf = new Map();
    for (const t of d.titleTokens) tf.set(t, (tf.get(t) || 0) + 2.5);
    for (const t of d.descTokens) tf.set(t, (tf.get(t) || 0) + 1);
    const vec = new Map();
    for (const [t, f] of tf) {
      if ((df.get(t) || 0) < 2 && N > 5) continue; // Einzelwörter tragen nichts zur Gruppierung bei
      vec.set(t, (1 + Math.log(f)) * idf(t));
    }
    // Fallback, falls alles gefiltert wurde
    if (!vec.size) for (const [t, f] of tf) vec.set(t, (1 + Math.log(f)) * idf(t));
    d.vec = norm(vec);
    d.titleVec = norm(new Map(d.titleTokens.map((t) => [t, idf(t)])));
  }

  // Paarweise Ähnlichkeit über invertierten Index (nur Paare mit gemeinsamen Wörtern)
  const n = docs.length;
  const pairSims = sparseSimilarities(docs.map((d) => d.vec));
  const titleSims = sparseSimilarities(docs.map((d) => d.titleVec));
  const sims = new Map(); // "i,j" (i<j) -> Ähnlichkeit
  for (const [k, v] of pairSims) sims.set(k, v);
  for (const [k, v] of titleSims) sims.set(k, Math.max(sims.get(k) || 0, 0.9 * v));

  // Vorgruppierung: Zusammenhangskomponenten über ausreichend ähnliche Paare
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const edgeMin = threshold * 0.6;
  for (const [k, v] of sims) {
    if (v < edgeMin) continue;
    const [i, j] = k.split(',').map(Number);
    parent[find(i)] = find(j);
  }
  const components = new Map();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    if (!components.has(r)) components.set(r, []);
    components.get(r).push(i);
  }

  // Innerhalb jeder Komponente: agglomeratives Clustering mit Average-Linkage.
  // Das verhindert, dass einzelne allgemeine Wörter ganze Themen verketten.
  const clusters = [];
  for (const idx of components.values()) {
    for (const g of averageLinkage(idx, sims, threshold)) {
      const members = g.map((i) => docs[i]);
      clusters.push({ members, centroid: centroidOf(members) });
    }
  }

  const surfaceOf = (s) => {
    const m = surface.get(s);
    if (!m) return s;
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
  };

  return clusters.map((c) => buildCluster(c, surfaceOf));
}

function sparseSimilarities(vecs) {
  const index = new Map();
  vecs.forEach((v, i) => {
    for (const [t, w] of v) {
      if (!index.has(t)) index.set(t, []);
      index.get(t).push([i, w]);
    }
  });
  const out = new Map();
  for (const postings of index.values()) {
    if (postings.length > 400) continue; // extrem häufige Wörter tragen nichts bei
    for (let a = 0; a < postings.length; a++) {
      const [i, wi] = postings[a];
      for (let b = a + 1; b < postings.length; b++) {
        const [j, wj] = postings[b];
        const k = i < j ? `${i},${j}` : `${j},${i}`;
        out.set(k, (out.get(k) || 0) + wi * wj);
      }
    }
  }
  return out;
}

function averageLinkage(idx, sims, threshold) {
  const m = idx.length;
  if (m === 1) return [idx];
  const S = Array.from({ length: m }, () => new Float64Array(m));
  for (let a = 0; a < m; a++) {
    for (let b = a + 1; b < m; b++) {
      const i = idx[a];
      const j = idx[b];
      const v = sims.get(i < j ? `${i},${j}` : `${j},${i}`) || 0;
      S[a][b] = v;
      S[b][a] = v;
    }
  }
  const groups = idx.map((i) => [i]);
  const alive = new Array(m).fill(true);
  for (;;) {
    let ba = -1;
    let bb = -1;
    let best = threshold;
    for (let a = 0; a < m; a++) {
      if (!alive[a]) continue;
      const na = groups[a].length;
      const Sa = S[a];
      for (let b = a + 1; b < m; b++) {
        if (!alive[b]) continue;
        const avg = Sa[b] / (na * groups[b].length);
        if (avg >= best) { best = avg; ba = a; bb = b; }
      }
    }
    if (ba < 0) break;
    for (let x = 0; x < m; x++) {
      if (!alive[x] || x === ba || x === bb) continue;
      S[ba][x] += S[bb][x];
      S[x][ba] = S[ba][x];
    }
    groups[ba].push(...groups[bb]);
    alive[bb] = false;
  }
  return groups.filter((g, a) => alive[a]);
}

function splitSentences(text) {
  return (text || '')
    .split(/(?<=[.!?])\s+(?=[„"A-ZÄÖÜ0-9])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30 && s.length < 400);
}

function jaccard(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter || 1);
}

/** Extraktive Zusammenfassung: zentralste Sätze aus den Teasern. */
function extractiveSummary(members, centroid, maxSentences = 3) {
  const candidates = [];
  const seen = new Set();
  for (const m of members) {
    for (const s of splitSentences(m.a.description)) {
      const key = s.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const toks = tokenize(s);
      if (toks.length < 4) continue;
      const vec = norm(new Map(toks.map((t) => [t, 1])));
      candidates.push({ s, toks, score: cosine(vec, centroid) });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const chosen = [];
  for (const c of candidates) {
    if (chosen.some((x) => jaccard(x.toks, c.toks) > 0.5)) continue;
    chosen.push(c);
    if (chosen.length >= maxSentences) break;
  }
  if (!chosen.length) {
    const d = members.find((m) => m.a.description)?.a.description;
    return d ? d.slice(0, 400) + (d.length > 400 ? ' …' : '') : '';
  }
  let out = chosen.map((c) => c.s).join(' ');
  if (out.length > 600) out = out.slice(0, 597).replace(/\s+\S*$/, '') + ' …';
  return out;
}

function buildCluster(c, surfaceOf) {
  const members = c.members;
  // Repräsentant: am nächsten am Zentrum, Fachtitel bevorzugt vor Kurzmeldungen
  let rep = members[0];
  let repScore = -1;
  for (const m of members) {
    const s = cosine(m.vec, c.centroid) + Math.min(m.a.title.length, 90) / 900;
    if (s > repScore) { repScore = s; rep = m; }
  }

  const articles = members
    .map((m) => m.a)
    .sort((x, y) => (y.date || '').localeCompare(x.date || ''));

  const sourceCounts = new Map();
  for (const a of articles) {
    const e = sourceCounts.get(a.sourceId) || { id: a.sourceId, name: a.sourceName, count: 0 };
    e.count++;
    sourceCounts.set(a.sourceId, e);
  }
  const topicCounts = {};
  let gkvArticles = 0;
  let gkvScore = 0;
  for (const a of articles) {
    for (const t of a.topics || []) topicCounts[t] = (topicCounts[t] || 0) + 1;
    if (a.gkv) gkvArticles++;
    gkvScore += a.gkvScore || 0;
  }
  const topics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);
  const keywords = [...c.centroid.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([s]) => surfaceOf(s));

  const dates = articles.map((a) => a.date).filter(Boolean).sort();
  const ids = articles.map((a) => a.id).sort();

  return {
    id: hash(ids[0] || rep.a.id),
    key: hash(ids.join('|')),
    title: rep.a.title,
    articles,
    articleCount: articles.length,
    sources: [...sourceCounts.values()].sort((a, b) => b.count - a.count),
    sourceCount: sourceCounts.size,
    firstSeen: dates[0] || null,
    lastSeen: dates[dates.length - 1] || null,
    topics,
    keywords,
    gkv: gkvArticles > 0 && (gkvArticles / articles.length >= 0.34 || gkvScore >= 12),
    gkvScore,
    summary: extractiveSummary(members, c.centroid),
    summarySource: 'extract',
  };
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

module.exports = { clusterArticles, tokenize, stem, hash, extractiveSummary };
