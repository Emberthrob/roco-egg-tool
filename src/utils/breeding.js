import petsData from '../data/pets.json'

const petMap = {}
petsData.forEach((p) => { petMap[p.id] = p })

export function getPetById(id) { return petMap[id] || null }
export function getPetName(id) { return petMap[id]?.name || String(id) }
export function getEggGroups(id) {
  const p = petMap[id]
  return p && Array.isArray(p.egg_groups) ? p.egg_groups : []
}
export function getEvolutionRoot(id) {
  const pet = petMap[id]
  if (!pet) return id
  let cur = pet
  let guard = 0
  while (cur.evolves_from_id != null && guard++ < 20) {
    const next = petMap[cur.evolves_from_id]
    if (!next) break
    cur = next
  }
  return cur.id
}

export function isSameSpecies(aId, bId) {
  return getEvolutionRoot(aId) === getEvolutionRoot(bId)
}

export function isBreedable(id) {
  const g = getEggGroups(id)
  return g.length > 0 && !g.includes(1)
}

export function loadInventory() {
  try {
    const raw = localStorage.getItem('roco-storage')
    if (raw) return JSON.parse(raw).inventory || []
  } catch (e) { }
  return []
}

// ===== 兼容性判断：蛋组有交集（未知组1不参与交配） =====
function groupsCompatible(a, b) {
  return a.some((g) => g !== 1 && b.includes(g))
}

let _compatibleMap = null
export function getCompatibleMap() {
  if (_compatibleMap) return _compatibleMap
  const map = new Map()
  petsData.forEach((p) => {
    const set = new Set()
    if (isBreedable(p.id)) {
      petsData.forEach((q) => {
        if (q.id === p.id || !isBreedable(q.id)) return
        if (p.egg_groups.some((g) => q.egg_groups.includes(g))) set.add(q.id)
      })
    }
    map.set(p.id, set)
  })
  _compatibleMap = map
  return map
}

export function isCompatible(aId, bId) {
  return (getCompatibleMap().get(aId) || new Set()).has(bId)
}

export function maleCovers(maleEggGroups, femaleEggGroups) {
  return groupsCompatible(maleEggGroups, femaleEggGroups)
}

// 雄性对雌性集合的「有效蛋组」：该蛋组至少能配到一只在场雌性
export function effectiveGroups(maleEggGroups, females) {
  const groups = new Set()
  maleEggGroups.forEach((g) => {
    if (females.some((f) => f.eggGroups.includes(g))) groups.add(g)
  })
  return [...groups]
}

// =====================================================================
// 核心升级：二分图最大匹配 + 均衡覆盖
// =====================================================================

// 匈牙利算法：返回最大匹配数 + 每只雄性配到的雌性下标（-1 = 闲置）
function hungarian(females, maleList) {
  const mk = maleList.length
  const mn = females.length
  const adj = maleList.map((m) => {
    const arr = []
    females.forEach((f, j) => {
      if (groupsCompatible(m.eggGroups, f.eggGroups)) arr.push(j)
    })
    return arr
  })
  const matchF = Array(mn).fill(-1)
  const matchM = Array(mk).fill(-1)
  const seen = new Array(mn)
  function dfs(u) {
    for (const v of adj[u]) {
      if (seen[v]) continue
      seen[v] = true
      if (matchF[v] === -1 || dfs(matchF[v])) {
        matchF[v] = u
        matchM[u] = v
        return true
      }
    }
    return false
  }
  let matched = 0
  for (let u = 0; u < mk; u++) { seen.fill(false); if (dfs(u)) matched++ }
  return { matched, matchM }
}

