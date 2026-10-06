<template>
  <teleport to="body">
    <div class="modal-mask" v-if="visible" @click.self="close">
      <div class="modal">
        <div class="modal-header">
          <div class="tabs">
            <button class="tab-btn" :class="{ active: mode === 'dex' }" @click="mode = 'dex'">精灵大全</button>
            <button class="tab-btn" :class="{ active: mode === 'inventory' }" @click="mode = 'inventory'">仓库</button>
          </div>
          <button class="close-btn" @click="close">×</button>
        </div>

        <div class="modal-body">
          <!-- 大全筛选 -->
          <div class="filters" v-if="mode === 'dex'">
            <div class="f-row">
              <span class="f-label">蛋组</span>
              <div class="egg-group-list">
                <button v-for="(name, id) in eggGroups" :key="id" type="button" class="egg-btn"
                  :class="{ active: selectedEggGroups.includes(Number(id)) }"
                  @click="toggleEggGroup(Number(id))">{{ name }}</button>
              </div>
            </div>
            <div class="f-row">
              <span class="f-label">异色赛季</span>
              <select v-model="selectedSeason" class="select">
                <option value="">全部</option>
                <option v-for="(name, id) in seasons" :key="id" :value="id">{{ name }}</option>
              </select>
              <span class="f-label">搜索</span>
              <input v-model="searchText" class="search-input" type="text" placeholder="搜索精灵名字" />
              <button class="reset-btn" @click="resetDex">重置</button>
            </div>
          </div>

          <!-- 仓库筛选 -->
          <div class="filters" v-else>
            <div class="f-row">
              <span class="f-label">性格</span>
              <PersonalityPicker v-model="invPersonality" placeholder="全部" clearable />
              <span class="f-label">身体奖牌</span>
              <select v-model="invBody" class="select">
                <option value="">空</option>
                <option v-for="m in bodyMedals" :key="m.id" :value="m.id">{{ m.icon }} {{ m.name }}</option>
              </select>
              <span class="f-label">声音奖牌</span>
              <select v-model="invVoice" class="select">
                <option value="">空</option>
                <option v-for="m in voiceMedals" :key="m.id" :value="m.id">{{ m.icon }} {{ m.name }}</option>
              </select>
            </div>
            <div class="f-row">
              <span class="f-label">搜索</span>
              <input v-model="invSearch" class="search-input" type="text" placeholder="搜索名字或备注" />
              <button class="reset-btn" @click="resetInv">重置</button>
            </div>
          </div>

          <!-- 结果 -->
          <div class="result-area">
            <div class="result-grid" v-if="results.length">
              <button v-for="item in results" :key="item.key" type="button" class="result-item"
                :class="{ used: item.used }" :disabled="item.used" @click="pick(item)">
                <span class="r-name">{{ item.displayName }}</span>
                <span v-if="item.origin" class="r-origin">原名:{{ item.origin }}</span>
                <span class="r-egg">{{ item.eggGroups }}</span>
                <span v-if="item.shiny" class="r-tag shiny">✨异色</span>
                <span v-if="item.personality" class="r-tag pers">🎭{{ item.personality }}<em>{{ personalityDetail(item.personality) }}</em></span>
                <span v-if="item.medals?.body" class="r-tag medal">{{ bodyIcon(item.medals.body) }}</span>
                <span v-if="item.medals?.voice" class="r-tag medal">{{ voiceIcon(item.medals.voice) }}</span>
                <span v-if="item.used" class="r-used">已添加</span>
              </button>
            </div>
            <div v-else class="empty">没有可选的雌性精灵</div>
          </div>

          <!-- 已添加雌性 -->
          <div class="added-area">
            <h4>已添加雌性（{{ females.length }}）</h4>
            <div class="added-list" v-if="females.length">
              <div v-for="(f, i) in females" :key="f.instanceId" class="added-item">
                <span class="added-name">{{ f.note || f.name }}</span>
                <span v-if="f.shiny" class="mini">✨</span>
                <span v-if="f.priority" class="mini prio">优先</span>
                <span v-if="f.useAcademy" class="mini aca">学院</span>
                <button class="del" @click="emit('remove', f)">删除</button>
              </div>
            </div>
            <div v-else class="empty-sm">尚未添加雌性</div>
          </div>
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
import personalitiesData from '../data/personalities.json'
import PersonalityPicker from './PersonalityPicker.vue'
import { loadInventory } from '../utils/breeding'

const visible = defineModel({ type: Boolean, default: false })
const props = defineProps({
  females: { type: Array, default: () => [] },
  occupiedUids: { type: Array, default: () => [] },
})
const emit = defineEmits(['pick', 'remove'])

