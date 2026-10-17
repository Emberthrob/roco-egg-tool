<template>
  <NodeCard :node="node" :target-spec="targetSpec" />
</template>

<script setup>
import NodeCard from './NodeCard.vue'
defineProps({
  node: { type: Object, required: true },
  targetSpec: { type: Object, default: null },
})
</script>
