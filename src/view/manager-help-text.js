// Help copy is separate from the world queries: these functions only describe facts supplied by the caller.
const say = (female, male) => ({ female, male });
const quote = (value) => '「' + value + '」';
const at = ({ index, place }) => '第' + index + '个' + place;
const productionCopy = {
  tasks: say({
    buy: (d) => '要先有个生产的地方。点' + quote(d.purchase) + '，金额合适就点「确认购买」。',
    buyMore: (d) => '再建一座吧。点' + quote(d.purchase) + '，金额合适就点「确认购买」。',
    addMore: (d) => '再添' + d.what + '吧。点' + quote(d.purchase) + '，金额合适就点「确认购买」。',
    funds: (d) => '钱还差一点，别急。先去仓库挑几样点「出售」，凑够了再点' + quote(d.purchase) + '。',
    upgradeFunds: () => '升级的钱还差一点，别急。先去仓库挑几样点「出售」，凑够了再点「批量管理」升级。',
    empty: (d) => '放' + at(d) + '就好。点' + quote(d.button) + '，选' + quote(d.name) + '。',
    locked: (d) => quote(d.name) + '还没解锁呢。去研究的「品种配方」找到它，条件够了点「研发」，再回来排。',
    running: (d) => quote(d.name) + '在做了。等倒计时走完，入库就算数。',
    ready: (d) => quote(d.name) + '排好了，料一齐就自己开工、自己入库，不用再管。',
    missing: (d) => at(d) + '还缺' + quote(d.item) + '。点「查看来源」去找，' + (d.name ? quote(d.name) : '这一批') + '等料齐了就开工。',
    upgrade: (d) => '要一处' + d.place + '升到' + d.target + '级。点「批量管理」勾上它，「升级」，再「确认升级」。',
    upgradeReady: (d) => '有' + d.place + '能升级了，升了产得多。点「批量管理」，「全选」，「升级」，再「确认升级」。',
  }, {
    buy: (d) => '还没有生产位置。点' + quote(d.purchase) + '，金额没问题就点「确认购买」。',
    buyMore: (d) => '再添一座。点' + quote(d.purchase) + '，金额没问题就点「确认购买」。',
    addMore: (d) => '再添' + d.what + '。点' + quote(d.purchase) + '，金额没问题就点「确认购买」。',
    funds: (d) => '购置费不够。去仓库「出售」些货，够了再点' + quote(d.purchase) + '。',
    upgradeFunds: () => '升级费不够。去仓库「出售」些货，够了再点「批量管理」升级。',
    empty: (d) => quote(d.name) + '，放' + at(d) + '。点' + quote(d.button) + '选它。',
    locked: (d) => '先解锁' + quote(d.name) + '：研究的「品种配方」，条件齐了点「研发」，然后回来排。',
    running: (d) => quote(d.name) + '在生产。任务按入库算，等这批倒计时结束。',
    ready: (d) => quote(d.name) + '已排定。料齐会自己开工入库，这里没有要你做的了。',
    missing: (d) => at(d) + '缺' + quote(d.item) + '。点「查看来源」补上，' + (d.name ? quote(d.name) : '这一批') + '料齐即开工。',
    upgrade: (d) => '需要一处' + d.place + '到' + d.target + '级。点「批量管理」选中，「升级」，再「确认升级」。',
    upgradeReady: (d) => d.place + '可以升级了。点「批量管理」，「全选」，「升级」，再「确认升级」，一次办完。',
  }),
  field: say({
    buy: (d) => '再开一块田，就能多种一份了。点' + quote(d.purchase) + '，看过花费点「确认购买」。',
    funds: (d) => '添田的钱还差些。去仓库挑点货「出售」，攒够再来点' + quote(d.purchase) + '。',
    upgradeFunds: () => '升级的钱还差些。去仓库挑点货「出售」，攒够再来点「批量管理」。',
    empty: (d) => at(d) + '的土还空着。点' + quote(d.button) + '，种上' + quote(d.name) + '吧。',
    locked: (d) => quote(d.name) + '的种子还没有呢。去研究的「品种配方」看看要什么，备好了点「研发」。',
    running: (d) => quote(d.name) + '正长着，等倒计时走完。收成会自己入库，不用另点采收。',
    ready: (d) => quote(d.name) + '选好了。料齐就开工，熟了自己入库。',
    upgrade: (d) => '想要一块' + d.target + '级的田。点「批量管理」选那块，「升级」，再「确认升级」。',
    upgradeReady: (d) => '有几块田能升级了，升过的收得多。点「批量管理」，「全选」，「升级」，再「确认升级」。',
  }, {
    buy: (d) => '添块田。点' + quote(d.purchase) + '，花费看准了再「确认购买」，钱别乱花。',
    funds: (d) => '钱不够，别硬买。仓库里能「出售」的先卖点，够了再点' + quote(d.purchase) + '。',
    upgradeFunds: () => '钱不够，别硬升。仓库里能「出售」的先卖点，够了再点「批量管理」。',
    empty: (d) => at(d) + '空着，可惜了。点' + quote(d.button) + '，把' + quote(d.name) + '种下。',
    locked: (d) => '没' + quote(d.name) + '的种。去研究的「品种配方」，条件凑齐了点「研发」。',
    running: (d) => quote(d.name) + '在长，别动它。倒计时到了自己入库。',
    ready: (d) => quote(d.name) + '排上了。料齐自己开工，收成自己入库，省事。',
    upgrade: (d) => '要块' + d.target + '级田。点「批量管理」选一块，「升级」，再「确认升级」。',
    upgradeReady: (d) => '田能升了，升了多收，划算。点「批量管理」，「全选」，「升级」，「确认升级」。',
  }),
  livestock: say({
    buy: (d) => '添个养殖场吧！点' + quote(d.purchase) + '，「确认购买」完就能挑小家伙了！',
    buyMore: (d) => '再盖一个养殖场吧，能多养好多小家伙！点' + quote(d.purchase) + '，然后「确认购买」！',
    funds: (d) => '哎呀，钱还差点！去仓库「出售」些货，够了快回来点' + quote(d.purchase) + '！',
    upgradeFunds: () => '哎呀，升级的钱还差点！去仓库「出售」些货，够了快回来点「批量管理」！',
    empty: (d) => at(d) + '空空的！点' + quote(d.button) + '，把' + quote(d.name) + '接进来！',
    locked: (d) => '想养' + quote(d.name) + '？先去研究的「品种配方」，条件凑齐点「研发」！',
    running: (d) => quote(d.name) + '正吃得香呢！倒计时一完，产物自己入库！',
    ready: (d) => quote(d.name) + '安排好啦！料一齐就开工，产物自己进仓库！',
    upgrade: (d) => '要一处' + d.target + '级养殖场！点「批量管理」选上，「升级」，再「确认升级」！',
    upgradeReady: (d) => '养殖场能升级啦！点「批量管理」，「全选」，「升级」，「确认升级」，一下全升好！',
  }, {
    buy: (d) => '先盖个养殖场，动物才有地方待。点' + quote(d.purchase) + '，看着合适就「确认购买」。',
    buyMore: (d) => '再盖一个养殖场，地方宽敞些。点' + quote(d.purchase) + '，看着合适就「确认购买」。',
    funds: (d) => '钱差一点，不急。去仓库「出售」点货，够了再来点' + quote(d.purchase) + '。',
    upgradeFunds: () => '升级的钱差一点，不急。去仓库「出售」点货，够了再来点「批量管理」。',
    empty: (d) => at(d) + '空着呢，养' + quote(d.name) + '怎么样？点' + quote(d.button) + '选它就行。',
    locked: (d) => quote(d.name) + '还得先研发。研究的「品种配方」里看看条件，够了点「研发」。',
    running: (d) => quote(d.name) + '养着呢，慢慢来。倒计时走完，产物自己入库。',
    ready: (d) => quote(d.name) + '排上了。料齐了自己开工，产物也自己进仓。',
    upgrade: (d) => '要个' + d.target + '级的养殖场。点「批量管理」选好，「升级」，再「确认升级」就成。',
    upgradeReady: (d) => '养殖场能升了，往后多出些。有空点「批量管理」，「全选」，「升级」，再「确认升级」。',
  }),
  fish: say({
    buy: (d) => '先把鱼塘买下，养鱼交给我！点' + quote(d.purchase) + '，然后「确认购买」！',
    buyMore: (d) => '再来一口鱼塘，我照样养得好！点' + quote(d.purchase) + '，然后「确认购买」！',
    funds: (d) => '钱不够？那就先出货！仓库里「出售」一批，够了回来点' + quote(d.purchase) + '！',
    upgradeFunds: () => '升级的钱不够？那就先出货！仓库里「出售」一批，够了回来点「批量管理」！',
    empty: (d) => at(d) + '就养' + quote(d.name) + '！点' + quote(d.button) + '，选它！',
    locked: (d) => quote(d.name) + '还没研发出来。去研究的「品种配方」，条件够了点「研发」，我等着！',
    running: (d) => quote(d.name) + '在长了，这一轮我盯着！倒计时完自动入库。',
    ready: (d) => quote(d.name) + '排好了！料齐就开工，产物自己入库。',
    upgrade: (d) => '要一处' + d.target + '级鱼塘！点「批量管理」选中，「升级」，「确认升级」，冲！',
    upgradeReady: (d) => '鱼塘能升级了！点「批量管理」，「全选」，「升级」，「确认升级」，一口气升上去！',
  }, {
    buy: (d) => '没鱼塘，鱼可没地方住。点' + quote(d.purchase) + '，价钱顺眼就「确认购买」。',
    buyMore: (d) => '一口塘有点挤，再挖一口。点' + quote(d.purchase) + '，价钱顺眼就「确认购买」。',
    funds: (d) => '钱包比鱼塘还浅啊。去仓库「出售」点货，回头再点' + quote(d.purchase) + '。',
    upgradeFunds: () => '钱包还撑不起升级啊。去仓库「出售」点货，回头再点「批量管理」。',
    empty: (d) => at(d) + '冷清得能听见回声，放' + quote(d.name) + '进去吧。点' + quote(d.button) + '就行。',
    locked: (d) => quote(d.name) + '还没研发，想钓也钓不着。去研究的「品种配方」，备齐点「研发」。',
    running: (d) => quote(d.name) + '在长呢，催它也不会游快点。倒计时完自己入库。',
    ready: (d) => quote(d.name) + '排上了。料齐自己开工，入库也不用咱们去捞。',
    upgrade: (d) => '这回要个' + d.target + '级鱼塘。点「批量管理」选中，「升级」，「确认升级」，完事。',
    upgradeReady: (d) => '鱼塘能升级了，好事。点「批量管理」，「全选」，「升级」，「确认升级」，一趟搞定。',
  }),
  mine: say({
    buy: (d) => '……先买矿洞。点' + quote(d.purchase) + '，「确认购买」。',
    buyMore: (d) => '……再开一个矿洞。点' + quote(d.purchase) + '，「确认购买」。',
    funds: (d) => '钱不够。……去仓库「出售」点货，再来点' + quote(d.purchase) + '。',
    upgradeFunds: () => '升级钱不够。……去仓库「出售」点货，再来点「批量管理」。',
    empty: (d) => at(d) + '。点' + quote(d.button) + '，选' + quote(d.name) + '。',
    locked: (d) => quote(d.name) + '……没研发。研究的「品种配方」，条件齐了点「研发」。',
    running: (d) => quote(d.name) + '在挖。等倒计时，自动入库。',
    ready: (d) => quote(d.name) + '，排好了。料齐就开工，入库不用管。',
    upgrade: (d) => '要' + d.target + '级矿洞。「批量管理」，选中，「升级」，「确认升级」。',
    upgradeReady: (d) => '矿洞能升级。「批量管理」，「全选」，「升级」，「确认升级」。',
  }, {
    buy: (d) => '没有矿洞不能开采。点' + quote(d.purchase) + '，金额核过再「确认购买」。',
    buyMore: (d) => '再开一座矿洞。点' + quote(d.purchase) + '，金额核过再「确认购买」。',
    funds: (d) => '金币不足，先别买。去仓库「出售」一部分货，够了再点' + quote(d.purchase) + '。',
    upgradeFunds: () => '金币不足，先别升。去仓库「出售」一部分货，够了再点「批量管理」。',
    empty: (d) => '开采放在' + at(d) + '。点' + quote(d.button) + '，选' + quote(d.name) + '。',
    locked: (d) => quote(d.name) + '还不能开采。研究的「品种配方」里条件满足后点「研发」，再回来安排。',
    running: (d) => quote(d.name) + '正在开采，别改动。倒计时结束会自动入库。',
    ready: (d) => quote(d.name) + '已选定。材料齐了自动开工、自动入库，不用另外操作。',
    upgrade: (d) => '要一处' + d.target + '级矿洞。点「批量管理」选中，「升级」，看过报价再「确认升级」。',
    upgradeReady: (d) => '矿洞可以升级了，开采会多。点「批量管理」，「全选」，「升级」，看过报价再「确认升级」。',
  }),
  processing: say({
    buy: (d) => '缺工位。点' + quote(d.purchase) + '，「确认购买」，开干。',
    funds: (d) => '差钱。仓库里「出售」一批，回来点' + quote(d.purchase) + '。',
    upgradeFunds: () => '升级差钱。仓库里「出售」一批，回来点「批量管理」。',
    empty: (d) => quote(d.name) + '放' + at(d) + '。点' + quote(d.button) + '，选它。',
    locked: (d) => quote(d.name) + '没解锁。研究的「品种配方」，条件齐了点「研发」。',
    running: (d) => quote(d.name) + '在做，等倒计时，做完自动入库。',
    ready: (d) => quote(d.name) + '排好了。料齐自己开工，做完自己入库。',
    missing: (d) => at(d) + '缺' + quote(d.item) + '，' + (d.name ? quote(d.name) : '这批') + '卡住了。点「查看来源」补上，料齐就开工。',
    idle: (d) => at(d) + '闲着。点「选择配方」，挑一样。',
    upgrade: (d) => '要一个' + d.target + '级' + d.place + '。点「批量管理」选上，「升级」，「确认升级」。',
    upgradeReady: (d) => d.place + '能升了。点「批量管理」，「全选」，「升级」，「确认升级」，完事。',
  }, {
    buy: (d) => '想多做一批，得先多一个工位。点' + quote(d.purchase) + '看看花费，没问题就点「确认购买」。',
    funds: (d) => '添工位的钱还不够，不着急。先去仓库把能卖的点「出售」，攒够了再回来点' + quote(d.purchase) + '。',
    upgradeFunds: () => '升级的钱还不够，不着急。先去仓库把能卖的点「出售」，攒够了再回来点「批量管理」。',
    empty: (d) => '先在' + at(d) + '做' + quote(d.name) + '。点' + quote(d.button) + '，在列表里找到它，选上就好。',
    locked: (d) => quote(d.name) + '的配方还没学会。去研究的「品种配方」看要什么，备齐了点「研发」，再回来。',
    running: (d) => quote(d.name) + '在做了，这一批还要些工夫。倒计时走完，产物会自己入库。',
    ready: (d) => quote(d.name) + '选好了。接下来等材料齐，它自己开工，做好自己入库。',
    missing: (d) => '还差' + quote(d.item) + '，' + at(d) + '要用。点「查看来源」看它从哪儿来，' + (d.name ? quote(d.name) : '这一批') + '料齐了就开工。',
    idle: (d) => at(d) + '想做什么？点「选择配方」，定下来再照着备料。',
    upgrade: (d) => '任务要一个' + d.target + '级的' + d.place + '。点「批量管理」选中它，点「升级」，再点「确认升级」。',
    upgradeReady: (d) => d.place + '能升级了，每批能多做些。点「批量管理」，先「全选」，再「升级」，最后「确认升级」。',
  }),
  refining: say({
    buy: (d) => '再添一处工房位。点' + quote(d.purchase) + '，金额看清楚，再「确认购买」。',
    funds: (d) => '金币不够。先去仓库「出售」些货，补足了再点' + quote(d.purchase) + '。',
    upgradeFunds: () => '升级的金币不够。先去仓库「出售」些货，补足了再点「批量管理」。',
    empty: (d) => at(d) + '台面是干净的，做' + quote(d.name) + '吧。点' + quote(d.button) + '选它。',
    locked: (d) => '还没有' + quote(d.name) + '的配方。研究的「品种配方」里条件备齐，点「研发」。',
    running: (d) => quote(d.name) + '在制作，别去碰。倒计时完，成品自己入库。',
    ready: (d) => quote(d.name) + '定了。料齐会自己开工，成品自己入库。',
    missing: (d) => at(d) + '少了' + quote(d.item) + '。点「查看来源」补上这一项，料齐就开工。',
    idle: (d) => at(d) + '还空着，先定做什么。点「选择配方」。',
    upgrade: (d) => '要一处' + d.target + '级' + d.place + '。点「批量管理」选中，「升级」，报价看过再「确认升级」。',
    upgradeReady: (d) => d.place + '可以升级了，出得多些。点「批量管理」，「全选」，「升级」，看过报价再「确认升级」。',
  }, {
    buy: (d) => '要多做一批，先把工房位添上。点' + quote(d.purchase) + '，花费看明白了点「确认购买」。',
    funds: (d) => '钱不够就先出货。去仓库「出售」一些，攒够再点' + quote(d.purchase) + '。',
    upgradeFunds: () => '升级钱不够就先出货。去仓库「出售」一些，攒够再点「批量管理」。',
    empty: (d) => quote(d.name) + '，我教你。到' + at(d) + '点' + quote(d.button) + '，从列表里挑它。',
    locked: (d) => quote(d.name) + '的配方还没到手。去研究的「品种配方」，条件够了点「研发」，学会了再做。',
    running: (d) => quote(d.name) + '火候还没到，等着。倒计时结束，成品自己入库。',
    ready: (d) => quote(d.name) + '选定了，就照这配方来。料齐自动开工，成品自动入库。',
    missing: (d) => at(d) + '缺' + quote(d.item) + '。点「查看来源」把它找齐，料一齐就开工。',
    idle: (d) => '想学哪样？' + at(d) + '空着，点「选择配方」定下来。',
    upgrade: (d) => '要一处' + d.target + '级' + d.place + '。点「批量管理」选中，「升级」，再「确认升级」，一级级来。',
    upgradeReady: (d) => d.place + '能升了，同样的手艺多出些成品。点「批量管理」，「全选」，「升级」，「确认升级」。',
  }),
};

