<template>
  <div class="block" :class="{ queue: queueMode, selected }" :style="{ left: x + 'px', top: y + 'px' }"
    @click="onBlockClick">
    <div class="hr-label">
      <span class="hr-badge" :class="type">{{ label }}</span>
      <span class="hr-title">{{ block.title }}</span>
      <span v-if="block.note" class="hr-note">{{ block.note }}</span>
    </div>

    <div class="slot" style="left:6px;top:44px">
      <ParentModule v-if="block.father" :node="block.father" :target-spec="targetSpec" :added-uids="addedUids"
        @node-click="emitNode('father')" @undo="emit('undo', $event)" />
    </div>
    <div class="slot" style="left:270px;top:44px">
      <ParentModule v-if="block.mother" :node="block.mother" :target-spec="targetSpec" :added-uids="addedUids"
        @node-click="emitNode('mother')" @undo="emit('undo', $event)" />
    </div>
    <div class="slot" style="left:6px;top:176px">
      <BackcrossModule v-if="block.backcrossFather" :node="block.backcrossFather" :target-spec="targetSpec" />
    </div>
    <div class="slot" style="left:270px;top:176px">
      <BackcrossModule v-if="block.backcrossMother" :node="block.backcrossMother" :target-spec="targetSpec" />
    </div>
    <div class="slot" style="left:138px;top:308px">
      <TargetModule v-if="type === 'final' && block.child" :node="block.child" :target-spec="targetSpec" />
      <ChildModule v-else-if="block.child" :node="block.child" :target-spec="targetSpec" />
    </div>
  </div>
</template>

<script setup>
import ParentModule from './ParentModule.vue'
import BackcrossModule from './BackcrossModule.vue'
import ChildModule from './ChildModule.vue'
import TargetModule from './TargetModule.vue'

const props = defineProps({
  type: { type: String, required: true },
  block: { type: Object, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  targetSpec: { type: Object, default: null },
  addedUids: { type: Array, default: () => [] },
  queueMode: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
})
const emit = defineEmits(['node-click', 'undo', 'queue-start', 'block-click'])

const LABELS = { final: '最终', merge: '合并', propagate: '传递', backcross: '回交' }
const label = LABELS[props.type] || props.type

function emitNode(role) {
  emit('node-click', { block: props.block, role, node: props.block[role] })
}
function onBlockClick() {
  if (props.queueMode) emit('block-click', props.block.id)
}
</script>

<style scoped>
.block { position: absolute; width: 396px; height: 434px; }
.block.queue { cursor: pointer; }
.block.queue .slot { pointer-events: none; }
.block.selected { outline: 3px solid #6ee7b7; outline-offset: 3px; box-shadow: 0 0 0 6px rgba(110, 231, 183, 0.25); border-radius: 8px; }

.queue-btn {
  position: absolute;
  top: -4px;
  right: 0;
  z-index: 4;
  padding: 3px 9px;
  border: 1px solid rgba(110, 231, 183, 0.5);
  border-radius: 999px;
  background: rgba(110, 231, 183, 0.18);
  color: #6ee7b7;
  font-size: 11px;
  cursor: pointer;
}
.queue-btn:hover { background: rgba(110, 231, 183, 0.32); }

.hr-label {
  position: absolute;
  left: 0;
  top: 0;
  width: 396px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.hr-badge {
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}
.hr-badge.final { background: rgba(110, 231, 183, 0.2); color: #6ee7b7; }
.hr-badge.merge { background: rgba(251, 191, 36, 0.18); color: #fbbf24; }
.hr-badge.propagate { background: rgba(129, 140, 248, 0.2); color: #a5b4fc; }
.hr-title { font-size: 13px; color: #fff; font-weight: bold; }
.hr-note { font-size: 11px; color: rgba(255, 255, 255, 0.55); }

.slot { position: absolute; width: 120px; height: 120px; }
</style>
