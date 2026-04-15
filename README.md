# 别在纠结啦

`别在纠结啦` 是一个完全本地运行的浏览器插件，帮你在购物比价、刷视频、刷内容流、阅读文章、工作学习时，及时发现自己是不是已经停留太久，然后用更温和、更成熟的方式提醒你先停一下。

V2 在保留原有“普通提醒 + 稍后再看 + 设置页 + 历史页”的基础上，新增了更完整的绿白视觉体系、中国大陆网站优先识别、Chrome / Edge / Firefox 兼容支持，以及重点功能 `计时提醒 / 到点强提醒`。

## V2 新增功能

- 全量 UI 升级：popup、options、history、网页内提醒卡片、强提醒模态层统一为绿白主题。
- 中国大陆网站优先适配：新增淘宝、京东、拼多多、微博、抖音、B 站、微信文章、飞书、腾讯文档、语雀、知乎等分类规则。
- 新增 `工作学习` 页面类型。
- 新增 `计时提醒`：
  - 支持在 popup 中一键给当前页面设置 5 / 10 / 20 / 30 分钟计时。
  - 支持自定义分钟数。
  - 到点后弹出居中强提醒。
  - 支持延长 5 分钟、加入稍后再看、尝试离开、关闭提醒继续看。
- 新增 `timerStats` 与 `timerSessions` 本地数据结构。
- Firefox 主流程兼容：通过统一 API 封装尽量兼容 `runtime / storage / tabs`，遇到标签关闭受限时会自动降级。

## 主要页面

### 1. Popup

- 今日状态概览
- 计时提醒快捷入口
- 当前页面是否在计时
- 剩余时间展示
- 最近 5 条稍后再看

### 2. Options

- 总开关与页面类型开关
- 普通提醒检测规则
- 计时提醒完整设置
- 按页面类型默认计时
- 文案风格切换
- 浏览器兼容说明

### 3. History

- 稍后再看列表
- 按页面类型筛选
- 删除单条 / 清空全部
- 重新打开链接
- 更友好的时间显示

### 4. 网页内提醒

- 右下角普通提醒卡片
- 绿白主题、轻陪伴口吻
- 到点后居中强提醒模态层

## 支持的网站类别

### 购物

- taobao.com
- tmall.com
- jd.com
- pinduoduo.com
- vip.com
- xiaohongshu.com（购物路径）
- suning.com
- dangdang.com

### 视频

- bilibili.com
- iqiyi.com
- v.qq.com
- youku.com
- mgtv.com
- youtube.com
- netflix.com

### 社交 / 内容流

- weibo.com
- xiaohongshu.com（内容流路径）
- zhihu.com（信息流路径）
- douyin.com
- reddit.com
- x.com
- twitter.com
- instagram.com

### 文章 / 新闻 / 知识

- zhihu.com（文章 / 问答路径）
- mp.weixin.qq.com
- toutiao.com
- thepaper.cn
- 36kr.com
- ifeng.com
- people.com.cn
- xinhuanet.com
- wikipedia.org
- nytimes.com
- theguardian.com
- medium.com
- substack.com

### 工作学习

- docs.qq.com
- feishu.cn / feishu.com
- notion.so
- yuque.com
- kdocs.cn
- icourse163.org
- coursera.org
- edx.org
- openai.com
- developer.chrome.com
- github.com

## 本地安装

### Chrome / Edge

1. 打开 `chrome://extensions/` 或 `edge://extensions/`
2. 开启“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择当前项目目录

### Firefox

1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击“临时载入附加组件”
3. 选择项目中的 `manifest.json`

说明：

- Chrome / Edge 是第一优先级，推荐优先在这两个浏览器中体验。
- Firefox 下若标签页关闭能力受限，插件会回退到 `about:blank`，再不行则提示手动关闭。

## 本地运行与测试

1. 直接加载当前目录，不需要 `npm install`
2. 打开扩展 popup，确认 popup / settings / history 可以正常打开
3. 在支持的网站中停留、滚动、来回切换页面，观察右下角普通提醒
4. 在 popup 中启动 `计时提醒`，等待到点后观察居中强提醒
5. 测试稍后再看、本地统计、标签关闭降级行为

## 数据存储

- `settings`
- `stats`
- `timerStats`
- `savedList`
- `snoozeMap`
- `timerSessions`

## 后续可扩展方向

- 支持自定义网站规则与黑白名单
- 增加每周趋势统计
- 增加更细的工作时段策略
- 增加多语言文案包
- 增加导出 / 导入本地数据
