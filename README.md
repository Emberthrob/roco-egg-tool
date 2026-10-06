# 关于知识库文件命名说明
为了能上传到 Chatbox 知识库，项目中的源代码文件均以 `.txt` 后缀结尾。
- `App.vue.txt` 实际对应的是 `App.vue`
- `main.js.txt` 实际对应的是 `main.js`
- `package.json.txt` 实际对应的是 `package.json`
以此类推

---

# 洛克王国智能配窝器（luoke-hatch-tool）

> 帮助《洛克王国》玩家给精灵配窝、计算后代与遗传的辅助工具。

---

## 1. 项目名称与一句话简介

**洛克王国智能配窝器** —— 一个面向《洛克王国》玩家的网页端辅助工具，核心能力是：**根据玩家仓库里的雌雄精灵，自动生成最优的「孵蛋配窝方案」，并可视化绘制精灵窝位置图**，让玩家直观看到哪些雌性配哪些雄性、各放在哪个窝里。

---

## 2. 项目目标与背景

### 要解决的问题

《洛克王国》孵蛋玩法有一系列复杂规则：

1. **交配规则**：两只精灵的「蛋组」有交集才能交配；子代品种随母本；空蛋组、含「未知组（编号 1）」的精灵不可生育。
2. **性别限制**：部分精灵只有雄性（特殊词条 1001）或只有雌性（1002）。
3. **双向唯一依赖**：① 雌性只能配 1 只雄性；② 雄性只能配 1 只雌性。这两种情况下，配对精灵在位置图上必须**相邻（距离 = 1）**。
4. **覆盖与接力**：用最少的雄性覆盖尽可能多的雌性，同时保证某只雌性退场后其他雄性仍能「接力」覆盖（均衡覆盖）。
5. **学院精灵窝**：额外 1 个特殊窝位，有专门的分配策略。

手工计算极易出错，因此做了这个工具，自动完成**方案推荐 + 位置图生成**。

### 定位

- 纯前端项目，数据存浏览器 `localStorage`，无后端。
- 移动端优先 UI（毛玻璃卡片、蓝紫渐变），同时兼容桌面。

---

## 3. 技术栈

| 类别 | 技术 | 版本 |
|---|---|---|
| 框架 | Vue 3（`<script setup>` Composition API） | `^3.5.41` |
| 路由 | Vue Router 4 | `^4.6.4` |
| 构建 | Vite | `^8.2.2` |
| Vue 插件 | `@vitejs/plugin-vue` | `^6.0.8` |
| 状态管理 | 模块级 `reactive`（**不用 Pinia**） | — |
| 持久化 | 浏览器 `localStorage` | — |
| 语言/模块 | JavaScript + ESM（`"type": "module"`） | — |

**关键设计**：状态管理刻意不用 Pinia，而是用模块级 `reactive` 导出，使页面切换时状态不丢失；路由组件用 `<keep-alive>` 缓存，切页后筛选条件等本地状态也保留。

`package.json` scripts：

