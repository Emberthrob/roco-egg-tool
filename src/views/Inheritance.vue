<template>
  <div class="plan">
    <div class="page-head">
      <h1>孵蛋计划</h1>
      <div class="head-right">
        <label class="nest-field">
          普通精灵窝
          <input type="number" v-model.number="normalNests" min="0" max="10" @change="clampNests" />
        </label>
        <label class="nest-field">
          拥有学院精灵窝
          <input type="checkbox" v-model="hasAcademy" />
        </label>
        <button class="primary-btn" @click="openPicker">＋添加目标精灵</button>
      </div>
    </div>

    <!-- 目标精灵区域 -->
    <div class="target-area">
      <div class="target-head">
        <span class="target-title">目标精灵</span>
        <label class="nest-field">
          <input type="checkbox" v-model="motherFilter" /> 母本过滤
        </label>
        <div class="mode-switch">
          <button class="mode-btn danger" @click="clearAllTargets">清空</button>
        </div>
        <span class="stats">已选 {{ planEntries.length }} 只 · 最少所需雄性 {{ planStats.y }} 只 · 共需 {{ planStats.total }} 窝（上限 {{ totalNests }}）</span>
      </div>
      <div class="target-grid" v-if="planEntries.length">
        <div v-for="entry in planEntries" :key="entry.uid" class="target-card" @click="openEditor(entry)">
          <span class="t-name">{{ entry.name }}</span>
          <span class="t-egg">{{ eggGroupNames(entry.eggGroups) }}</span>
          <span v-if="entry.personality" class="t-pers">🎭{{ entry.personality }}<em>{{ personalityDetail(entry.personality) }}</em></span>
          <span v-else class="t-pers dim">性格不限</span>
          <span v-if="entry.medals?.body" class="t-medal">{{ bodyIcon(entry.medals.body) }}</span>
          <span v-else class="t-medal dim">身体不限</span>
          <span v-if="entry.medals?.voice" class="t-medal">{{ voiceIcon(entry.medals.voice) }}</span>
          <span v-else class="t-medal dim">声音不限</span>
        </div>
      </div>
      <div v-else class="empty">还没有目标精灵，点击右上角「添加目标精灵」开始规划</div>
    </div>

    <!-- 孵化路线 -->
    <div class="route-bar" v-if="planEntries.length">
      <button class="primary-btn" @click="generateRoutes(true)">{{ routeGenerated ? '🔄 重新生成孵化路线' : '🧬 生成孵化路线' }}</button>
      <button v-if="routeVisible" class="cancel-btn" @click="routeVisible = false">收起</button>
      <button v-if="routeVisible" class="queue-btn" @click="onQueueStart">＋队列</button>
    </div>

    <div class="route-panel" :class="{ 'queue-lit': queueMode }" v-if="routeVisible && routeGenerated && activeEntry">
      <div class="route-tabs">
        <div v-for="entry in planEntries" :key="entry.uid" class="route-tab"
          :class="{ active: activeEntry.uid === entry.uid }" @click="activeRouteUid = entry.uid">
          <span class="rt-name">{{ entry.name }}</span>
          <span class="rt-egg">{{ eggGroupNames(entry.eggGroups) }}</span>
          <span v-if="entry.personality" class="rt-pers">🎭{{ entry.personality }}</span>
          <span v-if="entry.medals?.body" class="rt-medal">{{ bodyIcon(entry.medals.body) }}</span>
          <span v-if="entry.medals?.voice" class="rt-medal">{{ voiceIcon(entry.medals.voice) }}</span>
        </div>
      </div>
      <div class="route-window">
        <HatchRouteView
          :route="routes[activeEntry.uid]"
          :added-uids="addedUids"
          :queue-mode="queueMode"
          :selected-ids="getSelectedIds()"
          @node-click="onNodeClick"
          @undo="onUndoPet"
          @queue-start="onQueueStart"
          @block-click="onBlockClick"
        />
      </div>
    </div>

    <!-- 缺失精灵补充弹窗 -->
    <MissingPetModal
      v-model:visible="missingVisible"
      :missing-gender="missingInfo?.missingGender || 'female'"
      :missing-race-id="missingInfo?.missingRaceId || null"
      :other-parent="missingInfo?.otherParent || null"
      :target="activeEntry"
      :excluded-race-ids="usedFemaleRaceIds"
      :is-conversion="missingInfo?.isConversion || false"
      :lock-race="missingInfo?.lockRace || false"
      @add="onAddPet"
    />

    <!-- 添加目标精灵弹窗 -->
    <teleport to="body">
      <div class="modal-mask" v-if="pickerVisible" @click.self="closePicker">
        <div class="modal">
          <div class="modal-header">
            <h3>添加目标精灵</h3>
            <button class="close-btn" @click="closePicker">×</button>
          </div>

          <div class="modal-body">
            <!-- 筛选区（与仓库添加精灵页一致） -->
            <div class="search-filters">
              <div class="f-row">
                <span class="f-label">蛋组</span>
                <div class="egg-group-list">
                  <button v-for="(name, id) in eggGroups" :key="id" type="button" class="egg-btn"
                    :class="{ active: selectedEggGroups.includes(Number(id)) }" @click="toggleEggGroup(Number(id))">{{ name }}</button>
                </div>
              </div>
              <div class="f-row">
                <span class="f-label">赛季</span>
                <select v-model="selectedSeason" class="select">
                  <option value="">点击选择赛季</option>
                  <option v-for="(name, id) in seasons" :key="id" :value="id">{{ name }}</option>
                </select>
                <span class="f-label">搜索</span>
                <input v-model="searchText" class="search-input" type="text" placeholder="搜索精灵名字" />
                <button class="reset-btn" @click="resetSearch">重置</button>
              </div>
            </div>

            <!-- 搜索结果 -->
            <div class="result-area">
              <div class="result-grid" v-if="searchResults.length">
                <button v-for="pet in searchResults" :key="pet.id" type="button" class="result-item"
                  :class="{ disabled: isUnknown(pet), active: editing?.pet.id === pet.id }" :disabled="isUnknown(pet)"
                  @click="startEdit(pet)">
                  <span class="r-name">{{ pet.name }}</span>
                  <span class="r-egg">{{ eggGroupNamesOf(pet) }}</span>
                  <span v-if="isUnknown(pet)" class="no-hatch-tag">不可孵蛋</span>
                </button>
              </div>
              <div v-else class="empty">没有匹配的精灵</div>
            </div>

            <!-- 特征填写框架 -->
            <div class="edit-area" v-if="editing">
              <div class="edit-header">
                <h4>填写特征：<span class="pet-name">{{ editing.pet.name }}</span></h4>
              </div>
              <div class="edit-blocks">
                <div class="block">
                  <div class="block-title">性格（可不选）</div>
                  <PersonalityPicker v-model="editing.personality" placeholder="点击选择性格" clearable />
                </div>
                <div class="block">
                  <div class="block-title">身体奖牌（可不选）</div>
                  <select v-model="editing.medals.body" class="select">
                    <option value="">不限</option>
                    <option v-for="m in bodyMedals" :key="m.id" :value="m.id">{{ m.icon }} {{ m.name }}</option>
                  </select>
                </div>
                <div class="block">
                  <div class="block-title">声音奖牌（可不选）</div>
                  <select v-model="editing.medals.voice" class="select">
                    <option value="">不限</option>
                    <option v-for="m in voiceMedals" :key="m.id" :value="m.id">{{ m.icon }} {{ m.name }}</option>
                  </select>
                </div>
              </div>
              <div class="edit-actions">
                <button class="primary-btn" @click="confirmAdd">确认加入</button>
                <button class="cancel-btn" @click="editing = null">取消</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </teleport>

    <!-- 编辑目标精灵弹窗 -->
    <teleport to="body">
      <div class="modal-mask" v-if="editorVisible" @click.self="closeEditor">
        <div class="modal modal-sm">
          <div class="modal-header">
            <h3>编辑目标精灵</h3>
            <button class="close-btn" @click="closeEditor">×</button>
          </div>
          <div class="modal-body">
            <div class="pet-info" v-if="editEntry">
              <div class="info-name">{{ editEntry.name }}</div>
              <div class="info-egg">{{ eggGroupNames(editEntry.eggGroups) }}</div>
            </div>

            <div class="edit-blocks" v-if="editForm">
              <div class="block">
                <div class="block-title">性格（可不选）</div>
                <PersonalityPicker v-model="editForm.personality" placeholder="点击选择性格" clearable />
              </div>
              <div class="block">
                <div class="block-title">身体奖牌（可不选）</div>
                <select v-model="editForm.medals.body" class="select">
                  <option value="">不限</option>
                  <option v-for="m in bodyMedals" :key="m.id" :value="m.id">{{ m.icon }} {{ m.name }}</option>
                </select>
              </div>
              <div class="block">
                <div class="block-title">声音奖牌（可不选）</div>
                <select v-model="editForm.medals.voice" class="select">
                  <option value="">不限</option>
                  <option v-for="m in voiceMedals" :key="m.id" :value="m.id">{{ m.icon }} {{ m.name }}</option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="danger-btn" @click="removeEntry">删除</button>
            <div class="spacer"></div>
            <button class="cancel-btn" @click="closeEditor">取消</button>
            <button class="primary-btn" @click="saveEdit">保存</button>
          </div>
        </div>
      </div>
    </teleport>

    <div class="dev-notice">功能还在开发中</div>
  </div>
    <!-- 性别选择弹窗 -->
    <teleport to="body">
      <div class="modal-mask" v-if="genderSelectVisible" @click.self="pickGender(null)">
        <div class="modal modal-sm">
          <div class="modal-header"><h3>选择精灵性别</h3></div>
          <div class="modal-body">
            <div class="gender-choice">
              <button class="primary-btn" @click="pickGender('male')">♂ 男</button>
              <button class="primary-btn" @click="pickGender('female')">♀ 女</button>
            </div>
          </div>
        </div>
      </div>
    </teleport>

    <!-- 孵蛋队列：暗化遮罩 -->
    <teleport to="body">
      <div class="queue-mask" v-if="queueMode"></div>
    </teleport>

    <!-- 孵蛋队列：悬浮窗 -->
    <teleport to="body">
      <div class="queue-float" v-if="queueMode">
        <div class="qf-head">
          <span class="qf-title">孵蛋队列（{{ queuedPets.length }}）</span>
          <button class="qf-close" @click="closeQueue">×</button>
        </div>
        <div class="qf-body">
          <div v-for="p in queuedPets" :key="p.uid" class="qf-item">
            <span class="qf-g" :class="p.gender">{{ p.gender === 'male' ? '♂' : '♀' }}</span>
            <span class="qf-name">{{ p.name }}</span>
          </div>
          <div v-if="!queuedPets.length" class="qf-empty">点击亮着的块，选择要孵蛋的父母本</div>
        </div>
        <div class="qf-foot">
          <button class="secondary-btn" @click="clearQueue">清空</button>
          <button class="primary-btn" @click="confirmQueue">完成</button>
        </div>
      </div>
    </teleport>

    <!-- 孵蛋队列：分组弹窗 -->
    <teleport to="body">
      <div class="modal-mask" v-if="queueConfirmVisible" @click.self="continueSelect">
        <div class="modal">
          <div class="modal-header">
            <h3>孵蛋队列分组</h3>
            <button class="close-btn" @click="continueSelect">×</button>
          </div>
          <div class="modal-body">
            <div v-if="queueGroups.groups.length" class="qg-list">
              <div v-for="(g, gi) in queueGroups.groups" :key="'g' + gi" class="qg-group">
                <div class="qg-group-head">第 {{ gi + 1 }} 组 · 1 只雄性 + {{ g.females.length }} 只雌性</div>
                <div class="qg-group-body">
                  <div class="qg-mod" :class="{ academy: isAcademy(g.male.uid) }" @click="toggleAcademy(g.male.uid)">
                    <NodeCard :node="g.male" />
                  </div>
                  <div v-for="f in g.females" :key="nodeKey(f)" class="qg-mod" :class="{ academy: isAcademy(f.uid) }" @click="toggleAcademy(f.uid)">
                    <NodeCard :node="f" />
                  </div>
                </div>
              </div>
              <div v-if="hasAcademy" class="qg-hint">点击精灵模块可切换是否使用学院精灵窝</div>
            </div>
            <div v-else class="empty">未选择任何块</div>
          </div>
          <div class="modal-footer">
            <button class="cancel-btn" @click="continueSelect">继续选择</button>
            <button class="primary-btn" @click="joinBreeding">加入精灵窝</button>
          </div>
        </div>
      </div>
    </teleport>
