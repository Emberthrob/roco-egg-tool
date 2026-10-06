<template>
  <teleport to="body">
    <div class="modal-mask" v-if="visible" @click.self="close">
      <div class="modal">
        <div class="modal-header">
          <h3>添加精灵</h3>
          <button class="close-btn" @click="close">×</button>
        </div>

        <div class="modal-body">
          <!-- 筛选区 -->
          <div class="search-filters">
            <div class="f-row">
              <span class="f-label">蛋组</span>
              <div class="egg-group-list">
                <button v-for="(name, id) in eggGroups" :key="id" type="button" class="egg-btn"
                  :class="{ active: selectedEggGroups.includes(Number(id)) }" @click="toggleEggGroup(Number(id))">{{
                    name }}</button>
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
                :class="{ disabled: isUnknown(pet) }" :disabled="isUnknown(pet)" @click="startEdit(pet)">
                <span class="r-name">{{ pet.name }}</span>
                <span class="r-egg">{{ eggGroupNamesOf(pet) }}</span>
                <span v-if="isUnknown(pet)" class="no-hatch-tag">不可孵蛋</span>

              </button>
            </div>
            <div v-else class="empty">没有匹配的精灵</div>
          </div>

          <!-- 编辑区 -->
          <div class="edit-area" v-if="editing">
            <div class="edit-header">
              <h4>填写信息：<span class="pet-name">{{ editing.pet.name }}</span></h4>
              <button type="button" class="refill-btn" @click="resetEdit">重新填写</button>
            </div>

            <div class="edit-blocks">
              <div class="block">
                <div class="block-title">性别</div>
                <template v-if="!genderRestriction(editing.pet)">
                  <div class="gender-btns">
                    <button type="button" class="gender-option male" :class="{ active: editing.gender === 'male' }"
                      @click="editing.gender = 'male'">♂ 雄</button>
                    <button type="button" class="gender-option female" :class="{ active: editing.gender === 'female' }"
                      @click="editing.gender = 'female'">♀ 雌</button>
                  </div>
                </template>
                <template v-else>
                  <span class="gender-badge" :class="editing.gender">
                    {{ editing.gender === 'male' ? '♂ 只有雄性' : '♀ 只有雌性' }}
                  </span>
                </template>
              </div>


              <!-- 只有存在异色形态才显示 -->
              <div class="block" v-if="hasShiny(editing.pet)">
                <div class="block-title">是否异色</div>
                <label class="shiny-switch">
                  <input type="checkbox" v-model="editing.shiny" />
                  <span class="switch-track"><span class="switch-thumb"></span></span>
                  <span class="switch-label">{{ editing.shiny ? '异色' : '非异色' }}</span>
                </label>
              </div>

              <div class="block">
                <div class="block-title">性格</div>
                <PersonalityPicker v-model="editing.personality" placeholder="点击选择性格" clearable />
              </div>

              <div class="block">
                <div class="block-title">身体奖牌</div>
                <select v-model="editing.medals.body" class="select">
                  <option value="">空</option>
                  <option v-for="m in bodyMedals" :key="m.id" :value="m.id">{{ m.icon }} {{ m.name }}</option>
                </select>
              </div>

              <div class="block">
                <div class="block-title">声音奖牌</div>
                <select v-model="editing.medals.voice" class="select">
                  <option value="">空</option>
                  <option v-for="m in voiceMedals" :key="m.id" :value="m.id">{{ m.icon }} {{ m.name }}</option>
                </select>
              </div>

              <div class="block block-full">
                <div class="block-title">备注</div>
                <input v-model="editing.note" class="note-input" type="text" placeholder="填写备注（可选）" />
              </div>
            </div>

            <div class="edit-actions">
              <button class="primary-btn" @click="addToPending">
                {{ editing.pendingIndex !== null ? '保存修改' : '加入待录入' }}
              </button>
              <button class="cancel-btn" @click="editing = null">取消</button>
            </div>
          </div>

          <!-- 待录入区 -->
          <div class="pending-area">
            <h4>待录入（{{ pending.length }}）</h4>
            <div class="pending-list" v-if="pending.length">
              <div v-for="(item, i) in pending" :key="i" class="pending-item">
                <span class="p-name">{{ displayName(item) }}</span>
                <span v-if="item.note" class="p-tag origin">原名:{{ item.name }}</span>
                <span class="gender-badge" :class="item.gender">{{ genderLabel(item.gender) }}</span>
                <span v-if="item.shiny" class="p-tag shiny">✨异色</span>
                <span v-if="item.personality" class="p-tag">性格:{{ item.personality }}</span>
                <span v-if="item.medals.body" class="p-tag">{{ bodyIcon(item.medals.body) }}</span>
                <span v-if="item.medals.voice" class="p-tag">{{ voiceIcon(item.medals.voice) }}</span>
                <div class="p-actions">
                  <button @click="editPending(i)">修改</button>
                  <button @click="copyPending(i)">复制</button>
                  <button class="danger" @click="removePending(i)">删除</button>
                </div>
              </div>
            </div>
            <div v-else class="empty">还没有选择精灵</div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="cancel-btn" @click="close">取消</button>
          <button class="primary-btn" :disabled="!pending.length" @click="confirm">确认精灵</button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import petsData from '../data/pets.json'
