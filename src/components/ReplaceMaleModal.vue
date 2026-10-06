<template>
  <teleport to="body">
    <div class="mask" v-if="visible" @click.self="close">
      <div class="box">
        <div class="head">
          <h3>替换雄性：<span class="hl">{{ male.name }}</span></h3>
          <button class="x" @click="close">×</button>
        </div>
        <div class="list" v-if="candidates.length">
          <button v-for="c in candidates" :key="c.uid" class="item" @click="replace(c)">
            <span class="c-name">{{ c.name }}</span>
            <span class="c-egg">{{ eggGroupsOf(c.id) }}</span>
            <span v-if="c.shiny" class="tag">✨异色</span>
            <span v-if="c.personality" class="tag pers">🎭{{ c.personality }}</span>
            <span v-if="c.medals?.body" class="tag">{{ bodyIcon(c.medals.body) }}</span>
            <span v-if="c.medals?.voice" class="tag">{{ voiceIcon(c.medals.voice) }}</span>
          </button>
        </div>
        <div v-else class="empty">没有可替换的雄性精灵</div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import defines from '../data/defines.json'
import medalsData from '../data/medals.json'

const visible = defineModel({ type: Boolean, default: false })
defineProps({
  male: { type: Object, required: true },
  candidates: { type: Array, default: () => [] },
})
const emit = defineEmits(['replace'])

const bodyMedals = medalsData.body
const voiceMedals = medalsData.voice

function eggGroupsOf(id) {
  // 由父组件传入 candidates 时已带 eggGroups 字段
  return ''
}
function bodyIcon(id) {
  const m = bodyMedals.find((x) => x.id === id)
  return m ? `${m.icon}${m.name}` : id
}
function voiceIcon(id) {
  const m = voiceMedals.find((x) => x.id === id)
  return m ? `${m.icon}${m.name}` : id
}
function replace(c) { emit('replace', c) }
function close() { visible.value = false }
</script>

<style scoped>
.mask { position: fixed; inset: 0; background: rgba(30,20,60,.55); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 1200; }
.box { width: 90%; max-width: 560px; max-height: 80vh; background: rgba(40,30,90,.92); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,.25); border-radius: 16px; padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 20px 60px rgba(0,0,0,.5); }
.head { display: flex; align-items: center; justify-content: space-between; color: #fff; }
.head h3 { margin: 0; font-size: 16px; }
.hl { color: #c4b5fd; }
.x { border: none; background: none; color: rgba(255,255,255,.6); font-size: 22px; cursor: pointer; }
.list { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; overflow-y: auto; max-height: 60vh; }
.item { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px; min-height: 110px; border: 1px solid rgba(255,255,255,.2); border-radius: 10px; background: rgba(255,255,255,.1); cursor: pointer; color: #fff; font-size: 12px; }
.item:hover { border-color: #c4b5fd; }
.c-name { font-weight: bold; font-size: 14px; }
.c-egg { font-size: 11px; color: rgba(255,255,255,.6); background: rgba(255,255,255,.1); padding: 1px 8px; border-radius: 4px; }
.tag { font-size: 11px; padding: 1px 8px; border-radius: 4px; background: rgba(147,197,253,.15); color: #93c5fd; }
.tag.pers { color: #c4b5fd; }
.empty { text-align: center; color: rgba(255,255,255,.6); padding: 30px 0; }
</style>
