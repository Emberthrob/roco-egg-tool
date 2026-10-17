# AGENTS.md — 开发者 / Agent 接手文档

> 面向开发者与其他编码 Agent。读完本文档即可快速理解项目结构、核心算法与约定，避免踩坑。

---

## 1. 项目概览

**洛克王国智能配窝器**（`luoke-hatch-tool`）：纯前端 Vue 3 网页工具，帮助玩家配窝、计算后代与遗传。无后端，数据存浏览器 `localStorage`。

核心功能：
- 仓库管理（增删改、导入导出、筛选、上次录入）
- 孵蛋配窝方案 + 位置图
- 配窝计划 + 孵化路线（多代遗传可视化，含问号缺失模块补录）

---

## 2. 技术栈（含版本）

| 类别 | 技术 | 版本 |
|---|---|---|
| 框架 | Vue 3（`<script setup>` Composition API） | `^3.5.41` |
| 路由 | Vue Router 4 | `^4.6.4` |
| 构建 | Vite | `^8.2.2`（底层 rolldown，**非 esbuild**） |
| Vue 插件 | `@vitejs/plugin-vue` | `^6.0.8` |
| 状态管理 | 模块级 `reactive`（**不用 Pinia**） | — |
| 持久化 | 浏览器 `localStorage` | — |
| 语言 | JavaScript + ESM（`"type": "module"`） | — |

`package.json` scripts：`dev` / `build` / `preview`。

---

## 3. 目录结构

```
src/
├── main.js                   # createApp(App).use(router).mount('#app')，引入 assets/main.css
├── App.vue                   # 左 SideNav + 右 <router-view>（keep-alive）+ MessageBox
├── assets/
│   ├── main.css              # 全局样式（背景渐变、玻璃卡片、性别徽章、弹窗防穿透）
│   └── hero.png              # favicon 相关
├── router/index.js           # 路由（createWebHashHistory，hash 模式适配 GitHub Pages）
├── data/                     # 静态数据
│   ├── pets.json             # 精灵库（⚠️ 末尾有 _comment 注释对象，遍历需防御 name）
│   ├── defines.json          # 蛋组/赛季/赛季颜色/特殊词条
│   ├── personalities.json    # 性格（6 增益 × 各 5 = 30 种）
│   └── medals.json           # 身体/声音奖牌（body/voice）
├── store/
│   ├── breeding.js           # 孵蛋页模块级状态 + 方案状态（★）
│   ├── plan.js               # 配窝计划状态（localStorage）+ 三关检测 + 培养方向
│   └── dialog.js             # 全局弹窗（showAlert/showConfirm）
├── utils/
│   ├── breeding.js           # 兼容图 + 推荐算法 + 进化链函数（★）
│   ├── hatchRoute.js         # 孵化路线算法（★核心：全图鉴最短路径+缺失最少+性别过滤+跨窗口母本过滤）
│   ├── routeLayout.js        # 孵化路线 DAG 布局（并列链→汇合→最终）
│   └── planSolver.js         # 旧方案算法（已废弃）
├── components/
│   ├── SideNav.vue / MessageBox.vue / SeasonSelect.vue
│   ├── PersonalityPicker.vue / PersonalityFilterGroup.vue
│   ├── AddPetModal.vue / EditPetModal.vue
│   ├── FemalePickerModal.vue / FemaleActionModal.vue / ReplaceMaleModal.vue
│   ├── PlacementMap.vue      # 位置图（★最复杂）
│   ├── NodeCard.vue          # 孵化路线里的单个精灵模块（★）
│   ├── HatchRouteView.vue    # 孵化路线 SVG 画布编排（★，DAG 并列布局）
│   ├── BlockFrame.vue        # 块外壳（3×3 网格 + 标签）
│   ├── PropagateBlock.vue / MergeBlock.vue / FinalBlock.vue   # 三种块组件
│   ├── ParentModule.vue / BackcrossModule.vue / ChildModule.vue / TargetModule.vue / MissingModule.vue   # 模块组件
│   ├── MissingPetModal.vue   # 孵化路线缺失精灵补录弹窗（★）
│   ├── TreeBranch.vue / PlanCanvas.vue   # 已废弃，保留
└── views/
    ├── HomeView.vue / AboutView.vue / EggGroupCalc.vue（占位）
    ├── Breeding.vue          # 孵蛋配窝（★）
    ├── PetDex.vue            # 精灵大全
    ├── Storage.vue           # 精灵仓库
    └── Inheritance.vue       # 配窝计划 + 孵化路线（★）
```

