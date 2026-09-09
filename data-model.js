(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.VocabularyModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const SCHEMA_VERSION = 1;
  const STORAGE_KEY = 'jayden-vocabulary-quest-v1';
  const COLORS = ['gray', 'red', 'yellow', 'green'];
  const COLOR_PRIORITY = { red: 0, yellow: 1, green: 2, gray: 3 };

  const pad = value => String(value).padStart(2, '0');
  function localISO(date = new Date()) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function addDays(iso, days) {
    const [year, month, day] = String(iso).split('-').map(Number);
    const date = new Date(year, month - 1, day + Number(days || 0), 12);
    return localISO(date);
  }

  function createState(startDate = localISO()) {
    return {
      schemaVersion: SCHEMA_VERSION,
      profile: { name: 'Jayden', startedAt: startDate },
      settings: { screeningTarget: 60, dailyReviewLimit: 25 },
      wordStates: {},
      reviewHistory: []
    };
  }

  function normalizeWordState(raw = {}) {
    const color = COLORS.includes(raw.color) ? raw.color : 'gray';
    const greenStage = color === 'green' ? Math.max(0, Math.min(4, Number(raw.greenStage) || 0)) : 0;
    return {
      color,
      greenStage,
      dueDate: raw.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(raw.dueDate) ? raw.dueDate : null,
      stable: color === 'green' && Boolean(raw.stable),
      definitions: Array.isArray(raw.definitions) ? raw.definitions.slice(0, 3).map(item => ({
        partOfSpeech: String(item?.partOfSpeech || ''),
        definition: String(item?.definition || '')
      })).filter(item => item.definition) : [],
      lastReviewedAt: raw.lastReviewedAt || null
    };
  }

  function normalizeState(raw, validIds) {
    const base = createState();
    if (!raw || Number(raw.schemaVersion) !== SCHEMA_VERSION) return base;
    const ids = validIds instanceof Set ? validIds : new Set(validIds || []);
    const wordStates = {};
    Object.entries(raw.wordStates || {}).forEach(([id, value]) => {
      if (!ids.size || ids.has(id)) wordStates[id] = normalizeWordState(value);
    });
    const history = Array.isArray(raw.reviewHistory) ? raw.reviewHistory.filter(item =>
      item && (!ids.size || ids.has(item.wordId)) && /^\d{4}-\d{2}-\d{2}$/.test(String(item.reviewedAt || '').slice(0, 10))
    ) : [];
    return {
      schemaVersion: SCHEMA_VERSION,
      profile: {
        name: String(raw.profile?.name || 'Jayden'),
        startedAt: /^\d{4}-\d{2}-\d{2}$/.test(raw.profile?.startedAt || '') ? raw.profile.startedAt : base.profile.startedAt
      },
      settings: {
        screeningTarget: Math.max(1, Math.min(200, Number(raw.settings?.screeningTarget) || 60)),
        dailyReviewLimit: Math.max(1, Math.min(100, Number(raw.settings?.dailyReviewLimit) || 25))
      },
      wordStates,
      reviewHistory: history
    };
  }

  function stateFor(state, wordId) {
    return normalizeWordState(state.wordStates[wordId]);
  }

  function scheduleFor(previous, color, reviewedDate) {
    if (color === 'red') return { color, greenStage: 0, dueDate: addDays(reviewedDate, 1), stable: false };
    if (color === 'yellow') return { color, greenStage: 0, dueDate: addDays(reviewedDate, 3), stable: false };
    if (color === 'gray') return { color, greenStage: 0, dueDate: null, stable: false };
    const nextStage = previous.color === 'green' ? Math.min(4, previous.greenStage + 1) : 1;
    if (nextStage >= 4) return { color: 'green', greenStage: 4, dueDate: null, stable: true };
    const intervals = { 1: 7, 2: 14, 3: 30 };
    return { color: 'green', greenStage: nextStage, dueDate: addDays(reviewedDate, intervals[nextStage]), stable: false };
  }

  function applyRating(state, wordId, color, reviewedDate = localISO(), source = 'review') {
    if (!COLORS.includes(color)) throw new Error(`Unknown color: ${color}`);
    const previous = stateFor(state, wordId);
    const scheduled = scheduleFor(previous, color, reviewedDate);
    const reviewedAt = `${reviewedDate}T12:00:00`;
    const next = {
      ...state,
      wordStates: {
        ...state.wordStates,
        [wordId]: { ...previous, ...scheduled, lastReviewedAt: reviewedAt }
      },
      reviewHistory: [...state.reviewHistory, {
        id: `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        wordId,
        reviewedAt,
        previousColor: previous.color,
        newColor: color,
        previousStage: previous.greenStage,
        newStage: scheduled.greenStage,
        becameStable: !previous.stable && scheduled.stable,
        source
      }]
    };
    return next;
  }

  function updateDetails(state, wordId, changes = {}) {
    const current = stateFor(state, wordId);
    const dueDate = changes.dueDate === '' ? null : changes.dueDate;
    return {
      ...state,
      wordStates: {
        ...state.wordStates,
        [wordId]: {
          ...current,
          definitions: changes.definitions === undefined ? current.definitions : changes.definitions,
          dueDate: dueDate === undefined ? current.dueDate : dueDate
        }
      }
    };
  }

  function screeningQueue(words, state, limit) {
    return words.filter(word => stateFor(state, word.id).color === 'gray').slice(0, limit || state.settings.screeningTarget);
  }

  function reviewQueue(words, state, today = localISO(), limit) {
    return words.filter(word => {
      const item = stateFor(state, word.id);
      return item.color !== 'gray' && !item.stable && item.dueDate && item.dueDate <= today;
    }).sort((a, b) => {
      const sa = stateFor(state, a.id);
      const sb = stateFor(state, b.id);
      return sa.dueDate.localeCompare(sb.dueDate) || COLOR_PRIORITY[sa.color] - COLOR_PRIORITY[sb.color] || a.grade - b.grade || a.unit - b.unit || a.word.localeCompare(b.word);
    }).slice(0, limit || state.settings.dailyReviewLimit);
  }

  function allDue(words, state, today = localISO()) {
    return words.filter(word => {
      const item = stateFor(state, word.id);
      return item.color !== 'gray' && !item.stable && item.dueDate && item.dueDate <= today;
    });
  }

  function studyDates(state) {
    return [...new Set(state.reviewHistory.map(item => String(item.reviewedAt).slice(0, 10)))].sort();
  }

  function streak(state, today = localISO()) {
    const dates = new Set(studyDates(state));
    let cursor = dates.has(today) ? today : addDays(today, -1);
    let count = 0;
    while (dates.has(cursor)) {
      count += 1;
      cursor = addDays(cursor, -1);
    }
    return count;
  }

  function stats(words, state, today = localISO()) {
    const counts = { gray: 0, red: 0, yellow: 0, green: 0, stable: 0 };
    words.forEach(word => {
      const item = stateFor(state, word.id);
      counts[item.color] += 1;
      if (item.stable) counts.stable += 1;
    });
    const xp = state.reviewHistory.reduce((sum, item) => sum + 2 + (item.becameStable ? 5 : 0), 0);
    return { ...counts, total: words.length, due: allDue(words, state, today).length, streak: streak(state, today), xp };
  }

  return {
    SCHEMA_VERSION, STORAGE_KEY, COLORS, localISO, addDays, createState, normalizeState, normalizeWordState,
    stateFor, scheduleFor, applyRating, updateDetails, screeningQueue, reviewQueue, allDue, studyDates, streak, stats
  };
});