</template>

<script setup>
import { ref, reactive, computed, watch, toRefs, provide, onActivated, nextTick } from 'vue'
import petsData from '../data/pets.json'
import defines from '../data/defines.json'
import medalsData from '../data/medals.json'
import personalitiesData from '../data/personalities.json'
import PersonalityPicker from '../components/PersonalityPicker.vue'
import { planState, nextPlanUid, checkLevel1, checkLevel2, checkLevel3, minEggGroupSet, routeState } from '../store/plan'
import { showAlert, showConfirm } from '../store/dialog'
import HatchRouteView from '../components/HatchRouteView.vue'
import MissingPetModal from '../components/MissingPetModal.vue'
import NodeCard from '../components/NodeCard.vue'
import { computeHatchRoute } from '../utils/hatchRoute'
import { loadInventory, recomputeCoverage, getEggGroups } from '../utils/breeding'
import { useRouter } from 'vue-router'
import { getBlockLane } from '../utils/routeLayout'
import { breedingState, nextFemaleId } from '../store/breeding'

const eggGroups = defines.egg_groups
const seasons = defines.season
const bodyMedals = medalsData.body
const voiceMedals = medalsData.voice

const { normalNests, academyNests, planEntries } = toRefs(planState)
const totalNests = computed(() => (normalNests.value || 0) + (academyNests.value || 0))
const hasAcademy = computed({
  get: () => academyNests.value > 0,
  set: (v) => { academyNests.value = v ? 1 : 0 },
})
const motherFilter = ref(false)

