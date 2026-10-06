<template>
  <div class="breeding">
    <div class="page-head">
      <h1>孵蛋配窝</h1>
      <div class="top-bar">
        <label class="academy-check">
          <input type="checkbox" v-model="hasAcademy" @change="onAcademyToggle" /> 拥有学院精灵窝
        </label>
        <span class="remain">可用普通精灵窝：<b>{{ remainingNormal }}</b></span>
        <span class="remain">可用学院精灵窝：<b>{{ remainingAcademy }}</b></span>
      </div>
    </div>

    <div class="tabs-bar">
      <div v-for="tab in tabs" :key="tab.id" class="tab" :class="{ active: tab.id === activeTabId }"
        @click="activeTabId = tab.id">
        <span>{{ tab.name }}</span>
        <span class="tab-meta">(普通{{ tab.nestCount }}·学院{{ tab.academyCount }})</span>
        <button class="tab-close" @click.stop="removeTab(tab)">×</button>
      </div>
      <button class="add-tab" :disabled="tabs.length >= 5" @click="addTab">＋</button>
    </div>

    <div v-for="tab in tabs" v-show="tab.id === activeTabId" :key="'p-' + tab.id" class="tab-panel">
      <div class="settings-row">
        <label>普通精灵窝 <input type="number" v-model.number="tab.nestCount" min="0" @change="clampTab(tab)" /></label>
        <label>学院精灵窝 <input type="number" v-model.number="tab.academyCount" min="0" max="1"
            @change="clampTab(tab)" /></label>
        <span class="hint">本窗口共 {{ tab.nestCount + tab.academyCount }} 个窝（在场 {{ placedCount(tab) }} 只）</span>
        <button class="secondary-btn" @click="clearTabPets(tab)">清空</button>
      </div>


      <div class="gen-bar">
        <div class="priority-info" v-if="priorityGroups(tab).length">
          <span class="p-label">优先蛋组：</span>
          <span v-for="g in priorityGroups(tab)" :key="g" class="p-tag">{{ eggGroupName(g) }}</span>
        </div>
        <button class="primary-btn" @click="generate(tab)">生成配窝方案</button>
        <div class="male-filters">
          <PersonalityFilterGroup v-model:mode="tab.maleFilter.personalityMode" v-model:personality="tab.maleFilter.personality" v-model:buff="tab.maleFilter.buffFilter" placeholder="性格不限" buff-placeholder="增益不限" />
          <select v-model="tab.maleFilter.body" class="select">
            <option value="">身体奖牌不限</option>
            <option v-for="m in bodyMedals" :key="m.id" :value="m.id">{{ m.icon }} {{ m.name }}</option>
          </select>
          <select v-model="tab.maleFilter.voice" class="select">
            <option value="">声音奖牌不限</option>
            <option v-for="m in voiceMedals" :key="m.id" :value="m.id">{{ m.icon }} {{ m.name }}</option>
          </select>
          <button class="shiny-btn" :class="{ on: tab.maleFilter.shiny }"
            @click="tab.maleFilter.shiny = !tab.maleFilter.shiny">✨异色</button>
          <button class="secondary-btn" @click="resetMaleFilter(tab)">重置</button>
        </div>

        <button class="secondary-btn" @click="openPicker(tab)">＋添加雌性</button>
      </div>

      <!-- 窝展示 -->
      <div class="nest-grid" v-if="tab.females.length || tab.resultMales.length">
        <div v-for="f in tab.females" :key="f.instanceId" class="nest-item female" :class="{ academy: f.useAcademy }"
          @click="openFemaleAction(f)">
          <span v-if="f.priority" class="priority-tag">优先</span>
          <span class="nest-icon">♀</span>
          <span class="nest-name">{{ f.note || f.name }}</span>
          <span v-if="f.note" class="nest-origin">{{ f.name }}</span>
          <span class="nest-egg">{{ eggGroupsOf(f.id) }}</span>
          <span v-if="f.shiny" class="nest-shiny">✨异色</span>
          <span v-if="f.personality" class="nest-pers">🎭{{ f.personality }}<em>{{ personalityDetail(f.personality)
              }}</em></span>
          <span v-if="f.medals?.body" class="nest-medal">{{ bodyIcon(f.medals.body) }}</span>
          <span v-if="f.medals?.voice" class="nest-medal">{{ voiceIcon(f.medals.voice) }}</span>
          <span v-if="f.useAcademy" class="academy-tag">学院窝</span>
        </div>

        <div v-for="m in tab.resultMales" :key="m.uid + m.species" class="nest-item male"
          :class="{ academy: m.useAcademy }" @click="openReplace(m)">
          <span class="nest-icon">♂</span>
          <span class="nest-name">{{ m.name }}</span>
          <span class="nest-egg">{{ eggGroupsOf(m.species) }}</span>
          <span v-if="m.isShiny" class="nest-shiny">✨异色</span>
          <span v-if="m.personality" class="nest-pers">🎭{{ m.personality }}<em>{{ personalityDetail(m.personality)
              }}</em></span>
          <span v-if="m.medals?.body" class="nest-medal">{{ bodyIcon(m.medals.body) }}</span>
          <span v-if="m.medals?.voice" class="nest-medal">{{ voiceIcon(m.medals.voice) }}</span>
          <span v-if="m.useAcademy" class="academy-tag">学院窝</span>
        </div>

        <div v-for="i in tab.emptySlots" :key="'e' + i" class="nest-item empty">(空窝)</div>
      </div>

      <!-- 唯一配对区域（悬停显示详情） -->
      <div v-if="tab.maleCoverDetails.length" class="pair-area">
        <div class="pair-title">雄性配对详情</div>
        <div class="male-cards">
          <div v-for="md in tab.maleCoverDetails" :key="md.uid + md.species" class="male-card">
            <div class="male-card-head">
              <strong>♂ {{ md.name }}</strong>
              <span v-if="md.isShiny" class="star">⭐</span>
              <span v-if="md.personality" class="mini-tag">🎭{{ md.personality }}</span>
              <span v-if="md.medals?.body" class="mini-tag">{{ bodyIcon(md.medals.body) }}</span>
              <span v-if="md.medals?.voice" class="mini-tag">{{ voiceIcon(md.medals.voice) }}</span>
              <span v-if="md.useAcademy" class="mini-tag aca">学院窝</span>
            </div>
            <div class="male-card-cov">可配：{{md.coveredIds.map(c => c.name).join('、') || '无'}}</div>
            <div v-if="md.lockedNames?.length" class="lock">🔒 唯一依赖：{{ md.lockedNames.join('、') }}</div>

            <div class="tooltip">
              <div class="tt-name">♂ {{ md.name }}</div>
              <div class="tt-egg">蛋组：{{ eggGroupsOf(md.species) }}</div>
              <div class="tt-attrs">
                <span v-if="md.isShiny">✨异色</span>
                <span v-if="md.personality">性格：{{ md.personality }} {{ personalityDetail(md.personality) }}</span>
                <span v-if="md.medals?.body">身体：{{ bodyIcon(md.medals.body) }}</span>
                <span v-if="md.medals?.voice">声音：{{ voiceIcon(md.medals.voice) }}</span>
              </div>
              <div class="tt-cov">
                可配对雌性：
                <div v-for="c in md.coveredIds" :key="c.instanceId" class="tt-cov-item">
                  {{ c.name }} <span v-if="c.isShiny">✨</span>
                  <span v-if="c.personality">·🎭{{ c.personality }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="tab.result" class="summary">
        <span v-if="tab.uncoveredFemales.length" class="warn">
          ⚠️ 无法覆盖：{{tab.uncoveredFemales.map(f => f.name).join('、')}}
        </span>
        <template v-else>
          <span class="ok">✅ 所有雌性均已覆盖</span>
          <button class="primary-btn" @click="openPlacement(tab)">生成精灵位置图</button>
        </template>
      </div>

    </div>

    <FemalePickerModal v-model="pickerVisible" :females="pickerFemales" :occupied-uids="pickerOccupied"
      @pick="onPickFemale" @remove="onRemoveFemale" />
    <FemaleActionModal v-if="actionFemale" v-model="actionVisible" :female="actionFemale"
      :can-set-academy="actionCanSetAcademy" @priority="onSetPriority" @academy="onSetAcademy"
      @remove="onActionRemove" />
    <ReplaceMaleModal v-model="replaceVisible" :male="replaceTarget || {}" :candidates="replaceCandidates"
      @replace="onReplace" />

    <PlacementMap v-if="placeMapTab" v-model="placeMapVisible" :females="placeMapTab.females"
      :males="placeMapTab.resultMales" />

  </div>
</template>

<script setup>
import { ref, computed, toRefs } from 'vue'
import defines from '../data/defines.json'
import medalsData from '../data/medals.json'
import personalitiesData from '../data/personalities.json'
import { breedingState, createTab, nextFemaleId, getOccupiedUids, clearTabPets, resetMaleFilter } from '../store/breeding'
import { showAlert } from '../store/dialog'
import {
  getPetName, getEggGroups, loadInventory, computeRecommendation, recomputeCoverage, effectiveGroups,
} from '../utils/breeding'
import PersonalityPicker from '../components/PersonalityPicker.vue'
import PersonalityFilterGroup from '../components/PersonalityFilterGroup.vue'
import FemalePickerModal from '../components/FemalePickerModal.vue'
import FemaleActionModal from '../components/FemaleActionModal.vue'
import ReplaceMaleModal from '../components/ReplaceMaleModal.vue'
import PlacementMap from '../components/PlacementMap.vue'

const bodyMedals = medalsData.body
const voiceMedals = medalsData.voice
const { tabs, activeTabId, hasAcademy } = toRefs(breedingState)

const MAX_NORMAL = 10
const MAX_ACADEMY = 1

const personalityMap = {}
Object.keys(personalitiesData).forEach((buff) => {
  personalitiesData[buff].forEach((p) => { personalityMap[p.name] = { buff, decrease: p.decrease } })
})
function personalityDetail(name) {
  const p = personalityMap[name]
  return p ? `+${p.buff}/-${p.decrease}` : ''
}
const buffOptions = ['生命', '物攻', '魔攻', '物防', '魔防', '速度']
function petBuff(personality) {
  if (!personality) return ''
  for (const buff of buffOptions) {
    if ((personalitiesData[buff] || []).some((p) => p.name === personality)) return buff
  }
  return ''
}
function eggGroupName(g) { return defines.egg_groups[String(g)] || String(g) }
function eggGroupsOf(id) {
  const g = getEggGroups(id)
  if (!g.length) return '未知组'
  return g.map((x) => eggGroupName(x)).join('/')
}
function bodyIcon(id) {
  const m = bodyMedals.find((x) => x.id === id)
  return m ? `${m.icon}${m.name}` : id
}
function voiceIcon(id) {
  const m = voiceMedals.find((x) => x.id === id)
  return m ? `${m.icon}${m.name}` : id
}
function placedCount(tab) {
  return tab.females.length + (tab.resultMales ? tab.resultMales.length : 0)
}
function currentTab() {
  return tabs.value.find((t) => t.id === activeTabId.value) || tabs.value[0]
}
// 优先池（动态从 priority 雌性计算，最多2个蛋组）
function priorityGroups(tab) {
  return tab.priorityPool || []
}


const remainingNormal = computed(() => MAX_NORMAL - tabs.value.reduce((s, t) => s + (t.nestCount || 0), 0))
const remainingAcademy = computed(() => (hasAcademy.value ? MAX_ACADEMY : 0) - tabs.value.reduce((s, t) => s + (t.academyCount || 0), 0))

function onAcademyToggle() {
  if (!hasAcademy.value) {
    tabs.value.forEach((t) => {
      t.academyCount = 0
      t.females.forEach((f) => { f.useAcademy = false })
    })
  }
}

function addTab() {
  if (tabs.value.length >= 5) return
  const tab = createTab()
  tab.nestCount = 0
  tabs.value.push(tab)
  activeTabId.value = tab.id
}

function removeTab(tab) {
  if (tabs.value.length <= 1) { showAlert('至少保留一个窗口'); return }
  const i = tabs.value.findIndex((t) => t.id === tab.id)
  tabs.value.splice(i, 1)
  if (activeTabId.value === tab.id) activeTabId.value = tabs.value[0].id
}

function clampTab(tab) {
  if (tab.nestCount < 0) tab.nestCount = 0
  if (tab.academyCount < 0) tab.academyCount = 0
  const otherNormal = tabs.value.filter((t) => t.id !== tab.id).reduce((s, t) => s + (t.nestCount || 0), 0)
  const maxN = MAX_NORMAL - otherNormal
  if (tab.nestCount > maxN) tab.nestCount = maxN
  const otherAcademy = tabs.value.filter((t) => t.id !== tab.id).reduce((s, t) => s + (t.academyCount || 0), 0)
  const maxA = (hasAcademy.value ? MAX_ACADEMY : 0) - otherAcademy
  if (tab.academyCount > maxA) tab.academyCount = maxA

  // 下限：不可低于在场精灵数；有雌性时也不可低于雌性数+1
  // ★修复1：空窗口（无雌性）不再强制 floor=1，允许普通窝调到 0
  const placed = placedCount(tab)
  let floor = placed
  if (tab.females.length > 0) floor = Math.max(floor, tab.females.length + 1)
  const total = tab.nestCount + tab.academyCount
  if (total < floor) {
    tab.nestCount = floor - tab.academyCount
    // ★修复2：下限调整后若超过本窗口可用的普通窝上限（其他窗口已占满），
    //   压回上限，避免全局总数超 MAX_NORMAL 导致右上角显示负数
    if (tab.nestCount > maxN) tab.nestCount = maxN
  }
}


// ---------- 添加雌性 ----------
const pickerVisible = ref(false)
const pickerOccupied = ref([])
const pickerFemales = ref([])
let pickerTab = null

function openPicker(tab) {
  pickerTab = tab
  pickerOccupied.value = [...getOccupiedUids()]
  pickerFemales.value = tab.females
  pickerVisible.value = true
  // ★清空当前窗口已生成的雄性方案（保留雌性）
  tab.result = null
  tab.resultMales = []
  tab.emptySlots = 0
  tab.uncoveredFemales = []
  tab.maleCoverDetails = []
  tab.academyCoveredGroups = []
  tab.occupiedMales = []
}


function onPickFemale(f) {
  if (!pickerTab) return
  const totalNests = (pickerTab.nestCount || 0) + (pickerTab.academyCount || 0)
  if (pickerTab.females.length + 1 > totalNests - 1) {
    showAlert('雌性数量不能超过窝数 - 1，请先增加精灵窝。')
    return
  }

  // 交配可能性检查：仓库中是否还有可与之交配的雄性
  const occupied = getOccupiedUids()
  const males = loadInventory().filter((it) => it.gender === 'male' && !occupied.has(it.uid))
  const canBreed = males.some((m) => getEggGroups(m.id).some((g) => f.eggGroups.includes(g)))
  if (!canBreed) {
    showAlert(`仓库中已无可与「${f.note || f.name}」交配的雄性精灵，无法放入。`)
    return
  }
  const female = { ...f, instanceId: nextFemaleId(), priority: false, useAcademy: false }
  pickerTab.females.push(female)
  if (f.uid) pickerTab.occupiedFemales.push(f.uid)
  pickerTab.result = null
  pickerTab.resultMales = []
  pickerTab.emptySlots = 0
  pickerTab.occupiedMales = []
  pickerOccupied.value = [...getOccupiedUids()]
}

function onRemoveFemale(f) {
  if (!pickerTab) return
  const idx = pickerTab.females.findIndex((x) => x.instanceId === f.instanceId)
  if (idx > -1) {
    const removed = pickerTab.females.splice(idx, 1)[0]
    if (removed.uid) {
      const u = pickerTab.occupiedFemales.indexOf(removed.uid)
      if (u > -1) pickerTab.occupiedFemales.splice(u, 1)
    }
  }
  syncPriorityPool(pickerTab) // ★删除后同步优先池
  pickerTab.result = null
  pickerTab.resultMales = []
  pickerTab.occupiedMales = []
  pickerOccupied.value = [...getOccupiedUids()]

}

// ---------- 点击雌性：优先 / 学院窝 ----------
const actionVisible = ref(false)
const actionFemale = ref(null)
const actionCanSetAcademy = ref(false)

function openFemaleAction(f) {
  actionFemale.value = f
  const tab = currentTab()
  actionCanSetAcademy.value = tab.academyCount > 0 && (f.useAcademy || !tab.females.some((x) => x.useAcademy))
  actionVisible.value = true
}

function onSetPriority() {
  const f = actionFemale.value
  if (!f) return
  const tab = currentTab()

  // 取消优先：移除标记，并从优先池移除不再被需要的蛋组
  if (f.priority) {
    f.priority = false
    syncPriorityPool(tab)
    actionVisible.value = false
    return
  }

  const pool = new Set(tab.priorityPool || [])
  const newGroups = f.eggGroups.filter((g) => !pool.has(g))

  // 蛋组都已在池里：直接允许，不新增蛋组
  if (newGroups.length === 0) {
    f.priority = true
    actionVisible.value = false
    return
  }

  // 加入后不超过2个：全部加入
  if (pool.size + newGroups.length <= 2) {
    newGroups.forEach((g) => pool.add(g))
    tab.priorityPool = [...pool]
    f.priority = true
    actionVisible.value = false
    return
  }

  // 只剩一个位置，且精灵有两个新蛋组：分别组合，选覆盖雌性更多的那个
  if (pool.size === 1 && newGroups.length === 2) {
    let bestGroup = null
    let bestCover = -1
    newGroups.forEach((g) => {
      const testPool = new Set([...pool, g])
      // 有共同蛋组即算覆盖
      const cover = tab.females.filter((fem) => fem.eggGroups.some((eg) => testPool.has(eg))).length
      if (cover > bestCover) { bestCover = cover; bestGroup = g }
    })
    if (bestGroup !== null) pool.add(bestGroup)
    tab.priorityPool = [...pool]
    f.priority = true
    actionVisible.value = false
    return
  }

  // 其他情况（池已满）：阻止
  showAlert('优先池最多记录两个蛋组，无法再设置优先。')
}
// 同步优先池：移除不再被任何 priority 雌性需要的蛋组
function syncPriorityPool(tab) {
  const stillNeeded = new Set()
  tab.females.filter((f) => f.priority).forEach((f) => f.eggGroups.forEach((g) => stillNeeded.add(g)))
  tab.priorityPool = (tab.priorityPool || []).filter((g) => stillNeeded.has(g))
}


function onSetAcademy() {
  const f = actionFemale.value
  if (!f) return
  f.useAcademy = !f.useAcademy
  actionVisible.value = false
}
function onActionRemove() {
  const f = actionFemale.value
  actionVisible.value = false
  if (!f) return
  const tab = currentTab()
  const idx = tab.females.findIndex((x) => x.instanceId === f.instanceId)
  if (idx > -1) {
    const removed = tab.females.splice(idx, 1)[0]
    if (removed.uid) {
      const u = tab.occupiedFemales.indexOf(removed.uid)
      if (u > -1) tab.occupiedFemales.splice(u, 1)
    }
  }
  syncPriorityPool(tab)
  tab.result = null
  tab.resultMales = []
  tab.occupiedMales = []
}

// ---------- 生成方案 ----------
function generate(tab) {
  if (!tab.females.length) { showAlert('请先添加雌性精灵'); return }
  const totalNests = (tab.nestCount || 0) + (tab.academyCount || 0)
  if (tab.females.length > totalNests - 1) { showAlert('雌性数量不能超过窝数 - 1'); return }

  tab.occupiedMales = [] // 释放本窗口旧方案占用
  const occupied = getOccupiedUids()
  const maleStock = loadInventory()
    .filter((it) => it.gender === 'male')
    .filter((it) => !occupied.has(it.uid))
    .filter((it) => {
      if (tab.maleFilter.shiny && !it.shiny) return false
      if (tab.maleFilter.personalityMode === 'personality' && tab.maleFilter.personality && it.personality !== tab.maleFilter.personality) return false
      if (tab.maleFilter.personalityMode === 'buff' && tab.maleFilter.buffFilter && petBuff(it.personality) !== tab.maleFilter.buffFilter) return false
      if (tab.maleFilter.body && it.medals?.body !== tab.maleFilter.body) return false
      if (tab.maleFilter.voice && it.medals?.voice !== tab.maleFilter.voice) return false
      return true
    })
    .map((it) => ({
      uid: it.uid,
      species: it.id,
      name: it.name,
      eggGroups: getEggGroups(it.id),
      isShiny: !!it.shiny,
      personality: it.personality || null,
      medals: it.medals || {},
    }))

  const females = tab.females.map((f) => ({
    uid: f.uid, id: f.id, name: f.note || f.name, eggGroups: f.eggGroups,
    isShiny: !!f.shiny, personality: f.personality || null, medals: f.medals || {},
    priority: f.priority, useAcademy: f.useAcademy, instanceId: f.instanceId,
  }))

  const r = computeRecommendation({
    females,
    maleStock,
    normalNestCount: tab.nestCount || 0,
    academyCount: tab.academyCount || 0,
    priorityGroups: priorityGroups(tab),
    hasPersonalityFilter: !!tab.maleFilter.personality,
  })
  if (r.error) { showAlert(r.error); return }
  if (r.academyReleased) tab.academyCount = 0
  if (r.normalReleased > 0) tab.nestCount = Math.max(0, tab.nestCount - r.normalReleased)

  // 再设置推荐雄性
  tab.resultMales = r.maleSlots
  tab.emptySlots = r.emptySlots
  tab.occupiedMales = r.maleSlots.map((m) => m.uid).filter(Boolean)

  const cov = recomputeCoverage(females, r.maleSlots)
  tab.maleCoverDetails = cov.maleCoverDetails
  tab.uncoveredFemales = cov.uncoveredFemales
  tab.academyCoveredGroups = cov.academyCoveredGroups
  tab.result = true
}


// ---------- 替换雄性 ----------
const replaceVisible = ref(false)
const replaceTarget = ref(null)
const replaceCandidates = ref([])
const placeMapVisible = ref(false)
const placeMapTab = ref(null)

function openPlacement(tab) {
  placeMapTab.value = tab
  placeMapVisible.value = true
}

function openReplace(m) {
  replaceTarget.value = m
  const tab = currentTab()
  const occupied = getOccupiedUids()
  let list = loadInventory()
    .filter((it) => it.gender === 'male')
    .filter((it) => !(m.uid && it.uid === m.uid)) // 排除被替换本身
    .filter((it) => !occupied.has(it.uid))        // 排除占用
    .filter((it) => {
      if (tab.maleFilter.shiny && !it.shiny) return false
      if (tab.maleFilter.personalityMode === 'personality' && tab.maleFilter.personality && it.personality !== tab.maleFilter.personality) return false
      if (tab.maleFilter.personalityMode === 'buff' && tab.maleFilter.buffFilter && petBuff(it.personality) !== tab.maleFilter.buffFilter) return false
      if (tab.maleFilter.body && it.medals?.body !== tab.maleFilter.body) return false
      if (tab.maleFilter.voice && it.medals?.voice !== tab.maleFilter.voice) return false
      return true
    })
    .map((it) => ({
      uid: it.uid, id: it.id, name: it.name,
      shiny: !!it.shiny, personality: it.personality || null, medals: it.medals || {},
      eggGroups: getEggGroups(it.id),
      eggGroupsName: eggGroupsOf(it.id),
    }))

  // 条件1：包含被替换雄性的有效蛋组
  const eff = effectiveGroups(m.eggGroups, tab.females.map((f) => ({ eggGroups: f.eggGroups })))
  if (eff.length) {
    list = list.filter((it) => eff.every((e) => it.eggGroups.includes(e)))
  }
  // 条件2：学院窝雄性覆盖的雌性蛋组不可出现在候选蛋组中
  if (tab.academyCoveredGroups && tab.academyCoveredGroups.length) {
    list = list.filter((it) => !it.eggGroups.some((g) => tab.academyCoveredGroups.includes(g)))
  }

  replaceCandidates.value = list
  replaceVisible.value = true
}

function onReplace(newItem) {
  const t = replaceTarget.value
  if (!t) return
  const tab = currentTab()
  // 释放旧占用
  if (t.uid) {
    const i = tab.occupiedMales.indexOf(t.uid)
    if (i > -1) tab.occupiedMales.splice(i, 1)
  }
  if (newItem.uid) tab.occupiedMales.push(newItem.uid)
  // 更新槽位
  Object.assign(t, {
    uid: newItem.uid,
    species: newItem.id,
    name: newItem.name,
    eggGroups: newItem.eggGroups,
    isShiny: !!newItem.shiny,
    personality: newItem.personality || null,
    medals: newItem.medals || {},
  })
  // 重新评估覆盖
  const females = tab.females.map((f) => ({
    uid: f.uid, id: f.id, name: f.note || f.name, eggGroups: f.eggGroups,
    isShiny: !!f.shiny, personality: f.personality || null, medals: f.medals || {},
    priority: f.priority, useAcademy: f.useAcademy, instanceId: f.instanceId,
  }))
  const cov = recomputeCoverage(females, tab.resultMales)
  tab.maleCoverDetails = cov.maleCoverDetails
  tab.uncoveredFemales = cov.uncoveredFemales
  tab.academyCoveredGroups = cov.academyCoveredGroups
  replaceVisible.value = false
}
</script>

<style scoped>
.breeding {
  max-width: 1100px;
  margin: 0 auto;
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

h1 {
  margin: 0;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, .2);
}

.top-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.academy-check {
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.remain {
  color: rgba(255, 255, 255, .85);
  font-size: 13px;
  background: rgba(255, 255, 255, .12);
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, .2);
}

.remain b {
  color: #c4b5fd;
}

.tabs-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, .1);
  border: 1px solid rgba(255, 255, 255, .2);
  border-radius: 10px;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
}

