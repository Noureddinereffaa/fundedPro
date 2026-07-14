import { Router } from 'express'
import { prisma } from '../index.js'
import { z } from 'zod'
import { getErrorInfo } from '../middleware/errorHandler.js'
import { sanitizeText, sanitizeEmail } from '../utils/sanitize.js'
import { createLogger } from '../utils/logger.js'

const log = createLogger('contact')
const router = Router()

const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  subject: z.string().min(2).max(200),
  message: z.string().min(10).max(5000),
})

// POST /api/contact — Public route
router.post('/', async (req, res) => {
  try {
    const data = contactSchema.parse(req.body)

    await prisma.contactMessage.create({
      data: {
        name: sanitizeText(data.name, 100),
        email: sanitizeEmail(data.email),
        subject: sanitizeText(data.subject, 200),
        message: sanitizeText(data.message, 5000),
      },
    })

    res.json({ message: 'Message sent successfully' })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message })
    }
    const { message } = getErrorInfo(error)
    log.error({ err: error }, 'Contact form error')
    res.status(500).json({ error: 'Failed to send message' })
  }
})

export default router
