// Help copy is separate from the world queries: these functions only describe facts supplied by the caller.
const say = (female, male) => ({ female, male });
const quote = (value) => '「' + value + '」';
const at = ({ index, place }) => '第' + index + '个' + place;
const productionCopy = {
  tasks: say({
    buy: (d) => '先把生产的位置备好。点' + quote(d.purchase) + '看金额，再点「确认购买」，我们接着安排。',
    funds: (d) => '购置还缺些金币，我们先卖些货。去仓库选能出售的物品点「出售」，钱够后回来点' + quote(d.purchase) + '。',
    empty: (d) => '就安排在' + at(d) + '吧。点' + quote(d.button) + '，选' + quote(d.name) + '，就安排好了。',
    locked: (d) => '生产之前，先解锁' + quote(d.name) + '。去研究的「品种配方」点开它，备齐所需条件后点「研发」，再回来安排。',
    running: (d) => quote(d.name) + '已经在生产，下一步等它完成。倒计时结束会自动入库，入库后这项任务才有进展。',
    ready: (d) => quote(d.name) + '已经排好了。材料齐备会自动开工，完成后自动入库，我们不用再安排一次。',
    missing: (d) => '先补' + at(d) + '缺的' + quote(d.item) + '。点「查看来源」找这项材料，' + (d.name ? quote(d.name) : '这一批') + '等材料齐备就会自动开工。',
    upgrade: (d) => '这次用' + at(d) + '完成升级，目标是' + d.target + '级。' + d.entry + '，每次选「+1」再点「确认升级」，升到目标为止。',
    upgradeReady: (d) => at(d) + '的升级费够了，可以增加这一处的产出。' + d.entry + '，看好金额，再点「确认升级」。',
  }, {
    buy: (d) => '先买生产位置。点下方的' + quote(d.purchase) + '，看清金额后点「确认购买」，再安排生产。',
    funds: (d) => '差在购置费用。到仓库选能出售的物品点「出售」，补够金币，再回来点' + quote(d.purchase) + '。',
    empty: (d) => '要安排的是' + quote(d.name) + '，位置在' + at(d) + '。点' + quote(d.button) + '，从列表选它。',
    locked: (d) => '还差' + quote(d.name) + '的解锁。到研究的「品种配方」打开它，核对条件，备齐后点「研发」，再返回安排生产。',
    running: (d) => quote(d.name) + '正在生产。倒计时结束会自动入库；任务记的是入库后的产物，现在等这一批完成。',
    ready: (d) => '安排的是' + quote(d.name) + '，已经选好了。材料齐备自动开工，完成后自动入库，这两步不用手动操作。',
    missing: (d) => at(d) + '缺' + quote(d.item) + '。点「查看来源」补这项材料，' + (d.name ? quote(d.name) : '这一批') + '会在全部材料齐备后自动开工。',
    upgrade: (d) => '要把' + at(d) + '升到' + d.target + '级。' + d.entry + '，选「+1」并点「确认升级」，每次一级，直到达到目标。',
    upgradeReady: (d) => at(d) + '已有足够的升级费，升级会增加产出。' + d.entry + '，核对这次的报价，再点「确认升级」。',
  }),
  field: say({
    buy: (d) => '再添一块田，就能多照看一份庄稼。点下方的' + quote(d.purchase) + '看看花费，确定后点「确认购买」。',
    funds: (d) => '添田的金币还差一点。先到仓库选能出售的物品点「出售」，攒够后再回来点' + quote(d.purchase) + '。',
    empty: (d) => '这块还没种呢。到' + at(d) + '点' + quote(d.button) + '，选' + quote(d.name) + '，我们从这里开始看它长。',
    locked: (d) => '还没学会种' + quote(d.name) + '。去研究的「品种配方」看它需要什么，备齐后点「研发」，就能回来安排播种了。',
    running: (d) => quote(d.name) + '还在生长，等这一轮倒计时结束吧。收成会自动入库，不用另点采收。',
    ready: (d) => quote(d.name) + '已经选好了。材料齐备就会自动开工，成熟后的收成也会自动入库。',
    upgrade: (d) => '这次照看' + at(d) + '，把它升到' + d.target + '级。' + d.entry + '，每次选「+1」再点「确认升级」，一回一级就能升到。',
    upgradeReady: (d) => at(d) + '能升级了，这块田还可以多些收成。' + d.entry + '，看过花费，再点「确认升级」吧。',
  }, {
    buy: (d) => '添田可以，花费得先看清。点' + quote(d.purchase) + '，看过金额再点「确认购买」。',
    funds: (d) => '添田的钱还不够，先卖些现有的货。去仓库点能出售物品的「出售」，攒够再回来点' + quote(d.purchase) + '。',
    empty: (d) => at(d) + '还空着，能种就用起来。点' + quote(d.button) + '，选' + quote(d.name) + '下地。',
    locked: (d) => '要种' + quote(d.name) + '，先把研发做了。去研究的「品种配方」看条件，备齐点「研发」，再回来种。',
    running: (d) => quote(d.name) + '已经在长了，等这轮收成。倒计时一到会自动入库，用不着再动它。',
    ready: (d) => quote(d.name) + '已安排，留着就好。材料齐了自动开工，收成自动入库。',
    upgrade: (d) => '这次要' + d.target + '级田，用' + at(d) + '来升。' + d.entry + '，选「+1」再点「确认升级」，升到目标就够。',
    upgradeReady: (d) => '给这块田升级就能多收，值。现在的金币够给' + at(d) + '升级了，' + d.entry + '，看清花费再点「确认升级」。',
  }),
  livestock: say({
    buy: (d) => '我们添个养殖场吧！点' + quote(d.purchase) + '看花费，确定后点「确认购买」，再选要养的动物。',
    funds: (d) => '养殖场还差点钱，先把货卖出去吧！去仓库选能出售的物品点「出售」，够了再回来点' + quote(d.purchase) + '。',
    empty: (d) => at(d) + '还没有动物，给它安排上吧！点' + quote(d.button) + '，在列表里选' + quote(d.name) + '。',
    locked: (d) => '想养' + quote(d.name) + '？好呀，先去研究的「品种配方」看条件，备齐点「研发」，我们再回来安排养殖！',
    running: (d) => quote(d.name) + '这轮已经养上啦。等倒计时结束，产物就会自动入库，不用再点收取！',
    ready: (d) => quote(d.name) + '安排好啦！材料齐备会自动开工，产物也会自动入库。',
    upgrade: (d) => '这次把' + at(d) + '升到' + d.target + '级吧！' + d.entry + '，每次选「+1」再点「确认升级」，我们一回回升到目标。',
    upgradeReady: (d) => at(d) + '能升级啦，养殖产出会增加！' + d.entry + '，看好花费再点「确认升级」。',
  }, {
    buy: (d) => '先添个养殖场，动物才有位置。点下方的' + quote(d.purchase) + '，看好花费，再点「确认购买」就行。',
    funds: (d) => '买养殖场还差些钱，先把现有的货卖一点吧。到仓库点能出售物品的「出售」，够钱再回来点' + quote(d.purchase) + '。',
    empty: (d) => '把' + quote(d.name) + '养在' + at(d) + '怎么样？点' + quote(d.button) + '，从列表选它就行。',
    locked: (d) => '要养' + quote(d.name) + '，还得先研发。去研究的「品种配方」看看条件，备齐点「研发」，回来就能安排了。',
    running: (d) => quote(d.name) + '正在养着，等这一轮结束就好。倒计时走完，产物会自动入库。',
    ready: (d) => quote(d.name) + '已经排上了。等材料齐备会自动开工，产物做好也会自动入库。',
    upgrade: (d) => '就用' + at(d) + '吧，这次要升到' + d.target + '级。' + d.entry + '，一回选「+1」，再点「确认升级」，升到目标就成。',
    upgradeReady: (d) => '现在的钱够升' + at(d) + '了，往后产出能多些。' + d.entry + '，看看花费，再点「确认升级」吧。',
  }),
  fish: say({
    buy: (d) => '先添鱼塘，养鱼的事我来！点' + quote(d.purchase) + '看清花费，再点「确认购买」。',
    funds: (d) => '买鱼塘的钱还差些，那就先出货。去仓库点能出售物品的「出售」，赚够回来点' + quote(d.purchase) + '！',
    empty: (d) => '这池就选' + quote(d.name) + '！到' + at(d) + '点' + quote(d.button) + '，在列表里选它。',
    locked: (d) => '我要养' + quote(d.name) + '，得先研发出来。去研究的「品种配方」看条件，备齐点「研发」，再回来安排！',
    running: (d) => quote(d.name) + '已经养上了，等这一轮长成！倒计时结束，产物会自动入库。',
    ready: (d) => quote(d.name) + '排好了！材料齐备自动开工，产物自动入库，这一池已经安排上了。',
    upgrade: (d) => '目标是' + d.target + '级，就升' + at(d) + '！' + d.entry + '，每次选「+1」再点「确认升级」，一直升到目标。',
    upgradeReady: (d) => at(d) + '够钱升级了，还能多些产出！' + d.entry + '，看准花费，再点「确认升级」。',
  }, {
    buy: (d) => '想养鱼？先给鱼留个位置。点' + quote(d.purchase) + '看看价格，合意就点「确认购买」，咱们再挑鱼。',
    funds: (d) => '鱼塘还买不起，先让仓库的货替咱们挣一点。去点能出售物品的「出售」，钱够后回来点' + quote(d.purchase) + '。',
    empty: (d) => at(d) + '还缺点热闹，选' + quote(d.name) + '吧。点' + quote(d.button) + '，在列表里找到它就成。',
    locked: (d) => quote(d.name) + '还没研发，今天得先跑一趟研究。打开「品种配方」看条件，备齐点「研发」，再回来养。',
    running: (d) => quote(d.name) + '已经在长了，咱们可催不快它。等倒计时结束，产物会自动入库。',
    ready: (d) => quote(d.name) + '排上了。材料齐备自动开工，产物自动入库，不用咱们手动收取。',
    upgrade: (d) => '这趟看' + at(d) + '，得升到' + d.target + '级。' + d.entry + '，每回选「+1」再点「确认升级」，到目标就算办妥。',
    upgradeReady: (d) => at(d) + '可以升级了，往后多些产出，是个好消息。' + d.entry + '，看过报价，再点「确认升级」。',
  }),
  mine: say({
    buy: (d) => '先备好矿洞。点' + quote(d.purchase) + '看金额，再点「确认购买」。',
    funds: (d) => '买矿洞还缺钱。去仓库选能出售的物品点「出售」，够钱后回来点' + quote(d.purchase) + '。',
    empty: (d) => '用' + at(d) + '。点' + quote(d.button) + '，选' + quote(d.name) + '开采。',
    locked: (d) => quote(d.name) + '还没研发。去研究的「品种配方」看条件，备齐点「研发」，再回来开采。',
    running: (d) => quote(d.name) + '还在开采。等倒计时结束，产物会自动入库。',
    ready: (d) => quote(d.name) + '安排好了。材料齐备自动开工，产物自动入库。',
    upgrade: (d) => '把' + at(d) + '升到' + d.target + '级。' + d.entry + '，每次选「+1」，再点「确认升级」，升到目标。',
    upgradeReady: (d) => at(d) + '够钱升级，产出会增加。' + d.entry + '，看好金额，再点「确认升级」。',
  }, {
    buy: (d) => '有矿洞才能开采。点' + quote(d.purchase) + '核对金额，确定后点「确认购买」。',
    funds: (d) => '买矿洞的金币还不够。去仓库选能出售的物品点「出售」，补足费用，再回来点' + quote(d.purchase) + '。',
    empty: (d) => '开采安排在' + at(d) + '。点' + quote(d.button) + '，从列表中选' + quote(d.name) + '。',
    locked: (d) => quote(d.name) + '还不能开采，先完成研发。到研究的「品种配方」核对条件，备齐后点「研发」，再回来安排。',
    running: (d) => quote(d.name) + '正在开采，保持这个安排。倒计时结束后，产物会自动入库。',
    ready: (d) => quote(d.name) + '已选好。材料齐备会自动开工，完成后自动入库，不需要另行操作。',
    upgrade: (d) => '选' + at(d) + '，升到' + d.target + '级。' + d.entry + '，每次选「+1」，核对后点「确认升级」，逐级达到目标。',
    upgradeReady: (d) => at(d) + '的升级费用已经够了，升级能提高开采产出。' + d.entry + '，核对报价，再点「确认升级」。',
  }),
  processing: say({
    buy: (d) => '先添工位，再排活。点' + quote(d.purchase) + '看报价，确定就点「确认购买」。',
    funds: (d) => '添工位差的是金币。去仓库选能出售的物品点「出售」，钱够了再回来点' + quote(d.purchase) + '。',
    empty: (d) => '做' + quote(d.name) + '，就用' + at(d) + '。点' + quote(d.button) + '，列表里选它。',
    locked: (d) => quote(d.name) + '的配方还没解锁。去研究的「品种配方」看条件，备齐点「研发」，回来再排活。',
    running: (d) => quote(d.name) + '正在做，这批已经排上。倒计时结束，产物会自动入库。',
    ready: (d) => '就做' + quote(d.name) + '，已经选好。材料齐备自动开工，做好自动入库。',
    missing: (d) => at(d) + '缺' + quote(d.item) + '。点「查看来源」补这项料，' + (d.name ? quote(d.name) : '这批') + '等全部材料齐备就会自动开工。',
    idle: (d) => at(d) + '还没排活。点「选择配方」，挑好要做的就行。',
    upgrade: (d) => '就升' + at(d) + '，目标' + d.target + '级。' + d.entry + '，每次选「+1」再点「确认升级」，升够就好。',
    upgradeReady: (d) => '现在的钱够给' + at(d) + '升级了，能加产出。' + d.entry + '，看清报价，再点「确认升级」。',
  }, {
    buy: (d) => '想多安排一批，就先添个工位。点下方的' + quote(d.purchase) + '看看花费，确定后点「确认购买」。',
    funds: (d) => '添工位还差些钱，先从出货开始吧。去仓库选能出售的物品点「出售」，攒够再回来点' + quote(d.purchase) + '。',
    empty: (d) => '先在' + at(d) + '做' + quote(d.name) + '吧。点' + quote(d.button) + '，找到它选好，这一步就成了。',
    locked: (d) => '先学' + quote(d.name) + '的配方，再动手做。去研究的「品种配方」看需要什么，备齐点「研发」，回来就能安排。',
    running: (d) => quote(d.name) + '正在做，这一批还需要些时间。倒计时结束，产物会自动入库。',
    ready: (d) => quote(d.name) + '已经选好了。接下来等材料齐备，会自动开工，做好后也会自动入库。',
    missing: (d) => '这一步还差' + quote(d.item) + '，' + at(d) + '要用它。点「查看来源」找这项料，' + (d.name ? quote(d.name) : '这一批') + '等材料齐备就会自动开工。',
    idle: (d) => '先想好' + at(d) + '做什么吧。点「选择配方」，选定后我们照着做。',
    upgrade: (d) => '这次把' + at(d) + '升到' + d.target + '级。' + d.entry + '，每次选「+1」，再点「确认升级」，按这个顺序升到目标。',
    upgradeReady: (d) => at(d) + '能升级了，往后可以多做些产物。' + d.entry + '，花费看明白，再点「确认升级」吧。',
  }),
  refining: say({
    buy: (d) => '先添一处精制位，把位置定好。点' + quote(d.purchase) + '看金额，确定后点「确认购买」。',
    funds: (d) => '添精制位还缺些金币。先到仓库选能出售的物品点「出售」，补够费用，再回来点' + quote(d.purchase) + '。',
    empty: (d) => '这次做' + quote(d.name) + '，安排在' + at(d) + '。点' + quote(d.button) + '，从列表里选它。',
    locked: (d) => '还没有' + quote(d.name) + '的配方。去研究的「品种配方」核对条件，备齐后点「研发」，回来再安排精制。',
    running: (d) => quote(d.name) + '正在精制，等这一批完成。倒计时结束，成品会自动入库。',
    ready: (d) => quote(d.name) + '已经选定。材料齐备就会自动开工，成品也会自动入库。',
    missing: (d) => at(d) + '还少' + quote(d.item) + '。点「查看来源」补好这一项，材料全部齐备后会自动开工。',
    idle: (d) => at(d) + '还空着，先定要做的商品。点「选择配方」，选好后再备料。',
    upgrade: (d) => '把' + at(d) + '升到' + d.target + '级。' + d.entry + '，每次选「+1」再点「确认升级」，逐级升到目标。',
    upgradeReady: (d) => at(d) + '可以升级，产出会增加。' + d.entry + '，报价看清楚，再点「确认升级」。',
  }, {
    buy: (d) => '要多做一批，先把精制位添上。点' + quote(d.purchase) + '看明白花费，再点「确认购买」。',
    funds: (d) => '添精制位还差些钱，那就先出货。去仓库点能出售物品的「出售」，攒够了再回来点' + quote(d.purchase) + '。',
    empty: (d) => '这次做' + quote(d.name) + '，我教你从选配方开始。到' + at(d) + '点' + quote(d.button) + '，在列表选它。',
    locked: (d) => '先学会' + quote(d.name) + '的配方，再来做。去研究的「品种配方」看条件，备齐点「研发」，再回来做。',
    running: (d) => quote(d.name) + '正在做，工夫还没到。等倒计时结束，成品会自动入库。',
    ready: (d) => quote(d.name) + '选好了，接下来照配方做。材料齐备自动开工，成品自动入库。',
    missing: (d) => at(d) + '缺的是' + quote(d.item) + '。点「查看来源」把这项找齐，全部材料齐备就会自动开工。',
    idle: (d) => '你想学做哪样商品？' + at(d) + '还空着，点「选择配方」，定下来我们就动手。',
    upgrade: (d) => '就用' + at(d) + '升到' + d.target + '级。' + d.entry + '，选「+1」再点「确认升级」，一级一级升到目标。',
    upgradeReady: (d) => at(d) + '可以升级了，同样的手艺能多出些成品。' + d.entry + '，看好花费，再点「确认升级」。',
  }),
};

