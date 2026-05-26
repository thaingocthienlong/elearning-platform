import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'

const prisma = new PrismaClient()
const [,, videoId, keysPath='keys.json'] = process.argv
if (!videoId) { console.error('usage: node scripts/db/upsert-keystore.mjs <videoId> [keys.json]'); process.exit(1) }

const keystore = JSON.parse(fs.readFileSync(keysPath,'utf-8'))

async function main() {
  await prisma.videoKeystore.upsert({
    where: { videoId },
    update: { keystore },
    create: { videoId, keystore },
  })
  console.log('keystore upserted for', videoId)
}
main().finally(()=>prisma.$disconnect())
