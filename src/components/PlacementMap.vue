<template>
  <teleport to="body">
    <div class="pm-mask" v-if="visible" @click.self="close">
      <div class="pm-modal">
        <div class="pm-header">
          <h3>配窝位置图</h3>
          <div class="pm-actions">
            <button class="pm-btn" @click="autoLayout">重新布局</button>
            <button class="pm-btn" @click="exportPNG">导出PNG</button>
            <button class="pm-close" @click="close">×</button>
          </div>
        </div>

        <div class="pm-legend">
          <span class="lg"><i class="dot female"></i>雌性</span>
          <span class="lg"><i class="dot male"></i>雄性</span>
          <span class="lg"><i class="dot academy"></i>学院窝</span>
          <span class="lg"><i class="dot line"></i>可配对连线</span>
          <span class="lg hint">拖动模块可调整位置，相邻交点间距 0.5</span>
        </div>

        <div class="pm-canvas">
          <svg ref="svgRef" :viewBox="'0 0 ' + size + ' ' + size" class="pm-svg">
            <g>
              <template v-for="i in FINE_GRID + 1" :key="'gh' + i">
                <line :x1="0" :y1="(i - 1) * HALF" :x2="size" :y2="(i - 1) * HALF" :stroke="gridColor(i - 1)"
                  :stroke-width="gridWidth(i - 1)" />
                <line :x1="(i - 1) * HALF" :y1="0" :x2="(i - 1) * HALF" :y2="size" :stroke="gridColor(i - 1)"
                  :stroke-width="gridWidth(i - 1)" />
              </template>
            </g>

            <g>
              <line v-for="(l, i) in lines" :key="'ln' + i" :x1="l.x1 * UNIT" :y1="l.y1 * UNIT" :x2="l.x2 * UNIT"
                :y2="l.y2 * UNIT" stroke="#34d399" stroke-width="2" opacity="0.45" />
            </g>

            <g v-for="(f, i) in females" :key="'f' + i" class="pm-node" @pointerdown="onStart($event, 'female', i)">
              <rect :x="fc(i).x * UNIT - NODE / 2" :y="fc(i).y * UNIT - NODE / 2" :width="NODE" :height="NODE" rx="8"
                :fill="f.useAcademy ? 'rgba(52,211,153,0.30)' : 'rgba(244,143,177,0.24)'"
                :stroke="f.useAcademy ? '#34d399' : '#f472b6'" stroke-width="2">
                <title>{{ femaleLabel(f) }}</title>
              </rect>
              <text :x="fc(i).x * UNIT" :y="fc(i).y * UNIT - 30" text-anchor="middle" font-size="14" font-weight="bold" fill="#fff">♀ {{ shortName(f.note || f.name) }}</text>
              <text v-for="(feat, fi) in femaleFeatures(f)" :key="'ff' + fi" :x="fc(i).x * UNIT" :y="fc(i).y * UNIT - 4 + fi * 18" text-anchor="middle" font-size="12" :fill="feat.color">{{ feat.text }}</text>
              <text v-if="f.shiny" :x="fc(i).x * UNIT + NODE / 2 - 18" :y="fc(i).y * UNIT - NODE / 2 + 18" font-size="14">⭐</text>
              <text v-if="f.useAcademy" :x="fc(i).x * UNIT" :y="fc(i).y * UNIT + NODE / 2 - 8" text-anchor="middle" font-size="10" fill="#34d399">学院窝</text>
            </g>

            <g v-for="(m, i) in males" :key="'m' + i" class="pm-node" @pointerdown="onStart($event, 'male', i)">
              <rect :x="mc(i).x * UNIT - NODE / 2" :y="mc(i).y * UNIT - NODE / 2" :width="NODE" :height="NODE" rx="8"
                :fill="m.useAcademy ? 'rgba(52,211,153,0.30)' : 'rgba(100,181,246,0.24)'"
                :stroke="m.useAcademy ? '#34d399' : '#60a5fa'" stroke-width="2">
                <title>{{ maleLabel(m) }}</title>
              </rect>
              <text :x="mc(i).x * UNIT" :y="mc(i).y * UNIT - 30" text-anchor="middle" font-size="14" font-weight="bold" fill="#fff">♂ {{ shortName(m.name) }}</text>
              <text v-for="(feat, fi) in maleFeatures(m)" :key="'mf' + fi" :x="mc(i).x * UNIT" :y="mc(i).y * UNIT - 4 + fi * 18" text-anchor="middle" font-size="12" :fill="feat.color">{{ feat.text }}</text>
              <text v-if="m.isShiny" :x="mc(i).x * UNIT + NODE / 2 - 18" :y="mc(i).y * UNIT - NODE / 2 + 18" font-size="14">⭐</text>
              <text v-if="m.useAcademy" :x="mc(i).x * UNIT" :y="mc(i).y * UNIT + NODE / 2 - 8" text-anchor="middle" font-size="10" fill="#34d399">学院窝</text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, reactive, computed, watch, onUnmounted } from 'vue'
import { getEggGroups } from '../utils/breeding'
import defines from '../data/defines.json'
import medalsData from '../data/medals.json'
import personalitiesData from '../data/personalities.json'

const props = defineProps({
  females: { type: Array, default: () => [] },
  males: { type: Array, default: () => [] },
})
const visible = defineModel({ type: Boolean, default: false })

// ===== 网格规格（对齐旧代码 state.js）=====
const GRID_SIZE = 7
const FINE_GRID = GRID_SIZE * 2   // 14
const UNIT = 100
const HALF = UNIT / 2             // 30
const NODE = UNIT - 4             // 56
const size = GRID_SIZE * UNIT     // 420

const svgRef = ref(null)
const coords = reactive({ females: [], males: [] })

// ===== 兼容性（蛋组交集，等价旧 compatibleMap）=====
function hasCommonGroup(a, b) { return a.some((g) => b.includes(g)) }
function compatible(x, y) { return hasCommonGroup(x.eggGroups || [], y.eggGroups || []) }
function eggGroupsOf(species) { return getEggGroups(species) }

// ===== 独立随机数（LCG，对齐旧 myRandom）=====
let _randState = 1
function reseed(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0 }
  _randState = Math.abs(hash) || 1
}
function myRandom() {
  _randState = (_randState * 1664525 + 1013904223) | 0
  return (_randState >>> 0) / 4294967296
}

// ===== 工具 =====
function cellKey(fx, fy) { return fy * (FINE_GRID + 1) + fx }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)) }
function gridColor(i) { return i % 2 === 0 ? 'rgba(196,181,253,0.30)' : 'rgba(196,181,253,0.10)' }
function gridWidth(i) { return i % 2 === 0 ? 1.2 : 0.5 }
function fc(i) { return coords.females[i] || { x: 0, y: 0 } }
function mc(i) { return coords.males[i] || { x: 0, y: 0 } }

// ===== 有效蛋组（对齐 calcEffectiveEggGroups）=====
function calcEffectiveEggGroups(maleEggGroups, femaleList) {
  const groups = maleEggGroups
  if (groups.length <= 1) return groups.slice()
  const maleSet = new Set(groups)
  const femaleHasSame = (f) => {
    const fg = f.eggGroups || []
    if (fg.length !== maleSet.size) return false
    return fg.every((g) => maleSet.has(g))
  }
  const active = []
  for (const g of groups) {
    for (const f of femaleList) {
      const fg = f.eggGroups || []
      if (fg.includes(g) && !femaleHasSame(f)) { active.push(g); break }
    }
  }
  return active.length > 0 ? active : groups.slice()
}

function eggGroupKey(groups) { return groups.slice().sort((a, b) => a - b).join(',') }

// ===== 封锁工具（对齐 clusterToBlockedFineCells）=====
function clusterToBlockedFineCells(clusterCoords) {
  const blocked = new Set()
  clusterCoords.forEach((c) => {
    const fx = Math.round(c.x * 2), fy = Math.round(c.y * 2)
    for (let dfx = -1; dfx <= 1; dfx++) {
      for (let dfy = -1; dfy <= 1; dfy++) {
        const nfx = fx + dfx, nfy = fy + dfy
        if (nfx >= 0 && nfx <= FINE_GRID && nfy >= 0 && nfy <= FINE_GRID) blocked.add(nfy * (FINE_GRID + 1) + nfx)
      }
    }
  })
  return blocked
}

