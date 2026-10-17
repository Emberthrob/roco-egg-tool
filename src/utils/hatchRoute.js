import petsData from '../data/pets.json'
import { loadInventory, getEggGroups, getCompatibleMap, getEvolutionRoot, getPetName } from './breeding'

const speciesById = {}
petsData.forEach((p) => { if (p.id != null && p.name) speciesById[p.id] = p })

export function genderRestriction(species) {
  const tags = Array.isArray(species?.special_tags) ? species.special_tags : []
  if (tags.includes(1001)) return 'male'
  if (tags.includes(1002)) return 'female'
  return null
}
export function canBeGender(species, g) {
  const r = genderRestriction(species)
  if (r) return r === g
  return true
}

export function groupsCompatible(a, b) {
  return (a || []).some((g) => g !== 1 && (b || []).includes(g))
}
export function isBreedable(groups) {
  return (groups || []).length > 0 && !groups.includes(1)
}

// 某个种族能否在「全图鉴蛋组图」中通过可交配链条最终与目标蛋组交配
// 某个种族到目标蛋组的最短可交配链距离（0 = 直接可配；Infinity = 不可达）
export function shortestDistanceToTarget(raceId, targetGroups) {
  const sp = speciesById[raceId]
  if (!sp) return Infinity
  const map = getCompatibleMap()
  const dist = new Map([[raceId, 0]])
  const queue = [raceId]
  while (queue.length) {
    const cur = queue.shift()
    const d = dist.get(cur)
    const curSp = speciesById[cur]
    if (curSp && groupsCompatible(curSp.egg_groups || [], targetGroups)) return d
    for (const nb of map.get(cur) || []) {
      if (dist.has(nb)) continue
      if (!canBeGender(speciesById[nb], 'male')) continue
      dist.set(nb, d + 1); queue.push(nb)
    }
  }
  return Infinity
}

export function canReachTarget(raceId, targetGroups) {
  const sp = speciesById[raceId]
  if (!sp) return false
  const map = getCompatibleMap()
  const visited = new Set([raceId])
  const queue = [raceId]
  while (queue.length) {
    const cur = queue.shift()
    const curSp = speciesById[cur]
    if (curSp && groupsCompatible(curSp.egg_groups || [], targetGroups)) return true
    for (const nb of map.get(cur) || []) {
      if (visited.has(nb)) continue
      if (!canBeGender(speciesById[nb], 'male')) continue
      visited.add(nb); queue.push(nb)
    }
  }
  return false
}

function dirC(pet, target) {
  return !target.personality || pet.personality === target.personality
}
function dirM(pet, target) {
  if (target.medals?.body && pet.medals?.body !== target.medals.body) return false
  if (target.medals?.voice && pet.medals?.voice !== target.medals.voice) return false
  return true
}
function dirB(pet, target) {
  return dirC(pet, target) && dirM(pet, target)
}

const DIR_LABEL = { c: 'C', m: 'M', b: 'B' }

// 优先复用已选用的雄性（uid 去重，不影响路线长度，仅在同性别/同方向内重排）
function preferUsed(list, usedMaleUids) {
  if (!usedMaleUids || !usedMaleUids.size) return list
  const used = list.filter((p) => p.uid && usedMaleUids.has(p.uid))
  const rest = list.filter((p) => !(p.uid && usedMaleUids.has(p.uid)))
  return [...used, ...rest]
}

let seq = 0
function makeBlock(type, title, opts) {
  return {
    id: 'b' + (++seq),
    type,
    title,
    note: opts.note || '',
    father: opts.father || null,
    mother: opts.mother || null,
    backcrossFather: opts.backcrossFather || null,
    backcrossMother: opts.backcrossMother || null,
    child: opts.child || null,
  }
}