export function helpVoice(speaker = {}, fallbackRole = 'tasks') {
  return { role: speaker.role ?? fallbackRole, gender: speaker.gender === 'male' ? 'male' : 'female' };
}

export function productionHelpCopy(speaker, type, details) {
  const voice = helpVoice(speaker);
  const copy = productionCopy[voice.role]?.[voice.gender]?.[type] ?? productionCopy.tasks[voice.gender][type];
  return copy(details);
}

const taskCopy = say({
  breadRecipe: '这一步先学配方。打开「品种配方」，点「乡村面包」看所需金币和材料，备齐后点「研发」，做面包是下一步的事。',
  firstOrder: '挑一张订单点「接受」，等仓库备齐，再点「交付」。',
  orderProduction: '先安排商品生产，等这批成品入库再来看订单。',
  orderWaiting: '眼下没有订单可接。先去忙吧，等有新单再来。',
  orderReady: '货齐了！打开接下的订单，点「交付」。',
  orderStock: '单已经接好了，照着所需件数备货，凑齐再来。',
  firstSale: '仓库和订单都能出货。在仓库点「出售」再点「确认出售」，或把接下的订单备齐交付。',
  firstSeed: '我们先解锁甘蔗。打开「品种配方」点「甘蔗」，看看所需金币和材料，备齐后点「研发」。',
  firstSwitch: '现在还没有小麦以外的作物可换。先去研究的「品种配方」研发「甘蔗」，再回田地点「换种」选甘蔗，按这两步来。',
  reserveStock: '先替后面的加工留一份材料。打开任一物品详情，点「加工保留量」，填大于0的数量，再点「保存」。',
  recipeTrio: '这次要累计解锁3种商品配方。去「品种配方」找未研发的商品，点开看材料，备齐后点「研发」，我们逐项补够。',
  codex20: '这一项把图鉴补到20种。点未收录物品，再点「查看研发」看条件，备齐后点「研发」；按累计解锁的种类算。',
  collectLocked: (d) => '先把' + d.branch + '的品种解锁，再接生产。去研究的「品种配方」核对条件，备齐点「研发」，回来点' + quote(d.button) + '安排。',
  processingLocked: (d) => '这次接着做' + d.branch + '加工。先去研究的「品种配方」研发对应加工配方，再回加工位点「选择配方」，把活排上。',
  mixedLocked: '这次要做多来源商品，先备好它的配方。去研究的「品种配方」研发多来源商品配方，再回精制位点「选择配方」。',
  newFarmGate: '交接还差任务要求的累计产值。我们先继续生产，达标后点「出售庄园」看收益和重置项目，再点「确认出售」。',
  newFarm: '产值已经够了，我们把交接安排看清楚。先核对预计收益和重置项目，再点「出售庄园」，确定后点「确认出售」。',
  firstTech: '接下来做一次经营改良。打开「经营改良」选未满级项，看所需高级研发点，备齐后点「确认升级」，升了才算完成。',
  delegationTech: '这次安排的是「代管时长」。打开「经营改良」点这一项，备齐所需高级研发点，再点「确认升级」。',
}, {
  breadRecipe: '这一步要解锁乡村面包配方。打开「品种配方」点「乡村面包」，看清金币和材料，备齐后点「研发」；生产留到下一步。',
  firstOrder: '先点「接受」锁定订单，核对所需件数。库存够了，点「交付」结单。',
  orderProduction: '先让一批商品完工入库，届时再来看单。',
  orderWaiting: '眼下没有订单，等下一张来了再接。',
  orderReady: '有一单已经备齐，点「交付」就能结清。',
  orderStock: '已经接受的单会留着。先备齐上面写的件数。',
  firstSale: '在仓库「确认出售」或在订单中心「交付」都计出货，成交一件即可。',
  firstSeed: '要解锁的作物是「甘蔗」。在「品种配方」打开它，核对金币和材料，备齐后点「研发」。',
  firstSwitch: '还没有小麦以外的已解锁作物。先到研究的「品种配方」研发「甘蔗」，再回田地点「换种」选甘蔗，解锁和换种两步都要做。',
  reserveStock: '这项看的是保存后的保留量，数量要大于0。打开任一物品详情，点「加工保留量」，输入数量，再点「保存」。',
  recipeTrio: '要累计解锁3种商品配方。到「品种配方」打开未研发的商品，看清材料，备齐后点「研发」；只生产已有商品不增加解锁数。',
  codex20: '图鉴按已解锁的物品收录，目标20种。点未收录项，再点「查看研发」核对条件，备齐后点「研发」，补到20种即可。',
  collectLocked: (d) => '还没解锁' + d.branch + '的品种。去研究的「品种配方」看条件，备齐点「研发」，再回来点' + quote(d.button) + '，才能安排生产。',
  processingLocked: (d) => '要做的是' + d.branch + '加工，对应配方还没解锁。先去研究的「品种配方」研发它，再回加工位点「选择配方」。',
  mixedLocked: '目标是多来源商品。先在研究的「品种配方」研发多来源商品配方，再去精制位点「选择配方」，单一来源的不计这一项。',
  newFarmGate: '交接还差累计产值，出售次数以外，这个门槛也要达到。先继续生产，达标后点「出售庄园」核对收益与重置项目，再点「确认出售」。',
  newFarm: '累计产值已经达标。把预计收益和重置项目看清，再点「出售庄园」，最后点「确认出售」完成交接。',
  firstTech: '要实际升一级改良才计入任务。在「经营改良」选未满级项，核对所需高级研发点，备齐后点「确认升级」。',
  delegationTech: '这项要升的是「代管时长」。打开「经营改良」选它，核对高级研发点，再点「确认升级」，升其他项不能替代。',
});