---

## 4. 数据字段与存储

### 4.1 pets.json 条目

```json
{ "id": 3020, "name": "地鼠", "egg_groups": [6], "evolves_from_id": null, "has_shiny": 103, "special_tags": [] }
```

- `egg_groups`：数字数组，1=未知组不可生育，其余 1~15。
- `evolves_from_id`：null=一阶段（最低形态）。
- `has_shiny`：null=无异色，数字=异色赛季 id。
- `special_tags`：1001=只有雄性，1002=只有雌性。
- ⚠️ 文件末尾有一条 `{"_comment":"继续添加未录入精灵"}`，遍历 `petsData` 务必 `(pet.name || '')` 防御。

### 4.2 存储 key

- 仓库：`localStorage['roco-storage']`，格式 `{ nestCount, inventory: [] }`。
  - 精灵条目：`{ id, name, eggGroups(数字数组), gender, shiny, personality, medals{body,voice}, note, uid }`。
- 配窝计划：`localStorage['roco-plan']`。
- 孵蛋状态 `breedingState`：模块级 `reactive`，**不持久化**（刷新重置）。

### 4.3 其他数据

- `defines.json`：`egg_groups`、`season`、`season_colors`、`special_tags`。
- `personalities.json`：`{ "生命": [{name, decrease}], ... }`。
- `medals.json`：`{ body: [{id,name,icon}], voice: [...] }`，body：`dkt`大块头/`xbd`小不点；voice：`wzs`婉转声/`csm`粗嗓门。

---

## 5. 核心算法

### 5.1 utils/breeding.js

- `getCompatibleMap()`：Map<id, Set<可交配 id>>，懒构建 + 缓存。
- `computeBalancedPlan` / `computeRecommendation` / `recomputeCoverage`：孵蛋推荐与覆盖。
- `getEvolutionRoot(id)` / `isSameSpecies(aId, bId)`：进化链。
- `loadInventory()`：读 `localStorage['roco-storage']`。

### 5.2 孵化机制（游戏规则，先理解这个）

- **交配**：两只精灵「蛋组」有交集才能交配；**子代种族 = 母本种族**（铁律，反复强调）。空蛋组或含「未知组(1)」的精灵不可生育。
- **性别限制**：`special_tags` 1001=只有雄性、1002=只有雌性。
- **三特征**：性格（personality）、身体奖牌（body medal）、声音奖牌（voice medal）。
- **培养方向**：`C`（性格方向，性格匹配目标）、`M`（奖牌方向，身体奖牌**且**声音奖牌都匹配目标才满足）、`B`（双方向，C 且 M）。
- **无需求**：目标对某特征无要求时，该特征视为自动满足（模块显示「无需求」，默认白色）。

### 5.3 孵化路线的块与模块（3×3 结构）

`computeHatchRoute(target, inventoryOverride, options)` 返回 `{ solvable, reason, blocks, notes, target }`，`blocks` 是纵向排列的块。`options` 可选：`femaleDedup`（母本过滤开关）、`usedFemaleUids`（跨窗口已用雌性 uid 集合，用于母本过滤）。

**块结构**（每个块 `{ type, title, father, mother, backcrossFather, backcrossMother, child, note }`）：

```
第1行:  父本(左,男)       母本(右,女)
第2行:  回交副本/子代   子代/回交副本
第3行:        阶段目标(中央)
```

**块类型**：
- `propagate`（传递块）：把某个方向（性格/奖牌/双方向）从一个种族传到另一个种族。
- `merge`（合并块）：把性格方向 C 和奖牌方向 M 合并成双方向 B。
- `final`（最终块）：产出目标精灵（阶段目标 = 目标精灵）。

**模块（节点）类型**：
- `petNode`（真实精灵）、`carrierNode`（抽象载体）、`missingNode`（已知种族缺失=黄色+种族名）、`unknownNode`（种族未知=问号）、`unknownFeatureNode`（种族已知特征未知）。

### 5.4 关键规则（⚠️ 别搞错，用户反复强调）