function clampNests() {
  if (normalNests.value < 0) normalNests.value = 0
  if (normalNests.value > 10) normalNests.value = 10
  if (academyNests.value < 0) academyNests.value = 0
  if (academyNests.value > 1) academyNests.value = 1
}

// 窝数变化时做一次检测
let _suppressNestWatch = false
watch([normalNests, academyNests], (nv, ov) => {
  if (_suppressNestWatch) return
  const r = checkLevel3(planEntries.value, totalNests.value)
  if (!r.ok) {
    _suppressNestWatch = true
    normalNests.value = ov[0]
    academyNests.value = ov[1]
    _suppressNestWatch = false
    showAlert(r.msg + '\n已恢复原窝数。')
  }
})

// ===== 性格详情 =====
const personalityMap = {}
Object.keys(personalitiesData).forEach((buff) => {
  personalitiesData[buff].forEach((p) => { personalityMap[p.name] = { buff, decrease: p.decrease } })
})
function personalityDetail(name) {
  const p = personalityMap[name]
  return p ? `+${p.buff}/-${p.decrease}` : ''
}

// ===== 展示辅助 =====
function eggGroupName(g) { return eggGroups[String(g)] || String(g) }
function eggGroupNames(groups) {
  const list = Array.isArray(groups) ? groups : []
  if (!list.length) return '未知组'
  return list.map((id) => eggGroupName(id)).join(' / ')
}
function eggGroupNamesOf(pet) {
  const g = Array.isArray(pet.egg_groups) ? pet.egg_groups : []
  if (!g.length) return '未知组'
  return g.map((id) => eggGroupName(id)).join('/')
}
function bodyIcon(id) {
  const m = bodyMedals.find((x) => x.id === id)
  return m ? `${m.icon}${m.name}` : id
}
function voiceIcon(id) {
  const m = voiceMedals.find((x) => x.id === id)
  return m ? `${m.icon}${m.name}` : id
}
function isUnknown(pet) {
  const g = Array.isArray(pet.egg_groups) ? pet.egg_groups : []
  return g.length === 0 || g.includes(1)
}

// ===== 统计展示 =====
const planStats = computed(() => {
  const { x } = minEggGroupSet(planEntries.value)
  const y = planEntries.value.length ? Math.ceil(x / 2) : 0
  return { y, total: planEntries.value.length + y }
})

// ===== 孵化路线 =====
const routeVisible = ref(false)
const routeGenerated = ref(false)
watch(motherFilter, () => { if (routeGenerated.value) generateRoutes() })
function processRouteInvalidation() {
  const uids = routeState.pendingUids
  if (!uids.length) return
  routeState.pendingUids = []
  if (uids.some((u) => u == null)) { routeGenerated.value = false; routes.value = {}; return }
  if (motherFilter.value) { generateRoutes(); return }
  const affected = new Set()
  planEntries.value.forEach((e) => {
    const r = routes.value[e.uid]
    if (r && (r.blocks || []).some((b) => uids.some((u) => (b.father && b.father.uid === u) || (b.mother && b.mother.uid === u)))) affected.add(e.uid)
  })
  affected.forEach((euid) => {
    const e = planEntries.value.find((x) => x.uid === euid)
    if (e) {
      try { routes.value[euid] = computeHatchRoute(e, [...loadInventory(), ...(addedPetsMap.value[euid] || [])], { femaleDedup: motherFilter.value }) }
      catch (err) { routes.value[euid] = { solvable: false, reason: '生成失败', blocks: [], notes: [] } }
    }
  })
}
watch(() => routeState.revision, () => { nextTick(processRouteInvalidation) })
onActivated(processRouteInvalidation)
const routes = ref({})
const activeRouteUid = ref('')
const activeEntry = computed(() => planEntries.value.find((e) => e.uid === activeRouteUid.value) || planEntries.value[0] || null)
watch(planEntries, (list) => {
  if (!list.find((e) => e.uid === activeRouteUid.value)) activeRouteUid.value = list[0]?.uid || ''
  routeGenerated.value = false
}, { deep: true })
function generateRoutes(resetReplacements) {
  if (resetReplacements) addedPetsMap.value = {}
  const map = {}
  const usedFemaleUids = new Set()
  planEntries.value.forEach((e) => {
    try {
      const route = computeHatchRoute(e, [...loadInventory(), ...(addedPetsMap.value[e.uid] || [])], {
        femaleDedup: motherFilter.value,
        usedFemaleUids: motherFilter.value ? usedFemaleUids : null,
      })
      if (motherFilter.value) {
        ;(route.blocks || []).forEach((b) => { if (b.mother && b.mother.uid) usedFemaleUids.add(b.mother.uid) })
      }
      map[e.uid] = route
    } catch (err) {
      console.error('生成孵化路线失败:', e.name, err)
      map[e.uid] = { solvable: false, reason: '生成失败：' + (err && err.message ? err.message : '未知错误'), blocks: [], notes: [] }
    }
  })
  routes.value = map
  routeGenerated.value = true
  routeVisible.value = true
  if (!activeRouteUid.value && planEntries.value.length) activeRouteUid.value = planEntries.value[0].uid
}

