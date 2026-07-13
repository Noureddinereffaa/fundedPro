import { Router } from 'express'
import { prisma } from '../index.js'

const router = Router()

// GET /api/settings — Public route to fetch public settings (like social links, company email)
router.get('/', async (_req, res) => {
  try {
    const settings = await prisma.platformSetting.findMany({
      where: { isPublic: true },
      select: { key: true, value: true },
    })

    // Convert array to key-value object
    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value
      return acc
    }, {} as Record<string, string>)

    res.json(settingsMap)
  } catch (error: any) {
    console.error('[Settings] Error:', error.message)
    res.status(500).json({ error: 'Failed to load settings' })
  }
})

export default router
