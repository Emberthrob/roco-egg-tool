<template>
  <div class="pet-dex">
    <h1>精灵大全</h1>

    <!-- 筛选区 -->
    <div class="filters">
      <!-- 第一行：蛋组筛选（最多选2个） -->
      <div class="filter-row">
        <span class="filter-label">蛋组</span>
        <div class="egg-group-list">
          <button v-for="(name, id) in eggGroups" :key="id" type="button" class="egg-group-btn"
            :class="{ active: selectedEggGroups.includes(id) }" @click="toggleEggGroup(id)">
            {{ name }}
          </button>
        </div>
      </div>

      <!-- 第二行：筛选模式 -->
      <div class="filter-row">
        <span class="filter-label">模式</span>
        <div class="mode-list">
          <button type="button" class="mode-btn" :class="{ active: mode === 'union' }"
            @click="mode = 'union'">并集（含任一蛋组）</button>
          <button type="button" class="mode-btn" :class="{ active: mode === 'intersect' }"
            @click="mode = 'intersect'">交集（同时含两个蛋组）</button>
        </div>
      </div>

      <!-- 第三行：搜索 + 异色赛季 + 操作按钮 -->
      <div class="filter-row">
        <span class="filter-label">搜索</span>
        <input class="search-input" v-model="search" type="text" placeholder="输入精灵名字搜索" />
        <SeasonSelect v-model="selectedSeasons" :seasons="seasons" />
        <button type="button" class="action-btn" :class="{ active: onlyFirstStage }"
          @click="onlyFirstStage = !onlyFirstStage">只显示一阶段</button>
        <button type="button" class="action-btn" :class="{ active: onlyOwned }" @click="onlyOwned = !onlyOwned">已拥有</button>
        <button type="button" class="action-btn reset-btn" @click="resetFilters">重置</button>
      </div>
    </div>

    <!-- 结果计数 -->
    <p class="result-count">共 {{ filteredPets.length }} 只精灵</p>

    <!-- 结果网格 -->
    <div class="result-grid" v-if="filteredPets.length">
      <div class="pet-card" v-for="pet in filteredPets" :key="pet.id" :class="{ unknown: isUnknownGroup(pet) }" @click="!isUnknownGroup(pet) && openDetail(pet)">
        <!-- 右上角：特殊词条 / 不可生育 -->
        <div class="corner-tags">
          <span v-for="tagId in pet.special_tags" :key="tagId" class="corner-tag special">{{ specialTags[tagId]
            }}</span>
          <span v-if="isUnknownGroup(pet)" class="corner-tag no-breed">不可生育</span>
        </div>

        <div class="shiny-tag" v-if="pet.has_shiny" :style="seasonColorStyle(pet.has_shiny)">✨ {{
          seasons[String(pet.has_shiny)] }}</div>
        <div class="pet-name">{{ pet.name }}</div>
        <div class="pet-egg-groups">{{ eggGroupNames(pet.egg_groups) }}</div>
        <div class="pet-owned">拥有 {{ ownedCount[pet.id] || 0 }} 只</div>
      </div>
    </div>

    <!-- 空状态 -->
    <div class="empty" v-else>没有找到符合条件的精灵</div>

    <!-- 精灵详情弹窗 -->
    <teleport to="body">
      <div class="modal-mask" v-if="detailVisible" @click.self="closeDetail">
        <div class="modal">
          <div class="modal-header">
            <h3>{{ detailPet ? detailPet.name : '' }}（拥有 {{ detailList.length }} 只）</h3>
            <button class="close-btn" @click="closeDetail">×</button>
          </div>
          <div class="modal-body">
            <div class="detail-toolbar"><button class="primary-btn" @click="openAddForm">＋添加该精灵入库</button></div>
            <div class="detail-filters">
              <PersonalityPicker v-model="detailFilter.personality" placeholder="性格不限" clearable />
              <select v-model="detailFilter.body" class="select"><option value="">身体奖牌不限</option><option v-for="m in bodyMedals" :key="m.id" :value="m.id">{{ m.icon }} {{ m.name }}</option></select>
              <select v-model="detailFilter.voice" class="select"><option value="">声音奖牌不限</option><option v-for="m in voiceMedals" :key="m.id" :value="m.id">{{ m.icon }} {{ m.name }}</option></select>
              <select v-model="detailFilter.shiny" class="select"><option value="all">异色不限</option><option value="shiny">仅异色</option><option value="normal">仅非异色</option></select>
            </div>
            <div class="detail-list">
              <div v-for="p in detailList" :key="p.uid" class="detail-item">
                <span class="gender-badge" :class="p.gender">{{ p.gender === 'male' ? '♂ 雄' : '♀ 雌' }}</span>
                <span class="d-name">{{ p.note || p.name }}</span>
                <span v-if="p.shiny" class="d-shiny">✨异色</span>
                <span v-if="p.personality" class="d-pers">🎭{{ p.personality }} {{ personalityDetail(p.personality) }}</span>
                <span v-if="p.medals?.body" class="d-medal">{{ bodyIcon(p.medals.body) }}</span>
                <span v-if="p.medals?.voice" class="d-medal">{{ voiceIcon(p.medals.voice) }}</span>
              </div>
              <div v-if="!detailList.length" class="empty">仓库中没有该品种的精灵</div>
            </div>
            <div v-if="addFormVisible" class="add-form">
              <h4>添加 {{ detailPet?.name }} 入库</h4>
              <div class="block"><div class="block-title">性别</div>
                <template v-if="!genderRestriction(detailPet)">
                  <div class="gender-btns"><button :class="{ active: addForm.gender === 'male' }" @click="addForm.gender = 'male'">♂ 雄</button><button :class="{ active: addForm.gender === 'female' }" @click="addForm.gender = 'female'">♀ 雌</button></div>
                </template>
                <template v-else><span class="gender-badge" :class="addForm.gender">{{ addForm.gender === 'male' ? '♂ 只有雄性' : '♀ 只有雌性' }}</span></template>
              </div>
              <div class="block" v-if="detailPet?.has_shiny != null"><div class="block-title">异色</div><label><input type="checkbox" v-model="addForm.shiny" /> {{ addForm.shiny ? '异色' : '非异色' }}</label></div>
              <div class="block"><div class="block-title">性格</div><PersonalityPicker v-model="addForm.personality" placeholder="点击选择" clearable /></div>
              <div class="block"><div class="block-title">身体奖牌</div><select v-model="addForm.medals.body" class="select"><option value="">空</option><option v-for="m in bodyMedals" :key="m.id" :value="m.id">{{ m.icon }} {{ m.name }}</option></select></div>
              <div class="block"><div class="block-title">声音奖牌</div><select v-model="addForm.medals.voice" class="select"><option value="">空</option><option v-for="m in voiceMedals" :key="m.id" :value="m.id">{{ m.icon }} {{ m.name }}</option></select></div>
              <div class="block"><div class="block-title">备注</div><input v-model="addForm.note" class="note-input" placeholder="备注（可选）" /></div>
              <div class="edit-actions"><button class="primary-btn" @click="confirmAddToInventory">确认录入</button><button class="cancel-btn" @click="addFormVisible = false">取消</button></div>
            </div>
          </div>
        </div>
      </div>
    </teleport>

    <!-- 回到顶部 -->
    <button v-show="showBackTop" class="back-top" @click="scrollToTop">↑</button>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onActivated, onBeforeUnmount } from 'vue'