```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

---

## 4. 目录结构说明

```
luoke-hatch-tool/
├── package.json
├── index.html                    # 标题「洛克王国智能配窝器」
├── src/
│   ├── main.js                   # 入口：createApp(App).use(router).mount('#app')，引入 assets/main.css
│   ├── App.vue                   # 布局：左 SideNav + 右 <router-view>（keep-alive）+ 全局 MessageBox
│   ├── assets/
│   │   └── main.css              # 全局样式（背景渐变、玻璃卡片、性别徽章、弹窗滚动防穿透）
│   ├── router/
│   │   └── index.js              # 路由表（createWebHistory）
│   ├── data/                     # 静态数据（JSON）
│   │   ├── pets.json             # 精灵库（含 1 条 _comment 注释对象，代码已做防御）
│   │   ├── defines.json          # 蛋组/赛季/赛季颜色/特殊词条定义
│   │   ├── personalities.json    # 性格数据（6 增益 × 各 5 = 30 种）
│   │   └── medals.json           # 身体/声音奖牌
│   ├── store/
│   │   ├── breeding.js           # 孵蛋页模块级状态 + 方案状态操作（★核心）
│   │   ├── plan.js               # 配窝计划状态（localStorage 持久化）+ 三关检测 + 培养方向判断
│   │   └── dialog.js             # 全局弹窗状态（showAlert / showConfirm）
│   ├── utils/
│   │   ├── breeding.js           # 兼容图 + 推荐算法 + 覆盖计算 + 进化链函数（★核心）
│   │   └── planSolver.js         # 配窝计划生成方案算法（已停用，文件保留）
│   ├── components/
│   │   ├── SideNav.vue           # 导航栏
│   │   ├── MessageBox.vue        # 全局提示弹窗（alert/confirm，替代浏览器弹窗）
│   │   ├── SeasonSelect.vue      # 赛季异色多选下拉（固定宽度）
│   │   ├── PersonalityPicker.vue # 通用性格选择（含增益分类 + 搜索栏）
│   │   ├── PersonalityFilterGroup.vue # 性格/增益筛选组（切换按钮 + 性格选择 + 增益下拉，复用）
│   │   ├── AddPetModal.vue       # 添加精灵弹窗（搜索支持进化链扩展）
│   │   ├── EditPetModal.vue      # 仓库编辑/删除弹窗
│   │   ├── FemalePickerModal.vue # 孵蛋页选雌性
│   │   ├── FemaleActionModal.vue # 点击雌性弹窗（优先/学院窝/删除）
│   │   ├── ReplaceMaleModal.vue  # 替换雄性弹窗
│   │   ├── PlacementMap.vue      # 位置图（★最复杂，随机布局 + 节点信息完整显示）
│   │   ├── TreeBranch.vue        # 二叉树递归组件（已停用，文件保留）
│   │   └── PlanCanvas.vue        # 网格画布组件（已停用，文件保留）
│   └── views/
│       ├── HomeView.vue          # 首页（B站教学视频按钮，链接待定）
│       ├── EggGroupCalc.vue      # 占位
│       ├── Breeding.vue          # 孵蛋配窝（★最复杂页面，含性格/增益筛选）
│       ├── PetDex.vue            # 精灵大全（拥有数、详情弹窗、添加入库、已拥有筛选、进化链搜索）
│       ├── Storage.vue           # 精灵仓库（上次录入、性格/增益筛选、进化链搜索）
│       ├── Inheritance.vue       # 配窝计划（目标精灵录入 + 三关检测）
│       └── AboutView.vue         # 关于（免责声明 + GitHub 按钮）
```

### App.vue 布局说明

- `.layout`：`display:flex; min-height:100vh`，左右分栏。
- `.content`：`flex:1; min-width:0; padding:20px`。
- 移动端（`@media (max-width:768px)`）：`.content` 的 padding 改为 `70px 12px 20px`，为顶部导航留 70px。
- `<router-view>` 用 `<keep-alive>` 包裹，任意页面切换后切回状态保留。

---

## 5. 当前进度

### ✅ 已完成

| 模块 | 状态 | 说明 |
|---|---|---|
| 精灵大全（PetDex） | 完成 | 蛋组筛选、并集/交集、名字搜索（含进化链）、赛季异色、只显示一阶段、已拥有筛选、未知组不可选、拥有数展示、详情弹窗、添加入库 |
| 精灵仓库（Storage） | 完成 | 添加/导出/导入/清空、多维筛选、备注优先、编辑删除、上次录入、性格/增益切换、进化链搜索、导出导入窗口方案、清空联动 |
| 孵蛋配窝（Breeding） | 完成 | 多窗口 ≤5、学院窝开关、雌性添加、方案生成、替换雄性、清空/重置、普通窝归还、性格/增益筛选 |
| 位置图（PlacementMap） | 完成 | 聚簇检测、确定性摆放、求解器、拖拽、导出 PNG、随机布局、节点信息完整显示 |
| 核心算法（utils/breeding.js） | 完成 | 兼容图、匈牙利匹配、均衡覆盖、学院窝策略、覆盖重算、进化链函数 |
| 配窝计划（Inheritance） | 完成 | 目标精灵录入/编辑/删除/清空 + 三关检测（培养方向）+ 窝数检测 |
| 全局弹窗 | 完成 | MessageBox + showAlert/showConfirm，替代浏览器 alert/confirm |
| 首页/关于页 | 完成 | B站按钮（链接待定）、免责声明 + GitHub 按钮 |

### ⬜ 未开始（占位页）

- 孵蛋计算器（EggGroupCalc.vue）。

### 🗑 已废除

- 配窝计划的「生成孵蛋计划」方案功能（多代遗传 + 二叉树/网格展示）已按需求废除，仅保留目标精灵录入与检测关卡；相关文件 `planSolver.js`、`TreeBranch.vue`、`PlanCanvas.vue` 保留但不再被引用。

---

## 6. 核心功能模块说明

### 6.1 精灵仓库（Storage.vue）

- 数据存 `localStorage`，key = `roco-storage`，格式 `{ nestCount, inventory: [] }`。
- 精灵条目字段：`id / name / eggGroups(数字数组) / gender / shiny / personality / medals{body,voice} / note / uid`。
- **备注优先显示**：`displayName(pet) = pet.note || pet.name`。
- 导出/导入：导出文件名「用户精灵配置-YYYY-MM-DD.json」，含仓库精灵 + 孵蛋界面窗口方案。
- 删除精灵：检测孵蛋界面是否占用，占用则弹确认，仍删除则联动清理窗口；同时检测配窝计划是否有共同蛋组的目标精灵。
- **上次录入**：记录最近一次「添加精灵」的列表，弹窗支持增删改查、确认替换、关闭未保存提醒；编辑受品种性别限制与异色形态约束。
- **性格/增益筛选**：性格态按性格筛选，增益态按性格增益（生命/物攻/魔攻/物防/魔防/速度）筛选。
- **进化链搜索**：搜索一个种族时一并搜出同进化链的精灵。
- `onActivated` 时重新加载数据，保证从精灵大全添加入库后切回本页刷新。

### 6.2 孵蛋配窝（Breeding.vue）

- 多窗口（≤5），每个窗口独立的窝数、雌性、筛选、方案。
- 普通窝上限 10，学院窝上限 1（`hasAcademy` 勾选）。
- 约束：雌性数 ≤ 窝数−1；窝数 ≥ 在场精灵数。
- 生成方案：调 `computeRecommendation` → 推荐雄性 + 覆盖详情 + 归还多余窝。
- 点击雌性 → 优先/学院窝/删除；点击雄性 → 替换。
- **性格/增益筛选**：与仓库一致，生成方案时按对应模式筛选雄性。
- **清空/重置按钮**：清空窗口精灵、重置雄性筛选条件。

### 6.3 位置图（PlacementMap.vue）

网格规格：`GRID_SIZE=7`、`FINE_GRID=14`、`UNIT=100`、`NODE=96`、`size=700`。

- 节点为统一正方形模块，显示性别 + 名字（超长省略号）+ 有值的特征（性格只显示名称，奖牌显示图标+名称）。
- 父本蓝、母本粉、子代黄、目标绿、缺失红；节点之间连线（父母→子代）。
- 每次「生成位置图 / 重新布局」随机（种子掺入 `Date.now() + Math.random()`），同时满足唯一依赖距离约束。
- 拖拽、导出 PNG 均保留。

### 6.4 核心算法（utils/breeding.js）

- `getCompatibleMap()`：Map<id, Set<可交配 id>>，懒构建 + 缓存。
- `computeBalancedPlan(females, malePool, count, priorityGroups)`：均衡覆盖（匈牙利最大匹配 + 局部搜索）。
- `computeRecommendation(opts)`：主入口，返回 `{ maleSlots, emptySlots, academyReleased, normalReleased }`。
- `recomputeCoverage(females, maleSlots)`：覆盖结果（含双向唯一依赖、学院窝覆盖蛋组）。
- `getEvolutionRoot(id)` / `isSameSpecies(aId, bId)`：进化链根与同进化链判断。

评分体系：`priorityCovered(×1e12) > covered(×1e9) > matched(×1e6) > minCover(×100) > totalCover(×1)`。

### 6.5 配窝计划（store/plan.js + Inheritance.vue）

- `planState` 持久化到 `localStorage['roco-plan']`，刷新不丢失。
- **培养方向**：性格方向（性格）、奖牌方向（身体奖牌 + 声音奖牌，需全部满足才算满足）；两方向都满足 = 完美父/母本。
- **三关检测**（录入目标精灵时）：
  - 第一关：仓库存在满足至少一个培养方向的精灵；
  - 第二关：与目标有共同蛋组，或存在桥接种族（不含只有雌/雄标签）同时与双方蛋组相交；
  - 第三关：位掩码 BFS 求最小蛋组集合，`y = ceil(x/2)`，`y ≤ 剩余窝数`。

### 6.6 全局弹窗（store/dialog.js + MessageBox.vue）

- `showAlert(msg)`、`showConfirm(msg)` 返回 Promise，替代浏览器 `alert/confirm`。
- MessageBox 毛玻璃风格，挂在 App.vue，全局可用。

---

## 7. 关键代码约定

### 7.1 数据字段

- **pets.json** 精灵条目：
  ```json
  { "id": 3020, "name": "地鼠", "egg_groups": [6], "evolves_from_id": null, "has_shiny": 103, "special_tags": [] }
  ```
  - `egg_groups`：数字数组（1=未知组不可生育，其余 1~15）。
  - `evolves_from_id`：null=一阶段。
  - `has_shiny`：null=无异色，数字=异色赛季 id（101/102/103）。
  - `special_tags`：1001=只有雄性，1002=只有雌性。
  - ⚠️ 文件末尾有一条 `{"_comment":"继续添加未录入精灵"}` 注释对象，遍历 `petsData` 时务必用 `(pet.name || '')` 防御。

- **defines.json**：`egg_groups`、`season`、`season_colors`、`special_tags`。
- **personalities.json**：`{ "生命": [{ "name":"沉默","decrease":"物攻" }, ...], ... }`，6 增益 × 各 5 = 30 种。
- **medals.json**：`{ "body":[...], "voice":[...] }`，奖牌含 `id/name/icon`。

### 7.2 状态与存储约定

- 仓库：`localStorage['roco-storage']`，格式 `{ nestCount, inventory }`。
- 孵蛋状态：`breedingState` 模块级 `reactive`（不持久化，切页不丢，刷新即重置）。
- 配窝计划：`planState` 模块级 `reactive` 且持久化到 `localStorage['roco-plan']`。
- 占用 uid：跨窗口全局互通，用 `getOccupiedUids()` 收集。

### 7.3 全局样式（main.css）

- **背景**：三层渐变叠加（靛蓝/紫径向 + 深蓝→紫→深红线性），`background-attachment: fixed`。
- **字体**：`-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif`。
- **`.glass` 毛玻璃卡片**、**`.gender-badge` 性别徽章**（雄蓝雌粉）。
- **弹窗滚动防穿透**：`.modal-mask / .modal-body / .mb-mask` 加 `overscroll-behavior: contain`。

### 7.4 命名与显示

- 备注优先：`displayName(pet) = pet.note || pet.name`。
- 性别配色：male 蓝 / female 粉。
- 雌性实例 id：`nextFemaleId()` 返回 `'f'+序号`；仓库精灵用 `uid`（`'p'+时间戳`）。

### 7.5 关键规则

- 交配 = 蛋组交集非空，且排除蛋组 1。
- 双向唯一依赖：雌性只配 1 雄 **或** 雄只配 1 雌 → 位置图距离 = 1。
- 学院窝策略：无性格筛选且雌性未占学院窝 → 普通窝够则归还学院窝；有性格筛选 → 学院窝放「主角」雄。

---

## 8. 已知问题与注意事项

### 🐛 已修复（近期）

- **pets.json 注释对象导致搜索崩溃**：文件末尾 `{"_comment":...}` 无 `name` 字段，搜索时 `pet.name.includes` 抛异常致整页无响应；已改为 `(pet.name || '').includes`。
- **hover 白框**：`.pet-card/.storage-card` 的 hover `transform: translateY` 与 `backdrop-filter` 叠加渲染异常；已移除 transform，并给筛选区加 `isolation: isolate`。
- **位置图索引错位、整数格 maxDist、多解择优、普通窝归还、归还顺序、clampTab 下限**（历史修复，详见早期版本）。

### ⚠️ 不能动的地方（用户明确要求保留）

1. **PlacementMap.vue 两处聚簇雌性排序**（`clusterFemArrForCheck`、`clusterFemArrSorted`）。
2. **三聚合坐标**（`clusterMaleCoords` / `clusterFemalePositions`）。
3. **三聚合剩余精灵槽位** + **「7 雌时剔除 `{x:-0.5,y:1}`」** 规则。

### 🔧 潜在隐患（未处理）

- **聚簇雌性超过槽位数会消失**。
- **学院窝归还在「雄性不足」场景**：`academyReleased` 基于理论 `requiredMales` 而非实际 `maleSlots.length`。
- **`sortedGroupEntries` 死代码**：PlacementMap.vue 中一段无用排序。
- **废弃文件**：`planSolver.js`、`TreeBranch.vue`、`PlanCanvas.vue` 保留但不再被引用。

---

## 9. 下一步计划

1. **孵蛋计算器**（EggGroupCalc）：选择父母双方计算后代可能性。
2. **蒙特卡洛模拟**：模拟雌性随机退场，统计雄性闲置率，选更优方案。
3. **遗传特征推荐**：性格/奖牌遗传作为「推荐父母」依据。
4. **导出优化**：方案图导出（旧版 html2canvas，Vue 版未接）。
5. **聚簇雌性超槽位修复**：超出的聚簇雌性走子问题求解。
6. **学院窝归还细化**：改为基于实际推荐雄性数判断。
7. **导入配置状态区域**（导航栏标题下方绿/黄状态条）：待功能稳定后再实现。

---

## 10. 运行与调试方式

### 启动

```bash
cd "E:\demo\vue roco\luoke-hatch-tool"
npm install      # 首次
npm run dev      # 启动开发服务器，默认 http://localhost:5173
```

### 构建 / 预览

```bash
npm run build     # 产物输出到 dist/
npm run preview   # 本地预览构建产物
```

### 路由

- `/` → 首页
- `/breeding` → 孵蛋配窝（核心页）
- `/storage` → 精灵仓库
- `/pet-dex` → 精灵大全
- `/inheritance` → 配窝计划
- `/egg-calc`、`/about` → 占位 / 关于

### 调试要点

- **仓库数据**：`localStorage['roco-storage']`，格式 `{ nestCount, inventory }`。
- **孵蛋状态**：`breedingState` 模块级内存状态，刷新即重置。
- **配窝计划**：`planState` 持久化到 `localStorage['roco-plan']`，刷新保留。
- **位置图**：有「重新布局」「导出 PNG」按钮；随机种子掺入时间戳，每次布局不同。
- **全局弹窗**：`showAlert / showConfirm`，勿再用原生 `alert/confirm`。