const researchCopy = say({
  breadRecipe: '想看看面包配方需要什么吗？打开「品种配方」点「乡村面包」，备齐金币和材料后点「研发」，先把配方学会。',
  firstSeed: '下一种作物研究甘蔗吧！在「品种配方」点「甘蔗」看看条件，金币和材料备齐后点「研发」。',
  recipeTrio: '再解锁些商品配方，能做的东西就多了！到「品种配方」点开未研发的商品，看过材料，备齐后点「研发」，这次累计解锁3种。',
  firstTech: '想看看改良能带来什么变化？打开「经营改良」选未满级项，备齐所需高级研发点，再点「确认升级」，升一级就有新变化。',
  delegationTech: '这次试着延长代管时间吧。在「经营改良」点「代管时长」，看看需要多少高级研发点，备齐再点「确认升级」。',
}, {
  breadRecipe: '这次确认的是配方解锁。打开「品种配方」点「乡村面包」，核对金币和材料，备齐后点「研发」，还不用生产面包。',
  firstSeed: '研究对象是「甘蔗」。在「品种配方」点开它，逐项核对条件，金币和材料备齐后点「研发」。',
  recipeTrio: '算的是解锁过多少种商品配方，目标3种。到「品种配方」查未研发的商品，备齐所需材料，再点「研发」。',
  firstTech: '这项用高级研发点。打开「经营改良」选未满级项，核对需要多少，备齐后点「确认升级」；普通研发点不能代替。',
  delegationTech: '要延长代管时间，就选「经营改良」里的「代管时长」。看清所需高级研发点，再点「确认升级」，对象别混了。',
});
const warehouseTaskCopy = say({
  firstSale: '在我这儿出货，选好数量点「确认出售」。你接过订单的话，备齐去「交付」也算。',
  reserveStock: '要留多少给加工，你先定个数。打开任一物品详情，点「加工保留量」，填大于0的数量，再点「保存」，就留好了。',
}, {
  firstSale: '那个……可以在仓库点「出售」，选好数量再点「确认出售」。备齐订单去「交付」也行。',
  reserveStock: '加工要用的，我想先留好。打开任一物品详情，点「加工保留量」，填一个大于0的数，再点「保存」就行。',
});
const estateTaskCopy = say({
  codex20: '这次请把图鉴补到20种。点未收录物品，用「查看研发」看条件，备齐后点「研发」；解锁过的品种都会算入收录。',
  newFarmGate: '交接还差任务要求的累计产值，请先把生产接着做。达标后点「出售庄园」，看过收益和重置项目，再点「确认出售」。',
  newFarm: '准备交接了？请先看清预计收益和重置项目，把下一轮安排妥当，再点「出售庄园」和「确认出售」。',
}, {
  codex20: '图鉴还差哪些，咱们一起找找。点未收录物品，再点「查看研发」看条件，备齐后点「研发」，累计解锁20种就成。',
  newFarmGate: '现在交接还早了点，累计产值得先够任务门槛。咱们继续生产，达标后点「出售庄园」看收益，再点「确认出售」。',
  newFarm: '要开始下一轮了，咱们先看看怎么安排。看清预计收益和重置项目，再点「出售庄园」，拿定主意就点「确认出售」。',
});

