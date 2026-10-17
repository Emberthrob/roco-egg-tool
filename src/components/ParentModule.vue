<template>
  <div class="pm">
    <MissingModule v-if="isMissing" :node="node" :target-spec="targetSpec" @node-click="onClick" />
    <NodeCard v-else :node="node" :target-spec="targetSpec" />
    <button v-if="undoable" class="undo-btn" title="撤回该临时精灵" @click="emit('undo', node.uid)">↩</button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import NodeCard from './NodeCard.vue'
import MissingModule from './MissingModule.vue'

const props = defineProps({
  node: { type: Object, required: true },
  targetSpec: { type: Object, default: null },
  addedUids: { type: Array, default: () => [] },
})
const emit = defineEmits(['node-click', 'undo'])

const isMissing = computed(() => !!(props.node.isUnknown || props.node.isMissing || props.node.featureUnknown))
const undoable = computed(() => !!props.node.uid && props.addedUids.includes(props.node.uid))

function onClick() {
  emit('node-click', props.node)
}
</script>

<style scoped>
.pm { position: relative; width: 120px; height: 120px; }
.undo-btn {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: rgba(248, 113, 113, 0.85);
  color: #fff;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