export function helpVoice(speaker = {}, fallbackRole = 'tasks') {
  return { role: speaker.role ?? fallbackRole, gender: speaker.gender === 'male' ? 'male' : 'female' };
}

export function productionHelpCopy(speaker, type, details) {
  const voice = helpVoice(speaker);
  const table = productionCopy[voice.role]?.[voice.gender];
  // Page roles without an `addMore` line keep their own `buy` line, which already reads as adding one more.
  const copy = table?.[type] ?? (type === 'addMore' ? table?.buy : undefined) ?? productionCopy.tasks[voice.gender][type];
  return copy(details);
}

// Research guidance pieces. d.name: the item to research now; d.goal: the item it leads to ('' when the same);
// d.cost: optional { name, items: [{ name, amount }], coins } research cost to list; d.short: names of missing
// materials, the first described by d.locked (not unlocked), d.eaten (a station using it) and d.from (its producer);
// d.coins: coins are short. mode 'here' (research page), 'go' (after a destination prefix) or 'away' (other pages).
const researchNeed = (d, male) => !d.goal ? ''
  : male ? quote(d.goal) + '要先有' + quote(d.name) + '。' : '想做' + quote(d.goal) + '，先得有' + quote(d.name) + '。';
const researchAct = (d, male, mode) => ({
  here: male ? '点' + quote(d.name) + '，再点「研发」。' : '在这儿点' + quote(d.name) + '，再点「研发」。',
  go: male ? '「品种配方」里点' + quote(d.name) + '，「研发」。' : '在「品种配方」点' + quote(d.name) + '，再点「研发」。',
  away: male ? '到研究的「品种配方」点' + quote(d.name) + '，再点「研发」。' : '去研究的「品种配方」点' + quote(d.name) + '，再点「研发」。',
})[mode];
function researchCost(d, male) {
  if (!d.cost) return '';
  const items = d.cost.items.map((item) => item.amount + '份' + quote(item.name)).join('、');
  const list = (items ? items + '和' : '') + d.cost.coins + '金币';
  return (male ? quote(d.cost.name) + '的研发要' : '研发' + quote(d.cost.name) + '要') + list + '。';
}
function researchLack(d, male) {
  let text = '';
  if (d.short?.length) {
    const it = d.short.length === 1 ? '它' : quote(d.short[0]);
    text += (male ? '缺' : '还差') + d.short.map(quote).join('、');
    if (d.locked) text += male ? '，' + it + '得先研发' : '，' + it + '要先研发';
    else {
      if (d.eaten) text += male ? '，' + d.eaten + '在消耗' + it : '，' + d.eaten + '正在用' + it;
      if (d.from) text += male ? '，等' + d.from + '产出' : '，等' + d.from + '再产些';
    }
    text += '。';
  }
  if (d.coins) text += male ? '金币不足，去仓库「出售」些货。' : (d.short?.length ? '金币也不够，' : '金币还不够，') + '先去仓库「出售」些货。';
  return text;
}
const researchGuide = (d, male, mode) => researchNeed(d, male) + researchAct(d, male, mode) + researchCost(d, male) + researchLack(d, male);
// Order waiting: d.minutes until the next order; d.next is the next main task's guidance, d.page its page ('' when
// that guidance names its own place).
const nextStep = (d, go) => (d.page ? go + quote(d.page) + '。' : '') + d.next;

