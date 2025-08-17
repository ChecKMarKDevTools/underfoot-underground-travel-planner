import express from 'express'
import health from './health.js'
import chat from './chat.js'

const router = express.Router()
router.use('/health', health)
router.use('/chat', chat)

export default router
