import express from 'express';
import { sendMessage, getChatHistory, getActiveContacts } from '../controllers/messageController.js';
import { protect } from '../middleware/authMiddleware.js'; // 💡 ඔයාගේ ඔත් මිට්ල්වෙයාර් එකේ නම අනුව දාන්න බං

const router = express.Router();

// 🔒 හැම රවුට් එකක්ම protect මිට්ල්වෙයාර් එකෙන් සෙකියුර් කරනවා මචං
router.post('/send', protect, sendMessage);
router.get('/history/:otherUserId', protect, getChatHistory);
router.get('/contacts', protect, getActiveContacts);

export default router;