const taskCopy = say({
  breadRecipe: '这步只学配方，面包下一步再做。「品种配方」里点「乡村面包」，金币和材料够了点「研发」。',
  firstOrder: '挑一单点「接受」，仓库备齐了再「交付」。',
  orderProduction: '先排商品生产，等成品入库了再来看单。',
  orderWaiting: (d) => '下一单' + d.minutes + '分钟后到。' + (d.next ? nextStep(d, '这会儿先去') : '先忙别的吧。'),
  orderReady: '货齐了，打开那单点「交付」吧。',
  orderStock: (d) => '单接好了，还差' + d.left + '件' + d.item + '，齐了再来「交付」。',
  breadLack: (d) => quote(d.name) + '还差一点才能研发。' + researchLack(d, false),
  firstSale: '仓库点「出售」再「确认出售」就行，或者把接下的订单备齐交付。',
  firstSeed: '先解锁甘蔗。「品种配方」里点「甘蔗」，金币和材料够了点「研发」。',
  firstSwitch: '现在只有小麦能种。先去研究的「品种配方」研发「甘蔗」，再回田地点「换种」选甘蔗。',
  reserveStock: '给后面的加工留点料。打开任一物品详情，点「加工保留量」，填个大于0的数，再「保存」。',
  recipeTrio: '这回要累计解锁3种商品配方。「品种配方」里挑没研发的，材料齐了点「研发」，一样一样来。',
  recipeNext: (d) => '再解锁一种商品配方。' + researchGuide(d, false, 'go'),
  codex20: '图鉴要补到20种，按累计解锁的种类算。点没收录的，「查看研发」看条件，齐了点「研发」。',
  collectLocked: (d) => d.branch + '还没有品种。' + researchGuide(d, false, 'go'),
  processingLocked: (d) => d.branch + '加工的配方还没有。' + researchGuide(d, false, 'go'),
  mixedLocked: (d) => '多来源商品还没有配方。' + researchGuide(d, false, 'go'),
  newFarmGate: '累计产值还没到交接要求，先接着生产。够了点「出售庄园」看收益和重置项目，再「确认出售」。',
  newFarm: '产值够了，可以交接。先看预计收益和重置项目，再点「出售庄园」，「确认出售」。',
  newFarmLocked: '交接要等入门任务做完。先把「任务」里的主线一项项做完吧。',
  firstTech: '做一次经营改良。「经营改良」里挑没满级的，高级研发点够了点「确认升级」。',
  delegationTech: '这回升「代管时长」。「经营改良」里点它，高级研发点够了点「确认升级」。',
  firstTechPoints: '高级研发点要「出售庄园」才拿得到。有了点数，再到「经营改良」挑一项点「确认升级」。',
  delegationTechPoints: '高级研发点要「出售庄园」才拿得到。有了点数，在「经营改良」点「代管时长」，再「确认升级」。',
}, {
  breadRecipe: '只解锁「乡村面包」的配方，生产是下一步。在「品种配方」点开它，金币和材料齐了点「研发」。',
  firstOrder: '点「接受」接下一单，记好件数，库存够了点「交付」。',
  orderProduction: '先让一批商品完工入库，再来看单。',
  orderWaiting: (d) => '下一单还要' + d.minutes + '分钟。' + (d.next ? nextStep(d, '先去') : '下一张来了再接。'),
  orderReady: '有一单备齐了，点「交付」。',
  orderStock: (d) => '接下的单还差' + d.left + '件' + d.item + '，备齐了点「交付」。',
  breadLack: (d) => quote(d.name) + '的研发条件还不够。' + researchLack(d, true),
  firstSale: '仓库里「确认出售」，或订单中心「交付」，卖出一件就行。',
  firstSeed: '要解锁的是「甘蔗」。在「品种配方」打开它，金币和材料齐了点「研发」。',
  firstSwitch: '除了小麦还没别的作物。先在研究的「品种配方」研发「甘蔗」，再回田地点「换种」选它。两步。',
  reserveStock: '看的是保存后的保留量，要大于0。打开任一物品详情，点「加工保留量」，填数，点「保存」。',
  recipeTrio: '目标是累计解锁3种商品配方，光生产不算。在「品种配方」打开没研发的商品，材料齐了点「研发」。',
  recipeNext: (d) => '商品配方还要往下解锁。' + researchGuide(d, true, 'go'),
  codex20: '图鉴按已解锁物品收录，要20种。点未收录项，「查看研发」看条件，齐了点「研发」。',
  collectLocked: (d) => d.branch + '没有已解锁的品种。' + researchGuide(d, true, 'go'),
  processingLocked: (d) => d.branch + '加工缺配方。' + researchGuide(d, true, 'go'),
  mixedLocked: (d) => '还没有多来源商品的配方。' + researchGuide(d, true, 'go'),
  newFarmGate: '交接还差累计产值。继续生产，够了点「出售庄园」看收益和重置项目，再点「确认出售」。',
  newFarm: '累计产值够了。看清预计收益和重置项目，点「出售庄园」，最后「确认出售」。',
  newFarmLocked: '入门任务没做完，不能交接。先完成「任务」里的主线。',
  firstTech: '要实际升一级改良。在「经营改良」挑没满级的，高级研发点够了点「确认升级」。',
  delegationTech: '升的是「代管时长」，别的项不算。「经营改良」里选它，高级研发点够了点「确认升级」。',
  firstTechPoints: '高级研发点只从「出售庄园」获得。有了点数，在「经营改良」挑一项「确认升级」。',
  delegationTechPoints: '高级研发点只从「出售庄园」获得。有了点数，「经营改良」里选「代管时长」，「确认升级」。',
});

