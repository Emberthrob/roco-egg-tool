import { createServer } from 'vite'
import fs from 'node:fs'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { computeHatchRoute } = await server.ssrLoadModule('/src/utils/hatchRoute.js')

const invPath = 'C:/Users/ADMIN/AppData/Local/Temp/chatbox-sandbox/725a508b-30e6-48a0-9140-29601381c768/attachments/3e57fde0d58a/cs1.json'
const data = JSON.parse(fs.readFileSync(invPath, 'utf8'))
const eggId = { 未知组:1, 巨灵组:2, 两栖组:3, 昆虫组:4, 天空组:5, 动物组:6, 妖精组:7, 植物组:8, 拟人组:9, 软体组:10, 大地组:11, 魔力组:12, 海洋组:13, 巨龙组:14, 机械组:15 }
const inventory = data.inventory.map((x) => ({
  id: x.id, name: x.name,
  eggGroups: (x.egg_groups || []).map((n) => eggId[n]).filter(Boolean),
  gender: x.gender, personality: x.personality || null,
  medals: { body: x.medals?.body || null, voice: x.medals?.voice || null },
  uid: 'u' + x.id,
}))

const target = { id: 3002, name: '水蓝蓝', eggGroups: [12], personality: '沉默', medals: { body: 'dkt', voice: '' } }
const r = computeHatchRoute(target, inventory)
console.log('solvable:', r.solvable, 'blocks:', r.blocks.length)
r.blocks.forEach((b, i) => {
  console.log(`[${i}] ${b.type} "${b.title}"`)
  console.log(`   父:${b.father?.name} uid=${b.father?.uid} | 母:${b.mother?.name} uid=${b.mother?.uid}${b.mother?.isMissing?' [缺母本]':''}`)
})
await server.close()