.tab.active {
  background: linear-gradient(135deg, #818cf8, #a78bfa);
  border-color: transparent;
}

.tab-meta {
  font-size: 11px;
  opacity: .75;
}

.tab-close {
  border: none;
  background: none;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
}

.add-tab {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px dashed rgba(255, 255, 255, .4);
  background: transparent;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
}

.add-tab:disabled {
  opacity: .4;
  cursor: not-allowed;
}

.tab-panel {
  background: rgba(255, 255, 255, .14);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, .22);
  border-radius: 14px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.settings-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.settings-row label {
  color: rgba(255, 255, 255, .85);
  font-size: 13px;
}

.settings-row input {
  width: 70px;
  margin-left: 6px;
  padding: 6px 8px;
  border: 1px solid rgba(255, 255, 255, .3);
  border-radius: 6px;
  background: rgba(255, 255, 255, .12);
  color: #fff;
  outline: none;
}

.hint {
  color: rgba(255, 255, 255, .6);
  font-size: 12px;
}

.gen-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.priority-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #fff;
}

.p-label {
  color: rgba(255, 255, 255, .7);
}

.p-tag {
  color: #fde68a;
  background: rgba(251, 191, 36, .22);
  padding: 2px 10px;
  border-radius: 6px;
}

.male-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
}