const researchCopy = say({
  breadRecipe: '面包配方要什么，你不好奇吗？「品种配方」里点「乡村面包」，金币和材料凑齐就点「研发」！',
  firstSeed: '下一个研究甘蔗吧！「品种配方」点「甘蔗」，金币和材料齐了点「研发」。',
  recipeTrio: '再解锁几种商品配方，能做的就多了！「品种配方」里点开没研发的，材料齐了点「研发」，累计3种。',
  firstTech: '改良一下会变成什么样呢？「经营改良」挑没满级的，高级研发点够了点「确认升级」！',
  delegationTech: '代管能不能再久一点？试试！「经营改良」点「代管时长」，高级研发点够了就「确认升级」。',
  breadLack: (d) => quote(d.name) + '还研发不了，差在哪儿呢？' + researchLack(d, false),
  recipeNext: (d) => '再解锁一种商品配方吧！' + researchGuide(d, false, 'here'),
  collectLocked: (d) => d.branch + '的品种，就从这项研究起！' + researchGuide(d, false, 'here'),
  processingLocked: (d) => d.branch + '加工的配方，你不好奇吗？' + researchGuide(d, false, 'here'),
  mixedLocked: (d) => '多来源商品，组合起来会怎样呢？' + researchGuide(d, false, 'here'),
  firstTechPoints: '高级研发点从哪来？「出售庄园」！有了点数再来「经营改良」点「确认升级」。',
  delegationTechPoints: '代管想更久？高级研发点要靠「出售庄园」！有了再点「代管时长」，「确认升级」。',
  researchDone: (d) => '这项已经研发好了！回' + quote(d.page) + '排上生产，看看会怎样！',
}, {
  breadRecipe: '这步只看配方解锁，面包还不用做。「品种配方」点「乡村面包」，金币材料齐了点「研发」。',
  firstSeed: '对象是「甘蔗」。在「品种配方」打开它，条件一项项看，金币和材料齐了点「研发」。',
  recipeTrio: '计数的是解锁过的商品配方，到3种为止。「品种配方」里找没研发的，材料齐了点「研发」。',
  firstTech: '用的是高级研发点，普通的不行。「经营改良」挑没满级的，够了点「确认升级」。',
  delegationTech: '延长代管，就是「经营改良」里的「代管时长」。……嗯，高级研发点够了，点「确认升级」。',
  breadLack: (d) => quote(d.name) + '的研发条件还不够。' + researchLack(d, true),
  recipeNext: (d) => '商品配方还没到3种。' + researchGuide(d, true, 'here'),
  collectLocked: (d) => d.branch + '的品种，研发从这项开始。' + researchGuide(d, true, 'here'),
  processingLocked: (d) => d.branch + '加工缺配方，先看这项。' + researchGuide(d, true, 'here'),
  mixedLocked: (d) => '多来源商品的配方，从这项开始。' + researchGuide(d, true, 'here'),
  firstTechPoints: '高级研发点只能靠「出售庄园」取得。有了再在「经营改良」点「确认升级」。',
  delegationTechPoints: '高级研发点只来自「出售庄园」。有了之后，「经营改良」里「代管时长」，「确认升级」。',
  researchDone: (d) => '研发这边已经满足了。回' + quote(d.page) + '安排生产。',
});
const warehouseTaskCopy = say({
  firstSale: '在我这儿卖，选好数量「确认出售」。接了订单的，备齐去「交付」也算。',
  reserveStock: '打开任一物品详情，点「加工保留量」，填大于0的数，「保存」。留多少你定。',
  // Task-card arrivals for coins (managerTaskGuide): d.page and d.button name where the coins go next.
  earn: (d) => '钱不够就从货里出。挑几样点「出售」，凑够了回' + quote(d.page) + '点' + quote(d.button) + '。',
  earnDone: (d) => '账我对过了，金币够了。回' + quote(d.page) + '点' + quote(d.button) + '吧。',
}, {
  firstSale: '那个……仓库点「出售」，选好数量，再「确认出售」。备齐订单去「交付」……也行。',
  reserveStock: '加工用的，我想先留出来。打开任一物品详情，点「加工保留量」，填个大于0的数……再「保存」。',
  earn: (d) => '那个……金币还差些。挑几样点「出售」……够了再回' + quote(d.page) + '点' + quote(d.button) + '。',
  earnDone: (d) => '金币……已经够了。回' + quote(d.page) + '点' + quote(d.button) + '就行。',
});
const estateTaskCopy = say({
  codex20: '图鉴请补到20种，解锁过的品种都算。点未收录的物品，「查看研发」看条件，备齐后点「研发」。',
  newFarmGate: '累计产值还没到交接的要求，请再生产一阵。够了点「出售庄园」看收益与重置项目，再「确认出售」。',
  newFarm: '可以交接了。请先看好预计收益和重置项目，再点「出售庄园」与「确认出售」。',
  newFarmLocked: '入门任务还没做完，现在还不能交接。请先回「任务」把主线做完。',
}, {
  codex20: '图鉴还差几种？点没收录的，「查看研发」看条件，齐了点「研发」，累计解锁20种就成。',
  newFarmGate: '这就想交接？累计产值还差点。再生产一阵，够了点「出售庄园」看收益，然后「确认出售」。',
  newFarm: '下一轮怎么打算？看看预计收益和重置项目，想好了点「出售庄园」，再「确认出售」。',
  newFarmLocked: '这就想交接？入门任务还没做完呢。先回「任务」把主线做完，再来商量。',
});

