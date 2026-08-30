import express from 'express';
import { sendMessage, getChatHistory, getActiveContacts } from '../controllers/messageController.js';
import { protect } from '../middleware/authMiddleware.js'; 

const router = express.Router();

router.post('/send', protect, sendMessage);
router.get('/history/:otherUserId', protect, getChatHistory);
router.get('/contacts', protect, getActiveContacts);

export default router;