const productionTaskCopy = {
  orders: say({
    firstOrder: '别光看着我，看单呀。愿意接就点「接受」，货齐了再点「交付」。',
    orderProduction: '光等在柜台前可没用。先做出一批商品，等它入库再来。',
    orderWaiting: '眼下没单。找个地方坐会儿吧，站这么久腿不酸吗？',
    orderStock: '你接的那单我收好了。照单上的件数备货，缺几件可别算岔了。',
    orderReady: '我又替你数了一遍，货齐了。还等什么？点「交付」呀。',
  }, { firstOrder: '先看清件数，愿意接就点「接受」。等货齐了，再点「交付」。' }),
  field: say({ firstSwitch: '想换一种作物看看？现在还没有小麦以外的品种。先去研究的「品种配方」研发「甘蔗」，再回田地点「换种」选甘蔗吧。' },
    { firstSwitch: '要换种，先得有别的种子。去研究的「品种配方」研发「甘蔗」，再回田地点「换种」选它，选好才算完成换种。' }),
  livestock: say({ collectLocked: (d) => '先解锁能养的品种吧！去研究的「品种配方」看看条件，备齐点「研发」，回来点' + quote(d.button) + '，我们就能迎接动物啦。' },
    { collectLocked: (d) => '还得先把品种研发出来。去研究的「品种配方」看看条件，备齐点「研发」，再回养殖场点' + quote(d.button) + '安排就好。' }),
  fish: say({ collectLocked: (d) => '先解锁鱼种，接下来我来养！去研究的「品种配方」看清条件，备齐点「研发」，回来点' + quote(d.button) + '。' },
    { collectLocked: (d) => '鱼种还没解锁，空等可等不来鱼。去研究的「品种配方」看条件，备齐点「研发」，再回来点' + quote(d.button) + '安排。' }),
  mine: say({ collectLocked: (d) => '先解锁矿种。去研究的「品种配方」看条件，备齐点「研发」，回来点' + quote(d.button) + '安排开采。' },
    { collectLocked: (d) => '先研发矿种，再安排开采。到研究的「品种配方」核对条件，备齐点「研发」，回来点' + quote(d.button) + '。' }),
  processing: say({ processingLocked: (d) => '这次做' + d.branch + '加工，先补配方。去研究的「品种配方」研发对应加工项，再回加工位点「选择配方」，把活排上。' },
    { processingLocked: (d) => '先把' + d.branch + '加工配方准备好，再做这一批。去研究的「品种配方」研发对应项，回来点加工位的「选择配方」就行。' }),
  refining: say({ mixedLocked: '这次选多来源的商品配方。先去研究的「品种配方」研发对应商品，再回精制位点「选择配方」，按配方备料。' },
    { mixedLocked: '这次学做多来源商品，先从配方入手。去研究的「品种配方」研发多来源商品配方，再回精制位点「选择配方」，我带你做。' }),
};