1. **子代种族 = 母本种族**（铁律）。所以：
   - **阶段目标恒为雄性**（要成为下一块的父本去传递方向）。唯一例外是「转换性别」块，它产出雌性供合并块当母本。
   - **传递必须以父本进行**（父本做方向载体，与不同种族母本交配，才能把方向传到新种族）。雌性来源先「转换性别」成雄性。
2. **男左女右**，父本在左列、母本在右列，位置不能错。
3. **回交亲本选择**：优先选双方向满足（B）的一方；合并块里 **R_M（奖牌载体）恒为回交亲本**，子代性别=回交方相反。
4. **合并块排布**：`父=R_C♂·母=R_M♀` 或 `父=R_M♂·母=R_C♀` 都行，但 R_M 一定是回交亲本，子代性别=回交方相反、位置男左女右。
5. **种公优先顺序**：① 父母双方至少一方是 `R_B`；② 一方 `R_M` + 另一方 `R_C`，且 R_M 作为回交亲本。
6. **最短路径**：沿**全图鉴蛋组图**（`getCompatibleMap`，不是只沿仓库已有雌性）求最短路径；多条最短路径里优先「缺失精灵最少」的一条；不能循环。中间种族仓库里没有雌性就显示「缺母本」（可点击补录），而不是直接判无解。
7. **子代特征着色**（`childFeature`，由**当前块父本+母本**决定，不是目标精灵决定）：
   - 双方都有且匹配目标 → **绿**（`shared`）
   - 一方有 → **黄**（`inherit`，有概率遗传）
   - 双方都没有 → **白**（`none`，孵不出）
   - 目标无需求 → **白**「无需求」（`noreq`）
8. **阶段目标/目标模块**：最终块的目标模块恒为**实体 + 绿色**（已完美遗传才会传到下层），种族=目标种族；**不受父本缺失影响**（最终块母本种族必为 T，已确认）。
9. **缺失精灵（问号模块）**：
   - 仓库找不到中间精灵 → 黄色问号模块，只有**最上方真实缺失**可点，下游连锁的「伪缺失」(`pseudo=true`) 不可点。
   - **缺失母本** → 子代 + 阶段目标也变问号（母本种族不定，子代种族更不可能确定）。
   - **缺失父本** → 只影响父本本身（及它的回交副本）。
   - **最终块缺母本** → 种族已确认（=目标种族），显示**黄色 + 种族名**（不是问号），点击只填该种族信息、不用选种族。
10. **替换弹窗**：
    - 缺失母本：只显示能与「下一块母本」交配、且能继续传递到目标的种族（**最短距离**）；不显示父本同种族；同进化链只显示最低形态。
    - 缺失父本：所有能和母本交配的种族都可选。
    - **添加的精灵是临时的、按窗口隔离，不加入仓库**（`addedPetsMap` 按目标 uid 隔离），重新生成时清空。
12. **转换块配偶**：转换性别块（雌性来源转雄性 / 雄性转雌性）的配偶只要能与该种族交配即可（`groupsCompatible`），**不限制同种族**。
13. **同种族自交直接得目标**：目标需要 C+M 且仓库里 C 源、M 源都是**目标种族**且一雌一雄时，直接自交 1 块得目标，跳过传递链/合并/最终块。
14. **双方向无回交**：最终块父本、母本都是 `R_B`（direction='B' 且无缺失）时，直接交配得目标，不展开回交层。
15. **母本过滤**（目标区「母本过滤」开关）：开启后——跨窗口（不同目标）从仓库选用的雌性不能重复；同窗口内 C/M 两条并列路线之间也不能重复；同一条路线内可以重复。无备选雌性时置为「缺母本」。
16. **复用雄性**：`preferUsed` 在不改变路线长度的前提下，优先复用已选用的同一只雄性（uid 去重）。
17. **孵蛋队列**（在 Inheritance.vue 内，非独立页）：每个块可「加入孵蛋队列」，暗化界面后点选块（同一路线最多一个、分路 0.5 名额 / 主路 1 名额），按父本分组、一雄多雌归一组，可分配学院窝，最后「加入精灵窝」生成只读窗口（locked）。
11. **块间/块内连线**（在 `HatchRouteView.vue` 单 SVG 画布里）：
    - 绿色实线：配对繁殖关系（父母→子代；回交副本+子代→阶段目标）。
    - 黄色竖线：同一精灵跨层继续（父/母→其回交副本）。
    - 黄色复用线：上一块阶段目标 → 下一块父本/母本，**按「种族+性别」精确匹配**（男左女右），不能接错。
    - 回交副本与子代之间不连线；多代回交不展开，用绿色虚线表示。

