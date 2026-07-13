import { Router } from 'express'
import { prisma } from '../index.js'
import { z } from 'zod'

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
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
      },
    })

    res.json({ message: 'Message sent successfully' })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message })
    }
    console.error('[Contact] Error:', error.message)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

export default router