import petsData from '../data/pets.json'
import defines from '../data/defines.json'
import medalsData from '../data/medals.json'
import personalitiesData from '../data/personalities.json'
import SeasonSelect from '../components/SeasonSelect.vue'
import PersonalityPicker from '../components/PersonalityPicker.vue'
import { loadInventory, getEvolutionRoot } from '../utils/breeding'
import { showAlert } from '../store/dialog'

// ---------- 数据 ----------
const pets = petsData
const eggGroups = defines.egg_groups   // { "6": "动物组", ... }
const seasons = defines.season         // { "101": "S1 暗夜拾光", ... }
const specialTags = defines.special_tags // { "1001": "只有雄性", ... }
const bodyMedals = medalsData.body
const voiceMedals = medalsData.voice
const personalityMap = {}
Object.keys(personalitiesData).forEach((buff) => {
  personalitiesData[buff].forEach((p) => { personalityMap[p.name] = { buff, decrease: p.decrease } })
})
function personalityDetail(name) {
  const p = personalityMap[name]
  return p ? `+${p.buff}/-${p.decrease}` : ''
}
function bodyIcon(id) { const m = bodyMedals.find((x) => x.id === id); return m ? `${m.icon}${m.name}` : id }
function voiceIcon(id) { const m = voiceMedals.find((x) => x.id === id); return m ? `${m.icon}${m.name}` : id }
function genderRestriction(pet) {
  const tags = Array.isArray(pet?.special_tags) ? pet.special_tags : []
  if (tags.some((t) => String(t) === '1001')) return 'male'
  if (tags.some((t) => String(t) === '1002')) return 'female'
  return null
}
const seasonColors = defines.season_colors || {} // 赛季颜色映射