import defines from '../data/defines.json'
import medalsData from '../data/medals.json'
import PersonalityPicker from './PersonalityPicker.vue'
import { getEvolutionRoot } from '../utils/breeding'

const visible = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['confirm'])

const pets = petsData
const eggGroups = defines.egg_groups
const seasons = defines.season
const bodyMedals = medalsData.body
const voiceMedals = medalsData.voice

const selectedEggGroups = ref([])
const selectedSeason = ref('')
const searchText = ref('')

const editing = ref(null)
const pending = ref([])

// ---------- 判断 ----------
function genderRestriction(pet) {
  const tags = Array.isArray(pet?.special_tags) ? pet.special_tags : []
  const has = (t) => tags.some((x) => String(x) === String(t))
  if (has(1001)) return 'male'
  if (has(1002)) return 'female'
  return null
}
function eggGroupNamesOf(pet) {
  const g = Array.isArray(pet.egg_groups) ? pet.egg_groups : []
  if (!g.length) return '未知组'
  return g.map((id) => eggGroups[String(id)] || String(id)).join('/')
}

function isUnknown(pet) {
  const groups = Array.isArray(pet.egg_groups) ? pet.egg_groups : []
  return groups.includes(1)
}
function hasShiny(pet) {
  return pet.has_shiny != null
}
// 备注优先显示，无备注显示原名
function displayName(item) {
  return item.note || item.name
}

function toggleEggGroup(id) {
  const index = selectedEggGroups.value.indexOf(id)
  if (index > -1) {
    selectedEggGroups.value.splice(index, 1)
  } else {
    if (selectedEggGroups.value.length >= 2) {
      selectedEggGroups.value.shift()
    }
    selectedEggGroups.value.push(id)
  }
}

function resetSearch() {
  selectedEggGroups.value = []
  selectedSeason.value = ''
  searchText.value = ''
}

const searchResults = computed(() => {
  const base = pets.filter((pet) => {
    const groups = Array.isArray(pet.egg_groups) ? pet.egg_groups : []
    if (!groups.length) return false

    const len = selectedEggGroups.value.length
    if (len === 1) {
      if (!groups.includes(selectedEggGroups.value[0])) return false
    } else if (len === 2) {
      const [a, b] = selectedEggGroups.value
      if (!(groups.includes(a) || groups.includes(b))) return false
    }

    if (selectedSeason.value) {
      if (!pet.has_shiny) return false
      if (String(pet.has_shiny) !== selectedSeason.value) return false
    }

    if (searchText.value && !(pet.name || '').includes(searchText.value)) return false
    return true
  })

  // 搜索时一并显示进化链的其他形态（去重）
  if (searchText.value && base.length) {
    const roots = new Set(base.map((pet) => getEvolutionRoot(pet.id)))
    const seen = new Set()
    const result = []
    pets.forEach((pet) => {
      const groups = Array.isArray(pet.egg_groups) ? pet.egg_groups : []
      if (!groups.length) return
      if (roots.has(getEvolutionRoot(pet.id)) && !seen.has(pet.id)) {
        seen.add(pet.id)
        result.push(pet)
      }
    })
    return result
  }
  return base
})

function startEdit(pet) {
  const restriction = genderRestriction(pet)
  editing.value = {
    pet,
    gender: restriction || 'male',
    shiny: false,
    personality: '',
    medals: { body: '', voice: '' },
    note: '',
    pendingIndex: null,
  }
}


function resetEdit() {
  if (!editing.value) return
  const pet = editing.value.pet
  const restriction = genderRestriction(pet)
  editing.value = {
    pet,
    gender: restriction || 'male',
    shiny: false,
    personality: '',
    medals: { body: '', voice: '' },
    note: '',
    pendingIndex: null,
  }
}


function editPending(index) {
  const item = pending.value[index]
  const petInfo = pets.find((p) => p.id === item.id)
  editing.value = {
    pet: petInfo || { id: item.id, name: item.name, egg_groups: item.eggGroups },
    gender: item.gender,
    shiny: item.shiny,
    personality: item.personality || '',
    medals: { body: item.medals?.body || '', voice: item.medals?.voice || '' },
    note: item.note || '',
    pendingIndex: index,
  }
}

function addToPending() {
  if (!editing.value) return
  const e = editing.value
  const item = {
    id: e.pet.id,
    name: e.pet.name,
    eggGroups: Array.isArray(e.pet.egg_groups) ? e.pet.egg_groups : [],
    gender: e.gender,
    shiny: hasShiny(e.pet) ? e.shiny : false,
    personality: e.personality || null,
    medals: { body: e.medals.body || null, voice: e.medals.voice || null },
    note: e.note || null,
  }
  if (e.pendingIndex !== null) {
    pending.value[e.pendingIndex] = item
  } else {
    pending.value.push(item)
  }
  editing.value = null
}

