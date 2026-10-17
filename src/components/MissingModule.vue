<template>
  <NodeCard :node="node" :target-spec="targetSpec" :clickable="isClickable" @node-click="onClick" />
</template>

<script setup>
import { computed } from 'vue'
import NodeCard from './NodeCard.vue'

const props = defineProps({
  node: { type: Object, required: true },
  targetSpec: { type: Object, default: null },
})
const emit = defineEmits(['node-click'])

// 只有「最上方」的真缺失（非 pseudo 连锁伪缺失）可点击
const isClickable = computed(
  () => (props.node.isUnknown || props.node.isMissing || props.node.featureUnknown) && !props.node.pseudo
)

function onClick() {
  if (isClickable.value) emit('node-click', props.node)
}
</script>