// 真实仓库精灵节点
function petNode(pet, direction) {
  return {
    raceId: pet.id,
    uid: pet.uid || null,
    name: pet.name || speciesById[pet.id]?.name || String(pet.id),
    gender: pet.gender,
    personality: pet.personality || null,
    body: pet.medals?.body || null,
    voice: pet.medals?.voice || null,
    direction: direction || '',
    tag: '',
    placeholder: false,
    isUnknown: false,
  }
}

// 抽象载体节点：按方向补全目标特征
function carrierNode(raceId, gender, direction, target, opts = {}) {
  const sp = speciesById[raceId]
  const isC = direction === 'C' || direction === 'B'
  const isM = direction === 'M' || direction === 'B'
  return {
    raceId,
    name: opts.name || getPetName(getEvolutionRoot(raceId)) || opts.tag || String(raceId),
    gender,
    personality: isC ? (target.personality || null) : null,
    body: isM ? (target.medals?.body || null) : null,
    voice: isM ? (target.medals?.voice || null) : null,
    direction,
    tag: opts.tag || '',
    placeholder: !!opts.placeholder,
    isUnknown: false,
  }
}

// 目标精灵节点
function targetNode(target) {
  return {
    raceId: target.id,
    name: target.name,
    gender: null,
    personality: target.personality || null,
    body: target.medals?.body || null,
    voice: target.medals?.voice || null,
    direction: 'B',
    tag: '目标',
    placeholder: false,
    isUnknown: false,
  }
}

// 问号模块（缺失精灵占位）
function unknownNode(gender, role) {
  return {
    raceId: null,
    name: '?',
    gender,
    personality: null,
    body: null,
    voice: null,
    direction: '',
    tag: '',
    placeholder: true,
    isUnknown: true,
    missingRole: role,
    pseudo: false,
  }
}

// 已知种族缺失模块（黄色，显示种族名，可点击补录）
function missingNode(raceId, gender, role) {
  const sp = speciesById[raceId]
  return {
    raceId,
    uid: null,
    name: sp?.name || '?',
    gender,
    personality: null,
    body: null,
    voice: null,
    direction: '',
    tag: '',
    placeholder: true,
    isMissing: true,
    isUnknown: false,
    missingRole: role,
    pseudo: false,
  }
}

// 已知种族但特征未知（最终目标因父本缺失而特征未定）：黄色 + 种族名 + 问号特征
function unknownFeatureNode(raceId, gender, role) {
  const sp = speciesById[raceId]
  return {
    raceId,
    uid: null,
    name: sp?.name || '?',
    gender,
    personality: null,
    body: null,
    voice: null,
    featureUnknown: true,
    direction: '',
    tag: '',
    placeholder: true,
    isMissing: true,
    isUnknown: false,
    missingRole: role,
    pseudo: false,
  }
}

// 沿「拥有雌性的种族」图 BFS，找从 startRace 到与 targetGroups 可配种族的【最短】路径
function findShortestPath(startRace, targetGroups, genderPref = 'male', ownedFemaleRaces = new Set()) {
  const groupsOf = (id) => speciesById[id]?.egg_groups || []
  if (groupsCompatible(groupsOf(startRace), targetGroups)) return [startRace]
  const map = getCompatibleMap()
  const dist = new Map([[startRace, 0]])
  const missing = new Map([[startRace, 0]])
  const prev = new Map([[startRace, null]])
  const queue = [startRace]
  let bestEnd = null
  let bestMissing = Infinity
  let endDepth = Infinity
  while (queue.length) {
    const cur = queue.shift()
    const d = dist.get(cur)
    const m = missing.get(cur)
    if (d > endDepth) break
    const curG = groupsOf(cur)
    if (cur !== startRace && groupsCompatible(curG, targetGroups) && canBeGender(speciesById[cur], genderPref)) {
      if (d < endDepth || (d === endDepth && m < bestMissing)) {
        endDepth = d; bestEnd = cur; bestMissing = m
      }
      continue
    }
    for (const nb of map.get(cur) || []) {
      if (!canBeGender(speciesById[nb], 'male')) continue
      const nd = d + 1
      const nm = m + (ownedFemaleRaces.has(nb) ? 0 : 1)
      if (!dist.has(nb)) {
        dist.set(nb, nd); missing.set(nb, nm); prev.set(nb, cur); queue.push(nb)
      } else if (dist.get(nb) === nd && nm < missing.get(nb)) {
        missing.set(nb, nm); prev.set(nb, cur)
      }
    }
  }
  if (bestEnd == null) return null
  const path = []
  let c = bestEnd
  while (c != null) { path.unshift(c); c = prev.get(c) }
  return path
}