// 评估一个雄性集合：
//   priorityCovered = 被覆盖的「优先雌性」数
//   covered         = 被覆盖的雌性总数（去重）
//   matched         = 最大匹配数（能同时交配的对数，衡量「不闲置」）
//   totalCover      = 冗余覆盖量（所有雄性的覆盖数之和，衡量「接力能力」）
// 评估一个雄性集合（新增 minCover 均衡维度，应对「雌性退场、雄性接力」）
function evaluatePlan(females, maleList, priorityGroups) {
  const isPriority = (f) => priorityGroups.some((g) => f.eggGroups.includes(g))
  const coveredSet = new Set()
  const prioritySet = new Set()
  let totalCover = 0
  let minCover = maleList.length ? Infinity : 0

  maleList.forEach((m) => {
    let cover = 0
    females.forEach((f) => {
      if (groupsCompatible(m.eggGroups, f.eggGroups)) {
        coveredSet.add(f.instanceId)
        if (isPriority(f)) prioritySet.add(f.instanceId)
        totalCover++
        cover++
      }
    })
    if (cover < minCover) minCover = cover
  })
  if (!maleList.length) minCover = 0

  const { matched } = hungarian(females, maleList)
  return {
    priorityCovered: prioritySet.size, // 优先雌性覆盖数
    covered: coveredSet.size,          // 去重覆盖数（保证不漏配）
    matched,                           // 匹配饱和数（保证不闲置）
    minCover,                          // 最小覆盖数（保证均衡接力）★新增
    totalCover,                        // 冗余覆盖总量（保证通吃能力）
  }
}

function planScore(e) {
  return e.priorityCovered * 1e12
    + e.covered * 1e9
    + e.matched * 1e6
    + e.minCover * 100      // ★均衡度优先于冗余总量
    + e.totalCover * 1
}


// 均衡覆盖主算法：选 count 只雄性，保证覆盖最广、匹配饱和、接力能力最强
export function computeBalancedPlan(females, malePool, count, priorityGroups = []) {
  const pool = malePool.map((m, i) => ({ ...m, _idx: i }))
  const n = females.length
  const k = Math.min(count, pool.length)
  if (k === 0 || n === 0) return { selected: [], emptySlots: count }

  // ① 贪心构建初始解（覆盖优先 + 通吃偏好）
  const selected = []
  const usedIdx = new Set()
  const uncovered = new Set(females.map((f) => f.instanceId))
  for (let step = 0; step < k; step++) {
    let best = -1
    let bestScore = -Infinity
    for (let i = 0; i < pool.length; i++) {
      if (usedIdx.has(i)) continue
      const m = pool[i]
      let newCover = 0
      let totalCover = 0
      let priorityNew = 0
      females.forEach((f) => {
        if (groupsCompatible(m.eggGroups, f.eggGroups)) {
          totalCover++
          if (uncovered.has(f.instanceId)) {
            newCover++
            if (priorityGroups.some((g) => f.eggGroups.includes(g))) priorityNew++
          }
        }
      })
      const s = priorityNew * 1e6 + newCover * 1e4 + totalCover
      if (s > bestScore) { bestScore = s; best = i }
    }
    if (best === -1) break
    usedIdx.add(best)
    const m = pool[best]
    selected.push(m)
    females.forEach((f) => {
      if (groupsCompatible(m.eggGroups, f.eggGroups)) uncovered.delete(f.instanceId)
    })
  }

  // ② 局部搜索：尝试替换每一只，评分提升则接受
  let current = selected.map((m) => ({ ...m }))
  let curScore = planScore(evaluatePlan(females, current, priorityGroups))
  let improved = true
  let guard = 0
  while (improved && guard++ < 300) {
    improved = false
    for (let si = 0; si < current.length; si++) {
      const oldIdx = current[si]._idx
      for (let pi = 0; pi < pool.length; pi++) {
        if (pi === oldIdx) continue
        if (current.some((c, ci) => ci !== si && c._idx === pi)) continue
        const trial = current.map((c, ci) => (ci === si ? pool[pi] : c))
        const s = planScore(evaluatePlan(females, trial, priorityGroups))
        if (s > curScore) {
          current = trial
          curScore = s
          improved = true
          break
        }
      }
      if (improved) break
    }
  }

  // ③ 移除闲置雄性：若匹配无法饱和，优先移除「覆盖最少、且覆盖可被他人替代」的
  while (current.length > 0) {
    const { matched, matchM } = hungarian(females, current)
    if (matched === current.length) break
    let worstIdx = -1
    let worstCover = Infinity
    let worstRedundancy = -Infinity
    current.forEach((m, idx) => {
      if (matchM[idx] !== -1) return
      let cover = 0
      let redundancy = 0
      females.forEach((f) => {
        if (groupsCompatible(m.eggGroups, f.eggGroups)) {
          cover++
          const otherCovers = current.some((o, j) => j !== idx && groupsCompatible(o.eggGroups, f.eggGroups))
          if (otherCovers) redundancy++
        }
      })
      if (cover < worstCover || (cover === worstCover && redundancy > worstRedundancy)) {
        worstCover = cover
        worstRedundancy = redundancy
        worstIdx = idx
      }
    })
    if (worstIdx === -1) break
    current.splice(worstIdx, 1)
  }

  const selectedClean = current.map((m) => {
    const { _idx, ...rest } = m
    return rest
  })
  return { selected: selectedClean, emptySlots: count - selectedClean.length }
}

