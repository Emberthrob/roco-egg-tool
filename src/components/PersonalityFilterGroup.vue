<template>
  <div class="pfg">
    <div class="pfg-switch">
      <button type="button" :class="{ active: mode === 'personality' }" @click="mode = 'personality'">性格</button>
      <button type="button" :class="{ active: mode === 'buff' }" @click="mode = 'buff'">增益</button>
    </div>
    <PersonalityPicker v-if="mode === 'personality'" v-model="personality" :placeholder="placeholder" clearable />
    <select v-else v-model="buff" class="pfg-select">
      <option value="">{{ buffPlaceholder }}</option>
      <option v-for="b in buffOptions" :key="b" :value="b">{{ b }}</option>
    </select>
  </div>
</template>

<script setup>
import PersonalityPicker from './PersonalityPicker.vue'

defineProps({
  placeholder: { type: String, default: '全部' },
  buffPlaceholder: { type: String, default: '全部增益' },
})
const mode = defineModel('mode', { type: String, default: 'personality' })
const personality = defineModel('personality', { type: String, default: '' })
const buff = defineModel('buff', { type: String, default: '' })
const buffOptions = ['生命', '物攻', '魔攻', '物防', '魔防', '速度']
</script>

<style scoped>
.pfg { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.pfg-switch { display: inline-flex; gap: 4px; }
.pfg-switch button { padding: 5px 12px; border: 1px solid rgba(255,255,255,.3); border-radius: 8px; background: rgba(255,255,255,.1); color: rgba(255,255,255,.85); cursor: pointer; font-size: 12px; }
.pfg-switch button.active { background: linear-gradient(135deg,#818cf8,#a78bfa); border-color: transparent; color: #fff; }
.pfg-select { padding: 6px 10px; border: 1px solid rgba(255,255,255,.3); border-radius: 8px; background: rgba(255,255,255,.12); color: #fff; font-size: 13px; outline: none; color-scheme: dark; }
.pfg-select option { background: #3b2f6e; color: #fff; }
</style>