// 母本过滤：其他窗口已选用的雌性种族（用于替换弹窗过滤）
const usedFemaleRaceIds = computed(() => {
  if (!motherFilter.value) return []
  const activeUid = activeEntry.value?.uid
  const set = new Set()
  Object.entries(routes.value).forEach(([uid, route]) => {
    if (uid === activeUid) return
    ;(route.blocks || []).forEach((b) => {
      if (b.mother && b.mother.uid) set.add(b.mother.raceId)
    })
  })
  return [...set]
})

// ===== 缺失精灵补充 =====
const missingVisible = ref(false)
const missingInfo = ref(null)
const addedPetsMap = ref({})
const addedUids = computed(() => (addedPetsMap.value[activeEntry.value?.uid] || []).map((p) => p.uid))
function onNodeClick({ block, role, node }) {
  const otherParent = role === 'father' ? block.mother : block.father
  missingInfo.value = {
    missingGender: role === 'mother' ? 'female' : 'male',
    missingRaceId: node?.raceId || null,
    otherParent,
    isConversion: !!(block.child && block.child.tag === '转换产物'),
    lockRace: block.type === 'final' && role === 'mother',
  }
  missingVisible.value = true
}
function onAddPet(pet) {
  const uid = 'p' + Date.now() + Math.floor(Math.random() * 1000)
  const euid = activeEntry.value?.uid
  if (!euid) return
  const list = [...(addedPetsMap.value[euid] || [])]
  list.push({ ...pet, uid, note: null })
  addedPetsMap.value[euid] = list
  generateRoutes()
}
function onUndoPet(uid) {
  const euid = activeEntry.value?.uid
  if (!euid) return
  addedPetsMap.value[euid] = (addedPetsMap.value[euid] || []).filter((p) => p.uid !== uid)
  generateRoutes()
}

// ===== 孵蛋队列 =====
const router = useRouter()
const queueMode = ref(false)
const selectedBlocksMap = ref({})   // { [entryUid]: [blockId, ...] } 每个窗口独立
const queueConfirmVisible = ref(false)
const academyKeys = ref([])
const genderSelectVisible = ref(false)
let genderResolve = null
function askGender(name) {
  return new Promise((resolve) => { genderResolve = resolve; genderSelectVisible.value = true })
}
function pickGender(g) {
  genderSelectVisible.value = false
  if (genderResolve) { const r = genderResolve; genderResolve = null; r(g) }
}
provide('child-click', handleChildClick)

function activeRoute() {
  return routes.value[activeEntry.value?.uid] || null
}
function activeBlocks() {
  const r = activeRoute()
  return r ? r.blocks || [] : []
}
function getSelectedIds() {
  return selectedBlocksMap.value[activeEntry.value?.uid] || []
}
function setSelectedIds(arr) {
  selectedBlocksMap.value[activeEntry.value?.uid] = arr
}
function getAllSelectedBlocks() {
  const result = []
  Object.entries(selectedBlocksMap.value).forEach(([uid, ids]) => {
    const route = routes.value[uid]
    if (!route) return
    ;(ids || []).forEach((id) => {
      const block = (route.blocks || []).find((b) => b.id === id)
      if (block) result.push(block)
    })
  })
  return result
}
function blockHasMissing(block) {
  return [block.father, block.mother, block.backcrossFather, block.backcrossMother, block.child]
    .some((n) => n && (n.isUnknown || n.isMissing || n.featureUnknown))
}
function blockCost(block) {
  return (block.type === 'merge' || block.type === 'final') ? 2 : 1
}
function nodeKey(n) {
  if (!n) return ''
  if (n.uid) return 'u:' + n.uid
  return 'c:' + n.raceId + ':' + n.gender + ':' + (n.direction || '') + ':' + (n.tag || '')
}

function onQueueStart() {
  queueMode.value = true
  queueConfirmVisible.value = false
}
function closeQueue() {
  queueMode.value = false
  selectedBlocksMap.value = {}
}
function clearQueue() {
  selectedBlocksMap.value = {}
}

async function onBlockClick(id) {
  const blocks = activeBlocks()
  const block = blocks.find((b) => b.id === id)
  if (!block) return
  const cur = [...getSelectedIds()]
  const idx = cur.indexOf(id)
  if (idx > -1) {
    cur.splice(idx, 1)
    setSelectedIds(cur)
    return
  }
  if (blockHasMissing(block)) { showAlert('该块存在缺失/问号模块，无法加入孵蛋队列。'); return }
  const mKey = nodeKey(block.mother)
  if (mKey) {
    const queueKeys = new Set()
    getAllSelectedBlocks().forEach((b) => {
      ;[b.father, b.mother].forEach((n) => { if (n) queueKeys.add(nodeKey(n)) })
    })
    if (queueKeys.has(mKey)) { showAlert('该块的母本已在队列中，无法重复加入。'); return }
  }

  const lane = getBlockLane(blocks, id)
  const cost = blockCost(block)
  const toRemove = []
  cur.forEach((sid) => { if (getBlockLane(blocks, sid) === lane) toRemove.push(sid) })
  let remain = cur.filter((sid) => !toRemove.includes(sid))
  let remainUsed = remain.reduce((s, sid) => { const b = blocks.find((x) => x.id === sid); return s + (b ? blockCost(b) : 0) }, 0)
  while (remainUsed + cost > 2 && remain.length) {
    toRemove.push(remain[0])
    remain = remain.slice(1)
    remainUsed = remain.reduce((s, sid) => { const b = blocks.find((x) => x.id === sid); return s + (b ? blockCost(b) : 0) }, 0)
  }

  if (toRemove.length) {
    const ok = await showConfirm('该块与已选取的块发生名额冲突，是否替换已选取的块？')
    if (!ok) return
    const after = cur.filter((sid) => !toRemove.includes(sid))
    after.push(id)
    setSelectedIds(after)
  } else {
    cur.push(id)
    setSelectedIds(cur)
  }
}

const queuedPets = computed(() => {
  const seen = new Set()
  const list = []
  getAllSelectedBlocks().forEach((block) => {
    ;[block.father, block.mother].forEach((node) => {
      if (!node) return
      const k = nodeKey(node)
      if (seen.has(k)) return
      seen.add(k)
      list.push({ ...node })
    })
  })
  return list
})

const queueGroups = computed(() => {
  const maleMap = new Map()
  getAllSelectedBlocks().forEach((block) => {
    const f = block.father
    const m = block.mother
    const key = (f && f.uid) ? ('u:' + f.uid) : ('b:' + block.id)
    if (!maleMap.has(key)) maleMap.set(key, { male: f ? { ...f } : null, females: [] })
    const g = maleMap.get(key)
    if (m && !g.females.some((x) => nodeKey(x) === nodeKey(m))) g.females.push({ ...m })
  })
  return { groups: [...maleMap.values()] }
})