// 沿「拥有雌性的种族」贪心找最长链（每步选一个兼容的拥有雌性种族）
function findOwnedChain(startRace, raceGroups, ownedFemaleRaces) {
  const chain = [startRace]
  const used = new Set([startRace])
  let cur = startRace
  while (true) {
    let next = null
    for (const r of ownedFemaleRaces) {
      if (used.has(r)) continue
      if (!canBeGender(speciesById[r], 'male')) continue
      if (groupsCompatible(raceGroups[cur] || [], raceGroups[r] || [])) { next = r; break }
    }
    if (next == null) break
    chain.push(next)
    used.add(next)
    cur = next
  }
  return chain
}

function childFeature(fatherVal, motherVal, targetVal, required) {
  if (!required) return { value: null, status: 'noreq' }
  const fatherHas = fatherVal != null && fatherVal === targetVal
  const motherHas = motherVal != null && motherVal === targetVal
  if (fatherHas && motherHas) return { value: targetVal, status: 'shared' }
  if (fatherHas || motherHas) return { value: targetVal, status: 'inherit' }
  return { value: targetVal, status: 'none' }
}

// 中层：回交亲本副本（同列）+ 子代（异性，种族=母本）
// 子代特征：父母相同→绿色；无需求→"无需求"；否则黄色（有概率遗传）
function buildMiddleLayer(backcrossParent, father, mother, motherRace, target, motherUnknown = false) {
  const childGender = backcrossParent.gender === 'male' ? 'female' : 'male'
  let intermediate
  if (motherUnknown) {
    intermediate = unknownNode(childGender, 'child')
  } else {
    const sp = speciesById[motherRace]
    const pFeat = childFeature(father?.personality, mother?.personality, target.personality, !!target.personality)
    const bFeat = childFeature(father?.body, mother?.body, target.medals?.body, !!target.medals?.body)
    const vFeat = childFeature(father?.voice, mother?.voice, target.medals?.voice, !!target.medals?.voice)
    intermediate = {
      raceId: motherRace,
      name: getPetName(getEvolutionRoot(motherRace)) || '子代',
      gender: childGender,
      personality: pFeat.value,
      body: bFeat.value,
      voice: vFeat.value,
      featStatus: { personality: pFeat.status, body: bFeat.status, voice: vFeat.status },
      direction: '',
      tag: '子代',
      placeholder: false,
      isUnknown: false,
      isMiddleChild: true,
    }
  }
  const copy = { ...backcrossParent, tag: backcrossParent.tag ? backcrossParent.tag + '·回交' : '回交' }
  if (backcrossParent.gender === 'male') {
    return { backcrossFather: copy, backcrossMother: intermediate }
  }
  return { backcrossFather: intermediate, backcrossMother: copy }
}