export function taskHelpCopy(speaker, type, details = {}) {
  const voice = helpVoice(speaker);
  const specialized = { research: researchCopy, warehouse: warehouseTaskCopy, estate: estateTaskCopy, ...productionTaskCopy }[voice.role];
  const copy = specialized?.[voice.gender]?.[type] ?? taskCopy[voice.gender][type];
  return typeof copy === 'function' ? copy(details) : copy;
}

export function tutorialDestination(speaker, destination, text) {
  return helpVoice(speaker).gender === 'male'
    ? '这一项到「' + destination + '」做，步骤是这样：' + text
    : '我们先去「' + destination + '」，接着安排这一项。' + text;
}

const otherStationVoices = {
  tasks: say('这一类工位已经达标，我们接着升另一类。到另一类工位点「升级」，核对后点「确认升级」。',
    '这一类工位的等级已经够了，还差另一类。到另一类工位点「升级」，核对报价，再点「确认升级」。'),
  processing: say('加工位已经够级了，这次去升另一类。点那边工位的「升级」，看清报价，再点「确认升级」。',
    '加工位的等级够了，接下来看看另一类工位吧。点它的「升级」，核对花费，再点「确认升级」。'),
  refining: say('精制位已经达标，还要看另一类工位。到那边点「升级」，核对金额，再点「确认升级」。',
    '精制位够级了，该升另一类工位。点那边的「升级」，看过花费，再点「确认升级」，这项就能接着做。'),
};