// ---------- 筛选状态 ----------
const selectedEggGroups = ref([])
const mode = ref('union')
const search = ref('')
const selectedSeasons = ref([])
const onlyFirstStage = ref(false)
const onlyOwned = ref(false)

// ---------- 蛋组选择（最多2个，选第3个时挤掉第1个） ----------
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

// ---------- 重置所有筛选条件 ----------
function resetFilters() {
  selectedEggGroups.value = []
  search.value = ''
  selectedSeasons.value = []
  onlyFirstStage.value = false
  onlyOwned.value = false
  mode.value = 'union' // 如需保留模式可删除这行
}

// ---------- 蛋组名称拼接 ----------
function eggGroupNames(groups) {
  const list = Array.isArray(groups) ? groups : []
  if (!list.length) return '未知组'
  return list.map((id) => eggGroups[id] || '未知组').join(' / ')
}

// ---------- 是否未知组（蛋组含 1，即不可生育） ----------
function isUnknownGroup(pet) {
  const groups = Array.isArray(pet.egg_groups) ? pet.egg_groups : []
  return groups.includes(1)
}
// 赛季标签颜色
function seasonColorStyle(seasonId) {
  const bg = seasonColors[String(seasonId)]
  return bg ? { background: bg } : {}
}

// ---------- 筛选后的结果 ----------
const filteredPets = computed(() => {
  let searchRoots = null
  if (search.value) {
    const matched = pets.filter((pet) => (pet.name || '').includes(search.value))
    searchRoots = new Set(matched.map((pet) => getEvolutionRoot(pet.id)))
  }
  return pets.filter((pet) => {
    // 0) 蛋组为空的精灵不显示
    const petGroups = Array.isArray(pet.egg_groups) ? pet.egg_groups : []
    if (!petGroups.length) return false

    if (searchRoots && !searchRoots.has(getEvolutionRoot(pet.id))) return false

    // 2) 蛋组筛选
    const len = selectedEggGroups.value.length
    if (len === 1) {
      if (!petGroups.includes(Number(selectedEggGroups.value[0]))) return false
    } else if (len === 2) {
      const [a, b] = selectedEggGroups.value.map(Number)
      if (mode.value === 'union') {
        if (!petGroups.includes(a) && !petGroups.includes(b)) return false
      } else {
        if (!(petGroups.includes(a) && petGroups.includes(b))) return false
      }
    }

    // 3) 异色赛季筛选（与蛋组筛选为交集关系）
    if (selectedSeasons.value.length) {
      if (!pet.has_shiny) return false
      if (!selectedSeasons.value.includes(String(pet.has_shiny))) return false
    }

    // 4) 只显示一阶段（evolves_from_id 为 null）
    if (onlyFirstStage.value && pet.evolves_from_id !== null) return false

    if (onlyOwned.value && !ownedCount.value[pet.id]) return false

    return true
  })
})

// ---------- 回到顶部 ----------
const showBackTop = ref(false)
function handleScroll() {
  showBackTop.value = window.scrollY > 300
}
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
onMounted(() => window.addEventListener('scroll', handleScroll))
onBeforeUnmount(() => window.removeEventListener('scroll', handleScroll))

// ===== 仓库拥有数 + 详情弹窗 =====
const inventory = ref([])
const ownedCount = computed(() => {
  const c = {}
  inventory.value.forEach((p) => { c[p.id] = (c[p.id] || 0) + 1 })
  return c
})
function refreshInventory() { inventory.value = loadInventory() }
onMounted(refreshInventory)
onActivated(refreshInventory)

const detailVisible = ref(false)
const detailPet = ref(null)
const detailFilter = reactive({ personality: '', body: '', voice: '', shiny: 'all' })
const addFormVisible = ref(false)
const addForm = reactive({ gender: 'male', shiny: false, personality: '', medals: { body: '', voice: '' }, note: '' })

