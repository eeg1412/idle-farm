"""Verify the current expansion inputs and generated catalogue without rewriting either."""

import json
import re
from collections import Counter
from fractions import Fraction
from math import ceil, floor, isqrt
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPANSION = ROOT / 'docs/expansion'
CONTENT = ROOT / 'src/content'
ID = re.compile(r'(C|L|F|M|IL|IF|IM|I|PL|PF|PD|PT|PM|P)(\d{2,3})')
SECTOR = {'C': '农业', 'I': '农业', 'L': '畜牧', 'IL': '畜牧', 'F': '水产', 'IF': '水产', 'M': '矿业', 'IM': '矿业'}


def table_rows(filename, header, select=lambda key: True):
    text = (EXPANSION / filename).read_text(encoding='utf-8-sig')
    assert header in text.splitlines(), (filename, header)
    size = header.count('|') - 1
    for line in text.splitlines():
        if not line.startswith('| '):
            continue
        fields = [value.strip() for value in line[1:-1].split('|')]
        key = fields[0]
        if re.match(r'[A-Z]+\d', key) and select(key):
            assert line.endswith('|') and len(fields) == size and ID.fullmatch(key), (filename, line)
            yield fields


def listed_ids(text):
    if text == '—':
        return []
    ids = text.split('、')
    assert all(ID.fullmatch(key) for key in ids) and len(ids) == len(set(ids)), text
    return ids


def inputs_for(text):
    if text == '—':
        return {}
    inputs = {}
    for term in text.split(' + '):
        amount, key = term.split('×')
        assert re.fullmatch('[1-9]\\d*', amount) and ID.fullmatch(key) and key not in inputs, text
        inputs[key] = amount
    return inputs


def unique_rows(rows):
    result = {}
    for key, *fields in rows:
        assert key not in result, key
        result[key] = fields
    return result


