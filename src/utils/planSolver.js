import { loadInventory, isSameSpecies } from './breeding'
import petsData from '../data/pets.json'
import { groupsCompatible, isBreedablePet, isPerfect } from '../store/plan'

let seq = 1
function N(extra) { return { id: seq++, sameAs: null, ...extra } }
function link(lines, a, b, color) { lines.push({ a: a.id, b: b.id, color }) }

function reqOf(target, f) {
  if (f === 'personality') return target.personality || ''
  return (target.medals && target.medals[f]) || ''
}
function isSpecialOnly(sp) {
  const tags = Array.isArray(sp.special_tags) ? sp.special_tags : []
  return tags.some((t) => t === 1001 || t === 1002)
}
function recommendSpecies(target, pet) {
  return petsData
    .filter((sp) => !isSpecialOnly(sp) && isBreedablePet(sp.egg_groups))
    .filter((sp) => groupsCompatible(sp.egg_groups, target.eggGroups) && groupsCompatible(sp.egg_groups, pet.eggGroups))
    .map((sp) => sp.name)
}
function recommendMateSpecies(pet) {
  return petsData
    .filter((sp) => !isSpecialOnly(sp) && isBreedablePet(sp.egg_groups))
    .filter((sp) => groupsCompatible(sp.egg_groups, pet.eggGroups))
    .map((sp) => sp.name)
}
// 两次桥接：找 B（与目标有共同蛋组）和 C（与 B、完美精灵都有共同蛋组）
function findDoubleBridge(target, pet) {
  for (const B of petsData) {
    if (isSpecialOnly(B) || !isBreedablePet(B.egg_groups)) continue
    if (!groupsCompatible(B.egg_groups, target.eggGroups)) continue
    const C = petsData.find((sp) => !isSpecialOnly(sp) && isBreedablePet(sp.egg_groups) && groupsCompatible(sp.egg_groups, B.egg_groups) && groupsCompatible(sp.egg_groups, pet.eggGroups))
    if (C) return { B: B.name, C: C.name }
  }
  return null
}

function perfectMale(target, males, usedM) {
  return males.find((m) => !usedM.has(m.uid) && groupsCompatible(m.eggGroups, target.eggGroups) && isPerfect(m, target))
}
function perfectFemale(target, females, usedF) {
  return females.find((f) => !usedF.has(f.uid) && isSameSpecies(f.id, target.id) && isPerfect(f, target))
}
function imperfectMale(target, males, usedM) {
  return males.find((m) => !usedM.has(m.uid) && groupsCompatible(m.eggGroups, target.eggGroups))
}
function imperfectFemale(target, females, usedF) {
  return females.find((f) => !usedF.has(f.uid) && isSameSpecies(f.id, target.id))
}
function perfectFeatureMale(target, males, usedM) {
  return males.find((m) => !usedM.has(m.uid) && isPerfect(m, target))
}
function perfectFeatureFemale(target, females, usedF) {
  return females.find((f) => !usedF.has(f.uid) && isPerfect(f, target))
}