export function otherStationCopy(speaker) {
  const voice = helpVoice(speaker);
  return (otherStationVoices[voice.role] ?? otherStationVoices.tasks)[voice.gender];
}

export function researchHelpCopy(speaker, type, details = {}) {
  const male = helpVoice(speaker, 'research').gender === 'male';
  if (type === 'quality') return male
    ? '普通研发点够抽一次品质了。点「抽取一次」，结果会提升品质。' + (details.all ? '要用可用点数接着抽，就点「全部抽取」。' : '')
    : '普通研发点够了，想看看这次能提升什么品质吗？点「抽取一次」，结果会提升品质。' + (details.all ? '也可以点「全部抽取」，用可用点数连续抽。' : '');
  return male
    ? quote(details.name) + '的升级条件已经满足。先点开看看效果和报价，确认这些正是你要的，再点「确认升级」。'
    : quote(details.name) + '能再升一级了！点开看看效果和报价，想好后点「确认升级」，看看它会带来什么变化。';
}

const introductions = say({
  角色管理: '各位的好感和今日心愿都在这里，送礼、切换角色也从这里选。请慢慢认识大家，他们各有自己的脾气。',
  统计: '想安排接下来的经营，请先看看生产状态、库存估值和累计收入。哪一处需要照应，这里能看清。',
  出售庄园历史: '历次交接都留了记录。出售庄园的时间和产值，请在这里逐次查阅。',
  图鉴: '要查物品的材料、来源和用途，请来这里。未收录的也能点开，看看研发条件，方便你安排下一步。',
  出售庄园: '交接前，请先看高级研发点的预计收益和新一轮配置。把这轮的安排看清，再确认出售庄园。',
}, {
  角色管理: '想先认识谁？大家的好感和今日心愿都列在这里，送礼、切换角色也在这儿，咱们一个个聊。',
  统计: '你觉得哪边还要添把力？咱们看看生产状态、库存估值和累计收入，拿这些数一起商量。',
  出售庄园历史: '想翻翻哪次交接？这里记着每次出售庄园的时间和产值，咱们可以回头看看当时的成绩。',
  图鉴: '有什么想做的，先在这里找。材料、来源、用途都能查，没收录的也能点开看研发条件，咱们再商量怎么安排。',
  出售庄园: '下一轮有什么打算？先看高级研发点的预计收益和新一轮配置，咱们把安排谈清，再确认出售庄园。',
});

