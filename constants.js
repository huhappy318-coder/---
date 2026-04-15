const STORAGE_KEYS = {
  SETTINGS: "settings",
  STATS: "stats",
  TIMER_STATS: "timerStats",
  SAVED_LIST: "savedList",
  SNOOZE_MAP: "snoozeMap",
  TIMER_SESSIONS: "timerSessions"
};

const PAGE_TYPES = ["shopping", "video", "social", "article", "workStudy", "default"];

const TONE_STYLES = ["gentle", "calm", "direct"];

const DEFAULT_SETTINGS = {
  enabled: true,
  pageTypeEnabled: {
    shopping: true,
    video: true,
    social: true,
    article: true,
    workStudy: true,
    default: true
  },
  thresholds: {
    longStaySeconds: 300,
    longStayScrollCount: 8,
    mediumStaySeconds: 180,
    directionChangeCount: 6,
    revisitForegroundCount: 3,
    revisitStaySeconds: 240
  },
  cooldownSeconds: 600,
  maxPromptsPerPageLoad: 2,
  toneStyle: "gentle",
  timerEnabled: true,
  timerDefaultMinutes: 10,
  timerCurrentTabOnly: true,
  timerAllowPerType: true,
  timerForceModalEnabled: true,
  timerCooldownMinutes: 3,
  timerMaxModalCountPerLoad: 2,
  timerModalTone: "gentle",
  perTypeTimerConfig: {
    shopping: { enabled: true, minutes: 15 },
    video: { enabled: false, minutes: 20 },
    social: { enabled: true, minutes: 10 },
    article: { enabled: false, minutes: 25 },
    workStudy: { enabled: false, minutes: 30 },
    default: { enabled: false, minutes: 20 }
  }
};

const MESSAGE_TYPES = {
  GET_BOOTSTRAP: "GET_BOOTSTRAP",
  RECORD_TRIGGER: "RECORD_TRIGGER",
  SNOOZE_PAGE: "SNOOZE_PAGE",
  SAVE_FOR_LATER: "SAVE_FOR_LATER",
  ATTEMPT_LEAVE: "ATTEMPT_LEAVE",
  GET_POPUP_DATA: "GET_POPUP_DATA",
  GET_HISTORY_DATA: "GET_HISTORY_DATA",
  DELETE_HISTORY_ITEM: "DELETE_HISTORY_ITEM",
  CLEAR_HISTORY: "CLEAR_HISTORY",
  GET_SETTINGS: "GET_SETTINGS",
  SAVE_SETTINGS: "SAVE_SETTINGS",
  START_TIMER: "START_TIMER",
  STOP_TIMER: "STOP_TIMER",
  GET_TIMER_STATUS: "GET_TIMER_STATUS",
  EXTEND_TIMER: "EXTEND_TIMER",
  RECORD_TIMER_EVENT: "RECORD_TIMER_EVENT",
  SYNC_TIMER_SESSION: "SYNC_TIMER_SESSION"
};

const MICRO_COPY = {
  toneLabels: {
    gentle: "温和",
    calm: "冷静",
    direct: "直接"
  },
  pageTypeLabels: {
    shopping: "购物",
    video: "视频",
    social: "社交内容流",
    article: "文章 / 新闻 / 知识",
    workStudy: "工作学习",
    default: "其他页面"
  }
};