.select {
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, .3);
  border-radius: 6px;
  background: rgba(255, 255, 255, .12);
  color: #fff;
  font-size: 13px;
  outline: none;
  color-scheme: dark;
}

.select option {
  background: #3b2f6e;
  color: #fff;
}

.shiny-btn {
  padding: 6px 14px;
  border: 1px solid rgba(255, 255, 255, .3);
  border-radius: 8px;
  background: rgba(255, 255, 255, .12);
  color: rgba(255, 255, 255, .85);
  cursor: pointer;
  font-size: 13px;
}

.shiny-btn.on {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  border-color: transparent;
  color: #fff;
}

.primary-btn {
  padding: 8px 18px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #818cf8, #a78bfa);
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  box-shadow: 0 4px 14px rgba(129, 140, 248, .5);
}

.secondary-btn {
  padding: 8px 18px;
  border: 1px solid rgba(255, 255, 255, .3);
  border-radius: 8px;
  background: rgba(255, 255, 255, .12);
  color: #fff;
  cursor: pointer;
  font-size: 14px;
}

.nest-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.nest-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, .1);
  border: 1px solid rgba(255, 255, 255, .18);
  color: #fff;
  font-size: 12px;
  min-height: 150px;
  text-align: center;
}

.nest-item.female {
  cursor: pointer;
  border-color: rgba(244, 143, 177, .45);
}

