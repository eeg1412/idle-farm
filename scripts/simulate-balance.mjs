import assert from 'node:assert/strict';
import { catalog, farmSaleOffer, newWorld, productionDurationMs } from '../src/game/world.js';
const { items, research, initial } = catalog;

function reachable() {
  const complete = new Set(initial);
  let size = 0;
  while (size !== complete.size) {
    size = complete.size;
    for (const [id, node] of Object.entries(research)) {
      if ([...node.requires, ...Object.keys(node.costs)].every((dependency) => complete.has(dependency))) {
        complete.add(id);
      }
    }
  }
  return complete;
}

function footprint(id, amount, work) {
  if (!['I', 'P'].includes(id[0])) return;
  const item = items[id];
  const output = BigInt(item.output);
  const batches = (amount + output - 1n) / output;
  work[id[0]] += batches * BigInt(item.durationMs);
  for (const [material, count] of Object.entries(item.inputs)) {
    footprint(material, batches * BigInt(count), work);
  }
}

function productionWork() {
  const total = { I: 0n, P: 0n };
  for (const { costs } of Object.values(research)) {
    for (const [key, amount] of Object.entries(costs)) {
      footprint(key, BigInt(amount), total);
    }
  }
  return Object.fromEntries(Object.entries(total).map(([kind, ms]) => [kind, Number(ms) / 3600000]));
}

const reachableItems = reachable();
assert.equal(reachableItems.size, Object.keys(items).length);
console.log(JSON.stringify({ reachable: reachableItems.size }));
console.log(JSON.stringify({ stationHoursWithoutDiscount: productionWork() }));

for (const [id, baseSeconds] of [['I100', 600], ['I108', 490], ['I127', 580], ['P160', 1720], ['P169', 1758], ['PT50', 1800]]) {
  const item = items[id];
  const inputValue = Object.entries(item.inputs).reduce((sum, [input, count]) =>
    sum + BigInt(items[input].price) * BigInt(count), 0n);
  assert.equal(item.durationMs, baseSeconds * 1000);
  assert.equal(item.output, '1');
  const durationAt = (workshopSpeed) => productionDurationMs({ ...newWorld(0), tech: { workshopSpeed } }, id);
  assert.equal(durationAt(5), item.durationMs / 2);
  console.log(JSON.stringify({ id, baseSeconds, upgradedSeconds: durationAt(5) / 1000,
    batchesPerHour: [0, 5].map((level) => 3600000 / durationAt(level)),
    margin: (BigInt(item.price) - inputValue).toString() }));
}

function researchPoints(productionValue, appraisalLevel) {
  return farmSaleOffer({ ...newWorld(0), productionValue, tech: { appraisal: appraisalLevel } }).reward;
}
assert.deepEqual([0, 2, 5].map((level) => researchPoints(31000n, level)), [5n, 7n, 10n]);
assert.deepEqual([3264n, 6120n].map((value) => researchPoints(value, 0)), [2n, 2n]);
assert.equal(researchPoints(1000000n, 5), 18n);

assert.equal(researchPoints(620n, 2), 0n);
assert.equal(researchPoints(999n, 5), 0n);
assert.equal(researchPoints(1000n, 0), 1n);
