<template>
  <div class="pc" :style="{ width: width + 'px', height: height + 'px' }">
    <svg class="pc-svg" :width="width" :height="height">
      <line v-for="(l, i) in linesWithCoords" :key="i" :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2" :class="'l-' + l.color" />
    </svg>
    <div v-for="n in nodes" :key="n.id" class="pc-node" :class="[n.type, n.role]" :style="nodePos(n)" @click="$emit('click', n)">
      <div v-if="n.filled" class="n-undo" @click.stop="$emit('undo', n)">撤销</div>
      <div v-if="n.type === 'need'" class="n-need-row">
        <span class="n-q">?</span>
        <span class="n-egg">{{ eggGroupNames(n.eggGroups) }}</span>
      </div>
      <div v-else class="n-name">{{ genderIcon(n) }}{{ shortName(n.name) }}</div>
      <div class="n-feats">
        <span v-if="req(n, 'personality')" :class="'feat ' + featCls(n)">🎭{{ req(n, 'personality') }}</span>
        <span v-if="req(n, 'body')" :class="'feat ' + featCls(n)">{{ bodyIcon(req(n, 'body')) }}</span>
        <span v-if="req(n, 'voice')" :class="'feat ' + featCls(n)">{{ voiceIcon(req(n, 'voice')) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import defines from '../data/defines.json'
import medalsData from '../data/medals.json'

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  lines: { type: Array, default: () => [] },
})
defineEmits(['click', 'undo'])

const bodyMedals = medalsData.body
const voiceMedals = medalsData.voice

const CELL_W = 140
const CELL_H = 112
const NODE = 88

const width = computed(() => {
  const maxX = props.nodes.reduce((m, n) => Math.max(m, n.x || 0), 0)
  return (maxX + 1) * CELL_W + 60
})
const height = computed(() => {
  const maxY = props.nodes.reduce((m, n) => Math.max(m, n.y || 0), 0)
  return (maxY + 1) * CELL_H + 40
})

function nodePos(n) {
  return { left: (n.x || 0) * CELL_W + (CELL_W - NODE) / 2 + 'px', top: (n.y || 0) * CELL_H + 'px', width: NODE + 'px', height: NODE + 'px' }
}
function center(n) {
  return { x: (n.x || 0) * CELL_W + (CELL_W - NODE) / 2 + NODE / 2, y: (n.y || 0) * CELL_H + NODE / 2 }
}
function lineCoords(l) {
  const a = props.nodes.find((n) => n.id === l.a)
  const b = props.nodes.find((n) => n.id === l.b)
  if (!a || !b) return { x1: 0, y1: 0, x2: 0, y2: 0 }
  const ca = center(a), cb = center(b)
  return { x1: ca.x, y1: ca.y + NODE / 2, x2: cb.x, y2: cb.y - NODE / 2 }
}

function genderIcon(n) {
  if (n.role === 'target') return '🎯'
  return n.gender === 'male' ? '♂' : '♀'
}
function shortName(name) {
  if (!name) return '?'
  return name.length > 5 ? name.slice(0, 5) + '…' : name
}
function req(n, f) {
  return n.requirements ? n.requirements[f] : ''
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
function featCls(n) {
  if (n.type === 'perfect' || n.type === 'target' || n.type === 'perfect-sub') return 'f-green'
  if (n.type === 'imperfect') return 'f-red'
  return 'f-yellow' // subtarget / need
}
const linesWithCoords = computed(() => props.lines.map((l) => ({ ...l, ...lineCoords(l) })))
</script>

<style scoped>
.pc { position: relative; }
.pc-svg { position: absolute; inset: 0; pointer-events: none; }
.pc-svg line { stroke-width: 2; }
.pc-svg .l-green { stroke: #34d399; }
.pc-svg .l-yellow { stroke: #fbbf24; }

.pc-node {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border-radius: 10px;
  cursor: pointer;
  border: 2px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 11px;
  text-align: center;
  box-sizing: border-box;
}
.pc-node.male { border-color: #60a5fa; background: rgba(100, 181, 246, 0.15); }
.pc-node.female { border-color: #f472b6; background: rgba(244, 114, 182, 0.15); }
.pc-node.target { border-color: #34d399; background: rgba(52, 211, 153, 0.16); }
.pc-node.subtarget { border-color: #fbbf24; background: rgba(251, 191, 36, 0.16); }
.pc-node.perfect-sub { border-color: #fbbf24; background: rgba(251, 191, 36, 0.16); }
.pc-node.need { border-color: #a78bfa; background: rgba(167, 139, 250, 0.18); }
.pc-node.imperfect { border-color: rgba(255, 255, 255, 0.4); background: rgba(255, 255, 255, 0.1); }

.n-q { font-size: 18px; font-weight: bold; line-height: 1; }
.n-need-row { display: flex; align-items: center; gap: 4px; }
.n-name { font-weight: bold; font-size: 12px; word-break: break-all; }
.n-feats { display: flex; flex-direction: column; gap: 2px; }
.feat { padding: 0 4px; border-radius: 3px; font-size: 10px; }
.f-green { color: #6ee7b7; }
.f-yellow { color: #fde68a; }
.f-red { color: #fca5a5; }
.n-egg { font-size: 8px; color: rgba(255, 255, 255, 0.7); }
.n-undo { position: absolute; top: -9px; right: -9px; padding: 1px 6px; border-radius: 6px; background: rgba(248,113,113,.9); color: #fff; font-size: 10px; cursor: pointer; z-index: 2; }
.pc-node { position: absolute; }
</style>