const detailList = computed(() => {
  if (!detailPet.value) return []
  return inventory.value.filter((p) => p.id === detailPet.value.id).filter((p) => {
    if (detailFilter.personality && p.personality !== detailFilter.personality) return false
    if (detailFilter.body && p.medals?.body !== detailFilter.body) return false
    if (detailFilter.voice && p.medals?.voice !== detailFilter.voice) return false
    if (detailFilter.shiny === 'shiny' && !p.shiny) return false
    if (detailFilter.shiny === 'normal' && p.shiny) return false
    return true
  })
})

function openDetail(pet) {
  detailPet.value = pet
  detailFilter.personality = ''
  detailFilter.body = ''
  detailFilter.voice = ''
  detailFilter.shiny = 'all'
  addFormVisible.value = false
  detailVisible.value = true
}
function closeDetail() { detailVisible.value = false }
function openAddForm() {
  const restriction = genderRestriction(detailPet.value)
  addForm.gender = restriction || 'male'
  addForm.shiny = false
  addForm.personality = ''
  addForm.medals = { body: '', voice: '' }
  addForm.note = ''
  addFormVisible.value = true
}
function confirmAddToInventory() {
  const pet = detailPet.value
  if (!pet) return
  const data = JSON.parse(localStorage.getItem('roco-storage') || '{}')
  const store = { nestCount: data.nestCount ?? 10, inventory: data.inventory || [] }
  store.inventory.push({
    id: pet.id,
    name: pet.name,
    eggGroups: Array.isArray(pet.egg_groups) ? [...pet.egg_groups] : [],
    gender: addForm.gender,
    shiny: pet.has_shiny != null ? addForm.shiny : false,
    personality: addForm.personality || null,
    medals: { body: addForm.medals.body || null, voice: addForm.medals.voice || null },
    note: addForm.note || null,
    uid: 'p' + Date.now() + Math.floor(Math.random() * 1000),
  })
  localStorage.setItem('roco-storage', JSON.stringify(store))
  refreshInventory()
  addFormVisible.value = false
  showAlert('已录入仓库')
}
</script>

<style scoped>
.pet-dex {
  max-width: 1100px;
  margin: 0 auto;
}

h1 {
  margin-bottom: 20px;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.filters {
  isolation: isolate;
  position: relative;
  z-index: 20;
  background: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 14px;
  padding: 18px 20px;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.28);
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 20px;
}

.filter-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.filter-label {
  width: 48px;
  color: rgba(255, 255, 255, 0.75);
  font-size: 14px;
  flex-shrink: 0;
}

.egg-group-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.egg-group-btn {
  padding: 6px 14px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  cursor: pointer;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
}