const COPY_LIBRARY = {
  gentle: {
    shopping: [
      "先停一下吧 🌿 你已经比了挺久，也许现在最需要的是轻一点做决定。",
      "选项已经不少啦，不一定非得再多看一页。",
      "如果你开始反复切商品，也许可以先收一下注意力。",
      "慢一点没关系，但也不用把自己留在无限比较里。",
      "这一页已经陪你够久啦，要不要先缓一缓？",
      "不着急完美，先按现在的感觉做个小选择也很好。"
    ],
    video: [
      "先停一下吧 🌿 你已经看了一会儿，休息和继续都值得被你认真选一下。",
      "如果本来是想放松，现在也许已经够了。",
      "视频会继续推荐，你的时间不会自动回来。",
      "再看一点当然很顺手，但停住也很厉害。",
      "要不要先给这一轮观看一个温柔的结束？",
      "你可以继续，也可以把这几分钟还给自己 💚"
    ],
    social: [
      "好啦，先停一下吧 🌿 你已经刷了一会儿了。",
      "信息流不会停，但你可以先照顾一下自己的注意力。",
      "如果已经开始机械下滑，也许现在暂停会更舒服。",
      "再刷新一轮很容易，不过先离开一下也很好。",
      "这里还会一直更新，你不用一直留在这里。",
      "不急着继续，先让脑子透口气吧。"
    ],
    article: [
      "你已经读了一阵啦，要不要先停一下，消化一下刚刚看到的内容？",
      "继续输入当然可以，但理解有时更需要一点空白。",
      "如果你开始来回滚动，也许现在更适合先整理结论。",
      "不着急读完，先把注意力从页面上轻轻拿回来。",
      "你已经获取了不少信息，也许可以先停在这里。",
      "先缓一缓吧 🌿 让理解追上阅读。"
    ],
    workStudy: [
      "先停一下吧 🌿 你已经在这页待了挺久，休息一下不等于偷懒。",
      "继续盯着文档，不一定会让思路更快出现。",
      "给自己一个短暂停顿，往往比硬撑更有效。",
      "如果你在同一页来回看，也许现在需要的是换口气。",
      "这会儿最值得保护的，可能是你的专注力。",
      "先喝口水，或者站起来一下，也许会更清醒。"
    ],
    default: [
      "先停一下吧 🌿 你已经在这页待了一会儿。",
      "继续也可以，不过先问一句：你现在想得到什么？",
      "如果已经反复看了几轮，也许可以给自己一个停止点。",
      "不急着继续，先做个小决定也很好。",
      "这一页可以晚点再回来，现在先把人从里面抽出来。",
      "好啦，先歇一下，再决定还要不要继续。"
    ]
  },
  calm: {
    shopping: [
      "你已在购物页停留较长时间。继续比较未必提升判断质量。",
      "当前信息量已经足够，可以考虑停止继续筛选。",
      "如果你开始来回切换商品，说明比较成本正在上升。",
      "继续浏览可能只会增加犹豫，而不是增加确定性。",
      "现在更适合做决定，而不是继续扩充选项。",
      "可以先加入稍后再看，再把注意力收回来。"
    ],
    video: [
      "你已在视频页停留较长时间。继续浏览未必真正放松。",
      "内容仍会继续，但你的精力在持续被占用。",
      "继续下滑是惯性，停下则是主动选择。",
      "如果目标只是放松，现在或许已经足够。",
      "可以选择再看一会儿，也可以先离开页面。",
      "这段时间已经消耗不少，适合做一个边界。"
    ],
    social: [
      "你已停留较长时间。信息流会继续，但注意力有限。",
      "继续刷新未必带来更多价值。",
      "如果你已开始重复滑动，现在可以考虑结束这一轮浏览。",
      "你可以稍后再回来，不必一直在线接收内容。",
      "这类页面容易持续吸走精力，适合主动收束。",
      "现在离开，不代表错过，只是减少消耗。"
    ],
    article: [
      "你已阅读较长时间。继续浏览未必提升理解。",
      "如果你开始回看和反复滚动，信息可能已接近过载。",
      "当前更适合整理结论，而不是继续输入。",
      "继续阅读当然可以，但停下来会更有结构。",
      "可以先保存页面，稍后带着问题再回来。",
      "现在适合给这段阅读一个阶段性结束。"
    ],
    workStudy: [
      "你已在工作学习页面停留较长时间。",
      "持续盯着同一页内容，效率可能已经下降。",
      "可以先短暂停顿，再决定是否继续推进。",
      "如果你在反复查看同一区域，说明可能需要切换节奏。",
      "继续停留未必提升产出，适当离开反而有帮助。",
      "现在适合做一次小休息或任务切换。"
    ],
    default: [
      "你已停留较长时间。",
      "继续浏览未必让判断更清楚。",
      "如果开始重复查看，说明这页已经占用了较多注意力。",
      "可以选择稍后再看，或现在离开。",
      "当前页面可能已进入低效率停留阶段。",
      "适合先停一下，再决定下一步。"
    ]
  },
  direct: {
    shopping: [
      "别在纠结啦。你已经看太久了。",
      "再比下去，不会更确定。",
      "选项够了，现在缺的是决定。",
      "这不是在挑选了，这是在耗自己。",
      "给这一轮比较一个结束。",
      "别再切页面了，先停。"
    ],
    video: [
      "你已经看太久了。",
      "再刷下去，不会更放松。",
      "下一条也不会自动让你满意。",
      "现在停，比继续划更值。",
      "别把时间都交给推荐流。",
      "这轮视频该收住了。"
    ],
    social: [
      "别刷了，你已经待太久了。",
      "再刷新，也不会更清醒。",
      "这页正在拿走你的注意力。",
      "信息流没有尽头，你得自己停。",
      "继续滑，只会更累。",
      "现在退出，比再看一轮更重要。"
    ],
    article: [
      "你已经看太久了。",
      "继续读，不代表继续理解。",
      "信息够多了，先停。",
      "别把输入误当成进展。",
      "这页该结束了。",
      "先整理，不要再堆内容。"
    ],
    workStudy: [
      "你已经盯这页太久了。",
      "继续硬扛，效率不会变高。",
      "先停三分钟，再回来。",
      "这会儿需要的是切换，不是死磕。",
      "你的专注力已经在掉。",
      "先离开一下，再决定要不要继续。"
    ],
    default: [
      "别在纠结啦。",
      "你已经停太久了。",
      "继续看，不会自动变清楚。",
      "这页够了，现在停。",
      "别再反复看了。",
      "先做决定，再继续。"
    ]
  }
};