// 为一个方向准备一只「目标性别、与 targetGroups 可配」的载体
function propagate(flag, genderPref, target, inv, targetGroups, ctx = {}) {
  const dirPets = inv.filter((p) => p[flag])
  if (!dirPets.length) return null

  const compatT = (g) => groupsCompatible(g, targetGroups)
  const dirLabel = DIR_LABEL[flag]
  const usedMaleUids = ctx.usedMaleUids || new Set()

  const direct = preferUsed(dirPets.filter((p) => p.gender === genderPref && compatT(p.eggGroups)), usedMaleUids)[0]
  if (direct) { if (direct.uid) usedMaleUids.add(direct.uid); return { carrier: petNode(direct, dirLabel), blocks: [], note: '' } }

  const raceGroups = {}
  const ownedFemaleRaces = new Set()
  inv.forEach((p) => {
    if (!raceGroups[p.id]) raceGroups[p.id] = p.eggGroups
    if (p.gender === 'female') ownedFemaleRaces.add(p.id)
  })

  const maleSources = preferUsed(dirPets.filter((p) => p.gender === 'male'), usedMaleUids)
  const sources = [...maleSources, ...preferUsed(dirPets.filter((p) => p.gender !== 'male'), usedMaleUids)]

  for (const source of sources) {
    const shortPath = findShortestPath(source.id, targetGroups, genderPref, ownedFemaleRaces)
    const chain = shortPath || findOwnedChain(source.id, raceGroups, ownedFemaleRaces)
    if (source.gender === 'male' && chain.length === 1 && !groupsCompatible(speciesById[source.id]?.egg_groups || [], targetGroups)) continue

    const blocks = []
    let curCarrier = petNode(source, dirLabel)
    if (source.uid) usedMaleUids.add(source.uid)

    let hasUpstreamMissing = false
    if (source.gender === 'female') {
      // 雌性来源先转雄性（传递必须以父本进行，子代种族=母本）
      const spouse = preferUsed(inv.filter((p) => p.gender === 'male' && groupsCompatible(p.eggGroups, raceGroups[source.id] || [])), usedMaleUids)[0]
      const fatherNode = spouse ? petNode(spouse, '') : missingNode(source.id, 'male', 'father')
      const motherNode = curCarrier
      if (!spouse) hasUpstreamMissing = true
      const child = carrierNode(source.id, 'male', dirLabel, target, { tag: '转换产物' })
      const { backcrossFather, backcrossMother } = buildMiddleLayer(motherNode, fatherNode, motherNode, source.id, target)
      blocks.push(makeBlock('propagate', `转换性别：${source.name}`, {
        father: fatherNode, mother: motherNode, backcrossFather, backcrossMother, child,
        note: `将「${source.name}」转为雄性后继续。`,
      }))
      curCarrier = child
    }

    const lastIndex = chain.length - 1
    for (let i = 0; i < lastIndex; i++) {
      const fromRace = chain[i]
      const toRace = chain[i + 1]
      const isLast = i === lastIndex - 1
      const childGender = (isLast && genderPref === 'female') ? 'female' : 'male'
      const father = i === 0 ? curCarrier : carrierNode(fromRace, 'male', dirLabel, target, { tag: '阶段产物' })
      const motherPet = inv.find((p) => p.id === toRace && p.gender === 'female')
      const mother = motherPet ? petNode(motherPet, '') : missingNode(toRace, 'female', 'mother')
      const child = carrierNode(toRace, childGender, dirLabel, target, { tag: '阶段目标' })
      const { backcrossFather, backcrossMother } = buildMiddleLayer(father, father, mother, toRace, target)
      blocks.push(makeBlock('propagate', `传递${flag === 'c' ? '性格' : flag === 'm' ? '奖牌' : '双方向'}：${mother.name}`, {
        father, mother, backcrossFather, backcrossMother, child,
        note: '沿蛋组图传递，回交筛出满足方向、且为目标性别的个体。',
      }))
      curCarrier = child
    }

    const endRace = chain[chain.length - 1]
    if (shortPath && groupsCompatible(speciesById[endRace]?.egg_groups || [], targetGroups)) {
      // 最后一步已按需产出目标性别的载体，直接复用，避免多余的「转换性别」块
      let carrier = curCarrier
      if (genderPref === 'female' && lastIndex === 0) {
        const spouse = preferUsed(inv.filter((p) => p.gender === 'female' && groupsCompatible(p.eggGroups, raceGroups[endRace] || [])), usedMaleUids)[0]
        const fatherNode = carrier
        const motherNode = spouse ? petNode(spouse, '') : missingNode(endRace, 'female', 'mother')
        const femaleChild = carrierNode(endRace, 'female', dirLabel, target, { tag: '转换产物' })
        const mid = buildMiddleLayer(fatherNode, fatherNode, motherNode, endRace, target)
        blocks.push(makeBlock('propagate', `转换性别：${carrier.name}`, {
          father: fatherNode, mother: motherNode, backcrossFather: mid.backcrossFather, backcrossMother: mid.backcrossMother, child: femaleChild,
          note: `将「${carrier.name}」转为雌性后继续。`,
        }))
        carrier = femaleChild
      }
      return { carrier, blocks, note: '' }
    }

    // 卡住：末个已确定种族 + 问号母本 → 待补充块
    const father = curCarrier
    const mother = unknownNode('female', 'mother')
    if (hasUpstreamMissing) mother.pseudo = true
    const child = unknownNode('male', 'child')
    child.pseudo = true
    const backcrossFather = { ...father, tag: '回交' }
    const backcrossMother = unknownNode('female', 'child')
    blocks.push(makeBlock('propagate', `传递${flag === 'c' ? '性格' : flag === 'm' ? '奖牌' : '双方向'}：?`, {
      father, mother, backcrossFather, backcrossMother, child,
      note: '缺少可交配的精灵，请点击黄色问号模块添加。',
    }))
    return { carrier: child, blocks, note: '' }
  }
  return null
}

