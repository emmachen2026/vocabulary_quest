const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../word-data.js');
const model = require('../data-model.js');

test('dataset contains 872 independently identified textbook entries', () => {
  assert.equal(data.total, 872);
  assert.deepEqual(Object.fromEntries([1,2,3,4,5].map(grade => [grade, data.words.filter(word => word.grade === grade).length])), {
    1: 120, 2: 140, 3: 180, 4: 216, 5: 216
  });
  assert.equal(new Set(data.words.map(word => word.id)).size, 872);
  assert.equal(data.words.filter(word => !word.sourcePage).length, 0);
});

test('every unit has the expected number of entries', () => {
  const unitCounts = { 1: [12,10], 2: [14,10], 3: [18,10], 4: [18,12], 5: [18,12] };
  Object.entries(unitCounts).forEach(([grade, [units, wordsPerUnit]]) => {
    for (let unit = 1; unit <= units; unit += 1) {
      assert.equal(data.words.filter(word => word.grade === Number(grade) && word.unit === unit).length, wordsPerUnit, `G${grade} U${unit}`);
    }
  });
});

test('G3 and G4 page pairs map to the correct units', () => {
  assert.equal(data.words.find(word => word.id === 'g3-u01-allow').sourcePage, 8);
  assert.equal(data.words.find(word => word.id === 'g3-u18-uproar').sourcePage, 183);
  assert.equal(data.words.find(word => word.id === 'g4-u01-counsel').sourcePage, 8);
  assert.equal(data.words.find(word => word.id === 'g4-u18-abide').sourcePage, 182);
});

test('same spelling in different grades remains independent', () => {
  const barriers = data.words.filter(word => word.word === 'barrier');
  assert.equal(barriers.length, 2);
  assert.notEqual(barriers[0].id, barriers[1].id);
});

test('red and yellow reset green progress and schedule 1 or 3 days later', () => {
  const green = { color: 'green', greenStage: 3, stable: false };
  assert.deepEqual(model.scheduleFor(green, 'red', '2026-09-08'), { color: 'red', greenStage: 0, dueDate: '2026-09-09', stable: false });
  assert.deepEqual(model.scheduleFor(green, 'yellow', '2026-09-08'), { color: 'yellow', greenStage: 0, dueDate: '2026-09-11', stable: false });
});

test('green follows 7, 14 and 30-day consolidation before graduating', () => {
  let scheduled = model.scheduleFor({ color: 'gray', greenStage: 0 }, 'green', '2026-09-08');
  assert.equal(scheduled.dueDate, '2026-09-15');
  scheduled = model.scheduleFor(scheduled, 'green', '2026-09-15');
  assert.equal(scheduled.dueDate, '2026-09-29');
  scheduled = model.scheduleFor(scheduled, 'green', '2026-09-29');
  assert.equal(scheduled.dueDate, '2026-10-29');
  scheduled = model.scheduleFor(scheduled, 'green', '2026-10-29');
  assert.equal(scheduled.stable, true);
  assert.equal(scheduled.dueDate, null);
});

test('review queue prioritizes oldest due date, then red yellow green, and caps at limit', () => {
  const words = data.words.slice(0, 4);
  const state = model.createState('2026-09-01');
  state.settings.dailyReviewLimit = 3;
  state.wordStates[words[0].id] = { color:'green', greenStage:1, dueDate:'2026-09-01' };
  state.wordStates[words[1].id] = { color:'yellow', greenStage:0, dueDate:'2026-09-02' };
  state.wordStates[words[2].id] = { color:'red', greenStage:0, dueDate:'2026-09-02' };
  state.wordStates[words[3].id] = { color:'red', greenStage:0, dueDate:'2026-09-03' };
  const queue = model.reviewQueue(words, state, '2026-09-08');
  assert.deepEqual(queue.map(word => word.id), [words[0].id, words[2].id, words[1].id]);
  assert.equal(model.allDue(words, state, '2026-09-08').length, 4);
});

test('local date arithmetic is stable across month boundaries', () => {
  assert.equal(model.addDays('2026-09-30', 1), '2026-10-01');
  assert.equal(model.addDays('2027-02-28', 1), '2027-03-01');
  assert.equal(model.addDays('2028-02-28', 1), '2028-02-29');
});

test('exported state normalizes back without losing valid progress', () => {
  const word = data.words[0];
  let state = model.createState('2026-09-08');
  state = model.applyRating(state, word.id, 'green', '2026-09-08', 'screening');
  state = model.updateDetails(state, word.id, { definitions:[{partOfSpeech:'adjective',definition:'Having a thin edge that can cut.'}] });
  const restored = model.normalizeState(JSON.parse(JSON.stringify(state)), new Set(data.words.map(item => item.id)));
  assert.equal(restored.wordStates[word.id].dueDate, '2026-09-15');
  assert.equal(restored.wordStates[word.id].definitions[0].partOfSpeech, 'adjective');
  assert.equal(restored.reviewHistory.length, 1);
});