const productionTaskCopy = {
  orders: say({
    firstOrder: '盯着我干嘛，看单啊。想接就点「接受」，货齐了再「交付」。',
    orderProduction: '在柜台前等也变不出货。先做一批商品，入库了再来。',
    orderWaiting: (d) => '下一单' + d.minutes + '分钟后才来。' + (d.next ? '别干站着，' + nextStep(d, '去') : '……站这么久腿不酸吗，去坐会儿。'),
    orderStock: (d) => '你那单我收好了。还差' + d.left + '件' + d.item + '，可别又数错。',
    orderReady: '我替你数过了，齐的。还愣着？点「交付」呀。',
  }, { firstOrder: '件数看好，愿意接就点「接受」，货齐了再「交付」。' }),
  field: say({ firstSwitch: '想换种别的看看？眼下只有小麦。先去研究的「品种配方」研发「甘蔗」，再回田地点「换种」选甘蔗。' },
    { firstSwitch: '没别的种子，换不了。先去研究的「品种配方」研发「甘蔗」，再回田地点「换种」选它。' }),
  livestock: say({ collectLocked: (d) => '先解锁能养的品种！' + researchGuide(d, false, 'away') },
    { collectLocked: (d) => '品种还没研发呢。' + researchGuide(d, true, 'away') }),
  fish: say({ collectLocked: (d) => '先解锁鱼种，后面我来养！' + researchGuide(d, false, 'away') },
    { collectLocked: (d) => '没鱼种，干等可等不来鱼。' + researchGuide(d, true, 'away') }),
  mine: say({ collectLocked: (d) => '……先解锁矿种。' + researchGuide(d, false, 'away') },
    { collectLocked: (d) => '先研发矿种，再开采。' + researchGuide(d, true, 'away') }),
  processing: say({ processingLocked: (d) => d.branch + '加工缺配方。' + researchGuide(d, false, 'away') },
    { processingLocked: (d) => '先把' + d.branch + '加工的配方学会。' + researchGuide(d, true, 'away') }),
  refining: say({ mixedLocked: (d) => '要做多来源商品，先拿到配方。' + researchGuide(d, false, 'away') },
    { mixedLocked: (d) => '多来源商品，先从配方学起。' + researchGuide(d, true, 'away') }),
};