export function contextHelpCopy(role, gender, type, details) {
  const speaker = helpVoice({ role, gender });
  if (type === 'introduction') return introductions[speaker.gender][details.page] ?? null;
  if (type === 'missing' || type === 'idle') return productionHelpCopy(speaker, type, details);
  const copy = {
    field: say((d) => at(d) + '还没种东西。点' + quote(d.button) + '选一种作物，我们从这里开始照看吧。', (d) => at(d) + '还空着，地别闲着。点' + quote(d.button) + '，选好种子下地。'),
    livestock: say((d) => at(d) + '还没有动物呢！点' + quote(d.button) + '，选只想养的，我来照看！', (d) => at(d) + '还空着，可以再养些动物。点' + quote(d.button) + '，挑个合适的品种吧。'),
    fish: say((d) => at(d) + '还没养上鱼，这池我也要养好！点' + quote(d.button) + '选鱼种吧。', (d) => at(d) + '的位置留好了，鱼还没来报到。点' + quote(d.button) + '，挑个鱼种吧。'),
    mine: say((d) => at(d) + '还没安排。点' + quote(d.button) + '，选好矿种再开采。', (d) => at(d) + '还没有开采安排。点' + quote(d.button) + '选矿种，选好才能开工。'),
  }[role]?.[speaker.gender];
  return copy ? copy(details) : null;
}