// ===== 后处理（对齐 compactPlacement / centerPlacement）=====
function compactPlacement(pl) {
  if (!pl || (pl.maleCoords.length === 0 && pl.femaleCoords.length === 0)) return pl
  const all = pl.maleCoords.concat(pl.femaleCoords)
  const minX = Math.min(...all.map((c) => c.x))
  const minY = Math.min(...all.map((c) => c.y))
  return {
    maleCoords: pl.maleCoords.map((c) => ({ x: c.x - minX, y: c.y - minY })),
    femaleCoords: pl.femaleCoords.map((c) => ({ x: c.x - minX, y: c.y - minY })),
  }
}
function centerPlacement(pl) {
  if (!pl || (pl.maleCoords.length === 0 && pl.femaleCoords.length === 0)) return pl
  const all = pl.maleCoords.concat(pl.femaleCoords)
  const minX = Math.min(...all.map((c) => c.x))
  const maxX = Math.max(...all.map((c) => c.x))
  const minY = Math.min(...all.map((c) => c.y))
  const maxY = Math.max(...all.map((c) => c.y))
  const w = maxX - minX + 1, h = maxY - minY + 1
  const offX = Math.round((GRID_SIZE - w + 1) / 2) - minX
  const offY = Math.round((GRID_SIZE - h + 1) / 2) - minY
  return {
    maleCoords: pl.maleCoords.map((c) => ({ x: c.x + offX, y: c.y + offY })),
    femaleCoords: pl.femaleCoords.map((c) => ({ x: c.x + offX, y: c.y + offY })),
  }
}

// ===== 非聚合求解器（整数格，对齐 solvePlacement）=====
function solvePlacement(females, males, targets, maleCompatCount, maleUniqueCount, preOccupied) {
  const M = males.length
  const GS = GRID_SIZE

  function canStillMeetTargets(placedFemales, remainingFemales, maleCoords, malesArr) {
    for (let mi = 0; mi < malesArr.length; mi++) {
      const target = targets[mi]
      if (target > 0) {
        let curNear = 0
        placedFemales.forEach((pf) => {
          const dist = Math.abs(pf.coord.x - maleCoords[mi].x) + Math.abs(pf.coord.y - maleCoords[mi].y)
          if (dist <= 2 && compatible(malesArr[mi], pf)) curNear++
        })
        let potMax = 0
        remainingFemales.forEach((rf) => { if (compatible(malesArr[mi], rf)) potMax++ })
        if (curNear + potMax < target) return false
      }
    }
    return true
  }

  function tryPlace(sorted, start, occupied, maleCoords) {
    if (start >= sorted.length) return true
    const f = sorted[start]
    const cand = []
    for (let y = 0; y < GS; y++) {
      for (let x = 0; x < GS; x++) {
        if (occupied.has(y * GS + x)) continue
        let ok = true
        for (const c of f.constraints) {
          const dist = Math.abs(x - maleCoords[c.maleIdx].x) + Math.abs(y - maleCoords[c.maleIdx].y)
          if (dist < c.minDist || dist > c.maxDist) { ok = false; break }
        }
        if (ok) cand.push({ x, y })
      }
    }
    if (cand.length === 0) return false
    cand.sort((a, b) => {
      const dA = f.constraints.reduce((s, c) => s + Math.abs(a.x - maleCoords[c.maleIdx].x) + Math.abs(a.y - maleCoords[c.maleIdx].y), 0)
      const dB = f.constraints.reduce((s, c) => s + Math.abs(b.x - maleCoords[c.maleIdx].x) + Math.abs(b.y - maleCoords[c.maleIdx].y), 0)
      return dA - dB
    })
    for (const p of cand) {
      const key = p.y * GS + p.x
      occupied.add(key); f.coord = p
      const placed = sorted.slice(0, start + 1), remaining = sorted.slice(start + 1)
      if (canStillMeetTargets(placed, remaining, maleCoords, males) && tryPlace(sorted, start + 1, occupied, maleCoords)) return true
      occupied.delete(key)
    }
    return false
  }

  const useCenterBias = M <= 2
  const centerPositions = []
  for (let cy = 2; cy <= 4; cy++) for (let cx = 2; cx <= 4; cx++) centerPositions.push({ x: cx, y: cy })

  for (let att = 0; att < 3000; att++) {
    const maleCoords = new Array(M)
    const occupied = preOccupied ? new Set(preOccupied) : new Set()
    let fail = false
    const indices = Array.from({ length: M }, (_, i) => i).sort((a, b) => {
      const aU = maleUniqueCount[a] > 0, bU = maleUniqueCount[b] > 0
      if (aU !== bU) return aU ? 1 : -1
      if (aU) return maleCompatCount[b] - maleCompatCount[a]
      return maleCompatCount[a] - maleCompatCount[b]
    })
    for (const mi of indices) {
      let x, y, tries = 0
      if (useCenterBias && (maleUniqueCount[mi] > 0 || maleCompatCount[mi] >= 4)) {
        const avail = centerPositions.filter((p) => !occupied.has(p.y * GS + p.x))
        if (avail.length > 0) { const r = Math.floor(myRandom() * avail.length); x = avail[r].x; y = avail[r].y }
        else { do { x = Math.floor(myRandom() * GS); y = Math.floor(myRandom() * GS); tries++ } while (occupied.has(y * GS + x) && tries < 100) }
      } else {
        do { x = Math.floor(myRandom() * GS); y = Math.floor(myRandom() * GS); tries++ } while (occupied.has(y * GS + x) && tries < 100)
      }
      if (tries >= 100) { fail = true; break }
      occupied.add(y * GS + x); maleCoords[mi] = { x, y }
    }
    if (fail) continue
    const malePositionOrder = new Array(M)
    indices.forEach((mi, pos) => { malePositionOrder[mi] = pos })
    const sorted = females.slice().sort((a, b) => {
      const aU = a.males.length === 1, bU = b.males.length === 1
      if (aU !== bU) return aU ? 1 : -1
      if (aU) return malePositionOrder[a.males[0]] - malePositionOrder[b.males[0]]
      if (a.stepLimit !== b.stepLimit) return a.stepLimit - b.stepLimit
      if (a.males.length !== b.males.length) return a.males.length - b.males.length
      const minA = Math.min(...a.males.map((mi) => maleCompatCount[mi]))
      const minB = Math.min(...b.males.map((mi) => maleCompatCount[mi]))
      return minA - minB
    })
    const occCopy = new Set(occupied)
    if (tryPlace(sorted, 0, occCopy, maleCoords)) {
      sorted.forEach((f) => { const orig = females.find((e) => e.id === f.id); if (orig) orig.coord = f.coord })
      return { maleCoords, femaleCoords: females.map((f) => f.coord) }
    }
  }
  return null
}