.egg-group-btn.active {
  background: linear-gradient(135deg, #818cf8, #a78bfa);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 4px 14px rgba(129, 140, 248, 0.5);
}

.mode-list {
  display: flex;
  gap: 8px;
}

.mode-btn {
  padding: 6px 14px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  cursor: pointer;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
}

.mode-btn.active {
  background: linear-gradient(135deg, #34d399, #10b981);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 4px 14px rgba(52, 211, 153, 0.5);
}

.search-input {
  flex: 1;
  min-width: 180px;
  max-width: 320px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  font-size: 14px;
  color: #fff;
  outline: none;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.search-input:focus {
  border-color: #c4b5fd;
}

.action-btn {
  padding: 8px 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  cursor: pointer;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  transition: all 0.15s;
  white-space: nowrap;
}

.action-btn:hover {
  border-color: #c4b5fd;
  color: #fff;
}

.action-btn.active {
  background: linear-gradient(135deg, #818cf8, #a78bfa);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 4px 14px rgba(129, 140, 248, 0.5);
}

.reset-btn:hover {
  border-color: #fca5a5;
  color: #fecaca;
}

.result-count {
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  margin-bottom: 12px;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 14px;
}

.pet-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 110px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 14px;
  box-shadow: 0 8px 24px rgba(31, 38, 135, 0.22);
  text-align: center;
  transition: transform 0.15s, box-shadow 0.15s;
}

.pet-card.unknown { opacity: 0.5; cursor: not-allowed; }
.pet-card.unknown:hover { box-shadow: 0 8px 24px rgba(31, 38, 135, 0.22); }
.pet-card:hover {
  box-shadow: 0 12px 32px rgba(31, 38, 135, 0.35);
}

.corner-tags {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.corner-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}

.corner-tag.special {
  background: rgba(129, 140, 248, 0.3);
  color: #dbeafe;
}

.corner-tag.no-breed {
  background: rgba(248, 113, 113, 0.3);
  color: #fecaca;
}

.shiny-tag {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #fff;
  font-size: 12px;
  font-weight: bold;
  padding: 2px 10px;
  border-radius: 999px;
  margin-bottom: 8px;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}


.pet-name {
  font-size: 16px;
  font-weight: bold;
  color: #fff;
}

.pet-egg-groups {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 6px;
}

.empty {
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  padding: 60px 0;
  font-size: 15px;
}

.back-top {
  position: fixed;
  right: 30px;
  bottom: 40px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #818cf8, #a78bfa);
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(129, 140, 248, 0.5);
  z-index: 999;
  transition: transform 0.2s;
}

.back-top:hover {
  transform: scale(1.1);
}
.pet-owned { font-size: 12px; color: #fde68a; margin-top: 8px; font-weight: bold; }
.modal-mask { position: fixed; inset: 0; background: rgba(30,20,60,.55); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { width: 90%; max-width: 720px; max-height: 90vh; background: rgba(40,30,90,.9); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,.22); border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,.4); display: flex; flex-direction: column; overflow: hidden; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,.15); }
.modal-header h3 { margin: 0; color: #fff; }
.close-btn { border: none; background: none; font-size: 24px; cursor: pointer; color: rgba(255,255,255,.6); }
.modal-body { padding: 16px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
.primary-btn { padding: 8px 18px; border: none; border-radius: 8px; background: linear-gradient(135deg,#818cf8,#a78bfa); color: #fff; cursor: pointer; font-size: 14px; }
.cancel-btn { padding: 8px 18px; border: 1px solid rgba(255,255,255,.3); border-radius: 8px; background: rgba(255,255,255,.1); cursor: pointer; font-size: 14px; color: rgba(255,255,255,.85); }
.select { padding: 6px 10px; border: 1px solid rgba(255,255,255,.3); border-radius: 6px; background: rgba(255,255,255,.12); color: #fff; font-size: 13px; outline: none; color-scheme: dark; }
.select option { background: #3b2f6e; color: #fff; }
.note-input { width: 100%; padding: 7px 12px; border: 1px solid rgba(255,255,255,.3); border-radius: 8px; background: rgba(255,255,255,.12); color: #fff; font-size: 13px; outline: none; }
.detail-toolbar { display: flex; justify-content: flex-end; }
.detail-filters { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.detail-list { display: flex; flex-direction: column; gap: 8px; max-height: 260px; overflow-y: auto; }
.detail-item { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 8px 12px; border: 1px solid rgba(255,255,255,.18); border-radius: 8px; background: rgba(255,255,255,.08); color: #fff; font-size: 13px; }
.d-name { font-weight: bold; }
.d-shiny { color: #fde68a; background: rgba(251,191,36,.22); padding: 1px 8px; border-radius: 4px; }
.d-pers { color: #c4b5fd; }
.d-medal { color: #93c5fd; }
.gender-badge { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
.gender-badge.male { background: rgba(64,156,255,.28); color: #b8daff; }
.gender-badge.female { background: rgba(255,99,132,.28); color: #ffc2ce; }
.add-form { border: 1px solid rgba(196,181,253,.35); background: rgba(129,140,248,.15); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.add-form h4 { margin: 0; color: #fff; }
.block { background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.18); border-radius: 10px; padding: 12px 14px; }
.block-title { font-size: 12px; color: rgba(255,255,255,.6); margin-bottom: 10px; }
.gender-btns { display: flex; gap: 8px; }
.gender-btns button { padding: 6px 14px; border: 1px solid rgba(255,255,255,.3); border-radius: 8px; background: rgba(255,255,255,.1); color: rgba(255,255,255,.85); cursor: pointer; }
.gender-btns button.active { background: linear-gradient(135deg,#818cf8,#a78bfa); border-color: transparent; color: #fff; }
.edit-actions { display: flex; gap: 10px; justify-content: flex-end; }
</style>