const eggGroups = defines.egg_groups
const seasons = defines.season
const bodyMedals = medalsData.body
const voiceMedals = medalsData.voice

const mode = ref('dex')
const selectedEggGroups = ref([])
const selectedSeason = ref('')
const searchText = ref('')
const invPersonality = ref('')
const invBody = ref('')
const invVoice = ref('')
const invSearch = ref('')

const personalityMap = {}
Object.keys(personalitiesData).forEach((buff) => {
  personalitiesData[buff].forEach((p) => { personalityMap[p.name] = { buff, decrease: p.decrease } })
})

function personalityDetail(name) {
  const p = personalityMap[name]
  return p ? `+${p.buff}/-${p.decrease}` : ''
}
function bodyIcon(id) {
  const m = bodyMedals.find((x) => x.id === id)
  return m ? `${m.icon}${m.name}` : id
}
function voiceIcon(id) {
  const m = voiceMedals.find((x) => x.id === id)
  return m ? `${m.icon}${m.name}` : id
}
function eggGroupsOf(id) {
  const pet = petsData.find((p) => p.id === id)
  if (!pet || !pet.egg_groups || !pet.egg_groups.length) return '未知组'
  return pet.egg_groups.map((g) => eggGroups[String(g)] || g).join('/')
}
function isMaleOnly(pet) {
  const tags = Array.isArray(pet?.special_tags) ? pet.special_tags : []
  return tags.some((t) => String(t) === '1001')
}
function isBreedablePet(pet) {
  const g = pet.egg_groups || []
  return g.length > 0 && !g.includes(1)
}

function toggleEggGroup(id) {
  const i = selectedEggGroups.value.indexOf(id)
  if (i > -1) selectedEggGroups.value.splice(i, 1)
  else {
    if (selectedEggGroups.value.length >= 2) selectedEggGroups.value.shift()
    selectedEggGroups.value.push(id)
  }
}
function resetDex() {
  selectedEggGroups.value = []
  selectedSeason.value = ''
  searchText.value = ''
}
function resetInv() {
  invPersonality.value = ''
  invBody.value = ''
  invVoice.value = ''
  invSearch.value = ''
}

const results = computed(() => {
  if (mode.value === 'dex') {
    return petsData
      .filter((p) => !isMaleOnly(p) && isBreedablePet(p))
      .filter((p) => {
        const groups = p.egg_groups || []
        const len = selectedEggGroups.value.length
        if (len === 1 && !groups.includes(selectedEggGroups.value[0])) return false
        if (len === 2 && !(groups.includes(selectedEggGroups.value[0]) && groups.includes(selectedEggGroups.value[1]))) return false
        if (selectedSeason.value) {
          if (!p.has_shiny) return false
          if (String(p.has_shiny) !== selectedSeason.value) return false
        }
        if (searchText.value && !(p.name || '').includes(searchText.value)) return false
        return true
      })
      .map((p) => ({
        key: 'd-' + p.id,
        id: p.id,
        name: p.name,
        origin: null,
        displayName: p.name,
        eggGroups: eggGroupsOf(p.id),
        shiny: !!selectedSeason.value,
        personality: '',
        medals: { body: '', voice: '' },
        note: '',
        used: false,
      }))
  }
  return loadInventory()
    .filter((it) => it.gender === 'female')
    .filter((it) => {
      if (invPersonality.value && it.personality !== invPersonality.value) return false
      if (invBody.value && it.medals?.body !== invBody.value) return false
      if (invVoice.value && it.medals?.voice !== invVoice.value) return false
      if (invSearch.value) {
        const kw = invSearch.value
        if (!(it.name || '').includes(kw) && !(it.note || '').includes(kw)) return false
      }
      return true
    })
    .map((it) => ({
      key: 'i-' + it.uid,
      uid: it.uid,
      id: it.id,
      name: it.name,
      origin: it.note || null,
      displayName: it.note || it.name,
      eggGroups: eggGroupsOf(it.id),
      shiny: !!it.shiny,
      personality: it.personality || '',
      medals: it.medals || { body: '', voice: '' },
      note: it.note || '',
      used: props.occupiedUids.includes(it.uid),
    }))
})

function pick(item) {
  if (item.used) return
  const pet = petsData.find((p) => p.id === item.id)
  emit('pick', {
    uid: item.uid || null,
    id: item.id,
    name: item.name,
    eggGroups: pet?.egg_groups || [],
    shiny: item.shiny,
    personality: item.personality || '',
    medals: item.medals || { body: '', voice: '' },
    note: item.note || '',
  })
}
function close() {
  visible.value = false
}
</script>