// ===== 聚合求解器（细网格，对齐 solvePlacementFine）=====
function solvePlacementFine(females, freeMales, targets, maleCompatCount, maleUniqueCount, preOccupied, fixedFemalesFine) {
  const M = freeMales.length
  const GRID = FINE_GRID
  const gridMin = 1, gridMax = FINE_GRID - 1
  const keyStride = FINE_GRID + 1
  const nearbyRange = 4
  const chebR = 1

  const isOcc = (o, gx, gy) => o.has(gy * keyStride + gx)
  function block(o, gx, gy, r) {
    for (let dfx = -r; dfx <= r; dfx++) for (let dfy = -r; dfy <= r; dfy++) {
      const nx = gx + dfx, ny = gy + dfy
      if (nx >= gridMin && nx <= gridMax && ny >= gridMin && ny <= gridMax) o.add(ny * keyStride + nx)
    }
  }
  function unblock(o, gx, gy, r) {
    for (let dfx = -r; dfx <= r; dfx++) for (let dfy = -r; dfy <= r; dfy++) {
      const nx = gx + dfx, ny = gy + dfy
      if (nx >= gridMin && nx <= gridMax && ny >= gridMin && ny <= gridMax) o.delete(ny * keyStride + nx)
    }
  }

  function getFixedFemaleCandidates(o, mEggGroups, range) {
    if (!fixedFemalesFine || fixedFemalesFine.length === 0) return null
    const cands = []
    for (const ff of fixedFemalesFine) {
      if (!hasCommonGroup(mEggGroups, ff.eggGroups)) continue
      for (let dfx = -range; dfx <= range; dfx++) {
        const remain = range - Math.abs(dfx)
        for (let dfy = -remain; dfy <= remain; dfy++) {
          const nx = ff.fineX + dfx, ny = ff.fineY + dfy
          if (nx >= gridMin && nx <= gridMax && ny >= gridMin && ny <= gridMax && !isOcc(o, nx, ny)) cands.push({ x: nx, y: ny })
        }
      }
    }
    return cands.length > 0 ? cands : null
  }

  function canStillMeetTargets(placedFemales, remainingFemales, maleCoords, malesArr) {
    for (let mi = 0; mi < malesArr.length; mi++) {
      const target = targets[mi]
      if (target > 0) {
        let curNear = 0
        placedFemales.forEach((pf) => {
          const dist = Math.abs(pf.coord.x - maleCoords[mi].x) + Math.abs(pf.coord.y - maleCoords[mi].y)
          if (dist <= nearbyRange && compatible(malesArr[mi], pf)) curNear++
        })
        let potMax = 0
        remainingFemales.forEach((rf) => { if (compatible(malesArr[mi], rf)) potMax++ })
        if (curNear + potMax < target) return false
      }
    }
    return true
  }

  function getCandidatesForFemale(f, maleCoords, occupied, useLoose) {
    const cand = []
    for (let gy = gridMin; gy <= gridMax; gy++) {
      for (let gx = gridMin; gx <= gridMax; gx++) {
        if (isOcc(occupied, gx, gy)) continue
        let ok = true
        for (const c of f.constraints) {
          const mx = c.isFixed ? c.fixedX : maleCoords[c.maleIdx].x
          const my = c.isFixed ? c.fixedY : maleCoords[c.maleIdx].y
          const dist = Math.abs(gx - mx) + Math.abs(gy - my)
          const maxD = (useLoose && c.maxDistLoose !== undefined) ? c.maxDistLoose : c.maxDist
          if (dist < c.minDist || dist > maxD) { ok = false; break }
        }
        if (ok) cand.push({ x: gx, y: gy })
      }
    }
    return cand
  }

  function tryPlace(sorted, start, occupied, maleCoords) {
    if (start >= sorted.length) return true
    const f = sorted[start]
    let cand = getCandidatesForFemale(f, maleCoords, occupied, false)
    if (cand.length === 0 && f.constraints.some((c) => c.maxDistLoose !== undefined)) cand = getCandidatesForFemale(f, maleCoords, occupied, true)
    if (cand.length === 0) return false
    cand.sort((a, b) => {
      const dA = f.constraints.reduce((s, c) => { const mx = c.isFixed ? c.fixedX : maleCoords[c.maleIdx].x; const my = c.isFixed ? c.fixedY : maleCoords[c.maleIdx].y; return s + Math.abs(a.x - mx) + Math.abs(a.y - my) }, 0)
      const dB = f.constraints.reduce((s, c) => { const mx = c.isFixed ? c.fixedX : maleCoords[c.maleIdx].x; const my = c.isFixed ? c.fixedY : maleCoords[c.maleIdx].y; return s + Math.abs(b.x - mx) + Math.abs(b.y - my) }, 0)
      return dA - dB
    })
    for (const p of cand) {
      block(occupied, p.x, p.y, chebR); f.coord = p
      const placed = sorted.slice(0, start + 1), remaining = sorted.slice(start + 1)
      if (canStillMeetTargets(placed, remaining, maleCoords, freeMales) && tryPlace(sorted, start + 1, occupied, maleCoords)) return true
      unblock(occupied, p.x, p.y, chebR)
    }
    return false
  }

  const useCenterBias = M <= 2
  const centerPositions = []
  for (let gy = 2; gy <= FINE_GRID - 2; gy++) for (let gx = 2; gx <= FINE_GRID - 2; gx++) centerPositions.push({ x: gx, y: gy })

  for (let att = 0; att < 3000; att++) {
    const maleCoords = new Array(M)
    const occupied = preOccupied ? new Set(preOccupied) : new Set()
    let fail = false
    const indices = Array.from({ length: M }, (_, i) => i).sort((a, b) => {
      const aU = maleUniqueCount[a] > 0, bU = maleUniqueCount[b] > 0
      if (aU !== bU) return aU ? 1 : -1
      if (aU) return maleCompatCount[b] - maleCompatCount[a]
      return maleCompatCount[a] - maleCompatCount[b]
    })
    for (const mi of indices) {
      const mEggGroups = freeMales[mi].eggGroups
      let gx, gy, tries = 0, placed = false
      const hasCompatFixed = fixedFemalesFine && fixedFemalesFine.some((ff) => hasCommonGroup(mEggGroups, ff.eggGroups))
      if (hasCompatFixed) {
        let range = 4
        while (range <= 6 && !placed) {
          const bias = getFixedFemaleCandidates(occupied, mEggGroups, range)
          if (bias && bias.length > 0) {
            const dedup = new Map(); bias.forEach((c) => dedup.set(c.y * keyStride + c.x, c))
            const uniq = Array.from(dedup.values())
            const r = Math.floor(myRandom() * Math.min(uniq.length, 30))
            gx = uniq[r].x; gy = uniq[r].y; placed = true
          } else range += 2
        }
        if (!placed) { fail = true; break }
      } else if (useCenterBias && (maleUniqueCount[mi] > 0 || maleCompatCount[mi] >= 4)) {
        const avail = centerPositions.filter((p) => !isOcc(occupied, p.x, p.y))
        if (avail.length > 0) { const r2 = Math.floor(myRandom() * avail.length); gx = avail[r2].x; gy = avail[r2].y; placed = true }
      }
      if (!placed) {
        do { gx = 1 + Math.floor(myRandom() * (FINE_GRID - 1)); gy = 1 + Math.floor(myRandom() * (FINE_GRID - 1)); tries++ } while (isOcc(occupied, gx, gy) && tries < 200)
        if (tries >= 200) { fail = true; break }
      }
      block(occupied, gx, gy, chebR)
      maleCoords[mi] = { x: gx, y: gy }
    }
    if (fail) continue
    const malePositionOrder = new Array(M)
    indices.forEach((mi, pos) => { malePositionOrder[mi] = pos })
    const sorted = females.slice().sort((a, b) => {
      const aU = a.males.length === 1, bU = b.males.length === 1
      if (aU !== bU) return aU ? 1 : -1
      if (aU) return malePositionOrder[a.males[0]] - malePositionOrder[b.males[0]]
      if (a.stepLimit !== b.stepLimit) return a.stepLimit - b.stepLimit
      if (a.males.length !== b.males.length) return a.males.length - b.males.length
      const minA = Math.min(...a.males.map((mi) => maleCompatCount[mi]))
      const minB = Math.min(...b.males.map((mi) => maleCompatCount[mi]))
      return minA - minB
    })
    const occCopy = new Set(occupied)
    if (tryPlace(sorted, 0, occCopy, maleCoords)) {
      sorted.forEach((f) => { const orig = females.find((e) => e.id === f.id); if (orig) orig.coord = f.coord })
      return {
        maleCoords: maleCoords.map((c) => ({ x: c.x / 2, y: c.y / 2 })),
        femaleCoords: females.map((f) => ({ x: f.coord.x / 2, y: f.coord.y / 2 })),
      }
    }
  }
  return null
}

