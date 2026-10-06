<template>
  <teleport to="body">
    <div class="modal-mask" v-if="visible" @click.self="close">
      <div class="modal">
        <div class="modal-header">
          <h3>精灵详情</h3>
          <button class="close-btn" @click="close">×</button>
        </div>

        <div class="modal-body">
          <div class="pet-info">
            <div class="info-name">{{ displayName }}</div>
            <div class="info-origin" v-if="form.note">原名：{{ form.name }}</div>
            <div class="info-egg">{{ eggGroupNames }}</div>
          </div>

          <div class="edit-blocks">
            <div class="block">
              <div class="block-title">性别</div>
              <template v-if="!genderRestriction">
                <div class="gender-btns">
                  <button type="button" class="gender-option male" :class="{ active: form.gender === 'male' }"
                    @click="form.gender = 'male'">♂ 雄</button>
                  <button type="button" class="gender-option female" :class="{ active: form.gender === 'female' }"
                    @click="form.gender = 'female'">♀ 雌</button>
                </div>
              </template>
              <template v-else>
                <span class="gender-badge" :class="form.gender">
                  {{ form.gender === 'male' ? '♂ 只有雄性' : '♀ 只有雌性' }}
                </span>
              </template>
            </div>


            <div class="block" v-if="hasShinyForm">
              <div class="block-title">是否异色</div>
              <label class="shiny-switch">
                <input type="checkbox" v-model="form.shiny" />
                <span class="switch-track"><span class="switch-thumb"></span></span>
                <span class="switch-label">{{ form.shiny ? '异色' : '非异色' }}</span>
              </label>
            </div>

            <div class="block">
              <div class="block-title">性格</div>
              <PersonalityPicker v-model="form.personality" placeholder="点击选择性格" clearable />
            </div>

            <div class="block">
              <div class="block-title">身体奖牌</div>
              <select v-model="form.medals.body" class="select">
                <option value="">空</option>
                <option v-for="m in bodyMedals" :key="m.id" :value="m.id">{{ m.icon }} {{ m.name }}</option>
              </select>
            </div>

            <div class="block">
              <div class="block-title">声音奖牌</div>
              <select v-model="form.medals.voice" class="select">
                <option value="">空</option>
                <option v-for="m in voiceMedals" :key="m.id" :value="m.id">{{ m.icon }} {{ m.name }}</option>
              </select>
            </div>

            <div class="block block-full">
              <div class="block-title">备注</div>
              <input v-model="form.note" class="note-input" type="text" placeholder="填写备注（可选）" />
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="danger-btn" @click="remove">删除</button>
          <div class="spacer"></div>
          <button class="cancel-btn" @click="close">取消</button>
          <button class="primary-btn" @click="save">保存</button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { reactive, computed, watch } from 'vue'
import petsData from '../data/pets.json'
import defines from '../data/defines.json'
import medalsData from '../data/medals.json'
import PersonalityPicker from './PersonalityPicker.vue'
import { showConfirm } from '../store/dialog'

const visible = defineModel({ type: Boolean, default: false })
const props = defineProps({
  pet: { type: Object, default: null },
})
const emit = defineEmits(['save', 'remove'])

const bodyMedals = medalsData.body
const voiceMedals = medalsData.voice

const form = reactive({
  uid: '',
  id: null,
  name: '',
  eggGroups: [],
  gender: 'male',
  shiny: false,
  personality: '',
  medals: { body: '', voice: '' },
  note: '',
})

watch(
  () => props.pet,
  (pet) => {
    if (!pet) return
    form.uid = pet.uid
    form.id = pet.id
    form.name = pet.name
    form.eggGroups = Array.isArray(pet.eggGroups) ? pet.eggGroups : []
    form.gender = pet.gender || 'male'
    form.shiny = !!pet.shiny
    form.personality = pet.personality || ''
    form.medals = {
      body: pet.medals?.body || '',
      voice: pet.medals?.voice || '',
    }
    form.note = pet.note || ''
  },
  { immediate: true }
)

// 根据 id 查数据库，判断是否存在异色形态
const species = computed(() => petsData.find((p) => p.id === props.pet?.id))
const genderRestriction = computed(() => {
  const tags = Array.isArray(species.value?.special_tags) ? species.value.special_tags : []
  const has = (t) => tags.some((x) => String(x) === String(t))
  if (has(1001)) return 'male'
  if (has(1002)) return 'female'
  return null
})

const hasShinyForm = computed(() => species.value?.has_shiny != null)

const displayName = computed(() => form.note || form.name)
const eggGroupNames = computed(() => {
  const list = form.eggGroups || []
  if (!list.length) return '未知组'
  return list.map((id) => defines.egg_groups[String(id)] || '未知组').join(' / ')
})

function save() {
  emit('save', {
    uid: form.uid,
    id: form.id,
    name: form.name,
    eggGroups: [...form.eggGroups],
    gender: form.gender,
    shiny: hasShinyForm.value ? form.shiny : false,
    personality: form.personality || null,
    medals: {
      body: form.medals.body || null,
      voice: form.medals.voice || null,
    },
    note: form.note || null,
  })
  close()
}

async function remove() {
  const ok = await showConfirm('确定删除该精灵吗？')
  if (ok) {
    emit('remove', props.pet)
    close()
  }
}

function close() {
  visible.value = false
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
  max-width: 620px;
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
  gap: 16px;
}

.pet-info {
  text-align: center;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
}

.info-name {
  font-size: 20px;
  font-weight: bold;
  color: #fff;
}

.info-origin {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 2px;
}

.info-egg {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 6px;
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
}

.gender-option.female.active {
  background: linear-gradient(135deg, #f06292, #e91e63);
  border-color: transparent;
  color: #fff;
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

.modal-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
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

.danger-btn:hover {
  background: rgba(248, 113, 113, 0.32);
}
</style>