.nest-item.male {
  cursor: pointer;
  border-color: rgba(100, 181, 246, .45);
}

.nest-item.empty {
  opacity: .45;
  border-style: dashed;
  justify-content: center;
}

.nest-item.academy {
  box-shadow: 0 0 14px 3px rgba(52, 211, 153, .7);
  border-color: #34d399;
  background: rgba(52, 211, 153, .15);
}

.priority-tag {
  position: absolute;
  top: 6px;
  left: 8px;
  font-size: 10px;
  color: #fde68a;
  background: rgba(251, 191, 36, .25);
  padding: 1px 6px;
  border-radius: 4px;
}

.nest-icon {
  font-size: 20px;
}

.nest-name {
  font-weight: bold;
  font-size: 14px;
}

.nest-origin {
  font-size: 11px;
  color: rgba(255, 255, 255, .55);
}

.nest-egg {
  font-size: 11px;
  color: rgba(255, 255, 255, .6);
  background: rgba(255, 255, 255, .1);
  padding: 1px 8px;
  border-radius: 4px;
}

.nest-shiny {
  font-size: 11px;
  color: #fde68a;
  background: rgba(251, 191, 36, .22);
  padding: 1px 8px;
  border-radius: 4px;
}

.nest-pers {
  font-size: 11px;
  color: #c4b5fd;
}