// ===== 构建雌性约束（对齐 createFemalesSub / createFemalesSubFine）=====
function buildFemaleEntries(femList, maleArr, strictMode, maleCompatCount, maleUniqueCount, isFine) {
  const maleHasUniqueDep = new Array(maleArr.length).fill(false)
  femList.forEach((f) => {
    const fMales = []
    maleArr.forEach((m, mi) => { if (compatible(m, f)) fMales.push(mi) })
    if (fMales.length === 1) maleHasUniqueDep[fMales[0]] = true
  })

  return femList.map((f, idx) => {
    const fMales = []
    maleArr.forEach((m, mi) => { if (compatible(m, f)) fMales.push(mi) })
    if (fMales.length === 0) return null
    const stepLimit = Math.min(fMales.length, 2)
    const constraints = fMales.map((mi) => {
      // ★双向唯一依赖（距离=1）：
      //  1) 雌性视角：这只雌只能配这一只雄（fMales.length === 1）
      //  2) 雄性视角：这只雄只能配这一只雌（maleCompatCount[mi] === 1）
      const isUniqueDep = (fMales.length === 1) || (maleCompatCount[mi] === 1)
      let minDist, maxDist, maxDistLoose
      if (isFine) {
        // 细网格：minDist=2/maxDist=2 细格 = 真实距离 1
        minDist = 2
        if (isUniqueDep) { maxDist = 2; maxDistLoose = undefined }
        else if (maleHasUniqueDep[mi]) { maxDist = 4; maxDistLoose = undefined }
        else { maxDist = 2; maxDistLoose = 4 }
        if (maleCompatCount[mi] >= 4) { maxDist = Math.max(maxDist, 8); if (maxDistLoose !== undefined) maxDistLoose = Math.max(maxDistLoose, 8) }
        if (maleUniqueCount[mi] > 0 && !isUniqueDep) minDist = Math.max(minDist, 4)
      } else {
        // 整数格：minDist=1，maxDist=stepLimit
        minDist = 1; maxDist = stepLimit
        // ★唯一依赖（雌性视角或雄性视角）强制贴脸：距离=1，与细网格 isUniqueDep 语义对齐
        if (isUniqueDep) maxDist = 1
        else if (maleCompatCount[mi] >= 4) maxDist = Math.max(maxDist, 4)
        if (maleUniqueCount[mi] > 0 && !isUniqueDep) minDist = Math.max(minDist, 2)
      }

      const c = { maleIdx: mi, minDist, maxDist, isFixed: false }
      if (maxDistLoose !== undefined) c.maxDistLoose = maxDistLoose
      return c
    })
    return { id: f.id, species: f.species, eggGroups: f.eggGroups, males: fMales, stepLimit, constraints, idx, isShiny: f.isShiny }
  }).filter((f) => f !== null)
}


