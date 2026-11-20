'use strict';

/**
 * Registry der Themenbereiche. Ein neues Thema = neue Datei in diesem Ordner
 * (Aufbau wie gesundheit.js / ki.js) + Eintrag in TOPICS + Quellen in src/sources.js.
 */

const TOPICS = [require('./gesundheit'), require('./ki')];
const BY_ID = new Map(TOPICS.map((t) => [t.id, t]));
const DEFAULT_TOPIC = TOPICS[0].id;

function getTopic(id) {
  return BY_ID.get(id) || BY_ID.get(DEFAULT_TOPIC);
}

function isTopic(id) {
  return BY_ID.has(id);
}

/** Für die Oberfläche: alles außer Regeln und Prompts. */
function topicMeta(t) {
  const fields = {};
  for (const [k, v] of Object.entries(t.fields)) if (v) fields[k] = v;
  return {
    id: t.id,
    label: t.label,
    short: t.short,
    description: t.description,
    categories: t.categories,
    focus: {
      id: t.focus.id,
      badge: t.focus.badge,
      filterLabel: t.focus.filterLabel,
      kpiLabel: t.focus.kpiLabel,
      titleLabel: t.focus.titleLabel,
      noteLabel: t.focus.noteLabel,
    },
    fields,
    searchPlaceholder: t.searchPlaceholder,
    outlookLabel: t.outlookLabel,
  };
}

module.exports = { TOPICS, DEFAULT_TOPIC, getTopic, isTopic, topicMeta };
