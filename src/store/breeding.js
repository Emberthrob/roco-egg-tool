import { reactive, watch } from 'vue'

let tabSeq = 1
let femaleSeq = 1

function _createTab() {
  const id = tabSeq++
  return {
    id,
    name: '窗口' + id,
    nestCount: 10,
    academyCount: 0,
    females: [],
    result: null,
    resultMales: [],
    emptySlots: 0,
    uncoveredFemales: [],
    maleCoverDetails: [],
    academyCoveredGroups: [], // 学院窝雄性覆盖的雌性蛋组（替换排除用）
    maleFilter: { personality: '', body: '', voice: '', shiny: false, personalityMode: 'personality', buffFilter: '' },
    occupiedFemales: [], // 占用的仓库雌性 uid
    occupiedMales: [],   // 占用的仓库雄性 uid
    priorityPool: [],  // ★优先池：明确存储的蛋组数组（最多2个）

  }
}

export const breedingState = reactive({
  hasAcademy: true,
  tabs: [_createTab()],
  activeTabId: 1,
})

export function createTab() {
  return _createTab()
}

export function nextFemaleId() {
  return 'f' + (femaleSeq++)
}

// 全局占用 uid 集合（跨窗口互通）
export function getOccupiedUids() {
  const s = new Set()
  breedingState.tabs.forEach((t) => {
    ; (t.occupiedFemales || []).forEach((u) => u && s.add(u))
      ; (t.occupiedMales || []).forEach((u) => u && s.add(u))
  })
  return s
}
// ===== 清空 / 重置（跨页面复用的方案状态操作） =====

// 清空窗口已推荐的雄性方案（保留雌性与筛选条件）
export function clearRecommendedMales(tab) {
  tab.result = null
  tab.resultMales = []
  tab.emptySlots = 0
  tab.uncoveredFemales = []
  tab.maleCoverDetails = []
  tab.academyCoveredGroups = []
  tab.occupiedMales = []
}

// 同步优先池（删除雌性后复用）
function _syncPriorityPool(tab) {
  const stillNeeded = new Set()
  ;(tab.females || []).filter((f) => f.priority).forEach((f) => (f.eggGroups || []).forEach((g) => stillNeeded.add(g)))
  tab.priorityPool = (tab.priorityPool || []).filter((g) => stillNeeded.has(g))
}

// 清空窗口所有精灵（雌性 + 雄性 + 优先池），保留窝数与筛选条件
export function clearTabPets(tab) {
  tab.females = []
  tab.occupiedFemales = []
  tab.priorityPool = []
  clearRecommendedMales(tab)
}

// 清空所有窗口精灵（清空仓库时联动）
export function clearAllTabs() {
  breedingState.tabs.forEach((t) => clearTabPets(t))
}

// 重置窗口雄性筛选条件
export function resetMaleFilter(tab) {
  tab.maleFilter = { personality: '', body: '', voice: '', shiny: false }
}

// 判断某仓库精灵 uid 是否被任一窗口使用（雌性窝 或 已推荐雄性）
export function isPetUsed(uid) {
  return breedingState.tabs.some((t) =>
    (t.females || []).some((f) => f.uid === uid) ||
    (t.resultMales || []).some((m) => m.uid === uid)
  )
}

// 从所有窗口移除某仓库精灵的引用（删除仓库精灵时联动）：
//   雌性 → 从该窗口雌性窝移除 + 清空推荐雄性；雄性 → 若方案推荐了它则清空推荐雄性
export function removePetFromAllTabs(uid) {
  breedingState.tabs.forEach((t) => {
    let affected = false
    const fIdx = (t.females || []).findIndex((f) => f.uid === uid)
    if (fIdx > -1) {
      t.females.splice(fIdx, 1)
      const ofIdx = (t.occupiedFemales || []).indexOf(uid)
      if (ofIdx > -1) t.occupiedFemales.splice(ofIdx, 1)
      _syncPriorityPool(t)
      affected = true
    }
    if ((t.resultMales || []).some((m) => m.uid === uid)) {
      affected = true
    }
    if (affected) clearRecommendedMales(t)
  })
}

