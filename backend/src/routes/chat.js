import express from 'express'
import ChatService from '../services/chatService.js'

const router = express.Router()
const chatService = new ChatService()

router.post('/', async (req, res, next) => {
  try {
    const result = await chatService.handleChat(req.body)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router
