<template>
  <div class="storage">
    <h1>精灵仓库</h1>

    <!-- 第一行：添加 + 导出导入 -->
    <div class="toolbar">
      <button class="primary-btn" @click="showModal = true">添加精灵</button>
      <button class="tool-btn" @click="openLastAdded">上次录入</button>
      <div class="spacer"></div>
      <button class="tool-btn" @click="exportData">导出</button>
      <button class="tool-btn" @click="triggerImport">导入</button>
      <button class="tool-btn danger" @click="confirmClear">清空仓库</button>
      <input ref="fileInput" type="file" accept="application/json,.json" style="display:none" @change="onImportFile" />
    </div>

    <!-- 筛选面板 -->
    <div class="filter-panel">
      <!-- 搜索行 -->
      <div class="f-row">
        <span class="f-label">搜索</span>
        <input v-model="searchKeyword" class="search-input" type="text" placeholder="搜索精灵名字或备注" />
      </div>

      <!-- 性别 + 异色 -->
      <div class="f-row">
        <span class="f-label">性别</span>
        <div class="gender-btns">
          <button v-for="opt in genderOptions" :key="opt.value" type="button" class="g-btn"
            :class="{ active: genderFilter === opt.value }" @click="genderFilter = opt.value">{{ opt.label }}</button>
        </div>
        <button type="button" class="shiny-btn" :class="{ on: onlyShiny }" @click="onlyShiny = !onlyShiny">✨ 异色</button>
      </div>

      <!-- 性格 + 奖牌 + 重置 -->
      <div class="f-row">
        <span class="f-label">性格</span>
        <PersonalityFilterGroup v-model:mode="personalityMode" v-model:personality="personalityFilter" v-model:buff="buffFilter" placeholder="全部性格" />

        <span class="f-label">身体奖牌</span>
        <select v-model="bodyFilter" class="select">
          <option value="">空</option>
          <option v-for="m in bodyMedals" :key="m.id" :value="m.id">{{ m.icon }} {{ m.name }}</option>
        </select>

        <span class="f-label">声音奖牌</span>
        <select v-model="voiceFilter" class="select">
          <option value="">空</option>
          <option v-for="m in voiceMedals" :key="m.id" :value="m.id">{{ m.icon }} {{ m.name }}</option>
        </select>

        <button class="reset-btn" @click="resetFilters">重置</button>
      </div>
    </div>

    <!-- 结果计数 -->
    <p class="count">共 {{ filtered.length }} 只精灵</p>

    <!-- 仓库列表：点击卡片弹出详情窗口 -->
    <div class="storage-grid" v-if="filtered.length">
      <div class="storage-card" v-for="pet in filtered" :key="pet.uid" @click="openEdit(pet)">
        <div class="card-tags">
          <span v-if="pet.shiny" class="tag shiny">✨异色</span>
          <span class="gender-badge" :class="pet.gender">{{ genderLabel(pet.gender) }}</span>
        </div>
        <div class="card-name">{{ displayName(pet) }}</div>
        <div v-if="pet.note" class="card-origin">{{ pet.name }}</div>
        <div class="card-egg">{{ eggGroupNames(pet.eggGroups) }}</div>
        <div class="card-info">
          <span v-if="pet.personality" class="info-item">性格:{{ pet.personality }}</span>
          <span v-if="pet.medals?.body" class="info-item">{{ bodyIcon(pet.medals.body) }}</span>
          <span v-if="pet.medals?.voice" class="info-item">{{ voiceIcon(pet.medals.voice) }}</span>
        </div>
      </div>
    </div>
    <div v-else class="empty">仓库为空，点击「添加精灵」开始录入</div>

    <AddPetModal v-model="showModal" @confirm="onConfirm" />
    <EditPetModal v-model="showEditModal" :pet="editingPet" @save="onEditSave" @remove="onEditRemove" />

    <!-- 上次录入弹窗 -->
    <teleport to="body">
      <div class="modal-mask" v-if="lastAddedVisible" @click.self="closeLastAdded">
        <div class="modal">
          <div class="modal-header">
            <h3>上次录入（{{ lastAdded.length }}）</h3>
            <button class="close-btn" @click="closeLastAdded">×</button>
          </div>
          <div class="modal-body">
            <div class="la-list">
              <div v-for="(p, i) in lastAdded" :key="p.uid" class="la-item">
                <span class="gender-badge" :class="p.gender">{{ p.gender === 'male' ? '♂ 雄' : '♀ 雌' }}</span>
                <span class="la-name">{{ p.note || p.name }}</span>
                <span v-if="p.personality" class="la-tag">🎭{{ p.personality }}</span>
                <span v-if="p.medals?.body" class="la-tag">{{ bodyIcon(p.medals.body) }}</span>
                <span v-if="p.medals?.voice" class="la-tag">{{ voiceIcon(p.medals.voice) }}</span>
                <button class="la-btn" @click="editLastAdded(i)">编辑</button>
                <button class="la-btn danger" @click="removeLastAdded(i)">删除</button>
              </div>
            </div>
            <div v-if="lastEditIndex > -1" class="la-edit">
              <h4>编辑：{{ lastAdded[lastEditIndex].name }}</h4>
              <div class="block"><div class="block-title">性别</div>
                <template v-if="!genderRestriction(lastEditSpecies)">
                  <div class="gender-btns"><button :class="{ active: lastEditForm.gender === 'male' }" @click="lastEditForm.gender = 'male'">♂ 雄</button><button :class="{ active: lastEditForm.gender === 'female' }" @click="lastEditForm.gender = 'female'">♀ 雌</button></div>
                </template>
                <template v-else><span class="gender-badge" :class="lastEditForm.gender">{{ lastEditForm.gender === 'male' ? '♂ 只有雄性' : '♀ 只有雌性' }}</span></template>
              </div>
              <div class="block" v-if="lastEditSpecies && lastEditSpecies.has_shiny != null"><div class="block-title">异色</div><label><input type="checkbox" v-model="lastEditForm.shiny" /> {{ lastEditForm.shiny ? '异色' : '非异色' }}</label></div>
              <div class="block"><div class="block-title">性格</div><PersonalityPicker v-model="lastEditForm.personality" placeholder="点击选择" clearable /></div>
              <div class="block"><div class="block-title">身体奖牌</div><select v-model="lastEditForm.medals.body" class="select"><option value="">空</option><option v-for="m in bodyMedals" :key="m.id" :value="m.id">{{ m.icon }} {{ m.name }}</option></select></div>
              <div class="block"><div class="block-title">声音奖牌</div><select v-model="lastEditForm.medals.voice" class="select"><option value="">空</option><option v-for="m in voiceMedals" :key="m.id" :value="m.id">{{ m.icon }} {{ m.name }}</option></select></div>
              <div class="block"><div class="block-title">备注</div><input v-model="lastEditForm.note" class="note-input" placeholder="备注（可选）" /></div>
              <div class="edit-actions"><button class="primary-btn" @click="saveLastEdit">保存修改</button><button class="cancel-btn" @click="lastEditIndex = -1">取消</button></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="cancel-btn" @click="closeLastAdded">取消</button>
            <button class="primary-btn" @click="confirmLastAdded">确认</button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { reactive, computed, ref, watch, onActivated } from 'vue'