function isAcademy(uid) { return uid && academyKeys.value.includes(uid) }
function toggleAcademy(uid) {
  if (!hasAcademy.value || !uid) return
  const i = academyKeys.value.indexOf(uid)
  if (i > -1) academyKeys.value.splice(i, 1)
  else academyKeys.value = [uid]
}

async function handleChildClick(node) {
  if (!node || node.raceId == null) return
  const ok = await showConfirm(`是否将「${node.name}」加入仓库？`)
  if (!ok) return
  let gender = node.gender
  if (gender == null) {
    gender = await askGender(node.name)
  }
  const raw = localStorage.getItem('roco-storage')
  const data = raw ? JSON.parse(raw) : { nestCount: 10, inventory: [] }
  const pet = {
    id: node.raceId,
    name: node.name,
    eggGroups: getEggGroups(node.raceId),
    gender,
    shiny: false,
    personality: node.personality || null,
    medals: { body: node.body || null, voice: node.voice || null },
    note: null,
    uid: 'w' + Date.now() + Math.floor(Math.random() * 1000),
  }
  data.inventory.push(pet)
  localStorage.setItem('roco-storage', JSON.stringify(data))
  showAlert(`已将「${pet.name}」加入仓库。`)
}

function autoAssignAcademy() {
  if (!hasAcademy.value) return true
  const groups = queueGroups.value.groups
  if (groups.length <= 1) return true
  const blocks = getAllSelectedBlocks()
  const mergeBlock = blocks.find((b) => b.type === 'merge')
  let uid = null
  if (mergeBlock) {
    const mf = mergeBlock.father
    if (mf && mf.uid && mf.direction === 'C') {
      const g = groups.find((x) => x.male && nodeKey(x.male) === nodeKey(mf))
      if (g && !g.females.some((f) => f.direction === 'C')) uid = mf.uid
    }
    if (!uid && mergeBlock.mother && mergeBlock.mother.uid && mergeBlock.mother.direction === 'C') uid = mergeBlock.mother.uid
  }
  if (!uid) {
    for (const g of groups) {
      const fc = g.females.find((f) => f.uid && f.direction === 'C')
      if (fc) { uid = fc.uid; break }
    }
  }
  if (uid) { academyKeys.value = [uid]; return true }
  showAlert('无法自动分配学院精灵窝：没有找到负责传递性格的精灵。')
  return false
}

function confirmQueue() {
  if (!queuedPets.value.length) { showAlert('请先选择要孵蛋的块。'); return }
  queueMode.value = false
  if (!autoAssignAcademy()) return
  queueConfirmVisible.value = true
}
function continueSelect() {
  queueConfirmVisible.value = false
  queueMode.value = true
}

function addQueueTab(g) {
  const maleAcademy = g.male && g.male.uid && academyKeys.value.includes(g.male.uid)
  const femaleAcademy = g.females.some((f) => academyKeys.value.includes(f.uid))
  const tab = {
    id: Date.now() + Math.floor(Math.random() * 10000),
    name: g.male ? g.male.name : '队列',
    nestCount: g.females.length + 1,
    academyCount: (maleAcademy || femaleAcademy) ? 1 : 0,
    females: g.females.map((f) => ({
      instanceId: nextFemaleId(),
      id: f.raceId,
      name: f.name,
      note: null,
      eggGroups: getEggGroups(f.raceId),
      gender: 'female',
      shiny: false,
      personality: f.personality || null,
      medals: { body: f.body || null, voice: f.voice || null },
      priority: false,
      useAcademy: academyKeys.value.includes(f.uid),
    })),
    result: null,
    resultMales: [],
    emptySlots: 0,
    uncoveredFemales: [],
    maleCoverDetails: [],
    academyCoveredGroups: [],
    maleFilter: { personality: '', body: '', voice: '', shiny: false, personalityMode: 'personality', buffFilter: '' },
    occupiedFemales: g.females.map((f) => f.uid).filter(Boolean),
    occupiedMales: g.male && g.male.uid ? [g.male.uid] : [],
    priorityPool: [],
    locked: true,
  }
  if (g.male) {
    const maleSlot = {
      uid: g.male.uid,
      species: g.male.raceId,
      name: g.male.name,
      eggGroups: getEggGroups(g.male.raceId),
      isShiny: false,
      personality: g.male.personality || null,
      medals: { body: g.male.body || null, voice: g.male.voice || null },
      useAcademy: !!maleAcademy,
    }
    tab.resultMales = [maleSlot]
    const females = tab.females.map((f) => ({
      uid: null, id: f.id, name: f.name, eggGroups: f.eggGroups,
      isShiny: !!f.shiny, personality: f.personality, medals: f.medals,
      priority: f.priority, useAcademy: f.useAcademy, instanceId: f.instanceId,
    }))
    const cov = recomputeCoverage(females, [maleSlot])
    tab.maleCoverDetails = cov.maleCoverDetails
    tab.uncoveredFemales = cov.uncoveredFemales
    tab.academyCoveredGroups = cov.academyCoveredGroups
  }
  tab.result = true
  breedingState.tabs.push(tab)
  breedingState.activeTabId = tab.id
}

async function joinBreeding() {
  const groups = queueGroups.value.groups.filter((g) => g.male)
  if (!groups.length) { showAlert('没有可加入的孵蛋任务。'); return }

  const newUids = new Set()
  groups.forEach((g) => {
    if (g.male && g.male.uid) newUids.add(g.male.uid)
    g.females.forEach((f) => { if (f.uid) newUids.add(f.uid) })
  })

  const used = breedingState.tabs.filter((t) => (t.females && t.females.length) || (t.resultMales && t.resultMales.length))
  const dupTabs = used.filter((t) => {
    const uids = [...(t.occupiedFemales || []), ...(t.occupiedMales || [])]
    return uids.some((u) => u && newUids.has(u))
  })
  if (dupTabs.length) {
    const ok = await showConfirm('即将加入的窗口与已使用的窗口存在重复精灵，是否覆盖（删除这些重复的已使用窗口）？')
    if (!ok) return
    dupTabs.forEach((t) => {
      const i = breedingState.tabs.indexOf(t)
      if (i > -1) breedingState.tabs.splice(i, 1)
    })
  }

  const newNormal = groups.reduce((s, g) => s + g.females.length + 1, 0)
  const newAcademy = groups.filter((g) => g.females.some((f) => academyKeys.value.includes(f.uid))).length
  const existNormal = breedingState.tabs.reduce((s, t) => s + (t.nestCount || 0), 0)
  const existAcademy = breedingState.tabs.reduce((s, t) => s + (t.academyCount || 0), 0)
  const newWin = groups.length
  const existWin = breedingState.tabs.length
  if (existNormal + newNormal > 10 || (hasAcademy.value && existAcademy + newAcademy > 1) || existWin + newWin > 5) {
    const ok = await showConfirm('即将加入的窗口会超出总精灵窝数量或窗口数量上限，是否覆盖（删除所有已使用窗口）？')
    if (!ok) return
    breedingState.tabs.splice(0, breedingState.tabs.length)
  }

  groups.forEach((g) => addQueueTab(g))
  queueConfirmVisible.value = false
  queueMode.value = false
  selectedBlocksMap.value = {}
  router.push('/breeding')
}