// ===== 主布局（对齐 generatePlacement）=====
function generateLayout() {
  const coveredFemales = props.females.map((f, i) => ({
    species: f.id,
    id: f.instanceId || ('f-' + f.id + '-' + i),
    isShiny: !!f.shiny,
    personality: f.personality,
    medals: f.medals,
    eggGroups: f.eggGroups || eggGroupsOf(f.id),
  }))
  const maleSlots = props.males.map((m, i) => ({
    species: m.species,
    idx: i,
    isShiny: !!m.isShiny,
    personality: m.personality,
    medals: m.medals,
    locked: m.locked,
    eggGroups: m.eggGroups || eggGroupsOf(m.species),
  }))

  if (coveredFemales.length === 0 || maleSlots.length === 0) return

  const males = maleSlots.map((sm, idx) => ({ id: 'm-' + idx, species: sm.species, idx, eggGroups: sm.eggGroups }))

  const maleCompatCount = new Array(males.length).fill(0)
  coveredFemales.forEach((fi) => { males.forEach((m) => { if (compatible(m, fi)) maleCompatCount[m.idx]++ }) })

  const maleUniqueCount = new Array(males.length).fill(0)
  coveredFemales.forEach((fi) => {
    const compatMales = []
    males.forEach((m) => { if (compatible(m, fi)) compatMales.push(m.idx) })
    if (compatMales.length === 1) maleUniqueCount[compatMales[0]]++
  })

  const maleEffGroups = maleSlots.map((sm) => calcEffectiveEggGroups(sm.eggGroups, coveredFemales))

  const groupToMales = new Map()
  maleSlots.forEach((_, mi) => {
    const key = eggGroupKey(maleEffGroups[mi])
    if (!groupToMales.has(key)) groupToMales.set(key, [])
    groupToMales.get(key).push(mi)
  })

  // ---------- 聚簇检测 ----------
  let clusterMaleSet = null, clusterFemaleSet = null
  let clusterMaleCoords = null, clusterFemalePositions = null

  // 第一轮：单蛋组
  const sortedGroupEntries = Array.from(groupToMales).sort((a, b) => {
    const avgA = a[1].reduce((s, mi) => s + maleSlots[mi].effGroupCount || 1, 0) / a[1].length
    const avgB = b[1].reduce((s, mi) => s + maleSlots[mi].effGroupCount || 1, 0) / b[1].length
    return avgA - avgB
  })
  // 注意：effGroupCount 需要预先计算
  maleSlots.forEach((sm, i) => { sm.effGroupCount = maleEffGroups[i].length })

  const sortedEntries2 = Array.from(groupToMales).sort((a, b) => {
    const avgA = a[1].reduce((s, mi) => s + maleSlots[mi].effGroupCount, 0) / a[1].length
    const avgB = b[1].reduce((s, mi) => s + maleSlots[mi].effGroupCount, 0) / b[1].length
    return avgA - avgB
  })

  for (const [key, maleIndices] of sortedEntries2) {
    const n = maleIndices.length
    if (n !== 2 && n !== 3) continue
    const compFemSet = new Set()
    maleIndices.forEach((mi) => {
      coveredFemales.forEach((fi, fiIdx) => { if (compatible(males[mi], fi)) compFemSet.add(fiIdx) })
    })
    const compCnt = compFemSet.size
    if (n === 2 && compCnt === 4) {
      clusterMaleSet = new Set(maleIndices); clusterFemaleSet = compFemSet
      clusterMaleCoords = [{ x: 0.5, y: 0 }, { x: -0.5, y: 0 }]
      clusterFemalePositions = [{ x: 1, y: -1 }, { x: 1.5, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 1 }]
      break
    } else if (n === 2 && compCnt > 4) {
      clusterMaleSet = new Set(maleIndices); clusterFemaleSet = compFemSet
      clusterMaleCoords = [{ x: 0.5, y: 0 }, { x: -0.5, y: 0 }]
      clusterFemalePositions = [{ x: 1, y: -1 }, { x: 1.5, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1.5, y: 0 }, { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 0, y: -2 }]
      break
    } else if (n === 3 && compCnt >= 4) {
      clusterMaleSet = new Set(maleIndices); clusterFemaleSet = compFemSet
      clusterMaleCoords = [{ x: 0.5, y: 0 }, { x: -0.5, y: 0 }, { x: 0, y: -1 }]
      clusterFemalePositions = [{ x: -1.5, y: 0 }, { x: -1, y: -1 }, { x: 0.5, y: 1 }, { x: 1.5, y: 0 }, { x: 1, y: -1 }, { x: 0, y: -2 }, { x: -0.5, y: 1 }, { x: 0, y: 2 }]
      break
    }
  }

  // 第二轮：孤独高覆盖雄性
  if (clusterMaleSet === null) {
    for (let mi2 = 0; mi2 < maleSlots.length; mi2++) {
      if (maleCompatCount[mi2] < 4) continue
      if (maleUniqueCount[mi2] > 0) continue
      const myKey = eggGroupKey(maleEffGroups[mi2])
      const peers = groupToMales.get(myKey) || []
      if (peers.length > 1) continue
      const candidates = []
      for (let mj = 0; mj < maleSlots.length; mj++) {
        if (mj === mi2) continue
        if (maleUniqueCount[mj] > 0) continue
        if (!hasCommonGroup(maleEffGroups[mi2], maleEffGroups[mj])) continue
        candidates.push(mj)
      }
      if (candidates.length >= 2) {
        const threeMales = [mi2, candidates[0], candidates[1]]
        const compFemSet3 = new Set()
        threeMales.forEach((mIdx) => { coveredFemales.forEach((fi, fiIdx) => { if (compatible(males[mIdx], fi)) compFemSet3.add(fiIdx) }) })
        if (compFemSet3.size >= 4) {
          clusterMaleSet = new Set(threeMales); clusterFemaleSet = compFemSet3
          clusterMaleCoords = [{ x: 0.5, y: 0 }, { x: -0.5, y: 0 }, { x: 0, y: -1 }]
          clusterFemalePositions = [{ x: -1.5, y: 0 }, { x: -1, y: -1 }, { x: 0.5, y: 1 }, { x: 1.5, y: 0 }, { x: 1, y: -1 }, { x: 0, y: -2 }, { x: -0.5, y: 1 }, { x: 0, y: 2 }]
          break
        }
      }
      if (candidates.length >= 1) {
        const twoMales = [mi2, candidates[0]]
        const compFemSet2 = new Set()
        twoMales.forEach((mIdx) => { coveredFemales.forEach((fi, fiIdx) => { if (compatible(males[mIdx], fi)) compFemSet2.add(fiIdx) }) })
        if (compFemSet2.size >= 7) {
          clusterMaleSet = new Set(twoMales); clusterFemaleSet = compFemSet2
          clusterMaleCoords = [{ x: 0.5, y: 0 }, { x: -0.5, y: 0 }]
          clusterFemalePositions = [{ x: 1, y: -1 }, { x: 1.5, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1.5, y: 0 }, { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 0, y: -2 }]
          break
        } else if (compFemSet2.size <= 6) {
          if (candidates.length >= 2) {
            const threeMalesB = [mi2, candidates[0], candidates[1]]
            const comp3 = new Set()
            threeMalesB.forEach((mIdx) => { coveredFemales.forEach((fi, fiIdx) => { if (compatible(males[mIdx], fi)) comp3.add(fiIdx) }) })
            if (comp3.size >= 4) {
              clusterMaleSet = new Set(threeMalesB); clusterFemaleSet = comp3
              clusterMaleCoords = [{ x: 0.5, y: 0 }, { x: -0.5, y: 0 }, { x: 0, y: -1 }]
              clusterFemalePositions = [{ x: -1.5, y: 0 }, { x: -1, y: -1 }, { x: 0.5, y: 1 }, { x: 1.5, y: 0 }, { x: 1, y: -1 }, { x: 0, y: -2 }, { x: -0.5, y: 1 }, { x: 0, y: 2 }]
              break
            }
          }
          clusterMaleSet = new Set(twoMales); clusterFemaleSet = compFemSet2
          clusterMaleCoords = [{ x: 0.5, y: 0 }, { x: -0.5, y: 0 }]
          clusterFemalePositions = [{ x: 1, y: -1 }, { x: 1.5, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1.5, y: 0 }, { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 0, y: -2 }]
          break
        }
      }
    }
  }

  const isCluster = clusterMaleSet !== null

  // ---------- 聚簇坐标固化 ----------
  let clusterShiftX = 0, clusterShiftY = 0
  let preOccupiedFine = null
  let clusterFixedMales = null
  let fixedFemalesFine = null

  if (isCluster) {
    const clusterFemArr = Array.from(clusterFemaleSet)
    const clusterAllCoords = clusterMaleCoords.slice()
    for (let ci = 0; ci < Math.min(clusterFemArr.length, clusterFemalePositions.length); ci++) clusterAllCoords.push(clusterFemalePositions[ci])
    const cMinX = Math.min(...clusterAllCoords.map((c) => c.x))
    const cMinY = Math.min(...clusterAllCoords.map((c) => c.y))
    clusterShiftX = cMinX < 0 ? Math.ceil(-cMinX) : 0
    clusterShiftY = cMinY < 0 ? Math.ceil(-cMinY) : 0
    const shiftedAll = clusterAllCoords.map((c) => ({ x: c.x + clusterShiftX, y: c.y + clusterShiftY }))
    preOccupiedFine = clusterToBlockedFineCells(shiftedAll)

    const cmArr = Array.from(clusterMaleSet)
    clusterFixedMales = cmArr.map((cmi, i) => ({
      idx: cmi, species: maleSlots[cmi].species,
      fineX: Math.round((clusterMaleCoords[i].x + clusterShiftX) * 2),
      fineY: Math.round((clusterMaleCoords[i].y + clusterShiftY) * 2),
      realX: clusterMaleCoords[i].x + clusterShiftX,
      realY: clusterMaleCoords[i].y + clusterShiftY,
    }))

    fixedFemalesFine = []
    for (let fi2 = 0; fi2 < Math.min(clusterFemArr.length, clusterFemalePositions.length); fi2++) {
      fixedFemalesFine.push({
        species: coveredFemales[clusterFemArr[fi2]].species,
        eggGroups: coveredFemales[clusterFemArr[fi2]].eggGroups,
        fineX: Math.round((clusterFemalePositions[fi2].x + clusterShiftX) * 2),
        fineY: Math.round((clusterFemalePositions[fi2].y + clusterShiftY) * 2),
      })
    }
  }

  // ---------- 子问题 ----------
  const subMales = isCluster ? males.filter((m) => !clusterMaleSet.has(m.idx)) : males
  const subFemales = isCluster ? coveredFemales.filter((_, fi) => !clusterFemaleSet.has(fi)) : coveredFemales

  const subMaleCompatCount = new Array(subMales.length).fill(0)
  subFemales.forEach((fi) => { subMales.forEach((m, mi) => { if (compatible(m, fi)) subMaleCompatCount[mi]++ }) })

  const subMaleUniqueCount = new Array(subMales.length).fill(0)
  subFemales.forEach((fi) => {
    const compatMales = []
    subMales.forEach((m, mi) => { if (compatible(m, fi)) compatMales.push(mi) })
    if (compatMales.length === 1) subMaleUniqueCount[compatMales[0]]++
  })


  const buildNearbyTargets = (level) => subMales.map((_, mi) => subMaleCompatCount[mi] >= 4 ? Math.min(level, subMaleCompatCount[mi]) : 0)

  // ===== 确定性摆放：2 雄聚簇（对齐旧 tryDeterministicPlacement2Male）=====
  function tryDeterministicPlacement2Male() {
    if (clusterMaleSet.size !== 2) return null
    if (subMales.length === 0 && subFemales.length === 0) return { maleCoords: [], femaleCoords: [] }
    const shiftX = clusterShiftX, shiftY = clusterShiftY

    const clusterFemSpecies = new Set()
    clusterFemaleSet.forEach((fi) => clusterFemSpecies.add(coveredFemales[fi].species))
    const hasCommonWithClusterFemales = (mEggGroups) => {
      for (const fs of clusterFemSpecies) {
        const f = coveredFemales.find((cf) => cf.species === fs)
        if (f && hasCommonGroup(mEggGroups, f.eggGroups)) return true
      }
      return false
    }

    // ★双向唯一依赖：雌性视角(subMaleUniqueCount>0) 或 雄性视角(subMaleCompatCount===1)
    const uniqueDepMales = []
    subMales.forEach((m, mi) => {
      if (subMaleUniqueCount[mi] > 0 || subMaleCompatCount[mi] === 1) {
        uniqueDepMales.push({ mi, count: subMaleUniqueCount[mi] })
      }
    })
    uniqueDepMales.sort((a, b) => b.count - a.count)

    if (uniqueDepMales.length > 0) {
      const udm = uniqueDepMales[0]
      const maleHasCommon = hasCommonWithClusterFemales(subMales[udm.mi].eggGroups)
      let depFemales = [], otherFemales = []
      subFemales.forEach((fi, fiIdx) => {
        const compatSubMales = []
        subMales.forEach((m, mi) => { if (compatible(m, fi)) compatSubMales.push(mi) })
        if (compatSubMales.length === 1 && compatSubMales[0] === udm.mi) depFemales.push(fiIdx)
        else otherFemales.push(fiIdx)
      })
      // ★雄性视角唯一依赖：udm 只能配 1 只雌性，那只雌性也视为依赖雌性（距离=1）
      if (subMaleCompatCount[udm.mi] === 1) {
        subFemales.forEach((fi, fiIdx) => {
          if (compatible(subMales[udm.mi], fi) && !depFemales.includes(fiIdx)) {
            depFemales.push(fiIdx)
            otherFemales = otherFemales.filter((x) => x !== fiIdx)
          }
        })
      }
      const otherMales = []
      subMales.forEach((m, mi) => { if (mi !== udm.mi) otherMales.push(mi) })
      const depCount = depFemales.length

      if (depCount >= 1 && depCount <= 2) {
        const mCoords = new Array(subMales.length)
        const fCoords = new Array(subFemales.length)
        let femaleSlots
        if (maleHasCommon) {
          mCoords[udm.mi] = { x: -0.5 + shiftX, y: -1 + shiftY }
          femaleSlots = [{ x: -0.5, y: -2 }, { x: -1.5, y: -1 }, { x: -1.5, y: 0 }]
        } else {
          mCoords[udm.mi] = { x: 0 + shiftX, y: -1 + shiftY }
          femaleSlots = [{ x: 0, y: -2 }, { x: -1, y: -1 }, { x: -1.5, y: 0 }]
        }
        const allFemOrder = depFemales.concat(otherFemales)
        if (allFemOrder.length > femaleSlots.length) return null
        for (let afi = 0; afi < allFemOrder.length; afi++) {
          fCoords[allFemOrder[afi]] = { x: femaleSlots[afi].x + shiftX, y: femaleSlots[afi].y + shiftY }
        }
        if (otherMales.length > 0) {
          const occupied = new Set()
          occupied.add((mCoords[udm.mi].x - shiftX) + ',' + (mCoords[udm.mi].y - shiftY))
          allFemOrder.forEach((fiIdx) => { if (fCoords[fiIdx]) occupied.add((fCoords[fiIdx].x - shiftX) + ',' + (fCoords[fiIdx].y - shiftY)) })
          const extraSlots = [{ x: -1.5, y: 0 }, { x: 1, y: 1 }]
          const avail = extraSlots.filter((s) => !occupied.has(s.x + ',' + s.y))
          if (otherMales.length > avail.length) return null
          for (let oi = 0; oi < otherMales.length; oi++) mCoords[otherMales[oi]] = { x: avail[oi].x + shiftX, y: avail[oi].y + shiftY }
        }
        return { maleCoords: mCoords, femaleCoords: fCoords }
      }

      if (depCount === 3) {
        if (otherMales.length > 0) return null
        if (otherFemales.length > 0) return null
        const mCoords3 = new Array(subMales.length)
        const fCoords3 = new Array(subFemales.length)
        mCoords3[udm.mi] = { x: -1.5 + shiftX, y: 0 + shiftY }
        const slots3 = [{ x: -1.5, y: -1 }, { x: -2.5, y: 0 }, { x: -2, y: 1 }]
        for (let i3 = 0; i3 < 3; i3++) fCoords3[depFemales[i3]] = { x: slots3[i3].x + shiftX, y: slots3[i3].y + shiftY }
        return { maleCoords: mCoords3, femaleCoords: fCoords3 }
      }
      return null
    }

    if (subMales.length === 1 && subFemales.length === 0) {
      const mCoords1 = new Array(1)
      mCoords1[0] = { x: -2.5 + shiftX, y: 0 + shiftY }
      return { maleCoords: mCoords1, femaleCoords: [] }
    }

    if (subMales.length + subFemales.length > 5) return null
    const mCoordsC3 = new Array(subMales.length)
    const fCoordsC3 = new Array(subFemales.length)
    let malePlaceSlots
    if (subMales.length === 3 && subFemales.length === 0) {
      malePlaceSlots = [{ x: -0.5, y: -1 }, { x: -1.5, y: 0 }, { x: 2, y: 1 }]
    } else {
      malePlaceSlots = [{ x: -0.5, y: -1 }, { x: -1.5, y: 0 }, { x: 1, y: 1 }]
    }
    const femalePlaceSlots = [{ x: -1.5, y: -1 }, { x: -1, y: -2 }, { x: -2, y: -2 }, { x: 0, y: -2 }, { x: -2.5, y: -1 }, { x: -0.5, y: -2.5 }]

    const sortedMaleIdxs = Array.from({ length: subMales.length }, (_, i) => i).sort((a, b) =>
      (hasCommonWithClusterFemales(subMales[a].eggGroups) ? 0 : 1) - (hasCommonWithClusterFemales(subMales[b].eggGroups) ? 0 : 1))
    for (let si3 = 0; si3 < sortedMaleIdxs.length; si3++) mCoordsC3[sortedMaleIdxs[si3]] = { x: malePlaceSlots[si3].x + shiftX, y: malePlaceSlots[si3].y + shiftY }
    for (let fiC3 = 0; fiC3 < subFemales.length && fiC3 < femalePlaceSlots.length; fiC3++) fCoordsC3[fiC3] = { x: femalePlaceSlots[fiC3].x + shiftX, y: femalePlaceSlots[fiC3].y + shiftY }

    return { maleCoords: mCoordsC3, femaleCoords: fCoordsC3 }
  }

  // ===== 确定性摆放：3 雄聚簇（对齐旧 tryDeterministicPlacement3Male）=====
  function tryDeterministicPlacement3Male() {
    if (clusterMaleSet.size !== 3) return null
    const totalRemaining = subMales.length + subFemales.length
    if (totalRemaining === 0) return { maleCoords: [], femaleCoords: [] }
    const shiftX = clusterShiftX, shiftY = clusterShiftY

    // 剩余精灵可选坐标（按顺序）。
    // ★三聚合带入 7 只雌性时，第 7 槽 { x: -0.5, y: 1 } 已被聚簇雌性占用，剩余精灵不可放入，
    //   故从可选槽位中剔除该坐标（此时剩余槽位只剩 3 个）
    const allSlots = clusterFemaleSet.size === 7
      ? [{ x: -1.5, y: 1 }, { x: -0.5, y: 2 }, { x: -1.5, y: 2 }]
      : [{ x: -0.5, y: 1 }, { x: -1.5, y: 1 }, { x: -0.5, y: 2 }, { x: -1.5, y: 2 }]

    // 装不下就交给求解器兜底
    if (totalRemaining > allSlots.length) return null
    if (subMales.length > 2) return null

    const mCoords = new Array(subMales.length)
    const fCoords = new Array(subFemales.length)
    const used = allSlots.map(() => false)

    // 雄性优先按顺序填入前两个槽位
    for (let i = 0; i < subMales.length; i++) {
      mCoords[i] = { x: allSlots[i].x + shiftX, y: allSlots[i].y + shiftY }
      used[i] = true
    }

    // 雌性按顺序填入未被占用的槽位
    let fi = 0
    for (let s = 0; s < allSlots.length && fi < subFemales.length; s++) {
      if (!used[s]) {
        fCoords[fi] = { x: allSlots[s].x + shiftX, y: allSlots[s].y + shiftY }
        used[s] = true
        fi++
      }
    }

    return { maleCoords: mCoords, femaleCoords: fCoords }
  }

  let best = null, bestArea = Infinity, found = 0
  const strategyList = [{ strict: true, level: 3 }, { strict: true, level: 2 }, { strict: false, level: 3 }, { strict: false, level: 2 }]
  const solveAttempts = (subMales.length + subFemales.length) > 7 ? 3 : 1

  if (isCluster) {
    // ★先尝试确定性摆放
    if (clusterMaleSet.size === 2) {
      const detPl = tryDeterministicPlacement2Male()
      if (detPl) best = detPl
    }
    if (!best && clusterMaleSet.size === 3) {
      const detPl3 = tryDeterministicPlacement3Male()
      if (detPl3) best = detPl3
    }

    if (!best) {
      // 聚簇模式：细网格求解
      for (const strategy of strategyList) {
        const targets = buildNearbyTargets(strategy.level)
        const fem = buildFemaleEntries(subFemales, subMales, strategy.strict, subMaleCompatCount, subMaleUniqueCount, true)
        if (clusterFixedMales) {
          fem.forEach((f) => {
            clusterFixedMales.forEach((fm) => {
              if (hasCommonGroup(eggGroupsOf(fm.species), f.eggGroups)) {
                f.constraints.push({ isFixed: true, fixedX: fm.fineX, fixedY: fm.fineY, minDist: 2, maxDist: 8 })
              }
            })
          })
        }
        for (let t = 0; t < 200 && best === null; t++) {
          const pl = solvePlacementFine(fem, subMales, targets, subMaleCompatCount, subMaleUniqueCount, preOccupiedFine, fixedFemalesFine)
          if (pl) {
            let minX = GRID_SIZE, maxX = 0, minY = GRID_SIZE, maxY = 0
            pl.maleCoords.forEach((c) => { minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x); minY = Math.min(minY, c.y); maxY = Math.max(maxY, c.y) })
            pl.femaleCoords.forEach((c) => { minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x); minY = Math.min(minY, c.y); maxY = Math.max(maxY, c.y) })
            const area = (maxX - minX + 1) * (maxY - minY + 1)
            if (area < bestArea) { bestArea = area; best = pl }
          }
        }
        if (best) break
      }

      // fallback：最小封锁
      if (!best && preOccupiedFine) {
        const minimalOccupied = new Set()
        clusterFixedMales.forEach((fm) => {
          for (let dfx = -1; dfx <= 1; dfx++) for (let dfy = -1; dfy <= 1; dfy++) {
            const nfx = fm.fineX + dfx, nfy = fm.fineY + dfy
            if (nfx >= 0 && nfx <= FINE_GRID && nfy >= 0 && nfy <= FINE_GRID) minimalOccupied.add(nfy * (FINE_GRID + 1) + nfx)
          }
        })
        fixedFemalesFine.forEach((ff) => {
          for (let dfx = -1; dfx <= 1; dfx++) for (let dfy = -1; dfy <= 1; dfy++) {
            const nfx = ff.fineX + dfx, nfy = ff.fineY + dfy
            if (nfx >= 0 && nfx <= FINE_GRID && nfy >= 0 && nfy <= FINE_GRID) minimalOccupied.add(nfy * (FINE_GRID + 1) + nfx)
          }
        })
        for (const strat of strategyList) {
          const tgt = buildNearbyTargets(strat.level)
          const femM = buildFemaleEntries(subFemales, subMales, strat.strict, subMaleCompatCount, subMaleUniqueCount, true)
          if (clusterFixedMales) {
            femM.forEach((f) => {
              clusterFixedMales.forEach((fm) => {
                if (hasCommonGroup(eggGroupsOf(fm.species), f.eggGroups)) {
                  f.constraints.push({ isFixed: true, fixedX: fm.fineX, fixedY: fm.fineY, minDist: 2, maxDist: 8 })
                }
              })
            })
          }
          for (let t2 = 0; t2 < 200 && best === null; t2++) {
            const plM = solvePlacementFine(femM, subMales, tgt, subMaleCompatCount, subMaleUniqueCount, minimalOccupied, fixedFemalesFine)
            if (plM) {
              let mnX = GRID_SIZE, mxX = 0, mnY = GRID_SIZE, mxY = 0
              plM.maleCoords.forEach((c) => { mnX = Math.min(mnX, c.x); mxX = Math.max(mxX, c.x); mnY = Math.min(mnY, c.y); mxY = Math.max(mxY, c.y) })
              plM.femaleCoords.forEach((c) => { mnX = Math.min(mnX, c.x); mxX = Math.max(mxX, c.x); mnY = Math.min(mnY, c.y); mxY = Math.max(mxY, c.y) })
              const ar = (mxX - mnX + 1) * (mxY - mnY + 1)
              if (ar < bestArea) { bestArea = ar; best = plM }
            }
          }
          if (best) break
        }
      }
    }
  } else {
    // 非聚簇模式：整数格求解
    for (const stratN of strategyList) {
      const tgtN = buildNearbyTargets(stratN.level)
      const femN = buildFemaleEntries(subFemales, subMales, stratN.strict, subMaleCompatCount, subMaleUniqueCount, false)
      for (let t3 = 0; t3 < 200 && found < solveAttempts; t3++) {
        const plN = solvePlacement(femN, subMales, tgtN, subMaleCompatCount, subMaleUniqueCount, null)
        if (plN) {
          const cp = compactPlacement(plN)
          found++
          let nX = GRID_SIZE, xX = 0, nY = GRID_SIZE, xY = 0
          cp.maleCoords.forEach((c) => { nX = Math.min(nX, c.x); xX = Math.max(xX, c.x); nY = Math.min(nY, c.y); xY = Math.max(xY, c.y) })
          cp.femaleCoords.forEach((c) => { nX = Math.min(nX, c.x); xX = Math.max(xX, c.x); nY = Math.min(nY, c.y); xY = Math.max(xY, c.y) })
          const arN = (xX - nX + 1) * (xY - nY + 1)
          if (arN < bestArea) { bestArea = arN; best = cp }
        }
      }
      if (best) break
    }
  }



  if (!best) {
    if (subMales.length + subFemales.length === 0) best = { maleCoords: [], femaleCoords: [] }
    else return
  }

  // ---------- 合并坐标 ----------
  // ---------- 合并坐标（聚簇坐标 + 子问题坐标统一到同一坐标系） ----------
  if (isCluster) {
    const mergedMaleCoords = new Array(males.length)
    subMales.forEach((m, i) => { mergedMaleCoords[m.idx] = best.maleCoords[i] })
    clusterFixedMales.forEach((fm) => { mergedMaleCoords[fm.idx] = { x: fm.realX, y: fm.realY } })

    const mergedFemaleCoords = new Array(coveredFemales.length)
    subFemales.forEach((sf, i) => {
      const origIdx = coveredFemales.findIndex((cf) => cf.id === sf.id)
      mergedFemaleCoords[origIdx] = best.femaleCoords[i]
    })
    const clusterFemArrSorted = Array.from(clusterFemaleSet).sort((a, b) => {
      const aC = subMales.some((m) => compatible(m, coveredFemales[a])) ? 1 : 0
      const bC = subMales.some((m) => compatible(m, coveredFemales[b])) ? 1 : 0
      return aC - bC
    })
    // ★仅三聚合坐标：把排好序的雌性顺序倒过来（其他聚合坐标保持原排序不变）
    const clusterFemOrder = clusterMaleSet.size === 3 ? clusterFemArrSorted.slice().reverse() : clusterFemArrSorted
    clusterFemOrder.forEach((fi, i) => { if (i < clusterFemalePositions.length) mergedFemaleCoords[fi] = { x: clusterFemalePositions[i].x + clusterShiftX, y: clusterFemalePositions[i].y + clusterShiftY } })

    // 先 compact：把「聚簇坐标 + 子问题坐标」平移到统一原点（同一坐标系）
    best = compactPlacement({ maleCoords: mergedMaleCoords, femaleCoords: mergedFemaleCoords })
  }
  // 非聚簇时 best 在求解循环里已经是 compact 过的（cp），无需再处理

  // ★关键修复：centerPlacement 作用在 compact 后的 best 上，而非未 compact 的 merged 坐标
  best = centerPlacement(best)

  coords.males = best.maleCoords
  coords.females = best.femaleCoords
}

