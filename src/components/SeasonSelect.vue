<template>
  <div class="season-select" ref="root">
    <button type="button" class="trigger" @click="open = !open">
      {{ selected.length ? `已选 ${selected.length} 个赛季` : '空' }}
      <span class="arrow" :class="{ up: open }">▾</span>
    </button>

    <div class="dropdown" v-if="open">
      <div class="dropdown-header">
        <button type="button" class="mini-btn" @click="selectAll">全选</button>
        <button type="button" class="mini-btn" @click="clearAll">全取消</button>
      </div>
      <label v-for="(name, id) in seasons" :key="id" class="option">
        <input type="checkbox" :value="id" v-model="selected" />
        <span>{{ name }}</span>
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  seasons: { type: Object, required: true },
})

// 用 defineModel 实现 v-model，selected 为字符串数组（如 ["101","102"]）
const selected = defineModel({ type: Array, default: () => [] })

const open = ref(false)
const root = ref(null)

function selectAll() {
  selected.value = Object.keys(props.seasons)
}
function clearAll() {
  selected.value = []
}

// 点击组件外部时关闭下拉
function handleClickOutside(e) {
  if (root.value && !root.value.contains(e.target)) {
    open.value = false
  }
}
onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))
</script>

<style scoped>
.season-select {
  position: relative;
  display: inline-block;
}
.trigger {
  min-width: 140px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  cursor: pointer;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
}
.trigger:hover {
  border-color: #c4b5fd;
}
.arrow {
  transition: transform 0.2s;
  color: rgba(255, 255, 255, 0.6);
}
.arrow.up {
  transform: rotate(180deg);
}

.dropdown {
  position: absolute;
  top: 42px;
  right: 0;
  z-index: 999;
  min-width: 200px;
  background: rgba(40, 30, 90, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  padding: 8px;
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  margin-bottom: 6px;
}
.mini-btn {
  border: none;
  background: rgba(129, 140, 248, 0.25);
  color: #c4b5fd;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}
.mini-btn:hover {
  background: rgba(129, 140, 248, 0.4);
}
.option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
}
.option:hover {
  background: rgba(255, 255, 255, 0.1);
}
.option input {
  cursor: pointer;
  accent-color: #818cf8;
}

</style>