export function taskHelpCopy(speaker, type, details = {}) {
  const voice = helpVoice(speaker);
  const specialized = { research: researchCopy, warehouse: warehouseTaskCopy, estate: estateTaskCopy, ...productionTaskCopy }[voice.role];
  const copy = specialized?.[voice.gender]?.[type] ?? taskCopy[voice.gender][type];
  return typeof copy === 'function' ? copy(details) : copy;
}

export function tutorialDestination(speaker, destination, text) {
  return helpVoice(speaker).gender === 'male'
    ? '这项在「' + destination + '」办。' + text
    : '先去「' + destination + '」。' + text;
}

const otherStationVoices = {
  tasks: say('这类工位够级了，换另一类。到那边工位点「升级」，再「确认升级」。',
    '这类工位已达标，差的是另一类。到另一类工位点「升级」，看过报价点「确认升级」。'),
  processing: say('料坊位够级了，去升另一类。那边点「升级」，「确认升级」。',
    '料坊位的等级够了，还差另一类工位。到那边点它的「升级」，看看花费，再点「确认升级」。'),
  refining: say('工房位已经达标，还差另一类工位。到那边点「升级」，金额看过再「确认升级」。',
    '工房位够级了，该轮到另一类工位。那边点「升级」，再点「确认升级」。'),
};

