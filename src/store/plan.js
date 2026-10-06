import { reactive, watch } from 'vue'
import petsData from '../data/pets.json'
import { loadInventory, getEggGroups } from '../utils/breeding'

const PLAN_KEY = 'roco-plan'
function loadPlan() {
  try {
    const raw = localStorage.getItem(PLAN_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      return {
        normalNests: data.normalNests ?? 10,
        academyNests: data.academyNests ?? 0,
        planEntries: data.planEntries || [],
      }
    }
  } catch (e) {}
  return { normalNests: 10, academyNests: 0, planEntries: [] }
}

export const planState = reactive(loadPlan())

watch(planState, () => {
  localStorage.setItem(PLAN_KEY, JSON.stringify({
    normalNests: planState.normalNests,
    academyNests: planState.academyNests,
    planEntries: planState.planEntries,
  }))
}, { deep: true })

let planSeq = 1
export function nextPlanUid() { return 'plan-' + (planSeq++) }

// ===== 通用判断 =====
export function groupsCompatible(a, b) {
  return (a || []).some((g) => g !== 1 && (b || []).includes(g))
}
export function isBreedablePet(groups) {
  return (groups || []).length > 0 && !groups.includes(1)
}

// ===== 培养方向判断 =====
// 两个方向：personality（性格）、medal（身体奖牌 + 声音奖牌）
// 某方向中所有特征都满足才算满足该方向；特征为空 = 无要求
export function directionStatus(pet, target, direction) {
  if (direction === 'personality') {
    if (!target.personality) return true
    return pet.personality === target.personality
  }
  const hasBody = !!target.medals?.body
  const hasVoice = !!target.medals?.voice
  if (!hasBody && !hasVoice) return true
  let ok = true
  if (hasBody && pet.medals?.body !== target.medals.body) ok = false
  if (hasVoice && pet.medals?.voice !== target.medals.voice) ok = false
  return ok
}
export function isPerfect(pet, target) {
  return directionStatus(pet, target, 'personality') && directionStatus(pet, target, 'medal')
}
function anyDirection(pet, target) {
  return directionStatus(pet, target, 'personality') || directionStatus(pet, target, 'medal')
}

// ===== 最小蛋组集合（位掩码 BFS）=====
export function minEggGroupSet(entries) {
  const n = entries.length
  const allGroups = new Set()
  entries.forEach((e) => e.eggGroups.forEach((g) => { if (g !== 1) allGroups.add(g) }))
  const groups = [...allGroups]
  if (groups.length === 0) return { x: 0, groupSet: new Set() }

  const masks = groups.map((g) => {
    let m = 0
    entries.forEach((e, i) => { if (e.eggGroups.includes(g)) m |= (1 << i) })
    return m
  })
  const full = (1 << n) - 1
  const dist = new Array(1 << n).fill(-1)
  const prev = new Array(1 << n).fill(-1)
  const prevGroup = new Array(1 << n).fill(-1)
  dist[0] = 0
  const queue = [0]
  let head = 0
  while (head < queue.length) {
    const cur = queue[head++]
    if (cur === full) break
    for (let gi = 0; gi < groups.length; gi++) {
      const next = cur | masks[gi]
      if (next === cur) continue
      if (dist[next] === -1) {
        dist[next] = dist[cur] + 1
        prev[next] = cur
        prevGroup[next] = gi
        queue.push(next)
      }
    }
  }
  const x = dist[full] === -1 ? Infinity : dist[full]
  const groupSet = new Set()
  if (x !== Infinity) {
    let cur = full
    while (cur !== 0) {
      const gi = prevGroup[cur]
      if (gi === -1) break
      groupSet.add(groups[gi])
      cur = prev[cur]
    }
  }
  return { x, groupSet }
}

// ===== 关卡检测（新规则）=====
// 第一关：仓库中是否存在满足目标精灵至少一个培养方向的精灵
export function checkLevel1(entry) {
  const inventory = loadInventory()
  const has = inventory.some((p) =>
    isBreedablePet(p.eggGroups || getEggGroups(p.id)) && anyDirection(p, entry)
  )
  if (!has) {
    return { ok: false, msg: '仓库中没有满足「' + entry.name + '」任一培养方向（性格方向或奖牌方向）的精灵。' }
  }
  return { ok: true }
}

// 第二关：第一关满足条件的精灵与目标精灵，需满足共同蛋组或存在桥接种族
export function checkLevel2(entry) {
  const inventory = loadInventory()
  const candidates = inventory.filter((p) =>
    isBreedablePet(p.eggGroups || getEggGroups(p.id)) && anyDirection(p, entry)
  )
  if (!candidates.length) {
    return { ok: false, msg: '仓库中没有满足培养方向的精灵。' }
  }
  const hasCommon = candidates.some((p) =>
    groupsCompatible(p.eggGroups || getEggGroups(p.id), entry.eggGroups)
  )
  if (hasCommon) return { ok: true }

  const hasBridge = petsData.some((sp) => {
    const tags = Array.isArray(sp.special_tags) ? sp.special_tags : []
    if (tags.some((t) => t === 1001 || t === 1002)) return false
    if (!isBreedablePet(sp.egg_groups)) return false
    const linksTarget = groupsCompatible(sp.egg_groups, entry.eggGroups)
    if (!linksTarget) return false
    return candidates.some((p) => groupsCompatible(sp.egg_groups, p.eggGroups || getEggGroups(p.id)))
  })
  if (!hasBridge) {
    return { ok: false, msg: '仓库中没有与「' + entry.name + '」可交配的精灵，也没有可作为桥梁的种族。' }
  }
  return { ok: true }
}

// 第三关：最小蛋组覆盖数 y = ceil(x/2)，剩余窝数 z，必须 y <= z
export function checkLevel3(entries, limit) {
  const { x } = minEggGroupSet(entries)
  const y = Math.ceil(x / 2)
  const z = limit - entries.length
  if (y > z) {
    return { ok: false, msg: `需要 ${y} 只雄性覆盖蛋组，但剩余窝位只有 ${z} 个（总窝 ${limit}）。` }
  }
  return { ok: true, y }
}

export function clearPlan() {
  planState.planEntries = []
  planState.normalNests = 10
  planState.academyNests = 0
}