### 5.5 设计思路（为什么这样设计）

- **阶段目标恒为雄性**：因为子代种族=母本，阶段目标要成为下一块父本才能把方向继续传下去。
- **传递以父本进行**：子代种族=母本，只有父本做载体与不同种族母本交配，才能把方向转移到新种族；母本做载体会让子代种族仍是载体自己，传不过去。
- **R_M 作为回交亲本**：奖牌（身体+声音两个条件）比性格更难稳定遗传，用奖牌载体做回交，优先保证奖牌方向稳定。
- **问号模块 + 只解锁最上方**：仓库缺中间精灵是常态，允许"边走边补"；按顺序解锁，避免用户乱补导致线路断裂。
- **替换精灵不加入仓库**：问号补录的是"计划里的假设精灵"，不该污染玩家真实仓库。
- **最短路径**：减少玩家实际孵蛋步骤。

### 5.3 store/plan.js

- `planState = { normalNests: 10, academyNests: 0, planEntries: [] }`。
- `checkLevel1/2/3` 三关检测，`minEggGroupSet` 位掩码 BFS。

---

## 6. 代码约定

- **禁用浏览器原生 `alert`/`window.confirm`**，一律用 `showAlert`/`showConfirm`（`store/dialog.js`）。
- `<keep-alive>` 包裹 router-view，页面切换保留状态。
- 弹窗滚动防穿透：`.modal-mask/.modal-body/.mb-mask { overscroll-behavior: contain }`。
- 性格筛选：`mode: 'personality' | 'buff'`，buff 选值：生命/物攻/魔攻/物防/魔防/速度。
- 搜索进化链：`getEvolutionRoot(id)` 模糊匹配后展开同进化链。
- 备注优先显示：`displayName(pet) = pet.note || pet.name`。
- 性别配色：雄蓝 / 雌粉。

---

## 7. 行尾与编辑注意

- 多数源码文件是 **CRLF** 行尾（Windows）。用 `edit_file` 做多行替换时，若匹配不到，先确认行尾；可靠做法是写 Node 脚本：`readFileSync → replace(/\r\n/g,'\n') → 替换 → 写回 \r\n`。
- `vite.config.js` 是 LF。
- `build.cssMinify: false`：esbuild/rolldown 会把未加前缀的 `backdrop-filter` 误删导致毛玻璃失效，故关闭 CSS 压缩。

---

## 8. 运行 / 构建 / 调试

```bash
cd "E:\demo\vue roco\luoke-hatch-tool"
npm install
npm run dev      # http://localhost:5173
npm run build    # 产物 dist/
npm run preview
```

路由：`/` 首页、`/breeding` 孵蛋配窝、`/storage` 仓库、`/pet-dex` 图鉴、`/inheritance` 配窝计划、`/egg-calc` 占位、`/about` 关于。

调试要点：
- 仓库数据 `localStorage['roco-storage']`，配窝计划 `localStorage['roco-plan']`。
- `hatchRoute.js` 可单独测试：`computeHatchRoute(target, inventoryOverride)`，`inventoryOverride` 传 `[{id,name,eggGroups,gender,personality,medals,uid}]`。

---

## 9. 部署

- GitHub 仓库：`Emberthrob/roco-egg-tool`（本地目录名 `luoke-hatch-tool`，两者不同不影响）。
- 通过 `.github/workflows/deploy.yml` 自动构建部署到 GitHub Pages；`dist/` 被 gitignore，无需手动提交。
- 路由用 `createWebHashHistory`（hash 模式，适配静态托管深链接）；`vite.config.js` 设 `base: './'`。

---

## 10. 已知问题 / 待办

- `EggGroupCalc.vue`（孵蛋计算器）仍是占位。
- `planSolver.js`、`TreeBranch.vue`、`PlanCanvas.vue` 已废弃但保留在磁盘。
- （已实现）孵化路线 DAG 并列布局：多条传递链并列、末端汇入合并块/最终块；块与模块已组件化拆分。
- `src/style.css` 为死代码，未被引用。
- `src/新建 文本文档.bat` 冗余脚本。
- 首页 B站链接、关于页 GitHub 链接为占位（`#` / `https://github.com`）。