function makeMergeBlock(cCarrier, mCarrier, target) {
  // 上层排布：M 为母时 C♂·M♀；M 为公时 M♂·C♀。子代性别与回交方相反。
  let father, mother
  if (mCarrier.gender === 'female') {
    father = cCarrier
    mother = mCarrier
  } else {
    father = mCarrier
    mother = cCarrier
  }
  const backcrossParent = mCarrier.gender === 'female' ? mother : father
  const child = carrierNode(mother.raceId, 'male', 'B', target, { tag: '合并产物' })
  const { backcrossFather, backcrossMother } = buildMiddleLayer(backcrossParent, father, mother, mother.raceId, target)
  return makeBlock('merge', '合并：性格 × 奖牌 → 双方向 B', {
    father, mother, backcrossFather, backcrossMother, child,
    note: '子代优先保留性格正确的进行回交。R_M 作为回交亲本，回交筛出同时满足性格与奖牌方向的雄性父本。',
  })
}

function makeFinalBlock(father, mother, target) {
  const child = targetNode(target)
  const fatherUnknown = !!(father && father.isUnknown)
  if (fatherUnknown && mother && (mother.isMissing || mother.isUnknown)) {
    mother.pseudo = true
  }
  const bothB = !!(father && mother && father.direction === 'B' && mother.direction === 'B' && !father.isUnknown && !mother.isUnknown && !mother.isMissing)
  if (bothB) {
    return makeBlock('final', `最终块：孵化目标「${target.name}」`, {
      father, mother, backcrossFather: null, backcrossMother: null, child,
      note: '双亲均为双方向载体，直接交配得到目标精灵，无需回交。',
    })
  }
  const backcrossParent = (father && father.direction === 'B') ? father
    : (mother && mother.direction === 'B') ? mother
    : father
  const motherRace = mother ? mother.raceId : target.id
  const motherUnknown = !!(mother && mother.isUnknown)
  const { backcrossFather, backcrossMother } = buildMiddleLayer(backcrossParent, father, mother, motherRace, target, motherUnknown)
  if (motherUnknown) {
    child.isUnknown = true
    child.missingRole = 'target'
  }
  return makeBlock('final', `最终块：孵化目标「${target.name}」`, {
    father, mother, backcrossFather, backcrossMother, child,
    note: '母本决定子代种族，回交筛出双方向（B）满足的目标精灵。',
  })
}

