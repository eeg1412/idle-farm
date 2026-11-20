// Help copy is separate from the world queries: these functions only describe facts supplied by the caller.
const say = (female, male) => ({ female, male });
const quote = (value) => '「' + value + '」';
const at = ({ index, place }) => '第' + index + '个' + place;
const productionCopy = {
  tasks: say({
    buy: (d) => '这一项先把位置添好：点「' + d.purchase + '」，核对金额，再点「确认购买」。',
    funds: (d) => '购买的钱还差一些。先去仓库选有库存的物品，点「出售」出货，再回来点「' + d.purchase + '」。',
    empty: (d) => at(d) + '还没安排，点' + quote(d.button) + '，选' + quote(d.name) + '就接上这一步了。',
    locked: (d) => '先把研发办好：去研究的「品种配方」，点' + quote(d.name) + '看条件，备齐后点「研发」，再回来安排生产。',
    running: (d) => quote(d.name) + '已经在生产了。这一步等倒计时结束、产物自动入库就好。',
    ready: (d) => quote(d.name) + '已经安排好；材料齐备后会自动开工，产出也会自动入库。',
    missing: (d) => at(d) + '的' + quote(d.name) + '还缺' + quote(d.item) + '。点「查看来源」补上这项材料，等材料齐备会自动开工。',
    upgrade: (d) => '这次把' + at(d) + '升到' + d.target + '级。' + d.entry + '，选「+1」再点「确认升级」，逐级补到目标。',
    upgradeReady: (d) => at(d) + '现在够钱升级了。' + d.entry + '，核对后点「确认升级」，让这一处多些产出。',
  }, {
    buy: (d) => '先完成购置。页面下方点「' + d.purchase + '」，金额核对无误后点「确认购买」。',
    funds: (d) => '购置资金不足。到仓库点库存物品的「出售」，出货后再回本页点「' + d.purchase + '」。',
    empty: (d) => '本项安排在' + at(d) + '：点' + quote(d.button) + '，从列表选择' + quote(d.name) + '。',
    locked: (d) => quote(d.name) + '尚未解锁。到研究的「品种配方」打开该项，核对条件并点「研发」，随后返回安排生产。',
    running: (d) => '已安排' + quote(d.name) + '，目前正在生产。倒计时结束会自动入库，入库后才计入这项任务。',
    ready: (d) => '生产安排已记下：' + quote(d.name) + '。材料齐备会自动开工，完成后自动入库。',
    missing: (d) => '尚缺' + quote(d.item) + '，对应' + at(d) + '的' + quote(d.name) + '。点「查看来源」补足这项，材料齐备后自动开工。',
    upgrade: (d) => '目标为' + d.target + '级，先处理' + at(d) + '。' + d.entry + '，选择「+1」并「确认升级」，直到达标。',
    upgradeReady: (d) => '可升级的是' + at(d) + '。' + d.entry + '，核对报价后点「确认升级」；升级会增加产出。',
  }),
  field: say({
    buy: (d) => '想多照看一块田，就点下方的「' + d.purchase + '」。金额看妥了，再点「确认购买」。',
    funds: (d) => '添田的金币还不够。先去仓库点物品的「出售」换些金币，再回来点「' + d.purchase + '」，不用着急。',
    empty: (d) => at(d) + '还空着呢。点' + quote(d.button) + '，在列表里选' + quote(d.name) + '，让种子落地吧。',
    locked: (d) => '还得先备好' + quote(d.name) + '的种子。去研究的「品种配方」查看这项，条件齐了点「研发」，再回来种。',
    running: (d) => quote(d.name) + '正在慢慢长。等倒计时走完，收成就会自动入库。',
    ready: (d) => quote(d.name) + '已经安排妥当，材料齐备就会自动开工，收成会自动入库。',
    upgrade: (d) => '把' + at(d) + '慢慢升到' + d.target + '级就好。' + d.entry + '，选「+1」并点「确认升级」，一回一级。',
    upgradeReady: (d) => at(d) + '可以升级了，收成还能再多些。' + d.entry + '，看好金额后点「确认升级」吧。',
  }, {
    buy: (d) => '添田要花的钱先看清：点「' + d.purchase + '」，合适了再点「确认购买」。',
    funds: (d) => '手头金币不够添田。仓库有货就点「出售」，出货挣够了再点「' + d.purchase + '」。',
    empty: (d) => '种子得用在地里。' + at(d) + '点' + quote(d.button) + '，选' + quote(d.name) + '种下去。',
    locked: (d) => quote(d.name) + '还没研发，急着下地也没用。去研究的「品种配方」看条件，备齐点「研发」，再回来种。',
    running: (d) => quote(d.name) + '已经种下了，别重复折腾。倒计时结束，收成会自动入库。',
    ready: (d) => quote(d.name) + '的安排留着就行。材料齐备自动开工，产出自动入库。',
    upgrade: (d) => '这回要的是' + d.target + '级田，选' + at(d) + '来升。' + d.entry + '，用「+1」再「确认升级」，升够目标就好。',
    upgradeReady: (d) => '同一块地能多收一些，也划算。' + at(d) + '够钱升级；' + d.entry + '，核对后点「确认升级」。',
  }),
  livestock: say({
    buy: (d) => '先给小家伙们添个地方吧。点「' + d.purchase + '」看金额，没问题再「确认购买」。',
    funds: (d) => '新养殖场还差些金币。去仓库点库存物品的「出售」，出货后再回来点「' + d.purchase + '」吧。',
    empty: (d) => at(d) + '还没住进动物。点' + quote(d.button) + '，在列表选' + quote(d.name) + '，就有新伙伴啦。',
    locked: (d) => '想养' + quote(d.name) + '，先去研究的「品种配方」看看它的条件。备齐后点「研发」，再回来安排养殖。',
    running: (d) => quote(d.name) + '正在养着呢。等这一轮倒计时结束，产物会自己入库。',
    ready: (d) => quote(d.name) + '已经安排好了，材料齐备就会自动开工，产物会自动入库。',
    upgrade: (d) => at(d) + '这次要升到' + d.target + '级。' + d.entry + '，选「+1」点「确认升级」，一回回升到目标吧。',
    upgradeReady: (d) => at(d) + '能升级啦，养殖产出也能增加。' + d.entry + '，金额核对好就点「确认升级」。',
  }, {
    buy: (d) => '有了养殖场才好安排动物。下方点「' + d.purchase + '」，看看金额，再「确认购买」就行。',
    funds: (d) => '金币还没凑够，咱们先缓缓。去仓库点物品的「出售」，有了钱再回来点「' + d.purchase + '」。',
    empty: (d) => '咱们把' + quote(d.name) + '安排在' + at(d) + '吧。点' + quote(d.button) + '，列表里选它就好。',
    locked: (d) => quote(d.name) + '暂时还养不了。先去研究的「品种配方」看条件，凑齐点「研发」，再回来给它安排位置。',
    running: (d) => '这轮' + quote(d.name) + '已经在养了，安心等着吧。倒计时结束后，产物会自动入库。',
    ready: (d) => '已经给' + quote(d.name) + '排上了。材料齐备会自动开工，做完也会自动入库。',
    upgrade: (d) => '用' + at(d) + '完成这项吧，目标' + d.target + '级。' + d.entry + '，每回选「+1」再「确认升级」。',
    upgradeReady: (d) => '想让产物多一些，可以升' + at(d) + '。现在金币够了，' + d.entry + '，再点「确认升级」。',
  }),
  fish: say({
    buy: (d) => '要养就先把鱼池添上。点「' + d.purchase + '」，核对金额，点「确认购买」。',
    funds: (d) => '买鱼池的钱还不够。先去仓库点「出售」出些货，挣够再回来点「' + d.purchase + '」。',
    empty: (d) => '让' + at(d) + '忙起来！点' + quote(d.button) + '，从列表挑' + quote(d.name) + '。',
    locked: (d) => quote(d.name) + '得先研发。去研究的「品种配方」看清条件，备齐点「研发」，再回来安排养殖。',
    running: (d) => quote(d.name) + '这轮已经养上了。倒计时结束就自动入库，等它长成！',
    ready: (d) => quote(d.name) + '已经排好，材料齐备自动开工，产物也自动入库。',
    upgrade: (d) => '目标' + d.target + '级，拿' + at(d) + '来完成！' + d.entry + '，选「+1」再「确认升级」，一直升到目标。',
    upgradeReady: (d) => '还能多养出些鱼：' + at(d) + '够钱升级了。' + d.entry + '，核对后「确认升级」！',
  }, {
    buy: (d) => '鱼篓先放放，咱们得有个鱼池。点「' + d.purchase + '」看价格，再「确认购买」。',
    funds: (d) => '鱼池可不能拿鱼篓换，金币还差点。去仓库点库存物品的「出售」，出货后再点「' + d.purchase + '」。',
    empty: (d) => at(d) + '还没鱼作伴呢。点' + quote(d.button) + '，选上' + quote(d.name) + '，这池就热闹了。',
    locked: (d) => '先别急着捞' + quote(d.name) + '，还没研发呢。去研究的「品种配方」看条件，备齐点「研发」，再回来养。',
    running: (d) => quote(d.name) + '已经在池里忙着长了。等倒计时结束，产物会自动入库，咱们不用再捞一遍。',
    ready: (d) => quote(d.name) + '排好了。材料齐了它会自动开工，产物自动入库，省得咱们来回跑。',
    upgrade: (d) => '这趟要把' + at(d) + '升到' + d.target + '级。' + d.entry + '，选「+1」并「确认升级」，一程一程升上去。',
    upgradeReady: (d) => at(d) + '够钱升级了，往后产出还能添些。' + d.entry + '，瞧清报价再点「确认升级」。',
  }),
  mine: say({
    buy: (d) => '先买矿洞。点「' + d.purchase + '」，核对金额，再「确认购买」。',
    funds: (d) => '金币不足。去仓库点物品的「出售」。出货后，回来点「' + d.purchase + '」。',
    empty: (d) => at(d) + '空着。点' + quote(d.button) + '，选' + quote(d.name) + '。',
    locked: (d) => quote(d.name) + '未研发。去研究的「品种配方」查看条件。备齐点「研发」，再回来开采。',
    running: (d) => quote(d.name) + '正在开采。倒计时结束，自动入库。',
    ready: (d) => quote(d.name) + '已安排。材料齐备自动开工，产出自动入库。',
    upgrade: (d) => at(d) + '，目标' + d.target + '级。' + d.entry + '。选「+1」，点「确认升级」，逐级升到目标。',
    upgradeReady: (d) => at(d) + '可升级，能增加产出。' + d.entry + '。核对，再「确认升级」。',
  }, {
    buy: (d) => '开采前先购置矿洞。点「' + d.purchase + '」，核对金额后「确认购买」。',
    funds: (d) => '目前资金不足以购置矿洞。到仓库点库存物品的「出售」，补足金币再回来点「' + d.purchase + '」。',
    empty: (d) => '开采位置选' + at(d) + '。点' + quote(d.button) + '，确认列表中的' + quote(d.name) + '。',
    locked: (d) => quote(d.name) + '尚未研发，暂时不能安排开采。先到研究的「品种配方」核对条件，备齐后点「研发」，再回矿洞安排。',
    running: (d) => '保持当前安排，' + quote(d.name) + '正在开采。倒计时结束后自动入库。',
    ready: (d) => '开采安排为' + quote(d.name) + '。材料齐备后自动开工，完成后自动入库。',
    upgrade: (d) => '本项要求' + d.target + '级，选定' + at(d) + '逐级升级。' + d.entry + '，选「+1」，核对后「确认升级」。',
    upgradeReady: (d) => '已满足' + at(d) + '的升级费用。' + d.entry + '，核对报价并「确认升级」，提高开采产出。',
  }),
  processing: say({
    buy: (d) => '先添工位。点「' + d.purchase + '」看报价，合适就「确认购买」，再排活儿。',
    funds: (d) => '增设工位还差金币。去仓库点「出售」出货，钱够了再点「' + d.purchase + '」。',
    empty: (d) => '配方选' + quote(d.name) + '。到' + at(d) + '点' + quote(d.button) + '，在列表里选它。',
    locked: (d) => quote(d.name) + '还没研发，先办这件。研究里开「品种配方」，看清条件，备齐点「研发」，回来再排工位。',
    running: (d) => quote(d.name) + '正在做，不用再排。倒计时一结束，产物就自动入库。',
    ready: (d) => '排好了，做' + quote(d.name) + '。材料齐了自动开工，成品自动入库。',
    missing: (d) => '差的是' + quote(d.item) + '，在' + at(d) + '。点「查看来源」补齐，' + (d.name ? quote(d.name) : '这批') + '等材料齐备后就会自动开工。',
    idle: (d) => at(d) + '没排活儿，点「选择配方」挑要做的，别漏了这处。',
    upgrade: (d) => '选' + at(d) + '，这次升到' + d.target + '级。' + d.entry + '，选「+1」再「确认升级」，逐级升够。',
    upgradeReady: (d) => '升级钱够了，' + at(d) + '能加产出。' + d.entry + '，看准报价再「确认升级」。',
  }, {
    buy: (d) => '先添个工位，活儿才排得开。下方点「' + d.purchase + '」，看妥金额再点「确认购买」。',
    funds: (d) => '工位的钱还没凑够，先把这一步缓一缓。到仓库点物品的「出售」，出货后再回这里点「' + d.purchase + '」。',
    empty: (d) => '咱们把' + quote(d.name) + '放在' + at(d) + '做吧。点' + quote(d.button) + '，在列表找到它就行。',
    locked: (d) => '要做' + quote(d.name) + '，得先把配方备好。去研究的「品种配方」看条件，凑齐后点「研发」，再回来安排。',
    running: (d) => quote(d.name) + '已经在做了，给它一点时间。倒计时结束会自动入库。',
    ready: (d) => quote(d.name) + '已经安排妥当。等材料齐了会自动开工，做好也会自动入库。',
    missing: (d) => at(d) + '暂时做不了' + (d.name ? quote(d.name) : '这一批') + '，还缺' + quote(d.item) + '。点「查看来源」找齐这项，材料齐备后就会自动开工。',
    idle: (d) => '这里还留着' + at(d) + '。想好要做什么，再点「选择配方」安排就行。',
    upgrade: (d) => '用' + at(d) + '来完成吧，要升到' + d.target + '级。' + d.entry + '，每次选「+1」再点「确认升级」，慢慢升到目标。',
    upgradeReady: (d) => '想多做些产物，可以给' + at(d) + '升级，费用已经够了。' + d.entry + '，核对好再点「确认升级」。',
  }),
  refining: say({
    buy: (d) => '先留好精制的位置。点「' + d.purchase + '」，金额核对妥当，再点「确认购买」。',
    funds: (d) => '金币还不够添精制位。先去仓库点库存物品的「出售」，出货后回来点「' + d.purchase + '」。',
    empty: (d) => '选定' + quote(d.name) + '再排炉台。' + at(d) + '点' + quote(d.button) + '，在列表里选它。',
    locked: (d) => quote(d.name) + '的配方还没备好。去研究的「品种配方」核对条件，备齐后「研发」，再回来安排精制。',
    running: (d) => quote(d.name) + '正在精制，等这一轮做完。倒计时结束后会自动入库。',
    ready: (d) => '已排好' + quote(d.name) + '。材料齐备会自动开工，做好会自动入库。',
    missing: (d) => at(d) + '还缺' + quote(d.item) + '，材料不齐不能起炉。点「查看来源」补足这项，材料齐备后会自动开工。',
    idle: (d) => '先定下要精制的商品。' + at(d) + '还空着，点「选择配方」挑一份吧。',
    upgrade: (d) => '这项用' + at(d) + '升到' + d.target + '级。' + d.entry + '，选「+1」并「确认升级」，逐级做到目标。',
    upgradeReady: (d) => at(d) + '可以提升产出了。' + d.entry + '，报价核对清楚后点「确认升级」。',
  }, {
    buy: (d) => '要多做一炉，先添精制位。点「' + d.purchase + '」核对金额，再点「确认购买」。',
    funds: (d) => '添炉台还差金币。先到仓库点物品的「出售」，出货攒够后，回来点「' + d.purchase + '」。',
    empty: (d) => quote(d.name) + '这份手艺，就安排在' + at(d) + '。点' + quote(d.button) + '，在列表选它。',
    locked: (d) => '先把' + quote(d.name) + '的配方学会。去研究的「品种配方」看所需条件，备齐点「研发」，再回来起炉。',
    running: (d) => '这一炉在做' + quote(d.name) + '，等火候到了再说。倒计时结束，成品会自动入库。',
    ready: (d) => quote(d.name) + '已经排上，材料齐备就自动开工，做成后自动入库。',
    missing: (d) => '这炉还少' + quote(d.item) + '，是' + at(d) + '要用的。点「查看来源」把这项料找齐，全部材料齐备便会自动开工。',
    idle: (d) => '想做哪样商品？' + at(d) + '还闲着，点「选择配方」定下来，我们就照配方做。',
    upgrade: (d) => '把' + at(d) + '升到' + d.target + '级，这项就有着落了。' + d.entry + '，用「+1」再「确认升级」，逐级升上去。',
    upgradeReady: (d) => '手艺能多出些成品了：' + at(d) + '费用够升级。' + d.entry + '，核对后点「确认升级」。',
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
  breadRecipe: '先把面包配方学会。打开「品种配方」，点「乡村面包」看需要的金币和材料，备齐后点「研发」。',
  firstSale: '这次先出一笔货：找有库存的物品点「出售」，选好数量，再点「确认出售」。',
  firstSeed: '我们先准备甘蔗种子。打开「品种配方」点「甘蔗」，金币和材料齐了，再点「研发」。',
  firstSwitch: '还没有其他作物可种。先去研究的「品种配方」点「甘蔗」，备齐条件后「研发」，再回田地用「换种」选择甘蔗。',
  reserveStock: '给加工留点材料吧。点任一物品打开详情，再点「加工保留量」，填一个大于0的数量，最后点「保存」。',
  recipeTrio: '这一步要累计解锁3种商品配方。在「品种配方」找还没研发的商品，点开看材料，备齐后点「研发」。',
  codex20: '图鉴要收录到20种。点尚未收录的物品，用「查看研发」检查条件，备齐后点「研发」；累计解锁20种就达标。',
  collectLocked: (d) => '先把' + d.branch + '的品种研发出来：去研究的「品种配方」核对条件并「研发」，再回来点' + quote(d.button) + '安排生产。',
  processingLocked: (d) => '下一步做' + d.branch + '加工。先去研究的「品种配方」研发对应加工配方，再回加工位点「选择配方」。',
  mixedLocked: '这次需要多来源商品。先去研究的「品种配方」研发多来源的商品配方，再回精制位点「选择配方」。',
  newFarmGate: '交接还有产值门槛没到。先继续生产，累计产值达到任务要求后，再点「出售庄园」核对收益，最后「确认出售」。',
  newFarm: '交接前咱们把收益与重置项目逐一看清，再点「出售庄园」，确认妥当后点「确认出售」。',
  firstTech: '这一步去「经营改良」做。点一项未满级改良，看需要多少高级研发点，备齐后点「确认升级」。',
  delegationTech: '接下来改良「代管时长」。打开「经营改良」点这一项，核对高级研发点，备齐后点「确认升级」。',
}, {
  breadRecipe: '本项是解锁配方，不是生产面包。打开「品种配方」，点「乡村面包」核对金币与材料，满足后点「研发」。',
  firstSale: '第一次出货需实际售出物品。点库存物品的「出售」，选择数量，再点「确认出售」完成成交。',
  firstSeed: '要解锁的是「甘蔗」。到「品种配方」打开它，核对金币、材料，满足条件后点「研发」。',
  firstSwitch: '目前没有小麦以外的已解锁作物。先在研究的「品种配方」研发「甘蔗」，再回田地点击「换种」，选择甘蔗。',
  reserveStock: '保留量必须大于0。打开任一物品详情，点「加工保留量」，输入数量后点「保存」。',
  recipeTrio: '本项目标是累计解锁3种商品配方。在「品种配方」打开未研发的商品项，核对材料，满足后点「研发」。',
  codex20: '计入收录的是已解锁物品，目标20种。点未收录项，再点「查看研发」核对条件并「研发」，累计解锁20种即可。',
  collectLocked: (d) => '当前先补' + d.branch + '品种的研发。到研究的「品种配方」查看条件并「研发」，返回后点' + quote(d.button) + '安排生产。',
  processingLocked: (d) => d.branch + '加工配方尚未解锁。先到研究的「品种配方」研发对应项，再回加工位点「选择配方」。',
  mixedLocked: '本项要求多来源商品。先在研究的「品种配方」研发多来源的商品配方，再到精制位点「选择配方」安排。',
  newFarmGate: '出售次数之外，本项还有累计产值门槛。先生产至任务要求，再点「出售庄园」核对收益并「确认出售」。',
  newFarm: '累计产值门槛已满足。核对本页预计收益及重置项目，点「出售庄园」，最后点「确认出售」完成交接。',
  firstTech: '改良必须实际升级才计入任务。打开「经营改良」，选择未满级项，核对所需高级研发点后点「确认升级」。',
  delegationTech: '此项目标是「代管时长」，其他改良不能替代。打开「经营改良」点该项，备齐高级研发点，再点「确认升级」。',
});

const researchCopy = say({
  breadRecipe: '乡村面包的配方值得看看。打开「品种配方」点「乡村面包」，核对金币和材料，备齐后点「研发」。',
  firstSeed: '接下来看看甘蔗吧。去「品种配方」点「甘蔗」，把金币和材料备齐，再点「研发」。',
  recipeTrio: '多一种配方，就多一种能做的商品。去「品种配方」打开未研发的商品，查看材料后点「研发」，这一步累计解锁3种。',
  firstTech: '这次看看长期效果。打开「经营改良」选一项未满级改良，核对所需高级研发点，备齐后点「确认升级」。',
  delegationTech: '想延长代管，就研究这一项：「经营改良」里的「代管时长」。点开核对高级研发点，备齐后点「确认升级」。',
}, {
  breadRecipe: '先核对配方，别把解锁和生产混为一谈。「品种配方」点「乡村面包」，看清金币、材料后点「研发」。',
  firstSeed: '这一项研究的是甘蔗种子。打开「品种配方」，点「甘蔗」逐项核对条件，满足后「研发」。',
  recipeTrio: '这里计算已解锁商品配方，目标3种。在「品种配方」打开未研发的商品，检查材料，再点「研发」。',
  firstTech: '普通研发点不用于这一步。到「经营改良」选未满级项，检查所需高级研发点，满足后点「确认升级」。',
  delegationTech: '要改的是代管时间，选「经营改良」中的「代管时长」。核对所需高级研发点，再点「确认升级」。',
});
const warehouseTaskCopy = say({
  firstSale: '有库存就能出货。点那件物品的「出售」，数量选准，最后点「确认出售」；这笔成交才算第一次出货。',
  reserveStock: '加工要留的量，别跟待售货混了。打开任一物品详情，点「加工保留量」，填大于0的数量，再「保存」。',
}, {
  firstSale: '要出哪一箱呢？找有库存的物品点「出售」，选好数量再「确认出售」，就能完成第一次出货了。',
  reserveStock: '可以先替加工留好一份。点任一物品看详情，打开「加工保留量」，填一个大于0的数，再点「保存」就好。',
});
const estateTaskCopy = say({
  codex20: '请先看看未收录的物品。点开后用「查看研发」核对条件，备齐再「研发」；累计解锁20种就能完成这项收录。',
  newFarmGate: '交接还需达到任务的累计产值门槛，请先继续生产。达标后再点「出售庄园」，核对收益后「确认出售」。',
  newFarm: '交接关系到下一轮安排，请先核对预计收益和重置项目。确认妥当后点「出售庄园」，再点「确认出售」。',
}, {
  codex20: '咱们把图鉴补到20种吧。点未收录的物品，再点「查看研发」看条件，备齐后「研发」；按累计解锁数算。',
  newFarmGate: '交接得等产值够任务门槛，咱们先把生产接着做。达标后点「出售庄园」看收益，再「确认出售」。',
  newFarm: '交接前，咱们一起看看预计收益和要重置的项目。谈妥这笔安排，再点「出售庄园」和「确认出售」。',
});

const productionTaskCopy = {
  field: say({ firstSwitch: '先准备另一种种子吧。去研究的「品种配方」点「甘蔗」，核对条件后「研发」，再回田地用「换种」选甘蔗。' },
    { firstSwitch: '手里还没有小麦以外的作物。研究的「品种配方」先研发「甘蔗」，再回田地用「换种」选它，种子别选错了。' }),
  livestock: say({ collectLocked: (d) => '还得先认识能养的品种。去研究的「品种配方」看条件并「研发」，再回来点' + quote(d.button) + '，把小家伙养起来吧。' },
    { collectLocked: (d) => '咱们先把品种研发出来。研究里打开「品种配方」，核对条件后「研发」，再回养殖场点' + quote(d.button) + '安排。' }),
  fish: say({ collectLocked: (d) => '先把鱼种拿下！去研究的「品种配方」核对条件并「研发」，回来点' + quote(d.button) + '，这才养得起来。' },
    { collectLocked: (d) => '池子可等不来没研发的鱼。先去研究的「品种配方」看条件并「研发」，回来点' + quote(d.button) + '，咱们再养。' }),
  mine: say({ collectLocked: (d) => '先研发矿种。研究的「品种配方」查看条件，备齐点「研发」。回来点' + quote(d.button) + '。' },
    { collectLocked: (d) => '矿种尚未研发，先别安排开采。到研究的「品种配方」核对条件，备齐后「研发」，再回来点' + quote(d.button) + '。' }),
  processing: say({ processingLocked: (d) => '先补' + d.branch + '加工配方。去研究的「品种配方」核对条件并「研发」，回来点加工位的「选择配方」，再排活儿。' },
    { processingLocked: (d) => '这次要做' + d.branch + '加工，先把配方准备好吧。研究的「品种配方」里研发对应加工项，再回加工位点「选择配方」。' }),
  refining: say({ mixedLocked: '这次要用多来源的商品配方。先去研究的「品种配方」研发对应商品，再回精制位点「选择配方」，照配方备料。' },
    { mixedLocked: '这一炉要把几种来源的料做成商品。先到研究的「品种配方」研发多来源商品配方，再回精制位点「选择配方」安排。' }),
};

export function taskHelpCopy(speaker, type, details = {}) {
  const voice = helpVoice(speaker);
  const specialized = { research: researchCopy, warehouse: warehouseTaskCopy, estate: estateTaskCopy, ...productionTaskCopy }[voice.role];
  const copy = specialized?.[voice.gender]?.[type] ?? taskCopy[voice.gender][type];
  return typeof copy === 'function' ? copy(details) : copy;
}

export function tutorialDestination(speaker, destination, text) {
  return helpVoice(speaker).gender === 'male'
    ? '本项去「' + destination + '」办理。' + text
    : '先到「' + destination + '」，我们接着做这一项。' + text;
}

export function otherStationCopy(speaker) {
  return helpVoice(speaker).gender === 'male'
    ? '这一类工位已经达标。换到另一类工位，点「升级」并核对，再点「确认升级」。'
    : '这页的工位等级已经够了，去另一类工位点「升级」，核对后再点「确认升级」吧。';
}

export function researchHelpCopy(speaker, type, details = {}) {
  const male = helpVoice(speaker, 'research').gender === 'male';
  if (type === 'quality') return male
    ? '普通研发点已够一次品质抽取。点「抽取一次」，抽取结果会提升品质。' + (details.all ? '点「全部抽取」则会用可用点数连续抽取。' : '')
    : '普通研发点攒够了，可以看看新的品质结果。点「抽取一次」；' + (details.all ? '想接着试，也可以点「全部抽取」连抽。' : '抽取会提升品质。');
  return male
    ? quote(details.name) + '具备升级条件。先点开核对效果与报价，确认后点「确认升级」。'
    : quote(details.name) + '能再改良一步了。想看看会有什么变化吗？点开核对效果，再点「确认升级」。';
}

const introductions = say({
  管理员管理: '各位管理员的好感和今日心愿都在这里。您可以送礼，也可以切换角色，慢慢认识大家。',
  统计: '想了解庄园近况，请看这里的生产状态、库存估值和累计收入，再安排接下来的经营。',
  出售庄园历史: '过去每次出售庄园的时间与产值都记在这里，您可以逐次查阅交接记录。',
  图鉴: '想找一件物品的材料、来源或用途，可以来这里查。未收录的物品也能打开，查看研发条件。',
  出售庄园: '请先看看高级研发点的预计收益与新一轮配置。交接前把安排核对妥当，再确认出售庄园。',
}, {
  管理员管理: '咱们先认认人吧。这里列着管理员的好感和今日心愿，送礼、切换角色也都在这儿。',
  统计: '庄园经营得怎么样，咱们拿数字说话：生产状态、库存估值和累计收入，都能在这里核对。',
  出售庄园历史: '想回头看哪次交接？每次出售庄园的时间和产值，这里都留着记录。',
  图鉴: '哪件物品让你好奇？这里能查材料、来源和用途；没收录的也能点开，看下一步该怎么研发。',
  出售庄园: '下一轮怎么安排，咱们在这里商量。先看高级研发点预计收益和新一轮配置，核对好了再确认出售庄园。',
});

export function contextHelpCopy(role, gender, type, details) {
  const speaker = helpVoice({ role, gender });
  if (type === 'introduction') return introductions[speaker.gender][details.page] ?? null;
  if (type === 'missing' || type === 'idle') return productionHelpCopy(speaker, type, details);
  const copy = {
    field: say((d) => at(d) + '还空着。点' + quote(d.button) + '选好作物，我们把这一块也照看起来。', (d) => at(d) + '别白空着。点' + quote(d.button) + '挑种子，让这块地也有收成。'),
    livestock: say((d) => at(d) + '还没有动物呢。点' + quote(d.button) + '，挑个想养的小家伙吧。', (d) => '还有' + at(d) + '能安排动物。点' + quote(d.button) + '，挑个合适的品种就行。'),
    fish: say((d) => at(d) + '还空着，不能落下这池！点' + quote(d.button) + '，挑好鱼种养起来。', (d) => '鱼还没来，' + at(d) + '倒先等上了。点' + quote(d.button) + '，给它挑批鱼种吧。'),
    mine: say((d) => at(d) + '空着。点' + quote(d.button) + '，选矿种。', (d) => '先定开采矿种。到' + at(d) + '点' + quote(d.button) + '选择，安排好再开工。'),
  }[role]?.[speaker.gender];
  return copy ? copy(details) : null;
}

export const characterHelpCopy = {
  tasks: say((name) => '接下来是「' + name + '」，我们把这一项接好。', (name) => '下一项已列明：「' + name + '」。先核对要求，再办理。'),
  estate: say(() => '若准备交接，请先核对「出售庄园」里的高级研发点预计收益，再决定下一轮安排。', () => '想谈谈下一轮？先去「出售庄园」看看高级研发点预计收益，咱们再拿主意。'),
  livestock: say((kind) => kind === 'empty' ? '还有空栏等着新伙伴。点「安排养殖」，挑个想养的小家伙吧。' : '还没有养殖场呢。先点「购买养殖场」，把金额看好，再「确认购买」，我们再迎接动物。', (kind) => kind === 'empty' ? '有空栏就能安排动物。点「安排养殖」，挑个合适的品种就行。' : '咱们先把养殖场添上。下方点「购买养殖场」，核对金额后「确认购买」，再安排动物。'),
  field: say((kind) => kind === 'empty' ? '这块田还空着，点「播种」选种子，让它慢慢长起来吧。' : '还没有田地，先从一块开始。点「购地」看好金额，再点「确认购买」，之后就能播种了。', (kind) => kind === 'empty' ? '空田别浪费了，点「播种」挑种子下地吧。' : '要种粮得先有田。点「购地」核对花费，合适再「确认购买」，买好就能种。'),
  mine: say((kind) => kind === 'empty' ? '矿洞空着。点「开采」，选矿种。' : '没有矿洞。点「购买矿洞」，核对金额，再「确认购买」。', (kind) => kind === 'empty' ? '先选开采矿种。空矿洞点「开采」，按列表安排。' : '先购置矿洞，才能安排开采。点「购买矿洞」核对金额，再点「确认购买」。'),
  fish: say((kind) => kind === 'empty' ? '空池也得养起来！点「安排养殖」挑鱼种，别落下这一池。' : '想养鱼，就先买鱼池。点「购买鱼池」看价格，核对好再「确认购买」。', (kind) => kind === 'empty' ? '池子有了，就差鱼来作伴。点「安排养殖」，挑批鱼种吧。' : '咱们得先有个鱼池，鱼篓可养不了鱼。点「购买鱼池」看金额，再「确认购买」。'),
  processing: say((name) => name ? '还差「' + name + '」，点「查看来源」把料补齐，齐了会自动开工。' : '有工位没排活儿。点「选择配方」，定下来就照着做。', (name) => name ? '这一批先等等，还缺「' + name + '」。点「查看来源」找材料，补齐了就会自动开工。' : '工位还空着呢。想好要做什么，再点「选择配方」安排就行。'),
  refining: say((name) => name ? '材料里还少「' + name + '」。点「查看来源」补齐，齐备了再自动起炉。' : '先挑要精制的商品吧。空位点「选择配方」，定下配方再排材料。', (name) => name ? '缺的是「' + name + '」，这炉还起不来。点「查看来源」把材料备齐，就会自动开工。' : '炉边还留着位置。点「选择配方」，挑一份想做好的商品吧。'),
  warehouse: say((name, rate) => rate < 0 ? '「' + name + '」今天卖价降了。要出这批货，先看清价格，再点「出售」。' : '「' + name + '」今天涨价。想出货就点「出售」核对数量和金额，这笔账你来定。', (name, rate) => rate < 0 ? '我把「' + name + '」的价格对过了，今天低些。你可以先看看，再决定要不要点「出售」。' : '这箱「' + name + '」今天能卖得高些。要出货的话，点「出售」看看数量和金额吧。'),
  research: say(() => '有能继续研发的项目了。打开「品种配方」看看想研究哪一项，核对条件后点「研发」。', () => '已有项目满足研发条件。到「品种配方」逐项核对前置、材料与金币，再点「研发」，别把可研发当成已解锁。'),
  merchant: say(() => '现在还没开摊。开摊条件列在下面，先看看还差哪一项，达标再来谈买卖。', () => '货架还没到开张的时候。往下看「开摊条件」，哪项没够就先补哪项，买卖跑不了。'),
};