export function otherStationCopy(speaker) {
  const voice = helpVoice(speaker);
  return (otherStationVoices[voice.role] ?? otherStationVoices.tasks)[voice.gender];
}

export function researchHelpCopy(speaker, type, details = {}) {
  const male = helpVoice(speaker, 'research').gender === 'male';
  if (type === 'quality') return male
    ? '普通研发点够抽一次品质了。点「抽取一次」。' + (details.all ? '点数都用上就「全部抽取」。' : '')
    : '研发点够抽品质了，这次会抽到什么呢？点「抽取一次」！' + (details.all ? '等不及就「全部抽取」。' : '');
  return male
    ? '「经营改良」里' + quote(details.name) + '条件满足了。效果和报价先看过，再点「确认升级」。'
    : '「经营改良」的' + quote(details.name) + '能再升一级了！点开看看效果，想好就「确认升级」！';
}

const introductions = say({
  角色管理: '各位的好感和今日心愿都在这里，送礼、切换角色也从这儿选。大家各有脾气，慢慢认识就好。',
  统计: '生产状态、库存估值、累计收入都在这页。哪里需要照应，一看便知。',
  出售庄园历史: '历次出售庄园的时间和产值，都记在这里。',
  图鉴: '物品的材料、来源和用途都能查。未收录的也能点开，看研发条件。',
  出售庄园: '交接之前，请先看高级研发点的预计收益和新一轮配置，想清楚再出售。',
}, {
  角色管理: '想先认识谁？好感、今日心愿都在这儿，送礼、切换角色也在这儿。',
  统计: '生产状态、库存估值、累计收入，都摆在这儿了。你看哪边还得加把劲？',
  出售庄园历史: '翻翻旧账？每次出售庄园的时间和产值都在这儿，看看当时干得怎么样。',
  图鉴: '想做什么先来这儿查，材料、来源、用途都有。没收录的点开看研发条件。',
  出售庄园: '下一轮有打算了吗？先看高级研发点的预计收益和新一轮配置，咱们聊聊再定。',
});

