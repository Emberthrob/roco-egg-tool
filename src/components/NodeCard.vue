<template>
  <div
    class="node"
    :class="[
      node.placeholder && !node.isUnknown && !node.isMissing && !node.featureUnknown ? 'node-ph' : '',
      target ? 'node-target' : '',
      node.isUnknown ? 'node-unknown' : '',
      (node.isMissing || node.featureUnknown) ? 'node-missing' : '',
      clickable && (node.isUnknown || node.isMissing || node.featureUnknown) && !node.pseudo ? 'clickable' : '',
    ]"
    @click="onClick"
  >
    <template v-if="node.isUnknown">
      <div class="node-q">?</div>
      <div class="node-q-tag">{{ missingLabel }}</div>
    </template>
    <template v-else-if="node.isMissing">
      <div class="node-name"><span class="node-g">{{ genderLabel }}</span>{{ node.name }}</div>
      <div class="node-missing-tag">{{ missingLabel }}</div>
    </template>
    <template v-else-if="node.featureUnknown">
      <div class="node-name"><span class="node-g">{{ genderLabel }}</span>{{ node.name }}</div>
      <div class="node-row">性格:?</div>
      <div class="node-row">身体:?</div>
      <div class="node-row">声音:?</div>
    </template>
    <template v-else>
      <div class="node-name">
        <span class="node-g">{{ genderLabel }}</span>
        {{ node.name }}
        <span v-if="node.direction" class="node-dir" :class="dirClass">{{ node.direction }}</span>
      </div>
      <div class="node-row" :class="featClass('personality')">性格:{{ featText('personality') }}</div>
      <div class="node-row" :class="featClass('body')">身体:{{ featText('body') }}</div>
      <div class="node-row" :class="featClass('voice')">声音:{{ featText('voice') }}</div>
      <div v-if="node.tag" class="node-tag">{{ node.tag }}</div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import medalsData from '../data/medals.json'

const props = defineProps({
  node: { type: Object, required: true },
  target: { type: Boolean, default: false },
  targetSpec: { type: Object, default: null },
  clickable: { type: Boolean, default: false },
})

const emit = defineEmits(['node-click'])

const bodyMedals = medalsData.body
const voiceMedals = medalsData.voice

const dirClass = computed(() => (props.node.direction ? 'dir-' + props.node.direction.toLowerCase() : ''))
const genderLabel = computed(() => (props.node.gender === 'male' ? '♂' : props.node.gender === 'female' ? '♀' : ''))
const bodyText = computed(() => {
  if (!props.node.body) return '无'
  const m = bodyMedals.find((x) => x.id === props.node.body)
  return m ? `${m.icon}${m.name}` : props.node.body
})
const voiceText = computed(() => {
  if (!props.node.voice) return '无'
  const m = voiceMedals.find((x) => x.id === props.node.voice)
  return m ? `${m.icon}${m.name}` : props.node.voice
})
const missingLabel = computed(() => {
  if (props.node.missingRole === 'mother') return '缺母本'
  if (props.node.missingRole === 'father') return '缺父本'
  return '缺精灵'
})

function featStatus(field) {
  return props.node.featStatus?.[field] || ''
}
function featClass(field) {
  if (props.node.isMiddleChild) {
    const st = featStatus(field)
    if (st === 'shared') return 'feat-green'
    if (st === 'inherit') return 'feat-yellow'
    return ''
  }
  if (!props.targetSpec) return ''
  if (field === 'personality' && props.targetSpec.personality && props.node.personality === props.targetSpec.personality) return 'feat-green'
  if (field === 'body' && props.targetSpec.medals?.body && props.node.body === props.targetSpec.medals.body) return 'feat-green'
  if (field === 'voice' && props.targetSpec.medals?.voice && props.node.voice === props.targetSpec.medals.voice) return 'feat-green'
  return ''
}
function featText(field) {
  if (props.node.isMiddleChild && featStatus(field) === 'noreq') return '无需求'
  if (field === 'personality') return props.node.personality || '不限'
  if (field === 'body') return bodyText.value
  if (field === 'voice') return voiceText.value
  return ''
}

function onClick() {
  if (props.clickable && (props.node.isUnknown || props.node.isMissing || props.node.featureUnknown) && !props.node.pseudo) emit('node-click', props.node)
}
</script>

<style scoped>
.node {
  width: 120px;
  height: 120px;
  padding: 8px 6px;
  border-radius: 10px;
  background: rgba(40, 30, 90, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.28);
  color: #fff;
  font-size: 11px;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
  box-sizing: border-box;
}
.node-ph { border-style: dashed; opacity: 0.75; }
.node-target { border-color: #6ee7b7; box-shadow: 0 0 0 2px rgba(110, 231, 183, 0.35); }
.node-unknown {
  background: rgba(251, 191, 36, 0.16);
  border: 2px dashed #fbbf24;
}
.node-missing {
  background: rgba(251, 191, 36, 0.16);
  border: 2px dashed #fbbf24;
}
.node-unknown.clickable, .node-missing.clickable { cursor: pointer; }
.node-unknown.clickable:hover, .node-missing.clickable:hover { background: rgba(251, 191, 36, 0.3); }
.node-q { font-size: 34px; font-weight: bold; color: #fbbf24; line-height: 1; }
.node-q-tag, .node-missing-tag { font-size: 10px; color: #fde68a; }
.node-missing-tag { margin-top: 4px; }
.node-name { font-weight: bold; font-size: 12px; line-height: 1.2; }
.node-g { opacity: 0.8; }
.node-dir {
  display: inline-block;
  margin-left: 3px;
  padding: 0 4px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
}
.dir-c { background: rgba(129, 140, 248, 0.4); color: #c7d2fe; }
.dir-m { background: rgba(251, 191, 36, 0.35); color: #fde68a; }
.dir-b { background: rgba(110, 231, 183, 0.35); color: #6ee7b7; }
.node-row { font-size: 10px; color: rgba(255, 255, 255, 0.85); }
.feat-green { color: #34d399; font-weight: bold; }
.feat-yellow { color: #fbbf24; }
.node-tag {
  font-size: 10px;
  color: #fca5a5;
  border-top: 1px dashed rgba(255, 255, 255, 0.2);
  padding-top: 3px;
  margin-top: 1px;
}
</style>