const FORCE_MODAL_COPY = {
  gentle: {
    shopping: [
      "时间到啦 ⏰ 你已经挑了挺久，不一定要再多看几个选项。",
      "先停一下吧 🌿 也许你现在更需要的是一个决定，而不是更多商品。"
    ],
    video: [
      "到点啦 ⏰ 这一轮放松可以先停在这里。",
      "先歇一下吧 💚 继续看未必比现在更舒服。"
    ],
    social: [
      "时间到啦 ⏰ 信息还会继续，但你可以先不继续。",
      "先停一下吧 🌿 你可能已经进入越刷越空的状态了。"
    ],
    article: [
      "到点啦 ⏰ 先停一下，也许会比继续读更容易形成理解。",
      "这会儿先收一收吧 📌 内容可以稍后再回来。"
    ],
    workStudy: [
      "时间到啦 ⏰ 给大脑一个短暂停顿，效率会更稳。",
      "先停一下吧 🌿 你已经专注挺久了，该换口气了。"
    ],
    default: [
      "时间到啦 ⏰ 先从这页里出来一下吧。",
      "别急着继续，先给自己一个小暂停 💚"
    ]
  },
  calm: {
    shopping: [
      "已到你设定的时间。继续比较未必提升判断质量。",
      "当前购物浏览已超过预设时长，可以考虑停止并稍后再看。"
    ],
    video: [
      "已到预设时间。继续浏览视频未必带来更多放松。",
      "这段观看时间已经用完，适合暂停并重新选择。"
    ],
    social: [
      "已到预设时间。继续停留在信息流中，价值可能递减。",
      "当前浏览已超出设定时长，建议先离开页面。"
    ],
    article: [
      "已到预设时间。继续输入未必提升理解质量。",
      "可以先保存页面，再带着明确问题回来。"
    ],
    workStudy: [
      "已到预设时间。继续停留未必保持当前效率。",
      "建议先短暂休息，再决定是否继续当前页面。"
    ],
    default: [
      "已到预设时间，可以选择结束这一轮浏览。",
      "这段时间已经用完，现在适合做一次主动决策。"
    ]
  },
  direct: {
    shopping: [
      "别在纠结啦 💚 时间已经到了。",
      "你设的时间用完了，再看下去也不会更确定。"
    ],
    video: [
      "时间到。别再继续刷视频了。",
      "这一轮该停了，继续看不会更值。"
    ],
    social: [
      "时间到。别再刷了。",
      "你已经看够久了，现在退出。"
    ],
    article: [
      "时间到。先停，不要再堆信息。",
      "这页已经够了，先结束这一轮。"
    ],
    workStudy: [
      "时间到。先离开这页，别硬撑。",
      "该休息了，再盯下去只会更钝。"
    ],
    default: [
      "时间到。现在停。",
      "别继续耗了，先离开这页。"
    ]
  }
};
