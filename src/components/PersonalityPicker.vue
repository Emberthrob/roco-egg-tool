<template>
  <div class="personality-picker">
    <button
      type="button"
      class="picker-trigger"
      :class="{ 'has-value': modelValue, 'is-placeholder': !modelValue }"
      @click="open = true"
    >
      <span v-if="modelValue" class="trigger-text">
        {{ selectedItem?.name }}
        <em class="trigger-detail">
          <span class="up">+{{ selectedItem?.buff }}</span>
          <span class="down">-{{ selectedItem?.decrease }}</span>
        </em>
      </span>
      <span v-else class="trigger-placeholder">{{ placeholder }}</span>
      <span class="trigger-arrow">▾</span>
    </button>

    <teleport to="body">
      <div class="pp-mask" v-if="open" @click.self="close">
        <div class="pp-box">
          <div class="pp-header">
            <span class="pp-title">选择性格</span>
            <select v-model="buffFilter" class="pp-filter">
              <option value="">全部增益</option>
              <option v-for="(list, buff) in personalities" :key="buff" :value="buff">
                {{ buff }}增益
              </option>
            </select>
            <button v-if="clearable" type="button" class="pp-clear" @click="clear">清空</button>
            <button type="button" class="pp-close" @click="close">×</button>
          </div>

          <div class="pp-search-row">
            <input v-model="searchText" class="pp-search" placeholder="搜索性格" />
          </div>
          <div class="pp-grid">
            <button
              v-for="item in filtered"
              :key="item.name"
              type="button"
              class="pp-item"
              :class="{ active: modelValue === item.name }"
              @click="pick(item.name)"
            >
              <span class="pp-name">{{ item.name }}</span>
              <span class="pp-detail">
                <b class="pp-buff">+{{ item.buff }}</b>
                <b class="pp-decrease">-{{ item.decrease }}</b>
              </span>
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import personalitiesData from '../data/personalities.json'

const props = defineProps({
  placeholder: { type: String, default: '点击选择性格' },
  clearable: { type: Boolean, default: false },
})

// 双向绑定当前选中的性格名字（空字符串 = 未选）
const modelValue = defineModel({ type: String, default: '' })

const personalities = personalitiesData
const open = ref(false)
const buffFilter = ref('')
const searchText = ref('')

// 扁平化所有性格
const allItems = computed(() => {
  const result = []
  Object.keys(personalities).forEach((buff) => {
    personalities[buff].forEach((p) => {
      result.push({ name: p.name, buff, decrease: p.decrease })
    })
  })
  return result
})

// 名字 -> 详情映射
const itemMap = computed(() => {
  const map = {}
  allItems.value.forEach((item) => {
    map[item.name] = item
  })
  return map
})

const selectedItem = computed(() =>
  modelValue.value ? itemMap.value[modelValue.value] : null
)

const filtered = computed(() => {
  let list = allItems.value
  if (buffFilter.value) list = list.filter((item) => item.buff === buffFilter.value)
  if (searchText.value) list = list.filter((item) => item.name.includes(searchText.value))
  return list
})

function pick(name) {
  modelValue.value = name
  close()
}
function clear() {
  modelValue.value = ''
  searchText.value = ''
  close()
}
function close() {
  open.value = false
}
</script>

<style scoped>
.personality-picker {
  display: inline-block;
}
.picker-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  cursor: pointer;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  transition: all 0.15s;
}
.picker-trigger:hover {
  border-color: #c4b5fd;
}
.picker-trigger.has-value {
  border-color: #c4b5fd;
}
.picker-trigger.is-placeholder {
  color: rgba(255, 255, 255, 0.6);
}
.trigger-text {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: bold;
}
.trigger-detail {
  font-style: normal;
  font-weight: normal;
  font-size: 12px;
}
.trigger-detail .up {
  color: #6ee7b7;
}
.trigger-detail .down {
  color: #fca5a5;
}
.trigger-placeholder {
  color: rgba(255, 255, 255, 0.6);
}
.trigger-arrow {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}

.pp-mask {
  position: fixed;
  inset: 0;
  background: rgba(30, 20, 60, 0.55);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.pp-box {
  width: 500px;
  max-width: 94vw;
  max-height: 80vh;
  background: rgba(40, 30, 90, 0.9);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
}
.pp-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.pp-title {
  font-weight: bold;
  color: #fff;
  white-space: nowrap;
}
.pp-filter {
  flex: 1;
  padding: 7px 10px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  color-scheme: dark;
}
.pp-filter option {
  background: #3b2f6e;
  color: #fff;
}
.pp-clear {
  border: 1px solid rgba(252, 165, 165, 0.5);
  background: rgba(248, 113, 113, 0.2);
  color: #fecaca;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
}
.pp-close {
  border: none;
  background: none;
  font-size: 22px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1;
}
.pp-search-row { margin-bottom: 10px; }
.pp-search { width: 100%; padding: 7px 10px; border: 1px solid rgba(255,255,255,.3); border-radius: 6px; background: rgba(255,255,255,.12); color: #fff; font-size: 13px; outline: none; }
.pp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
  overflow-y: auto;
}
.pp-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all 0.15s;
}
.pp-item:hover {
  border-color: #c4b5fd;
}
.pp-item.active {
  background: linear-gradient(135deg, #818cf8, #a78bfa);
  border-color: transparent;
}
.pp-name {
  font-size: 14px;
  font-weight: bold;
  color: #fff;
}
.pp-detail {
  font-size: 12px;
}
.pp-buff {
  color: #6ee7b7;
}
.pp-decrease {
  color: #fca5a5;
}
.pp-item.active .pp-buff,
.pp-item.active .pp-decrease {
  color: #fff;
}

</style>