export function contextHelpCopy(role, gender, type, details) {
  const speaker = helpVoice({ role, gender });
  if (type === 'introduction') return introductions[speaker.gender][details.page] ?? null;
  if (type === 'missing' || type === 'idle') return productionHelpCopy(speaker, type, details);
  const copy = {
    field: say((d) => at(d) + '还没种东西。点' + quote(d.button) + '挑一种，种下去看它长。', (d) => at(d) + '空着，地不能闲。点' + quote(d.button) + '，选种下地。'),
    livestock: say((d) => at(d) + '还没有动物呢！点' + quote(d.button) + '，挑只喜欢的！', (d) => at(d) + '空着，还能再养些。点' + quote(d.button) + '挑个品种吧。'),
    fish: say((d) => at(d) + '还空着，这池我也要养好！点' + quote(d.button) + '选鱼种。', (d) => at(d) + '位置留好了，鱼还没来报到。点' + quote(d.button) + '挑个鱼种。'),
    mine: say((d) => at(d) + '……没安排。点' + quote(d.button) + '，选矿种。', (d) => at(d) + '还没有开采安排。点' + quote(d.button) + '，选好矿种才能开工。'),
  }[role]?.[speaker.gender];
  return copy ? copy(details) : null;
}

export const characterHelpCopy = {
  tasks: say((name) => '下一项是「' + name + '」，做完再接后面的。', (name) => '下一项：「' + name + '」。先看清要求，再动手。'),
  estate: say(() => '要交接的话，请先到「出售庄园」看高级研发点的预计收益，下一轮安排好再决定。', () => '想开下一轮了？去「出售庄园」看看高级研发点的预计收益，拿主意前叫上我。'),
  livestock: say((kind) => kind === 'empty' ? '空栏还能养！点「安排养殖」，选只小家伙！' : '先添个养殖场吧！点「购买养殖场」，「确认购买」，就能养啦！', (kind) => kind === 'empty' ? '这栏空着，能再养些。点「安排养殖」挑个合适的动物。' : '先添个养殖场，动物才有地方待。点「购买养殖场」，看着合适就「确认购买」。'),
  field: say((kind) => kind === 'empty' ? '这块田还没种。点「播种」选一种，看它慢慢长。' : '先买一块田吧。点「购地」，看过花费点「确认购买」。', (kind) => kind === 'empty' ? '有田就别空着。点「播种」挑好种子，种子下地才有收成。' : '没田，种子没处下。点「购地」，花费看准再「确认购买」。'),
  mine: say((kind) => kind === 'empty' ? '……矿洞空着。点「开采」，选矿种。' : '……先买矿洞。点「购买矿洞」，「确认购买」。', (kind) => kind === 'empty' ? '矿洞有了，还没选矿种。点「开采」，从列表里选。' : '开采前先买矿洞。点「购买矿洞」，金额看过再「确认购买」。'),
  fish: say((kind) => kind === 'empty' ? '这池交给我！点「安排养殖」选鱼种。' : '要养鱼先买鱼塘！点「购买鱼塘」，再「确认购买」！', (kind) => kind === 'empty' ? '鱼塘有了，鱼还没来报到。点「安排养殖」挑个鱼种。' : '没塘可养不了鱼。点「购买鱼塘」，价钱顺眼就「确认购买」。'),
  processing: say((name) => name ? '缺「' + name + '」。点「查看来源」补上，料齐就开工。' : '工位闲着。点「选择配方」，挑一样做。', (name) => name ? '这批还差「' + name + '」。点「查看来源」看它从哪儿来，料齐了自己开工。' : '先挑一份配方吧。点「选择配方」，定好了再照着做。'),
  refining: say((name) => name ? '少了「' + name + '」。点「查看来源」补上，料齐就开工。' : '工房位空着。点「选择配方」定下商品，再备料。', (name) => name ? '配方里还缺「' + name + '」。点「查看来源」找齐，料一齐就开工。' : '想学做什么？点「选择配方」，从这份配方教起。'),
  warehouse: say((name, rate) => rate < 0 ? '「' + name + '」今天跌了。要卖就点「出售」，数量和金额你自己看。' : '「' + name + '」今天涨了。要出货就点「出售」，卖多少你定。', (name, rate) => rate < 0 ? '那个……「' + name + '」今天价低了些。要卖的话，点「出售」看看数量和金额。' : '「' + name + '」今天涨价了……我刚对过。想卖就点「出售」。'),
  research: say(() => '有项目能研发了！去「品种配方」看看是哪个，条件齐了点「研发」！', () => '有项目满足研发条件了。到「品种配方」看清前置、材料和金币，再点「研发」。'),
  merchant: say(() => '还没开摊呢。看下面「开摊条件」差哪项，补齐了再来，痛快做买卖！', () => '摊子还没支起来，货先别急着挑。往下看「开摊条件」，补够了再来。'),
  orders: say((kind) => ({
    ready: '你那单我数过了，一件不差。还愣着？点「交付」呀。',
    pending: '新单在这儿。看清件数，想接就点「接受」，别光盯着我。',
    none: '现在没单。别在柜台前干站着，有单了自然会摆出来。',
  })[kind], (kind) => ({
    ready: '这单备齐了。点「交付」，应下的事就办完了。',
    pending: '有新的托付在等回音。件数和报酬看过，愿意就点「接受」。',
    none: '暂时没人来托付。有新单会列在这里，到时再来。',
  })[kind]),
};