// 情况2 完整链条（统一四种情况）
function buildCase2Full(target, req, perfectPet, perfectRole, matePet, mateRole, mateNeed, recommend, imF, nodes, lines) {
  // 行0：完美特征精灵 + 桥接/配对精灵（或问号）
  const nPerf = N({ role: perfectRole, type: 'perfect', name: perfectPet.name, gender: perfectRole, pet: perfectPet, requirements: req, x: 0, y: 0 })
  const nMate = N({
    role: mateRole, type: mateNeed ? 'need' : 'perfect', name: mateNeed ? '?' : (matePet.note || matePet.name),
    gender: mateRole, pet: mateNeed ? null : matePet, eggGroups: mateNeed ? target.eggGroups : matePet.eggGroups,
    requirements: req, x: 2, y: 0, recommend: mateNeed ? recommend : null,
  })
  // 行1：完美特征精灵（复用）+ 小目标精灵一（性别与完美精灵相反）
  const sub1Gender = perfectRole === 'male' ? 'female' : 'male'
  const nPerf1 = N({ role: perfectRole, type: 'perfect', name: perfectPet.name, gender: perfectRole, pet: perfectPet, requirements: req, x: 0, y: 1, sameAs: nPerf.id })
  const nSub1 = N({
    role: 'subtarget', type: 'subtarget', name: mateNeed ? '?' : (matePet.note || matePet.name), gender: sub1Gender,
    pet: null, eggGroups: mateNeed ? target.eggGroups : matePet.eggGroups, requirements: req, x: 2, y: 1,
    speciesName: mateNeed ? null : (matePet.note || matePet.name), needRef: mateNeed ? nMate.id : null,
  })
  // 行3：小目标精灵二（雄性完美父本）+ 不完美母本
  const sub2Name = mateNeed ? '完美父本' : (matePet.note || matePet.name)
  const nSub2 = N({ role: 'male', type: 'perfect', name: sub2Name, gender: 'male', pet: null, eggGroups: mateNeed ? target.eggGroups : matePet.eggGroups, requirements: req, x: 1, y: 3, needRef: mateNeed ? nMate.id : null })
  const nIMF = N({
    role: 'female', type: imF ? 'imperfect' : 'need', name: imF ? (imF.note || imF.name) : '?', gender: 'female',
    pet: imF || null, eggGroups: imF ? imF.eggGroups : target.eggGroups, requirements: req, x: 5, y: 3,
    recommend: imF ? null : (target.eggGroups ? [target.name] : []),
  })
  // 行4：小目标精灵二（复用）+ 小目标精灵三（雌性）
  const nSub2b = N({ role: 'male', type: 'perfect', name: sub2Name, gender: 'male', pet: null, eggGroups: nSub2.eggGroups, requirements: req, x: 1, y: 4, sameAs: nSub2.id, needRef: mateNeed ? nMate.id : null })
  const nSub3 = N({
    role: 'subtarget', type: 'subtarget', name: imF ? (imF.note || imF.name) : '?', gender: 'female', pet: null,
    eggGroups: imF ? imF.eggGroups : target.eggGroups, requirements: req, x: 5, y: 4, speciesName: imF ? (imF.note || imF.name) : null, needRef: imF ? null : nIMF.id,
  })
  const nTarget = N({ role: 'target', type: 'target', name: target.name, gender: null, pet: null, requirements: req, x: 3, y: 6 })

  nodes.push(nPerf, nMate, nPerf1, nSub1, nSub2, nIMF, nSub3, nSub2b, nTarget)
  // 行0-1：完美精灵 + 桥接/配对 → 小目标精灵一
  link(lines, nPerf, nSub1, 'green')
  link(lines, nMate, nSub1, 'green')
  link(lines, nPerf, nPerf1, 'yellow')
  // 完美精灵 + 小目标精灵一 → 小目标精灵二
  link(lines, nPerf1, nSub2, 'green')
  link(lines, nSub1, nSub2, 'green')
  // 小目标精灵二 + 不完美母本 → 小目标精灵三
  link(lines, nSub2, nSub3, 'green')
  link(lines, nIMF, nSub3, 'green')
  link(lines, nSub2, nSub2b, 'yellow')
  // 小目标精灵二 + 小目标精灵三 → 目标
  link(lines, nSub2b, nTarget, 'green')
  link(lines, nSub3, nTarget, 'green')
  return { nodes, lines }
}

