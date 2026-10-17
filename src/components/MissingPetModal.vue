<template>
  <teleport to="body">
    <div class="modal-mask" v-if="visible" @click.self="close">
      <div class="modal">
        <div class="modal-header">
          <h3>寻找可交配的{{ missingGender === 'female' ? '母本' : '父本' }}</h3>
          <button class="close-btn" @click="close">×</button>
        </div>

        <div class="modal-body">
          <!-- 目标特征建议 -->
          <div class="target-hint">
            <div class="hint-title">建议寻找拥有以下特征的精灵：</div>
            <div class="hint-feats">
              <span>性格:{{ target.personality || '不限' }}</span>
              <span>身体:{{ bodyName(target.medals?.body) }}</span>
              <span>声音:{{ voiceName(target.medals?.voice) }}</span>
            </div>
          </div>

          <!-- 搜索框 -->
          <div class="search-row">
            <span class="f-label">搜索</span>
            <input v-model="searchText" class="search-input" type="text" placeholder="搜索精灵种族名字" />
          </div>

          <!-- 可交配种族列表 -->
          <div class="race-list" v-if="!lockRace">
            <div v-if="compatibleRaces.length" class="race-grid">
              <button v-for="sp in compatibleRaces" :key="sp.id" type="button" class="race-item"
                :class="{ active: selected?.id === sp.id }" @click="selectRace(sp)">
                <span class="r-name">{{ sp.name }}</span>
                <span class="r-egg">{{ eggGroupNames(sp) }}</span>
              </button>
            </div>
            <div v-else class="empty">没有匹配的可交配精灵</div>
          </div>

          <!-- 填写信息 -->
          <div v-if="selected" class="edit-area">
            <div class="edit-title">填写「{{ selected.name }}」信息</div>
            <div class="block">
              <div class="block-title">性别（已锁定为{{ missingGender === 'female' ? '雌性' : '雄性' }}）</div>
              <span class="gender-badge" :class="missingGender">{{ missingGender === 'female' ? '♀ 雌' : '♂ 雄' }}</span>
            </div>
            <div class="block" v-if="selected.has_shiny != null">
              <div class="block-title">异色</div>
              <label><input type="checkbox" v-model="form.shiny" /> 异色</label>
            </div>
            <div class="block">
              <div class="block-title">性格（可选）</div>
              <PersonalityPicker v-model="form.personality" placeholder="点击选择性格" clearable />
            </div>
            <div class="block">
              <div class="block-title">身体奖牌</div>
              <select v-model="form.medals.body" class="select">
                <option value="">无</option>
                <option v-for="m in bodyMedals" :key="m.id" :value="m.id">{{ m.icon }} {{ m.name }}</option>
              </select>
            </div>
            <div class="block">
              <div class="block-title">声音奖牌</div>
              <select v-model="form.medals.voice" class="select">
                <option value="">无</option>
                <option v-for="m in voiceMedals" :key="m.id" :value="m.id">{{ m.icon }} {{ m.name }}</option>
              </select>
            </div>
            <div class="edit-actions">
              <button class="primary-btn" @click="confirmAdd">录入精灵</button>
              <button class="cancel-btn" @click="selected = null">取消</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import petsData from '../data/pets.json'
import defines from '../data/defines.json'
import medalsData from '../data/medals.json'
import PersonalityPicker from './PersonalityPicker.vue'
import { groupsCompatible, isBreedable, canBeGender, canReachTarget, shortestDistanceToTarget } from '../utils/hatchRoute'

const props = defineProps({
  visible: { type: Boolean, default: false },
  missingGender: { type: String, default: 'female' },
  missingRaceId: { type: [Number, String], default: null },
  otherParent: { type: Object, default: null },
  target: { type: Object, default: null },
  excludedRaceIds: { type: Array, default: () => [] },
  isConversion: { type: Boolean, default: false },
  lockRace: { type: Boolean, default: false },
})

const emit = defineEmits(['update:visible', 'add'])

const bodyMedals = medalsData.body
const voiceMedals = medalsData.voice

const searchText = ref('')
const selected = ref(null)
const form = ref({ shiny: false, personality: '', medals: { body: '', voice: '' } })

watch(() => props.visible, (v) => {
  if (v) {
    searchText.value = ''
    selected.value = null
    form.value = { shiny: false, personality: '', medals: { body: '', voice: '' } }
    if (props.lockRace && props.missingRaceId != null) {
      const sp = petsData.find((x) => x.id === props.missingRaceId)
      if (sp) selected.value = sp
    }
  }
})

// 其他亲本的蛋组（用于找可交配种族）
const otherGroups = computed(() => {
  const p = props.otherParent
  if (!p || !p.raceId) return []
  const sp = petsData.find((x) => x.id === p.raceId)
  return sp ? sp.egg_groups : []
})