// ===== 自动布局入口 =====
function autoLayout() {
  // 用方案数据哈希生成稳定种子
  let str = ''
  props.females.forEach((f) => { str += f.id + '|' + f.instanceId + ',' })
  props.males.forEach((m) => { str += m.species + '|' + (m.isShiny ? 1 : 0) + ',' })
  str += '|' + Date.now() + '|' + Math.random()
  reseed(str)
  generateLayout()
}

watch(visible, (v) => { if (v) autoLayout() }, { immediate: true })

// ===== 连线 =====
const lines = computed(() => {
  const arr = []
  coords.males.forEach((mc2, mi) => {
    const m = props.males[mi]
    if (!m) return
    coords.females.forEach((fc2, fi) => {
      const f = props.females[fi]
      if (!f) return
      if (!hasCommonGroup(m.eggGroups || eggGroupsOf(m.species), f.eggGroups || eggGroupsOf(f.id))) return
      const dx = Math.abs(mc2.x - fc2.x), dy = Math.abs(mc2.y - fc2.y)
      if (dx + dy > 2.5 || Math.max(dx, dy) > 2) return
      arr.push({ x1: mc2.x, y1: mc2.y, x2: fc2.x, y2: fc2.y })
    })
  })
  return arr
})

// ===== 拖拽 =====
let drag = null
let origCoord = null
let startX = 0
let startY = 0