function buildPlan(target, females, males, usedF, usedM) {
  const nodes = []
  const lines = []
  const req = { personality: target.personality, body: target.medals?.body, voice: target.medals?.voice }

  const pm = perfectMale(target, males, usedM)
  const pf = perfectFemale(target, females, usedF)

  // 情况0：父母都完美
  if (pm && pf) {
    usedM.add(pm.uid); usedF.add(pf.uid)
    const nMale = N({ role: 'male', type: 'perfect', name: pm.name, gender: 'male', pet: pm, requirements: req, x: 0, y: 0 })
    const nFemale = N({ role: 'female', type: 'perfect', name: pf.note || pf.name, gender: 'female', pet: pf, requirements: req, x: 2, y: 0 })
    const nTarget = N({ role: 'target', type: 'target', name: target.name, gender: null, pet: null, requirements: req, x: 1, y: 2 })
    nodes.push(nMale, nFemale, nTarget)
    link(lines, nMale, nTarget, 'green')
    link(lines, nFemale, nTarget, 'green')
    return { nodes, lines }
  }

  // 情况1：一方完美
  if (pm) {
    usedM.add(pm.uid)
    const im = imperfectFemale(target, females, usedF)
    const nPM0 = N({ role: 'male', type: 'perfect', name: pm.name, gender: 'male', pet: pm, requirements: req, x: 0, y: 0 })
    const nIM = N({ role: 'female', type: im ? 'imperfect' : 'need', name: im ? (im.note || im.name) : '?', gender: 'female', pet: im || null, eggGroups: im ? im.eggGroups : target.eggGroups, requirements: req, x: 2, y: 0, recommend: im ? null : [target.name] })
    const nPM1 = N({ role: 'male', type: 'perfect', name: pm.name, gender: 'male', pet: pm, requirements: req, x: 0, y: 1, sameAs: nPM0.id })
    const nSub = N({ role: 'subtarget', type: 'subtarget', name: im ? (im.note || im.name) : '?', gender: 'female', pet: null, eggGroups: im ? im.eggGroups : target.eggGroups, requirements: req, x: 2, y: 1, speciesName: im ? (im.note || im.name) : null, needRef: im ? null : nIM.id })
    const nTarget = N({ role: 'target', type: 'target', name: target.name, gender: null, pet: null, requirements: req, x: 1, y: 3 })
    nodes.push(nPM0, nIM, nPM1, nSub, nTarget)
    link(lines, nPM0, nSub, 'green')
    link(lines, nIM, nSub, 'green')
    link(lines, nPM0, nPM1, 'yellow')
    link(lines, nPM1, nTarget, 'green')
    link(lines, nSub, nTarget, 'green')
    return { nodes, lines }
  }
  if (pf) {
    usedF.add(pf.uid)
    const im = imperfectMale(target, males, usedM)
    const nIM = N({ role: 'male', type: im ? 'imperfect' : 'need', name: im ? im.name : '?', gender: 'male', pet: im || null, eggGroups: im ? im.eggGroups : target.eggGroups, requirements: req, x: 0, y: 0, recommend: im ? null : (recommendMateSpecies(pf).slice(0, 5)) })
    const nPF0 = N({ role: 'female', type: 'perfect', name: pf.note || pf.name, gender: 'female', pet: pf, requirements: req, x: 2, y: 0 })
    const nSub = N({ role: 'subtarget', type: 'subtarget', name: pf.note || pf.name, gender: 'male', pet: null, eggGroups: target.eggGroups, requirements: req, x: 0, y: 1, speciesName: pf.note || pf.name })
    const nPF1 = N({ role: 'female', type: 'perfect', name: pf.note || pf.name, gender: 'female', pet: pf, requirements: req, x: 2, y: 1, sameAs: nPF0.id })
    const nTarget = N({ role: 'target', type: 'target', name: target.name, gender: null, pet: null, requirements: req, x: 1, y: 3 })
    nodes.push(nIM, nPF0, nSub, nPF1, nTarget)
    link(lines, nIM, nSub, 'green')
    link(lines, nPF0, nSub, 'green')
    link(lines, nPF0, nPF1, 'yellow')
    link(lines, nSub, nTarget, 'green')
    link(lines, nPF1, nTarget, 'green')
    return { nodes, lines }
  }

  // 情况2：父母都不完美
  // (1) 完美雄性 A + 桥接雌性 A
  for (const mA of males) {
    if (usedM.has(mA.uid) || !isPerfect(mA, target)) continue
    const fA = females.find((f) => !usedF.has(f.uid) && groupsCompatible(f.eggGroups, target.eggGroups) && groupsCompatible(f.eggGroups, mA.eggGroups))
    if (fA) {
      usedM.add(mA.uid); usedF.add(fA.uid)
      const imF = imperfectFemale(target, females, usedF)
      return buildCase2Full(target, req, mA, 'male', fA, 'female', false, null, imF, nodes, lines)
    }
  }
  // (2) 完美雌性 A + 可配对雄性 A
  for (const fA of females) {
    if (usedF.has(fA.uid) || !isPerfect(fA, target)) continue
    const mA = males.find((m) => !usedM.has(m.uid) && groupsCompatible(m.eggGroups, fA.eggGroups))
    if (mA) {
      usedF.add(fA.uid); usedM.add(mA.uid)
      const imF = imperfectFemale(target, females, usedF)
      return buildCase2Full(target, req, fA, 'female', mA, 'male', false, null, imF, nodes, lines)
    }
  }
  // (3) 完美雄性 A，无桥接雌性
  for (const mA of males) {
    if (usedM.has(mA.uid) || !isPerfect(mA, target)) continue
    const rec = recommendSpecies(target, mA)
    if (rec.length) {
      const imF = imperfectFemale(target, females, usedF)
      return buildCase2Full(target, req, mA, 'male', null, 'female', true, rec, imF, nodes, lines)
    }
  }
  // (4) 完美雌性 A，无可配对雄性
  for (const fA of females) {
    if (usedF.has(fA.uid) || !isPerfect(fA, target)) continue
    const rec = recommendMateSpecies(fA)
    if (rec.length) {
      const imF = imperfectFemale(target, females, usedF)
      return buildCase2Full(target, req, fA, 'female', null, 'male', true, rec, imF, nodes, lines)
    }
  }
  // 情况三：两次桥接（情况二命中但找不到一次桥接的种族）
  for (const mA of males) {
    if (usedM.has(mA.uid) || !isPerfect(mA, target)) continue
    const double = findDoubleBridge(target, mA)
    if (double) {
      const imF = imperfectFemale(target, females, usedF)
      return buildCase3(target, req, mA, 'male', double, imF, nodes, lines)
    }
  }
  for (const fA of females) {
    if (usedF.has(fA.uid) || !isPerfect(fA, target)) continue
    const double = findDoubleBridge(target, fA)
    if (double) {
      const imF = imperfectFemale(target, females, usedF)
      return buildCase3(target, req, fA, 'female', double, imF, nodes, lines)
    }
  }
  return { nodes, lines, noSolution: true }
}