<style scoped>
.modal-mask { position: fixed; inset: 0; background: rgba(30,20,60,.55); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 1100; }
.modal { width: 90%; max-width: 760px; max-height: 88vh; background: rgba(40,30,90,.9); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,.22); border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,.4); display: flex; flex-direction: column; overflow: hidden; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,.15); }
.tabs { display: flex; gap: 8px; }
.tab-btn { padding: 6px 16px; border: 1px solid rgba(255,255,255,.25); border-radius: 8px; background: rgba(255,255,255,.08); color: rgba(255,255,255,.8); cursor: pointer; font-size: 14px; }
.tab-btn.active { background: linear-gradient(135deg,#818cf8,#a78bfa); border-color: transparent; color: #fff; }
.close-btn { border: none; background: none; font-size: 24px; cursor: pointer; color: rgba(255,255,255,.6); }
.modal-body { padding: 14px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
.filters { background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.15); border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.f-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.f-label { color: rgba(255,255,255,.75); font-size: 13px; flex-shrink: 0; }
.egg-group-list { display: flex; flex-wrap: wrap; gap: 6px; }
.egg-btn { padding: 4px 10px; border: 1px solid rgba(255,255,255,.3); border-radius: 6px; background: rgba(255,255,255,.1); cursor: pointer; font-size: 12px; color: rgba(255,255,255,.85); }
.egg-btn.active { background: linear-gradient(135deg,#818cf8,#a78bfa); border-color: transparent; color: #fff; }
.select { padding: 6px 10px; border: 1px solid rgba(255,255,255,.3); border-radius: 6px; background: rgba(255,255,255,.12); color: #fff; font-size: 13px; outline: none; color-scheme: dark; }
.select option { background: #3b2f6e; color: #fff; }
.search-input { flex: 1; min-width: 140px; padding: 6px 10px; border: 1px solid rgba(255,255,255,.3); border-radius: 6px; background: rgba(255,255,255,.12); color: #fff; font-size: 13px; outline: none; }
.search-input::placeholder { color: rgba(255,255,255,.5); }
.reset-btn { padding: 6px 12px; border: 1px solid rgba(255,255,255,.3); border-radius: 6px; background: rgba(255,255,255,.12); cursor: pointer; font-size: 13px; color: rgba(255,255,255,.85); }

.result-area { max-height: 280px; overflow-y: auto; border: 1px solid rgba(255,255,255,.15); border-radius: 10px; padding: 8px; }
.result-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.result-item { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 8px; min-height: 130px; border: 1px solid rgba(255,255,255,.2); border-radius: 10px; background: rgba(255,255,255,.1); cursor: pointer; font-size: 12px; color: #fff; }
.result-item:hover { border-color: #c4b5fd; }
.result-item.used { opacity: .45; cursor: not-allowed; filter: grayscale(1); }
.r-name { font-weight: bold; font-size: 14px; }
.r-origin { font-size: 11px; color: rgba(255,255,255,.55); }
.r-egg { font-size: 11px; color: rgba(255,255,255,.6); background: rgba(255,255,255,.1); padding: 1px 8px; border-radius: 4px; }
.r-tag { font-size: 11px; padding: 1px 8px; border-radius: 4px; }
.r-tag.shiny { color: #fde68a; background: rgba(251,191,36,.22); }
.r-tag.pers { color: #c4b5fd; }
.r-tag.pers em { font-style: normal; font-size: 10px; color: rgba(255,255,255,.55); }
.r-tag.medal { color: #93c5fd; background: rgba(147,197,253,.15); }
.r-used { position: absolute; top: 6px; left: 6px; font-size: 10px; color: #6ee7b7; background: rgba(52,211,153,.2); padding: 1px 6px; border-radius: 4px; }

.added-area h4 { margin: 0 0 8px; color: #fff; font-size: 14px; }
.added-list { display: flex; flex-direction: column; gap: 6px; }
.added-item { display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.15); border-radius: 8px; color: #fff; font-size: 13px; }
.added-name { font-weight: bold; flex: 1; }
.mini { font-size: 11px; padding: 1px 6px; border-radius: 4px; }
.mini.prio { color: #fde68a; background: rgba(251,191,36,.2); }
.mini.aca { color: #6ee7b7; background: rgba(52,211,153,.2); }
.del { border: 1px solid rgba(252,165,165,.4); background: rgba(248,113,113,.15); color: #fca5a5; border-radius: 6px; padding: 3px 10px; cursor: pointer; font-size: 12px; }
.empty { text-align: center; color: rgba(255,255,255,.6); padding: 24px 0; font-size: 13px; }
.empty-sm { color: rgba(255,255,255,.5); font-size: 12px; }
</style>
