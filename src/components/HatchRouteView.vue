<template>
  <div class="hatch-route">
    <div v-if="!route.solvable" class="hr-error">⚠️ {{ route.reason }}</div>

    <div v-else class="hr-wrap">
      <div class="hr-canvas" :style="{ width: layout.totalWidth + 'px', height: layout.totalHeight + 'px' }">
        <svg class="hr-svg" :width="layout.totalWidth" :height="layout.totalHeight">
          <line v-for="(ln, i) in lines" :key="i" :x1="ln.x1" :y1="ln.y1" :x2="ln.x2" :y2="ln.y2" :class="ln.cls" />
        </svg>

        <component
          v-for="item in layout.items"
          :key="item.block.id"
          :is="blockComponent(item.block.type)"
          :block="item.block"
          :x="item.x"
          :y="item.y"
          :target-spec="route.target"
          :added-uids="addedUids"
          :queue-mode="queueMode"
          :selected="isSelected(item.block.id)"
          @node-click="onNodeClick"
          @undo="onUndo"
          @queue-start="onQueueStart"
          @block-click="onBlockClick"
        />
      </div>

      <div v-if="route.notes && route.notes.length" class="hr-notes">
        <div v-for="(n, i) in route.notes" :key="i" class="hr-note-item">💡 {{ n }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import PropagateBlock from './PropagateBlock.vue'
import MergeBlock from './MergeBlock.vue'
import FinalBlock from './FinalBlock.vue'
import { buildRouteLayout } from '../utils/routeLayout'

const props = defineProps({
  route: { type: Object, required: true },
  addedUids: { type: Array, default: () => [] },
  queueMode: { type: Boolean, default: false },
  selectedIds: { type: Array, default: () => [] },
})
const emit = defineEmits(['node-click', 'undo', 'queue-start', 'block-click'])

const BLOCK_COMPONENTS = { propagate: PropagateBlock, merge: MergeBlock, final: FinalBlock }
function blockComponent(type) {
  return BLOCK_COMPONENTS[type] || FinalBlock
}

const layout = computed(() => buildRouteLayout(props.route.blocks || []))

function isCopy(node) { return !!node && /回交/.test(node.tag || '') }
function isChild(node) { return !!node && /子代/.test(node.tag || '') }

function gridLines(item) {
  const block = item.block
  const gt = item.gridTop
  const x = item.x
  const lines = []
  const hasBackcross = !!block.backcrossFather || !!block.backcrossMother
  if (!hasBackcross) {
    if (block.father && block.child) lines.push({ x1: x + 66, y1: gt + 66, x2: x + 198, y2: gt + 330, cls: 'ln-green' })
    if (block.mother && block.child) lines.push({ x1: x + 330, y1: gt + 66, x2: x + 198, y2: gt + 330, cls: 'ln-green' })
    return lines
  }
  const childAtLeft = isChild(block.backcrossFather)
  const childAtRight = isChild(block.backcrossMother)
  const copyAtLeft = isCopy(block.backcrossFather)
  const copyAtRight = isCopy(block.backcrossMother)
  const childX = childAtLeft ? x + 66 : childAtRight ? x + 330 : x + 198
  const copyX = copyAtLeft ? x + 66 : copyAtRight ? x + 330 : x + 198
  if (block.father) lines.push({ x1: x + 66, y1: gt + 66, x2: childX, y2: gt + 198, cls: 'ln-green' })
  if (block.mother) lines.push({ x1: x + 330, y1: gt + 66, x2: childX, y2: gt + 198, cls: 'ln-green' })
  if (block.child) {
    lines.push({ x1: copyX, y1: gt + 198, x2: x + 198, y2: gt + 330, cls: 'ln-green ln-dash' })
    lines.push({ x1: childX, y1: gt + 198, x2: x + 198, y2: gt + 330, cls: 'ln-green ln-dash' })
  }
  if (copyAtLeft && block.father) lines.push({ x1: x + 66, y1: gt + 66, x2: x + 66, y2: gt + 198, cls: 'ln-yellow' })
  if (copyAtRight && block.mother) lines.push({ x1: x + 330, y1: gt + 66, x2: x + 330, y2: gt + 198, cls: 'ln-yellow' })
  return lines
}

const lines = computed(() => {
  const list = []
  const { items, itemById } = layout.value
  items.forEach((item) => {
    list.push(...gridLines(item))
    const next = item.block.nextBlock
    if (next && item.block.child) {
      const target = itemById.get(next.id)
      if (target) {
        const from = item.centers.child
        const to = next.role === 'father' ? target.centers.father : target.centers.mother
        list.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, cls: 'ln-yellow ln-reuse' })
      }
    }
  })
  return list
})

function onNodeClick(payload) {
  emit('node-click', payload)
}
function onUndo(uid) {
  emit('undo', uid)
}
function isSelected(id) { return props.selectedIds.includes(id) }
function onQueueStart() { emit('queue-start') }
function onBlockClick(id) { emit('block-click', id) }
</script>

<style scoped>
.hatch-route { width: 100%; }

.hr-error {
  padding: 24px;
  text-align: center;
  color: #fca5a5;
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: 12px;
}

.hr-wrap { display: flex; flex-direction: column; overflow-x: auto; }

.hr-canvas { position: relative; flex-shrink: 0; margin: 0 auto; }

.hr-svg { position: absolute; left: 0; top: 0; pointer-events: none; }
.ln-green { stroke: #34d399; stroke-width: 2; }
.ln-yellow { stroke: #fbbf24; stroke-width: 2; }
.ln-dash { stroke-dasharray: 6 5; opacity: 0.85; }
.ln-reuse { stroke-dasharray: 3 4; }

.hr-notes { display: flex; flex-direction: column; gap: 6px; width: 100%; }
.hr-note-item { font-size: 12px; color: #fde68a; }
</style>
