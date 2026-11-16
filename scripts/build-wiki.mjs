import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { kindCounts, productLevels } from './catalog-rules.mjs';

const locate = (path) => new URL(path, import.meta.url);
const read = (path) => readFile(locate(path), 'utf8');
const splitRow = (line) => line.slice(1, -1).split('|').map((cell) => cell.trim());
const positiveInteger = /^[1-9]\d*$/;
const sectorOrder = ['agriculture', 'livestock', 'fish'];
const groups = {
  C: { kind: 'raw', sectors: ['agriculture'] },
  L: { kind: 'raw', sectors: ['livestock'] },
  F: { kind: 'raw', sectors: ['fish'] },
  I: { kind: 'intermediate', sectors: ['agriculture'] },
  IL: { kind: 'intermediate', sectors: ['livestock'] },
  IF: { kind: 'intermediate', sectors: ['fish'] },
  P: { kind: 'product', sectors: ['agriculture'] },
  PL: { kind: 'product', sectors: ['livestock'] },
  PF: { kind: 'product', sectors: ['fish'] },
  PD: { kind: 'product', complexity: 2 },
  PT: { kind: 'product', complexity: 3 },
};

function parseIngredients(value, id) {
  if (value === '—') return [];
  const ingredients = value.split(' + ').map((term) => {
    const match = /^([1-9]\d*)×([A-Z]+\d+)$/.exec(term);
    assert.ok(match, `${id} has an invalid ingredient term: ${term}`);
    return [match[2], match[1]];
  });
  assert.equal(new Set(ingredients.map(([key]) => key)).size, ingredients.length, id);
  return ingredients;
}

function parseSpecies(markdown) {
  const species = new Map();
  for (const line of markdown.split('\n')) {
    if (!/^\| [LF]\d+ \|/.test(line)) continue;
    const [id, name, material] = splitRow(line);
    assert.ok(name && material && !species.has(id), id);
    species.set(id, { name, material });
  }
  assert.equal(species.size, 20);
  return species;
}

// LT-2026-11-v4: spec 耗时/产量/售价 columns are generator inputs (耗时 = generation seconds g),
// so the wiki's economic values come from the same-version generated runtime data.
function runtimeEconomy(gameData, id) {
  const item = gameData.items?.[id];
  assert.ok(item, `${id} is missing from src/content/game-data.json`);
  assert.ok(Number.isSafeInteger(item.durationMs) && item.durationMs > 0 && item.durationMs % 1000 === 0,
    `${id} has an invalid runtime durationMs: ${item.durationMs}`);
  const output = String(item.output);
  const price = String(item.price);
  assert.ok(positiveInteger.test(output) && positiveInteger.test(price), `${id} has an invalid runtime output/price`);
  return { seconds: item.durationMs / 1000, output, price };
}

function parseCatalog(markdown, species, levelFor, gameData) {
  const items = new Map();
  for (const line of markdown.split('\n')) {
    if (!/^\| [A-Z]+\d+ \|/.test(line)) continue;
    const [id, name, specSeconds, specOutput, specPrice, recipe] = splitRow(line);
    const [, prefix, rank] = /^([A-Z]+)(\d+)$/.exec(id);
    const group = groups[prefix];
    assert.ok(group && !items.has(id) && name, id);
    assert.ok([specSeconds, specOutput, specPrice].every((number) => positiveInteger.test(number)), id);
    const { seconds, output, price } = runtimeEconomy(gameData, id);
    const inputs = parseIngredients(recipe, id);
    const prerequisites = inputs.map(([key]) => {
      const ingredient = items.get(key);
      assert.ok(ingredient, `${id} uses an undefined or later ingredient: ${key}`);
      return ingredient;
    });

    let sectors = group.sectors;
    let stage = 0;
    if (group.kind === 'raw') {
      assert.equal(inputs.length, 0, id);
    } else {
      assert.ok(inputs.length && output === '1', id);
      stage = 1 + Math.max(...prerequisites.map((ingredient) => ingredient.stage));
      sectors = sectorOrder.filter((sector) => prerequisites.some((ingredient) => ingredient.sectors.includes(sector)));
      if (group.kind === 'intermediate') {
        assert.ok(prerequisites.every((ingredient) => ingredient.kind !== 'product'), id);
      } else {
        assert.ok(prerequisites.every((ingredient) => ingredient.kind === 'intermediate'), id);
      }
      if (group.sectors) assert.deepEqual(sectors, group.sectors, id);
      else assert.equal(sectors.length, group.complexity, id);
    }

    const source = species.get(id);
    if (source) assert.equal(source.material, name, id);
    const level = group.kind === 'product' ? levelFor(prefix, Number(rank), sectors.length) : undefined;
    items.set(id, { id, name, kind: group.kind, sectors, inputs, stage, output, seconds, price,
      ...(level && { level }),
      ...(source && { species: source.name }),
    });
  }

  for (const [prefix, count] of Object.entries(kindCounts)) {
    for (let rank = 1; rank <= count; rank += 1) {
      assert.ok(items.has(prefix + String(rank).padStart(2, '0')), prefix);
    }
  }
  const rows = [...items.values()];
  assert.equal(rows.length, 525);
  assert.equal(rows.filter((item) => item.inputs.length).length, 437);
  return rows;
}

const [catalogMarkdown, speciesMarkdown, cropUses, gameDataJson] = await Promise.all([
  read('../docs/expansion/05-catalog.md'),
  read('../docs/expansion/02-livestock-fish.md'),
  read('../docs/expansion/08-crop-uses.md'),
  read('../src/content/game-data.json'),
]);
const gameData = JSON.parse(gameDataJson);
const rows = parseCatalog(catalogMarkdown, parseSpecies(speciesMarkdown), productLevels(cropUses), gameData);

if (process.argv.includes('--check-data')) {
  console.log(`图鉴数据校验通过：${rows.length} 个品项，${rows.filter((item) => item.inputs.length).length} 条生产配方。`);
} else {
  const template = await read('../wiki/index.template.html');
  const hash = createHash('sha256');
  for (const { id } of rows) hash.update(await readFile(locate('../public/wiki/icons/' + id + '.webp')));
  const iconRevision = hash.digest('hex').slice(0, 12);
  await mkdir(locate('../public/wiki/'), { recursive: true });
  const safeJson = JSON.stringify(rows).replaceAll('<', '\\u003c');
  await writeFile(locate('../public/wiki/index.html'), template.replace('%%ICON_REVISION%%', iconRevision).replace('%%CATALOG%%', () => safeJson));
}