function copyPending(index) {
  pending.value.splice(index + 1, 0, JSON.parse(JSON.stringify(pending.value[index])))
}
function removePending(index) {
  pending.value.splice(index, 1)
}

function confirm() {
  emit('confirm', JSON.parse(JSON.stringify(pending.value)))
  pending.value = []
  close()
}
function close() {
  visible.value = false
  editing.value = null
}

function genderLabel(g) {
  return g === 'male' ? '♂ 雄' : '♀ 雌'
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
  max-width: 880px;
  max-height: 90vh;
  background: rgba(40, 30, 90, 0.85);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}

.modal-header h3 {
  margin: 0;
  color: #fff;
}

.close-btn {
  border: none;
  background: none;
  font-size: 24px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1;
}

.close-btn:hover {
  color: #fff;
}

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

.f-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.f-label {
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
  flex-shrink: 0;
}

.egg-group-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

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

.search-input {
  flex: 1;
  min-width: 160px;
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.reset-btn {
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.12);
  cursor: pointer;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
}

.reset-btn:hover {
  border-color: #fca5a5;
  color: #fecaca;
}

.result-area {
  max-height: 170px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  padding: 8px;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
}

.result-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
}

.result-item:hover {
  border-color: #c4b5fd;
  color: #fff;
}

.result-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  border-color: rgba(248, 113, 113, 0.3);
}

.result-item.disabled:hover {
  border-color: rgba(248, 113, 113, 0.3);
  color: rgba(255, 255, 255, 0.9);
}

.r-egg {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.1);
  padding: 1px 8px;
  border-radius: 4px;
}

.no-hatch-tag {
  font-size: 11px;
  color: #fca5a5;
}

.edit-area {
  border: 1px solid rgba(196, 181, 253, 0.35);
  background: rgba(129, 140, 248, 0.15);
  border-radius: 12px;
  padding: 14px;
}

.edit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.edit-header h4 {
  margin: 0;
  color: #fff;
}

.edit-header .pet-name {
  color: #c4b5fd;
}

.refill-btn {
  padding: 5px 12px;
  border: 1px solid rgba(252, 165, 165, 0.5);
  background: rgba(248, 113, 113, 0.2);
  color: #fecaca;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.refill-btn:hover {
  background: rgba(248, 113, 113, 0.3);
}

.edit-blocks {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
}

.block {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  padding: 12px 14px;
}

.block-full {
  grid-column: 1 / -1;
}

.block-title {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 1px;
  margin-bottom: 10px;
}

.gender-btns {
  display: flex;
  gap: 8px;
}

.gender-option {
  padding: 8px 18px;
  border: 2px solid rgba(255, 255, 255, 0.25);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.15s;
  color: rgba(255, 255, 255, 0.85);
}

.gender-option.male:hover {
  border-color: #64b5f6;
}

.gender-option.female:hover {
  border-color: #f48fb1;
}

.gender-option.male.active {
  background: linear-gradient(135deg, #42a5f5, #1e88e5);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 4px 14px rgba(66, 165, 245, 0.5);
}

.gender-option.female.active {
  background: linear-gradient(135deg, #f06292, #e91e63);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 4px 14px rgba(240, 98, 146, 0.5);
}

.shiny-switch {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.shiny-switch input {
  display: none;
}

.switch-track {
  width: 46px;
  height: 24px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.25);
  position: relative;
  transition: 0.2s;
  flex-shrink: 0;
}

.switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  transition: 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.shiny-switch input:checked+.switch-track {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
}

.shiny-switch input:checked+.switch-track .switch-thumb {
  left: 24px;
}

.switch-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
}

.note-input {
  width: 100%;
  padding: 7px 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 13px;
  outline: none;
}

.note-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.edit-actions {
  margin-top: 14px;
  display: flex;
  gap: 10px;
}

.pending-area h4 {
  margin: 0 0 8px;
  color: #fff;
}

.pending-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
  padding-right: 4px;
}

.pending-item {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
}

.p-name {
  font-weight: bold;
  color: #fff;
}

.p-tag {
  font-size: 12px;
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.85);
  padding: 2px 8px;
  border-radius: 4px;
}

.p-tag.shiny {
  background: rgba(251, 191, 36, 0.3);
  color: #fde68a;
}

.p-tag.origin {
  color: rgba(255, 255, 255, 0.6);
}

.p-actions {
  margin-left: auto;
  display: flex;
  gap: 6px;
}

.p-actions button {
  padding: 3px 10px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  font-size: 12px;
  color: #a5b4fc;
}

.p-actions button.danger {
  color: #fca5a5;
  border-color: rgba(252, 165, 165, 0.4);
}

.empty {
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  padding: 16px 0;
  font-size: 13px;
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

.primary-btn:disabled {
  background: rgba(255, 255, 255, 0.2);
  cursor: not-allowed;
  box-shadow: none;
}

.cancel-btn {
  padding: 8px 18px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
}
</style>