function markCell(set, x, y) {
  const fx = Math.round(x * 2), fy = Math.round(y * 2)
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = fx + dx, ny = fy + dy
      if (nx >= 0 && nx <= FINE_GRID && ny >= 0 && ny <= FINE_GRID) set.add(cellKey(nx, ny))
    }
  }
}
function findNearestFree(x, y, occupied) {
  const fineX = Math.round(x * 2), fineY = Math.round(y * 2)
  if (!occupied.has(cellKey(fineX, fineY))) return { x: fineX / 2, y: fineY / 2 }
  const visited = new Set([cellKey(fineX, fineY)])
  const queue = [{ fx: fineX, fy: fineY }]
  let head = 0
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]]
  while (head < queue.length) {
    const cur = queue[head++]
    for (const [dx, dy] of dirs) {
      const nfx = cur.fx + dx, nfy = cur.fy + dy
      if (nfx < 1 || nfx > FINE_GRID - 1 || nfy < 1 || nfy > FINE_GRID - 1) continue
      const nk = cellKey(nfx, nfy)
      if (visited.has(nk)) continue
      visited.add(nk)
      if (!occupied.has(nk)) return { x: nfx / 2, y: nfy / 2 }
      queue.push({ fx: nfx, fy: nfy })
    }
  }
  return { x: fineX / 2, y: fineY / 2 }
}