// 导入：整体覆盖所有窗口（含窝数、筛选、雌性、推荐雄性、配对详情）
let _suppressWatch = false
export function replaceTabs(newTabs, activeTabId) {
  _suppressWatch = true
  breedingState.tabs = (newTabs || []).map((t) => ({
    id: t.id,
    name: t.name,
    nestCount: t.nestCount,
    academyCount: t.academyCount,
    females: t.females || [],
    result: t.result ?? null,
    resultMales: t.resultMales || [],
    emptySlots: t.emptySlots || 0,
    uncoveredFemales: t.uncoveredFemales || [],
    maleCoverDetails: t.maleCoverDetails || [],
    academyCoveredGroups: t.academyCoveredGroups || [],
    maleFilter: t.maleFilter || { personality: '', body: '', voice: '', shiny: false, personalityMode: 'personality', buffFilter: '' },
    occupiedFemales: t.occupiedFemales || [],
    occupiedMales: t.occupiedMales || [],
    priorityPool: t.priorityPool || [],
  }))
  breedingState.activeTabId = activeTabId != null ? activeTabId : ((newTabs && newTabs[0]) ? newTabs[0].id : 1)

  // 更新自增序号，避免后续新建窗口 / 雌性实例冲突
  let maxTabId = 0
  breedingState.tabs.forEach((t) => { if (typeof t.id === 'number' && t.id > maxTabId) maxTabId = t.id })
  if (maxTabId >= tabSeq) tabSeq = maxTabId + 1
  let maxFemale = 0
  breedingState.tabs.forEach((t) => (t.females || []).forEach((f) => {
    const m = /^f(\d+)$/.exec(String(f.instanceId || ''))
    if (m) maxFemale = Math.max(maxFemale, Number(m[1]))
  }))
  if (maxFemale >= femaleSeq) femaleSeq = maxFemale + 1
  _suppressWatch = false
}

// ===== 监听：窝数 / 筛选变化 → 清空对应窗口已推荐雄性 =====
// 用 sync watch + _suppressWatch，保证「导入覆盖窗口」不会被误判成手动改动而清空方案
watch(
  () => breedingState.tabs.map((t) => `${t.id}:${t.nestCount}:${t.academyCount}`).join('~'),
  (newVal, oldVal) => {
    if (_suppressWatch || oldVal === undefined || newVal === oldVal) return
    const prev = new Map(oldVal.split('~').filter(Boolean).map((s) => {
      const [id, n, a] = s.split(':')
      return [Number(id), `${n}:${a}`]
    }))
    breedingState.tabs.forEach((t) => {
      if (prev.has(t.id) && prev.get(t.id) !== `${t.nestCount}:${t.academyCount}`) {
        clearRecommendedMales(t)
      }
    })
  },
  { flush: 'sync' }
)

watch(
  () => breedingState.tabs.map((t) => `${t.id}:${t.maleFilter.personality}|${t.maleFilter.body}|${t.maleFilter.voice}|${t.maleFilter.shiny}`).join('~'),
  (newVal, oldVal) => {
    if (_suppressWatch || oldVal === undefined || newVal === oldVal) return
    const prev = new Map(oldVal.split('~').filter(Boolean).map((s) => {
      const i = s.indexOf(':')
      return [Number(s.slice(0, i)), s.slice(i + 1)]
    }))
    breedingState.tabs.forEach((t) => {
      const key = `${t.maleFilter.personality}|${t.maleFilter.body}|${t.maleFilter.voice}|${t.maleFilter.shiny}`
      if (prev.has(t.id) && prev.get(t.id) !== key) {
        clearRecommendedMales(t)
      }
    })
  },
  { flush: 'sync' }
)
