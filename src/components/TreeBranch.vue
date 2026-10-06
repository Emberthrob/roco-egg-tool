<template>
  <div class="tb">
    <div class="tb-node" :class="[node.type, node.role]" @click="$emit('click', node)">
      <div v-if="node.type === 'need'" class="tb-q">?</div>
      <div v-else class="tb-name" :title="node.name">{{ shortName(node.name) }}</div>
      <div v-if="node.pet" class="tb-feats">
        <span v-if="node.pet.personality">🎭{{ node.pet.personality }}</span>
        <span v-if="node.pet.medals?.body">{{ bodyIcon(node.pet.medals.body) }}</span>
        <span v-if="node.pet.medals?.voice">{{ voiceIcon(node.pet.medals.voice) }}</span>
      </div>
      <div v-if="node.type === 'need'" class="tb-egg">{{ eggGroupNames(node.eggGroups) }}</div>
      <div v-if="node.type === 'none'" class="tb-egg">{{ eggGroupNames(node.eggGroups) }}</div>
    </div>
    <div v-if="node.type === 'breed'" class="tb-children">
      <TreeBranch :node="node.male" @click="$emit('click', $event)" />
      <TreeBranch :node="node.female" @click="$emit('click', $event)" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import defines from '../data/defines.json'
import medalsData from '../data/medals.json'

const props = defineProps({ node: { type: Object, required: true } })
defineEmits(['click'])

const bodyMedals = medalsData.body
const voiceMedals = medalsData.voice

function shortName(n) {
  if (!n) return '?'
  return n.length > 5 ? n.slice(0, 5) + '…' : n
}
function bodyIcon(id) {
  const m = bodyMedals.find((x) => x.id === id)
  return m ? `${m.icon}${m.name}` : id
}
function voiceIcon(id) {
  const m = voiceMedals.find((x) => x.id === id)
  return m ? `${m.icon}${m.name}` : id
}
function eggGroupNames(groups) {
  const list = Array.isArray(groups) ? groups : []
  if (!list.length) return '未知组'
  return list.map((id) => defines.egg_groups[String(id)] || '未知组').join('/')
}
</script>

<style scoped>
.tb { display: flex; flex-direction: column; align-items: center; }
.tb-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 110px;
  max-width: 150px;
  padding: 8px 10px;
  border-radius: 10px;
  cursor: pointer;
  border: 2px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 12px;
  text-align: center;
  transition: all 0.15s;
}
.tb-node:hover { transform: translateY(-2px); }
/* 父本蓝 / 母本粉 */
.tb-node.male { border-color: #60a5fa; background: rgba(100, 181, 246, 0.15); }
.tb-node.female { border-color: #f472b6; background: rgba(244, 114, 182, 0.15); }
/* 子代黄 */
.tb-node.breed, .tb-node.target { border-color: #fbbf24; background: rgba(251, 191, 36, 0.15); }
/* 需抓取紫 */
.tb-node.need { border-color: #a78bfa; background: rgba(167, 139, 250, 0.18); }
.tb-node.none { border-color: rgba(248, 113, 113, 0.55); background: rgba(248, 113, 113, 0.14); }

.tb-q { font-size: 26px; font-weight: bold; line-height: 1.1; }
.tb-name { font-weight: bold; font-size: 13px; word-break: break-all; }
.tb-feats { display: flex; flex-direction: column; gap: 2px; font-size: 11px; color: rgba(255, 255, 255, 0.85); }
.tb-egg { font-size: 10px; color: rgba(255, 255, 255, 0.7); }

.tb-children {
  display: flex;
  gap: 36px;
  margin-top: 22px;
  position: relative;
  padding-top: 0;
}
.tb-children::before {
  content: '';
  position: absolute;
  top: -22px;
  left: 50%;
  width: 2px;
  height: 22px;
  background: rgba(255, 255, 255, 0.35);
  transform: translateX(-50%);
}
.tb-children > .tb::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 2px;
  height: 22px;
  background: rgba(255, 255, 255, 0.35);
}
</style>
