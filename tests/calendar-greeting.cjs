const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('dist/app.js', 'utf8');
const context = vm.createContext({ Intl, Date, Math });
vm.runInContext(source.slice(source.indexOf('const OPENINGS ='), source.indexOf('let previousOpening =')) +
  source.slice(source.indexOf('const SOLAR_FESTIVALS ='), source.indexOf('let quoteIndex =')) +
  ';this.api = { OPENINGS, chooseOpening, festivalsForDate, lunarDateParts };', context);
const { OPENINGS, chooseOpening, festivalsForDate, lunarDateParts } = context.api;
for (let previous = -1; previous < OPENINGS.length; previous++) {
  for (const random of [0, .25, .5, .999999]) {
    const result = chooseOpening(previous, random);
    assert(OPENINGS.includes(result));
    assert.notEqual(OPENINGS.indexOf(result), previous);
  }
}
const festivals = (year, month, day) => Array.from(festivalsForDate(new Date(year, month - 1, day, 12)), entry => entry[0]);
assert.deepEqual(festivals(2026, 1, 1), ['元旦']);
assert.deepEqual(festivals(2025, 1, 28), ['除夕']);
assert.deepEqual(festivals(2025, 1, 29), ['春节']);
assert.deepEqual(festivals(2024, 2, 24), ['元宵节']);
assert.deepEqual(festivals(2024, 6, 10), ['端午节']);
assert.deepEqual(festivals(2024, 9, 17), ['中秋节']);
assert.deepEqual(festivals(2020, 10, 1), ['国庆节', '中秋节']);
assert.deepEqual(festivals(2026, 10, 16), []);
assert.equal(lunarDateParts(new Date(2009, 5, 27, 12)), '5bis-5');
assert.deepEqual(festivals(2009, 6, 27), []);
console.log('PASS: 12 openings, no consecutive repeat, solar/lunar festivals, New Year eve, overlapping festivals, leap-month exclusion, ordinary day');