function clearAllTargets() {
  if (!planEntries.value.length) { showAlert('目标精灵区域已经是空的'); return }
  planEntries.value = []
}

// ===== 添加弹窗 =====
const pickerVisible = ref(false)
const selectedEggGroups = ref([])
const selectedSeason = ref('')
const searchText = ref('')
const editing = ref(null)

function toggleEggGroup(id) {
  const i = selectedEggGroups.value.indexOf(id)
  if (i > -1) selectedEggGroups.value.splice(i, 1)
  else {
    if (selectedEggGroups.value.length >= 2) selectedEggGroups.value.shift()
    selectedEggGroups.value.push(id)
  }
}

function resetSearch() {
  selectedEggGroups.value = []
  selectedSeason.value = ''
  searchText.value = ''
}

const searchResults = computed(() => {
  return petsData.filter((pet) => {
    const groups = Array.isArray(pet.egg_groups) ? pet.egg_groups : []
    if (!groups.length) return false

    const len = selectedEggGroups.value.length
    if (len === 1) {
      if (!groups.includes(selectedEggGroups.value[0])) return false
    } else if (len === 2) {
      const [a, b] = selectedEggGroups.value
      if (!(groups.includes(a) && groups.includes(b))) return false
    }

    if (selectedSeason.value) {
      if (!pet.has_shiny) return false
      if (String(pet.has_shiny) !== selectedSeason.value) return false
    }

    if (searchText.value && !(pet.name || '').includes(searchText.value)) return false
    return true
  })
})

function startEdit(pet) {
  editing.value = {
    pet,
    personality: '',
    medals: { body: '', voice: '' },
  }
}

async function confirmAdd() {
  if (!editing.value) return
  const e = editing.value
  const entry = {
    uid: nextPlanUid(),
    id: e.pet.id,
    name: e.pet.name,
    eggGroups: Array.isArray(e.pet.egg_groups) ? [...e.pet.egg_groups] : [],
    personality: e.personality || '',
    medals: { body: e.medals.body || '', voice: e.medals.voice || '' },
  }

  const r1 = checkLevel1(entry, planEntries.value)
  if (!r1.ok) { await showAlert(r1.msg); return }
  const r2 = checkLevel2(entry)
  if (!r2.ok) { await showAlert(r2.msg); return }
  const r3 = checkLevel3([...planEntries.value, entry], totalNests.value)
  if (!r3.ok) { await showAlert(r3.msg); return }

  planEntries.value.push(entry)
  editing.value = null
  pickerVisible.value = false
  resetSearch()
}

function openPicker() {
  resetSearch()
  editing.value = null
  pickerVisible.value = true
}
function closePicker() {
  pickerVisible.value = false
  editing.value = null
}

// ===== 编辑弹窗 =====
const editorVisible = ref(false)
const editIndex = ref(-1)
const editForm = reactive({ personality: '', medals: { body: '', voice: '' } })

const editEntry = computed(() => planEntries.value[editIndex.value] || null)

function openEditor(entry) {
  editIndex.value = planEntries.value.indexOf(entry)
  editForm.personality = entry.personality || ''
  editForm.medals = { body: entry.medals?.body || '', voice: entry.medals?.voice || '' }
  editorVisible.value = true
}
function closeEditor() {
  editorVisible.value = false
}

async function saveEdit() {
  const entry = editEntry.value
  if (!entry) return
  const updated = {
    ...entry,
    personality: editForm.personality || '',
    medals: { body: editForm.medals.body || '', voice: editForm.medals.voice || '' },
  }
  const newList = planEntries.value.map((e, i) => (i === editIndex.value ? updated : e))

  // 品种/蛋组未变，跳过第一关；只做第二、三关
  const r2 = checkLevel2(updated)
  if (!r2.ok) { await showAlert(r2.msg); return }
  const r3 = checkLevel3(newList, totalNests.value)
  if (!r3.ok) { await showAlert(r3.msg); return }

  planEntries.value[editIndex.value] = updated
  editorVisible.value = false
}

async function removeEntry() {
  const entry = editEntry.value
  if (!entry) return
  const ok = await showConfirm(`确定删除目标精灵「${entry.name}」吗？`)
  if (!ok) return
  planEntries.value.splice(editIndex.value, 1)
  editorVisible.value = false
}
</script>

<style scoped>
.plan {
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
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.head-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.nest-field {
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  background: rgba(255, 255, 255, 0.12);
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  gap: 6px;
}

.nest-field input {
  width: 50px;
  padding: 4px 6px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  outline: none;
  text-align: center;
}

.primary-btn {
  padding: 8px 18px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #818cf8, #a78bfa);
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  box-shadow: 0 4px 14px rgba(129, 140, 248, 0.5);
  transition: transform 0.15s;
}
.primary-btn:hover { transform: translateY(-2px); }
.primary-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

.cancel-btn {
  padding: 8px 18px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
}

.danger-btn {
  padding: 8px 18px;
  border: 1px solid rgba(252, 165, 165, 0.5);
  border-radius: 8px;
  background: rgba(248, 113, 113, 0.2);
  color: #fecaca;
  cursor: pointer;
  font-size: 14px;
}
.danger-btn:hover { background: rgba(248, 113, 113, 0.32); }

/* ===== 目标精灵区域 ===== */
.target-area {
  background: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 14px;
  padding: 16px 20px;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.28);
}

.target-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.target-title {
  color: #fff;
  font-size: 15px;
  font-weight: bold;
}

.stats {
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
}

.target-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.target-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 14px 12px;
  min-height: 130px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #fff;
  cursor: pointer;
  font-size: 12px;
  transition: transform 0.15s, border-color 0.15s;
}
.target-card:hover {
  transform: translateY(-3px);
  border-color: #c4b5fd;
}