// 情况B：性格筛选下，学院窝放「主角」，其余避开主角覆盖的雌性蛋组
function generateWithAcademyMain({ females, malePool, count, priorityGroups }) {
  const groupKey = (m) => [...m.eggGroups].sort((a, b) => a - b).join(',')
  const seen = new Set()
  const candidates = []
  malePool.forEach((m) => {
    const key = groupKey(m)
    if (!seen.has(key)) { seen.add(key); candidates.push(m) }
  })

  let best = null
  for (const cand of candidates) {
    const coveredFemales = females.filter((f) => groupsCompatible(cand.eggGroups, f.eggGroups))
    const remainingFemales = females.filter((f) => !groupsCompatible(cand.eggGroups, f.eggGroups))
    const coveredGroups = new Set()
    coveredFemales.forEach((f) => f.eggGroups.forEach((g) => coveredGroups.add(g)))

    // 其他雄性避开主角覆盖的蛋组
    const restPool = malePool.filter((m) => {
      if (m === cand) return false
      return !m.eggGroups.some((g) => coveredGroups.has(g))
    })

    const need = count - 1
    const restPlan = computeBalancedPlan(remainingFemales, restPool, need, priorityGroups)
    const males = [
      { ...cand, useAcademy: true },
      ...restPlan.selected.map((m) => ({ ...m, useAcademy: false })),
    ]

    const coveredAll = new Set()
    males.forEach((m) => {
      females.forEach((f) => {
        if (groupsCompatible(m.eggGroups, f.eggGroups)) coveredAll.add(f.instanceId)
      })
    })
    const fullCover = coveredAll.size === females.length
    if (fullCover) {
      return { males, coveredGroups: [...coveredGroups], fullCover: true }
    }
    const coveredCount = coveredAll.size
    if (!best || coveredCount > best.coveredCount) {
      best = { males, coveredGroups: [...coveredGroups], coveredCount }
    }
  }

  if (best) return { ...best, fullCover: false }
  const plan = computeBalancedPlan(females, malePool, count, priorityGroups)
  return {
    males: plan.selected.map((m) => ({ ...m, useAcademy: false })),
    coveredGroups: [],
    fullCover: false,
  }
}