export const characterHelpCopy = {
  tasks: say((name) => '接下来做「' + name + '」。我们把这一步安排好，再接后面的事。', (name) => '下一项是「' + name + '」。先看清要完成什么，再按要求做。'),
  estate: say(() => '准备交接的话，请先到「出售庄园」看高级研发点的预计收益，把下一轮安排妥当再决定。', () => '想开始下一轮了？先去「出售庄园」看高级研发点的预计收益，咱们把这笔安排商量明白。'),
  livestock: say((kind) => kind === 'empty' ? '空栏还能安排动物呢！点「安排养殖」，选个想养的品种，我们接着养！' : '先给动物添个养殖场吧！点「购买养殖场」看花费，确定后点「确认购买」，再安排养殖。', (kind) => kind === 'empty' ? '这栏还空着，能再安排些动物。点「安排养殖」，挑个合适的品种吧。' : '先添个养殖场，动物才有地方。点下方的「购买养殖场」看看花费，再点「确认购买」就行。'),
  field: say((kind) => kind === 'empty' ? '这块田还没种呢。点「播种」选一种作物，我们再来看它怎么长。' : '先买一块田，我们就能开始种了。点「购地」看过花费，确定后点「确认购买」。', (kind) => kind === 'empty' ? '有田就用起来。点「播种」挑好种子，种下才有收成。' : '得先有田，种子才能下地。点「购地」看清花费，再点「确认购买」。'),
  mine: say((kind) => kind === 'empty' ? '矿洞还没安排。点「开采」，选好矿种。' : '先备好矿洞。点「购买矿洞」看金额，再点「确认购买」。', (kind) => kind === 'empty' ? '矿洞有了，还要选开采矿种。点「开采」，从列表里选好再做。' : '开采前先买矿洞。点「购买矿洞」核对金额，确定后点「确认购买」。'),
  fish: say((kind) => kind === 'empty' ? '这池也要养好！点「安排养殖」选鱼种，接下来交给我。' : '要养就先把鱼塘添上！点「购买鱼塘」看清花费，再点「确认购买」。', (kind) => kind === 'empty' ? '鱼塘备好了，还差鱼来报到。点「安排养殖」，挑个鱼种吧。' : '先添个鱼塘，咱们才有地方养鱼。点「购买鱼塘」看看价格，合意就点「确认购买」。'),
  processing: say((name) => name ? '还缺「' + name + '」。点「查看来源」补这项料，全部材料齐备就会自动开工。' : '工位还没排活。点「选择配方」，选好要做的就行。', (name) => name ? '这一批还差「' + name + '」，先把它找齐吧。点「查看来源」，全部材料齐备后会自动开工。' : '先挑一份要做的配方吧。点「选择配方」，定好了，我们再照着做。'),
  refining: say((name) => name ? '还少「' + name + '」这一项。点「查看来源」补齐，等全部材料备好就会自动开工。' : '精制位还空着。点「选择配方」定下商品，再按配方备料。', (name) => name ? '配方还缺「' + name + '」，先从找这项料开始。点「查看来源」，材料全部齐备就会自动开工。' : '想学做什么商品？点「选择配方」选好，咱们就从这份配方开始。'),
  warehouse: say((name, rate) => rate < 0 ? '「' + name + '」今天降价了。先看现价，要卖就点「出售」核对数量和金额，这笔你来定。' : '「' + name + '」今天涨价，想出货就点「出售」。数量和金额一起看清，再决定卖多少。', (name, rate) => rate < 0 ? '那个……「' + name + '」今天的价低了些。要卖的话，可以点「出售」看看数量和金额，再决定。' : '「' + name + '」今天涨价了，我刚对过。想卖这一批，就点「出售」看看数量和金额吧。'),
  research: say(() => '有项目能继续研究了！打开「品种配方」看看是哪一项，核对条件后点「研发」，又能多认识一种了。', () => '有项目满足研发条件了。到「品种配方」看清前置、材料和金币，再点「研发」；条件满足，还得做完这一步才算解锁。'),
  merchant: say(() => '现在还没开摊，条件都列在下面。看「开摊条件」还差哪项，补够了再来，咱们痛快谈买卖！', () => '还没开摊，先不用挑货。往下看「开摊条件」，补够还差的几项再来，咱们的买卖不赶这一会儿。'),
};