function onStart(e, type, index) {
  e.preventDefault()
  drag = { type, index }
  const pt = type === 'female' ? coords.females : coords.males
  origCoord = { x: pt[index].x, y: pt[index].y }
  startX = e.clientX
  startY = e.clientY
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onEnd)
}

function onMove(e) {
  if (!drag) return
  e.preventDefault()
  const svg = svgRef.value
  if (!svg) return
  const rect = svg.getBoundingClientRect()
  const scale = rect.width / size
  const dx = origCoord.x + (e.clientX - startX) / (UNIT * scale)
  const dy = origCoord.y + (e.clientY - startY) / (UNIT * scale)
  const desiredX = clamp(Math.round(dx * 2) / 2, 0.5, GRID_SIZE - 0.5)
  const desiredY = clamp(Math.round(dy * 2) / 2, 0.5, GRID_SIZE - 0.5)
  const occupied = new Set()
  const skipGlobal = drag.type === 'female' ? coords.males.length + drag.index : drag.index
    ;[...coords.males, ...coords.females].forEach((p, gi) => { if (gi !== skipGlobal) markCell(occupied, p.x, p.y) })
  const pos = findNearestFree(desiredX, desiredY, occupied)
  const pt = drag.type === 'female' ? coords.females : coords.males
  pt[drag.index] = pos
}

function onEnd() {
  drag = null
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onEnd)
}
onUnmounted(() => {
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onEnd)
})

// ===== 展示辅助 =====
const bodyMedals = medalsData.body
const voiceMedals = medalsData.voice
const personalityMap = {}
Object.keys(personalitiesData).forEach((buff) => {
  personalitiesData[buff].forEach((p) => { personalityMap[p.name] = { buff, decrease: p.decrease } })
})
function personalityDetail(name) {
  const p = personalityMap[name]
  return p ? `+${p.buff}/-${p.decrease}` : ''
}
function eggGroupName(g) { return defines.egg_groups[String(g)] || String(g) }
function eggGroupNamesOf(list) {
  const g = Array.isArray(list) ? list : []
  if (!g.length) return '未知组'
  return g.map((x) => eggGroupName(x)).join('/')
}
function bodyIcon(id) {
  const m = bodyMedals.find((x) => x.id === id)
  return m ? `${m.icon}${m.name}` : id
}
function voiceIcon(id) {
  const m = voiceMedals.find((x) => x.id === id)
  return m ? `${m.icon}${m.name}` : id
}
function shortName(n) {
  if (!n) return ''
  return n.length > 4 ? n.slice(0, 4) + '…' : n
}
function femaleFeatures(f) {
  const arr = []
  if (f.personality) arr.push({ text: '🎭' + f.personality, color: '#c4b5fd' })
  if (f.medals?.body) arr.push({ text: bodyIcon(f.medals.body), color: '#93c5fd' })
  if (f.medals?.voice) arr.push({ text: voiceIcon(f.medals.voice), color: '#93c5fd' })
  return arr
}
function maleFeatures(m) {
  const arr = []
  if (m.personality) arr.push({ text: '🎭' + m.personality, color: '#c4b5fd' })
  if (m.medals?.body) arr.push({ text: bodyIcon(m.medals.body), color: '#93c5fd' })
  if (m.medals?.voice) arr.push({ text: voiceIcon(m.medals.voice), color: '#93c5fd' })
  return arr
}
function hasMedal(x) {
  return x.medals && (x.medals.body || x.medals.voice)
}
function femaleLabel(f) {
  const parts = ['♀ ' + (f.note || f.name)]
  parts.push('蛋组:' + eggGroupNamesOf(f.eggGroups || eggGroupsOf(f.id)))
  if (f.shiny) parts.push('✨异色')
  if (f.personality) parts.push('性格:' + f.personality + personalityDetail(f.personality))
  if (f.medals?.body) parts.push('身体奖牌:' + bodyIcon(f.medals.body))
  if (f.medals?.voice) parts.push('声音奖牌:' + voiceIcon(f.medals.voice))
  if (f.useAcademy) parts.push('学院窝')
  return parts.join('\n')
}
function maleLabel(m) {
  const parts = ['♂ ' + m.name]
  parts.push('蛋组:' + eggGroupNamesOf(m.eggGroups || eggGroupsOf(m.species)))
  if (m.isShiny) parts.push('✨异色')
  if (m.personality) parts.push('性格:' + m.personality + personalityDetail(m.personality))
  if (m.medals?.body) parts.push('身体奖牌:' + bodyIcon(m.medals.body))
  if (m.medals?.voice) parts.push('声音奖牌:' + voiceIcon(m.medals.voice))
  if (m.useAcademy) parts.push('学院窝')
  return parts.join('\n')
}

function exportPNG() {
  const svg = svgRef.value
  if (!svg) return
  const clone = svg.cloneNode(true)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', size)
  clone.setAttribute('height', size)
  const xml = new XMLSerializer().serializeToString(clone)
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = size * 2
    canvas.height = size * 2
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#241a4d'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    URL.revokeObjectURL(url)
    const a = document.createElement('a')
    a.download = '配窝位置图.png'
    a.href = canvas.toDataURL('image/png')
    a.click()
  }
  img.src = url
}

function close() { visible.value = false }
</script>

<style scoped>
.pm-mask {
  position: fixed;
  inset: 0;
  background: rgba(20, 14, 50, .72);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1300;
}

.pm-modal {
  width: 94%;
  max-width: 780px;
  background: rgba(40, 30, 90, .92);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, .22);
  border-radius: 18px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, .5);
}

.pm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pm-header h3 {
  margin: 0;
  color: #fff;
}

.pm-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pm-btn {
  padding: 7px 14px;
  border: 1px solid rgba(255, 255, 255, .25);
  border-radius: 8px;
  background: rgba(255, 255, 255, .1);
  color: #fff;
  cursor: pointer;
  font-size: 13px;
}

.pm-btn:hover {
  border-color: #c4b5fd;
}

.pm-close {
  border: none;
  background: none;
  color: rgba(255, 255, 255, .6);
  font-size: 22px;
  cursor: pointer;
  line-height: 1;
}

.pm-legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  color: rgba(255, 255, 255, .75);
  font-size: 12px;
}

.pm-legend .lg {
  display: flex;
  align-items: center;
  gap: 5px;
}

.pm-legend .hint {
  color: rgba(255, 255, 255, .5);
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  display: inline-block;
}

.dot.female {
  background: #f472b6;
}

.dot.male {
  background: #60a5fa;
}

.dot.academy {
  background: #34d399;
}

.dot.line {
  height: 3px;
  background: #34d399;
  border-radius: 2px;
}

.pm-canvas {
  display: flex;
  justify-content: center;
}

.pm-svg {
  width: 100%;
  max-width: 700px;
  height: auto;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.pm-node {
  cursor: grab;
}

.pm-node:active {
  cursor: grabbing;
}

.pm-node text {
  pointer-events: none;
  user-select: none;
}
</style>
