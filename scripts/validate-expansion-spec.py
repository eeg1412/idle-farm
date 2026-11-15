"""Regenerate the original 1.14 tables and verify the full expansion catalogue."""
import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / 'docs/expansion'
OLD = json.loads((ROOT / 'src/content/catalog.json').read_text())
T = OLD['items']
RESEARCH = OLD['research']
MARK = re.compile(r'^(C|L|F|IL|IF|I|PL|PF|PD|PT|P)\d+$')
CROP_USE_IDS = [f'{kind}{rank}' for kind, ranks in [('C', range(51, 69)), ('I', range(101, 128)), ('P', range(151, 181))]
                for rank in ranks]


def div_up(a, b):
    return -(-a // b)


def group(key):
    return MARK.fullmatch(key)[1]


def rows(name):
    for line in (DOC / name).read_text().splitlines():
        cols = [value.strip() for value in line.strip('|').split('|')]
        if line.startswith('| ') and MARK.fullmatch(cols[0]):
            yield cols


def parse_inputs(text):
    if text == '—':
        return {}
    parts = [part.split('×') for part in text.split(' + ')]
    out = {key: int(amount) for amount, key in parts}
    assert len(out) == len(parts) and all(amount > 0 for amount in out.values())
    return out


def format_inputs(costs):
    return ' + '.join(f'{amount}×{key}' for key, amount in costs.items()) or '—'


def table(headers, body):
    return '\n'.join(['| ' + ' | '.join(headers) + ' |',
                     '| ' + ' | '.join('---' for _ in headers) + ' |',
                     *['| ' + ' | '.join(map(str, row)) + ' |' for row in body]])


def crop_use_rows(filename, columns):
    extension = {}
    for row in rows(filename):
        key = row[0]
        if key in CROP_USE_IDS:
            assert len(row) == columns and key not in extension, (filename, key)
            extension[key] = row
    assert extension.keys() == set(CROP_USE_IDS), filename
    return [extension[key] for key in CROP_USE_IDS]


def research_order(research, initial):
    reached = set(initial)
    pending = list(research)
    while pending:
        ready = [key for key in pending if research[key]['deps'] <= reached]
        assert ready, pending
        reached.update(ready)
        for key in ready:
            pending.remove(key)
        yield from ready


def add_crop_uses(entries, research, signatures):
    catalogue_rows = crop_use_rows('05-catalog.md', 6)
    research_rows = crop_use_rows('06-research.md', 5)
    names = {entry['name'] for entry in entries.values()}
    for key, name, raw_seconds, raw_count, raw_price, recipe in catalogue_rows:
        seconds, count, price = map(int, (raw_seconds, raw_count, raw_price))
        kind = group(key)
        costs = parse_inputs(recipe)
        assert key not in entries and name and name not in names, key
        assert 0 < seconds <= {'C': 300, 'I': 600, 'P': 1800}[kind] and count > 0 and price > 0, key
        if kind == 'C':
            assert not costs, key
        else:
            allowed = {'C', 'I'} if kind == 'I' else {'I'}
            assert count == 1 and costs and all(k in entries and group(k) in allowed for k in costs), key
            assert price > sum(entries[k]['price'] * amount for k, amount in costs.items()), key
            signature = tuple(sorted(costs.items()))
            assert signature not in signatures, (key, signature)
            signatures.add(signature)
        entries[key] = dict(name=name, seconds=seconds, count=count, price=price, costs=costs, subject=None)
        names.add(name)

    for key, name, prereqs, raw_coins, materials in research_rows:
        coins = int(raw_coins)
        deps = [] if prereqs == '—' else prereqs.split('、')
        costs = parse_inputs(materials)
        assert key not in research and entries[key]['name'] == name, key
        assert coins > 0, key
        assert len(set(deps)) == len(deps) and key not in deps and set(deps) <= entries.keys(), key
        assert costs and (costs.keys() | entries[key]['costs'].keys()) <= set(deps), key
        research[key] = dict(coins=coins, costs=costs, deps=set(deps))
    return catalogue_rows, research_rows


def by_kind(kinds, legacy, expansion):
    for kind in kinds:
        yield from (row for row in legacy if group(row[0]) == kind)
        yield from (row for row in expansion if group(row[0]) == kind)


def spec(write):
    entries = {}
    research = {}
    anchors = ['C02','C04','C08','C11','C17','C22','C28','C35','C42','C50']

    def add(key, name, seconds, count, price, costs=None, subject=None):
        assert key not in entries and all(v > 0 for v in (seconds, count, price))
        entries[key] = dict(name=name, seconds=seconds, count=count, price=price,
                            costs=costs or {}, subject=subject)

    def value(costs):
        return sum(entries[key]['price'] * amount for key, amount in costs.items())

    for key, x in T.items():
        kind, rank = group(key), int(key[1:])
        if kind not in {'C', 'I'}:
            continue
        duration, count, old_price = x['durationMs'] // 1000, int(x['output']), int(x['price'])
        costs = {key: int(n) for key, n in x['inputs'].items()}
        if kind == 'C':
            price = old_price if rank <= 3 else div_up(7 * old_price, 10)
        else:
            cost = value(costs)
            price = old_price if rank <= 3 else max(div_up(62 * old_price, 100),
                                                   cost + max(div_up(cost, 3), div_up(duration, 2)))
        add(key, x['name'], duration, count, price, costs)

    sector_rows = list(rows('02-livestock-fish.md'))
    for key, subject, name, seconds, count, *_ in (row for row in sector_rows if group(row[0]) in {'L', 'F'}):
        rank = int(key[1:])
        base = entries[anchors[rank-1]]
        rate = 11 if key.startswith('L') else 12
        price = div_up(rate * base['price'] * base['count'] * int(seconds),
                       base['seconds'] * int(count))
        add(key, name, int(seconds), int(count), price, subject=subject)
    for key, name, material, seconds, *_ in (row for row in sector_rows if group(row[0]) in {'IL', 'IF'}):
        costs = parse_inputs(material)
        cost = value(costs)
        add(key, name, int(seconds), 1, cost + max(div_up(42 * cost, 100), int(seconds)), costs)

    crop_products = []
    for key, x in T.items():
        if group(key) != 'P':
            continue
        rank = int(key[1:])
        costs = {item: int(amount) for item, amount in x['inputs'].items()}
        if rank > 3:
            cap_kinds = 2 + (rank >= 31) + (rank >= 100)
            # Keep the named recipe's primary ingredients in their listed order.
            if rank > 100:
                cap_kinds = 4
            cap_units = min(12, 3 + rank // 16)
            costs = dict(list(costs.items())[:cap_kinds])
            costs = {item: min(3, amount) for item, amount in costs.items()}
            while sum(costs.values()) > cap_units:
                top = max(costs, key=costs.get)
                costs[top] -= 1
        crop_products.append((key, x, costs))

    used = set()
    for key, x, costs in crop_products:
        rank = int(key[1:])
        sig = tuple(sorted(costs.items()))
        if sig in used:
            original = x['inputs']
            limit = min(12, 3 + rank // 16)
            # Preserve the same set of named ingredients; change the batch proportions.
            from itertools import product
            for quantities in product(range(1, 5), repeat=len(costs)):
                attempt = dict(zip(costs, quantities))
                if sum(quantities) <= limit and tuple(sorted(attempt.items())) not in used:
                    costs = attempt
                    break
            else:
                for ingredient in original:
                    if ingredient not in costs and sum(costs.values()) < limit:
                        attempt = {**costs, ingredient: 1}
                        if tuple(sorted(attempt.items())) not in used:
                            costs = attempt
                            break
                else:
                    raise ValueError(f'Cannot keep recipe unique {key}')
        used.add(tuple(sorted(costs.items())))
        duration = x['durationMs'] // 1000
        if rank > 3:
            duration = 20 + div_up((duration - 20) * 7, 10)
        price = int(x['price']) if rank <= 3 else value(costs) + max(div_up(value(costs), 4), div_up(duration, 3))
        add(key, x['name'], duration, 1, price, costs)

    grade_prices = defaultdict(dict)
    grade_units = defaultdict(dict)

    def grade(key):
        code = group(key)
        rank = int(key[len(code):])
        return div_up(rank * 10, {'P': 150, 'PL': 20, 'PF': 20, 'PD': 20, 'PT': 50}[code])

    for key, x in entries.items():
        if group(key) == 'P':
            g = grade(key)
            grade_prices['P'][g] = max(grade_prices['P'].get(g, 0), x['price'])
            grade_units['P'][g] = max(grade_units['P'].get(g, 0), sum(x['costs'].values()))

    for filename in ('03-single-sector-products.md', '04-mixed-products.md'):
        for key, name, text, seconds in rows(filename):
            code = group(key)
            g = grade(key)
            costs = parse_inputs(text)
            if code in {'PD', 'PT'}:
                lower = 6 + 3 * (g - 1) if code == 'PD' else 13 + 4 * (g - 1)
                prior = max(grade_units['PL'][g], grade_units['PF'][g], grade_units['P'][g]) if code == 'PD' else grade_units['PD'][g]
                lower = max(lower, prior + 1)
                # Add volume only to ingredients already in the hand-authored recipe.
                sorted_keys = sorted(costs, key=costs.get, reverse=True)
                for i in range(max(0, lower - sum(costs.values()))):
                    costs[sorted_keys[i % len(sorted_keys)]] += 1
            cost = value(costs)
            margin = {'PL': 35, 'PF': 35, 'PD': 50, 'PT': 65}[code]
            if code in {'PL', 'PF'}:
                prev = grade_prices['P'][g]
            elif code == 'PD':
                prev = max(grade_prices['PL'][g], grade_prices['PF'][g])
            else:
                prev = grade_prices['PD'][g]
            price = max(cost + max(div_up(cost * margin, 100), int(seconds)), div_up(11 * prev, 10))
            grade_prices[code][g] = max(grade_prices[code].get(g, 0), price)
            grade_units[code][g] = max(grade_units[code].get(g, 0), sum(costs.values()))
            add(key, name, int(seconds), 1, price, costs)

    assert Counter(group(x) for x in entries) == {
        'C':50,'L':10,'F':10,'I':100,'IL':10,'IF':10,'P':150,'PL':20,'PF':20,'PD':20,'PT':50}
    assert len({x['name'] for x in entries.values()}) == len(entries)
    origin = {'I':'农','IL':'畜','IF':'鱼'}
    signatures = set()
    pairs = Counter()
    for key, x in entries.items():
        kind, costs = group(key), x['costs']
        if not costs:
            continue
        assert x['count'] == 1 and x['price'] > value(costs)
        signature = tuple(sorted(costs.items()))
        assert signature not in signatures, (key, signature)
        signatures.add(signature)
        if kind in ('I','IL','IF'):
            raw = {'I':'C','IL':'L','IF':'F'}[kind]
            assert all(group(k) == raw or group(k) == kind and int(k[len(kind):]) < int(key[len(kind):]) for k in costs)
            assert x['seconds'] <= 600
        else:
            sources = {origin[group(k)] for k in costs}
            if kind == 'PD':
                pairs[tuple(sorted(sources))] += 1
            expected = {'P':{'农'},'PL':{'畜'},'PF':{'鱼'},'PT':{'农','畜','鱼'}}
            assert len(sources) == 2 if kind == 'PD' else sources == expected[kind]
            assert x['seconds'] <= 1800
    assert sorted(pairs.values()) == [6, 7, 7]
    for key, entry in entries.items():
        code = group(key)
        if code not in {'PL', 'PF', 'PD', 'PT'}:
            continue
        g = grade(key)
        earlier = {'PL': ('P',), 'PF': ('P',), 'PD': ('P', 'PL', 'PF'), 'PT': ('PD',)}[code]
        assert entry['price'] * 10 >= 11 * max(grade_prices[other][g] for other in earlier), key
        if code in {'PD', 'PT'}:
            assert sum(entry['costs'].values()) > max(grade_units[other][g] for other in earlier), key
    for raw in ('C','L','F'):
        assert max(x['seconds'] for key,x in entries.items() if group(key)==raw) == 300
    for kind, factor in (('L', 11), ('F', 12)):
        for rank, anchor in enumerate(anchors, 1):
            entry = entries[f'{kind}{rank:02d}']
            base = entries[anchor]
            assert entry['price'] * entry['count'] * base['seconds'] >= (
                factor * base['price'] * base['count'] * entry['seconds'])

    first = {'C01','I01'}
    # Historical days reproduce the original material multipliers for the base expansion.
    # The active table contains the resulting quantities and prerequisites only.
    legacy_cost_days = dict.fromkeys(first, 0)
    raw_days = [0,0,7,30,60,90,150,210,270,300]
    for key, x in entries.items():
        if key in first:
            continue
        code = group(key)
        rank = int(key[len(code):])
        if key in RESEARCH:
            old = RESEARCH[key]
            day = min(old['availableAfterDays'], 300)
            if code == 'P' and rank > 3:
                materials = {item: min(amount, 3) for item, amount in x['costs'].items()}
                coins = div_up(int(old['coins']) * 55, 100)
            else:
                materials = {item: int(amount) for item, amount in old['costs'].items()}
                coins = int(old['coins'])
        elif code in {'L', 'F'}:
            day = raw_days[rank-1]
            anchor = anchors[rank-1]
            coins = 10 * int(RESEARCH[anchor]['coins'])
            materials = {'C01': 6} if rank == 1 else {'C01': 12} if rank == 2 else {
                f'{code}{rank-1:02d}': 4 + rank, 'I01': 2 + rank}
        elif code in {'IL', 'IF'}:
            day = raw_days[rank-1]
            coins = x['price'] * 3
            materials = {item: 2 * amount for item, amount in x['costs'].items()}
        else:
            day = {'PL':0,'PF':0,'PD':0,'PT':1}[code] if rank <= (3 if code == 'PD' else 2) else {
                'PL':1,'PF':1,'PD':7,'PT':30}[code]
            if code == 'PT' and rank >= 21:
                day = 150 if rank <= 30 else 270 if rank <= 40 else 330
            if key == 'PT50':
                day = 365
            coins = x['price'] * {'PL':2,'PF':2,'PD':3,'PT':4}[code]
            materials = {item: amount for item, amount in x['costs'].items()}
        deps = set(materials) | set(x['costs'])
        if key in RESEARCH:
            if code in {'C','I'} or rank <= 3:
                deps.update(RESEARCH[key]['requires'])
            elif code == 'P':
                # Preserve the explicit starter line while avoiding legacy product-based cost chains.
                deps.update(k for k in RESEARCH[key]['requires'] if k in {'P01','P02','P03'})
        if code in {'L','F'} and rank > 1:
            deps.add(f'{code}{rank-1:02d}')
        if key == 'PT50':
            deps.add('PT49')
        research[key] = dict(coins=coins, costs=materials, deps=deps)
        legacy_cost_days[key] = day

    for key in research_order(research, first):
        node = research[key]
        day = max([legacy_cost_days[key], *(legacy_cost_days[k] for k in node['deps'])])
        legacy_cost_days[key] = day
        if group(key) in {'C','I'}:
            multiplier = RESEARCH[key]['materialMultiplier']
        elif group(key) == 'P':
            multiplier = min(RESEARCH[key]['materialMultiplier'], 128)
        else:
            multiplier = next(m for d,m in [(0,1),(30,2),(90,4),(150,8),(210,12),(270,16),(330,24),(365,32)] if day <= d)
        node['costs'] = {item: amount * multiplier for item, amount in node['costs'].items()}
    for kind in ('L', 'F'):
        for rank, anchor in enumerate(anchors, 1):
            assert research[f'{kind}{rank:02d}']['coins'] == 10 * int(RESEARCH[anchor]['coins'])

    # Keep all existing figures reproducible and retain new rows as authored, including their dependency order.
    catalogue_rows = [(k, x['name'], x['seconds'], x['count'], x['price'], format_inputs(x['costs']))
                      for k, x in entries.items()]
    research_rows = [(k, entries[k]['name'], '、'.join(sorted(n['deps'])) or '—', n['coins'], format_inputs(n['costs']))
                     for k, n in research.items()]
    crop_catalogue_rows, crop_research_rows = add_crop_uses(entries, research, signatures)
    assert first.union(research_order(research, first)) == entries.keys()

    # Aggregate demand once in reverse production order so shared ingredients use the same stock.
    demand = Counter()
    for node in research.values():
        demand.update(node['costs'])
    work = Counter()
    for key, entry in reversed(list(entries.items())):
        if not entry['costs']:
            continue
        batches = div_up(demand[key], entry['count'])
        work['加工' if group(key).startswith('I') else '精制'] += batches * entry['seconds']
        demand.update({k: n * batches for k, n in entry['costs'].items()})

    catalogue = ['# 5. 完整物品与生产配方', '', '[返回目录](README.md)', '',
                 '所有价格为品质 1 的基准单价，金币与产量均为整数。每条投入为开批时实际扣料，耗时为基础秒数。原料表的产量是一级设施的每批件数。', '']
    for kinds, title in [(('C','L','F'),'原料'),(('I','IL','IF'),'中间产物'),(('P',),'农业商品'),
                         (('PL','PF'),'畜牧与水产商品'),(('PD','PT'),'复合商品')]:
        catalogue += ['## ' + title, '', table(['ID','名称','基础秒数','每批产出','基准单价','每批投入'],
                     by_kind(kinds, catalogue_rows, crop_catalogue_rows)), '']
    rules = ['# 6. 完整研发条件', '', '[返回目录](README.md)', '',
             '每项研发按表中所列前置、金币和实物成本解锁。表中实物数量为永久科技折扣前的成本。小麦和面粉在新档直接解锁。', '']
    for kinds, title in [(('C','L','F'),'种子、牲畜与鱼类'),(('I','IL','IF'),'加工配方'),(('P',),'农业商品'),
                         (('PL','PF','PD','PT'),'新商品')]:
        rules += ['## '+title, '', table(['ID','名称','前置研发或初始品项','金币','所需实物'],
                  by_kind(kinds, research_rows, crop_research_rows)), '']
    def sync_source_tables():
        for filename in ('02-livestock-fish.md', '03-single-sector-products.md', '04-mixed-products.md'):
            path = DOC / filename
            content = path.read_text()
            result = []
            for line in content.splitlines():
                cols = [part.strip() for part in line.strip('|').split('|')]
                if line.startswith('| ') and MARK.fullmatch(cols[0]):
                    key = cols[0]
                    item = entries[key]
                    if filename.startswith('02'):
                        cols[-1] = str(item['price'])
                    else:
                        cols[2] = format_inputs(item['costs'])
                    line = '| ' + ' | '.join(cols) + ' |'
                result.append(line)
            result = '\n'.join(result) + '\n'
            if write:
                path.write_text(result)
            else:
                assert result == content, filename

    sync_source_tables()
    for filename, lines in [('05-catalog.md',catalogue), ('06-research.md',rules)]:
        path = DOC / filename
        content = '\n'.join(lines)
        if write:
            path.write_text(content)
        else:
            assert path.read_text() == content, filename
    recipes = sum(bool(entry['costs']) for entry in entries.values())
    products = sum(group(key).startswith('P') for key in entries)
    print(f'{len(entries)} items, {recipes} recipes, {len(research)} research nodes, {products} products; all verified')
    for key in ('C01','L01','F01','C50','L10','F10','I01','IL01','IF01','P01','P150','PL20','PF20','PD20','PT50',
                'C51','I101','P151','P160','P169','P175','P180'):
        x = entries[key]
        old_price = T.get(key, {}).get('price')
        print(key, x['name'], 'price',x['price'],'old',old_price,'cost',value(x['costs']),
              'kinds',len(x['costs']),'units',sum(x['costs'].values()))
    legacy_crop_products = [key for key in T if group(key) == 'P']
    print('Original agricultural product price reductions:',
          sum(entries[key]['price'] < int(T[key]['price']) for key in legacy_crop_products))
    print('Original agricultural product ingredient volume reductions:',
          sum(sum(entries[key]['costs'].values()) < sum(map(int, T[key]['inputs'].values())) for key in legacy_crop_products))
    print('Research material workloads at base speed and cost:', dict(work))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true', help='Regenerate the expansion Markdown tables')
    spec(parser.parse_args().write)