import defines from '../data/defines.json'
import medalsData from '../data/medals.json'
import personalitiesData from '../data/personalities.json'
import petsData from '../data/pets.json'
import { getEvolutionRoot } from '../utils/breeding'
import AddPetModal from '../components/AddPetModal.vue'
import EditPetModal from '../components/EditPetModal.vue'
import PersonalityPicker from '../components/PersonalityPicker.vue'
import PersonalityFilterGroup from '../components/PersonalityFilterGroup.vue'
import { breedingState, replaceTabs, isPetUsed, removePetFromAllTabs, clearAllTabs } from '../store/breeding'
import { showAlert, showConfirm } from '../store/dialog'
import { planState, clearPlan } from '../store/plan'


const STORAGE_KEY = 'roco-storage'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      return { nestCount: data.nestCount ?? 10, inventory: data.inventory || [] }
    }
  } catch (e) { }
  return { nestCount: 10, inventory: [] }
}

const store = reactive(load())

watch(store, () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}, { deep: true })

// 从精灵大全等其他页面录入后，切回本页时刷新
onActivated(() => {
  const data = load()
  store.nestCount = data.nestCount
  store.inventory = data.inventory
})

const bodyMedals = medalsData.body
const voiceMedals = medalsData.voice

const showModal = ref(false)
const fileInput = ref(null)