// 重新计算覆盖结果（生成 / 替换后复用）
export function recomputeCoverage(females, maleSlots) {
  const coveredIds = new Set()
  const maleCoverDetails = maleSlots.map((m) => {
    const covered = females.filter((f) => groupsCompatible(m.eggGroups, f.eggGroups))
    covered.forEach((f) => coveredIds.add(f.instanceId))
    return {
      uid: m.uid,
      species: m.species,
      name: m.name,
      eggGroups: m.eggGroups,
      isShiny: m.isShiny,
      personality: m.personality,
      medals: m.medals,
      useAcademy: m.useAcademy,
      lockedForIds: [],  // ★恢复：唯一依赖的雌性 instanceId
      lockedNames: [],   // ★恢复：唯一依赖的雌性名字（直接用于展示）
      coveredIds: covered.map((f) => ({
        id: f.id,
        name: f.name,
        isShiny: f.isShiny,
        personality: f.personality,
        medals: f.medals,
        instanceId: f.instanceId,
      })),
    }
  })

  // ★唯一依赖计算（双向视角，去重）
  // 视角1：雌性只能被方案中「唯一一只」雄性覆盖 → 锁定
  females.forEach((f) => {
    const coveringIdx = []
    maleCoverDetails.forEach((md, idx) => {
      if (md.coveredIds.some((c) => c.instanceId === f.instanceId)) coveringIdx.push(idx)
    })
    if (coveringIdx.length === 1) {
      const md = maleCoverDetails[coveringIdx[0]]
      if (!md.lockedForIds.includes(f.instanceId)) {
        md.lockedForIds.push(f.instanceId)
        md.lockedNames.push(f.name)
      }
    }
  })
  // 视角2：雄性只能覆盖场上「唯一一只」雌性 → 锁定
  maleCoverDetails.forEach((md) => {
    if (md.coveredIds.length === 1) {
      const c = md.coveredIds[0]
      if (!md.lockedForIds.includes(c.instanceId)) {
        md.lockedForIds.push(c.instanceId)
        md.lockedNames.push(c.name)
      }
    }
  })


  const uncoveredFemales = females.filter((f) => !coveredIds.has(f.instanceId))

  let academyCoveredGroups = []
  const academyMale = maleSlots.find((m) => m.useAcademy)
  if (academyMale) {
    const groups = new Set()
    females.forEach((f) => {
      if (groupsCompatible(academyMale.eggGroups, f.eggGroups)) f.eggGroups.forEach((g) => groups.add(g))
    })
    academyCoveredGroups = [...groups]
  }
  return { maleCoverDetails, uncoveredFemales, academyCoveredGroups }
}


export function computeRecommendation(opts) {
  const {
    females,
    maleStock,
    normalNestCount,
    academyCount,
    priorityGroups = [],
    hasPersonalityFilter = false,
  } = opts

  const femaleCount = females.length
  const totalNests = normalNestCount + academyCount
  if (femaleCount === 0) return { error: '请先添加雌性精灵。' }
  if (totalNests < femaleCount + 1) return { error: '雌性数量必须少于窝数 - 1。' }
  const requiredMales = Math.min(totalNests - femaleCount, femaleCount)
  if (requiredMales <= 0) return { error: '没有可用的雄性窝位。' }
  if (!maleStock.length) return { error: '没有符合条件的雄性精灵。' }

  const hasAcademy = academyCount > 0
  const femaleAcademyUsed = females.some((f) => f.useAcademy)

  let maleSlots = []
  let academyReleased = false

  if (hasAcademy && !femaleAcademyUsed && hasPersonalityFilter) {
    // 情况B：性格筛选，学院窝放主角
    const r = generateWithAcademyMain({ females, malePool: maleStock, count: requiredMales, priorityGroups })
    maleSlots = r.males
    academyReleased = false
  } else {
    // 情况A / 无学院窝 / 雌性已占用学院窝
    const plan = computeBalancedPlan(females, maleStock, requiredMales, priorityGroups)
    maleSlots = plan.selected
    if (hasAcademy && !femaleAcademyUsed) {
      const normalCapacity = normalNestCount - femaleCount
      if (requiredMales <= normalCapacity) {
        academyReleased = true
        maleSlots.forEach((m) => { m.useAcademy = false })
      } else {
        academyReleased = false
        maleSlots.forEach((m, i) => { m.useAcademy = i >= normalCapacity })
      }
    }
  }

  const emptySlots = 0 // 归还多余窝后方案内无空窝（雄性缺口由 uncoveredFemales 提示）
  // ★普通窝归还：生成方案后，实际用到的普通窝数 = 雌性数 + 推荐雄数 - 学院窝实际占用数
  const academyActuallyUsed = (hasAcademy && (femaleAcademyUsed || maleSlots.some((m) => m.useAcademy))) ? 1 : 0
  const finalNormalNests = femaleCount + maleSlots.length - academyActuallyUsed
  const normalReleased = Math.max(0, normalNestCount - finalNormalNests)
  return { maleSlots, emptySlots, academyReleased, normalReleased }
}