.nest-pers em {
  font-style: normal;
  font-size: 10px;
  color: rgba(255, 255, 255, .55);
}

.nest-medal {
  font-size: 11px;
  color: #93c5fd;
  background: rgba(147, 197, 253, .15);
  padding: 1px 8px;
  border-radius: 4px;
}

.academy-tag {
  position: absolute;
  bottom: 4px;
  left: 8px;
  font-size: 10px;
  color: #34d399;
  background: rgba(52, 211, 153, .2);
  padding: 1px 6px;
  border-radius: 4px;
}

.pair-area {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pair-title {
  font-size: 13px;
  color: #c4b5fd;
  font-weight: bold;
}

.male-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

.male-card {
  position: relative;
  background: rgba(255, 255, 255, .1);
  border: 1px solid rgba(255, 255, 255, .18);
  border-radius: 10px;
  padding: 10px 14px;
  color: #fff;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.male-card-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.star {
  font-size: 12px;
}

.mini-tag {
  font-size: 11px;
  color: #93c5fd;
  background: rgba(147, 197, 253, .15);
  padding: 1px 6px;
  border-radius: 4px;
}

.mini-tag.aca {
  color: #34d399;
  background: rgba(52, 211, 153, .2);
}

.male-card-cov {
  color: rgba(255, 255, 255, .7);
  font-size: 12px;
}

.lock {
  color: #fde68a;
  font-size: 12px;
}

.tooltip {
  display: none;
  position: absolute;
  bottom: calc(100% + 10px);
  left: 0;
  min-width: 220px;
  background: rgba(30, 22, 70, .96);
  border: 1px solid rgba(255, 255, 255, .25);
  border-radius: 12px;
  padding: 12px;
  z-index: 60;
  box-shadow: 0 12px 32px rgba(0, 0, 0, .5);
}

.male-card:hover .tooltip {
  display: block;
}

.tt-name {
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 4px;
}

.tt-egg {
  font-size: 12px;
  color: rgba(255, 255, 255, .7);
  margin-bottom: 6px;
}

.tt-attrs {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 12px;
  margin-bottom: 8px;
}

.tt-cov {
  font-size: 12px;
  color: #c4b5fd;
}

.tt-cov-item {
  color: rgba(255, 255, 255, .85);
  margin-top: 3px;
}

.summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ok {
  color: #6ee7b7;
}

.warn {
  color: #fca5a5;
}
</style>