// 编辑弹窗
const showEditModal = ref(false)
const editingPet = ref(null)

// 筛选状态
const searchKeyword = ref('')
const genderFilter = ref('all')
const onlyShiny = ref(false)
const personalityFilter = ref('')
const bodyFilter = ref('')
const voiceFilter = ref('')
const personalityMode = ref('personality')
const buffFilter = ref('')
const buffOptions = ['生命', '物攻', '魔攻', '物防', '魔防', '速度']
function petBuff(personality) {
  if (!personality) return ''
  for (const buff of buffOptions) {
    if ((personalitiesData[buff] || []).some((p) => p.name === personality)) return buff
  }
  return ''
}

const genderOptions = [
  { value: 'all', label: '全部' },
  { value: 'female', label: '♀ 雌' },
  { value: 'male', label: '♂ 雄' },
]

// 备注优先显示
function displayName(pet) {
  return pet.note || pet.name
}

const filtered = computed(() => {
  let searchRoots = null
  if (searchKeyword.value) {
    const matched = store.inventory.filter((pet) => pet.name.includes(searchKeyword.value))
    searchRoots = new Set(matched.map((pet) => getEvolutionRoot(pet.id)))
  }
  return store.inventory.filter((pet) => {
    if (searchRoots) {
      const nameMatch = searchRoots.has(getEvolutionRoot(pet.id))
      const noteMatch = pet.note ? pet.note.includes(searchKeyword.value) : false
      if (!nameMatch && !noteMatch) return false
    }

    if (genderFilter.value !== 'all' && pet.gender !== genderFilter.value) return false
    if (onlyShiny.value && !pet.shiny) return false
    if (personalityMode.value === 'personality' && personalityFilter.value && pet.personality !== personalityFilter.value) return false
    if (personalityMode.value === 'buff' && buffFilter.value && petBuff(pet.personality) !== buffFilter.value) return false
    if (bodyFilter.value && pet.medals?.body !== bodyFilter.value) return false
    if (voiceFilter.value && pet.medals?.voice !== voiceFilter.value) return false
    return true
  })
})

function resetFilters() {
  searchKeyword.value = ''
  genderFilter.value = 'all'
  onlyShiny.value = false
  personalityFilter.value = ''
  buffFilter.value = ''
  bodyFilter.value = ''
  voiceFilter.value = ''
}

let uidCounter = Date.now()
function genUid() {
  return 'p' + (uidCounter++)
}

// 添加
function onConfirm(list) {
  list.forEach((p) => (p.uid = genUid()))
  store.inventory.push(...list)
  lastAdded.value = JSON.parse(JSON.stringify(list))
  lastAddedUids.value = list.map((p) => p.uid)
}

// 上次录入
const lastAdded = ref([])
const lastAddedUids = ref([])
const lastAddedVisible = ref(false)
const lastAddedDirty = ref(false)
const lastEditIndex = ref(-1)
const lastEditForm = reactive({ gender: 'male', shiny: false, personality: '', medals: { body: '', voice: '' }, note: '' })
const lastEditSpecies = ref(null)
function genderRestriction(pet) {
  const tags = Array.isArray(pet?.special_tags) ? pet.special_tags : []
  if (tags.some((t) => String(t) === '1001')) return 'male'
  if (tags.some((t) => String(t) === '1002')) return 'female'
  return null
}