.t-name { font-weight: bold; font-size: 15px; }
.t-egg {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.1);
  padding: 1px 8px;
  border-radius: 4px;
  align-self: flex-start;
}
.t-pers { font-size: 12px; color: #c4b5fd; }
.t-pers em { font-style: normal; font-size: 11px; color: rgba(255, 255, 255, 0.55); }
.t-medal { font-size: 12px; color: #93c5fd; }
.dim { color: rgba(255, 255, 255, 0.45); }

.empty {
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  padding: 40px 0;
  font-size: 14px;
}

/* ===== 弹窗 ===== */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(30, 20, 60, 0.55);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal {
  width: 90%;
  max-width: 780px;
  max-height: 90vh;
  background: rgba(40, 30, 90, 0.9);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.modal-sm { max-width: 560px; }

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}
.modal-header h3 { margin: 0; color: #fff; }
.close-btn {
  border: none;
  background: none;
  font-size: 24px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1;
}
.close-btn:hover { color: #fff; }

.modal-body {
  padding: 16px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.search-filters {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.f-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.f-label { color: rgba(255, 255, 255, 0.75); font-size: 13px; flex-shrink: 0; }
.egg-group-list { display: flex; flex-wrap: wrap; gap: 6px; }
.egg-btn {
  padding: 4px 10px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
}
.egg-btn.active {
  background: linear-gradient(135deg, #818cf8, #a78bfa);
  border-color: transparent;
  color: #fff;
}
.select {
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 13px;
  outline: none;
  color-scheme: dark;
}
.select option { background: #3b2f6e; color: #fff; }
.search-input {
  flex: 1;
  min-width: 140px;
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 13px;
  outline: none;
}
.search-input::placeholder { color: rgba(255, 255, 255, 0.5); }
.reset-btn {
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.12);
  cursor: pointer;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
}
.reset-btn:hover { border-color: #fca5a5; color: #fecaca; }

.result-area {
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  padding: 8px;
}
.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
}
.result-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  min-height: 80px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  font-size: 12px;
  color: #fff;
  transition: all 0.15s;
}
.result-item:hover { border-color: #c4b5fd; }
.result-item.active {
  border-color: #c4b5fd;
  background: rgba(129, 140, 248, 0.25);
}
.result-item.disabled { opacity: 0.45; cursor: not-allowed; filter: grayscale(1); }
.r-name { font-weight: bold; font-size: 13px; }
.r-egg { font-size: 11px; color: rgba(255, 255, 255, 0.6); }
.no-hatch-tag {
  font-size: 10px;
  color: #fca5a5;
  background: rgba(248, 113, 113, 0.25);
  padding: 1px 6px;
  border-radius: 4px;
}

.edit-area {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.edit-header h4 { margin: 0; color: #fff; font-size: 14px; }
.pet-name { color: #c4b5fd; }

.edit-blocks {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}
.block {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  padding: 12px 14px;
}
.block-title {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 1px;
  margin-bottom: 10px;
}
.block .select { width: 100%; }

.edit-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.pet-info {
  text-align: center;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
}
.info-name { font-size: 20px; font-weight: bold; color: #fff; }
.info-egg { font-size: 12px; color: rgba(255, 255, 255, 0.7); margin-top: 6px; }

.modal-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
}
.spacer { flex: 1; }

/* 模式切换 */
.mode-switch { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.mode-btn {
  padding: 7px 14px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  cursor: pointer;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
}
.mode-btn.active { background: linear-gradient(135deg, #818cf8, #a78bfa); border-color: transparent; color: #fff; }
.priority-tip {
  color: #fde68a;
  font-size: 12px;
  background: rgba(251, 191, 36, 0.15);
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 12px;
}

/* 目标卡片优先/编辑 */
.target-card.priority { border-color: #fde68a; box-shadow: 0 0 12px 2px rgba(251, 191, 36, 0.5); }
.card-edit {
  position: absolute;
  top: 6px;
  right: 6px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-radius: 6px;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
}
.prio-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: 10px;
  color: #fde68a;
  background: rgba(251, 191, 36, 0.3);
  padding: 1px 6px;
  border-radius: 4px;
}

/* 生成方案结果 */
.plan-result { margin-top: 16px; display: flex; flex-direction: column; gap: 14px; }
.plan-group {
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 14px;
  padding: 14px 16px;
}
.group-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.group-title { color: #fff; font-weight: bold; font-size: 14px; }
.group-prio { font-size: 11px; color: #fde68a; background: rgba(251, 191, 36, 0.25); padding: 1px 8px; border-radius: 4px; }
.group-targets { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px; }
.group-target {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
}
.gt-name { font-weight: bold; color: #fff; font-size: 14px; }
.feat { font-size: 12px; padding: 1px 8px; border-radius: 4px; }
.feat.green { color: #6ee7b7; background: rgba(52, 211, 153, 0.15); }
.feat.yellow { color: #fde68a; background: rgba(251, 191, 36, 0.15); }
.feat.red { color: #fca5a5; background: rgba(248, 113, 113, 0.18); }
.group-parents { display: flex; flex-wrap: wrap; gap: 10px; }
.parent {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  font-size: 13px;
  color: #fff;
}
.parent.male { border-color: rgba(100, 181, 246, 0.45); }
.parent.female { border-color: rgba(244, 143, 177, 0.45); }
.p-icon { font-size: 16px; }
.p-name { font-weight: bold; }
.p-sub { font-size: 11px; color: rgba(255, 255, 255, 0.6); }
.p-for { font-size: 11px; color: rgba(255, 255, 255, 0.55); }
.none { color: #fca5a5; font-size: 12px; }
.mode-btn.danger { border-color: rgba(252, 165, 165, 0.5); color: #fecaca; }
.mode-btn.danger:hover { background: rgba(248, 113, 113, 0.2); }
.group-meta { font-size: 12px; color: rgba(255, 255, 255, 0.6); margin-left: auto; }

/* 精灵模块 */
.pet-module {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  min-width: 140px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 12px;
}
.target-mod { border-color: rgba(196, 181, 253, 0.4); }
.male-mod { border-color: rgba(100, 181, 246, 0.45); cursor: pointer; }
.female-mod { border-color: rgba(244, 143, 177, 0.45); cursor: pointer; }
.male-mod:hover, .female-mod:hover { border-color: #c4b5fd; }
.pm-name { font-weight: bold; font-size: 13px; }
.pm-egg { font-size: 11px; color: rgba(255, 255, 255, 0.6); background: rgba(255, 255, 255, 0.1); padding: 1px 6px; border-radius: 4px; }
.pm-sub { font-size: 11px; color: #93c5fd; }
.pm-for { font-size: 11px; color: rgba(255, 255, 255, 0.55); }

/* 交配弹窗 */
.mate-head { display: flex; align-items: center; gap: 8px; font-size: 16px; color: #fff; }
.mh-icon { font-size: 20px; }
.mh-name { font-weight: bold; }
.mate-list { display: flex; flex-direction: column; gap: 6px; }
.mate-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 13px;
}
.mate-item.ok { border-color: rgba(52, 211, 153, 0.5); background: rgba(52, 211, 153, 0.1); }
.mi-icon { font-size: 15px; }
.mi-name { font-weight: bold; }
.mi-for { font-size: 11px; color: rgba(255, 255, 255, 0.55); }
.mi-status { margin-left: auto; font-size: 12px; }
.mate-item.ok .mi-status { color: #6ee7b7; }
.mate-item:not(.ok) .mi-status { color: #fca5a5; }
.plan-result { margin-top: 16px; display: flex; flex-direction: column; gap: 16px; }
.tree-window { background: rgba(255,255,255,.12); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border: 1px solid rgba(255,255,255,.2); border-radius: 14px; padding: 14px 16px; overflow-x: auto; }
.tree-window-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.tw-title { color: #fff; font-weight: bold; font-size: 15px; }
.tw-sub { font-size: 12px; color: rgba(255,255,255,.6); }
.tree-body { display: flex; flex-direction: column; align-items: center; }
.tree-parents { display: flex; gap: 32px; margin-top: 16px; }
.node-info-name { font-size: 18px; font-weight: bold; color: #fff; }
.node-info-sub { font-size: 13px; color: rgba(255,255,255,.75); margin-top: 6px; }
.node-info-hint { font-size: 13px; color: #fde68a; margin-top: 10px; background: rgba(251,191,36,.12); padding: 8px 12px; border-radius: 8px; }
.node-info-offspring { font-size: 12px; color: rgba(255,255,255,.7); margin-top: 10px; }
.node-info-recommend { margin-top: 10px; }
.nir-title { font-size: 12px; color: rgba(255,255,255,.7); margin-bottom: 6px; }
.nir-item { display: inline-block; margin: 2px 4px 2px 0; padding: 2px 10px; border-radius: 999px; background: rgba(167,139,250,.2); color: #d8c9ff; font-size: 12px; }
.nio-title { font-size: 12px; color: rgba(255,255,255,.7); margin-bottom: 6px; }
.nio-item { font-size: 12px; color: #fde68a; margin: 2px 0; }
.no-solution { color: #fca5a5; padding: 20px; text-align: center; font-size: 14px; }
.ni-line { font-size: 13px; color: rgba(255,255,255,.8); margin: 2px 0; }
.nir-search { display: flex; gap: 6px; align-items: center; margin-bottom: 8px; }
.nir-list { display: flex; flex-wrap: wrap; gap: 6px; max-height: 200px; overflow-y: auto; }
.nir-item { cursor: pointer; }
.plan-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.plan-tab { padding: 7px 14px; border: 1px solid rgba(255,255,255,.3); border-radius: 8px; background: rgba(255,255,255,.1); color: rgba(255,255,255,.85); cursor: pointer; font-size: 13px; }
.plan-tab.active { background: linear-gradient(135deg,#818cf8,#a78bfa); border-color: transparent; color: #fff; }
.dev-notice {
  margin-top: 40px;
  padding: 28px 0;
  text-align: center;
  font-size: 34px;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.55);
  letter-spacing: 6px;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
}
/* ===== 孵化路线 ===== */
.route-bar { margin-top: 16px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.route-bar .queue-btn {
  margin-left: auto;
  padding: 8px 18px;
  border: 1px solid rgba(110, 231, 183, 0.5);
  border-radius: 8px;
  background: rgba(110, 231, 183, 0.18);
  color: #6ee7b7;
  cursor: pointer;
  font-size: 14px;
}
.route-panel {
  margin-top: 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 14px;
  padding: 14px;
}
.route-tabs { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; }
.route-tab {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: #fff;
  cursor: pointer;
  font-size: 12px;
  min-width: 120px;
}
.route-tab.active { background: linear-gradient(135deg, #818cf8, #a78bfa); border-color: transparent; }
.rt-name { font-weight: bold; font-size: 14px; }
.rt-egg { font-size: 11px; color: rgba(255, 255, 255, 0.6); }
.route-tab.active .rt-egg { color: rgba(255, 255, 255, 0.85); }
.rt-pers, .rt-medal { font-size: 11px; color: rgba(255, 255, 255, 0.75); }
.route-window { overflow-x: auto; }
.gender-choice { display: flex; gap: 14px; justify-content: center; padding: 8px 0; }
.gender-choice button { min-width: 100px; }

/* ===== 孵蛋队列 ===== */
.queue-mask {
  position: fixed;
  inset: 0;
  background: rgba(20, 14, 50, 0.72);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  z-index: 900;
}
.queue-lit { position: relative; z-index: 1000; }

.queue-float {
  position: fixed;
  top: 74px;
  right: 20px;
  z-index: 1100;
  width: 300px;
  max-height: 60vh;
  background: rgba(40, 30, 90, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 14px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #fff;
}
.qf-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,.12); }
.qf-title { font-size: 14px; font-weight: bold; }
.qf-close { border: none; background: none; color: rgba(255,255,255,.6); font-size: 20px; cursor: pointer; line-height: 1; }
.qf-close:hover { color: #fff; }
.qf-body { padding: 12px 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
.qf-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.qf-g { font-weight: bold; }
.qf-g.male { color: #93c5fd; }
.qf-g.female { color: #f9a8d4; }
.qf-empty { color: rgba(255,255,255,.5); font-size: 12px; text-align: center; padding: 10px 0; }
.qf-foot { display: flex; gap: 10px; padding: 12px 16px; border-top: 1px solid rgba(255,255,255,.12); }
.qf-foot button { flex: 1; }

.qg-list { display: flex; flex-direction: column; gap: 12px; }
.qg-group { border: 1px solid rgba(255,255,255,.22); border-radius: 12px; padding: 12px; background: rgba(255,255,255,.06); }
.qg-group-head { font-size: 12px; color: #c4b5fd; font-weight: bold; margin-bottom: 8px; }
.qg-group-body { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.qg-mod { cursor: pointer; }
.qg-mod.academy { outline: 3px solid #34d399; outline-offset: 2px; border-radius: 12px; }
.qg-hint { font-size: 12px; color: #fde68a; }
</style>