const compatibleRaces = computed(() => {
  const kw = searchText.value.trim()
  const tGroups = props.target?.eggGroups || []
  const candidates = petsData.filter((sp) => {
    if (sp.id == null || !sp.name) return false
    if (!isBreedable(sp.egg_groups)) return false
    if (!groupsCompatible(sp.egg_groups, otherGroups.value)) return false
    if (!canBeGender(sp, props.missingGender)) return false
    if (props.missingGender === 'female' && !props.isConversion && props.otherParent && sp.id === props.otherParent.raceId) return false
    if (props.lockRace && props.missingRaceId != null && sp.id !== props.missingRaceId) return false
    if (props.excludedRaceIds && props.excludedRaceIds.includes(sp.id)) return false
    if (!props.lockRace && sp.evolves_from_id != null) return false
    if (props.missingGender === 'female' && tGroups.length && !canReachTarget(sp.id, tGroups)) return false
    if (kw && !sp.name.includes(kw)) return false
    return true
  })
  // 缺失母本：只显示离目标距离最短的种族
  if (props.missingGender === 'female' && tGroups.length) {
    let min = Infinity
    const dists = candidates.map((sp) => {
      const d = shortestDistanceToTarget(sp.id, tGroups)
      if (d < min) min = d
      return d
    })
    return candidates.filter((sp, i) => dists[i] === min)
  }
  return candidates
})

function selectRace(sp) {
  selected.value = sp
  form.value = { shiny: false, personality: '', medals: { body: '', voice: '' } }
}

function eggGroupNames(sp) {
  const g = Array.isArray(sp.egg_groups) ? sp.egg_groups : []
  if (!g.length) return '未知组'
  return g.map((id) => defines.egg_groups[String(id)] || String(id)).join('/')
}
function bodyName(id) { return bodyMedals.find((m) => m.id === id)?.name || '不限' }
function voiceName(id) { return voiceMedals.find((m) => m.id === id)?.name || '不限' }

function confirmAdd() {
  if (!selected.value) return
  const sp = selected.value
  emit('add', {
    id: sp.id,
    name: sp.name,
    eggGroups: Array.isArray(sp.egg_groups) ? [...sp.egg_groups] : [],
    gender: props.missingGender,
    shiny: sp.has_shiny != null ? form.value.shiny : false,
    personality: form.value.personality || null,
    medals: { body: form.value.medals.body || null, voice: form.value.medals.voice || null },
  })
  emit('update:visible', false)
}

function close() {
  emit('update:visible', false)
}
</script>

<style scoped>
.modal-mask {
  position: fixed; inset: 0; background: rgba(30, 20, 60, 0.55);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center; z-index: 2000;
}
.modal {
  width: 90%; max-width: 680px; max-height: 88vh;
  background: rgba(40, 30, 90, 0.95); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.22); border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  display: flex; flex-direction: column; overflow: hidden; color: #fff;
}
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,.12); }
.modal-header h3 { margin: 0; font-size: 16px; }
.close-btn { background: none; border: none; color: #fff; font-size: 22px; cursor: pointer; line-height: 1; }
.modal-body { padding: 16px 20px; overflow-y: auto; }

.target-hint { background: rgba(251,191,36,.12); border: 1px solid rgba(251,191,36,.3); border-radius: 10px; padding: 10px 14px; margin-bottom: 14px; }
.hint-title { font-size: 12px; color: #fde68a; margin-bottom: 6px; }
.hint-feats { display: flex; flex-wrap: wrap; gap: 10px; font-size: 13px; color: #fff; }

.search-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.f-label { font-size: 13px; color: rgba(255,255,255,.8); }
.search-input { flex: 1; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,.25); background: rgba(255,255,255,.1); color: #fff; outline: none; }

.race-list { max-height: 220px; overflow-y: auto; margin-bottom: 14px; }
.race-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; }
.race-item { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; border-radius: 8px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.16); color: #fff; cursor: pointer; font-size: 12px; text-align: left; }
.race-item.active { border-color: #c4b5fd; background: rgba(129,140,248,.2); }
.r-name { font-weight: bold; }
.r-egg { font-size: 11px; color: rgba(255,255,255,.6); }
.empty { padding: 20px; text-align: center; color: rgba(255,255,255,.5); }

.edit-area { border-top: 1px solid rgba(255,255,255,.14); padding-top: 12px; }
.edit-title { font-weight: bold; margin-bottom: 10px; }
.block { margin-bottom: 12px; }
.block-title { font-size: 12px; color: rgba(255,255,255,.7); margin-bottom: 6px; }
.gender-badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 13px; }
.gender-badge.female { background: rgba(244,114,182,.2); color: #f9a8d4; }
.gender-badge.male { background: rgba(96,165,250,.2); color: #93c5fd; }
.select { padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,.25); background: rgba(255,255,255,.1); color: #fff; outline: none; }
.edit-actions { display: flex; gap: 10px; }
.primary-btn { padding: 8px 18px; border: none; border-radius: 8px; background: linear-gradient(135deg,#818cf8,#a78bfa); color: #fff; cursor: pointer; font-size: 14px; }
.cancel-btn { padding: 8px 18px; border: 1px solid rgba(255,255,255,.3); border-radius: 8px; background: rgba(255,255,255,.1); color: rgba(255,255,255,.85); cursor: pointer; font-size: 14px; }
</style>