function openLastAdded() {
  if (!lastAdded.value.length) { showAlert('暂无上次录入记录'); return }
  lastAddedVisible.value = true
  lastAddedDirty.value = false
  lastEditIndex.value = -1
}
function removeLastAdded(i) {
  lastAdded.value.splice(i, 1)
  lastAddedDirty.value = true
  if (lastEditIndex.value === i) lastEditIndex.value = -1
  else if (lastEditIndex.value > i) lastEditIndex.value--
}
function editLastAdded(i) {
  const p = lastAdded.value[i]
  lastEditIndex.value = i
  lastEditSpecies.value = petsData.find((sp) => sp.id === p.id) || null
  lastEditForm.gender = p.gender
  lastEditForm.shiny = !!p.shiny
  lastEditForm.personality = p.personality || ''
  lastEditForm.medals = { body: p.medals?.body || '', voice: p.medals?.voice || '' }
  lastEditForm.note = p.note || ''
}
function saveLastEdit() {
  const i = lastEditIndex.value
  if (i < 0) return
  const p = lastAdded.value[i]
  lastAdded.value[i] = { ...p, gender: lastEditForm.gender, shiny: lastEditForm.shiny, personality: lastEditForm.personality || null, medals: { body: lastEditForm.medals.body || null, voice: lastEditForm.medals.voice || null }, note: lastEditForm.note || null }
  lastAddedDirty.value = true
  lastEditIndex.value = -1
}
function confirmLastAdded() {
  const oldUids = new Set(lastAddedUids.value)
  store.inventory = store.inventory.filter((p) => !oldUids.has(p.uid))
  store.inventory.push(...lastAdded.value)
  lastAddedUids.value = lastAdded.value.map((p) => p.uid)
  lastAddedVisible.value = false
  lastAddedDirty.value = false
}
async function closeLastAdded() {
  if (lastAddedDirty.value) {
    const ok = await showConfirm('修改未保存，是否保存？')
    if (ok) confirmLastAdded()
    else { lastAddedVisible.value = false; lastAddedDirty.value = false }
  } else {
    lastAddedVisible.value = false
  }
}

// 编辑弹窗
function openEdit(pet) {
  editingPet.value = pet
  showEditModal.value = true
}
function hasKeyChange(a, b) {
  return a.gender !== b.gender ||
    a.id !== b.id ||
    JSON.stringify(a.eggGroups || []) !== JSON.stringify(b.eggGroups || []) ||
    !!a.shiny !== !!b.shiny ||
    (a.personality || '') !== (b.personality || '') ||
    (a.medals?.body || '') !== (b.medals?.body || '') ||
    (a.medals?.voice || '') !== (b.medals?.voice || '')
}
function planHasCommonGroup(pet) {
  const petGroups = (pet.eggGroups || []).filter((g) => g !== 1)
  return planState.planEntries.some((entry) =>
    (entry.eggGroups || []).some((g) => g !== 1 && petGroups.includes(g))
  )
}
async function onEditSave(updated) {
  const i = store.inventory.findIndex((x) => x.uid === updated.uid)
  if (i < 0) return
  const old = store.inventory[i]
  if (hasKeyChange(old, updated)) {
    if (isPetUsed(updated.uid)) {
      const ok = await showConfirm('该精灵正在被孵蛋配窝使用，修改关键信息会影响相关方案，是否仍要修改？')
      if (!ok) return
      removePetFromAllTabs(updated.uid)
    }
    if (planHasCommonGroup(updated)) {
      const ok = await showConfirm('修改该精灵可能会影响配窝计划，是否仍要修改？')
      if (!ok) return
      clearPlan()
    }
  }
  store.inventory[i] = updated
}
async function onEditRemove(pet) {
  // ★检测孵蛋界面是否有窗口使用了该精灵
  if (isPetUsed(pet.uid)) {
    const ok = await showConfirm('该精灵正在被孵蛋配窝使用，如果删除会影响相关方案，是否仍要删除？')
    if (!ok) return
    removePetFromAllTabs(pet.uid)
  }
  // ★检测配窝计划：存在共同蛋组的目标精灵才提示
  if (planHasCommonGroup(pet)) {
    const ok = await showConfirm('删除该精灵可能会影响配窝计划，是否仍要删除？')
    if (!ok) return
    clearPlan()
  }
  const i = store.inventory.findIndex((x) => x.uid === pet.uid)
  if (i > -1) store.inventory.splice(i, 1)
}


// 清空仓库
async function confirmClear() {
  if (!store.inventory.length) {
    await showAlert('仓库已经是空的')
    return
  }
  const ok = await showConfirm(`确定要清空仓库吗？共 ${store.inventory.length} 只精灵，此操作不可恢复，同时也会清空孵蛋界面的所有配窝方案和孵蛋计划。`)
  if (!ok) return
  store.inventory = []
  resetFilters()
  clearAllTabs() // ★联动：清空孵蛋界面所有窗口的方案
  if (planState.planEntries.length) {
    clearPlan()
    await showAlert('仓库已清空，孵蛋计划已清空。')
  }
}