def validate():
    snapshot = json.loads((CONTENT / 'balance-baseline-v114.json').read_text())
    game = json.loads((CONTENT / 'game-data.json').read_text())
    scale = json.loads((CONTENT / 'economy-scale.json').read_text())['coinScale']
    assert type(scale) in (int, float) and 0 < scale <= 2**53 - 1 and scale == floor(scale), 'coinScale 必须为正安全整数'
    scale = int(scale)
    assert game['version'] == snapshot['version'] == '1.14'
    assert game['balanceVersion'] == 'LT-2026-11-v13'
    assert game['initial'] == snapshot['initial'] == ['C01', 'I01']
    items, research = game['items'], game['research']
    catalogue_rows = unique_rows(table_rows('05-catalog.md', '| ID | 名称 | 基础周期下界秒 | 每批投入 |'))
    research_rows = unique_rows(table_rows('06-research.md', '| ID | 名称 | 前置研发或初始品项 | 耗材 ID |'))
    stock_rows = unique_rows(table_rows('02-livestock-fish.md', '| ID | 对象 | 产物 |', lambda key: key[0] in 'LF'))
    processing_rows = unique_rows(table_rows('02-livestock-fish.md', '| ID | 名称 | 输入 |',
                                            lambda key: key.startswith(('IL', 'IF'))))
    assert catalogue_rows.keys() == items.keys()
    assert research_rows.keys() == research.keys() == items.keys() - set(game['initial'])
    assert len({item['name'] for item in items.values()}) == len(items)
    assert stock_rows.keys() == {key for key, item in items.items() if item['kind'] in ('L', 'F')}
    assert processing_rows.keys() == {key for key, item in items.items() if item['kind'] in ('IL', 'IF')}

    uses = Counter()
    signatures = set()
    minimum = {}
    def source_sectors(key, visiting=frozenset()):
        assert key not in visiting, ('生产来源成环', key)
        kind = ID.fullmatch(key)[1]
        dependencies = inputs_for(catalogue_rows[key][2])
        if not dependencies:
            return {SECTOR[kind]}
        return set().union(*(source_sectors(dep, visiting | {key}) for dep in dependencies))

    for key, (name, seconds, text) in catalogue_rows.items():
        item = items[key]
        kind, number = ID.fullmatch(key).groups()
        inputs = inputs_for(text)
        assert item['name'] == name and item['inputs'] == inputs and item['kind'] == kind, key
        assert re.fullmatch('[1-9]\\d*', seconds) and 1 <= int(seconds) <= 43200, key
        minimum[key] = int(seconds)
        if key in stock_rows:
            assert stock_rows[key] == [item['subject'], name], key
        if key in processing_rows:
            assert processing_rows[key] == [name, text], key
        if inputs:
            signature = tuple(sorted(inputs.items()))
            assert signature not in signatures, (key, signature)
            signatures.add(signature)
        if kind in ('C', 'L', 'F', 'M'):
            assert not inputs and item['sources'] == [SECTOR[kind]], key
        elif kind.startswith('I'):
            assert inputs and set(item['sources']) == source_sectors(key), key
            assert '矿业' in item['sources'] if kind == 'IM' else item['sources'] == [SECTOR[kind]], key
            for dependency in inputs:
                dependency_kind, dependency_number = ID.fullmatch(dependency).groups()
                if kind == 'IM':
                    assert dependency_kind in ('M', 'I', 'IL', 'IF') or (
                        dependency_kind == 'IM' and int(dependency_number) < int(number)), (key, dependency)
                else:
                    assert dependency_kind == kind[1:] or (kind == 'I' and dependency_kind == 'C') or (
                        dependency_kind == kind and int(dependency_number) < int(number)), (key, dependency)
        else:
            assert inputs and all(items[dependency]['kind'].startswith('I') for dependency in inputs), key
            sectors = source_sectors(key)
            expected = {'P': {'农业'}, 'PL': {'畜牧'}, 'PF': {'水产'}, 'PT': {'农业', '畜牧', '水产'}}
            assert sectors == set(item['sources']), key
            if kind == 'PM':
                assert '矿业' in sectors, key
                assert 0 <= item['level'] - len(sectors) <= 27 and (item['level'] - len(sectors)) % 3 == 0, key
            else:
                assert '矿业' not in sectors, key
                assert len(sectors) == 2 if kind == 'PD' else sectors == expected[kind], key
        uses.update({dependency: int(amount) for dependency, amount in inputs.items()})

    # Frozen 525-ID exemption: only pairs of original items may share nearby durations.
    original_max = {'C': 68, 'L': 10, 'F': 10, 'I': 127, 'IL': 10, 'IF': 10,
                    'P': 180, 'PL': 20, 'PF': 20, 'PD': 20, 'PT': 50}
    original_ids = {f'{kind}{rank:02}' for kind, count in original_max.items() for rank in range(1, count + 1)}
    by_duration = sorted(items, key=lambda key: items[key]['durationMs'])
    for first, second in zip(by_duration, by_duration[1:]):
        if first in original_ids and second in original_ids:
            continue
        assert items[second]['durationMs'] - items[first]['durationMs'] > 10000, ('新增品项周期冲突', first, second)
    for key, original in snapshot['items'].items():
        item = items[key]
        assert all(item.get(field) == original.get(field) for field in ('inputs', 'kind', 'sources', 'level')), key

    weighted_seconds, targets, rates, quantities, cycles, prices = {}, {}, {}, {}, {}, {}
    pending = set(items)
    while pending:
        ready = [key for key in items if key in pending and items[key]['inputs'].keys() <= weighted_seconds.keys()]
        assert ready, ('生产依赖有环或未知 ID', pending)
        for key in ready:
            item = items[key]
            inputs = {dependency: int(amount) for dependency, amount in item['inputs'].items()}
            q = 1 + isqrt(uses[key] // 2)
            assert item['durationMs'] % 1000 == 0 and item['output'] == str(q), key
            t = item['durationMs'] // 1000
            assert minimum[key] <= t <= 43200, key
            a = sum(Fraction(amount, quantities[dependency]) * weighted_seconds[dependency]
                    for dependency, amount in inputs.items())
            if inputs:
                lower = max([minimum[key], *(
                    max(ceil(Fraction(11 * cycles[dep], 10)), ceil(Fraction(11 * amount * cycles[dep], 10 * quantities[dep])))
                    for dep, amount in inputs.items()
                )])
                threshold = Fraction(11, 10) * sum(targets[dep] for dep in inputs)
                assert t >= lower and 1 + (t + a) / 3 - Fraction(q, t) >= threshold, key
                assert t == lower or 1 + (t - 1 + a) / 3 - Fraction(q, t - 1) < threshold, key
            else:
                assert t == minimum[key], key
            h = Fraction(t) + a
            target = 1 + h / 3
            p = floor(scale * t * target / q)
            assert p >= 10 and item['price'] == str(p), key
            rate = Fraction(p * q, t)
            if inputs:
                assert 5 * p * q >= 6 * sum(prices[dep] * amount for dep, amount in inputs.items()), key
                assert rate > Fraction(11, 10) * sum(rates[dep] for dep in inputs), key
            weighted_seconds[key], targets[key], rates[key] = h, target, rate
            quantities[key], cycles[key], prices[key] = q, t, p
        pending.difference_update(ready)

    groups = {}
    for key, hours in weighted_seconds.items():
        groups.setdefault(hours, []).append(rates[key])
    ordered_groups = [groups[hours] for hours in sorted(groups)]
    assert all(max(previous) < min(current) for previous, current in zip(ordered_groups, ordered_groups[1:]))

    totals = {key: 0 for key in game['initial']}
    pending = set(research)
    while pending:
        ready = [key for key in research if key in pending and set(research[key]['requires']) <= totals.keys()]
        assert ready, ('研发依赖有环或未知 ID', pending)
        for key in ready:
            name, prerequisites, materials = research_rows[key]
            node = research[key]
            requires, costs = listed_ids(prerequisites), listed_ids(materials)
            assert name == items[key]['name'] and requires == node['requires'] and costs == list(node['costs']), key
            assert set(requires) >= set(costs) | items[key]['inputs'].keys(), key
            if key in snapshot['research']:
                original = snapshot['research'][key]
                assert requires == original['requires'] and set(costs) == original['costs'].keys(), key
            h = weighted_seconds[key]
            m0 = sum(prices[dep] for dep in costs)
            total = max(ceil(scale * (30 + h / 2) * targets[key]), ceil(Fraction(5 * m0, 2)), m0 + 10 * scale,
                        *(totals[dep] for dep in requires if items[dep]['inputs']))
            seconds = max(300, min(3600, ceil(h)))
            extra = Fraction(max(0, total // 3 - m0), len(costs)) if costs else 0
            expected = {
                dep: min(1 + floor(extra / prices[dep]), max(1, seconds * quantities[dep] // cycles[dep]))
                for dep in costs
            }
            value = sum(prices[dep] * amount for dep, amount in expected.items())
            assert node['costs'] == {dep: str(amount) for dep, amount in expected.items()}, key
            assert node['coins'] == str(total - value) and 5 * value <= 2 * total, key
            totals[key] = total
        pending.difference_update(ready)

    coins = {key: int(node['coins']) for key, node in research.items()}
    unlock_quotes = sorted(coins.values())
    recipe_quotes = sorted(coins[key] for key in coins if items[key]['kind'].startswith('P'))
    expected_caps = {
        'recipeTrio': sum(recipe_quotes[:3]) // 2,
        'recipeCollection': sum(recipe_quotes[:25]) // 2,
        'itemCollection': sum(unlock_quotes) // 2,
    }
    for task, threshold in (('codex20', 20), *((f'collection{n}', n) for n in (100, 200, 300, 400))):
        expected_caps[task] = sum(unlock_quotes[:threshold - len(game['initial'])]) // 2
    for task, key in zip(('milleCrepe', 'threeSectorGift', 'livestockTop', 'fishTop', 'miningTop', 'miningProduct'),
                         ('P150', 'PT50', 'L10', 'F10', 'M10', 'PM14')):
        expected_caps[task] = coins[key] // 2
    for task, target in (
        ('qualityCollection', 6), ('quality25', 30), ('quality50', 120),
        ('qualityMaster', 360), ('quality200', 1080), ('quality400', 3240),
    ):
        expected_caps[task] = 100 * scale * target
    caps = json.loads((CONTENT / 'task-coin-caps.json').read_text())
    assert caps == {key: str(value) for key, value in expected_caps.items()}
    assert all(value >= 1 for value in expected_caps.values())

    print(f"{len(items)} 个品项、{sum(bool(item['inputs']) for item in items.values())} 条配方、"
          f"{len(research)} 个研发节点、{len(caps)} 项任务金币上限独立复算通过。")


if __name__ == '__main__':
    validate()