// 母本过滤：收集某条链从仓库选用的雌性 uid
function collectFemaleUids(blocks) {
  const s = new Set()
  blocks.forEach((b) => { if (b.mother && b.mother.uid) s.add(b.mother.uid) })
  return s
}
// 母本过滤：替换掉与另一条链重复的雌性（同种族内换一只）
function dedupChainFemales(blocks, usedUids, inv) {
  blocks.forEach((b) => {
    const oldUid = b.mother && b.mother.uid
    if (!oldUid || !usedUids.has(oldUid)) return
    const alt = inv.find((p) => p.id === b.mother.raceId && p.gender === 'female' && p.uid && !usedUids.has(p.uid))
    if (!alt) { b.mother = missingNode(b.mother.raceId, 'female', 'mother'); return }
    const newNode = petNode(alt, '')
    b.mother = newNode
    if (b.backcrossFather && b.backcrossFather.uid === oldUid) b.backcrossFather = { ...newNode, tag: b.backcrossFather.tag }
    if (b.backcrossMother && b.backcrossMother.uid === oldUid) b.backcrossMother = { ...newNode, tag: b.backcrossMother.tag }
  })
}

// 建立块间父子引用：按「同一对象」或「种族+性别+方向」精确匹配子代到下游块的父本/母本。
// 供前端 DAG 布局（并列链汇合）与块间连线使用。
function sameCarrier(a, b) {
  if (a === b) return true
  if (!a || !b || a.raceId == null || b.raceId == null) return false
  if (a.raceId !== b.raceId || a.gender !== b.gender) return false
  if (a.direction !== b.direction) return false
  return true
}
function linkBlocks(blocks) {
  blocks.forEach((b) => { b.nextBlock = null; b.prevBlockIds = [] })
  for (const b of blocks) {
    if (!b.child) continue
    for (const o of blocks) {
      if (o.id === b.id) continue
      if (sameCarrier(o.father, b.child)) {
        b.nextBlock = { id: o.id, role: 'father' }
        o.prevBlockIds.push(b.id)
        break
      }
      if (sameCarrier(o.mother, b.child)) {
        b.nextBlock = { id: o.id, role: 'mother' }
        o.prevBlockIds.push(b.id)
        break
      }
    }
  }
}