// 导出
function toExportFormat() {
  return {
    nestCount: store.nestCount,
    inventory: store.inventory.map((pet) => ({
      id: pet.id,
      name: pet.name,
      egg_groups: (pet.eggGroups || []).map((id) => defines.egg_groups[String(id)] || String(id)),
      gender: pet.gender,
      shiny: !!pet.shiny,
      personality: pet.personality || null,
      medals: {
        body: pet.medals?.body || null,
        voice: pet.medals?.voice || null,
      },
      note: pet.note || null,
    })),
    // ★新增：孵蛋界面所有窗口（窝数、筛选、雌性、推荐雄性、配对详情等）
    windows: JSON.parse(JSON.stringify(breedingState.tabs)),
    activeTabId: breedingState.activeTabId,
  }
}


function exportData() {
  const data = toExportFormat()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `用户精灵配置-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}


// 导入
function triggerImport() {
  fileInput.value.click()
}

function onImportFile(e) {
  const file = e.target.files[0]
  e.target.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      importData(JSON.parse(reader.result))
    } catch (err) {
      showAlert('导入失败：文件格式错误')
    }
  }
  reader.readAsText(file)
}

async function importData(data) {
  const idMap = {}
  Object.keys(defines.egg_groups).forEach((id) => {
    idMap[defines.egg_groups[id]] = Number(id)
  })

  const inventory = (data.inventory || []).map((item) => ({
    id: item.id,
    name: item.name,
    eggGroups: (item.egg_groups || []).map((name) => idMap[name]).filter((v) => v !== undefined),
    gender: item.gender === 'female' ? 'female' : 'male',
    shiny: !!item.shiny,
    personality: item.personality || null,
    medals: {
      body: item.medals?.body || null,
      voice: item.medals?.voice || null,
    },
    note: item.note || null,
    uid: genUid(),
  }))

  store.nestCount = data.nestCount ?? 10
  store.inventory = inventory

  // ★导入覆盖孵蛋界面所有窗口（旧文件无 windows 字段时不动窗口，保持兼容）
  if (Array.isArray(data.windows)) {
    replaceTabs(data.windows, data.activeTabId)
  }
  if (planState.planEntries.length) {
    clearPlan()
    await showAlert('导入完成，配窝计划已清空。')
  }
}


function genderLabel(g) {
  return g === 'male' ? '♂ 雄' : '♀ 雌'
}
function eggGroupNames(groups) {
  const list = Array.isArray(groups) ? groups : []
  if (!list.length) return '未知组'
  return list.map((id) => defines.egg_groups[String(id)] || '未知组').join(' / ')
}
function bodyIcon(id) {
  const m = bodyMedals.find((x) => x.id === id)
  return m ? `${m.icon}${m.name}` : id
}
function voiceIcon(id) {
  const m = voiceMedals.find((x) => x.id === id)
  return m ? `${m.icon}${m.name}` : id
}
</script>

<style scoped>
.mode-switch-small { display: inline-flex; gap: 4px; }
.mode-switch-small button { padding: 5px 12px; border: 1px solid rgba(255,255,255,.3); border-radius: 8px; background: rgba(255,255,255,.1); color: rgba(255,255,255,.85); cursor: pointer; font-size: 12px; }
.mode-switch-small button.active { background: linear-gradient(135deg,#818cf8,#a78bfa); border-color: transparent; color: #fff; }
.storage {
  max-width: 1100px;
  margin: 0 auto;
}

h1 {
  margin-bottom: 20px;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.spacer {
  flex: 1;
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

.primary-btn:hover {
  transform: translateY(-2px);
}

.tool-btn {
  padding: 8px 18px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  cursor: pointer;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
}

.tool-btn:hover {
  border-color: #c4b5fd;
  color: #fff;
}

/* 新增：清空按钮危险样式 */
.tool-btn.danger {
  border-color: rgba(252, 165, 165, 0.6);
  color: #fecaca;
}

.tool-btn.danger:hover {
  border-color: #fca5a5;
  background: rgba(252, 165, 165, 0.15);
  color: #fff;
}

.filter-panel {
  isolation: isolate;
  background: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 14px;
  padding: 16px 20px;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.28);
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.f-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.f-label {
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  min-width: 200px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 14px;
  outline: none;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.gender-btns {
  display: flex;
  gap: 6px;
}

.g-btn {
  padding: 6px 14px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  cursor: pointer;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
}

.g-btn.active {
  background: linear-gradient(135deg, #818cf8, #a78bfa);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 4px 14px rgba(129, 140, 248, 0.5);
}

.shiny-btn {
  padding: 6px 14px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  cursor: pointer;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
}

.shiny-btn.on {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 4px 14px rgba(251, 191, 36, 0.5);
}

.select {
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  color-scheme: dark;
}

.select option {
  background: #3b2f6e;
  color: #fff;
}

.reset-btn {
  padding: 6px 14px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  cursor: pointer;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
}

.reset-btn:hover {
  border-color: #fca5a5;
  color: #fecaca;
}

.count {
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  margin-bottom: 12px;
}

.storage-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
}

.storage-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 14px;
  box-shadow: 0 8px 24px rgba(31, 38, 135, 0.22);
  text-align: center;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.storage-card:hover {
  box-shadow: 0 12px 32px rgba(31, 38, 135, 0.35);
  border-color: rgba(196, 181, 253, 0.5);
}

.card-tags {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.8);
}

.tag.shiny {
  background: rgba(251, 191, 36, 0.3);
  color: #fde68a;
}

.card-name {
  font-size: 16px;
  font-weight: bold;
  color: #fff;
}

.card-origin {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 2px;
}

.card-egg {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 4px;
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 8px;
}

.info-item {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
}

.empty {
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  padding: 60px 0;
  font-size: 15px;
}
.la-list { display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto; }
.la-item { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 8px 12px; border: 1px solid rgba(255,255,255,.18); border-radius: 8px; background: rgba(255,255,255,.08); color: #fff; font-size: 13px; }
.la-name { font-weight: bold; }
.la-tag { font-size: 12px; color: #93c5fd; }
.la-btn { padding: 4px 12px; border: 1px solid rgba(255,255,255,.3); border-radius: 6px; background: rgba(255,255,255,.1); color: #fff; cursor: pointer; font-size: 12px; }
.la-btn.danger { border-color: rgba(252,165,165,.5); color: #fca5a5; }
.la-edit { border: 1px solid rgba(196,181,253,.35); background: rgba(129,140,248,.15); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.la-edit h4 { margin: 0; color: #fff; }
.modal-mask { position: fixed; inset: 0; background: rgba(30,20,60,.55); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { width: 90%; max-width: 620px; max-height: 90vh; background: rgba(40,30,90,.9); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,.22); border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,.4); display: flex; flex-direction: column; overflow: hidden; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,.15); }
.modal-header h3 { margin: 0; color: #fff; }
.close-btn { border: none; background: none; font-size: 24px; cursor: pointer; color: rgba(255,255,255,.6); }
.modal-body { padding: 16px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
.modal-footer { display: flex; align-items: center; gap: 10px; padding: 14px 20px; border-top: 1px solid rgba(255,255,255,.15); justify-content: flex-end; }
.primary-btn { padding: 8px 18px; border: none; border-radius: 8px; background: linear-gradient(135deg,#818cf8,#a78bfa); color: #fff; cursor: pointer; font-size: 14px; }
.cancel-btn { padding: 8px 18px; border: 1px solid rgba(255,255,255,.3); border-radius: 8px; background: rgba(255,255,255,.1); cursor: pointer; font-size: 14px; color: rgba(255,255,255,.85); }
.note-input { width: 100%; padding: 7px 12px; border: 1px solid rgba(255,255,255,.3); border-radius: 8px; background: rgba(255,255,255,.12); color: #fff; font-size: 13px; outline: none; }
.block { background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.18); border-radius: 10px; padding: 12px 14px; }
.block-title { font-size: 12px; color: rgba(255,255,255,.6); margin-bottom: 10px; }
.gender-btns { display: flex; gap: 8px; }
.gender-btns button { padding: 6px 14px; border: 1px solid rgba(255,255,255,.3); border-radius: 8px; background: rgba(255,255,255,.1); color: rgba(255,255,255,.85); cursor: pointer; }
.gender-btns button.active { background: linear-gradient(135deg,#818cf8,#a78bfa); border-color: transparent; color: #fff; }
.edit-actions { display: flex; gap: 10px; justify-content: flex-end; }
</style>