// 情况三：两次桥接（两次抓取）
function buildCase3(target, req, perfectPet, perfectRole, double, imF, nodes, lines) {
  const nPerf = N({ role: perfectRole, type: 'perfect', name: perfectPet.name, gender: perfectRole, pet: perfectPet, requirements: req, x: 0, y: 0 })
  const nB = N({ role: 'female', type: 'need', name: '?', gender: 'female', pet: null, eggGroups: target.eggGroups, requirements: req, x: 2, y: 0, recommend: [double.B] })
  const nC = N({ role: 'female', type: 'need', name: '?', gender: 'female', pet: null, eggGroups: target.eggGroups, requirements: req, x: 4, y: 0, recommend: [double.C] })
  const nPerf1 = N({ role: perfectRole, type: 'perfect', name: perfectPet.name, gender: perfectRole, pet: perfectPet, requirements: req, x: 0, y: 1, sameAs: nPerf.id })
  const nSub1 = N({ role: 'subtarget', type: 'subtarget', name: '?', gender: 'female', pet: null, eggGroups: target.eggGroups, requirements: req, x: 2, y: 1, speciesName: null, needRef: nB.id })
  const nC1 = N({ role: 'female', type: 'need', name: '?', gender: 'female', pet: null, eggGroups: target.eggGroups, requirements: req, x: 4, y: 1, recommend: [double.C], sameAs: nC.id })
  const nTarget = N({ role: 'target', type: 'target', name: target.name, gender: null, pet: null, requirements: req, x: 2, y: 3 })
  nodes.push(nPerf, nB, nC, nPerf1, nSub1, nC1, nTarget)
  link(lines, nPerf, nSub1, 'green')
  link(lines, nB, nSub1, 'green')
  link(lines, nC, nSub1, 'green')
  link(lines, nPerf, nPerf1, 'yellow')
  link(lines, nC, nC1, 'yellow')
  link(lines, nPerf1, nTarget, 'green')
  link(lines, nSub1, nTarget, 'green')
  link(lines, nC1, nTarget, 'green')
  return { nodes, lines }
}

export function generateHatchPlan(targets) {
  const inventory = loadInventory()
  const females = inventory.filter((p) => p.gender === 'female' && isBreedablePet(p.eggGroups))
  const males = inventory.filter((p) => p.gender === 'male' && isBreedablePet(p.eggGroups))
  const usedF = new Set()
  const usedM = new Set()
  seq = 1
  return targets.map((t) => {
    const plan = buildPlan(t, females, males, usedF, usedM)
    return { target: t, ...plan }
  })
}