export function computeHatchRoute(target, inventoryOverride, options = {}) {
  seq = 0
  const T = speciesById[target.id]
  const tGroups = (target.eggGroups && target.eggGroups.length) ? target.eggGroups : (T?.egg_groups || [])
  const blocks = []
  const notes = []
  const usedMaleUids = new Set()
  const femaleDedup = !!options.femaleDedup
  const usedFemaleUids = options.usedFemaleUids || null

  if (!T) return { solvable: false, reason: '目标种族不存在', blocks, notes, target }

  const inv = (inventoryOverride || loadInventory())
    .map((p) => ({ ...p, eggGroups: p.eggGroups || getEggGroups(p.id) }))
    .filter((p) => isBreedable(p.eggGroups))
    .map((p) => ({ ...p, c: dirC(p, target), m: dirM(p, target), b: dirC(p, target) && dirM(p, target) }))

  const compatT = (g) => groupsCompatible(g, tGroups)
  const hasNoRequirement = !target.personality && !target.medals?.body && !target.medals?.voice

  if (!hasNoRequirement && !inv.some((p) => p.c) && !inv.some((p) => p.m)) {
    return { solvable: false, reason: '仓库中没有满足目标性格或奖牌方向的精灵，无法开始。', blocks, notes, target }
  }

  const tFemaleB = inv.find((p) => p.id === target.id && p.gender === 'female' && p.b)
  const tMaleB = inv.find((p) => p.id === target.id && p.gender === 'male' && p.b)
  const tFemale = inv.find((p) => p.id === target.id && p.gender === 'female')
  const TcanFemale = canBeGender(T, 'female')

  if (hasNoRequirement) {
    const anyMale = preferUsed(inv.filter((p) => p.gender === 'male' && compatT(p.eggGroups)), usedMaleUids)[0]
    const mother = tFemale
      ? petNode(tFemale, '')
      : missingNode(target.id, 'female', 'mother')
    const father = anyMale
      ? petNode(anyMale, '')
      : unknownNode('male', 'father')
    const child = targetNode(target)
    blocks.push(makeBlock('final', `孵化目标「${target.name}」（无特征要求）`, {
      father, mother, backcrossFather: null, backcrossMother: null, child,
      note: '目标无性格/奖牌要求，直接 T 母 × 可配公 即可。',
    }))
    if (!TcanFemale) notes.push(`注意：目标种族「${target.name}」只有雄性，无法作为母本。`)
    if (femaleDedup && usedFemaleUids && usedFemaleUids.size) dedupChainFemales(blocks, usedFemaleUids, inv); linkBlocks(blocks)
    return { solvable: true, blocks, notes, target }
  }

  const needC = !!target.personality
  const needM = !!(target.medals?.body || target.medals?.voice)

  let father = null
  let mother = null

  if (tFemaleB) {
    const anyMale = preferUsed(inv.filter((p) => p.gender === 'male' && compatT(p.eggGroups)), usedMaleUids)[0]
    mother = petNode(tFemaleB, 'B')
    father = anyMale ? petNode(anyMale, anyMale.b ? 'B' : anyMale.c ? 'C' : anyMale.m ? 'M' : '') : unknownNode('male', 'father')
  } else if (tMaleB) {
    father = petNode(tMaleB, 'B')
    mother = tFemale ? petNode(tFemale, tFemale.b ? 'B' : tFemale.c ? 'C' : tFemale.m ? 'M' : '') : missingNode(target.id, 'female', 'mother')
  } else {
    const bPets = inv.filter((p) => p.b)
    const bFlag = (needC && needM) ? 'b' : (needC ? 'c' : 'm')
    const bDirLabel = DIR_LABEL[bFlag]
    const bDirect = preferUsed(bPets.filter((p) => p.gender === 'male' && compatT(p.eggGroups)), usedMaleUids)[0]
    if (bDirect) {
      father = petNode(bDirect, bDirLabel)
      mother = tFemale ? petNode(tFemale, tFemale.b ? 'B' : tFemale.c ? 'C' : tFemale.m ? 'M' : '') : missingNode(target.id, 'female', 'mother')
    } else if (bPets.length) {
      const carrierB = propagate(bFlag, 'male', target, inv, tGroups, { usedMaleUids })
      if (carrierB) {
        blocks.push(...carrierB.blocks)
        if (carrierB.note) notes.push(carrierB.note)
        if (carrierB.incomplete) {
          if (femaleDedup && usedFemaleUids && usedFemaleUids.size) dedupChainFemales(blocks, usedFemaleUids, inv); linkBlocks(blocks)
          return { solvable: true, incomplete: true, blocks, notes, target }
        }
        father = carrierB.carrier
        mother = tFemale ? petNode(tFemale, tFemale.b ? 'B' : tFemale.c ? 'C' : tFemale.m ? 'M' : '') : missingNode(target.id, 'female', 'mother')
      } else {
        return { solvable: false, reason: '双方向载体无法传递到与目标可配的种族。', blocks, notes, target }
      }
    } else if (needC && needM) {
      // 优化：C 源和 M 源都是目标种族，一雌一雄 → 直接自交
      const tC = inv.filter((p) => p.id === target.id && p.c)
      const tM = inv.filter((p) => p.id === target.id && p.m)
      const selfMale = tC.find((p) => p.gender === 'male') || tM.find((p) => p.gender === 'male')
      const selfFemale = tC.find((p) => p.gender === 'female') || tM.find((p) => p.gender === 'female')
      if (selfMale && selfFemale && selfMale.uid !== selfFemale.uid) {
        const fdir = selfMale.b ? 'B' : (selfMale.c ? 'C' : 'M')
        const mdir = selfFemale.b ? 'B' : (selfFemale.c ? 'C' : 'M')
        const sf = petNode(selfMale, fdir)
        const sm = petNode(selfFemale, mdir)
        blocks.push(makeBlock('final', `自交：${sf.name} × ${sm.name}`, {
          father: sf, mother: sm, backcrossFather: null, backcrossMother: null, child: targetNode(target),
          note: '双亲均为目标种族，直接自交得到目标精灵，无需传递与回交。',
        }))
        if (!TcanFemale) notes.push(`注意：目标种族「${target.name}」只有雄性（special_tags 1001），无法作为母本。`)
        if (femaleDedup && usedFemaleUids && usedFemaleUids.size) dedupChainFemales(blocks, usedFemaleUids, inv); linkBlocks(blocks)
        return { solvable: true, blocks, notes, target }
      }
      const cMale = propagate('c', 'male', target, inv, tGroups, { usedMaleUids })
      const mFemale = propagate('m', 'female', target, inv, tGroups, { usedMaleUids })
      const mMale = propagate('m', 'male', target, inv, tGroups, { usedMaleUids })
      const cFemale = propagate('c', 'female', target, inv, tGroups, { usedMaleUids })

      let c = null, m = null
      const a1 = cMale && mFemale ? { c: cMale, m: mFemale, cost: cMale.blocks.length + mFemale.blocks.length } : null
      const a2 = mMale && cFemale ? { c: cFemale, m: mMale, cost: mMale.blocks.length + cFemale.blocks.length } : null
      if (a1 && a2) {
        const pick = a1.cost <= a2.cost ? a1 : a2
        c = pick.c; m = pick.m
      } else if (a1) {
        c = a1.c; m = a1.m
      } else if (a2) {
        c = a2.c; m = a2.m
      } else {
        return { solvable: false, reason: '无法获得性格与奖牌方向的载体。', blocks, notes, target }
      }

      blocks.push(...c.blocks, ...m.blocks)
      if (femaleDedup) dedupChainFemales(m.blocks, collectFemaleUids(c.blocks), inv)
      if (c.note) notes.push(c.note)
      if (m.note) notes.push(m.note)

      const merge = makeMergeBlock(c.carrier, m.carrier, target)
      blocks.push(merge)
      father = merge.child
      mother = tFemale ? petNode(tFemale, tFemale.b ? 'B' : tFemale.c ? 'C' : tFemale.m ? 'M' : '') : missingNode(target.id, 'female', 'mother')
    } else if (needC) {
      const c = propagate('c', 'male', target, inv, tGroups, { usedMaleUids })
      if (!c) return { solvable: false, reason: '无法将性格方向传递到与目标可配的种族。', blocks, notes, target }
      blocks.push(...c.blocks)
      if (c.note) notes.push(c.note)
      father = c.carrier
      mother = tFemale ? petNode(tFemale, tFemale.b ? 'B' : tFemale.c ? 'C' : tFemale.m ? 'M' : '') : missingNode(target.id, 'female', 'mother')
    } else {
      const m = propagate('m', 'male', target, inv, tGroups, { usedMaleUids })
      if (!m) return { solvable: false, reason: '无法将奖牌方向传递到与目标可配的种族。', blocks, notes, target }
      blocks.push(...m.blocks)
      if (m.note) notes.push(m.note)
      father = m.carrier
      mother = tFemale ? petNode(tFemale, tFemale.b ? 'B' : tFemale.c ? 'C' : tFemale.m ? 'M' : '') : missingNode(target.id, 'female', 'mother')
    }
  }

  if (!TcanFemale) notes.push(`注意：目标种族「${target.name}」只有雄性（special_tags 1001），无法作为母本。`)
  blocks.push(makeFinalBlock(father, mother, target))
  if (femaleDedup && usedFemaleUids && usedFemaleUids.size) dedupChainFemales(blocks, usedFemaleUids, inv); linkBlocks(blocks)

  return { solvable: true, blocks, notes, target }
}
