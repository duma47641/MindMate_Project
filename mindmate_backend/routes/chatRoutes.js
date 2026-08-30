import express from 'express';
import { sendMessage, getChatHistory, getPatientMoodHistory } from '../controllers/chatController.js';
import { protect } from '../middleware/authMiddleware.js'; 

const router = express.Router();

router.post('/message', protect, sendMessage);
router.get('/history', protect, getChatHistory);
router.get('/patient-history/:patientId', protect, getPatientMoodHistory);




export default router;