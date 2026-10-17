// 孵化路线 DAG 布局
// 把 computeHatchRoute 返回的扁平 blocks 组织成「并列传递链 → 汇合块 → 最终块」的拓扑布局。

export const BLOCK_W = 396
export const BLOCK_H = 434
export const COL_GAP = 44
export const ROW_GAP = 40

const LABEL_H = 22
const NOTE_H = 16
const GRID_TOP = LABEL_H + NOTE_H // 38

// 块内各模块中心坐标（相对块左上角）
const INNER = {
  father: { x: 66, y: GRID_TOP + 66 },
  mother: { x: 330, y: GRID_TOP + 66 },
  bf: { x: 66, y: GRID_TOP + 198 },
  bm: { x: 330, y: GRID_TOP + 198 },
  child: { x: 198, y: GRID_TOP + 330 },
}

export function buildRouteLayout(blocks) {
  const byId = new Map(blocks.map((b) => [b.id, b]))

  // 链起点：非 merge/final 且没有上游块（prevBlockIds 为空）的块
  const roots = blocks.filter(
    (b) => b.type !== 'merge' && b.type !== 'final' && (!b.prevBlockIds || b.prevBlockIds.length === 0)
  )

  // 从每个起点沿 nextBlock 走到底（遇 merge/final 停）
  const chains = []
  const visited = new Set()
  for (const r of roots) {
    const chain = []
    let cur = r
    while (cur && !visited.has(cur.id) && cur.type !== 'merge' && cur.type !== 'final') {
      chain.push(cur)
      visited.add(cur.id)
      cur = cur.nextBlock ? byId.get(cur.nextBlock.id) : null
    }
    if (chain.length) chains.push(chain)
  }

  const nCols = Math.max(chains.length, 1)
  const totalWidth = nCols * BLOCK_W + (nCols - 1) * COL_GAP
  const centerX = totalWidth / 2
  const maxChainLen = chains.reduce((m, c) => Math.max(m, c.length), 0)

  const items = []
  const itemById = new Map()

  function addItem(block, x, y) {
    const gridTop = y + GRID_TOP
    const item = {
      block,
      x,
      y,
      gridTop,
      centers: {
        father: { x: x + INNER.father.x, y: y + INNER.father.y },
        mother: { x: x + INNER.mother.x, y: y + INNER.mother.y },
        bf: { x: x + INNER.bf.x, y: y + INNER.bf.y },
        bm: { x: x + INNER.bm.x, y: y + INNER.bm.y },
        child: { x: x + INNER.child.x, y: y + INNER.child.y },
      },
    }
    items.push(item)
    itemById.set(block.id, item)
  }

  chains.forEach((chain, col) => {
    chain.forEach((block, level) => {
      addItem(block, col * (BLOCK_W + COL_GAP), level * (BLOCK_H + ROW_GAP))
    })
  })

  let level = maxChainLen
  const merge = blocks.find((b) => b.type === 'merge')
  if (merge) {
    addItem(merge, centerX - BLOCK_W / 2, level * (BLOCK_H + ROW_GAP))
    level += 1
  }
  const final = blocks.find((b) => b.type === 'final')
  if (final) {
    addItem(final, centerX - BLOCK_W / 2, level * (BLOCK_H + ROW_GAP))
    level += 1
  }

  let totalHeight = 0
  items.forEach((it) => { totalHeight = Math.max(totalHeight, it.y + BLOCK_H) })

  return { items, itemById, chains, totalWidth, totalHeight }
}

// 块所属的「路线/分岔」key：同一链的块共用根块 id，merge/final 各自独立。
// 用于孵蛋队列选择：同一路线上最多选一个块，并列路线上互不干扰。
export function getBlockLane(blocks, blockId) {
  const byId = new Map(blocks.map((b) => [b.id, b]))
  const block = byId.get(blockId)
  if (!block) return null
  if (block.type === 'merge') return 'merge'
  if (block.type === 'final') return 'final'
  let cur = block
  let guard = 0
  while (cur && guard++ < 200) {
    if (!cur.prevBlockIds || cur.prevBlockIds.length === 0) return cur.id
    cur = byId.get(cur.prevBlockIds[0])
  }
  return blockId
}
