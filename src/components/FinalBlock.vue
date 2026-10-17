<template>
  <BlockFrame type="final" :block="block" :x="x" :y="y" :target-spec="targetSpec" :added-uids="addedUids"
    :queue-mode="queueMode" :selected="selected"
    @node-click="emit('node-click', $event)" @undo="emit('undo', $event)"
    @queue-start="emit('queue-start')" @block-click="emit('block-click', $event)" />
</template>

<script setup>
import BlockFrame from './BlockFrame.vue'
defineProps({
  block: { type: Object, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  targetSpec: { type: Object, default: null },
  addedUids: { type: Array, default: () => [] },
  queueMode: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
})
const emit = defineEmits(['node-click', 'undo', 'queue-start', 'block-click'])
</script>
